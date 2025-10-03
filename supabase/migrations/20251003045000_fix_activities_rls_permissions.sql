-- Location: supabase/migrations/20251003045000_fix_activities_rls_permissions.sql
-- Schema Analysis: Fix RLS permission errors for activities table and related user access
-- Integration Type: Fix existing RLS policies to resolve permission denied errors
-- Dependencies: activities, user_profiles, accounts, contacts, properties, opportunities tables

-- Fix RLS policies for activities table to resolve permission denied errors

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "users_manage_own_activities" ON public.activities;
DROP POLICY IF EXISTS "users_view_activities" ON public.activities;
DROP POLICY IF EXISTS "users_create_activities" ON public.activities;
DROP POLICY IF EXISTS "users_update_activities" ON public.activities;
DROP POLICY IF EXISTS "users_delete_activities" ON public.activities;

-- Enable RLS on activities table if not already enabled
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for activities table using Pattern 2 (Simple User Ownership)
CREATE POLICY "users_manage_own_activities"
ON public.activities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Check and fix user_profiles RLS policies if they are causing issues
-- Drop existing problematic user_profiles policies if they exist
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_view_user_profiles" ON public.user_profiles;

-- Enable RLS on user_profiles table if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create safe user_profiles policy using Pattern 1 (Core User Tables)
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Ensure accounts table has proper RLS policies for activities relationships
DROP POLICY IF EXISTS "users_manage_own_accounts" ON public.accounts;
DROP POLICY IF EXISTS "users_view_accounts" ON public.accounts;

-- Enable RLS on accounts table if not already enabled  
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create accounts RLS policy using Pattern 2 (Simple User Ownership)
CREATE POLICY "users_manage_own_accounts"
ON public.accounts
FOR ALL
TO authenticated  
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure contacts table has proper RLS policies for activities relationships
DROP POLICY IF EXISTS "users_manage_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_view_contacts" ON public.contacts;

-- Enable RLS on contacts table if not already enabled
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create contacts RLS policy using Pattern 2 (Simple User Ownership)
CREATE POLICY "users_manage_own_contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure properties table has proper RLS policies for activities relationships
DROP POLICY IF EXISTS "users_manage_own_properties" ON public.properties;
DROP POLICY IF EXISTS "users_view_properties" ON public.properties;

-- Enable RLS on properties table if not already enabled
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create properties RLS policy using Pattern 2 (Simple User Ownership)
CREATE POLICY "users_manage_own_properties"
ON public.properties
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure opportunities table has proper RLS policies for activities relationships
DROP POLICY IF EXISTS "users_manage_own_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "users_view_opportunities" ON public.opportunities;

-- Enable RLS on opportunities table if not already enabled
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Create opportunities RLS policy using Pattern 2 (Simple User Ownership)
CREATE POLICY "users_manage_own_opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create helper function for tenant-scoped access if tenant_id column exists
-- This function safely queries user_profiles to get tenant information
CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT tenant_id FROM public.user_profiles 
WHERE id = auth.uid()
LIMIT 1
$$;

-- Add tenant-scoped policies for activities if tenant_id column exists
-- This provides additional security for multi-tenant applications
DO $$
BEGIN
    -- Check if tenant_id column exists in activities table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'activities' 
        AND column_name = 'tenant_id'
    ) THEN
        -- Create tenant-aware policy for activities
        DROP POLICY IF EXISTS "tenant_scoped_activities" ON public.activities;
        
        CREATE POLICY "tenant_scoped_activities"
        ON public.activities
        FOR ALL
        TO authenticated
        USING (tenant_id = public.get_current_user_tenant() AND user_id = auth.uid())
        WITH CHECK (tenant_id = public.get_current_user_tenant() AND user_id = auth.uid());
        
        -- Remove the simple policy in favor of tenant-scoped one
        DROP POLICY IF EXISTS "users_manage_own_activities" ON public.activities;
    END IF;
END $$;

-- Add manager-level permissions for activities if role-based access is needed
CREATE OR REPLACE FUNCTION public.is_manager_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (au.raw_user_meta_data->>'role' = 'manager' 
         OR au.raw_app_meta_data->>'role' = 'manager'
         OR au.raw_user_meta_data->>'role' = 'admin'
         OR au.raw_app_meta_data->>'role' = 'admin')
)
$$;

-- Add manager policy for cross-team activity visibility
CREATE POLICY "managers_view_team_activities"
ON public.activities
FOR SELECT
TO authenticated
USING (public.is_manager_from_auth());

-- Refresh any existing table grants to ensure proper permissions
GRANT ALL ON public.activities TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.opportunities TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;