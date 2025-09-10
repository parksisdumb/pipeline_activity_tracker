-- Seed comprehensive sample data for Pipeline Activity Tracker CRM
-- ============================================================

-- Check if there are existing authenticated users we can use
DO $$
DECLARE
  existing_user_count INTEGER;
  admin_user_id UUID;
  manager_user_id UUID;
BEGIN
  -- Count existing authenticated users
  SELECT COUNT(*) INTO existing_user_count FROM auth.users;
  
  -- Get existing admin and manager user IDs if they exist
  SELECT id INTO admin_user_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
  SELECT id INTO manager_user_id FROM user_profiles WHERE role = 'manager' LIMIT 1;
  
  RAISE NOTICE 'Found % existing authenticated users', existing_user_count;
  RAISE NOTICE 'Found admin user: %', admin_user_id;
  RAISE NOTICE 'Found manager user: %', manager_user_id;
END $$;

-- Create accounts without assigned reps initially (can be assigned later through the UI)
INSERT INTO accounts (id, name, company_type, stage, email, phone, address, city, state, zip_code, website, notes, assigned_rep_id, is_active) VALUES
  -- Property Management Companies
  ('a1111111-2222-4333-8444-555555555001'::uuid, 'SunTrust Commercial Properties', 'Property Management', 'Prospect', 'info@suntrustcommercial.com', '(214) 555-0101', '2400 Victory Park Lane', 'Dallas', 'TX', '75219', 'www.suntrustcommercial.com', 'Large portfolio of office buildings and retail centers. Interested in preventive maintenance programs.', NULL, true),
  
  ('a1111111-2222-4333-8444-555555555002'::uuid, 'Metro Property Solutions', 'Property Management', 'Contacted', 'contact@metropropertysolut.com', '(713) 555-0102', '5001 Westheimer Rd', 'Houston', 'TX', '77056', 'www.metropropertysolut.com', 'Manages 50+ industrial properties. Looking for comprehensive roofing solutions.', NULL, true),

  -- General Contractors
  ('a1111111-2222-4333-8444-555555555003'::uuid, 'Apex Construction Group', 'General Contractor', 'Qualified', 'projects@apexconstruction.com', '(512) 555-0103', '1200 South Lamar Blvd', 'Austin', 'TX', '78704', 'www.apexconstruction.com', 'Specializes in commercial and industrial construction. Active on 12 current projects.', NULL, true),
  
  ('a1111111-2222-4333-8444-555555555004'::uuid, 'Sterling Build Corp', 'General Contractor', 'Assessment Scheduled', 'info@sterlingbuild.com', '(469) 555-0104', '3300 McKinney Ave', 'Dallas', 'TX', '75204', 'www.sterlingbuild.com', 'High-end commercial contractor. Assessment scheduled for next week.', NULL, true),

  -- Developers
  ('a1111111-2222-4333-8444-555555555005'::uuid, 'Pinnacle Development Partners', 'Developer', 'Assessed', 'development@pinnacledp.com', '(346) 555-0105', '800 Town and Country Blvd', 'Houston', 'TX', '77024', 'www.pinnacledp.com', 'Major mixed-use development projects. Recently completed roof assessments on 3 properties.', NULL, true),
  
  ('a1111111-2222-4333-8444-555555555006'::uuid, 'Horizon Real Estate Development', 'Developer', 'Proposal Sent', 'proposals@horizonred.com', '(737) 555-0106', '4500 S Capital of Texas Hwy', 'Austin', 'TX', '78735', 'www.horizonred.com', 'Proposal sent for 5-building industrial complex. Follow-up scheduled.', NULL, true),

  -- REIT/Institutional Investors
  ('a1111111-2222-4333-8444-555555555007'::uuid, 'Texas Commercial REIT', 'REIT/Institutional Investor', 'In Negotiation', 'investments@texascommercialreit.com', '(214) 555-0107', '2121 N Pearl St', 'Dallas', 'TX', '75201', 'www.texascommercialreit.com', 'Large institutional investor. Negotiating master service agreement for 25+ properties.', NULL, true),

  -- Asset Managers
  ('a1111111-2222-4333-8444-555555555008'::uuid, 'Guardian Asset Management', 'Asset Manager', 'Won', 'operations@guardianasset.com', '(713) 555-0108', '1111 Louisiana St', 'Houston', 'TX', '77002', 'www.guardianasset.com', 'Signed contract for ongoing maintenance of 15 commercial properties.', NULL, true),

  -- Building Owners
  ('a1111111-2222-4333-8444-555555555009'::uuid, 'Lone Star Properties LLC', 'Building Owner', 'Prospect', 'owner@lonestarprops.com', '(512) 555-0109', '600 Congress Ave', 'Austin', 'TX', '78701', 'www.lonestarprops.com', 'Owns historic downtown building. Initial contact made.', NULL, true),
  
  ('a1111111-2222-4333-8444-55555555500a'::uuid, 'Emerald Commercial Holdings', 'Building Owner', 'Lost', 'contact@emeraldcommercial.com', '(469) 555-0110', '5950 Sherry Lane', 'Dallas', 'TX', '75225', 'www.emeraldcommercial.com', 'Lost to competitor. Price was the main factor.', NULL, true),

  -- Facility Managers
  ('a1111111-2222-4333-8444-55555555500b'::uuid, 'ProFacility Management Services', 'Facility Manager', 'Contacted', 'facilities@profacility.com', '(832) 555-0111', '2500 CityWest Blvd', 'Houston', 'TX', '77042', 'www.profacility.com', 'Manages facilities for Fortune 500 companies. Interested in emergency repair services.', NULL, true),

  -- Roofing Contractors (Partners/Subcontractors)
  ('a1111111-2222-4333-8444-55555555500c'::uuid, 'Alliance Roofing Solutions', 'Roofing Contractor', 'Qualified', 'partnership@allianceroofing.com', '(214) 555-0112', '1800 N Stemmons Fwy', 'Dallas', 'TX', '75207', 'www.allianceroofing.com', 'Potential subcontracting partner for large projects. Specializes in TPO installation.', NULL, true),

  -- Insurance Companies
  ('a1111111-2222-4333-8444-55555555500d'::uuid, 'Southwest Commercial Insurance', 'Insurance', 'Assessment Scheduled', 'claims@swcommercialins.com', '(713) 555-0113', '9 Greenway Plaza', 'Houston', 'TX', '77046', 'www.swcommercialins.com', 'Insurance partner for storm damage assessments. Meeting scheduled for policy discussion.', NULL, true),

  -- Architecture/Engineering
  ('a1111111-2222-4333-8444-55555555500e'::uuid, 'Meridian Architecture & Engineering', 'Architecture/Engineering', 'Assessed', 'projects@meridianae.com', '(512) 555-0114', '300 W 6th St', 'Austin', 'TX', '78701', 'www.meridianae.com', 'Completed structural assessments for retrofit projects. Strong technical partnership potential.', NULL, true),

  -- Healthcare 
  ('a1111111-2222-4333-8444-55555555500f'::uuid, 'Memorial Healthcare System', 'Healthcare', 'Proposal Sent', 'facilities@memorialhealthsys.com', '(346) 555-0115', '7737 Southwest Fwy', 'Houston', 'TX', '77074', 'www.memorialhealthsys.com', 'Large healthcare system with multiple facilities. Proposal submitted for emergency repairs.', NULL, true),

  -- Retail
  ('a1111111-2222-4333-8444-555555555010'::uuid, 'Retail Properties of Texas', 'Retail', 'In Negotiation', 'leasing@retailproptx.com', '(214) 555-0116', '4100 Spring Valley Rd', 'Dallas', 'TX', '75244', 'www.retailproptx.com', 'Shopping center owner. Negotiating maintenance contract for 8 retail locations.', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Properties with diverse building types, roof types, and stages
INSERT INTO properties (id, name, building_type, roof_type, stage, address, city, state, zip_code, square_footage, year_built, account_id, notes, last_assessment) VALUES
  -- Industrial Properties
  ('11111111-2222-4333-8444-555555555001'::uuid, 'Victory Industrial Park Building A', 'Industrial', 'TPO', 'Unassessed', '2400 Victory Park Lane', 'Dallas', 'TX', '75219', 150000, 2019, 'a1111111-2222-4333-8444-555555555001'::uuid, 'New acquisition, needs initial assessment', null),
  
  ('11111111-2222-4333-8444-555555555002'::uuid, 'Westheimer Manufacturing Facility', 'Industrial', 'EPDM', 'Assessment Scheduled', '5001 Westheimer Rd', 'Houston', 'TX', '77056', 225000, 2015, 'a1111111-2222-4333-8444-555555555002'::uuid, 'Manufacturing facility with aging roof system', '2025-01-20 09:00:00'),

  -- Warehouse Properties
  ('11111111-2222-4333-8444-555555555003'::uuid, 'South Austin Distribution Hub', 'Warehouse', 'Metal', 'Assessed', '1200 South Lamar Blvd', 'Austin', 'TX', '78704', 300000, 2020, 'a1111111-2222-4333-8444-555555555003'::uuid, 'Modern distribution center, excellent condition', '2025-01-15 14:30:00'),
  
  ('11111111-2222-4333-8444-555555555004'::uuid, 'McKinney Logistics Center', 'Warehouse', 'TPO', 'Proposal Sent', '3300 McKinney Ave', 'Dallas', 'TX', '75204', 180000, 2018, 'a1111111-2222-4333-8444-555555555004'::uuid, 'Proposal for roof replacement and upgrade', '2025-01-12 11:00:00'),

  -- Manufacturing Properties
  ('11111111-2222-4333-8444-555555555005'::uuid, 'Town & Country Manufacturing', 'Manufacturing', 'Modified Bitumen', 'In Negotiation', '800 Town and Country Blvd', 'Houston', 'TX', '77024', 275000, 2012, 'a1111111-2222-4333-8444-555555555005'::uuid, 'Complex manufacturing facility, negotiating phased approach', '2025-01-18 10:15:00'),
  
  ('11111111-2222-4333-8444-555555555006'::uuid, 'Capital Tech Manufacturing Plant', 'Manufacturing', 'BUR', 'Won', '4500 S Capital of Texas Hwy', 'Austin', 'TX', '78735', 350000, 2010, 'a1111111-2222-4333-8444-555555555006'::uuid, 'Contract signed for complete roof renovation', '2025-01-10 13:45:00'),

  -- Hospitality Properties  
  ('11111111-2222-4333-8444-555555555007'::uuid, 'Pearl Street Conference Center', 'Hospitality', 'Shingle', 'Lost', '2121 N Pearl St', 'Dallas', 'TX', '75201', 85000, 2005, 'a1111111-2222-4333-8444-555555555007'::uuid, 'Historic conference center, lost due to budget constraints', '2025-01-08 15:20:00'),

  -- Multifamily Properties
  ('11111111-2222-4333-8444-555555555008'::uuid, 'Louisiana Street Apartments', 'Multifamily', 'TPO', 'Won', '1111 Louisiana St', 'Houston', 'TX', '77002', 120000, 2016, 'a1111111-2222-4333-8444-555555555008'::uuid, 'Luxury apartment complex, ongoing maintenance contract', '2025-01-22 09:30:00'),
  
  ('11111111-2222-4333-8444-555555555009'::uuid, 'Congress Avenue Residences', 'Multifamily', 'EPDM', 'Unassessed', '600 Congress Ave', 'Austin', 'TX', '78701', 95000, 2008, 'a1111111-2222-4333-8444-555555555009'::uuid, 'Historic residential conversion project', null),

  -- Commercial Office Properties
  ('11111111-2222-4333-8444-55555555500a'::uuid, 'Sherry Lane Office Complex', 'Commercial Office', 'TPO', 'Assessed', '5950 Sherry Lane', 'Dallas', 'TX', '75225', 200000, 2017, 'a1111111-2222-4333-8444-55555555500a'::uuid, 'Class A office building with modern systems', '2025-01-14 16:00:00'),
  
  ('11111111-2222-4333-8444-55555555500b'::uuid, 'CityWest Business Center', 'Commercial Office', 'Metal', 'Assessment Scheduled', '2500 CityWest Blvd', 'Houston', 'TX', '77042', 165000, 2014, 'a1111111-2222-4333-8444-55555555500b'::uuid, 'Multi-tenant office building, assessment next week', '2025-01-25 10:00:00'),

  -- Retail Properties
  ('11111111-2222-4333-8444-55555555500c'::uuid, 'Stemmons Trade Center', 'Retail', 'PVC', 'Proposal Sent', '1800 N Stemmons Fwy', 'Dallas', 'TX', '75207', 75000, 2011, 'a1111111-2222-4333-8444-55555555500c'::uuid, 'High-traffic retail center, proposal for section repairs', '2025-01-16 12:30:00'),
  
  ('11111111-2222-4333-8444-55555555500d'::uuid, 'Spring Valley Shopping Plaza', 'Retail', 'EPDM', 'In Negotiation', '4100 Spring Valley Rd', 'Dallas', 'TX', '75244', 125000, 2009, 'a1111111-2222-4333-8444-555555555010'::uuid, 'Major shopping center, negotiating comprehensive service agreement', '2025-01-19 14:15:00'),

  -- Healthcare Properties
  ('11111111-2222-4333-8444-55555555500e'::uuid, 'Greenway Medical Plaza', 'Healthcare', 'TPO', 'Assessment Scheduled', '9 Greenway Plaza', 'Houston', 'TX', '77046', 110000, 2013, 'a1111111-2222-4333-8444-55555555500d'::uuid, 'Medical office building, emergency assessment needed', '2025-01-28 08:00:00'),
  
  ('11111111-2222-4333-8444-55555555500f'::uuid, 'Southwest Medical Campus', 'Healthcare', 'Modified Bitumen', 'Proposal Sent', '7737 Southwest Fwy', 'Houston', 'TX', '77074', 185000, 2007, 'a1111111-2222-4333-8444-55555555500f'::uuid, 'Large medical campus, critical infrastructure upgrade needed', '2025-01-17 11:45:00'),

  ('11111111-2222-4333-8444-555555555010'::uuid, '6th Street Medical Building', 'Healthcare', 'BUR', 'Assessed', '300 W 6th St', 'Austin', 'TX', '78701', 65000, 2006, 'a1111111-2222-4333-8444-55555555500e'::uuid, 'Boutique medical facility, assessment completed successfully', '2025-01-21 13:00:00')
ON CONFLICT (id) DO NOTHING;

-- Add contacts for the accounts
INSERT INTO contacts (id, account_id, first_name, last_name, title, email, phone, is_primary_contact, notes) VALUES
  -- SunTrust Commercial Properties contacts
  ('c1111111-2222-4333-8444-555555555001'::uuid, 'a1111111-2222-4333-8444-555555555001'::uuid, 'Robert', 'Mitchell', 'Property Manager', 'rmitchell@suntrustcommercial.com', '(214) 555-0201', true, 'Primary decision maker for all roofing projects'),
  ('c1111111-2222-4333-8444-555555555002'::uuid, 'a1111111-2222-4333-8444-555555555001'::uuid, 'Jennifer', 'Walsh', 'Facilities Director', 'jwalsh@suntrustcommercial.com', '(214) 555-0202', false, 'Technical contact for facility maintenance'),

  -- Metro Property Solutions contacts  
  ('c1111111-2222-4333-8444-555555555003'::uuid, 'a1111111-2222-4333-8444-555555555002'::uuid, 'Carlos', 'Rodriguez', 'Operations Manager', 'crodriguez@metropropertysolut.com', '(713) 555-0203', true, 'Handles all vendor relationships and procurement'),

  -- Apex Construction Group contacts
  ('c1111111-2222-4333-8444-555555555004'::uuid, 'a1111111-2222-4333-8444-555555555003'::uuid, 'Amanda', 'Foster', 'Project Manager', 'afoster@apexconstruction.com', '(512) 555-0204', true, 'Manages commercial construction projects'),
  ('c1111111-2222-4333-8444-555555555005'::uuid, 'a1111111-2222-4333-8444-555555555003'::uuid, 'Brian', 'Thompson', 'Procurement Director', 'bthompson@apexconstruction.com', '(512) 555-0205', false, 'Handles subcontractor relationships'),

  -- Sterling Build Corp contacts
  ('c1111111-2222-4333-8444-555555555006'::uuid, 'a1111111-2222-4333-8444-555555555004'::uuid, 'Michelle', 'Davis', 'VP of Operations', 'mdavis@sterlingbuild.com', '(469) 555-0206', true, 'Senior executive overseeing all operations'),

  -- Pinnacle Development Partners contacts
  ('c1111111-2222-4333-8444-555555555007'::uuid, 'a1111111-2222-4333-8444-555555555005'::uuid, 'Steven', 'Park', 'Development Manager', 'spark@pinnacledp.com', '(346) 555-0207', true, 'Leads development projects and vendor selection'),

  -- Texas Commercial REIT contacts  
  ('c1111111-2222-4333-8444-555555555008'::uuid, 'a1111111-2222-4333-8444-555555555007'::uuid, 'Patricia', 'Williams', 'Asset Director', 'pwilliams@texascommercialreit.com', '(214) 555-0208', true, 'Senior director responsible for portfolio management'),
  ('c1111111-2222-4333-8444-555555555009'::uuid, 'a1111111-2222-4333-8444-555555555007'::uuid, 'Thomas', 'Lee', 'Facilities Coordinator', 'tlee@texascommercialreit.com', '(214) 555-0209', false, 'Coordinates maintenance across properties'),

  -- Guardian Asset Management contacts
  ('c1111111-2222-4333-8444-55555555500a'::uuid, 'a1111111-2222-4333-8444-555555555008'::uuid, 'Rachel', 'Anderson', 'Portfolio Manager', 'randerson@guardianasset.com', '(713) 555-0210', true, 'Manages commercial property portfolio')
ON CONFLICT (id) DO NOTHING;

-- Create activities and weekly goals that reference existing users only
DO $$
DECLARE
  admin_user_id UUID;
  manager_user_id UUID;
  any_user_id UUID;
  account_id UUID;
BEGIN
  -- Get existing user IDs from user_profiles
  SELECT id INTO admin_user_id FROM user_profiles WHERE role = 'admin' LIMIT 1;
  SELECT id INTO manager_user_id FROM user_profiles WHERE role = 'manager' LIMIT 1;
  SELECT id INTO any_user_id FROM user_profiles LIMIT 1;
  
  -- Only insert activities if we have at least one user
  IF any_user_id IS NOT NULL THEN
    -- Sample activities showing various types of interactions
    INSERT INTO activities (id, user_id, account_id, property_id, contact_id, activity_type, outcome, subject, notes, duration_minutes, activity_date, follow_up_date, created_at) VALUES
      -- Use the first available user for activities
      ('1c111111-2222-4333-8444-555555555001'::uuid, any_user_id, 'a1111111-2222-4333-8444-555555555001'::uuid, '11111111-2222-4333-8444-555555555001'::uuid, 'c1111111-2222-4333-8444-555555555001'::uuid, 'Phone Call', 'Interested', 'Initial outreach call', 'Discussed preventive maintenance programs. Very interested in learning more about our TPO solutions.', 25, '2025-01-15 10:30:00', '2025-01-22 10:00:00', '2025-01-15 11:00:00'),
      
      ('1c111111-2222-4333-8444-555555555002'::uuid, any_user_id, 'a1111111-2222-4333-8444-555555555002'::uuid, null, 'c1111111-2222-4333-8444-555555555003'::uuid, 'Email', 'Callback Requested', 'Industrial roofing services information', 'Sent detailed information about our industrial roofing services. Carlos requested a callback for next week.', null, '2025-01-14 14:15:00', '2025-01-21 09:00:00', '2025-01-14 14:15:00'),

      ('1c111111-2222-4333-8444-555555555003'::uuid, any_user_id, 'a1111111-2222-4333-8444-555555555003'::uuid, '11111111-2222-4333-8444-555555555003'::uuid, 'c1111111-2222-4333-8444-555555555004'::uuid, 'Site Visit', 'Meeting Scheduled', 'Site assessment completed', 'Conducted thorough site assessment. Amanda impressed with our professionalism. Follow-up meeting scheduled.', 120, '2025-01-15 14:00:00', '2025-01-25 14:00:00', '2025-01-15 16:30:00'),
      
      ('1c111111-2222-4333-8444-555555555004'::uuid, any_user_id, 'a1111111-2222-4333-8444-555555555004'::uuid, '11111111-2222-4333-8444-555555555004'::uuid, 'c1111111-2222-4333-8444-555555555006'::uuid, 'Assessment', 'Proposal Requested', 'Comprehensive roof assessment', 'Completed comprehensive roof assessment. Michelle requested formal proposal for roof replacement.', 90, '2025-01-16 09:00:00', null, '2025-01-16 11:00:00'),

      ('1c111111-2222-4333-8444-555555555005'::uuid, any_user_id, 'a1111111-2222-4333-8444-555555555005'::uuid, '11111111-2222-4333-8444-555555555005'::uuid, 'c1111111-2222-4333-8444-555555555007'::uuid, 'Meeting', 'Meeting Scheduled', 'Project discussion meeting', 'Productive meeting discussing phased approach. Steven interested but needs board approval.', 60, '2025-01-14 13:00:00', '2025-01-28 10:00:00', '2025-01-14 14:30:00'),

      ('1c111111-2222-4333-8444-555555555006'::uuid, any_user_id, 'a1111111-2222-4333-8444-555555555006'::uuid, '11111111-2222-4333-8444-555555555006'::uuid, null, 'Proposal Sent', 'Contract Signed', 'Contract execution', 'Proposal accepted! Contract signed for complete roof renovation project.', null, '2025-01-13 16:45:00', null, '2025-01-13 16:45:00')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created sample activities using user ID: %', any_user_id;
  ELSE
    RAISE NOTICE 'No users found - skipping activity creation. Please create user profiles first.';
  END IF;
  
  -- Create weekly goals only if we have users
  IF any_user_id IS NOT NULL THEN
    INSERT INTO weekly_goals (id, user_id, week_start_date, goal_type, target_value, current_value, status, notes) VALUES
      ('61111111-2222-4333-8444-555555555001'::uuid, any_user_id, '2025-01-13', 'calls', 25, 22, 'In Progress', 'Good progress on calls, need 3 more to reach target'),
      ('61111111-2222-4333-8444-555555555002'::uuid, any_user_id, '2025-01-13', 'emails', 40, 35, 'In Progress', 'On track with email outreach'),
      ('61111111-2222-4333-8444-555555555003'::uuid, any_user_id, '2025-01-13', 'meetings', 8, 6, 'In Progress', 'Need more meetings scheduled'),
      ('61111111-2222-4333-8444-555555555004'::uuid, any_user_id, '2025-01-13', 'deals', 2, 1, 'In Progress', 'One deal closed, working on pipeline'),
      ('61111111-2222-4333-8444-555555555005'::uuid, any_user_id, '2025-01-06', 'calls', 25, 28, 'Completed', 'Exceeded call goal this week!'),
      ('61111111-2222-4333-8444-555555555006'::uuid, any_user_id, '2025-01-06', 'emails', 40, 42, 'Completed', 'Great email performance'),
      ('61111111-2222-4333-8444-555555555007'::uuid, any_user_id, '2025-01-06', 'meetings', 8, 9, 'Completed', 'Excellent meeting activity'),
      ('61111111-2222-4333-8444-555555555008'::uuid, any_user_id, '2025-01-06', 'deals', 2, 2, 'Completed', 'Hit deal target exactly')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created sample weekly goals for user ID: %', any_user_id;
  END IF;
END $$;

-- Update account notes for additional context (only if not already updated)
UPDATE accounts SET notes = CASE
  WHEN id = 'a1111111-2222-4333-8444-555555555001'::uuid AND notes NOT LIKE '%Strong potential for long-term partnership%' THEN 'Large portfolio of office buildings and retail centers. Interested in preventive maintenance programs. Strong potential for long-term partnership.'
  WHEN id = 'a1111111-2222-4333-8444-555555555002'::uuid AND notes NOT LIKE '%Quick decision maker%' THEN 'Manages 50+ industrial properties. Looking for comprehensive roofing solutions. Quick decision maker, prefers detailed technical proposals.'
  WHEN id = 'a1111111-2222-4333-8444-555555555003'::uuid AND notes NOT LIKE '%Values quality and reliability%' THEN 'Specializes in commercial and industrial construction. Active on 12 current projects. Values quality and reliability over lowest price.'
  WHEN id = 'a1111111-2222-4333-8444-555555555007'::uuid AND notes NOT LIKE '%Very detailed procurement process%' THEN 'Large institutional investor. Negotiating master service agreement for 25+ properties. Very detailed procurement process but high-value opportunity.'
  WHEN id = 'a1111111-2222-4333-8444-555555555008'::uuid AND notes NOT LIKE '%Happy to provide referrals%' THEN 'Signed contract for ongoing maintenance of 15 commercial properties. Excellent client reference. Happy to provide referrals.'
  ELSE notes
END
WHERE id IN ('a1111111-2222-4333-8444-555555555001'::uuid, 'a1111111-2222-4333-8444-555555555002'::uuid, 'a1111111-2222-4333-8444-555555555003'::uuid, 'a1111111-2222-4333-8444-555555555007'::uuid, 'a1111111-2222-4333-8444-555555555008'::uuid);

-- Assign accounts to existing sales reps if they exist
DO $$
DECLARE
  rep_count INTEGER;
  rep_ids UUID[];
  account_id UUID;
  i INTEGER := 1;
BEGIN
  -- Get all existing sales reps
  SELECT array_agg(id), COUNT(*) INTO rep_ids, rep_count 
  FROM user_profiles 
  WHERE role = 'rep' AND is_active = true;
  
  IF rep_count > 0 THEN
    -- Round-robin assignment of accounts to reps using FOR loop instead of FOREACH
    FOR account_id IN SELECT id FROM accounts WHERE assigned_rep_id IS NULL
    LOOP
      UPDATE accounts 
      SET assigned_rep_id = rep_ids[((i - 1) % rep_count) + 1]
      WHERE id = account_id;
      i := i + 1;
    END LOOP;
    
    RAISE NOTICE 'Assigned accounts to % existing sales reps', rep_count;
  ELSE
    RAISE NOTICE 'No sales reps found or all accounts already assigned';
  END IF;
END $$;

-- Display summary of seeded data
DO $$
DECLARE
  account_count INTEGER;
  property_count INTEGER;
  contact_count INTEGER;
  activity_count INTEGER;
  goal_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO account_count FROM accounts;
  SELECT COUNT(*) INTO property_count FROM properties;
  SELECT COUNT(*) INTO contact_count FROM contacts;
  SELECT COUNT(*) INTO activity_count FROM activities;
  SELECT COUNT(*) INTO goal_count FROM weekly_goals;

  RAISE NOTICE '=== SEEDING SUMMARY ===';
  RAISE NOTICE 'Total accounts in system: %', account_count;
  RAISE NOTICE 'Total properties in system: %', property_count;
  RAISE NOTICE 'Total contacts in system: %', contact_count;
  RAISE NOTICE 'Total activities in system: %', activity_count;
  RAISE NOTICE 'Total weekly goals in system: %', goal_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Data distribution includes:';
  RAISE NOTICE '- Company Types: Property Management, General Contractor, Developer, REIT, Asset Manager, Building Owner, Facility Manager, Roofing Contractor, Insurance, A&E, Healthcare, Retail';
  RAISE NOTICE '- Building Types: Industrial, Warehouse, Manufacturing, Hospitality, Multifamily, Commercial Office, Retail, Healthcare';
  RAISE NOTICE '- Roof Types: TPO, EPDM, Metal, Modified Bitumen, Shingle, PVC, BUR';
  RAISE NOTICE '- Account Stages: Prospect, Contacted, Qualified, Assessment Scheduled, Assessed, Proposal Sent, In Negotiation, Won, Lost';
  RAISE NOTICE '- Property Stages: Unassessed, Assessment Scheduled, Assessed, Proposal Sent, In Negotiation, Won, Lost';
  RAISE NOTICE '';
  RAISE NOTICE '=== SEEDING COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE 'Note: Accounts created without assigned reps initially. Use the application UI to assign sales reps after user registration.';
END $$;