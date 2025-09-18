-- Location: supabase/migrations/20251216240000_fix_user_profiles_infinite_recursion_final.sql
-- Fix infinite recursion in user_profiles RLS policies
-- Problem: manager_team_view_access policy causes circular dependency
-- Solution: Replace complex policies with simple direct column comparisons

-- Step 1: Drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "manager_team_view_access" ON public.user_profiles;
DROP POLICY IF EXISTS "user_own_profile_access" ON public.user_profiles;
DROP POLICY IF EXISTS "super_admin_complete_access" ON public.user_profiles;

-- Step 2: Create new safe RLS policies using Pattern 1 (Core User Tables)
-- Pattern 1: Simple, direct column comparison - NEVER use functions on user_profiles table
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Step 3: Add super admin access using safe auth.users metadata approach (Pattern 6 Option A)
-- This queries auth.users metadata instead of user_profiles to avoid circular dependency
CREATE POLICY "super_admin_full_access_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (is_super_admin_safe())
WITH CHECK (is_super_admin_safe());

-- Step 4: Add manager access using a separate, safe function that doesn't cause recursion
-- This function checks if the current user is a manager by looking at a specific user ID
-- without requiring complex queries on user_profiles
CREATE OR REPLACE FUNCTION public.is_manager_accessing_team_member(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    -- Check if the current user (auth.uid()) is the manager of the profile being accessed
    -- This uses the manager_id column directly without complex joins
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = profile_id 
    AND up.manager_id = auth.uid()
)
$$;

-- Create a safe manager policy that allows managers to view their team members
CREATE POLICY "managers_view_team_members"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    -- Allow access if:
    -- 1. User is viewing their own profile (primary access)
    -- 2. Current user is the manager of the profile being viewed
    id = auth.uid() OR is_manager_accessing_team_member(id)
);

-- Step 5: Clean up any related issues by ensuring proper indexes exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager_lookup 
ON public.user_profiles(manager_id) 
WHERE manager_id IS NOT NULL;

-- Step 6: Add a comment explaining the fix
COMMENT ON POLICY "users_manage_own_user_profiles" ON public.user_profiles IS 
'Simple ownership policy to prevent infinite recursion. Users can only manage their own profiles.';

COMMENT ON POLICY "managers_view_team_members" ON public.user_profiles IS 
'Allows managers to view their team members profiles using safe function that avoids circular dependency.';

COMMENT ON POLICY "super_admin_full_access_user_profiles" ON public.user_profiles IS 
'Super admin access using auth.users metadata to avoid querying user_profiles table directly.';