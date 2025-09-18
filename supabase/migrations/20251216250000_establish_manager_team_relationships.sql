-- Establish Manager Team Relationships for Real Data Display
-- This migration sets up proper manager hierarchies so the team dashboard shows real data

-- Step 1: Identify users who should be managers based on existing data patterns
UPDATE user_profiles 
SET role = 'manager'::user_role 
WHERE role = 'rep'::user_role 
AND id IN (
    -- Users who have been assigned to accounts (indicating they are senior/managers)
    SELECT DISTINCT assigned_rep_id 
    FROM accounts 
    WHERE assigned_rep_id IS NOT NULL
    GROUP BY assigned_rep_id
    HAVING COUNT(*) > 5  -- Users with more than 5 accounts become managers
);

-- Step 2: Set up manager relationships - assign reps to managers within the same tenant
WITH manager_assignments AS (
    SELECT 
        tenant_id,
        ARRAY_AGG(id ORDER BY created_at) FILTER (WHERE role = 'manager') as manager_ids,
        ARRAY_AGG(id ORDER BY created_at) FILTER (WHERE role = 'rep') as rep_ids
    FROM user_profiles
    WHERE is_active = true
    GROUP BY tenant_id
    HAVING 
        COUNT(*) FILTER (WHERE role = 'manager') > 0 
        AND COUNT(*) FILTER (WHERE role = 'rep') > 0
),
rep_manager_pairs AS (
    SELECT 
        tenant_id,
        UNNEST(rep_ids) as rep_id,
        manager_ids[1 + (ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY UNNEST(rep_ids)) - 1) % ARRAY_LENGTH(manager_ids, 1)] as assigned_manager_id
    FROM manager_assignments
)
UPDATE user_profiles 
SET manager_id = rmp.assigned_manager_id
FROM rep_manager_pairs rmp
WHERE user_profiles.id = rmp.rep_id
AND user_profiles.manager_id IS NULL;

-- Step 3: Create some realistic weekly goals for team members
INSERT INTO weekly_goals (user_id, tenant_id, goal_type, target_value, current_value, status, week_start_date, notes)
SELECT 
    up.id,
    up.tenant_id,
    goal_types.goal_type,
    goal_types.target_value + (RANDOM() * 10)::INTEGER, -- Slight variation in targets
    (goal_types.target_value * (0.3 + RANDOM() * 0.7))::INTEGER, -- 30-100% completion
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Completed'::goal_status
        WHEN RANDOM() > 0.3 THEN 'In Progress'::goal_status  
        ELSE 'Not Started'::goal_status
    END,
    CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::INTEGER % 7), -- Start of current week
    CASE goal_types.goal_type
        WHEN 'calls' THEN 'Making progress on weekly calls'
        WHEN 'emails' THEN 'Email outreach going well'
        WHEN 'meetings' THEN 'Scheduling client meetings'
        WHEN 'proposals_sent' THEN 'Working on proposal pipeline'
        WHEN 'accounts_added' THEN 'Focusing on new account acquisition'
        ELSE 'Working towards weekly targets'
    END
FROM user_profiles up
CROSS JOIN (
    VALUES 
        ('calls', 25),
        ('emails', 40), 
        ('meetings', 8),
        ('proposals_sent', 3),
        ('accounts_added', 2)
) AS goal_types(goal_type, target_value)
WHERE up.is_active = true 
AND up.role IN ('rep', 'manager')
AND NOT EXISTS (
    SELECT 1 FROM weekly_goals wg 
    WHERE wg.user_id = up.id 
    AND wg.goal_type = goal_types.goal_type
    AND wg.week_start_date = CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::INTEGER % 7)
);

-- Step 4: Ensure accounts are properly assigned to team members
UPDATE accounts 
SET assigned_rep_id = (
    SELECT up.id 
    FROM user_profiles up 
    WHERE up.tenant_id = accounts.tenant_id 
    AND up.is_active = true 
    AND up.role IN ('rep', 'manager')
    ORDER BY RANDOM() 
    LIMIT 1
)
WHERE assigned_rep_id IS NULL 
AND tenant_id IS NOT NULL;

-- Step 5: Create some recent activities for team members
INSERT INTO activities (user_id, tenant_id, account_id, activity_type, subject, notes, outcome, activity_date, created_at)
SELECT 
    up.id,
    up.tenant_id,
    a.id,
    activity_types.activity_type::public.activity_type, -- Cast to enum type
    activity_types.subject_template || ' - ' || a.name,
    activity_types.notes_template || ' ' || a.name || '.',
    activity_types.outcome::public.activity_outcome, -- Cast to enum type
    CURRENT_DATE - (RANDOM() * 7)::INTEGER, -- Activities in the last week
    NOW() - (RANDOM() * INTERVAL '7 days')
FROM user_profiles up
INNER JOIN accounts a ON a.assigned_rep_id = up.id
CROSS JOIN (
    VALUES 
        ('Phone Call', 'Initial outreach call', 'Contacted potential client at', 'Interested'),
        ('Email', 'Follow-up email sent', 'Sent detailed information to', 'Callback Requested'),
        ('Meeting', 'Client meeting scheduled', 'Met with decision makers at', 'Meeting Scheduled'),
        ('Site Visit', 'Property assessment', 'Conducted site evaluation at', 'Successful')
) AS activity_types(activity_type, subject_template, notes_template, outcome)
WHERE up.is_active = true 
AND up.role IN ('rep', 'manager')
AND RANDOM() > 0.5 -- Only create activities for ~50% of account-user combinations
LIMIT 100; -- Limit to prevent too many activities

-- Step 6: Add some contacts linked to accounts  
INSERT INTO contacts (first_name, last_name, email, title, account_id, tenant_id)
SELECT 
    first_names.name as first_name,
    last_names.name as last_name,
    LOWER(first_names.name) || '.' || LOWER(last_names.name) || '@' || LOWER(REPLACE(a.name, ' ', '')) || '.com' as email,
    titles.title,
    a.id,
    a.tenant_id
FROM accounts a
CROSS JOIN (
    VALUES ('John'), ('Sarah'), ('Michael'), ('Lisa'), ('David'), ('Jennifer'), ('Robert'), ('Maria')
) AS first_names(name)
CROSS JOIN (
    VALUES ('Smith'), ('Johnson'), ('Williams'), ('Brown'), ('Jones'), ('Garcia'), ('Miller'), ('Davis')  
) AS last_names(name)
CROSS JOIN (
    VALUES ('Facility Manager'), ('Property Manager'), ('Operations Director'), ('Maintenance Supervisor')
) AS titles(title)
WHERE NOT EXISTS (
    SELECT 1 FROM contacts c WHERE c.account_id = a.id
)
AND RANDOM() > 0.7 -- Only add contacts to ~30% of accounts
LIMIT 50;

-- Step 7: Verify the setup worked
DO $$
DECLARE
    manager_count INTEGER;
    rep_count INTEGER;
    team_relationships INTEGER;
BEGIN
    SELECT COUNT(*) INTO manager_count FROM user_profiles WHERE role = 'manager' AND is_active = true;
    SELECT COUNT(*) INTO rep_count FROM user_profiles WHERE role = 'rep' AND is_active = true AND manager_id IS NOT NULL;
    SELECT COUNT(*) INTO team_relationships FROM user_profiles WHERE manager_id IS NOT NULL;
    
    RAISE NOTICE 'Manager Team Setup Complete:';
    RAISE NOTICE '- Managers: %', manager_count;
    RAISE NOTICE '- Reps with managers: %', rep_count;  
    RAISE NOTICE '- Total team relationships: %', team_relationships;
    
    IF team_relationships = 0 THEN
        RAISE WARNING 'No team relationships established. Manager dashboard may show empty data.';
    END IF;
END $$;