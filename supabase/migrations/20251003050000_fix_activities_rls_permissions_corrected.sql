-- Location: supabase/migrations/20251003050000_fix_activities_rls_permissions_corrected.sql
-- Schema Analysis: Fix RLS permission errors for activities table with simple, reliable policies
-- Integration Type: Fix existing RLS policies to resolve permission denied errors
-- Dependencies: activities, user_profiles, accounts, contacts, properties, opportunities tables

-- =========================================
-- STEP 1: Drop problematic existing policies
-- =========================================

-- Drop all existing problematic policies on activities table
DROP POLICY IF EXISTS "users_manage_own_activities" ON public.activities;
DROP POLICY IF EXISTS "users_view_activities" ON public.activities;
DROP POLICY IF EXISTS "users_create_activities" ON public.activities;
DROP POLICY IF EXISTS "users_update_activities" ON public.activities;
DROP POLICY IF EXISTS "users_delete_activities" ON public.activities;
DROP POLICY IF EXISTS "tenant_users_manage_own_activities" ON public.activities;
DROP POLICY IF EXISTS "tenant_scoped_activities" ON public.activities;
DROP POLICY IF EXISTS "managers_view_team_activities" ON public.activities;

-- Drop existing problematic user_profiles policies
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_view_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "tenant_users_manage_own_profiles" ON public.user_profiles;

-- Drop problematic policies on related tables that might be causing issues
DROP POLICY IF EXISTS "users_manage_own_accounts" ON public.accounts;
DROP POLICY IF EXISTS "users_view_accounts" ON public.accounts;
DROP POLICY IF EXISTS "tenant_users_view_accounts" ON public.accounts;
DROP POLICY IF EXISTS "tenant_reps_manage_assigned_accounts" ON public.accounts;

DROP POLICY IF EXISTS "users_manage_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_view_contacts" ON public.contacts;
DROP POLICY IF EXISTS "tenant_users_access_contacts" ON public.contacts;
DROP POLICY IF EXISTS "tenant_users_manage_contacts" ON public.contacts;

DROP POLICY IF EXISTS "users_manage_own_properties" ON public.properties;
DROP POLICY IF EXISTS "users_view_properties" ON public.properties;
DROP POLICY IF EXISTS "tenant_users_access_properties" ON public.properties;
DROP POLICY IF EXISTS "tenant_users_manage_properties" ON public.properties;

DROP POLICY IF EXISTS "users_manage_own_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "users_view_opportunities" ON public.opportunities;

-- =========================================
-- STEP 2: Drop problematic functions
-- =========================================

DROP FUNCTION IF EXISTS public.get_current_user_tenant();
DROP FUNCTION IF EXISTS public.user_can_access_tenant_data(UUID);
DROP FUNCTION IF EXISTS public.is_manager_from_auth();

-- =========================================
-- STEP 3: Ensure RLS is enabled
-- =========================================

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- =========================================
-- STEP 4: Create simple helper functions (optional - only for role-based access)
-- =========================================

-- Function for admin role checks (queries auth.users to avoid circular dependencies)
CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (au.raw_user_meta_data->>'role' = 'admin' 
         OR au.raw_app_meta_data->>'role' = 'admin'
         OR au.raw_user_meta_data->>'role' = 'manager'
         OR au.raw_app_meta_data->>'role' = 'manager')
)
$$;

-- Function to get tenant id (only if tenant isolation is needed)
CREATE OR REPLACE FUNCTION public.get_user_tenant_safe()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT tenant_id FROM public.user_profiles 
WHERE id = auth.uid()
LIMIT 1
$$;

-- =========================================
-- STEP 5: Create simple, reliable RLS policies
-- =========================================

-- Pattern 1: Core user table - user_profiles (simple direct comparison)
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Pattern 2: Simple user ownership - activities table
CREATE POLICY "users_manage_own_activities"
ON public.activities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin access for activities (optional)
CREATE POLICY "admin_full_access_activities"
ON public.activities
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Pattern 2: Simple user ownership - accounts table (using assigned_rep_id)
CREATE POLICY "reps_manage_assigned_accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (assigned_rep_id = auth.uid())
WITH CHECK (assigned_rep_id = auth.uid());

-- Admin access for accounts (optional)
CREATE POLICY "admin_full_access_accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- =========================================
-- STEP 6: Handle tenant isolation (if needed)
-- =========================================

-- Check if tenant_id column exists and add tenant-aware policies if needed
DO $$
BEGIN
    -- Check if tenant_id column exists in activities table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'activities' 
        AND column_name = 'tenant_id'
    ) THEN
        -- Drop simple policy and create tenant-aware policy
        DROP POLICY IF EXISTS "users_manage_own_activities" ON public.activities;
        
        -- Create tenant + user isolation policy for activities
        CREATE POLICY "tenant_user_activities"
        ON public.activities
        FOR ALL
        TO authenticated
        USING (
            user_id = auth.uid() 
            AND tenant_id = public.get_user_tenant_safe()
        )
        WITH CHECK (
            user_id = auth.uid() 
            AND tenant_id = public.get_user_tenant_safe()
        );
    END IF;
    
    -- Handle accounts table tenant isolation
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'accounts' 
        AND column_name = 'tenant_id'
    ) THEN
        -- Drop simple policy and create tenant-aware policy
        DROP POLICY IF EXISTS "reps_manage_assigned_accounts" ON public.accounts;
        
        -- Create tenant + assigned rep policy for accounts
        CREATE POLICY "tenant_assigned_accounts"
        ON public.accounts
        FOR ALL
        TO authenticated
        USING (
            assigned_rep_id = auth.uid() 
            AND tenant_id = public.get_user_tenant_safe()
        )
        WITH CHECK (
            assigned_rep_id = auth.uid() 
            AND tenant_id = public.get_user_tenant_safe()
        );
    END IF;

END $$;

-- =========================================
-- STEP 7: Create policies for related tables
-- =========================================

-- Contacts - access through account ownership
CREATE OR REPLACE FUNCTION public.user_can_access_contact(contact_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    JOIN public.accounts a ON c.account_id = a.id
    WHERE c.id = contact_id 
    AND a.assigned_rep_id = auth.uid()
)
$$;

CREATE POLICY "users_access_account_contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (public.user_can_access_contact(id))
WITH CHECK (public.user_can_access_contact(id));

-- Admin access for contacts
CREATE POLICY "admin_full_access_contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Properties - access through account ownership
CREATE OR REPLACE FUNCTION public.user_can_access_property(property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.accounts a ON p.account_id = a.id
    WHERE p.id = property_id 
    AND a.assigned_rep_id = auth.uid()
)
$$;

CREATE POLICY "users_access_account_properties"
ON public.properties
FOR ALL
TO authenticated
USING (public.user_can_access_property(id))
WITH CHECK (public.user_can_access_property(id));

-- Admin access for properties
CREATE POLICY "admin_full_access_properties"
ON public.properties
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- =========================================
-- STEP 8: Grant necessary permissions
-- =========================================

-- Refresh any existing table grants to ensure proper permissions
GRANT ALL ON public.activities TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.properties TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =========================================
-- FINAL VALIDATION
-- =========================================

DO $$
BEGIN
    RAISE NOTICE 'Activities RLS permissions migration completed successfully!';
    RAISE NOTICE 'Fixed RLS policies for activities, accounts, contacts, and properties tables';
    RAISE NOTICE 'Used simple, reliable RLS patterns to prevent permission denied errors';
END $$;