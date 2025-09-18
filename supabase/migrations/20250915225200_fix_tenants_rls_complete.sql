-- Complete fix for infinite recursion in tenants table RLS policies
-- Issue: Multiple overlapping policies and circular dependencies causing infinite recursion
-- Solution: Clean slate approach with safe, non-recursive policies

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing tenants policies to start clean
DROP POLICY IF EXISTS "tenant_members_can_view_tenant_safe" ON public.tenants;
DROP POLICY IF EXISTS "tenant_creators_access_created_tenants" ON public.tenants;
DROP POLICY IF EXISTS "owners_manage_own_tenants" ON public.tenants;
DROP POLICY IF EXISTS "admin_full_access_tenants_safe" ON public.tenants;
DROP POLICY IF EXISTS "tenant_owners_access_own_tenants" ON public.tenants;

-- Step 3: Ensure we have safe functions (update existing to be completely safe)
CREATE OR REPLACE FUNCTION public.is_admin_from_auth_metadata()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
    (SELECT (au.raw_user_meta_data->>'role' = 'admin' 
             OR au.raw_app_meta_data->>'role' = 'admin'
             OR au.raw_user_meta_data->>'role' = 'super_admin')
     FROM auth.users au
     WHERE au.id = auth.uid()),
    false
)
$$;

-- Safe tenant membership check (no circular dependency)
CREATE OR REPLACE FUNCTION public.user_can_access_tenant_safe(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
    (SELECT up.is_active = true
     FROM public.user_profiles up
     WHERE up.id = auth.uid() 
     AND up.tenant_id = tenant_uuid),
    false
)
$$;

-- Step 4: Re-enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Step 5: Create NEW safe policies in the correct order

-- Policy 1: Admin access (highest priority)
CREATE POLICY "tenants_admin_full_access"
ON public.tenants
FOR ALL
TO authenticated
USING (public.is_admin_from_auth_metadata())
WITH CHECK (public.is_admin_from_auth_metadata());

-- Policy 2: Owner access (direct ownership)
CREATE POLICY "tenants_owner_access"
ON public.tenants
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy 3: Creator access (who created the tenant)
CREATE POLICY "tenants_creator_access"
ON public.tenants
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Policy 4: Team member SELECT access only (safe function)
CREATE POLICY "tenants_member_view_access"
ON public.tenants
FOR SELECT
TO authenticated
USING (public.user_can_access_tenant_safe(id));

-- Step 6: Add helpful comments
COMMENT ON POLICY "tenants_admin_full_access" ON public.tenants 
IS 'Admins have full access to all tenants using auth metadata check';

COMMENT ON POLICY "tenants_owner_access" ON public.tenants 
IS 'Tenant owners have full access to their own tenants';

COMMENT ON POLICY "tenants_creator_access" ON public.tenants 
IS 'Tenant creators have full access to tenants they created';

COMMENT ON POLICY "tenants_member_view_access" ON public.tenants 
IS 'Team members can view their tenant using safe user_profiles lookup';

-- Step 7: Verify policies are working
-- This query should not cause infinite recursion
DO $$
BEGIN
    PERFORM count(*) FROM public.tenants LIMIT 1;
    RAISE NOTICE 'Tenants RLS policies fixed successfully - no infinite recursion detected';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'RLS fix failed: %', SQLERRM;
END
$$;