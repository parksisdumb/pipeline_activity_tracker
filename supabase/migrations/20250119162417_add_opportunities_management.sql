-- Location: supabase/migrations/20250119162417_add_opportunities_management.sql
-- Schema Analysis: Existing CRM schema with accounts, properties, user_profiles, tenants
-- Integration Type: NEW MODULE - Adding opportunities management
-- Dependencies: accounts, properties, user_profiles, tenants tables

-- 1. Create opportunity types and stages enums
CREATE TYPE public.opportunity_type AS ENUM (
  'new_construction',
  'inspection', 
  'repair',
  'maintenance',
  're_roof'
);

CREATE TYPE public.opportunity_stage AS ENUM (
  'identified',
  'qualified',
  'proposal_sent',
  'negotiation',
  'won',
  'lost'
);

-- 2. Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  opportunity_type public.opportunity_type NOT NULL,
  stage public.opportunity_stage DEFAULT 'identified'::public.opportunity_stage,
  bid_value DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  expected_close_date DATE,
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT opportunities_valid_probability CHECK (probability IS NULL OR (probability >= 0 AND probability <= 100)),
  CONSTRAINT opportunities_positive_bid_value CHECK (bid_value IS NULL OR bid_value >= 0)
);

-- 3. Create indexes for performance
CREATE INDEX idx_opportunities_account_id ON public.opportunities(account_id);
CREATE INDEX idx_opportunities_property_id ON public.opportunities(property_id);
CREATE INDEX idx_opportunities_type ON public.opportunities(opportunity_type);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunities_assigned_to ON public.opportunities(assigned_to);
CREATE INDEX idx_opportunities_tenant_id ON public.opportunities(tenant_id);
CREATE INDEX idx_opportunities_created_by ON public.opportunities(created_by);
CREATE INDEX idx_opportunities_expected_close_date ON public.opportunities(expected_close_date);
CREATE INDEX idx_opportunities_bid_value ON public.opportunities(bid_value);
CREATE INDEX idx_opportunities_stage_date ON public.opportunities(stage, expected_close_date);

-- 4. Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- 5. Create tenant isolation trigger function
CREATE OR REPLACE FUNCTION public.set_opportunity_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.tenant_id = get_user_tenant_id();
  RETURN NEW;
END;
$$;

-- 6. Create tenant isolation trigger
CREATE TRIGGER trigger_set_opportunity_tenant_id
  BEFORE INSERT ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_tenant_id();

-- 7. Create updated_at trigger
CREATE TRIGGER handle_updated_at_opportunities
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 8. Create tenant consistency validation trigger
CREATE TRIGGER trigger_validate_opportunities_tenant_consistency
  BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION validate_tenant_consistency();

-- 9. RLS Policies using Pattern 2 (Simple User Ownership) and Pattern 6 (Role-Based Access)

-- Create role-based access function using auth.users metadata (Pattern 6A)
CREATE OR REPLACE FUNCTION public.user_can_access_opportunities()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.is_active = true
    AND user_can_access_tenant_data(up.tenant_id)
)
$$;

-- Super admin access policy
CREATE POLICY "super_admin_full_access_opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (is_super_admin_from_auth())
WITH CHECK (is_super_admin_from_auth());

-- Tenant users access policy
CREATE POLICY "tenant_users_opportunities_access"
ON public.opportunities
FOR ALL
TO authenticated
USING (user_can_access_opportunities() AND user_can_access_tenant_data(tenant_id))
WITH CHECK (user_can_access_opportunities() AND (tenant_id = get_user_tenant_id() OR is_super_admin_from_auth()));

-- 10. Mock data for testing
DO $$
DECLARE
    existing_account_id UUID;
    existing_property_id UUID;
    existing_user_id UUID;
    existing_tenant_id UUID;
    opp1_id UUID := gen_random_uuid();
    opp2_id UUID := gen_random_uuid();
    opp3_id UUID := gen_random_uuid();
BEGIN
    -- Get existing data IDs (don't create new ones)
    SELECT id INTO existing_account_id FROM public.accounts LIMIT 1;
    SELECT id INTO existing_property_id FROM public.properties LIMIT 1;
    SELECT id INTO existing_user_id FROM public.user_profiles WHERE role IN ('rep', 'manager', 'admin') LIMIT 1;
    SELECT tenant_id INTO existing_tenant_id FROM public.user_profiles WHERE id = existing_user_id;

    -- Only insert mock data if we have existing accounts and properties
    IF existing_account_id IS NOT NULL AND existing_property_id IS NOT NULL AND existing_user_id IS NOT NULL THEN
        -- Insert sample opportunities
        INSERT INTO public.opportunities (
            id, name, account_id, property_id, opportunity_type, stage, 
            bid_value, expected_close_date, probability, description, 
            created_by, assigned_to, tenant_id
        ) VALUES
            (
                opp1_id,
                'Westfield Industrial Complex Re-roof Project',
                existing_account_id,
                existing_property_id,
                're_roof'::public.opportunity_type,
                'qualified'::public.opportunity_stage,
                485000.00,
                '2025-03-15',
                75,
                'Complete re-roofing project for 125,000 sq ft industrial facility. TPO membrane replacement with 20-year warranty.',
                existing_user_id,
                existing_user_id,
                existing_tenant_id
            ),
            (
                opp2_id,
                'Metro Distribution Center Maintenance Contract',
                existing_account_id,
                existing_property_id,
                'maintenance'::public.opportunity_type,
                'proposal_sent'::public.opportunity_stage,
                125000.00,
                '2025-02-28',
                60,
                'Annual maintenance contract for 200,000 sq ft warehouse facility. Includes bi-annual inspections and minor repairs.',
                existing_user_id,
                existing_user_id,
                existing_tenant_id
            ),
            (
                opp3_id,
                'Pinnacle Development New Construction',
                existing_account_id,
                existing_property_id,
                'new_construction'::public.opportunity_type,
                'identified'::public.opportunity_stage,
                750000.00,
                '2025-06-30',
                25,
                'New commercial office building roofing system. Mixed-use development requiring high-performance roofing solution.',
                existing_user_id,
                existing_user_id,
                existing_tenant_id
            );

        RAISE NOTICE 'Successfully inserted % sample opportunities', 3;
    ELSE
        RAISE NOTICE 'Skipping mock data - missing required accounts, properties, or users. Run after setting up accounts and properties.';
    END IF;
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key constraint prevents opportunity creation: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint prevents opportunity creation: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error during opportunity creation: %', SQLERRM;
END $$;

-- 11. Create helper functions for opportunities management

-- Function to get opportunities with account and property details
CREATE OR REPLACE FUNCTION public.get_opportunities_with_details(
    filter_stage TEXT DEFAULT NULL,
    filter_type TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    opportunity_type TEXT,
    stage TEXT,
    bid_value DECIMAL,
    currency TEXT,
    expected_close_date DATE,
    probability INTEGER,
    description TEXT,
    account_name TEXT,
    account_id UUID,
    property_name TEXT,
    property_id UUID,
    assigned_to_name TEXT,
    assigned_to_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    o.id,
    o.name,
    o.opportunity_type::TEXT,
    o.stage::TEXT,
    o.bid_value,
    o.currency,
    o.expected_close_date,
    o.probability,
    o.description,
    a.name as account_name,
    a.id as account_id,
    p.name as property_name,
    p.id as property_id,
    up.full_name as assigned_to_name,
    up.id as assigned_to_id,
    o.created_at,
    o.updated_at
FROM public.opportunities o
LEFT JOIN public.accounts a ON o.account_id = a.id
LEFT JOIN public.properties p ON o.property_id = p.id
LEFT JOIN public.user_profiles up ON o.assigned_to = up.id
WHERE 
    (filter_stage IS NULL OR o.stage::TEXT = filter_stage)
    AND (filter_type IS NULL OR o.opportunity_type::TEXT = filter_type)
    AND user_can_access_tenant_data(o.tenant_id)
ORDER BY o.created_at DESC
LIMIT limit_count
OFFSET offset_count;
$$;

-- Function to get opportunity pipeline metrics
CREATE OR REPLACE FUNCTION public.get_opportunity_pipeline_metrics()
RETURNS TABLE(
    stage TEXT,
    count_opportunities BIGINT,
    total_value DECIMAL,
    avg_probability DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    o.stage::TEXT,
    COUNT(*) as count_opportunities,
    COALESCE(SUM(o.bid_value), 0) as total_value,
    COALESCE(ROUND(AVG(o.probability), 2), 0) as avg_probability
FROM public.opportunities o
WHERE user_can_access_tenant_data(o.tenant_id)
GROUP BY o.stage
ORDER BY 
    CASE o.stage
        WHEN 'identified' THEN 1
        WHEN 'qualified' THEN 2
        WHEN 'proposal_sent' THEN 3
        WHEN 'negotiation' THEN 4
        WHEN 'won' THEN 5
        WHEN 'lost' THEN 6
        ELSE 7
    END;
$$;

-- Function to update opportunity stage with validation
CREATE OR REPLACE FUNCTION public.update_opportunity_stage(
    opportunity_uuid UUID,
    new_stage TEXT,
    stage_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    opportunity_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_tenant UUID;
    opportunity_tenant UUID;
BEGIN
    -- Get current user's tenant
    current_user_tenant := get_user_tenant_id();
    
    -- Get opportunity's tenant
    SELECT tenant_id INTO opportunity_tenant 
    FROM public.opportunities 
    WHERE id = opportunity_uuid;
    
    -- Validate access
    IF opportunity_tenant IS NULL THEN
        RETURN QUERY SELECT false, 'Opportunity not found'::TEXT, opportunity_uuid;
        RETURN;
    END IF;
    
    IF NOT user_can_access_tenant_data(opportunity_tenant) THEN
        RETURN QUERY SELECT false, 'Access denied'::TEXT, opportunity_uuid;
        RETURN;
    END IF;
    
    -- Update the opportunity
    UPDATE public.opportunities 
    SET 
        stage = new_stage::public.opportunity_stage,
        notes = CASE 
            WHEN stage_notes IS NOT NULL THEN 
                COALESCE(notes || E'\n\n', '') || 
                'Stage updated to ' || new_stage || ' on ' || CURRENT_DATE::TEXT ||
                CASE WHEN stage_notes != '' THEN ': ' || stage_notes ELSE '' END
            ELSE notes
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = opportunity_uuid 
    AND user_can_access_tenant_data(tenant_id);
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Opportunity stage updated successfully'::TEXT, opportunity_uuid;
    ELSE
        RETURN QUERY SELECT false, 'Failed to update opportunity stage'::TEXT, opportunity_uuid;
    END IF;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN QUERY SELECT false, 'Invalid stage value provided'::TEXT, opportunity_uuid;
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'An error occurred while updating opportunity stage'::TEXT, opportunity_uuid;
END;
$$;