-- Fix get_manager_team_summary function to properly calculate team summary metrics
-- The function was returning zeros due to incorrect aggregation logic

CREATE OR REPLACE FUNCTION public.get_manager_team_summary(manager_uuid uuid)
 RETURNS TABLE(
    team_size integer, 
    active_accounts integer, 
    total_activities_this_week integer, 
    total_properties integer, 
    avg_account_stage_progress numeric, 
    top_performer text, 
    team_performance_rating text
)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    week_start_date DATE;
    team_tenant_id UUID;
BEGIN
    -- Get current week start
    week_start_date := date_trunc('week', CURRENT_DATE)::DATE;
    
    -- Get manager's tenant_id for proper data filtering
    SELECT tenant_id INTO team_tenant_id
    FROM public.user_profiles 
    WHERE id = manager_uuid 
    LIMIT 1;

    IF team_tenant_id IS NULL THEN
        RAISE NOTICE 'Manager not found or no tenant_id: %', manager_uuid;
        RETURN QUERY SELECT 0, 0, 0, 0, 0.0::NUMERIC(10,2), 'Manager Not Found'::TEXT, 'Error'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY
    WITH team_members AS (
        -- Get all team members (direct reports of this manager)
        SELECT id, full_name, email, role
        FROM public.user_profiles up
        WHERE up.manager_id = manager_uuid
        AND up.is_active = true
        AND up.tenant_id = team_tenant_id
    ),
    team_stats AS (
        SELECT 
            COUNT(*)::INTEGER as team_count
        FROM team_members
    ),
    account_stats AS (
        -- Count active accounts assigned to team members
        SELECT 
            COUNT(DISTINCT a.id)::INTEGER as account_count,
            COUNT(DISTINCT p.id)::INTEGER as property_count
        FROM public.accounts a
        INNER JOIN team_members tm ON a.assigned_rep_id = tm.id
        LEFT JOIN public.properties p ON p.account_id = a.id
        WHERE a.is_active = true
        AND a.tenant_id = team_tenant_id
    ),
    activity_stats AS (
        -- Count activities for the current week
        SELECT COUNT(*)::INTEGER as weekly_activities
        FROM public.activities act
        INNER JOIN team_members tm ON act.user_id = tm.id
        WHERE act.activity_date >= week_start_date
        AND act.activity_date < week_start_date + INTERVAL '7 days'
        AND act.tenant_id = team_tenant_id
    ),
    stage_progress AS (
        -- Calculate average account stage progress
        SELECT 
            AVG(
                CASE a.stage::TEXT
                    WHEN 'Prospect' THEN 1
                    WHEN 'Contacted' THEN 2
                    WHEN 'Vendor Packet Request' THEN 3
                    WHEN 'Vendor Packet Submitted' THEN 4
                    WHEN 'Approved for Work' THEN 5
                    WHEN 'Actively Engaged' THEN 6
                    ELSE 1
                END
            )::NUMERIC(10,2) as avg_progress
        FROM public.accounts a
        INNER JOIN team_members tm ON a.assigned_rep_id = tm.id
        WHERE a.is_active = true
        AND a.tenant_id = team_tenant_id
    ),
    top_performer AS (
        -- Find the top performer based on weekly activities
        SELECT 
            COALESCE(tm.full_name, 'No activities')::TEXT as performer_name,
            COALESCE(COUNT(act.id), 0) as activity_count
        FROM team_members tm
        LEFT JOIN public.activities act ON act.user_id = tm.id 
            AND act.activity_date >= week_start_date
            AND act.activity_date < week_start_date + INTERVAL '7 days'
            AND act.tenant_id = team_tenant_id
        GROUP BY tm.id, tm.full_name
        ORDER BY activity_count DESC
        LIMIT 1
    )
    SELECT 
        COALESCE(ts.team_count, 0)::INTEGER,
        COALESCE(ast.account_count, 0)::INTEGER,
        COALESCE(acts.weekly_activities, 0)::INTEGER,
        COALESCE(ast.property_count, 0)::INTEGER,
        COALESCE(sp.avg_progress, 0.0)::NUMERIC(10,2),
        COALESCE(tp.performer_name, 'No data')::TEXT,
        CASE 
            WHEN COALESCE(ts.team_count, 0) = 0 THEN 'No Team Members'
            WHEN COALESCE(sp.avg_progress, 0) >= 5 THEN 'Excellent'
            WHEN COALESCE(sp.avg_progress, 0) >= 3 THEN 'Good'
            WHEN COALESCE(sp.avg_progress, 0) >= 1 THEN 'Needs Improvement'
            ELSE 'Getting Started'
        END::TEXT
    FROM team_stats ts
    CROSS JOIN account_stats ast
    CROSS JOIN activity_stats acts
    CROSS JOIN stage_progress sp
    CROSS JOIN top_performer tp;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_summary: %', SQLERRM;
        -- Return meaningful default values on error
        RETURN QUERY SELECT 0, 0, 0, 0, 0.0::NUMERIC(10,2), 'Error occurred'::TEXT, 'Error'::TEXT;
END;
$function$;

-- Add helpful comment
COMMENT ON FUNCTION public.get_manager_team_summary(uuid) IS 
'Fixed function that properly calculates team summary metrics for manager dashboard. Counts team members, accounts, activities, and properties with proper tenant filtering and manager hierarchy checks.';