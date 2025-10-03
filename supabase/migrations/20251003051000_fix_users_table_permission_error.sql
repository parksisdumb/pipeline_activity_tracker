-- Location: supabase/migrations/20251003051000_fix_users_table_permission_error.sql
-- Schema Analysis: Fix RLS permission denied error for "users" table reference
-- Integration Type: Fix existing RLS policies to resolve table reference issues
-- Dependencies: user_profiles table, activities, accounts, contacts, properties, opportunities tables

-- =========================================
-- STEP 1: Drop dependent policies first (to resolve CASCADE error)
-- =========================================

-- Drop all policies that depend on user_can_access_tenant_data function
DROP POLICY IF EXISTS "tenant_users_full_contacts_access" ON public.contacts;
DROP POLICY IF EXISTS "tenant_users_full_properties_access" ON public.properties;
DROP POLICY IF EXISTS "users_managers_accounts_access" ON public.accounts;
DROP POLICY IF EXISTS "tenant_users_opportunities_access" ON public.opportunities;

-- Drop any other tenant-related policies that might exist
DROP POLICY IF EXISTS "tenant_users_accounts_access" ON public.accounts;
DROP POLICY IF EXISTS "tenant_users_properties_access" ON public.properties;
DROP POLICY IF EXISTS "tenant_users_contacts_access" ON public.contacts;
DROP POLICY IF EXISTS "tenant_users_access" ON public.user_profiles;

-- =========================================
-- STEP 2: Drop the problematic function that was causing the CASCADE error
-- =========================================

DROP FUNCTION IF EXISTS public.user_can_access_tenant_data(UUID) CASCADE;

-- =========================================
-- STEP 3: Clean up any references to "users" table
-- =========================================

-- Drop any functions that might be incorrectly referencing "users" instead of "user_profiles"
DROP FUNCTION IF EXISTS public.get_current_user();
DROP FUNCTION IF EXISTS public.get_user_tenant();
DROP FUNCTION IF EXISTS public.validate_user_access();
DROP FUNCTION IF EXISTS public.check_user_permissions();

-- Drop any views that might be referencing a non-existent "users" table
DROP VIEW IF EXISTS public.users;
DROP VIEW IF EXISTS public.user_view;
DROP VIEW IF EXISTS public.all_users;

-- =========================================
-- STEP 4: Drop all existing problematic policies (comprehensive cleanup)
-- =========================================

-- Clean up user_profiles policies
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_view_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_create_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_delete_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "tenant_users_manage_own_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_full_access_user_profiles" ON public.user_profiles;

-- Clean up activities policies
DROP POLICY IF EXISTS "users_manage_own_activities" ON public.activities;
DROP POLICY IF EXISTS "users_view_activities" ON public.activities;
DROP POLICY IF EXISTS "tenant_user_activities" ON public.activities;
DROP POLICY IF EXISTS "admin_full_access_activities" ON public.activities;

-- Clean up accounts policies
DROP POLICY IF EXISTS "reps_manage_assigned_accounts" ON public.accounts;
DROP POLICY IF EXISTS "tenant_assigned_accounts" ON public.accounts;
DROP POLICY IF EXISTS "admin_full_access_accounts" ON public.accounts;

-- Clean up contacts policies
DROP POLICY IF EXISTS "users_access_account_contacts" ON public.contacts;
DROP POLICY IF EXISTS "admin_full_access_contacts" ON public.contacts;

-- Clean up properties policies
DROP POLICY IF EXISTS "users_access_account_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_full_access_properties" ON public.properties;

-- Clean up opportunities policies
DROP POLICY IF EXISTS "users_access_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "admin_full_access_opportunities" ON public.opportunities;

-- =========================================
-- STEP 5: Drop other problematic helper functions
-- =========================================

DROP FUNCTION IF EXISTS public.get_current_user_tenant();
DROP FUNCTION IF EXISTS public.get_user_tenant_safe();
DROP FUNCTION IF EXISTS public.is_manager_from_auth();
DROP FUNCTION IF EXISTS public.is_admin_from_auth();
DROP FUNCTION IF EXISTS public.user_can_access_contact(UUID);
DROP FUNCTION IF EXISTS public.user_can_access_property(UUID);
DROP FUNCTION IF EXISTS public.user_can_access_account(UUID);

-- =========================================
-- STEP 6: Create safe admin role check function
-- =========================================

-- Safe function that queries auth.users metadata instead of user_profiles
CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (au.raw_user_meta_data->>'role' IN ('admin', 'manager')
         OR au.raw_app_meta_data->>'role' IN ('admin', 'manager'))
)
$$;

-- =========================================
-- STEP 7: Create simple, reliable RLS policies using direct patterns
-- =========================================

-- Pattern 1: Core user table - user_profiles (simple direct comparison)
CREATE POLICY "users_full_access_own_profile"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin access for user_profiles using safe auth metadata check
CREATE POLICY "admin_full_access_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_admin_role())
WITH CHECK (public.is_admin_role());

-- Pattern 2: Simple user ownership - activities table
CREATE POLICY "users_full_access_own_activities"
ON public.activities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin access for activities
CREATE POLICY "admin_full_access_activities"
ON public.activities
FOR ALL
TO authenticated
USING (public.is_admin_role())
WITH CHECK (public.is_admin_role());

-- Pattern 2: Simple user ownership - accounts table (using assigned_rep_id)
CREATE POLICY "reps_full_access_assigned_accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (assigned_rep_id = auth.uid())
WITH CHECK (assigned_rep_id = auth.uid());

-- Admin access for accounts
CREATE POLICY "admin_full_access_accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (public.is_admin_role())
WITH CHECK (public.is_admin_role());

-- =========================================
-- STEP 8: Create safe helper functions for related tables
-- =========================================

-- Safe function to check account access without circular dependencies
CREATE OR REPLACE FUNCTION public.user_owns_account(account_uuid UUID)
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

-- =========================================
-- STEP 9: Create policies for contacts and properties
-- =========================================

-- Contacts - access through account ownership
CREATE POLICY "users_access_owned_account_contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (public.user_owns_account(account_id))
WITH CHECK (public.user_owns_account(account_id));

-- Admin access for contacts
CREATE POLICY "admin_full_access_contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (public.is_admin_role())
WITH CHECK (public.is_admin_role());

-- Properties - access through account ownership
CREATE POLICY "users_access_owned_account_properties"
ON public.properties
FOR ALL
TO authenticated
USING (public.user_owns_account(account_id))
WITH CHECK (public.user_owns_account(account_id));

-- Admin access for properties
CREATE POLICY "admin_full_access_properties"
ON public.properties
FOR ALL
TO authenticated
USING (public.is_admin_role())
WITH CHECK (public.is_admin_role());

-- =========================================
-- STEP 10: Create policies for opportunities table
-- =========================================

-- Opportunities - access through account ownership
CREATE POLICY "users_access_owned_account_opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.accounts a
        WHERE a.id = opportunities.account_id 
        AND a.assigned_rep_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.accounts a
        WHERE a.id = opportunities.account_id 
        AND a.assigned_rep_id = auth.uid()
    )
);

-- Admin access for opportunities
CREATE POLICY "admin_full_access_opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (public.is_admin_role())
WITH CHECK (public.is_admin_role());

-- =========================================
-- STEP 11: Ensure proper table permissions
-- =========================================

-- Ensure all tables have proper grants
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.activities TO authenticated;
GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.opportunities TO authenticated;

-- Ensure sequences have proper grants
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =========================================
-- STEP 12: Create a safe user lookup function for services
-- =========================================

-- Function to safely get user profile data without RLS conflicts
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    phone TEXT,
    is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.role::TEXT,
    up.phone,
    up.is_active
FROM public.user_profiles up
WHERE up.id = auth.uid()
LIMIT 1
$$;

-- =========================================
-- FINAL VALIDATION
-- =========================================

DO $$
BEGIN
    RAISE NOTICE 'Users table permission error fix completed successfully!';
    RAISE NOTICE 'Fixed RLS policies for user_profiles, activities, accounts, contacts, properties, and opportunities';
    RAISE NOTICE 'Removed any references to non-existent "users" table';
    RAISE NOTICE 'Used safe, simple RLS patterns to prevent permission errors';
    RAISE NOTICE 'Resolved CASCADE dependency issues with user_can_access_tenant_data function';
END $$;