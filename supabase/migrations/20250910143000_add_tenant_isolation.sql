-- Location: supabase/migrations/20250910143000_add_tenant_isolation.sql
-- Schema Analysis: Existing multi-tenant infrastructure with tenants table, but missing tenant_id columns on data tables
-- Integration Type: Modificative - Adding tenant_id columns and updating RLS policies
-- Dependencies: tenants, user_profiles, accounts, activities, contacts, properties, weekly_goals

-- =========================================
-- STEP 1: Add tenant_id columns to all tables
-- =========================================

-- Add tenant_id to user_profiles table (core requirement)
ALTER TABLE public.user_profiles 
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to all other data tables for complete tenant isolation
ALTER TABLE public.accounts 
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.activities 
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.contacts 
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.properties 
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.weekly_goals 
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- =========================================
-- STEP 2: Create indexes for tenant_id columns
-- =========================================

CREATE INDEX idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX idx_accounts_tenant_id ON public.accounts(tenant_id);
CREATE INDEX idx_activities_tenant_id ON public.activities(tenant_id);
CREATE INDEX idx_contacts_tenant_id ON public.contacts(tenant_id);
CREATE INDEX idx_properties_tenant_id ON public.properties(tenant_id);
CREATE INDEX idx_weekly_goals_tenant_id ON public.weekly_goals(tenant_id);

-- =========================================
-- STEP 3: Create tenant-aware helper functions
-- =========================================

-- Enhanced function to get current user's tenant (with error handling)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
    (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()),
    (SELECT id FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1),
    (SELECT id FROM public.tenants WHERE created_by = auth.uid() LIMIT 1)
)
$$;

-- Function to check if user can access specific tenant data
CREATE OR REPLACE FUNCTION public.user_can_access_tenant_data(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.tenant_id = target_tenant_id
    AND up.is_active = true
) OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = target_tenant_id
    AND (t.owner_id = auth.uid() OR t.created_by = auth.uid())
)
$$;

-- Function specifically for admin users to access any tenant data
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role = 'admin'
    AND up.is_active = true
)
$$;

-- =========================================
-- STEP 4: Update existing data with tenant associations
-- =========================================

DO $$
DECLARE
    default_tenant_id UUID;
    user_record RECORD;
BEGIN
    -- Get the first active tenant as default
    SELECT id INTO default_tenant_id 
    FROM public.tenants 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF default_tenant_id IS NOT NULL THEN
        -- Update user_profiles with tenant associations
        -- Associate users with tenants they own or created
        UPDATE public.user_profiles 
        SET tenant_id = COALESCE(
            (SELECT t.id FROM public.tenants t WHERE t.owner_id = user_profiles.id LIMIT 1),
            (SELECT t.id FROM public.tenants t WHERE t.created_by = user_profiles.id LIMIT 1),
            default_tenant_id
        )
        WHERE tenant_id IS NULL;
        
        -- Update accounts table
        UPDATE public.accounts 
        SET tenant_id = COALESCE(
            (SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = accounts.assigned_rep_id),
            default_tenant_id
        )
        WHERE tenant_id IS NULL;
        
        -- Update activities table
        UPDATE public.activities 
        SET tenant_id = COALESCE(
            (SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = activities.user_id),
            default_tenant_id
        )
        WHERE tenant_id IS NULL;
        
        -- Update contacts table
        UPDATE public.contacts 
        SET tenant_id = COALESCE(
            (SELECT a.tenant_id FROM public.accounts a WHERE a.id = contacts.account_id),
            default_tenant_id
        )
        WHERE tenant_id IS NULL;
        
        -- Update properties table
        UPDATE public.properties 
        SET tenant_id = COALESCE(
            (SELECT a.tenant_id FROM public.accounts a WHERE a.id = properties.account_id),
            default_tenant_id
        )
        WHERE tenant_id IS NULL;
        
        -- Update weekly_goals table
        UPDATE public.weekly_goals 
        SET tenant_id = COALESCE(
            (SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = weekly_goals.user_id),
            default_tenant_id
        )
        WHERE tenant_id IS NULL;
        
        RAISE NOTICE 'Successfully updated existing data with tenant associations using default tenant: %', default_tenant_id;
    ELSE
        RAISE NOTICE 'No active tenants found. Existing data not updated with tenant associations.';
    END IF;
END $$;

-- =========================================
-- STEP 5: Drop existing RLS policies
-- =========================================

-- Drop existing user_profiles policies
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;

-- Drop existing accounts policies
DROP POLICY IF EXISTS "authenticated_users_view_active_accounts" ON public.accounts;
DROP POLICY IF EXISTS "reps_insert_assigned_accounts" ON public.accounts;
DROP POLICY IF EXISTS "reps_update_assigned_accounts" ON public.accounts;
DROP POLICY IF EXISTS "reps_delete_assigned_accounts" ON public.accounts;

-- Drop existing activities policies
DROP POLICY IF EXISTS "users_manage_own_activities" ON public.activities;

-- Drop existing contacts policies
DROP POLICY IF EXISTS "authenticated_users_view_all_contacts" ON public.contacts;
DROP POLICY IF EXISTS "authenticated_users_create_contacts" ON public.contacts;
DROP POLICY IF EXISTS "reps_update_own_account_contacts" ON public.contacts;
DROP POLICY IF EXISTS "reps_delete_own_account_contacts" ON public.contacts;

-- Drop existing properties policies
DROP POLICY IF EXISTS "authenticated_users_view_all_properties" ON public.properties;
DROP POLICY IF EXISTS "authenticated_users_create_properties" ON public.properties;
DROP POLICY IF EXISTS "reps_update_own_account_properties" ON public.properties;
DROP POLICY IF EXISTS "reps_delete_own_account_properties" ON public.properties;

-- Drop existing weekly_goals policies
DROP POLICY IF EXISTS "users_manage_own_weekly_goals" ON public.weekly_goals;

-- =========================================
-- STEP 6: Create new tenant-aware RLS policies
-- =========================================

-- User Profiles: Pattern 1 - Core user table with tenant isolation
CREATE POLICY "tenant_users_manage_own_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (
    id = auth.uid() 
    AND (tenant_id = public.get_user_tenant_id() OR public.is_admin_user())
)
WITH CHECK (
    id = auth.uid() 
    AND (tenant_id = public.get_user_tenant_id() OR public.is_admin_user())
);

-- Accounts: Tenant-based access with role considerations
CREATE POLICY "tenant_users_view_accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (
    public.user_can_access_tenant_data(tenant_id)
    AND (is_active = true OR public.is_admin_user())
);

CREATE POLICY "tenant_reps_manage_assigned_accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (
    tenant_id = public.get_user_tenant_id()
    AND (assigned_rep_id = auth.uid() OR public.is_admin_user())
)
WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (assigned_rep_id = auth.uid() OR public.is_admin_user())
);

-- Activities: Tenant isolation with user ownership
CREATE POLICY "tenant_users_manage_own_activities"
ON public.activities
FOR ALL
TO authenticated
USING (
    tenant_id = public.get_user_tenant_id()
    AND (user_id = auth.uid() OR public.is_admin_user())
)
WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (user_id = auth.uid() OR public.is_admin_user())
);

-- Contacts: Tenant-based access
CREATE POLICY "tenant_users_access_contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (public.user_can_access_tenant_data(tenant_id));

CREATE POLICY "tenant_users_manage_contacts"
ON public.contacts
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id() OR public.is_admin_user())
WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_admin_user());

-- Properties: Tenant-based access
CREATE POLICY "tenant_users_access_properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.user_can_access_tenant_data(tenant_id));

CREATE POLICY "tenant_users_manage_properties"
ON public.properties
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id() OR public.is_admin_user())
WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_admin_user());

-- Weekly Goals: Tenant isolation with user ownership
CREATE POLICY "tenant_users_manage_own_goals"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (
    tenant_id = public.get_user_tenant_id()
    AND (user_id = auth.uid() OR public.is_admin_user())
)
WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (user_id = auth.uid() OR public.is_admin_user())
);

-- =========================================
-- STEP 7: Update trigger for new user profiles
-- =========================================

-- Update the existing handle_new_user function to assign tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Try to get tenant from metadata, otherwise use a default tenant
    user_tenant_id := COALESCE(
        (NEW.raw_user_meta_data->>'tenant_id')::UUID,
        (SELECT id FROM public.tenants WHERE is_active = true ORDER BY created_at LIMIT 1)
    );
    
    -- Insert with tenant association
    INSERT INTO public.user_profiles (id, email, full_name, role, tenant_id)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'rep'::public.user_role),
        user_tenant_id
    );
    
    RETURN NEW;
END;
$$;

-- =========================================
-- STEP 8: Make tenant_id columns NOT NULL after data migration
-- =========================================

-- Set tenant_id as NOT NULL for data integrity (after updating existing data)
-- Note: This might fail if there's still NULL data, which would indicate the migration above didn't work properly

ALTER TABLE public.user_profiles 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.accounts 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.activities 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.contacts 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.properties 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.weekly_goals 
ALTER COLUMN tenant_id SET NOT NULL;

-- =========================================
-- STEP 9: Add validation constraints
-- =========================================

-- Ensure users can only be assigned to accounts within their tenant
ALTER TABLE public.accounts 
ADD CONSTRAINT check_account_rep_same_tenant 
CHECK (
    assigned_rep_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = assigned_rep_id 
        AND up.tenant_id = accounts.tenant_id
    )
);

-- Ensure activities are created within the same tenant context
ALTER TABLE public.activities 
ADD CONSTRAINT check_activity_user_same_tenant 
CHECK (
    user_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = user_id 
        AND up.tenant_id = activities.tenant_id
    )
);

-- Ensure contacts belong to accounts in the same tenant
ALTER TABLE public.contacts 
ADD CONSTRAINT check_contact_account_same_tenant 
CHECK (
    account_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND a.tenant_id = contacts.tenant_id
    )
);

-- Ensure properties belong to accounts in the same tenant
ALTER TABLE public.properties 
ADD CONSTRAINT check_property_account_same_tenant 
CHECK (
    account_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND a.tenant_id = properties.tenant_id
    )
);

-- Ensure weekly goals belong to users in the same tenant
ALTER TABLE public.weekly_goals 
ADD CONSTRAINT check_goal_user_same_tenant 
CHECK (
    user_id IS NULL OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = user_id 
        AND up.tenant_id = weekly_goals.tenant_id
    )
);

-- =========================================
-- FINAL VALIDATION
-- =========================================

DO $$
DECLARE
    table_name TEXT;
    null_count INTEGER;
BEGIN
    -- Check for any remaining NULL tenant_id values
    FOR table_name IN SELECT unnest(ARRAY['user_profiles', 'accounts', 'activities', 'contacts', 'properties', 'weekly_goals'])
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE tenant_id IS NULL', table_name) INTO null_count;
        IF null_count > 0 THEN
            RAISE WARNING 'Found % NULL tenant_id values in table: %', null_count, table_name;
        ELSE
            RAISE NOTICE 'All tenant_id values populated in table: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Tenant isolation migration completed successfully!';
END $$;