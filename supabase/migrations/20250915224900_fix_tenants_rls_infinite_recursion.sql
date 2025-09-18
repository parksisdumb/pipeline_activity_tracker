-- Fix infinite recursion in tenants table RLS policies
-- Problem: tenant_members_can_view_tenant policy queries tenants table within tenants policy
-- Solution: Replace with safe, non-recursive policies using Pattern 6A (auth.users metadata)

-- Step 1: Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "tenant_members_can_view_tenant" ON public.tenants;
DROP POLICY IF EXISTS "admin_full_access_tenants" ON public.tenants;

-- Step 2: Create safe admin function that queries auth.users instead of user_profiles
CREATE OR REPLACE FUNCTION public.is_admin_from_auth_metadata()
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
         OR au.raw_user_meta_data->>'role' = 'super_admin')
)
$$;

-- Step 3: Create safe admin policy using auth.users metadata (Pattern 6A)
CREATE POLICY "admin_full_access_tenants_safe"
ON public.tenants
FOR ALL
TO authenticated
USING (public.is_admin_from_auth_metadata())
WITH CHECK (public.is_admin_from_auth_metadata());

-- Step 4: Create simple tenant member policy using direct column comparison (Pattern 1)
-- This avoids infinite recursion by using simple ownership check
CREATE POLICY "tenant_owners_access_own_tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Step 5: Create policy for tenant creators (Pattern 1 - direct column comparison)
CREATE POLICY "tenant_creators_access_created_tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Step 6: Create safe tenant membership policy using user_profiles (Pattern 5)
-- This queries user_profiles table, NOT tenants table, avoiding circular dependency
CREATE OR REPLACE FUNCTION public.user_can_access_tenant_safe(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.tenant_id = tenant_uuid
    AND up.is_active = true
)
$$;

-- Apply the safe tenant membership policy
CREATE POLICY "tenant_members_can_view_tenant_safe"
ON public.tenants
FOR SELECT
TO authenticated
USING (public.user_can_access_tenant_safe(id));

-- Step 7: Keep the existing simple owners policy as it's already safe
-- owners_manage_own_tenants policy is fine as it uses direct column comparison

-- Add comment explaining the fix
COMMENT ON FUNCTION public.is_admin_from_auth_metadata() 
IS 'Safe admin check using auth.users metadata to avoid infinite recursion in tenants RLS policies';

COMMENT ON FUNCTION public.user_can_access_tenant_safe(UUID) 
IS 'Safe tenant access check using user_profiles table to avoid circular dependency with tenants table';