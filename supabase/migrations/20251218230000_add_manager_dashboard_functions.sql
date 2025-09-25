-- Location: supabase/migrations/20251218230000_add_manager_dashboard_functions.sql
-- Schema Analysis: Existing CRM system with accounts, activities, user_profiles, weekly_goals tables
-- Integration Type: Addition - Adding missing manager dashboard functions
-- Dependencies: user_profiles, accounts, activities, weekly_goals, contacts, properties tables

-- Function 1: Get manager team funnel metrics
CREATE OR REPLACE FUNCTION public.get_manager_team_funnel_metrics(manager_uuid UUID)
RETURNS TABLE(
    total_accounts INTEGER,
    prospects INTEGER,
    contacted INTEGER,
    qualified INTEGER,
    assessment_scheduled INTEGER,
    assessed INTEGER,
    proposals_sent INTEGER,
    in_negotiation INTEGER,
    won INTEGER,
    lost INTEGER,
    conversion_rate DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    RETURN QUERY
    WITH team_accounts AS (
        SELECT a.stage
        FROM public.accounts a
        JOIN public.user_profiles up ON a.assigned_rep_id = up.id
        WHERE up.manager_id = manager_uuid
        AND a.is_active = true
        AND up.is_active = true
    ),
    funnel_stats AS (
        SELECT 
            COUNT(*) as total_accounts,
            COUNT(CASE WHEN stage = 'Prospect' THEN 1 END) as prospects,
            COUNT(CASE WHEN stage = 'Contacted' THEN 1 END) as contacted,
            COUNT(CASE WHEN stage = 'Qualified' THEN 1 END) as qualified,
            COUNT(CASE WHEN stage = 'Assessment Scheduled' THEN 1 END) as assessment_scheduled,
            COUNT(CASE WHEN stage = 'Assessed' THEN 1 END) as assessed,
            COUNT(CASE WHEN stage = 'Proposal Sent' THEN 1 END) as proposals_sent,
            COUNT(CASE WHEN stage = 'In Negotiation' THEN 1 END) as in_negotiation,
            COUNT(CASE WHEN stage = 'Won' THEN 1 END) as won,
            COUNT(CASE WHEN stage = 'Lost' THEN 1 END) as lost
        FROM team_accounts
    )
    SELECT 
        fs.total_accounts::INTEGER,
        fs.prospects::INTEGER,
        fs.contacted::INTEGER,
        fs.qualified::INTEGER,
        fs.assessment_scheduled::INTEGER,
        fs.assessed::INTEGER,
        fs.proposals_sent::INTEGER,
        fs.in_negotiation::INTEGER,
        fs.won::INTEGER,
        fs.lost::INTEGER,
        CASE 
            WHEN fs.total_accounts > 0 THEN 
                ROUND((fs.won::DECIMAL / fs.total_accounts::DECIMAL) * 100, 2)
            ELSE 0
        END as conversion_rate
    FROM funnel_stats fs;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_funnel_metrics: %', SQLERRM;
        -- Return default values on error
        RETURN QUERY SELECT 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0::DECIMAL;
END;
$func$;

-- Function 2: Get manager team metrics by goal type
CREATE OR REPLACE FUNCTION public.get_manager_team_metrics(manager_uuid UUID, week_start DATE DEFAULT NULL)
RETURNS TABLE(
    calls_target INTEGER,
    calls_current INTEGER,
    emails_target INTEGER,
    emails_current INTEGER,
    meetings_target INTEGER,
    meetings_current INTEGER,
    assessments_target INTEGER,
    assessments_current INTEGER,
    proposals_target INTEGER,
    proposals_current INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    target_week DATE;
BEGIN
    -- Use current week if not specified
    IF week_start IS NULL THEN
        target_week := date_trunc('week', CURRENT_DATE);
    ELSE
        target_week := week_start;
    END IF;

    RETURN QUERY
    WITH team_goals AS (
        SELECT 
            wg.goal_type,
            COALESCE(SUM(wg.target_value), 0) as total_target,
            COALESCE(SUM(wg.current_value), 0) as total_current
        FROM public.weekly_goals wg
        JOIN public.user_profiles up ON wg.user_id = up.id
        WHERE up.manager_id = manager_uuid
        AND wg.week_start_date = target_week
        AND up.is_active = true
        GROUP BY wg.goal_type
    )
    SELECT 
        COALESCE((SELECT tg.total_target FROM team_goals tg WHERE tg.goal_type = 'calls'), 0)::INTEGER as calls_target,
        COALESCE((SELECT tg.total_current FROM team_goals tg WHERE tg.goal_type = 'calls'), 0)::INTEGER as calls_current,
        COALESCE((SELECT tg.total_target FROM team_goals tg WHERE tg.goal_type = 'emails'), 0)::INTEGER as emails_target,
        COALESCE((SELECT tg.total_current FROM team_goals tg WHERE tg.goal_type = 'emails'), 0)::INTEGER as emails_current,
        COALESCE((SELECT tg.total_target FROM team_goals tg WHERE tg.goal_type = 'meetings'), 0)::INTEGER as meetings_target,
        COALESCE((SELECT tg.total_current FROM team_goals tg WHERE tg.goal_type = 'meetings'), 0)::INTEGER as meetings_current,
        COALESCE((SELECT tg.total_target FROM team_goals tg WHERE tg.goal_type = 'assessments'), 0)::INTEGER as assessments_target,
        COALESCE((SELECT tg.total_current FROM team_goals tg WHERE tg.goal_type = 'assessments'), 0)::INTEGER as assessments_current,
        COALESCE((SELECT tg.total_target FROM team_goals tg WHERE tg.goal_type = 'proposals'), 0)::INTEGER as proposals_target,
        COALESCE((SELECT tg.total_current FROM team_goals tg WHERE tg.goal_type = 'proposals'), 0)::INTEGER as proposals_current;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_metrics: %', SQLERRM;
        -- Return default values on error
        RETURN QUERY SELECT 0, 0, 0, 0, 0, 0, 0, 0, 0, 0;
END;
$func$;

-- Function 3: Get manager team summary
CREATE OR REPLACE FUNCTION public.get_manager_team_summary(manager_uuid UUID)
RETURNS TABLE(
    team_size INTEGER,
    active_accounts INTEGER,
    total_activities_this_week INTEGER,
    total_properties INTEGER,
    avg_account_stage_progress DECIMAL,
    top_performer TEXT,
    team_performance_rating TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    week_start_date DATE;
BEGIN
    week_start_date := date_trunc('week', CURRENT_DATE);

    RETURN QUERY
    WITH team_stats AS (
        SELECT 
            COUNT(DISTINCT up.id) as team_size,
            COUNT(DISTINCT a.id) as active_accounts,
            COUNT(DISTINCT p.id) as total_properties
        FROM public.user_profiles up
        LEFT JOIN public.accounts a ON a.assigned_rep_id = up.id AND a.is_active = true
        LEFT JOIN public.properties p ON p.account_id = a.id
        WHERE up.manager_id = manager_uuid
        AND up.is_active = true
    ),
    activity_stats AS (
        SELECT COUNT(*) as weekly_activities
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
            ) as avg_progress
        FROM public.accounts a
        JOIN public.user_profiles up ON a.assigned_rep_id = up.id
        WHERE up.manager_id = manager_uuid
        AND a.is_active = true
        AND up.is_active = true
    ),
    top_performer AS (
        SELECT 
            up.full_name,
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
        ts.team_size::INTEGER,
        ts.active_accounts::INTEGER,
        COALESCE(ast.weekly_activities, 0)::INTEGER,
        ts.total_properties::INTEGER,
        COALESCE(ROUND(sp.avg_progress, 2), 0.0)::DECIMAL,
        COALESCE(tp.full_name, 'No data')::TEXT,
        CASE 
            WHEN ts.team_size = 0 THEN 'No Team'
            WHEN sp.avg_progress >= 6 THEN 'Excellent'
            WHEN sp.avg_progress >= 4 THEN 'Good'
            WHEN sp.avg_progress >= 2 THEN 'Needs Improvement'
            ELSE 'Critical'
        END::TEXT as team_performance_rating
    FROM team_stats ts
    CROSS JOIN activity_stats ast
    CROSS JOIN stage_progress sp
    CROSS JOIN top_performer tp;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_summary: %', SQLERRM;
        -- Return default values on error
        RETURN QUERY SELECT 0, 0, 0, 0, 0.0::DECIMAL, 'Error'::TEXT, 'Error'::TEXT;
END;
$func$;

-- Function 4: Get detailed team performance (enhanced version)
CREATE OR REPLACE FUNCTION public.get_manager_team_performance_detailed(manager_uuid UUID, week_start DATE DEFAULT NULL)
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    total_accounts INTEGER,
    activities_this_week INTEGER,
    goals_completed INTEGER,
    goals_total INTEGER,
    performance_score DECIMAL,
    last_activity_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    target_week DATE;
BEGIN
    -- Use current week if not specified
    IF week_start IS NULL THEN
        target_week := date_trunc('week', CURRENT_DATE);
    ELSE
        target_week := week_start;
    END IF;

    RETURN QUERY
    SELECT 
        up.id as user_id,
        up.full_name::TEXT,
        up.email::TEXT,
        up.role::TEXT,
        COUNT(DISTINCT a.id)::INTEGER as total_accounts,
        COUNT(DISTINCT act.id)::INTEGER as activities_this_week,
        COUNT(DISTINCT CASE WHEN wg.status = 'Completed' THEN wg.id END)::INTEGER as goals_completed,
        COUNT(DISTINCT wg.id)::INTEGER as goals_total,
        CASE 
            WHEN COUNT(DISTINCT wg.id) > 0 THEN
                ROUND(
                    (COUNT(DISTINCT CASE WHEN wg.status = 'Completed' THEN wg.id END)::DECIMAL / 
                     COUNT(DISTINCT wg.id)::DECIMAL) * 100, 
                    2
                )
            ELSE 0.0
        END::DECIMAL as performance_score,
        MAX(act.activity_date) as last_activity_date
    FROM public.user_profiles up
    LEFT JOIN public.accounts a ON a.assigned_rep_id = up.id AND a.is_active = true
    LEFT JOIN public.activities act ON act.user_id = up.id 
        AND act.activity_date >= target_week
        AND act.activity_date < target_week + INTERVAL '7 days'
    LEFT JOIN public.weekly_goals wg ON wg.user_id = up.id 
        AND wg.week_start_date = target_week
    WHERE up.manager_id = manager_uuid
    AND up.is_active = true
    GROUP BY up.id, up.full_name, up.email, up.role
    ORDER BY performance_score DESC, activities_this_week DESC;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_manager_team_performance_detailed: %', SQLERRM;
        RETURN;
END;
$func$;

-- Add comment explaining the functions
COMMENT ON FUNCTION public.get_manager_team_funnel_metrics(UUID) IS 'Returns sales funnel metrics for accounts managed by team members under specified manager';
COMMENT ON FUNCTION public.get_manager_team_metrics(UUID, DATE) IS 'Returns aggregated weekly goal metrics for all team members under specified manager';
COMMENT ON FUNCTION public.get_manager_team_summary(UUID) IS 'Returns high-level team summary statistics and performance indicators';
COMMENT ON FUNCTION public.get_manager_team_performance_detailed(UUID, DATE) IS 'Returns detailed individual performance metrics for each team member';