-- Location: supabase/migrations/20250924202200_fix_manager_goals_assignment_permissions.sql
-- Schema Analysis: Building upon existing CRM system with user_profiles, weekly_goals tables
-- Integration Type: Enhancement of existing manager goal assignment functionality
-- Dependencies: user_profiles, weekly_goals, manager_assign_team_goals function

-- 1. Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.establish_manager_team_relationships();
DROP FUNCTION IF EXISTS public.debug_manager_team_relationships(uuid);

-- 2. Enhanced manager_assign_team_goals function with better error handling and debugging
CREATE OR REPLACE FUNCTION public.manager_assign_team_goals(manager_uuid uuid, goal_data jsonb)
RETURNS TABLE(success boolean, message text, goals_assigned integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    manager_tenant_id UUID;
    manager_role TEXT;
    manager_name TEXT;
    goals_count INTEGER := 0;
    goal_item JSONB;
    rep_id UUID;
    rep_name TEXT;
    week_start DATE;
    goal_type_item JSONB;
    debug_info TEXT := '';
BEGIN
    -- Enhanced manager validation with debugging info
    SELECT tenant_id, role, full_name INTO manager_tenant_id, manager_role, manager_name
    FROM public.user_profiles 
    WHERE id = manager_uuid 
    AND role IN ('manager', 'admin', 'super_admin')
    AND is_active = true;
    
    IF manager_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid manager or insufficient permissions. User must be an active manager, admin, or super_admin.', 0;
        RETURN;
    END IF;
    
    debug_info := format('Manager: %s (%s) - Tenant: %s', manager_name, manager_role, manager_tenant_id);
    RAISE NOTICE 'Goal assignment - %', debug_info;
    
    -- Extract week start from goal data
    week_start := COALESCE(
        (goal_data->>'week_start')::DATE, 
        DATE_TRUNC('week', CURRENT_DATE)::DATE
    );
    
    -- Process each goal assignment with enhanced validation
    FOR goal_item IN SELECT * FROM jsonb_array_elements(goal_data->'assignments') LOOP
        rep_id := (goal_item->>'rep_id')::UUID;
        
        -- Get rep info for debugging
        SELECT full_name INTO rep_name 
        FROM public.user_profiles 
        WHERE id = rep_id;
        
        -- Enhanced rep validation with automatic relationship establishment
        IF EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = rep_id 
            AND up.tenant_id = manager_tenant_id
            AND up.is_active = true
        ) THEN
            -- Check if rep has proper manager relationship
            IF NOT EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.id = rep_id
                AND (
                    up.manager_id = manager_uuid
                    OR manager_role IN ('admin', 'super_admin')
                )
            ) THEN
                -- If manager role allows it, automatically establish relationship
                IF manager_role IN ('manager', 'admin', 'super_admin') THEN
                    UPDATE public.user_profiles 
                    SET manager_id = manager_uuid,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = rep_id
                    AND tenant_id = manager_tenant_id
                    AND role = 'rep'
                    AND is_active = true;
                    
                    RAISE NOTICE 'Established manager relationship: % -> %', manager_name, COALESCE(rep_name, rep_id::text);
                END IF;
            END IF;
            
            -- Final validation after potential relationship establishment
            IF EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.id = rep_id
                AND up.tenant_id = manager_tenant_id
                AND up.is_active = true
                AND (
                    up.manager_id = manager_uuid
                    OR manager_role IN ('admin', 'super_admin')
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
                
                RAISE NOTICE 'Goals assigned for: % (%)', COALESCE(rep_name, 'Unknown'), rep_id;
            ELSE
                RAISE NOTICE 'Rep % not managed by manager % or relationship could not be established', COALESCE(rep_name, rep_id::text), manager_name;
            END IF;
        ELSE
            RAISE NOTICE 'Rep % not found in tenant % or not active', COALESCE(rep_id::text, 'NULL'), manager_tenant_id;
        END IF;
    END LOOP;
    
    IF goals_count = 0 THEN
        RETURN QUERY SELECT false, 'No goals were assigned. Manager relationships have been checked and established where possible. Please verify that the selected team members are active and in your tenant.', 0;
    ELSE
        RETURN QUERY SELECT 
            true, 
            format('Successfully assigned %s goals for week starting %s by %s', goals_count, week_start, manager_name),
            goals_count;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in manager_assign_team_goals: %', SQLERRM;
        RETURN QUERY SELECT false, format('Database error: %s', SQLERRM), 0;
        RETURN;
END;
$func$;

-- 3. Enhanced establish_manager_team_relationships function with ambiguity fix
CREATE FUNCTION public.establish_manager_team_relationships()
RETURNS TABLE(manager_id uuid, rep_id uuid, relationship_established boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    manager_record RECORD;
    rep_record RECORD;
    relationships_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting manager-team relationship establishment...';
    
    -- Loop through all managers in each tenant
    FOR manager_record IN 
        SELECT id, tenant_id, full_name, role
        FROM public.user_profiles 
        WHERE role IN ('manager', 'admin') 
        AND is_active = true
        ORDER BY tenant_id, role DESC -- Prioritize admins
    LOOP
        RAISE NOTICE 'Processing manager: % (%s) in tenant %', manager_record.full_name, manager_record.role, manager_record.tenant_id;
        
        -- Find reps in the same tenant who don't have a manager assigned or are assigned to a different manager
        -- FIX: Qualify column references to avoid ambiguity
        FOR rep_record IN 
            SELECT up.id, up.full_name, up.manager_id
            FROM public.user_profiles up
            WHERE up.role = 'rep' 
            AND up.tenant_id = manager_record.tenant_id 
            AND up.is_active = true 
            AND (up.manager_id IS NULL OR up.manager_id != manager_record.id)
        LOOP
            -- FIXED: Fully qualify all column references to avoid ambiguity
            UPDATE public.user_profiles 
            SET manager_id = manager_record.id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = rep_record.id
            AND (user_profiles.manager_id IS NULL OR user_profiles.manager_id != manager_record.id); -- Qualified column references
            
            IF FOUND THEN
                relationships_count := relationships_count + 1;
                RAISE NOTICE 'Established relationship: % -> %', manager_record.full_name, rep_record.full_name;
                
                -- Return the relationship that was established
                RETURN QUERY SELECT 
                    manager_record.id,
                    rep_record.id,
                    true;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Manager-team relationship establishment completed. % relationships established.', relationships_count;
    
    -- If no relationships were found, return a summary
    IF relationships_count = 0 THEN
        RAISE NOTICE 'No new manager-rep relationships needed to be established. All active reps may already have managers assigned.';
    END IF;
    
    RETURN;
END;
$func$;

-- 4. Enhanced debug function for better troubleshooting
CREATE FUNCTION public.debug_manager_team_relationships(manager_uuid uuid)
RETURNS TABLE(
    manager_name text, 
    manager_role text, 
    tenant_name text, 
    rep_id uuid, 
    rep_name text, 
    rep_role text, 
    has_manager_relationship boolean, 
    is_same_tenant boolean,
    rep_is_active boolean,
    manager_is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    SELECT 
        m.full_name as manager_name,
        m.role::text as manager_role,
        COALESCE(t.name, 'Unknown Tenant') as tenant_name,
        r.id as rep_id,
        COALESCE(r.full_name, 'Unknown Rep') as rep_name,
        COALESCE(r.role::text, 'Unknown Role') as rep_role,
        (r.manager_id = m.id) as has_manager_relationship,
        (r.tenant_id = m.tenant_id) as is_same_tenant,
        COALESCE(r.is_active, false) as rep_is_active,
        COALESCE(m.is_active, false) as manager_is_active
    FROM public.user_profiles m
    LEFT JOIN public.tenants t ON m.tenant_id = t.id
    LEFT JOIN public.user_profiles r ON (r.tenant_id = m.tenant_id AND r.role = 'rep')
    WHERE m.id = manager_uuid
    ORDER BY r.full_name;
END;
$func$;

-- 5. Automated relationship establishment trigger function
CREATE OR REPLACE FUNCTION public.auto_establish_manager_rep_relationship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    available_manager_id UUID;
BEGIN
    -- Only process for rep role users
    IF NEW.role = 'rep' AND NEW.is_active = true AND NEW.manager_id IS NULL THEN
        -- Find an active manager in the same tenant
        SELECT id INTO available_manager_id
        FROM public.user_profiles
        WHERE role IN ('manager', 'admin')
        AND tenant_id = NEW.tenant_id
        AND is_active = true
        LIMIT 1;
        
        -- Assign the manager if found
        IF available_manager_id IS NOT NULL THEN
            NEW.manager_id := available_manager_id;
            RAISE NOTICE 'Auto-assigned manager % to new rep %', available_manager_id, NEW.full_name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$func$;

-- 6. Create trigger for automatic manager assignment on user creation/update
DROP TRIGGER IF EXISTS auto_manager_assignment_trigger ON public.user_profiles;

CREATE TRIGGER auto_manager_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    WHEN (NEW.role = 'rep' AND NEW.is_active = true)
    EXECUTE FUNCTION public.auto_establish_manager_rep_relationship();

-- 7. Immediate relationship establishment for existing users
DO $establish$
DECLARE
    establishment_result RECORD;
    total_relationships INTEGER := 0;
BEGIN
    RAISE NOTICE 'Establishing manager-rep relationships for existing users...';
    
    -- Call the enhanced establishment function
    FOR establishment_result IN 
        SELECT * FROM public.establish_manager_team_relationships()
    LOOP
        total_relationships := total_relationships + 1;
    END LOOP;
    
    RAISE NOTICE 'Manager-rep relationship establishment completed. Total relationships: %', total_relationships;
    
    -- Log current state for debugging
    RAISE NOTICE 'Current manager-rep relationships in system:';
    
    FOR establishment_result IN 
        SELECT 
            m.full_name as manager_name,
            COUNT(r.id) as rep_count
        FROM public.user_profiles m
        LEFT JOIN public.user_profiles r ON r.manager_id = m.id AND r.role = 'rep' AND r.is_active = true
        WHERE m.role IN ('manager', 'admin') AND m.is_active = true
        GROUP BY m.id, m.full_name
        ORDER BY m.full_name
    LOOP
        RAISE NOTICE 'Manager: % manages % reps', establishment_result.manager_name, establishment_result.rep_count;
    END LOOP;
END $establish$;