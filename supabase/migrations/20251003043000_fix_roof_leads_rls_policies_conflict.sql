-- Fix RLS policies for roof leads functionality (Conflict Resolution)
-- Addresses "policy already exists" error for users_manage_own_user_profiles

-- Drop all existing user_profiles policies to clean slate
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_manage_own_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "tenant_isolation_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "managers_view_team_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users_only" ON public.user_profiles;
DROP POLICY IF EXISTS "enable_read_access_for_all_users" ON public.user_profiles;
DROP POLICY IF EXISTS "enable_update_for_users_based_on_user_id" ON public.user_profiles;

-- Drop existing roof leads policies
DROP POLICY IF EXISTS "tenant_isolation_roof_leads" ON public.roof_leads;
DROP POLICY IF EXISTS "users_manage_own_roof_leads" ON public.roof_leads;
DROP POLICY IF EXISTS "managers_view_tenant_roof_leads" ON public.roof_leads;
DROP POLICY IF EXISTS "users_manage_roof_lead_images" ON public.roof_lead_images;
DROP POLICY IF EXISTS "users_manage_own_roof_lead_images" ON public.roof_lead_images;
DROP POLICY IF EXISTS "managers_view_tenant_roof_lead_images" ON public.roof_lead_images;

-- Drop existing policies on related tables
DROP POLICY IF EXISTS "users_manage_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "users_manage_tenant_accounts" ON public.accounts;
DROP POLICY IF EXISTS "users_manage_tenant_properties" ON public.properties;

-- Create comprehensive user_profiles RLS policy (Pattern 1 - Core User Tables)
CREATE POLICY "user_profiles_full_access"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow managers to view team member profiles for roof leads functionality
CREATE POLICY "manager_team_profiles_access"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid()
        AND (au.raw_user_meta_data->>'role' = 'manager' 
             OR au.raw_user_meta_data->>'role' = 'admin'
             OR au.raw_app_meta_data->>'role' = 'manager'
             OR au.raw_app_meta_data->>'role' = 'admin')
    )
);

-- Create roof_leads RLS policies using Pattern 2 - Simple User Ownership
CREATE POLICY "roof_leads_user_access"
ON public.roof_leads
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow managers and admins to view all roof leads in their tenant
CREATE POLICY "roof_leads_manager_tenant_access"
ON public.roof_leads
FOR SELECT
TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.tenant_id = roof_leads.tenant_id
        AND up.role IN ('manager', 'admin')
    )
);

-- Create roof_lead_images RLS policies
CREATE POLICY "roof_lead_images_user_access"
ON public.roof_lead_images
FOR ALL
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Allow managers to view images for leads in their tenant
CREATE POLICY "roof_lead_images_manager_access"
ON public.roof_lead_images
FOR SELECT
TO authenticated
USING (
    uploaded_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        JOIN public.roof_leads rl ON rl.tenant_id = up.tenant_id
        WHERE up.id = auth.uid()
        AND rl.id = roof_lead_images.roof_lead_id
        AND up.role IN ('manager', 'admin')
    )
);

-- Ensure prospects table has proper RLS for roof lead conversion
CREATE POLICY "prospects_tenant_access"
ON public.prospects
FOR ALL
TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.tenant_id = prospects.tenant_id
        AND up.role IN ('manager', 'admin')
    )
)
WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.tenant_id = prospects.tenant_id
        AND up.role IN ('manager', 'admin')
    )
);

-- Ensure accounts table has proper RLS for roof lead linking
CREATE POLICY "accounts_tenant_access"
ON public.accounts
FOR ALL
TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.tenant_id = accounts.tenant_id
        AND up.role IN ('rep', 'manager', 'admin')
    )
)
WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.tenant_id = accounts.tenant_id
        AND up.role IN ('rep', 'manager', 'admin')
    )
);

-- Ensure properties table has proper RLS for roof lead linking
CREATE POLICY "properties_tenant_access"
ON public.properties
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.tenant_id = properties.tenant_id
        AND up.role IN ('rep', 'manager', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.tenant_id = properties.tenant_id
        AND up.role IN ('rep', 'manager', 'admin')
    )
);

-- Create helper function to check if user can access tenant data (ONLY for non-user tables)
CREATE OR REPLACE FUNCTION public.can_access_tenant_data(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.tenant_id = target_tenant_id
    AND up.role IN ('rep', 'manager', 'admin')
    LIMIT 1
)
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roof_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roof_lead_images TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;

-- Enable RLS on all tables
ALTER TABLE public.roof_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roof_lead_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Add comment for tracking
COMMENT ON TABLE public.roof_leads IS 'Updated RLS policies for roof leads functionality with conflict resolution - 2025-01-03';