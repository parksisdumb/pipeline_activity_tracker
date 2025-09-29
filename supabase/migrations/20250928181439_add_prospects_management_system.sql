-- Location: supabase/migrations/20250928181439_add_prospects_management_system.sql
-- Schema Analysis: Existing CRM system with accounts, contacts, properties, opportunities, activities, tasks, tenants, user_profiles
-- Integration Type: NEW_MODULE - Adding prospects staging area separate from main CRM tables
-- Dependencies: References existing tenants(id), user_profiles(id), accounts(id)

-- Create prospects table for pre-conversion company staging
CREATE TABLE IF NOT EXISTS public.prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    company_type TEXT,
    employee_count INTEGER,
    property_count_estimate INTEGER,
    sqft_estimate INTEGER,
    building_types TEXT[] DEFAULT '{}',
    icp_fit_score INTEGER CHECK (icp_fit_score BETWEEN 0 AND 100),
    source TEXT,
    status TEXT NOT NULL DEFAULT 'uncontacted', -- values: uncontacted, researching, attempted, contacted, converted, disqualified
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    last_activity_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    dedupe_keys JSONB DEFAULT '{}'::jsonb,
    linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes for filters and pagination
CREATE INDEX IF NOT EXISTS idx_prospects_tenant_status_score 
ON public.prospects(tenant_id, status, icp_fit_score DESC);

CREATE INDEX IF NOT EXISTS idx_prospects_tenant_name 
ON public.prospects(tenant_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_prospects_tenant_city_state 
ON public.prospects(tenant_id, LOWER(city), LOWER(state));

CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to 
ON public.prospects(tenant_id, assigned_to);

CREATE INDEX IF NOT EXISTS idx_prospects_source 
ON public.prospects(tenant_id, source);

CREATE INDEX IF NOT EXISTS idx_prospects_last_activity 
ON public.prospects(tenant_id, last_activity_at DESC);

-- Optional dedupe guard for active (pre-conversion) records
CREATE UNIQUE INDEX IF NOT EXISTS uidx_prospects_tenant_name_active 
ON public.prospects(tenant_id, LOWER(name)) 
WHERE status IN ('uncontacted','researching','attempted','contacted');

-- RLS on prospects
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Tenant scoping policies using Pattern 6 - Role-based with auth metadata check
CREATE OR REPLACE FUNCTION public.is_super_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (au.raw_user_meta_data->>'role' = 'super_admin' 
         OR au.raw_app_meta_data->>'role' = 'super_admin')
)
$$;

-- Helper function to get current user tenant (avoiding circular dependencies)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT tenant_id FROM public.user_profiles 
WHERE id = auth.uid() LIMIT 1
$$;

-- Pattern 6: Role-based access for prospects with tenant isolation
CREATE POLICY "super_admin_full_access_prospects" 
ON public.prospects
FOR ALL
TO authenticated
USING (public.is_super_admin_from_auth())
WITH CHECK (public.is_super_admin_from_auth());

-- Pattern 2: Simple tenant-based access for regular users
CREATE POLICY "tenant_users_manage_prospects" 
ON public.prospects
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant_id())
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Helper functions for prospect management
CREATE OR REPLACE FUNCTION public.find_account_duplicates(
    prospect_name TEXT,
    prospect_domain TEXT,
    prospect_phone TEXT,
    prospect_city TEXT,
    prospect_state TEXT,
    current_tenant_id UUID
)
RETURNS TABLE(
    account_id UUID,
    account_name TEXT,
    match_type TEXT,
    similarity_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        CASE 
            WHEN a.website IS NOT NULL AND prospect_domain IS NOT NULL 
                AND LOWER(a.website) = LOWER(prospect_domain) THEN 'domain'
            WHEN a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
                AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g') THEN 'phone'
            WHEN similarity(LOWER(a.name), LOWER(prospect_name)) > 0.7 
                AND (a.city IS NULL OR prospect_city IS NULL OR LOWER(a.city) = LOWER(prospect_city))
                AND (a.state IS NULL OR prospect_state IS NULL OR LOWER(a.state) = LOWER(prospect_state)) THEN 'name_location'
            ELSE 'other'
        END as match_type,
        CASE 
            WHEN a.website IS NOT NULL AND prospect_domain IS NOT NULL 
                AND LOWER(a.website) = LOWER(prospect_domain) THEN 1.0
            WHEN a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
                AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g') THEN 0.95
            ELSE similarity(LOWER(a.name), LOWER(prospect_name))
        END as similarity_score
    FROM public.accounts a
    WHERE a.tenant_id = current_tenant_id
    AND (
        -- Domain match
        (a.website IS NOT NULL AND prospect_domain IS NOT NULL 
         AND LOWER(a.website) = LOWER(prospect_domain))
        OR
        -- Phone match
        (a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
         AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g'))
        OR
        -- Name similarity with location match
        (similarity(LOWER(a.name), LOWER(prospect_name)) > 0.7 
         AND (a.city IS NULL OR prospect_city IS NULL OR LOWER(a.city) = LOWER(prospect_city))
         AND (a.state IS NULL OR prospect_state IS NULL OR LOWER(a.state) = LOWER(prospect_state)))
    )
    ORDER BY similarity_score DESC
    LIMIT 5;
END;
$$;

-- Function to convert prospect to account
CREATE OR REPLACE FUNCTION public.convert_prospect_to_account(
    prospect_uuid UUID,
    link_to_existing_account_id UUID DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    account_id UUID,
    prospect_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prospect_record public.prospects%ROWTYPE;
    new_account_id UUID;
    current_user_id UUID;
    current_tenant_id UUID;
    manager_id UUID;
BEGIN
    -- Get current user info
    current_user_id := auth.uid();
    SELECT tenant_id INTO current_tenant_id FROM public.user_profiles WHERE id = current_user_id;
    
    -- Get prospect record
    SELECT * INTO prospect_record FROM public.prospects 
    WHERE id = prospect_uuid AND tenant_id = current_tenant_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Prospect not found', NULL::UUID, prospect_uuid;
        RETURN;
    END IF;
    
    -- Check if already converted
    IF prospect_record.status = 'converted' THEN
        RETURN QUERY SELECT FALSE, 'Prospect already converted', prospect_record.linked_account_id, prospect_uuid;
        RETURN;
    END IF;
    
    -- If linking to existing account
    IF link_to_existing_account_id IS NOT NULL THEN
        -- Verify account exists and is in same tenant
        IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = link_to_existing_account_id AND tenant_id = current_tenant_id) THEN
            RETURN QUERY SELECT FALSE, 'Target account not found', NULL::UUID, prospect_uuid;
            RETURN;
        END IF;
        
        -- Update prospect to linked status
        UPDATE public.prospects 
        SET status = 'converted', 
            linked_account_id = link_to_existing_account_id,
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE id = prospect_uuid;
        
        -- Create follow-up task on existing account
        INSERT INTO public.tasks (
            tenant_id, account_id, assigned_to, assigned_by, title, description, 
            category, status, priority, due_date
        ) VALUES (
            current_tenant_id, link_to_existing_account_id, current_user_id, current_user_id,
            'Follow up on linked prospect conversion', 
            'Prospect "' || prospect_record.name || '" was linked to this account. Follow up on next steps.',
            'other', 'pending', 'medium', NOW() + INTERVAL '1 day'
        );
        
        RETURN QUERY SELECT TRUE, 'Prospect linked to existing account', link_to_existing_account_id, prospect_uuid;
        RETURN;
    END IF;
    
    -- Create new account from prospect data
    INSERT INTO public.accounts (
        tenant_id, name, company_type, phone, website, address, city, state, zip_code, 
        notes, assigned_rep_id, stage, is_active
    ) VALUES (
        current_tenant_id, prospect_record.name, 
        COALESCE(prospect_record.company_type, 'Property Management'),
        prospect_record.phone, prospect_record.website, 
        prospect_record.address, prospect_record.city, prospect_record.state, prospect_record.zip_code,
        COALESCE(prospect_record.notes, ''),
        current_user_id, 'Prospect', TRUE
    ) RETURNING id INTO new_account_id;
    
    -- Create account assignment
    INSERT INTO public.account_assignments (tenant_id, account_id, rep_id, assigned_by, is_primary)
    VALUES (current_tenant_id, new_account_id, current_user_id, current_user_id, TRUE);
    
    -- Get manager for approval task
    SELECT manager_id INTO manager_id FROM public.user_profiles WHERE id = current_user_id;
    
    -- Create approval task for manager
    INSERT INTO public.tasks (
        tenant_id, account_id, assigned_to, assigned_by, title, description, 
        category, status, priority, due_date
    ) VALUES (
        current_tenant_id, new_account_id, 
        COALESCE(manager_id, current_user_id), current_user_id,
        'Review new account conversion', 
        'Account "' || prospect_record.name || '" was converted from prospect. Please review and approve.',
        'other', 'pending', 'high', NOW() + INTERVAL '1 day'
    );
    
    -- Update prospect status
    UPDATE public.prospects 
    SET status = 'converted', 
        linked_account_id = new_account_id,
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE id = prospect_uuid;
    
    RETURN QUERY SELECT TRUE, 'Prospect successfully converted to new account', new_account_id, prospect_uuid;
    RETURN;
END;
$$;

-- Function to get prospects with filtering and pagination
CREATE OR REPLACE FUNCTION public.get_prospects_with_details(
    filter_status TEXT[] DEFAULT ARRAY['uncontacted'],
    filter_min_icp_score INTEGER DEFAULT NULL,
    filter_state TEXT DEFAULT NULL,
    filter_city TEXT DEFAULT NULL,
    filter_company_type TEXT DEFAULT NULL,
    filter_assigned_to UUID DEFAULT NULL,
    filter_source TEXT DEFAULT NULL,
    search_term TEXT DEFAULT NULL,
    sort_column TEXT DEFAULT 'icp_fit_score',
    sort_direction TEXT DEFAULT 'desc',
    page_limit INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    domain TEXT,
    phone TEXT,
    city TEXT,
    state TEXT,
    company_type TEXT,
    icp_fit_score INTEGER,
    status TEXT,
    assigned_to UUID,
    assigned_to_name TEXT,
    source TEXT,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    tags TEXT[],
    has_phone BOOLEAN,
    has_website BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    current_tenant_id UUID;
    base_query TEXT;
    where_conditions TEXT[];
    order_clause TEXT;
    final_query TEXT;
BEGIN
    -- Get current user tenant
    SELECT tenant_id INTO current_tenant_id FROM public.user_profiles WHERE id = auth.uid();
    
    -- Base query
    base_query := '
        SELECT 
            p.id, p.name, p.domain, p.phone, p.city, p.state, p.company_type,
            p.icp_fit_score, p.status, p.assigned_to,
            up.full_name as assigned_to_name, p.source, p.last_activity_at, p.created_at, p.tags,
            (p.phone IS NOT NULL) as has_phone,
            (p.website IS NOT NULL) as has_website
        FROM public.prospects p
        LEFT JOIN public.user_profiles up ON p.assigned_to = up.id
        WHERE p.tenant_id = $1';
    
    -- Build where conditions
    where_conditions := ARRAY['TRUE'];
    
    IF filter_status IS NOT NULL AND array_length(filter_status, 1) > 0 THEN
        where_conditions := where_conditions || ARRAY['p.status = ANY($' || (array_length(where_conditions, 1) + 1) || ')'];
    END IF;
    
    IF filter_min_icp_score IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['p.icp_fit_score >= $' || (array_length(where_conditions, 1) + 1)];
    END IF;
    
    IF filter_state IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['LOWER(p.state) = LOWER($' || (array_length(where_conditions, 1) + 1) || ')'];
    END IF;
    
    IF search_term IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['(LOWER(p.name) LIKE LOWER($' || (array_length(where_conditions, 1) + 1) || ') OR LOWER(p.domain) LIKE LOWER($' || (array_length(where_conditions, 1)) || '))'];
    END IF;
    
    -- Build order clause
    order_clause := 'ORDER BY ';
    CASE sort_column
        WHEN 'name' THEN order_clause := order_clause || 'p.name';
        WHEN 'icp_fit_score' THEN order_clause := order_clause || 'p.icp_fit_score';
        WHEN 'last_activity_at' THEN order_clause := order_clause || 'p.last_activity_at';
        WHEN 'created_at' THEN order_clause := order_clause || 'p.created_at';
        ELSE order_clause := order_clause || 'p.icp_fit_score';
    END CASE;
    
    IF sort_direction = 'asc' THEN
        order_clause := order_clause || ' ASC';
    ELSE
        order_clause := order_clause || ' DESC';
    END IF;
    
    -- Add pagination
    order_clause := order_clause || ' LIMIT $' || (array_length(where_conditions, 1) + 1) || ' OFFSET $' || (array_length(where_conditions, 1) + 2);
    
    -- Final query
    final_query := base_query || ' AND ' || array_to_string(where_conditions, ' AND ') || ' ' || order_clause;
    
    -- Execute with parameters (simplified for demo)
    RETURN QUERY EXECUTE final_query 
    USING current_tenant_id, filter_status, page_limit, page_offset;
END;
$$;

-- Mock data for testing prospects functionality
DO $$
DECLARE
    sample_tenant_id UUID;
    sample_user_id UUID;
    prospect1_id UUID := gen_random_uuid();
    prospect2_id UUID := gen_random_uuid();
    prospect3_id UUID := gen_random_uuid();
BEGIN
    -- Get existing tenant and user for mock data
    SELECT id INTO sample_tenant_id FROM public.tenants LIMIT 1;
    SELECT id INTO sample_user_id FROM public.user_profiles WHERE tenant_id = sample_tenant_id LIMIT 1;
    
    IF sample_tenant_id IS NOT NULL AND sample_user_id IS NOT NULL THEN
        -- Insert sample prospects
        INSERT INTO public.prospects (
            id, tenant_id, name, domain, phone, website, city, state, company_type,
            employee_count, property_count_estimate, sqft_estimate, building_types,
            icp_fit_score, source, status, created_by, notes, tags
        ) VALUES
        (prospect1_id, sample_tenant_id, 'Summit Commercial Properties', 'summitcommercial.com', 
         '(555) 123-4567', 'https://summitcommercial.com', 'Denver', 'CO', 'Property Management',
         45, 25, 150000, ARRAY['Commercial Office', 'Retail'], 85, 'Web Research', 'uncontacted', 
         sample_user_id, 'Large property management company focusing on commercial real estate in Denver metro area.', 
         ARRAY['high-value', 'commercial']),
        
        (prospect2_id, sample_tenant_id, 'Metro Industrial Group', 'metroindustrial.net', 
         '(555) 987-6543', 'https://metroindustrial.net', 'Phoenix', 'AZ', 'Developer',
         78, 12, 200000, ARRAY['Industrial', 'Warehouse'], 90, 'Trade Show', 'researching', 
         sample_user_id, 'Industrial developer with focus on logistics and manufacturing facilities.', 
         ARRAY['high-value', 'industrial', 'warm-lead']),
        
        (prospect3_id, sample_tenant_id, 'Coastal Healthcare REIT', NULL, 
         '(555) 456-7890', 'https://coastalhealthcarereit.com', 'San Diego', 'CA', 'REIT/Institutional Investor',
         120, 8, 300000, ARRAY['Healthcare'], 95, 'Referral', 'attempted', 
         sample_user_id, 'Healthcare-focused REIT with premium medical facilities across California.', 
         ARRAY['enterprise', 'healthcare', 'hot-lead']);
        
        RAISE NOTICE 'Sample prospects data inserted successfully for tenant: %', sample_tenant_id;
    ELSE
        RAISE NOTICE 'No existing tenant or user found. Sample prospects data not inserted.';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting prospects sample data: %', SQLERRM;
END $$;

-- Add updated_at trigger for prospects
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER handle_prospects_updated_at
    BEFORE UPDATE ON public.prospects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();