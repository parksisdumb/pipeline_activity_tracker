-- Location: supabase/migrations/20250923172200_fix_manager_assign_goals_function.sql
-- Schema Analysis: weekly_goals table exists with columns: id, user_id, tenant_id, week_start_date, goal_type, target_value, current_value, status, notes, created_at, updated_at
-- Integration Type: Function modification to fix column reference error
-- Dependencies: weekly_goals table, user_profiles table

-- Fix the manager_assign_team_goals function by removing the non-existent assigned_by column reference
CREATE OR REPLACE FUNCTION public.manager_assign_team_goals(manager_uuid uuid, goal_data jsonb)
RETURNS TABLE(success boolean, message text, goals_assigned integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    manager_tenant_id UUID;
    goals_count INTEGER := 0;
    goal_item JSONB;
    rep_id UUID;
    week_start DATE;
BEGIN
    -- Verify manager permissions
    SELECT tenant_id INTO manager_tenant_id 
    FROM public.user_profiles 
    WHERE id = manager_uuid AND role IN ('manager', 'admin', 'super_admin');
    
    IF manager_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid manager or insufficient permissions', 0;
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
        
        -- Verify rep belongs to same tenant
        IF EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = rep_id 
            AND tenant_id = manager_tenant_id
        ) THEN
            -- Insert or update goals for each goal type (removed assigned_by column)
            FOR goal_item IN SELECT * FROM jsonb_array_elements(goal_item->'goals') LOOP
                INSERT INTO public.weekly_goals (
                    user_id,
                    tenant_id,
                    week_start_date,
                    goal_type,
                    target_value,
                    current_value
                ) VALUES (
                    rep_id,
                    manager_tenant_id,
                    week_start,
                    (goal_item->>'type')::TEXT,
                    COALESCE((goal_item->>'target')::INTEGER, 0),
                    COALESCE((goal_item->>'current')::INTEGER, 0)
                )
                ON CONFLICT (user_id, week_start_date, goal_type) 
                DO UPDATE SET
                    target_value = EXCLUDED.target_value,
                    updated_at = CURRENT_TIMESTAMP;
                
                goals_count := goals_count + 1;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        true, 
        format('Successfully assigned %s goals', goals_count),
        goals_count;
END;
$function$;