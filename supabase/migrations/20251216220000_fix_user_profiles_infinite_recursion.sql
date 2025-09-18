-- Location: supabase/migrations/20251216220000_fix_user_profiles_infinite_recursion.sql
-- Schema Analysis: Fixing infinite recursion in user_profiles RLS policies
-- Integration Type: Modificative - fixing existing RLS policies
-- Dependencies: user_profiles table (existing)

-- Step 1: Drop problematic existing policies that cause infinite recursion
DROP POLICY IF EXISTS "users_and_managers_access_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "super_admin_full_access_user_profiles" ON public.user_profiles;

-- Step 2: Create a new safe function that uses auth.users metadata only
-- This avoids querying user_profiles table which would trigger RLS
CREATE OR REPLACE FUNCTION public.is_super_admin_from_auth_safe()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (
        -- Check auth metadata only - never query user_profiles
        au.raw_user_meta_data->>'role' = 'super_admin' 
        OR au.raw_app_meta_data->>'role' = 'super_admin'
        OR au.raw_user_meta_data->>'role' = 'master_admin'
        OR au.raw_app_meta_data->>'role' = 'master_admin'
        -- Special email check for the super admin account
        OR au.email = 'team@dillyos.com'
    )
);
$$;

-- Step 3: Create new safe RLS policies using Pattern 1 (Core User Tables)
-- NEVER use functions on user_profiles table to avoid circular dependency

-- Basic user access - users can only access their own profile
CREATE POLICY "users_view_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Manager access - managers can view their team members
-- Using simple column comparison without complex subqueries
CREATE POLICY "managers_view_team_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR manager_id = auth.uid()
);

-- Super admin access using the safe function that doesn't query user_profiles
CREATE POLICY "super_admin_full_access_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_super_admin_from_auth_safe())
WITH CHECK (public.is_super_admin_from_auth_safe());

-- Step 4: Update the existing problematic function to use the safe version
-- This ensures all existing code continues to work
CREATE OR REPLACE FUNCTION public.is_super_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.is_super_admin_from_auth_safe();
$$;

-- Step 5: Add comment explaining the fix
COMMENT ON FUNCTION public.is_super_admin_from_auth_safe() IS 
'Safe super admin check that only queries auth.users to avoid infinite recursion in user_profiles RLS policies';

COMMENT ON POLICY "users_view_own_profile" ON public.user_profiles IS 
'Users can view their own profile - simple column comparison to avoid infinite recursion';

COMMENT ON POLICY "managers_view_team_profiles" ON public.user_profiles IS 
'Managers can view profiles of users they manage - uses direct column comparison to avoid recursion';

COMMENT ON POLICY "super_admin_full_access_user_profiles" ON public.user_profiles IS 
'Super admins have full access using auth metadata check only - avoids user_profiles table queries';