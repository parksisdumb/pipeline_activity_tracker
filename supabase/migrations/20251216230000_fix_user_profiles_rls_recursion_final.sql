-- Location: supabase/migrations/20251216230000_fix_user_profiles_rls_recursion_final.sql
-- Schema Analysis: Final fix for infinite recursion in user_profiles RLS policies
-- Integration Type: Modificative - completely replacing problematic RLS policies and functions
-- Dependencies: user_profiles table, auth.users table

-- Step 1: Disable RLS temporarily to allow safe policy replacement
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to ensure clean slate
DROP POLICY IF EXISTS "users_and_managers_access_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "super_admin_full_access_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "managers_view_team_profiles" ON public.user_profiles;

-- Step 3: Create the safe super admin function that NEVER queries user_profiles table
CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (
        -- ONLY check auth metadata - NEVER query user_profiles table
        au.raw_user_meta_data->>'role' = 'super_admin' 
        OR au.raw_app_meta_data->>'role' = 'super_admin'
        OR au.raw_user_meta_data->>'role' = 'master_admin'
        OR au.raw_app_meta_data->>'role' = 'master_admin'
        -- Email-based super admin identification
        OR au.email = 'team@dillyos.com'
    )
);
$$;

-- Step 4: Update the main function to use the safe version
-- This maintains backward compatibility with existing code
CREATE OR REPLACE FUNCTION public.is_super_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.is_super_admin_safe();
$$;

-- Step 5: Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create new safe RLS policies with simple column comparisons
-- Policy 1: Users can access their own profile
CREATE POLICY "user_own_profile_access"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 2: Managers can view their team members (SELECT only)
CREATE POLICY "manager_team_view_access"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR manager_id = auth.uid()
);

-- Policy 3: Super admin full access using the safe function
CREATE POLICY "super_admin_complete_access"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_super_admin_safe())
WITH CHECK (public.is_super_admin_safe());

-- Step 7: Add descriptive comments for debugging
COMMENT ON FUNCTION public.is_super_admin_safe() IS 
'Safe super admin check that NEVER queries user_profiles table to prevent infinite recursion in RLS policies';

COMMENT ON FUNCTION public.is_super_admin_from_auth() IS 
'Wrapper function for backward compatibility - calls is_super_admin_safe()';

COMMENT ON POLICY "user_own_profile_access" ON public.user_profiles IS 
'Users can access their own profile using direct auth.uid() comparison';

COMMENT ON POLICY "manager_team_view_access" ON public.user_profiles IS 
'Managers can view their team members profiles using simple manager_id column comparison';

COMMENT ON POLICY "super_admin_complete_access" ON public.user_profiles IS 
'Super administrators have full access using auth metadata check only - no user_profiles table queries';

-- Step 8: Verify the fix by testing the function doesn't trigger RLS
-- This comment serves as documentation of the fix
/* 
RECURSION FIX EXPLANATION:
- Previous function: JOIN with user_profiles table → triggers RLS → calls function again → infinite loop
- New function: Only queries auth.users metadata → no RLS trigger → no recursion
- Policies use direct column comparisons (id = auth.uid(), manager_id = auth.uid()) 
- Super admin check isolated in security definer function that bypasses RLS
*/