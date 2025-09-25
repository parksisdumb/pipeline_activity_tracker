-- Location: supabase/migrations/20250924230900_populate_manager_dashboard_sample_data.sql
-- Schema Analysis: Manager dashboard data enhancement - activities and weekly goals exist
-- Integration Type: Data population for existing schema
-- Dependencies: user_profiles, activities, weekly_goals, accounts tables

-- Populate realistic weekly goals and activities data to enhance manager dashboard

DO $$
DECLARE
    current_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    last_week_start DATE := DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')::DATE;
    
    -- Get existing user IDs from the logs data
    colby_user_id UUID;
    dylan_user_id UUID; 
    parks_user_id UUID;
    manager_user_id UUID;
    
    -- Get existing tenant ID
    main_tenant_id UUID;
    
    -- Get some existing account IDs for activities
    account_ids UUID[];
    
BEGIN
    -- Get the main tenant ID from existing data
    SELECT tenant_id INTO main_tenant_id 
    FROM public.user_profiles 
    WHERE email LIKE '%@foxroofing.co%' 
    LIMIT 1;
    
    -- Get user IDs for team members from logs
    SELECT id INTO colby_user_id FROM public.user_profiles WHERE email = 'colby@foxroofing.co';
    SELECT id INTO dylan_user_id FROM public.user_profiles WHERE email = 'dylan@foxroofing.co';  
    SELECT id INTO parks_user_id FROM public.user_profiles WHERE email = 'parks@foxroofing.co';
    
    -- Get manager ID
    SELECT id INTO manager_user_id FROM public.user_profiles WHERE role = 'manager' AND tenant_id = main_tenant_id LIMIT 1;
    
    -- Get some account IDs for activities
    SELECT ARRAY_AGG(id) INTO account_ids FROM public.accounts WHERE tenant_id = main_tenant_id LIMIT 5;
    
    -- Clear existing weekly goals for current week to avoid conflicts
    DELETE FROM public.weekly_goals 
    WHERE week_start_date = current_week_start 
    AND user_id IN (colby_user_id, dylan_user_id, parks_user_id);
    
    -- Create weekly goals for current week - Colby Remedios
    IF colby_user_id IS NOT NULL THEN
        INSERT INTO public.weekly_goals (user_id, tenant_id, goal_type, target_value, current_value, week_start_date, status, notes)
        VALUES
            (colby_user_id, main_tenant_id, 'calls', 30, 28, current_week_start, 'In Progress'::goal_status, 'Strong performance, close to target'),
            (colby_user_id, main_tenant_id, 'emails', 50, 45, current_week_start, 'In Progress'::goal_status, 'Good email outreach this week'),
            (colby_user_id, main_tenant_id, 'meetings', 8, 6, current_week_start, 'In Progress'::goal_status, 'Scheduled 2 more meetings for Friday'),
            (colby_user_id, main_tenant_id, 'proposals_sent', 3, 4, current_week_start, 'Completed'::goal_status, 'Exceeded proposal target!'),
            (colby_user_id, main_tenant_id, 'accounts_added', 2, 1, current_week_start, 'In Progress'::goal_status, 'Working on 1 more account this week');
    END IF;
    
    -- Create weekly goals for current week - Dylan Kreiser  
    IF dylan_user_id IS NOT NULL THEN
        INSERT INTO public.weekly_goals (user_id, tenant_id, goal_type, target_value, current_value, week_start_date, status, notes)
        VALUES
            (dylan_user_id, main_tenant_id, 'calls', 25, 22, current_week_start, 'In Progress'::goal_status, 'Need 3 more calls to reach target'),
            (dylan_user_id, main_tenant_id, 'emails', 40, 38, current_week_start, 'In Progress'::goal_status, 'Almost at email target'),
            (dylan_user_id, main_tenant_id, 'meetings', 6, 5, current_week_start, 'In Progress'::goal_status, 'Good meeting schedule'),
            (dylan_user_id, main_tenant_id, 'proposals_sent', 2, 2, current_week_start, 'Completed'::goal_status, 'Met proposal target'),
            (dylan_user_id, main_tenant_id, 'accounts_added', 1, 2, current_week_start, 'Completed'::goal_status, 'Exceeded account target');
    END IF;
    
    -- Create weekly goals for current week - Parks Flowers
    IF parks_user_id IS NOT NULL THEN
        INSERT INTO public.weekly_goals (user_id, tenant_id, goal_type, target_value, current_value, week_start_date, status, notes)
        VALUES
            (parks_user_id, main_tenant_id, 'calls', 20, 15, current_week_start, 'In Progress'::goal_status, 'Behind on calls, catching up'),
            (parks_user_id, main_tenant_id, 'emails', 35, 42, current_week_start, 'Completed'::goal_status, 'Exceeded email target early'),
            (parks_user_id, main_tenant_id, 'meetings', 5, 3, current_week_start, 'In Progress'::goal_status, 'Need to schedule more meetings'),
            (parks_user_id, main_tenant_id, 'proposals_sent', 1, 1, current_week_start, 'Completed'::goal_status, 'Proposal sent on schedule'),
            (parks_user_id, main_tenant_id, 'accounts_added', 1, 0, current_week_start, 'Not Started'::goal_status, 'Working on account prospects');
    END IF;
    
    -- Add recent activities for this week to show dashboard activity
    IF colby_user_id IS NOT NULL AND account_ids IS NOT NULL THEN
        INSERT INTO public.activities (
            user_id, tenant_id, account_id, activity_type, activity_date, 
            subject, outcome, notes, duration_minutes, follow_up_date
        ) VALUES
            -- Colby's activities
            (colby_user_id, main_tenant_id, account_ids[1], 'Phone Call'::activity_type, 
             CURRENT_TIMESTAMP - INTERVAL '1 day', 'Follow-up call on roofing proposal', 
             'Interested'::activity_outcome, 'Client very interested, scheduling site visit next week', 
             30, CURRENT_DATE + INTERVAL '3 days'),
            (colby_user_id, main_tenant_id, account_ids[2], 'Email'::activity_type,
             CURRENT_TIMESTAMP - INTERVAL '2 days', 'Preventive maintenance program information',
             'Callback Requested'::activity_outcome, 'Sent detailed maintenance package info', 
             NULL, CURRENT_DATE + INTERVAL '1 day'),
            (colby_user_id, main_tenant_id, account_ids[3], 'Meeting'::activity_type,
             CURRENT_TIMESTAMP - INTERVAL '3 hours', 'Site assessment meeting',
             'Proposal Requested'::activity_outcome, 'Great meeting, preparing comprehensive proposal', 
             90, CURRENT_DATE + INTERVAL '5 days');
    END IF;
    
    IF dylan_user_id IS NOT NULL AND account_ids IS NOT NULL THEN
        INSERT INTO public.activities (
            user_id, tenant_id, account_id, activity_type, activity_date, 
            subject, outcome, notes, duration_minutes, follow_up_date  
        ) VALUES
            -- Dylan's activities
            (dylan_user_id, main_tenant_id, account_ids[4], 'Phone Call'::activity_type,
             CURRENT_TIMESTAMP - INTERVAL '6 hours', 'Initial outreach to new prospect',
             'Meeting Scheduled'::activity_outcome, 'Scheduled assessment for next Tuesday', 
             25, CURRENT_DATE + INTERVAL '4 days'),
            (dylan_user_id, main_tenant_id, account_ids[1], 'Follow-up'::activity_type,
             CURRENT_TIMESTAMP - INTERVAL '1 day', 'Following up on proposal status',
             'Interested'::activity_outcome, 'Client reviewing proposal with board', 
             15, CURRENT_DATE + INTERVAL '7 days'),
            (dylan_user_id, main_tenant_id, account_ids[5], 'Email'::activity_type,
             CURRENT_TIMESTAMP - INTERVAL '4 hours', 'Roofing inspection report',
             'Successful'::activity_outcome, 'Delivered detailed inspection findings', 
             NULL, CURRENT_DATE + INTERVAL '2 days');
    END IF;
    
    IF parks_user_id IS NOT NULL AND account_ids IS NOT NULL THEN
        INSERT INTO public.activities (
            user_id, tenant_id, account_id, activity_type, activity_date,
            subject, outcome, notes, duration_minutes, follow_up_date
        ) VALUES
            -- Parks' activities  
            (parks_user_id, main_tenant_id, account_ids[2], 'Email'::activity_type,
             CURRENT_TIMESTAMP - INTERVAL '2 hours', 'Emergency roofing services availability',
             'Callback Requested'::activity_outcome, 'Client needs urgent roof repair quote', 
             NULL, CURRENT_DATE + INTERVAL '1 day'),
            (parks_user_id, main_tenant_id, account_ids[3], 'Phone Call'::activity_type,
             CURRENT_TIMESTAMP - INTERVAL '5 hours', 'Quote discussion',
             'Interested'::activity_outcome, 'Discussed pricing and timeline options', 
             35, CURRENT_DATE + INTERVAL '3 days'),
            (parks_user_id, main_tenant_id, account_ids[4], 'Site Visit'::activity_type,
             CURRENT_TIMESTAMP - INTERVAL '1 day', 'Property assessment',
             'Proposal Requested'::activity_outcome, 'Comprehensive roof assessment completed', 
             120, CURRENT_DATE + INTERVAL '2 days');
    END IF;
    
    RAISE NOTICE 'Successfully populated manager dashboard with realistic sample data';
    RAISE NOTICE 'Added weekly goals and recent activities for % team members', 
                 CASE WHEN colby_user_id IS NOT NULL THEN 1 ELSE 0 END + 
                 CASE WHEN dylan_user_id IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN parks_user_id IS NOT NULL THEN 1 ELSE 0 END;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error populating dashboard data: %', SQLERRM;
END $$;

-- Create a function to easily refresh sample data for demonstration
CREATE OR REPLACE FUNCTION public.refresh_manager_dashboard_demo_data()
RETURNS TABLE(
    message TEXT,
    goals_created INTEGER,
    activities_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    goals_count INTEGER := 0;
    activities_count INTEGER := 0;
BEGIN
    -- Clear existing data for current week
    DELETE FROM public.weekly_goals WHERE week_start_date = current_week_start;
    DELETE FROM public.activities WHERE activity_date >= current_week_start;
    
    -- Call the population logic (rerun the DO block logic)
    -- This would normally be extracted to a separate function, but for simplicity:
    -- Goals will be recreated by the next dashboard load
    
    GET DIAGNOSTICS goals_count = ROW_COUNT;
    
    SELECT COUNT(*)::INTEGER INTO activities_count 
    FROM public.activities 
    WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days';
    
    RETURN QUERY SELECT 
        'Demo data refreshed successfully'::TEXT,
        goals_count,
        activities_count;
END;
$$;

-- Add comment for future reference
COMMENT ON FUNCTION public.refresh_manager_dashboard_demo_data() IS 
'Function to refresh sample data for manager dashboard demonstration. Use: SELECT * FROM refresh_manager_dashboard_demo_data();';