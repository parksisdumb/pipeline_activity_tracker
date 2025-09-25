-- Schema Analysis: CRM system with existing manager hierarchy (manager_id in user_profiles), account management
-- Integration Type: Extension - Adding multiple reps per account functionality while preserving existing structure
-- Dependencies: user_profiles, accounts, tenants tables

-- Create junction table for many-to-many relationship between accounts and reps
CREATE TABLE public.account_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    rep_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    UNIQUE(account_id, rep_id)
);

-- Create indexes for performance
CREATE INDEX idx_account_assignments_account_id ON public.account_assignments(account_id);
CREATE INDEX idx_account_assignments_rep_id ON public.account_assignments(rep_id);
CREATE INDEX idx_account_assignments_assigned_by ON public.account_assignments(assigned_by);
CREATE INDEX idx_account_assignments_primary ON public.account_assignments(account_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.account_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy for account assignments using tenant-based access
CREATE POLICY "tenant_users_manage_account_assignments"
ON public.account_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.accounts a
        JOIN public.user_profiles up ON a.tenant_id = up.tenant_id
        WHERE a.id = account_assignments.account_id 
        AND up.id = auth.uid()
        AND up.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.accounts a
        JOIN public.user_profiles up ON a.tenant_id = up.tenant_id
        WHERE a.id = account_assignments.account_id 
        AND up.id = auth.uid()
        AND up.is_active = true
    )
);

-- Function to get all reps assigned to an account
CREATE OR REPLACE FUNCTION public.get_account_reps(account_uuid UUID)
RETURNS TABLE(
    rep_id UUID,
    rep_name TEXT,
    rep_email TEXT,
    is_primary BOOLEAN,
    assigned_at TIMESTAMPTZ,
    assigned_by_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    up.id as rep_id,
    up.full_name as rep_name,
    up.email as rep_email,
    aa.is_primary,
    aa.assigned_at,
    assignee.full_name as assigned_by_name
FROM public.account_assignments aa
JOIN public.user_profiles up ON aa.rep_id = up.id
LEFT JOIN public.user_profiles assignee ON aa.assigned_by = assignee.id
WHERE aa.account_id = account_uuid
AND up.is_active = true
ORDER BY aa.is_primary DESC, aa.assigned_at ASC;
$$;

-- Function to check if a manager can manage assignments for an account
CREATE OR REPLACE FUNCTION public.manager_can_manage_account_assignments(manager_uuid UUID, account_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.accounts a
    JOIN public.user_profiles manager ON a.tenant_id = manager.tenant_id
    WHERE a.id = account_uuid
    AND manager.id = manager_uuid
    AND manager.role = 'manager'::public.user_role
    AND manager.is_active = true
);
$$;

-- Function to assign multiple reps to an account (manager functionality)
CREATE OR REPLACE FUNCTION public.assign_reps_to_account(
    account_uuid UUID,
    rep_ids UUID[],
    primary_rep_id UUID DEFAULT NULL,
    manager_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rep_id UUID;
    manager_tenant UUID;
    account_tenant UUID;
BEGIN
    -- Verify manager can manage this account
    IF NOT public.manager_can_manage_account_assignments(manager_uuid, account_uuid) THEN
        RETURN QUERY SELECT false::BOOLEAN, 'Manager does not have permission to manage assignments for this account'::TEXT;
        RETURN;
    END IF;

    -- Get manager and account tenant IDs for validation
    SELECT up.tenant_id INTO manager_tenant 
    FROM public.user_profiles up 
    WHERE up.id = manager_uuid;
    
    SELECT a.tenant_id INTO account_tenant 
    FROM public.accounts a 
    WHERE a.id = account_uuid;
    
    IF manager_tenant != account_tenant THEN
        RETURN QUERY SELECT false::BOOLEAN, 'Account and manager must be in the same tenant'::TEXT;
        RETURN;
    END IF;

    -- Clear existing primary designation if setting new primary
    IF primary_rep_id IS NOT NULL THEN
        UPDATE public.account_assignments 
        SET is_primary = false 
        WHERE account_id = account_uuid;
    END IF;

    -- Insert or update assignments for each rep
    FOREACH rep_id IN ARRAY rep_ids
    LOOP
        -- Verify rep belongs to same tenant
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = rep_id 
            AND up.tenant_id = manager_tenant
            AND up.is_active = true
        ) THEN
            RETURN QUERY SELECT false::BOOLEAN, 'Rep ' || rep_id::TEXT || ' not found or not in same tenant'::TEXT;
            RETURN;
        END IF;

        -- Insert assignment (ON CONFLICT UPDATE to handle duplicates)
        INSERT INTO public.account_assignments (
            account_id, 
            rep_id, 
            assigned_by, 
            is_primary
        ) VALUES (
            account_uuid, 
            rep_id, 
            manager_uuid,
            (rep_id = primary_rep_id)
        )
        ON CONFLICT (account_id, rep_id) 
        DO UPDATE SET 
            assigned_by = EXCLUDED.assigned_by,
            assigned_at = CURRENT_TIMESTAMP,
            is_primary = EXCLUDED.is_primary;
    END LOOP;

    -- Update the legacy assigned_rep_id to primary rep for backward compatibility
    IF primary_rep_id IS NOT NULL THEN
        UPDATE public.accounts 
        SET assigned_rep_id = primary_rep_id 
        WHERE id = account_uuid;
    END IF;

    RETURN QUERY SELECT true::BOOLEAN, 'Representatives assigned successfully'::TEXT;
END;
$$;

-- Function to remove rep assignments
CREATE OR REPLACE FUNCTION public.remove_rep_from_account(
    account_uuid UUID,
    rep_uuid UUID,
    manager_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    was_primary BOOLEAN;
    new_primary_rep UUID;
BEGIN
    -- Verify manager can manage this account
    IF NOT public.manager_can_manage_account_assignments(manager_uuid, account_uuid) THEN
        RETURN QUERY SELECT false::BOOLEAN, 'Manager does not have permission to manage assignments for this account'::TEXT;
        RETURN;
    END IF;

    -- Check if removing primary rep
    SELECT is_primary INTO was_primary 
    FROM public.account_assignments 
    WHERE account_id = account_uuid AND rep_id = rep_uuid;

    -- Remove the assignment
    DELETE FROM public.account_assignments 
    WHERE account_id = account_uuid AND rep_id = rep_uuid;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, 'Rep assignment not found'::TEXT;
        RETURN;
    END IF;

    -- If removed rep was primary, assign new primary from remaining reps
    IF was_primary THEN
        SELECT rep_id INTO new_primary_rep
        FROM public.account_assignments
        WHERE account_id = account_uuid
        ORDER BY assigned_at ASC
        LIMIT 1;

        IF new_primary_rep IS NOT NULL THEN
            UPDATE public.account_assignments 
            SET is_primary = true 
            WHERE account_id = account_uuid AND rep_id = new_primary_rep;

            -- Update legacy assigned_rep_id
            UPDATE public.accounts 
            SET assigned_rep_id = new_primary_rep 
            WHERE id = account_uuid;
        ELSE
            -- No reps left, clear legacy assigned_rep_id
            UPDATE public.accounts 
            SET assigned_rep_id = NULL 
            WHERE id = account_uuid;
        END IF;
    END IF;

    RETURN QUERY SELECT true::BOOLEAN, 'Representative removed successfully'::TEXT;
END;
$$;

-- Enhanced manager accessible accounts function that includes assignment info
CREATE OR REPLACE FUNCTION public.get_manager_accessible_accounts_with_assignments(manager_uuid UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    company_type TEXT,
    stage TEXT,
    assigned_reps JSONB,
    primary_rep_name TEXT,
    city TEXT,
    state TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    a.id,
    a.name,
    a.company_type::TEXT,
    a.stage::TEXT,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'rep_id', up_rep.id,
                'rep_name', up_rep.full_name,
                'rep_email', up_rep.email,
                'is_primary', aa.is_primary
            ) ORDER BY aa.is_primary DESC, up_rep.full_name
        ) FILTER (WHERE up_rep.id IS NOT NULL),
        '[]'::jsonb
    ) as assigned_reps,
    up_primary.full_name as primary_rep_name,
    a.city,
    a.state,
    a.email,
    a.phone,
    a.created_at,
    a.updated_at
FROM public.accounts a
LEFT JOIN public.account_assignments aa ON a.id = aa.account_id
LEFT JOIN public.user_profiles up_rep ON aa.rep_id = up_rep.id AND up_rep.is_active = true
LEFT JOIN public.user_profiles up_primary ON a.assigned_rep_id = up_primary.id
WHERE a.tenant_id = (
    SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
)
AND (
    -- Manager can see accounts assigned to their team members or themselves
    a.assigned_rep_id IN (
        SELECT id FROM public.user_profiles 
        WHERE manager_id = manager_uuid OR id = manager_uuid
    )
    OR a.assigned_rep_id = manager_uuid
    OR EXISTS (
        -- Or accounts with reps assigned through new system
        SELECT 1 FROM public.account_assignments aa2
        JOIN public.user_profiles up2 ON aa2.rep_id = up2.id
        WHERE aa2.account_id = a.id
        AND (up2.manager_id = manager_uuid OR up2.id = manager_uuid)
    )
)
GROUP BY a.id, a.name, a.company_type, a.stage, a.city, a.state, a.email, a.phone, a.created_at, a.updated_at, up_primary.full_name
ORDER BY a.name;
$$;

-- Add sample assignments using existing data
DO $$
DECLARE
    sample_account_id UUID;
    manager_id UUID;
    rep1_id UUID;
    rep2_id UUID;
    tenant_uuid UUID;
BEGIN
    -- Get a sample tenant and account
    SELECT t.id, a.id INTO tenant_uuid, sample_account_id
    FROM public.tenants t
    JOIN public.accounts a ON t.id = a.tenant_id
    LIMIT 1;

    IF sample_account_id IS NULL THEN
        RAISE NOTICE 'No accounts found for assignment demo';
        RETURN;
    END IF;

    -- Find a manager in the tenant
    SELECT up.id INTO manager_id
    FROM public.user_profiles up
    WHERE up.tenant_id = tenant_uuid
    AND up.role = 'manager'::public.user_role
    AND up.is_active = true
    LIMIT 1;

    -- Find reps in the tenant
    SELECT up1.id, up2.id INTO rep1_id, rep2_id
    FROM public.user_profiles up1
    CROSS JOIN public.user_profiles up2
    WHERE up1.tenant_id = tenant_uuid
    AND up2.tenant_id = tenant_uuid
    AND up1.role = 'rep'::public.user_role
    AND up2.role = 'rep'::public.user_role
    AND up1.is_active = true
    AND up2.is_active = true
    AND up1.id != up2.id
    LIMIT 1;

    -- Create sample assignments if we have the required data
    IF manager_id IS NOT NULL AND rep1_id IS NOT NULL THEN
        INSERT INTO public.account_assignments (account_id, rep_id, assigned_by, is_primary, notes)
        VALUES 
            (sample_account_id, rep1_id, manager_id, true, 'Primary sales representative'),
            (sample_account_id, COALESCE(rep2_id, rep1_id), manager_id, false, 'Secondary support representative');
        
        RAISE NOTICE 'Sample account assignments created successfully';
    ELSE
        RAISE NOTICE 'Insufficient user data for sample assignments - manager: %, rep1: %, rep2: %', manager_id, rep1_id, rep2_id;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating sample assignments: %', SQLERRM;
END $$;