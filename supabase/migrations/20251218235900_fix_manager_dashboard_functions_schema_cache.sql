-- Schema Analysis: CRM system with user_profiles, accounts, activities, weekly_goals tables
-- Integration Type: Modification - Fix function signatures and schema cache issues
-- Dependencies: user_profiles, accounts, activities, weekly_goals

-- Fix manager dashboard functions that are missing from schema cache
-- This migration recreates the functions with correct signatures and ensures PostgREST compatibility

-- 1. Drop and recreate get_manager_team_summary function
DROP FUNCTION IF EXISTS public.get_manager_team_summary(uuid);

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
AS $func$
DECLARE
    week_start_date DATE;
BEGIN
    week_start_date := date_trunc('week', CURRENT_DATE)::DATE;

    RETURN QUERY
    WITH team_stats AS (
        SELECT 
            COUNT(DISTINCT up.id)::INTEGER as team_count,
            COUNT(DISTINCT a.id)::INTEGER as account_count,
            COUNT(DISTINCT p.id)::INTEGER as property_count
        FROM public.user_profiles up
        LEFT JOIN public.accounts a ON a.assigned_rep_id = up.id AND a.is_active = true
        LEFT JOIN public.properties p ON p.account_id = a.id
        WHERE up.manager_id = manager_uuid
        AND up.is_active = true
    ),
    activity_stats AS (
        SELECT COUNT(*)::INTEGER as weekly_activities
        FROM public.activities act
        JOIN public.user_profiles up ON act.user_id = up.id
        WHERE up.manager_id = manager_uuid
        AND act.activity_date >= week_start_date
        AND act.activity_date < week_start_date + INTERVAL '7 days'
        AND up.is_active = true
    ),
    stage_progress AS (
        SELECT 
            AVG(
                CASE a.stage
                    WHEN 'Prospect' THEN 1
                    WHEN 'Contacted' THEN 2
                    WHEN 'Qualified' THEN 3
                    WHEN 'Assessment Scheduled' THEN 4
                    WHEN 'Assessed' THEN 5
                    WHEN 'Proposal Sent' THEN 6
                    WHEN 'In Negotiation' THEN 7
                    WHEN 'Won' THEN 8
                    WHEN 'Lost' THEN 0
                    ELSE 1
                END
            )::NUMERIC(10,2) as avg_progress
        FROM public.accounts a
        JOIN public.user_profiles up ON a.assigned_rep_id = up.id
        WHERE up.manager_id = manager_uuid
        AND a.is_active = true
        AND up.is_active = true
    ),
    top_performer AS (
        SELECT 
            COALESCE(up.full_name, 'No data')::TEXT as performer_name,
            COUNT(act.id) as activity_count
        FROM public.user_profiles up
        LEFT JOIN public.activities act ON act.user_id = up.id 
            AND act.activity_date >= week_start_date
            AND act.activity_date < week_start_date + INTERVAL '7 days'
        WHERE up.manager_id = manager_uuid
        AND up.is_active = true
        GROUP BY up.id, up.full_name
        ORDER BY activity_count DESC
        LIMIT 1
    )
    SELECT 
        COALESCE(ts.team_count, 0)::INTEGER,
        COALESCE(ts.account_count, 0)::INTEGER,
        COALESCE(ast.weekly_activities, 0)::INTEGER,
        COALESCE(ts.property_count, 0)::INTEGER,
        COALESCE(sp.avg_progress, 0.0)::NUMERIC(10,2),
        COALESCE(tp.performer_name, 'No data')::TEXT,
        CASE 
            WHEN COALESCE(ts.team_count, 0) = 0 THEN 'No Team'
            WHEN COALESCE(sp.avg_progress, 0) >= 6 THEN 'Excellent'
            WHEN COALESCE(sp.avg_progress, 0) >= 4 THEN 'Good'
            WHEN COALESCE(sp.avg_progress, 0) >= 2 THEN 'Needs Improvement'
            ELSE 'Critical'
        END::TEXT as performance_rating
    FROM team_stats ts
    CROSS JOIN activity_stats ast
    CROSS JOIN stage_progress sp
    CROSS JOIN top_performer tp;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_summary: %', SQLERRM;
        -- Return default values on error
        RETURN QUERY SELECT 0, 0, 0, 0, 0.0::NUMERIC(10,2), 'Error'::TEXT, 'Error'::TEXT;
END;
$func$;

-- 2. Drop and recreate get_manager_team_funnel_metrics function
DROP FUNCTION IF EXISTS public.get_manager_team_funnel_metrics(uuid);

CREATE OR REPLACE FUNCTION public.get_manager_team_funnel_metrics(manager_uuid uuid)
RETURNS TABLE(
    total_accounts integer,
    prospects integer,
    contacted integer,
    qualified integer,
    assessed integer,
    proposals_sent integer,
    in_negotiation integer,
    won integer,
    lost integer,
    conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    WITH funnel_data AS (
        SELECT 
            COUNT(*)::INTEGER as total_count,
            COUNT(CASE WHEN a.stage = 'Prospect' THEN 1 END)::INTEGER as prospect_count,
            COUNT(CASE WHEN a.stage = 'Contacted' THEN 1 END)::INTEGER as contacted_count,
            COUNT(CASE WHEN a.stage = 'Qualified' THEN 1 END)::INTEGER as qualified_count,
            COUNT(CASE WHEN a.stage = 'Assessed' THEN 1 END)::INTEGER as assessed_count,
            COUNT(CASE WHEN a.stage = 'Proposal Sent' THEN 1 END)::INTEGER as proposal_count,
            COUNT(CASE WHEN a.stage = 'In Negotiation' THEN 1 END)::INTEGER as negotiation_count,
            COUNT(CASE WHEN a.stage = 'Won' THEN 1 END)::INTEGER as won_count,
            COUNT(CASE WHEN a.stage = 'Lost' THEN 1 END)::INTEGER as lost_count
        FROM public.accounts a
        JOIN public.user_profiles up ON a.assigned_rep_id = up.id
        WHERE up.manager_id = manager_uuid
        AND a.is_active = true
        AND up.is_active = true
    )
    SELECT 
        fd.total_count,
        fd.prospect_count,
        fd.contacted_count,
        fd.qualified_count,
        fd.assessed_count,
        fd.proposal_count,
        fd.negotiation_count,
        fd.won_count,
        fd.lost_count,
        CASE 
            WHEN fd.total_count > 0 THEN 
                ROUND((fd.won_count::NUMERIC / fd.total_count::NUMERIC) * 100, 2)
            ELSE 0.0
        END::NUMERIC(10,2) as conversion_percentage
    FROM funnel_data fd;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_funnel_metrics: %', SQLERRM;
        -- Return default values on error
        RETURN QUERY SELECT 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0::NUMERIC(10,2);
END;
$func$;

-- 3. Drop and recreate get_manager_team_metrics function with proper signature
DROP FUNCTION IF EXISTS public.get_manager_team_metrics(uuid);
DROP FUNCTION IF EXISTS public.get_manager_team_metrics(uuid, date);

CREATE OR REPLACE FUNCTION public.get_manager_team_metrics(manager_uuid uuid, week_start date DEFAULT NULL)
RETURNS TABLE(
    calls_target integer,
    calls_actual integer,
    calls_progress numeric,
    emails_target integer,
    emails_actual integer,
    emails_progress numeric,
    meetings_target integer,
    meetings_actual integer,
    meetings_progress numeric,
    assessments_target integer,
    assessments_actual integer,
    assessments_progress numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    week_date DATE;
BEGIN
    -- Use provided week_start or default to current week
    week_date := COALESCE(week_start, date_trunc('week', CURRENT_DATE)::DATE);

    RETURN QUERY
    WITH goals_summary AS (
        SELECT 
            wg.goal_type,
            SUM(wg.target_value)::INTEGER as total_target,
            SUM(wg.current_value)::INTEGER as total_current
        FROM public.weekly_goals wg
        JOIN public.user_profiles up ON wg.user_id = up.id
        WHERE up.manager_id = manager_uuid
        AND wg.week_start_date = week_date
        AND up.is_active = true
        GROUP BY wg.goal_type
    ),
    activity_summary AS (
        SELECT 
            act.activity_type,
            COUNT(*)::INTEGER as activity_count
        FROM public.activities act
        JOIN public.user_profiles up ON act.user_id = up.id
        WHERE up.manager_id = manager_uuid
        AND act.activity_date >= week_date
        AND act.activity_date < week_date + INTERVAL '7 days'
        AND up.is_active = true
        GROUP BY act.activity_type
    )
    SELECT 
        COALESCE((SELECT total_target FROM goals_summary WHERE goal_type = 'calls'), 0),
        COALESCE((SELECT total_current FROM goals_summary WHERE goal_type = 'calls'), 
                 (SELECT activity_count FROM activity_summary WHERE activity_type = 'Phone Call'), 0),
        CASE 
            WHEN COALESCE((SELECT total_target FROM goals_summary WHERE goal_type = 'calls'), 0) > 0 
            THEN ROUND((COALESCE((SELECT total_current FROM goals_summary WHERE goal_type = 'calls'), 0)::NUMERIC / 
                       (SELECT total_target FROM goals_summary WHERE goal_type = 'calls')::NUMERIC) * 100, 2)
            ELSE 0.0
        END::NUMERIC(10,2),
        
        COALESCE((SELECT total_target FROM goals_summary WHERE goal_type = 'emails'), 0),
        COALESCE((SELECT total_current FROM goals_summary WHERE goal_type = 'emails'),
                 (SELECT activity_count FROM activity_summary WHERE activity_type = 'Email'), 0),
        CASE 
            WHEN COALESCE((SELECT total_target FROM goals_summary WHERE goal_type = 'emails'), 0) > 0 
            THEN ROUND((COALESCE((SELECT total_current FROM goals_summary WHERE goal_type = 'emails'), 0)::NUMERIC / 
                       (SELECT total_target FROM goals_summary WHERE goal_type = 'emails')::NUMERIC) * 100, 2)
            ELSE 0.0
        END::NUMERIC(10,2),
        
        COALESCE((SELECT total_target FROM goals_summary WHERE goal_type = 'meetings'), 0),
        COALESCE((SELECT total_current FROM goals_summary WHERE goal_type = 'meetings'),
                 (SELECT activity_count FROM activity_summary WHERE activity_type = 'Meeting'), 0),
        CASE 
            WHEN COALESCE((SELECT total_target FROM goals_summary WHERE goal_type = 'meetings'), 0) > 0 
            THEN ROUND((COALESCE((SELECT total_current FROM goals_summary WHERE goal_type = 'meetings'), 0)::NUMERIC / 
                       (SELECT total_target FROM goals_summary WHERE goal_type = 'meetings')::NUMERIC) * 100, 2)
            ELSE 0.0
        END::NUMERIC(10,2),
        
        COALESCE((SELECT total_target FROM goals_summary WHERE goal_type = 'assessments'), 0),
        COALESCE((SELECT total_current FROM goals_summary WHERE goal_type = 'assessments'),
                 (SELECT activity_count FROM activity_summary WHERE activity_type = 'Assessment'), 0),
        CASE 
            WHEN COALESCE((SELECT total_target FROM goals_summary WHERE goal_type = 'assessments'), 0) > 0 
            THEN ROUND((COALESCE((SELECT total_current FROM goals_summary WHERE goal_type = 'assessments'), 0)::NUMERIC / 
                       (SELECT total_target FROM goals_summary WHERE goal_type = 'assessments')::NUMERIC) * 100, 2)
            ELSE 0.0
        END::NUMERIC(10,2);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_metrics: %', SQLERRM;
        -- Return default values on error
        RETURN QUERY SELECT 0, 0, 0.0::NUMERIC(10,2), 0, 0, 0.0::NUMERIC(10,2), 0, 0, 0.0::NUMERIC(10,2), 0, 0, 0.0::NUMERIC(10,2);
END;
$func$;

-- 4. Drop and recreate get_manager_team_performance_detailed function with proper signature
DROP FUNCTION IF EXISTS public.get_manager_team_performance_detailed(uuid);
DROP FUNCTION IF EXISTS public.get_manager_team_performance_detailed(uuid, date);

CREATE OR REPLACE FUNCTION public.get_manager_team_performance_detailed(manager_uuid uuid, week_start date DEFAULT NULL)
RETURNS TABLE(
    user_id uuid,
    full_name text,
    email text,
    role text,
    calls_target integer,
    calls_actual integer,
    calls_progress numeric,
    emails_target integer,
    emails_actual integer,
    emails_progress numeric,
    meetings_target integer,
    meetings_actual integer,
    meetings_progress numeric,
    total_activities integer,
    accounts_assigned integer,
    last_activity_date timestamptz,
    performance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    week_date DATE;
BEGIN
    -- Use provided week_start or default to current week
    week_date := COALESCE(week_start, date_trunc('week', CURRENT_DATE)::DATE);

    RETURN QUERY
    SELECT 
        up.id,
        up.full_name,
        up.email,
        up.role::TEXT,
        
        -- Calls metrics
        COALESCE(wg_calls.target_value, 0)::INTEGER,
        COALESCE(wg_calls.current_value, 0)::INTEGER,
        CASE 
            WHEN COALESCE(wg_calls.target_value, 0) > 0 
            THEN ROUND((COALESCE(wg_calls.current_value, 0)::NUMERIC / wg_calls.target_value::NUMERIC) * 100, 2)
            ELSE 0.0
        END::NUMERIC(10,2),
        
        -- Emails metrics
        COALESCE(wg_emails.target_value, 0)::INTEGER,
        COALESCE(wg_emails.current_value, 0)::INTEGER,
        CASE 
            WHEN COALESCE(wg_emails.target_value, 0) > 0 
            THEN ROUND((COALESCE(wg_emails.current_value, 0)::NUMERIC / wg_emails.target_value::NUMERIC) * 100, 2)
            ELSE 0.0
        END::NUMERIC(10,2),
        
        -- Meetings metrics
        COALESCE(wg_meetings.target_value, 0)::INTEGER,
        COALESCE(wg_meetings.current_value, 0)::INTEGER,
        CASE 
            WHEN COALESCE(wg_meetings.target_value, 0) > 0 
            THEN ROUND((COALESCE(wg_meetings.current_value, 0)::NUMERIC / wg_meetings.target_value::NUMERIC) * 100, 2)
            ELSE 0.0
        END::NUMERIC(10,2),
        
        -- Additional metrics
        COALESCE(act_summary.total_activities, 0)::INTEGER,
        COALESCE(account_summary.assigned_count, 0)::INTEGER,
        act_summary.last_activity,
        
        -- Performance score calculation
        CASE 
            WHEN (COALESCE(wg_calls.target_value, 0) + COALESCE(wg_emails.target_value, 0) + COALESCE(wg_meetings.target_value, 0)) > 0
            THEN ROUND(
                ((COALESCE(wg_calls.current_value, 0)::NUMERIC / NULLIF(wg_calls.target_value, 0)::NUMERIC * 0.4) +
                 (COALESCE(wg_emails.current_value, 0)::NUMERIC / NULLIF(wg_emails.target_value, 0)::NUMERIC * 0.3) +
                 (COALESCE(wg_meetings.current_value, 0)::NUMERIC / NULLIF(wg_meetings.target_value, 0)::NUMERIC * 0.3)) * 100, 
                2)
            ELSE 0.0
        END::NUMERIC(10,2)
        
    FROM public.user_profiles up
    LEFT JOIN public.weekly_goals wg_calls ON up.id = wg_calls.user_id 
        AND wg_calls.goal_type = 'calls' 
        AND wg_calls.week_start_date = week_date
    LEFT JOIN public.weekly_goals wg_emails ON up.id = wg_emails.user_id 
        AND wg_emails.goal_type = 'emails' 
        AND wg_emails.week_start_date = week_date
    LEFT JOIN public.weekly_goals wg_meetings ON up.id = wg_meetings.user_id 
        AND wg_meetings.goal_type = 'meetings' 
        AND wg_meetings.week_start_date = week_date
    LEFT JOIN (
        SELECT 
            act.user_id,
            COUNT(*)::INTEGER as total_activities,
            MAX(act.activity_date) as last_activity
        FROM public.activities act
        WHERE act.activity_date >= week_date
        AND act.activity_date < week_date + INTERVAL '7 days'
        GROUP BY act.user_id
    ) act_summary ON up.id = act_summary.user_id
    LEFT JOIN (
        SELECT 
            a.assigned_rep_id,
            COUNT(*)::INTEGER as assigned_count
        FROM public.accounts a
        WHERE a.is_active = true
        GROUP BY a.assigned_rep_id
    ) account_summary ON up.id = account_summary.assigned_rep_id
    
    WHERE up.manager_id = manager_uuid
    AND up.is_active = true
    ORDER BY up.full_name;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_performance_detailed: %', SQLERRM;
        RETURN;
END;
$func$;

-- 5. Grant necessary permissions for these functions
GRANT EXECUTE ON FUNCTION public.get_manager_team_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manager_team_funnel_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manager_team_metrics(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manager_team_performance_detailed(uuid, date) TO authenticated;

-- 6. Add comment for schema cache refresh
COMMENT ON FUNCTION public.get_manager_team_summary(uuid) IS 'Manager dashboard team summary metrics - refreshed for schema cache compatibility';
COMMENT ON FUNCTION public.get_manager_team_funnel_metrics(uuid) IS 'Manager dashboard funnel metrics - refreshed for schema cache compatibility';
COMMENT ON FUNCTION public.get_manager_team_metrics(uuid, date) IS 'Manager dashboard team goal metrics with optional week parameter - refreshed for schema cache compatibility';
COMMENT ON FUNCTION public.get_manager_team_performance_detailed(uuid, date) IS 'Manager dashboard detailed team performance with optional week parameter - refreshed for schema cache compatibility';