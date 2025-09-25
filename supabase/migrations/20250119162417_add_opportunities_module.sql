-- Schema Analysis: Existing CRM system with accounts, properties, user_profiles, and tenants
-- Integration Type: NEW_MODULE - Creating opportunities table for sales pipeline management
-- Dependencies: accounts, properties, user_profiles, tenants (all exist)

-- 1. Create opportunity type enum
CREATE TYPE public.opportunity_type AS ENUM (
    'New Construction',
    'Inspection',
    'Repair',
    'Maintenance',
    'Re-roof'
);

-- 2. Create opportunity stage enum
CREATE TYPE public.opportunity_stage AS ENUM (
    'Prospecting',
    'Qualification',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost'
);

-- 3. Create opportunities table
CREATE TABLE public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    opportunity_type public.opportunity_type NOT NULL,
    stage public.opportunity_stage DEFAULT 'Prospecting'::public.opportunity_stage,
    bid_value DECIMAL(12,2),
    probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    assigned_rep_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    competitive_info TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure either account or property is specified
    CONSTRAINT opportunities_entity_check CHECK (
        (account_id IS NOT NULL AND property_id IS NULL) OR
        (account_id IS NULL AND property_id IS NOT NULL)
    )
);

-- 4. Create indexes for performance
CREATE INDEX idx_opportunities_tenant_id ON public.opportunities(tenant_id);
CREATE INDEX idx_opportunities_account_id ON public.opportunities(account_id);
CREATE INDEX idx_opportunities_property_id ON public.opportunities(property_id);
CREATE INDEX idx_opportunities_assigned_rep_id ON public.opportunities(assigned_rep_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunities_type ON public.opportunities(opportunity_type);
CREATE INDEX idx_opportunities_expected_close_date ON public.opportunities(expected_close_date);

-- 5. Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- 6. Create tenant isolation trigger function
CREATE OR REPLACE FUNCTION public.set_opportunity_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Get tenant_id from account or property
    IF NEW.account_id IS NOT NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.accounts
        WHERE id = NEW.account_id;
    ELSIF NEW.property_id IS NOT NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.properties
        WHERE id = NEW.property_id;
    END IF;
    
    -- If no tenant found, get from current user
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.user_profiles
        WHERE id = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;

-- 7. Add tenant assignment trigger
CREATE TRIGGER trigger_set_opportunity_tenant_id
    BEFORE INSERT ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_opportunity_tenant_id();

-- 8. Add updated_at trigger
CREATE TRIGGER handle_updated_at_opportunities
    BEFORE UPDATE ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 9. Add tenant consistency validation trigger
CREATE TRIGGER trigger_validate_opportunities_tenant_consistency
    BEFORE INSERT OR UPDATE ON public.opportunities
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_consistency();

-- 10. RLS Policies using Pattern 2 (Simple User Ownership)
CREATE POLICY "super_admin_full_access_opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (is_super_admin_from_auth())
WITH CHECK (is_super_admin_from_auth());

CREATE POLICY "tenant_users_opportunities_access"
ON public.opportunities
FOR ALL
TO public
USING (
    user_can_access_tenant_data(tenant_id) OR 
    assigned_rep_id = auth.uid()
)
WITH CHECK (
    (tenant_id = get_user_tenant_id()) OR 
    is_super_admin_from_auth()
);

-- 11. Mock data for testing
DO $$
DECLARE
    existing_account_id UUID;
    existing_property_id UUID;
    existing_rep_id UUID;
    existing_tenant_id UUID;
    opp1_id UUID := gen_random_uuid();
    opp2_id UUID := gen_random_uuid();
    opp3_id UUID := gen_random_uuid();
BEGIN
    -- Get existing records for relationships
    SELECT id, tenant_id INTO existing_account_id, existing_tenant_id
    FROM public.accounts
    LIMIT 1;
    
    SELECT id INTO existing_property_id
    FROM public.properties
    WHERE tenant_id = existing_tenant_id
    LIMIT 1;
    
    SELECT id INTO existing_rep_id
    FROM public.user_profiles
    WHERE tenant_id = existing_tenant_id AND role IN ('rep', 'manager')
    LIMIT 1;
    
    -- Create sample opportunities if data exists
    IF existing_account_id IS NOT NULL AND existing_tenant_id IS NOT NULL THEN
        INSERT INTO public.opportunities (
            id, name, opportunity_type, stage, bid_value, probability, 
            expected_close_date, account_id, assigned_rep_id, tenant_id, notes
        ) VALUES
        (
            opp1_id,
            'Office Building Roof Replacement',
            'Re-roof'::public.opportunity_type,
            'Proposal'::public.opportunity_stage,
            125000.00,
            75,
            CURRENT_DATE + INTERVAL '30 days',
            existing_account_id,
            existing_rep_id,
            existing_tenant_id,
            'Large commercial re-roofing project. Customer interested in TPO membrane system.'
        ),
        (
            opp2_id,
            'Warehouse Maintenance Contract',
            'Maintenance'::public.opportunity_type,
            'Negotiation'::public.opportunity_stage,
            35000.00,
            85,
            CURRENT_DATE + INTERVAL '45 days',
            existing_account_id,
            existing_rep_id,
            existing_tenant_id,
            'Annual maintenance contract for industrial facility.'
        );
        
        -- Create property-based opportunity if property exists
        IF existing_property_id IS NOT NULL THEN
            INSERT INTO public.opportunities (
                id, name, opportunity_type, stage, bid_value, probability,
                expected_close_date, property_id, assigned_rep_id, tenant_id, notes
            ) VALUES (
                opp3_id,
                'Property Inspection Services',
                'Inspection'::public.opportunity_type,
                'Qualification'::public.opportunity_stage,
                5500.00,
                60,
                CURRENT_DATE + INTERVAL '15 days',
                existing_property_id,
                existing_rep_id,
                existing_tenant_id,
                'Comprehensive roof inspection for property management company.'
            );
        END IF;
        
        RAISE NOTICE 'Created sample opportunities for testing';
    ELSE
        RAISE NOTICE 'No existing accounts/tenants found - skipping mock data creation';
    END IF;

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error creating opportunities: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error creating opportunities: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error creating opportunities: %', SQLERRM;
END $$;