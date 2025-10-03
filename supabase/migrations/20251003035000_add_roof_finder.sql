-- Location: supabase/migrations/20251003035000_add_roof_finder.sql
-- Schema Analysis: Building upon existing pipeline_activity_tracker schema with tenant isolation
-- Integration Type: NEW_MODULE - Roof lead functionality with PostGIS geometry support
-- Dependencies: user_profiles, tenants, accounts, properties, prospects, tasks

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Create roof condition enum types
CREATE TYPE public.roof_condition_label AS ENUM (
    'dirty',
    'aged', 
    'patched',
    'ponding',
    'damaged',
    'other'
);

CREATE TYPE public.roof_lead_status AS ENUM (
    'new',
    'assessed',
    'contacted',
    'qualified',
    'converted',
    'rejected'
);

-- 2. Create roof_leads table with PostGIS geometry
CREATE TABLE public.roof_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    geometry GEOMETRY(GEOMETRY, 4326) NOT NULL, -- Support both Point and Polygon
    condition_label public.roof_condition_label NOT NULL DEFAULT 'other',
    condition_score INTEGER NOT NULL DEFAULT 1 CHECK (condition_score >= 1 AND condition_score <= 5),
    status public.roof_lead_status NOT NULL DEFAULT 'new',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    -- Address fields
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    -- Estimated property details
    estimated_sqft INTEGER,
    estimated_repair_cost DECIMAL(10,2),
    -- Links to existing entities
    linked_prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
    linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    linked_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    -- Audit fields
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create roof_lead_images table for private image storage
CREATE TABLE public.roof_lead_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roof_lead_id UUID NOT NULL REFERENCES public.roof_leads(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase storage
    file_size INTEGER,
    mime_type TEXT,
    description TEXT,
    -- Audit fields
    uploaded_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for performance
CREATE INDEX idx_roof_leads_geometry ON public.roof_leads USING GIST(geometry);
CREATE INDEX idx_roof_leads_tenant_id ON public.roof_leads(tenant_id);
CREATE INDEX idx_roof_leads_status ON public.roof_leads(tenant_id, status);
CREATE INDEX idx_roof_leads_condition_score ON public.roof_leads(tenant_id, condition_score DESC);
CREATE INDEX idx_roof_leads_created_at ON public.roof_leads(tenant_id, created_at DESC);
CREATE INDEX idx_roof_leads_created_by ON public.roof_leads(created_by);

CREATE INDEX idx_roof_lead_images_roof_lead_id ON public.roof_lead_images(roof_lead_id);
CREATE INDEX idx_roof_lead_images_tenant_id ON public.roof_lead_images(tenant_id);

-- 5. Enable RLS
ALTER TABLE public.roof_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roof_lead_images ENABLE ROW LEVEL SECURITY;

-- 6. Helper function for tenant isolation
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT tenant_id 
FROM public.user_profiles 
WHERE id = auth.uid()
LIMIT 1
$$;

-- 7. RLS Policies for roof_leads
CREATE POLICY "tenant_users_manage_roof_leads"
ON public.roof_leads
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant_id())
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Super admin access
CREATE POLICY "super_admin_full_access_roof_leads"
ON public.roof_leads
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'super_admin' 
             OR au.raw_app_meta_data->>'role' = 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'super_admin' 
             OR au.raw_app_meta_data->>'role' = 'super_admin')
    )
);

-- 8. RLS Policies for roof_lead_images
CREATE POLICY "tenant_users_manage_roof_lead_images"
ON public.roof_lead_images
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant_id())
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Super admin access for images
CREATE POLICY "super_admin_full_access_roof_lead_images"
ON public.roof_lead_images
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'super_admin' 
             OR au.raw_app_meta_data->>'role' = 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'super_admin' 
             OR au.raw_app_meta_data->>'role' = 'super_admin')
    )
);

-- 9. Updated_at triggers
CREATE TRIGGER handle_updated_at_roof_leads
    BEFORE UPDATE ON public.roof_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 10. Create private storage bucket for roof lead images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'roof-lead-images',
    'roof-lead-images',
    false, -- Private bucket
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- 11. Storage RLS Policies - Tenant-scoped private access
CREATE POLICY "tenant_users_view_roof_lead_images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'roof-lead-images' 
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = (
        SELECT tenant_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
);

CREATE POLICY "tenant_users_upload_roof_lead_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'roof-lead-images'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = (
        SELECT tenant_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
);

CREATE POLICY "tenant_users_update_roof_lead_images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'roof-lead-images'
    AND owner = auth.uid()
)
WITH CHECK (
    bucket_id = 'roof-lead-images'
    AND owner = auth.uid()
);

CREATE POLICY "tenant_users_delete_roof_lead_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'roof-lead-images'
    AND owner = auth.uid()
);

-- 12. Mock data for testing
DO $$
DECLARE
    existing_user_id UUID;
    existing_tenant_id UUID;
    lead1_id UUID := gen_random_uuid();
    lead2_id UUID := gen_random_uuid();
BEGIN
    -- Get existing user and tenant for mock data
    SELECT id, tenant_id INTO existing_user_id, existing_tenant_id
    FROM public.user_profiles
    WHERE role = 'rep' AND is_active = true
    LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
        -- Create sample roof leads with different geometries
        INSERT INTO public.roof_leads (
            id, name, geometry, condition_label, condition_score, status,
            tags, notes, address, city, state, zip_code,
            estimated_sqft, estimated_repair_cost,
            created_by, tenant_id
        ) VALUES 
        (
            lead1_id,
            'Warehouse Roof - Ponding Issues',
            ST_GeomFromText('POINT(-95.369803 29.760427)', 4326), -- Houston coordinates
            'ponding',
            4,
            'new',
            ARRAY['commercial', 'urgent', 'high-value'],
            'Significant ponding water observed on flat roof. Potential for major leak development.',
            '1200 Industrial Blvd',
            'Houston',
            'TX',
            '77032',
            50000,
            25000.00,
            existing_user_id,
            existing_tenant_id
        ),
        (
            lead2_id,
            'Office Building - Aged TPO',
            ST_GeomFromText('POLYGON((-97.743061 30.267153, -97.743061 30.268000, -97.742000 30.268000, -97.742000 30.267153, -97.743061 30.267153))', 4326), -- Austin area
            'aged',
            3,
            'new',
            ARRAY['commercial', 'tpo', 'planned-replacement'],
            'TPO membrane showing signs of aging and UV damage. Recommend inspection within 6 months.',
            '500 Commerce Dr',
            'Austin',
            'TX',
            '78701',
            30000,
            18000.00,
            existing_user_id,
            existing_tenant_id
        );

        RAISE NOTICE 'Created % sample roof leads with PostGIS geometry support', 2;
    ELSE
        RAISE NOTICE 'No active rep users found. Skipping sample roof leads creation.';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating sample roof leads: %', SQLERRM;
END $$;

-- 13. Functions for roof lead management
CREATE OR REPLACE FUNCTION public.create_roof_lead_with_geojson(
    p_name TEXT,
    p_geojson JSONB,
    p_condition_label public.roof_condition_label,
    p_condition_score INTEGER,
    p_tags TEXT[] DEFAULT '{}',
    p_notes TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_zip_code TEXT DEFAULT NULL,
    p_estimated_sqft INTEGER DEFAULT NULL,
    p_estimated_repair_cost DECIMAL DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, lead_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead_id UUID := gen_random_uuid();
    v_user_id UUID := auth.uid();
    v_tenant_id UUID;
    v_geometry GEOMETRY;
BEGIN
    -- Get user's tenant_id
    SELECT tenant_id INTO v_tenant_id
    FROM public.user_profiles
    WHERE id = v_user_id;

    IF v_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'User not found or not associated with tenant';
        RETURN;
    END IF;

    -- Convert GeoJSON to PostGIS geometry
    v_geometry := ST_GeomFromGeoJSON(p_geojson::text);
    
    -- Set SRID to WGS84 if not specified
    IF ST_SRID(v_geometry) = 0 THEN
        v_geometry := ST_SetSRID(v_geometry, 4326);
    END IF;

    -- Insert roof lead
    INSERT INTO public.roof_leads (
        id, name, geometry, condition_label, condition_score,
        tags, notes, address, city, state, zip_code,
        estimated_sqft, estimated_repair_cost,
        created_by, tenant_id
    ) VALUES (
        v_lead_id, p_name, v_geometry, p_condition_label, p_condition_score,
        p_tags, p_notes, p_address, p_city, p_state, p_zip_code,
        p_estimated_sqft, p_estimated_repair_cost,
        v_user_id, v_tenant_id
    );

    RETURN QUERY SELECT true, v_lead_id, 'Roof lead created successfully';

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Error creating roof lead: ' || SQLERRM;
END;
$$;