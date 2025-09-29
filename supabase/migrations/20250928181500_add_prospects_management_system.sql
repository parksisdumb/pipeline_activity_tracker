-- Location: supabase/migrations/20250928181500_add_prospects_management_system.sql
-- Schema Analysis: Existing CRM system with accounts, contacts, activities, tasks, user_profiles, and tenants
-- Integration Type: ADDITIVE - New prospects module
-- Dependencies: accounts, user_profiles, tenants tables

-- 1. Create prospects table for uncontacted ICP companies (staging area)
CREATE TABLE public.prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Company Information
    name TEXT NOT NULL,
    domain TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    
    -- Company Details
    company_type public.company_type, -- Use existing enum, no need to create new one
    employee_count INTEGER,
    property_count_estimate INTEGER,
    sqft_estimate INTEGER,
    building_types TEXT[] DEFAULT '{}',
    
    -- Prospecting Data
    icp_fit_score INTEGER CHECK (icp_fit_score BETWEEN 0 AND 100),
    source TEXT, -- e.g., event, list import, referral, web scrape
    status TEXT NOT NULL DEFAULT 'uncontacted', -- uncontacted, researching, attempted, contacted, converted, disqualified
    
    -- Assignment & Activity
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    last_activity_at TIMESTAMPTZ,
    
    -- Additional Data
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    dedupe_keys JSONB DEFAULT '{}'::JSONB, -- normalized_name, normalized_domain, phone for deduplication
    
    -- Conversion Tracking
    linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create helpful indexes for filters and pagination
CREATE INDEX idx_prospects_tenant_status_score ON public.prospects(tenant_id, status, icp_fit_score DESC);
CREATE INDEX idx_prospects_tenant_name ON public.prospects(tenant_id, LOWER(name));
CREATE INDEX idx_prospects_tenant_city_state ON public.prospects(tenant_id, LOWER(city), LOWER(state));
CREATE INDEX idx_prospects_assigned_to ON public.prospects(tenant_id, assigned_to);
CREATE INDEX idx_prospects_created_by ON public.prospects(tenant_id, created_by);
CREATE INDEX idx_prospects_source ON public.prospects(tenant_id, source);
CREATE INDEX idx_prospects_company_type ON public.prospects(tenant_id, company_type);

-- 3. Optional dedupe guard for active (pre-conversion) records
CREATE UNIQUE INDEX uidx_prospects_tenant_name_active 
ON public.prospects(tenant_id, LOWER(name)) 
WHERE status IN ('uncontacted','researching','attempted','contacted');

-- 4. Enable RLS for prospects table
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- 5. Helper functions for deduplication and conversion
CREATE OR REPLACE FUNCTION public.find_duplicate_accounts_for_prospect(
    prospect_tenant_id UUID,
    prospect_name TEXT,
    prospect_domain TEXT DEFAULT NULL,
    prospect_phone TEXT DEFAULT NULL
)
RETURNS TABLE(
    account_id UUID,
    account_name TEXT,
    match_type TEXT,
    similarity_score NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        a.id as account_id,
        a.name as account_name,
        CASE 
            WHEN prospect_domain IS NOT NULL AND a.website ILIKE '%' || prospect_domain || '%' THEN 'domain'
            WHEN prospect_phone IS NOT NULL AND REGEXP_REPLACE(a.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(prospect_phone, '[^0-9]', '', 'g') THEN 'phone'
            WHEN SIMILARITY(LOWER(a.name), LOWER(prospect_name)) > 0.7 THEN 'name_similarity'
            ELSE 'fuzzy'
        END as match_type,
        SIMILARITY(LOWER(a.name), LOWER(prospect_name)) as similarity_score
    FROM public.accounts a
    WHERE a.tenant_id = prospect_tenant_id
    AND (
        (prospect_domain IS NOT NULL AND a.website ILIKE '%' || prospect_domain || '%')
        OR (prospect_phone IS NOT NULL AND REGEXP_REPLACE(a.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(prospect_phone, '[^0-9]', '', 'g'))
        OR (SIMILARITY(LOWER(a.name), LOWER(prospect_name)) > 0.7)
    )
    ORDER BY similarity_score DESC, match_type
    LIMIT 10;
$$;

-- 6. Function to convert prospect to account with full workflow
CREATE OR REPLACE FUNCTION public.convert_prospect_to_account(
    prospect_id UUID,
    create_new_account BOOLEAN DEFAULT true,
    link_to_existing_account_id UUID DEFAULT NULL,
    conversion_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    new_account_id UUID,
    created_task_id UUID
)
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    prospect_record public.prospects%ROWTYPE;
    new_account_uuid UUID;
    current_user_id UUID;
    manager_id UUID;
    task_uuid UUID;
    current_tenant_id UUID;
BEGIN
    -- Get current user and tenant
    current_user_id := auth.uid();
    SELECT tenant_id INTO current_tenant_id FROM public.user_profiles WHERE id = current_user_id;
    
    IF current_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, 'User not found or invalid session', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- Get prospect record
    SELECT * INTO prospect_record 
    FROM public.prospects 
    WHERE id = prospect_id AND tenant_id = current_tenant_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Prospect not found or access denied', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- Check if already converted
    IF prospect_record.status = 'converted' THEN
        RETURN QUERY SELECT false, 'Prospect already converted', prospect_record.linked_account_id, NULL::UUID;
        RETURN;
    END IF;

    BEGIN
        IF create_new_account AND link_to_existing_account_id IS NULL THEN
            -- Create new account
            INSERT INTO public.accounts (
                tenant_id, name, company_type, phone, website, address, 
                city, state, zip_code, notes, assigned_rep_id
            ) VALUES (
                current_tenant_id,
                prospect_record.name,
                prospect_record.company_type,
                prospect_record.phone,
                prospect_record.website,
                prospect_record.address,
                prospect_record.city,
                prospect_record.state,
                prospect_record.zip_code,
                COALESCE(conversion_notes, prospect_record.notes),
                current_user_id
            )
            RETURNING id INTO new_account_uuid;

            -- Create account assignment
            INSERT INTO public.account_assignments (
                account_id, rep_id, is_primary, assigned_by, notes
            ) VALUES (
                new_account_uuid, current_user_id, true, current_user_id, 
                'Assigned during prospect conversion'
            );

        ELSIF NOT create_new_account AND link_to_existing_account_id IS NOT NULL THEN
            -- Link to existing account
            new_account_uuid := link_to_existing_account_id;
            
            -- Verify account exists and belongs to tenant
            IF NOT EXISTS (
                SELECT 1 FROM public.accounts 
                WHERE id = link_to_existing_account_id AND tenant_id = current_tenant_id
            ) THEN
                RETURN QUERY SELECT false, 'Target account not found or access denied', NULL::UUID, NULL::UUID;
                RETURN;
            END IF;

        ELSE
            RETURN QUERY SELECT false, 'Invalid conversion parameters', NULL::UUID, NULL::UUID;
            RETURN;
        END IF;

        -- Get manager for approval task
        SELECT manager_id INTO manager_id 
        FROM public.user_profiles 
        WHERE id = current_user_id;

        -- Create review task for manager (or assigned user if no manager)
        INSERT INTO public.tasks (
            tenant_id,
            title,
            description,
            category,
            priority,
            status,
            assigned_to,
            assigned_by,
            account_id,
            due_date
        ) VALUES (
            current_tenant_id,
            'Review new account conversion: ' || prospect_record.name,
            CASE 
                WHEN create_new_account THEN 'New account created from prospect conversion. Please review and approve.'
                ELSE 'Prospect linked to existing account. Please review connection.'
            END,
            'other'::public.task_category,
            'medium'::public.task_priority,
            'pending'::public.task_status,
            COALESCE(manager_id, current_user_id),
            current_user_id,
            new_account_uuid,
            NOW() + INTERVAL '1 day'
        )
        RETURNING id INTO task_uuid;

        -- Update prospect status to converted
        UPDATE public.prospects 
        SET 
            status = 'converted',
            linked_account_id = new_account_uuid,
            last_activity_at = NOW(),
            updated_at = NOW(),
            notes = COALESCE(prospect_record.notes || E'\n\nConverted: ' || conversion_notes, prospect_record.notes, 'Converted to account')
        WHERE id = prospect_id;

        RETURN QUERY SELECT 
            true,
            CASE 
                WHEN create_new_account THEN 'Successfully created new account from prospect'
                ELSE 'Successfully linked prospect to existing account'
            END,
            new_account_uuid,
            task_uuid;

    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't expose internal details
            RAISE WARNING 'Prospect conversion error: %', SQLERRM;
            RETURN QUERY SELECT false, 'Conversion failed. Please try again or contact support.', NULL::UUID, NULL::UUID;
    END;
END;
$$;

-- 7. RLS Policies using Pattern 2 (Simple User Ownership) and tenant isolation
CREATE POLICY "tenant_users_access_prospects"
ON public.prospects
FOR ALL
TO authenticated
USING (
    tenant_id IN (
        SELECT up.tenant_id 
        FROM public.user_profiles up 
        WHERE up.id = auth.uid()
    )
)
WITH CHECK (
    tenant_id IN (
        SELECT up.tenant_id 
        FROM public.user_profiles up 
        WHERE up.id = auth.uid()
    )
);

-- 8. Function to get prospects with filtering and pagination
CREATE OR REPLACE FUNCTION public.get_prospects_with_filters(
    filter_status TEXT[] DEFAULT ARRAY['uncontacted'],
    min_icp_score INTEGER DEFAULT 0,
    filter_state TEXT DEFAULT NULL,
    filter_city TEXT DEFAULT NULL,
    filter_source TEXT DEFAULT NULL,
    assigned_filter TEXT DEFAULT 'any', -- 'me', 'unassigned', 'any'
    search_term TEXT DEFAULT NULL,
    sort_by TEXT DEFAULT 'icp_fit_score',
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
    source TEXT,
    status TEXT,
    assigned_to_name TEXT,
    assigned_to_id UUID,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    tags TEXT[],
    total_count BIGINT
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    current_tenant_id UUID;
    base_query TEXT;
    count_query TEXT;
    where_conditions TEXT[] DEFAULT '{}';
    order_clause TEXT;
    final_query TEXT;
    total_records BIGINT;
BEGIN
    -- Get current user and tenant
    current_user_id := auth.uid();
    SELECT tenant_id INTO current_tenant_id FROM public.user_profiles WHERE id = current_user_id;
    
    IF current_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- Build WHERE conditions
    where_conditions := where_conditions || ('p.tenant_id = ' || quote_literal(current_tenant_id));
    
    IF filter_status IS NOT NULL AND array_length(filter_status, 1) > 0 THEN
        where_conditions := where_conditions || ('p.status = ANY(' || quote_literal(filter_status) || ')');
    END IF;
    
    IF min_icp_score > 0 THEN
        where_conditions := where_conditions || ('p.icp_fit_score >= ' || min_icp_score);
    END IF;
    
    IF filter_state IS NOT NULL THEN
        where_conditions := where_conditions || ('LOWER(p.state) = ' || quote_literal(LOWER(filter_state)));
    END IF;
    
    IF filter_city IS NOT NULL THEN
        where_conditions := where_conditions || ('LOWER(p.city) = ' || quote_literal(LOWER(filter_city)));
    END IF;
    
    IF filter_source IS NOT NULL THEN
        where_conditions := where_conditions || ('p.source = ' || quote_literal(filter_source));
    END IF;
    
    IF assigned_filter = 'me' THEN
        where_conditions := where_conditions || ('p.assigned_to = ' || quote_literal(current_user_id));
    ELSIF assigned_filter = 'unassigned' THEN
        where_conditions := where_conditions || ('p.assigned_to IS NULL');
    END IF;
    
    IF search_term IS NOT NULL AND LENGTH(search_term) > 0 THEN
        where_conditions := where_conditions || ('(LOWER(p.name) ILIKE ' || quote_literal('%' || LOWER(search_term) || '%') || 
                                                 ' OR LOWER(p.domain) ILIKE ' || quote_literal('%' || LOWER(search_term) || '%') || ')');
    END IF;

    -- Build ORDER BY clause
    IF sort_by = 'name' THEN
        order_clause := 'ORDER BY LOWER(p.name) ' || CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END;
    ELSIF sort_by = 'created_at' THEN
        order_clause := 'ORDER BY p.created_at ' || CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END;
    ELSIF sort_by = 'last_activity_at' THEN
        order_clause := 'ORDER BY p.last_activity_at ' || CASE WHEN sort_direction = 'desc' THEN 'DESC NULLS LAST' ELSE 'ASC NULLS LAST' END;
    ELSE -- default to icp_fit_score
        order_clause := 'ORDER BY p.icp_fit_score ' || CASE WHEN sort_direction = 'desc' THEN 'DESC NULLS LAST' ELSE 'ASC NULLS LAST' END;
    END IF;

    -- Get total count first
    count_query := 'SELECT COUNT(*) FROM public.prospects p LEFT JOIN public.user_profiles up ON p.assigned_to = up.id WHERE ' || 
                   array_to_string(where_conditions, ' AND ');
    
    EXECUTE count_query INTO total_records;

    -- Build and execute main query
    base_query := 'SELECT p.id, p.name, p.domain, p.phone, p.city, p.state, p.company_type::TEXT, ' ||
                  'p.icp_fit_score, p.source, p.status, up.full_name, p.assigned_to, ' ||
                  'p.last_activity_at, p.created_at, p.tags, ' || total_records || '::BIGINT ' ||
                  'FROM public.prospects p ' ||
                  'LEFT JOIN public.user_profiles up ON p.assigned_to = up.id ' ||
                  'WHERE ' || array_to_string(where_conditions, ' AND ') || ' ' ||
                  order_clause || ' ' ||
                  'LIMIT ' || page_limit || ' OFFSET ' || page_offset;

    RETURN QUERY EXECUTE base_query;
END;
$$;

-- 9. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at_prospects()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER handle_updated_at_prospects
    BEFORE UPDATE ON public.prospects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_prospects();

-- 10. Sample data for testing (reference existing tenant and users)
DO $$
DECLARE
    test_tenant_id UUID;
    test_user_id UUID;
    prospect1_id UUID := gen_random_uuid();
    prospect2_id UUID := gen_random_uuid();
    prospect3_id UUID := gen_random_uuid();
BEGIN
    -- Get existing tenant and user for sample data
    SELECT id INTO test_tenant_id FROM public.tenants LIMIT 1;
    SELECT id INTO test_user_id FROM public.user_profiles WHERE tenant_id = test_tenant_id LIMIT 1;

    IF test_tenant_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        INSERT INTO public.prospects (
            id, tenant_id, name, domain, phone, website, address, city, state, zip_code,
            company_type, employee_count, property_count_estimate, sqft_estimate, building_types,
            icp_fit_score, source, status, created_by, tags, notes
        ) VALUES
        (
            prospect1_id, test_tenant_id, 'Metro Real Estate Holdings', 'metrorealestate.com', '(555) 123-4567',
            'https://metrorealestate.com', '123 Business Plaza', 'Atlanta', 'GA', '30309',
            'Property Management'::public.company_type, 50, 25, 500000, 
            ARRAY['Commercial Office', 'Retail']::TEXT[],
            85, 'trade_show', 'uncontacted', test_user_id,
            ARRAY['high_priority', 'southeast']::TEXT[],
            'Large property management company with multiple commercial properties in metro Atlanta area'
        ),
        (
            prospect2_id, test_tenant_id, 'Pinnacle Construction Group', 'pinnacleconstructiongroup.com', '(555) 987-6543',
            'https://pinnacleconstructiongroup.com', '456 Industrial Blvd', 'Houston', 'TX', '77024',
            'General Contractor'::public.company_type, 75, 10, 300000,
            ARRAY['Industrial', 'Warehouse']::TEXT[],
            78, 'referral', 'researching', test_user_id,
            ARRAY['texas_region', 'construction']::TEXT[],
            'Major construction company specializing in industrial and warehouse projects'
        ),
        (
            prospect3_id, test_tenant_id, 'Coastal Development Partners', NULL, '(555) 555-0123',
            NULL, '789 Waterfront Dr', 'Miami', 'FL', '33101',
            'Developer'::public.company_type, 30, 8, 200000,
            ARRAY['Multifamily', 'Commercial Office']::TEXT[],
            92, 'web_scrape', 'uncontacted', NULL,
            ARRAY['florida', 'high_value']::TEXT[],
            'High-potential developer focusing on waterfront mixed-use developments'
        );

        RAISE NOTICE 'Successfully inserted % sample prospects', 3;
    ELSE
        RAISE NOTICE 'No existing tenant or user found - skipping sample data';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting sample prospects: %', SQLERRM;
END $$;