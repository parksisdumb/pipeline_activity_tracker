-- Location: supabase/migrations/20250910102320_add_tenants_table.sql
-- Schema Analysis: Existing CRM system with user_profiles (admin/manager/rep roles), accounts, contacts, properties, activities, and weekly_goals
-- Integration Type: Addition - New tenants table for multi-tenant functionality
-- Dependencies: References existing user_profiles table

-- Create tenant status enum
CREATE TYPE public.tenant_status AS ENUM ('active', 'inactive', 'suspended', 'trial', 'expired');

-- Create subscription plan enum  
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'pro', 'enterprise', 'custom');

-- Create tenants table for multi-tenant functionality
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    domain TEXT UNIQUE,
    description TEXT,
    
    -- Owner and admin management
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Tenant status and lifecycle
    status public.tenant_status DEFAULT 'trial'::public.tenant_status,
    is_active BOOLEAN DEFAULT true,
    
    -- Subscription and billing
    subscription_plan public.subscription_plan DEFAULT 'free'::public.subscription_plan,
    subscription_starts_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days'),
    
    -- Usage limits and quotas
    max_users INTEGER DEFAULT 5,
    max_accounts INTEGER DEFAULT 100,
    max_properties INTEGER DEFAULT 500,
    max_storage_mb INTEGER DEFAULT 1000,
    
    -- Tenant settings and preferences
    settings JSONB DEFAULT '{}'::jsonb,
    branding JSONB DEFAULT '{}'::jsonb,
    timezone TEXT DEFAULT 'UTC',
    
    -- Contact information
    contact_email TEXT,
    contact_phone TEXT,
    billing_email TEXT,
    
    -- Address information
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_tenants_owner_id ON public.tenants(owner_id);
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_subscription_plan ON public.tenants(subscription_plan);
CREATE INDEX idx_tenants_created_by ON public.tenants(created_by);
CREATE INDEX idx_tenants_domain ON public.tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_tenants_active_status ON public.tenants(status, is_active) WHERE is_active = true;

-- Create partial index for active tenants by plan
CREATE INDEX idx_tenants_active_by_plan ON public.tenants(subscription_plan, created_at) 
WHERE status = 'active' AND is_active = true;

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_tenants
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies using Pattern 2 (Simple User Ownership) for tenant owners
CREATE POLICY "owners_manage_own_tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Additional policy for tenant access by members (future expansion)
CREATE POLICY "tenant_members_can_view_tenant"
ON public.tenants
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT t.id FROM public.tenants t
        JOIN public.user_profiles up ON up.id = auth.uid()
        WHERE t.owner_id = up.id OR t.created_by = up.id
    )
);

-- Admin full access policy using Pattern 6 (Role-Based Access)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'admin'
)
$$;

CREATE POLICY "admin_full_access_tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Helper function to get current user's tenant
CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT t.id
FROM public.tenants t
JOIN public.user_profiles up ON up.id = auth.uid()
WHERE t.owner_id = up.id OR t.created_by = up.id
LIMIT 1
$$;

-- Helper function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.user_profiles up ON up.id = auth.uid()
    WHERE t.id = tenant_uuid 
    AND (t.owner_id = up.id OR t.created_by = up.id)
)
$$;

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION public.check_tenant_limits(tenant_uuid UUID, limit_type TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    CASE limit_type
        WHEN 'users' THEN t.max_users
        WHEN 'accounts' THEN t.max_accounts  
        WHEN 'properties' THEN t.max_properties
        WHEN 'storage' THEN t.max_storage_mb
        ELSE 0
    END
FROM public.tenants t
WHERE t.id = tenant_uuid
$$;

-- Sample data for testing multi-tenant functionality
DO $$
DECLARE
    admin_user_id UUID;
    manager_user_id UUID;
    tenant1_id UUID := gen_random_uuid();
    tenant2_id UUID := gen_random_uuid();
BEGIN
    -- Get existing user IDs from user_profiles
    SELECT id INTO admin_user_id FROM public.user_profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO manager_user_id FROM public.user_profiles WHERE role = 'manager' LIMIT 1;
    
    -- Only create sample data if users exist
    IF admin_user_id IS NOT NULL AND manager_user_id IS NOT NULL THEN
        -- Create sample tenants
        INSERT INTO public.tenants (
            id, name, slug, domain, description, owner_id, created_by,
            status, subscription_plan, max_users, max_accounts, max_properties,
            contact_email, timezone, city, state, country
        ) VALUES
        (
            tenant1_id,
            'Acme Roofing Corporation', 
            'acme-roofing',
            'acme-roofing.app',
            'Leading commercial roofing contractor specializing in industrial and warehouse properties',
            admin_user_id,
            admin_user_id,
            'active'::public.tenant_status,
            'pro'::public.subscription_plan,
            25,
            500,
            2000,
            'admin@acmeroofing.com',
            'America/New_York',
            'New York',
            'NY',
            'US'
        ),
        (
            tenant2_id,
            'Summit Property Management',
            'summit-pm', 
            'summit-pm.app',
            'Full-service property management company managing commercial real estate portfolios',
            manager_user_id,
            admin_user_id,
            'trial'::public.tenant_status,
            'basic'::public.subscription_plan,
            10,
            200,
            800,
            'manager@summitpm.com',
            'America/Los_Angeles',
            'Los Angeles',
            'CA',
            'US'
        );

        RAISE NOTICE 'Sample tenants created successfully for multi-tenant setup';
    ELSE
        RAISE NOTICE 'No existing users found. Sample tenants not created.';
    END IF;

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error creating sample tenants: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error creating sample tenants: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error creating sample tenants: %', SQLERRM;
END $$;