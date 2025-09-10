-- Add more sales rep users to properly distribute existing seed accounts
-- ============================================================

-- Create corresponding auth.users entries for the new sales reps FIRST
INSERT INTO auth.users (
  id, 
  instance_id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  created_at, 
  updated_at, 
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) 
VALUES 
  -- Sarah Johnson
  ('388a13fb-2332-4b93-a1b9-3be184bb1a4b', '00000000-0000-0000-0000-000000000000', 'sarah.johnson@roofcrm.com', 
   crypt('SarahDemo123!', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''),
   
  -- Michael Chen  
  ('4353762c-f92c-42e2-9a3e-1d5fff0a004f', '00000000-0000-0000-0000-000000000000', 'michael.chen@roofcrm.com', 
   crypt('MichaelDemo123!', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''),
   
  -- Emily Rodriguez
  ('7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e', '00000000-0000-0000-0000-000000000000', 'emily.rodriguez@roofcrm.com', 
   crypt('EmilyDemo123!', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''),
   
  -- David Thompson
  ('9f8e7d6c-5b4a-3928-1c0b-a9d8e7f6c5b4', '00000000-0000-0000-0000-000000000000', 'david.thompson@roofcrm.com', 
   crypt('DavidDemo123!', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', ''),
   
  -- Lisa Wang
  ('1a2b3c4d-5e6f-7890-abcd-ef1234567890', '00000000-0000-0000-0000-000000000000', 'lisa.wang@roofcrm.com', 
   crypt('LisaDemo123!', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Now add additional sales representatives to the system AFTER auth.users exist
INSERT INTO user_profiles (id, full_name, email, role, phone, is_active) VALUES
  -- Sales Representatives
  ('388a13fb-2332-4b93-a1b9-3be184bb1a4b'::uuid, 'Sarah Johnson', 'sarah.johnson@roofcrm.com', 'rep', '(512) 555-0301', true),
  ('4353762c-f92c-42e2-9a3e-1d5fff0a004f'::uuid, 'Michael Chen', 'michael.chen@roofcrm.com', 'rep', '(214) 555-0302', true),
  ('7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e'::uuid, 'Emily Rodriguez', 'emily.rodriguez@roofcrm.com', 'rep', '(713) 555-0303', true),
  ('9f8e7d6c-5b4a-3928-1c0b-a9d8e7f6c5b4'::uuid, 'David Thompson', 'david.thompson@roofcrm.com', 'rep', '(469) 555-0304', true),
  ('1a2b3c4d-5e6f-7890-abcd-ef1234567890'::uuid, 'Lisa Wang', 'lisa.wang@roofcrm.com', 'rep', '(832) 555-0305', true)
ON CONFLICT (id) DO NOTHING;

-- Assign existing accounts to the sales reps in a balanced distribution
DO $$
DECLARE
  rep_ids UUID[] := ARRAY[
    '388a13fb-2332-4b93-a1b9-3be184bb1a4b'::uuid, -- Sarah Johnson
    '4353762c-f92c-42e2-9a3e-1d5fff0a004f'::uuid, -- Michael Chen
    '7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e'::uuid, -- Emily Rodriguez
    '9f8e7d6c-5b4a-3928-1c0b-a9d8e7f6c5b4'::uuid, -- David Thompson
    '1a2b3c4d-5e6f-7890-abcd-ef1234567890'::uuid  -- Lisa Wang
  ];
  account_rec RECORD;
  rep_index INTEGER := 0;
  rep_count INTEGER := array_length(rep_ids, 1);
BEGIN
  -- Assign accounts to sales reps in round-robin fashion
  FOR account_rec IN 
    SELECT id, name FROM accounts ORDER BY created_at
  LOOP
    UPDATE accounts 
    SET assigned_rep_id = rep_ids[rep_index + 1]
    WHERE id = account_rec.id;
    
    RAISE NOTICE 'Assigned account "%" to sales rep %', account_rec.name, rep_ids[rep_index + 1];
    
    rep_index := (rep_index + 1) % rep_count;
  END LOOP;
  
  RAISE NOTICE 'Successfully assigned all accounts to % sales representatives', rep_count;
END $$;

-- Create additional weekly goals for the new sales reps to show realistic performance data
INSERT INTO weekly_goals (id, user_id, week_start_date, goal_type, target_value, current_value, status, notes) VALUES
  -- Sarah Johnson's goals (current week)
  ('71111111-2222-4333-8444-555555555001'::uuid, '388a13fb-2332-4b93-a1b9-3be184bb1a4b'::uuid, '2025-01-13', 'calls', 30, 28, 'In Progress', 'Strong performance, close to target'),
  ('71111111-2222-4333-8444-555555555002'::uuid, '388a13fb-2332-4b93-a1b9-3be184bb1a4b'::uuid, '2025-01-13', 'emails', 45, 42, 'In Progress', 'Consistent email outreach'),
  ('71111111-2222-4333-8444-555555555003'::uuid, '388a13fb-2332-4b93-a1b9-3be184bb1a4b'::uuid, '2025-01-13', 'meetings', 10, 8, 'In Progress', 'Need 2 more meetings'),
  ('71111111-2222-4333-8444-555555555004'::uuid, '388a13fb-2332-4b93-a1b9-3be184bb1a4b'::uuid, '2025-01-13', 'deals', 3, 2, 'In Progress', 'Working on closing pipeline deals'),
  
  -- Michael Chen's goals (current week)  
  ('71111111-2222-4333-8444-555555555005'::uuid, '4353762c-f92c-42e2-9a3e-1d5fff0a004f'::uuid, '2025-01-13', 'calls', 25, 30, 'Completed', 'Exceeded call target early!'),
  ('71111111-2222-4333-8444-555555555006'::uuid, '4353762c-f92c-42e2-9a3e-1d5fff0a004f'::uuid, '2025-01-13', 'emails', 35, 38, 'Completed', 'Great email response rate'),
  ('71111111-2222-4333-8444-555555555007'::uuid, '4353762c-f92c-42e2-9a3e-1d5fff0a004f'::uuid, '2025-01-13', 'meetings', 8, 7, 'In Progress', 'One more meeting needed'),
  ('71111111-2222-4333-8444-555555555008'::uuid, '4353762c-f92c-42e2-9a3e-1d5fff0a004f'::uuid, '2025-01-13', 'deals', 2, 3, 'Completed', 'Exceeded deal target'),
  
  -- Emily Rodriguez's goals (current week)
  ('71111111-2222-4333-8444-555555555009'::uuid, '7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e'::uuid, '2025-01-13', 'calls', 28, 25, 'In Progress', 'Need to increase call activity'),
  ('71111111-2222-4333-8444-55555555500a'::uuid, '7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e'::uuid, '2025-01-13', 'emails', 40, 45, 'Completed', 'Exceeded email goal'),
  ('71111111-2222-4333-8444-55555555500b'::uuid, '7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e'::uuid, '2025-01-13', 'meetings', 9, 10, 'Completed', 'Excellent meeting performance'),
  ('71111111-2222-4333-8444-55555555500c'::uuid, '7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e'::uuid, '2025-01-13', 'deals', 2, 1, 'In Progress', 'Working on deal closure'),
  
  -- Previous week's completed goals for additional context
  ('81111111-2222-4333-8444-555555555001'::uuid, '388a13fb-2332-4b93-a1b9-3be184bb1a4b'::uuid, '2025-01-06', 'calls', 30, 32, 'Completed', 'Great week!'),
  ('81111111-2222-4333-8444-555555555002'::uuid, '4353762c-f92c-42e2-9a3e-1d5fff0a004f'::uuid, '2025-01-06', 'calls', 25, 27, 'Completed', 'Consistent performance'),
  ('81111111-2222-4333-8444-555555555003'::uuid, '7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e'::uuid, '2025-01-06', 'calls', 28, 26, 'Completed', 'Good effort'),
  ('81111111-2222-4333-8444-555555555004'::uuid, '9f8e7d6c-5b4a-3928-1c0b-a9d8e7f6c5b4'::uuid, '2025-01-06', 'calls', 22, 25, 'Completed', 'Exceeded target'),
  ('81111111-2222-4333-8444-555555555005'::uuid, '1a2b3c4d-5e6f-7890-abcd-ef1234567890'::uuid, '2025-01-06', 'calls', 26, 24, 'Completed', 'Close to target')
ON CONFLICT (id) DO NOTHING;

-- Create some sample activities for the new sales reps
INSERT INTO activities (id, user_id, account_id, contact_id, activity_type, outcome, subject, notes, duration_minutes, activity_date, follow_up_date) VALUES
  -- Sarah's activities
  ('2c111111-2222-4333-8444-555555555001'::uuid, '388a13fb-2332-4b93-a1b9-3be184bb1a4b'::uuid, 'a1111111-2222-4333-8444-555555555001'::uuid, 'c1111111-2222-4333-8444-555555555001'::uuid, 'Phone Call', 'Interested', 'Follow-up on preventive maintenance', 'Robert very interested in our preventive maintenance programs. Scheduling site visit.', 20, '2025-01-18 14:00:00', '2025-01-25 10:00:00'),
  
  -- Michael's activities  
  ('2c111111-2222-4333-8444-555555555002'::uuid, '4353762c-f92c-42e2-9a3e-1d5fff0a004f'::uuid, 'a1111111-2222-4333-8444-555555555006'::uuid, null, 'Email', 'Meeting Scheduled', 'Horizon Real Estate follow-up', 'Sent detailed proposal breakdown. Meeting scheduled for contract discussion.', null, '2025-01-17 11:30:00', '2025-01-24 14:00:00'),
  
  -- Emily's activities
  ('2c111111-2222-4333-8444-555555555003'::uuid, '7b8c9d0e-1f2a-4b5c-8d9e-0f1a2b3c4d5e'::uuid, 'a1111111-2222-4333-8444-55555555500b'::uuid, null, 'Site Visit', 'Proposal Requested', 'ProFacility site assessment', 'Completed comprehensive facility assessment. They were impressed with our emergency response capabilities.', 90, '2025-01-16 09:00:00', null)
ON CONFLICT (id) DO NOTHING;

-- Display summary of user assignments
DO $$
DECLARE
  total_accounts INTEGER;
  total_reps INTEGER;
  assigned_accounts INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_accounts FROM accounts;
  SELECT COUNT(*) INTO total_reps FROM user_profiles WHERE role = 'rep';
  SELECT COUNT(*) INTO assigned_accounts FROM accounts WHERE assigned_rep_id IS NOT NULL;

  RAISE NOTICE '=== SALES REP ASSIGNMENT SUMMARY ===';
  RAISE NOTICE 'Total accounts in system: %', total_accounts;
  RAISE NOTICE 'Total sales representatives: %', total_reps;  
  RAISE NOTICE 'Accounts with assigned reps: %', assigned_accounts;
  RAISE NOTICE '';
  RAISE NOTICE 'Sales Representatives:';
  RAISE NOTICE '• Sarah Johnson (sarah.johnson@roofcrm.com) - Password: SarahDemo123!';
  RAISE NOTICE '• Michael Chen (michael.chen@roofcrm.com) - Password: MichaelDemo123!';
  RAISE NOTICE '• Emily Rodriguez (emily.rodriguez@roofcrm.com) - Password: EmilyDemo123!'; 
  RAISE NOTICE '• David Thompson (david.thompson@roofcrm.com) - Password: DavidDemo123!';
  RAISE NOTICE '• Lisa Wang (lisa.wang@roofcrm.com) - Password: LisaDemo123!';
  RAISE NOTICE '';
  RAISE NOTICE '=== ACCOUNT ASSIGNMENT COMPLETED ===';
END $$;