-- Location: supabase/migrations/20250905161118_crm_system_setup.sql
-- Schema Analysis: Fresh project - no existing tables detected
-- Integration Type: Complete CRM system for roofing/property assessment business
-- Dependencies: None - creating complete schema from scratch

-- 1. Custom Types
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'rep');
CREATE TYPE public.company_type AS ENUM ('Property Management', 'General Contractor', 'Developer', 'REIT/Institutional Investor', 'Asset Manager', 'Building Owner', 'Facility Manager', 'Roofing Contractor', 'Insurance', 'Architecture/Engineering', 'Commercial Office', 'Retail', 'Healthcare');
CREATE TYPE public.account_stage AS ENUM ('Prospect', 'Contacted', 'Qualified', 'Assessment Scheduled', 'Assessed', 'Proposal Sent', 'In Negotiation', 'Won', 'Lost');
CREATE TYPE public.building_type AS ENUM ('Industrial', 'Warehouse', 'Manufacturing', 'Hospitality', 'Multifamily', 'Commercial Office', 'Retail', 'Healthcare');
CREATE TYPE public.roof_type AS ENUM ('TPO', 'EPDM', 'Metal', 'Modified Bitumen', 'Shingle', 'PVC', 'BUR');
CREATE TYPE public.property_stage AS ENUM ('Unassessed', 'Assessment Scheduled', 'Assessed', 'Proposal Sent', 'In Negotiation', 'Won', 'Lost');
CREATE TYPE public.activity_type AS ENUM ('Phone Call', 'Email', 'Meeting', 'Site Visit', 'Proposal Sent', 'Follow-up', 'Assessment', 'Contract Signed');
CREATE TYPE public.activity_outcome AS ENUM ('Successful', 'No Answer', 'Callback Requested', 'Not Interested', 'Interested', 'Proposal Requested', 'Meeting Scheduled', 'Contract Signed');
CREATE TYPE public.goal_status AS ENUM ('Not Started', 'In Progress', 'Completed', 'Overdue');

-- 2. Core Tables - User management
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'rep'::public.user_role,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Business Tables - Accounts (Companies)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_type public.company_type NOT NULL,
    stage public.account_stage DEFAULT 'Prospect'::public.account_stage,
    assigned_rep_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Properties
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    building_type public.building_type NOT NULL,
    roof_type public.roof_type,
    square_footage INTEGER,
    year_built INTEGER,
    stage public.property_stage DEFAULT 'Unassessed'::public.property_stage,
    last_assessment TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Contacts
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    mobile_phone TEXT,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    is_primary_contact BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Activities (Call logs, meetings, etc.)
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type public.activity_type NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    outcome public.activity_outcome,
    activity_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    follow_up_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Weekly Goals
CREATE TABLE public.weekly_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    goal_type TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    status public.goal_status DEFAULT 'Not Started'::public.goal_status,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Indexes for performance
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_accounts_assigned_rep ON public.accounts(assigned_rep_id);
CREATE INDEX idx_accounts_stage ON public.accounts(stage);
CREATE INDEX idx_accounts_company_type ON public.accounts(company_type);
CREATE INDEX idx_properties_account_id ON public.properties(account_id);
CREATE INDEX idx_properties_stage ON public.properties(stage);
CREATE INDEX idx_properties_building_type ON public.properties(building_type);
CREATE INDEX idx_contacts_account_id ON public.contacts(account_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_account_id ON public.activities(account_id);
CREATE INDEX idx_activities_activity_date ON public.activities(activity_date);
CREATE INDEX idx_weekly_goals_user_id ON public.weekly_goals(user_id);
CREATE INDEX idx_weekly_goals_week_start ON public.weekly_goals(week_start_date);

-- 9. Functions for automatic profile creation and updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'rep')::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 10. Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies - Pattern 1 for user_profiles (Core user table)
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Pattern 2 for user-owned data
CREATE POLICY "users_manage_assigned_accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (assigned_rep_id = auth.uid())
WITH CHECK (assigned_rep_id = auth.uid());

CREATE POLICY "users_manage_own_activities"
ON public.activities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_weekly_goals"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Pattern 7 for complex relationships - Properties and contacts through account access
CREATE OR REPLACE FUNCTION public.user_can_access_account(account_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = account_uuid 
    AND a.assigned_rep_id = auth.uid()
)
$$;

CREATE POLICY "users_access_account_properties"
ON public.properties
FOR ALL
TO authenticated
USING (public.user_can_access_account(account_id))
WITH CHECK (public.user_can_access_account(account_id));

CREATE POLICY "users_access_account_contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (public.user_can_access_account(account_id))
WITH CHECK (public.user_can_access_account(account_id));

-- 12. Triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER handle_updated_at_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_accounts
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_properties
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_contacts
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_weekly_goals
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 13. Mock data for development and testing
DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
    manager_uuid UUID := gen_random_uuid();
    rep1_uuid UUID := gen_random_uuid();
    rep2_uuid UUID := gen_random_uuid();
    account1_uuid UUID := gen_random_uuid();
    account2_uuid UUID := gen_random_uuid();
    account3_uuid UUID := gen_random_uuid();
    property1_uuid UUID := gen_random_uuid();
    property2_uuid UUID := gen_random_uuid();
    contact1_uuid UUID := gen_random_uuid();
    contact2_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users with complete field structure
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'admin@roofcrm.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Admin User", "role": "admin"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (manager_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'manager@roofcrm.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Sales Manager", "role": "manager"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (rep1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'john.smith@roofcrm.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "John Smith", "role": "rep"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (rep2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'sarah.johnson@roofcrm.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Sarah Johnson", "role": "rep"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Create accounts
    INSERT INTO public.accounts (id, name, company_type, stage, assigned_rep_id, phone, email, address, city, state, zip_code) VALUES
        (account1_uuid, 'Brookfield Properties', 'Property Management'::public.company_type, 'Qualified'::public.account_stage, rep1_uuid, '555-0101', 'info@brookfieldproperties.com', '1250 Industrial Blvd', 'Houston', 'TX', '77032'),
        (account2_uuid, 'Turner Construction', 'General Contractor'::public.company_type, 'Assessment Scheduled'::public.account_stage, rep2_uuid, '555-0102', 'contact@turnerconstruction.com', '4500 Commerce Dr', 'Dallas', 'TX', '75201'),
        (account3_uuid, 'Related Companies', 'Developer'::public.company_type, 'Proposal Sent'::public.account_stage, rep1_uuid, '555-0103', 'info@relatedcompanies.com', '800 Factory Rd', 'Austin', 'TX', '78701');

    -- Create properties
    INSERT INTO public.properties (id, name, address, city, state, zip_code, account_id, building_type, roof_type, square_footage, year_built, stage, last_assessment) VALUES
        (property1_uuid, 'Westfield Industrial Complex', '1250 Industrial Blvd', 'Houston', 'TX', '77032', account1_uuid, 'Industrial'::public.building_type, 'TPO'::public.roof_type, 125000, 2018, 'Assessed'::public.property_stage, '2025-01-15T10:30:00Z'),
        (property2_uuid, 'Metro Distribution Center', '4500 Commerce Dr', 'Dallas', 'TX', '75201', account2_uuid, 'Warehouse'::public.building_type, 'EPDM'::public.roof_type, 200000, 2015, 'Proposal Sent'::public.property_stage, '2025-01-10T14:15:00Z');

    -- Create contacts
    INSERT INTO public.contacts (id, first_name, last_name, title, email, phone, account_id, is_primary_contact) VALUES
        (contact1_uuid, 'Michael', 'Chen', 'Property Manager', 'mchen@brookfield.com', '555-0201', account1_uuid, true),
        (contact2_uuid, 'Lisa', 'Rodriguez', 'Construction Manager', 'lrodriguez@turner.com', '555-0202', account2_uuid, true);

    -- Create activities
    INSERT INTO public.activities (activity_type, subject, description, outcome, activity_date, duration_minutes, user_id, account_id, contact_id) VALUES
        ('Phone Call'::public.activity_type, 'Initial prospecting call', 'Discussed roofing assessment needs', 'Interested'::public.activity_outcome, '2025-01-03T09:00:00Z', 30, rep1_uuid, account1_uuid, contact1_uuid),
        ('Site Visit'::public.activity_type, 'Property assessment visit', 'Conducted full roof assessment', 'Successful'::public.activity_outcome, '2025-01-05T14:00:00Z', 120, rep2_uuid, account2_uuid, contact2_uuid);

    -- Create weekly goals
    INSERT INTO public.weekly_goals (user_id, week_start_date, goal_type, target_value, current_value, status) VALUES
        (rep1_uuid, '2025-01-06', 'New Prospects', 10, 3, 'In Progress'::public.goal_status),
        (rep1_uuid, '2025-01-06', 'Site Visits', 5, 2, 'In Progress'::public.goal_status),
        (rep2_uuid, '2025-01-06', 'Proposals Sent', 3, 1, 'In Progress'::public.goal_status);

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error: %', SQLERRM;
END $$;