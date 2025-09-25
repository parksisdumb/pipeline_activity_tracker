-- Schema Analysis: Existing CRM schema with manager, account_assignments, accounts, user_profiles tables
-- Integration Type: Function modification to fix ambiguous column reference error and return type mismatch
-- Dependencies: Existing manager_assign_account_to_reps function, account_assignments table

-- Drop the existing function with the old signature first
DROP FUNCTION IF EXISTS public.manager_assign_account_to_reps(uuid, uuid, uuid[], uuid);

-- Create the fixed function with proper return type and table aliases
CREATE OR REPLACE FUNCTION public.manager_assign_account_to_reps(
    manager_uuid uuid, 
    account_uuid uuid, 
    rep_ids uuid[], 
    primary_rep_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(success boolean, message text, assigned_account_id uuid, assignments_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    manager_tenant_id UUID;
    account_tenant_id UUID;
    assignments_count INTEGER := 0;
    rep_id UUID;
BEGIN
    -- Verify manager permissions (using table alias)
    SELECT up.tenant_id INTO manager_tenant_id 
    FROM public.user_profiles up
    WHERE up.id = manager_uuid AND up.role IN ('manager', 'admin', 'super_admin');
    
    IF manager_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid manager or insufficient permissions', account_uuid, 0;
        RETURN;
    END IF;
    
    -- Verify account belongs to same tenant (using table alias)
    SELECT a.tenant_id INTO account_tenant_id
    FROM public.accounts a
    WHERE a.id = account_uuid;
    
    IF account_tenant_id != manager_tenant_id THEN
        RETURN QUERY SELECT false, 'Account not found or access denied', account_uuid, 0;
        RETURN;
    END IF;
    
    -- Clear existing assignments for this account (using table alias to avoid ambiguity)
    DELETE FROM public.account_assignments aa WHERE aa.account_id = account_uuid;
    
    -- Update primary rep if specified (using table alias)
    IF primary_rep_id IS NOT NULL THEN
        UPDATE public.accounts a
        SET assigned_rep_id = primary_rep_id 
        WHERE a.id = account_uuid;
    END IF;
    
    -- Create new assignments
    FOREACH rep_id IN ARRAY rep_ids LOOP
        -- Verify rep belongs to same tenant (using table alias)
        IF EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = rep_id 
            AND up.tenant_id = manager_tenant_id 
            AND up.is_active = true
        ) THEN
            INSERT INTO public.account_assignments (
                account_id, 
                rep_id, 
                assigned_by, 
                is_primary
            ) VALUES (
                account_uuid, 
                rep_id, 
                manager_uuid,
                COALESCE(rep_id = primary_rep_id, false)
            );
            assignments_count := assignments_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        true, 
        format('Successfully assigned %s reps to account', assignments_count),
        account_uuid,
        assignments_count;
END;
$function$;