-- Location: supabase/migrations/20250119151000_fix_account_tenant_consistency_assignments.sql
-- Schema Analysis: Existing CRM schema with accounts, user_profiles, tenants tables
-- Integration Type: Modificative - Fix cross-tenant assignment inconsistencies  
-- Dependencies: accounts, user_profiles, tenants tables and validate_tenant_consistency function

-- Fix cross-tenant assignments by clearing invalid assigned_rep_id values
-- This resolves the tenant consistency validation errors during account updates

DO $$
DECLARE
    invalid_assignments_count INTEGER;
    fixed_assignments_count INTEGER;
BEGIN
    -- Count invalid cross-tenant assignments
    SELECT COUNT(*) INTO invalid_assignments_count
    FROM public.accounts a
    INNER JOIN public.user_profiles up ON a.assigned_rep_id = up.id
    WHERE a.tenant_id != up.tenant_id
    AND a.assigned_rep_id IS NOT NULL;

    RAISE NOTICE 'Found % invalid cross-tenant assignments', invalid_assignments_count;

    -- Fix invalid assignments by clearing assigned_rep_id for cross-tenant cases
    -- This prevents the validate_tenant_consistency function from blocking updates
    UPDATE public.accounts 
    SET assigned_rep_id = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
        SELECT a.id
        FROM public.accounts a
        INNER JOIN public.user_profiles up ON a.assigned_rep_id = up.id
        WHERE a.tenant_id != up.tenant_id
        AND a.assigned_rep_id IS NOT NULL
    );

    GET DIAGNOSTICS fixed_assignments_count = ROW_COUNT;
    RAISE NOTICE 'Fixed % cross-tenant assignments by clearing invalid assigned_rep_id values', fixed_assignments_count;

    -- Verify no remaining cross-tenant assignments exist
    SELECT COUNT(*) INTO invalid_assignments_count
    FROM public.accounts a
    INNER JOIN public.user_profiles up ON a.assigned_rep_id = up.id
    WHERE a.tenant_id != up.tenant_id;

    IF invalid_assignments_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All cross-tenant assignment issues have been resolved';
    ELSE
        RAISE NOTICE 'WARNING: % cross-tenant assignments still remain', invalid_assignments_count;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing tenant consistency: %', SQLERRM;
        -- Re-raise the exception to fail the migration if there are issues
        RAISE;
END $$;

-- Add a helper function to safely assign reps within the same tenant
CREATE OR REPLACE FUNCTION public.assign_rep_to_account(
    account_uuid UUID,
    rep_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    account_tenant_id UUID;
    rep_tenant_id UUID;
BEGIN
    -- Get the tenant ID for the account
    SELECT tenant_id INTO account_tenant_id
    FROM public.accounts
    WHERE id = account_uuid;

    -- Get the tenant ID for the rep
    SELECT tenant_id INTO rep_tenant_id
    FROM public.user_profiles
    WHERE id = rep_uuid;

    -- Verify both exist and belong to same tenant
    IF account_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Account % not found', account_uuid;
    END IF;

    IF rep_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User profile % not found', rep_uuid;
    END IF;

    IF account_tenant_id != rep_tenant_id THEN
        RAISE EXCEPTION 'Cannot assign rep from tenant % to account in tenant %', rep_tenant_id, account_tenant_id;
    END IF;

    -- Safe to assign - both belong to same tenant
    UPDATE public.accounts
    SET assigned_rep_id = rep_uuid,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = account_uuid;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to assign rep: %', SQLERRM;
        RETURN FALSE;
END $$;

-- Add comment for documentation
COMMENT ON FUNCTION public.assign_rep_to_account(UUID, UUID) IS 'Safely assigns a rep to an account ensuring both belong to the same tenant';