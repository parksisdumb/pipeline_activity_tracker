-- Fix Manager Set Goals Permissions Migration
-- This migration ensures managers can properly set goals for their team members

-- First, let's update the RLS policy for weekly_goals to be more explicit about manager permissions
DROP POLICY IF EXISTS "managers_can_manage_team_weekly_goals" ON public.weekly_goals;

CREATE POLICY "managers_can_manage_team_weekly_goals" ON public.weekly_goals
FOR ALL 
TO authenticated
USING (
    -- Allow managers to access goals for users they manage
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = weekly_goals.user_id
        AND up.manager_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles manager
            WHERE manager.id = auth.uid()
            AND manager.role = 'manager'
            AND manager.is_active = true
        )
    )
    OR 
    -- Allow users to manage their own goals
    weekly_goals.user_id = auth.uid()
    OR
    -- Allow super admins full access
    is_super_admin_from_auth()
)
WITH CHECK (
    -- Same conditions for inserts/updates
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = weekly_goals.user_id
        AND up.manager_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles manager
            WHERE manager.id = auth.uid()
            AND manager.role = 'manager'
            AND manager.is_active = true
        )
    )
    OR 
    weekly_goals.user_id = auth.uid()
    OR
    is_super_admin_from_auth()
);

-- Update the is_manager_of_goal_user function to be more robust
CREATE OR REPLACE FUNCTION public.is_manager_of_goal_user(goal_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = goal_user_id
    AND up.manager_id = auth.uid()
    AND up.is_active = true
    AND EXISTS (
        SELECT 1 FROM public.user_profiles manager
        WHERE manager.id = auth.uid()
        AND manager.role IN ('manager', 'admin', 'super_admin')
        AND manager.is_active = true
        -- Ensure same tenant
        AND manager.tenant_id = up.tenant_id
    )
);
$$;

-- Create/update function to establish manager-rep relationships if missing
CREATE OR REPLACE FUNCTION public.establish_manager_team_relationships()
RETURNS TABLE(manager_id uuid, rep_id uuid, relationship_established boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    manager_record RECORD;
    rep_record RECORD;
BEGIN
    -- Loop through all managers in each tenant
    FOR manager_record IN 
        SELECT id, tenant_id, full_name 
        FROM public.user_profiles 
        WHERE role = 'manager' AND is_active = true
    LOOP
        -- Find reps in the same tenant who don't have a manager assigned
        FOR rep_record IN 
            SELECT id, full_name 
            FROM public.user_profiles 
            WHERE role = 'rep' 
            AND tenant_id = manager_record.tenant_id 
            AND is_active = true 
            AND (manager_id IS NULL OR manager_id != manager_record.id)
        LOOP
            -- Update the rep to have this manager
            UPDATE public.user_profiles 
            SET manager_id = manager_record.id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = rep_record.id;
            
            -- Return the relationship that was established
            RETURN QUERY SELECT 
                manager_record.id,
                rep_record.id,
                true;
        END LOOP;
    END LOOP;
    
    RETURN;
END;
$$;

-- Update the manager_assign_team_goals function to handle permissions better
CREATE OR REPLACE FUNCTION public.manager_assign_team_goals(manager_uuid uuid, goal_data jsonb)
RETURNS TABLE(success boolean, message text, goals_assigned integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    manager_tenant_id UUID;
    manager_role TEXT;
    goals_count INTEGER := 0;
    goal_item JSONB;
    rep_id UUID;
    week_start DATE;
    goal_type_item JSONB;
BEGIN
    -- Verify manager permissions with more details
    SELECT tenant_id, role INTO manager_tenant_id, manager_role
    FROM public.user_profiles 
    WHERE id = manager_uuid 
    AND role IN ('manager', 'admin', 'super_admin')
    AND is_active = true;
    
    IF manager_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid manager or insufficient permissions. User must be an active manager, admin, or super_admin.', 0;
        RETURN;
    END IF;
    
    -- Extract week start from goal data
    week_start := COALESCE(
        (goal_data->>'week_start')::DATE, 
        DATE_TRUNC('week', CURRENT_DATE)::DATE
    );
    
    -- Process each goal assignment
    FOR goal_item IN SELECT * FROM jsonb_array_elements(goal_data->'assignments') LOOP
        rep_id := (goal_item->>'rep_id')::UUID;
        
        -- Verify rep belongs to same tenant and has proper manager relationship
        IF EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = rep_id 
            AND tenant_id = manager_tenant_id
            AND is_active = true
            AND (
                -- Either the rep is managed by this manager
                manager_id = manager_uuid
                OR
                -- Or this is an admin/super_admin who can manage anyone in tenant
                manager_role IN ('admin', 'super_admin')
            )
        ) THEN
            -- Delete existing goals for this week and rep to avoid conflicts
            DELETE FROM public.weekly_goals 
            WHERE user_id = rep_id 
            AND week_start_date = week_start;
            
            -- Insert new goals for each goal type
            FOR goal_type_item IN SELECT * FROM jsonb_array_elements(goal_item->'goals') LOOP
                INSERT INTO public.weekly_goals (
                    user_id,
                    tenant_id,
                    week_start_date,
                    goal_type,
                    target_value,
                    current_value,
                    status
                ) VALUES (
                    rep_id,
                    manager_tenant_id,
                    week_start,
                    (goal_type_item->>'type')::TEXT,
                    COALESCE((goal_type_item->>'target')::INTEGER, 0),
                    COALESCE((goal_type_item->>'current')::INTEGER, 0),
                    CASE 
                        WHEN COALESCE((goal_type_item->>'target')::INTEGER, 0) > 0 THEN 'In Progress'::goal_status
                        ELSE 'Not Started'::goal_status
                    END
                );
                
                goals_count := goals_count + 1;
            END LOOP;
        ELSE
            -- Log which rep couldn't be updated
            RAISE NOTICE 'Rep % not found or not managed by manager %', rep_id, manager_uuid;
        END IF;
    END LOOP;
    
    IF goals_count = 0 THEN
        RETURN QUERY SELECT false, 'No goals were assigned. Please check that the reps belong to your team and are active.', 0;
    ELSE
        RETURN QUERY SELECT 
            true, 
            format('Successfully assigned %s goals for week starting %s', goals_count, week_start),
            goals_count;
    END IF;
END;
$$;

-- Create function to debug manager-rep relationships
CREATE OR REPLACE FUNCTION public.debug_manager_team_relationships(manager_uuid uuid)
RETURNS TABLE(
    manager_name text,
    manager_role text,
    tenant_name text,
    rep_id uuid,
    rep_name text,
    rep_role text,
    has_manager_relationship boolean,
    is_same_tenant boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.full_name as manager_name,
        m.role::text as manager_role,
        t.name as tenant_name,
        r.id as rep_id,
        r.full_name as rep_name,
        r.role::text as rep_role,
        (r.manager_id = m.id) as has_manager_relationship,
        (r.tenant_id = m.tenant_id) as is_same_tenant
    FROM public.user_profiles m
    LEFT JOIN public.tenants t ON m.tenant_id = t.id
    LEFT JOIN public.user_profiles r ON (r.tenant_id = m.tenant_id AND r.role = 'rep' AND r.is_active = true)
    WHERE m.id = manager_uuid
    AND m.is_active = true;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.establish_manager_team_relationships() TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_manager_team_relationships(uuid) TO authenticated;

-- Add helpful indexes for manager-rep relationships
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager_tenant_lookup 
ON public.user_profiles(manager_id, tenant_id, is_active) 
WHERE role = 'rep';

CREATE INDEX IF NOT EXISTS idx_weekly_goals_manager_access_lookup 
ON public.weekly_goals(user_id, week_start_date, goal_type);

-- Add comment explaining the fix
COMMENT ON POLICY "managers_can_manage_team_weekly_goals" ON public.weekly_goals IS 
'Enhanced policy allowing managers to set goals for their team members. Requires proper manager_id relationships in user_profiles table.';

COMMENT ON FUNCTION public.manager_assign_team_goals(uuid, jsonb) IS 
'Enhanced function for managers to assign goals to team members with better error handling and permission checking.';

COMMENT ON FUNCTION public.establish_manager_team_relationships() IS 
'Utility function to establish manager-rep relationships for teams in the same tenant where relationships are missing.';

COMMENT ON FUNCTION public.debug_manager_team_relationships(uuid) IS 
'Debug function to check manager-rep relationships and diagnose permission issues.';