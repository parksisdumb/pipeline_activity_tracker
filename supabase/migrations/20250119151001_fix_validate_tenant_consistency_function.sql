-- Location: supabase/migrations/20250119151001_fix_validate_tenant_consistency_function.sql
-- Schema Analysis: CRM system with tenant isolation and account assignment validation
-- Integration Type: Fix tenant consistency validation to handle super admin access
-- Dependencies: accounts, user_profiles, tenants tables with existing validate_tenant_consistency function

-- Update the validate_tenant_consistency function to allow super admin access
-- and provide better error handling for cross-tenant assignments

CREATE OR REPLACE FUNCTION public.validate_tenant_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Skip validation for super admin users
    IF public.is_super_admin_from_auth() THEN
        RETURN NEW;
    END IF;
    
    -- Validate accounts: assigned_rep_id must belong to same tenant or be null
    IF TG_TABLE_NAME = 'accounts' THEN
        -- Skip validation if assigned_rep_id is being cleared
        IF NEW.assigned_rep_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Check if the assigned rep belongs to the same tenant
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = NEW.assigned_rep_id 
            AND up.tenant_id = NEW.tenant_id
            AND up.is_active = true
        ) THEN
            -- Instead of raising an exception, clear the invalid assignment
            RAISE NOTICE 'Cross-tenant assignment detected. Clearing assigned_rep_id for account %', NEW.id;
            NEW.assigned_rep_id := NULL;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Validate activities: user_id must belong to same tenant
    IF TG_TABLE_NAME = 'activities' THEN
        IF NEW.user_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.user_profiles up 
                WHERE up.id = NEW.user_id 
                AND up.tenant_id = NEW.tenant_id
                AND up.is_active = true
            ) THEN
                RAISE EXCEPTION 'User % does not belong to tenant %', NEW.user_id, NEW.tenant_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Validate contacts: account_id must belong to same tenant
    IF TG_TABLE_NAME = 'contacts' THEN
        IF NEW.account_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.accounts a 
                WHERE a.id = NEW.account_id 
                AND a.tenant_id = NEW.tenant_id
            ) THEN
                RAISE EXCEPTION 'Account % does not belong to tenant %', NEW.account_id, NEW.tenant_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Validate properties: account_id must belong to same tenant
    IF TG_TABLE_NAME = 'properties' THEN
        IF NEW.account_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.accounts a 
                WHERE a.id = NEW.account_id 
                AND a.tenant_id = NEW.tenant_id
            ) THEN
                RAISE EXCEPTION 'Account % does not belong to tenant %', NEW.account_id, NEW.tenant_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Validate weekly_goals: user_id must belong to same tenant
    IF TG_TABLE_NAME = 'weekly_goals' THEN
        IF NEW.user_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.user_profiles up 
                WHERE up.id = NEW.user_id 
                AND up.tenant_id = NEW.tenant_id
                AND up.is_active = true
            ) THEN
                RAISE EXCEPTION 'User % does not belong to tenant %', NEW.user_id, NEW.tenant_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Default case for any other tables
    RETURN NEW;
END;
$function$;

-- Clean up any existing cross-tenant assignments in accounts table
-- This will prevent future validation errors by clearing invalid assignments
DO $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Clear cross-tenant assignments
    UPDATE public.accounts 
    SET assigned_rep_id = NULL, 
        updated_at = CURRENT_TIMESTAMP
    WHERE assigned_rep_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = accounts.assigned_rep_id 
        AND up.tenant_id = accounts.tenant_id
        AND up.is_active = true
    );
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    IF cleanup_count > 0 THEN
        RAISE NOTICE 'Cleaned up % cross-tenant account assignments', cleanup_count;
    END IF;
END $$;

-- Add a helper function to safely assign representatives to accounts
-- This function ensures tenant consistency before making assignments
CREATE OR REPLACE FUNCTION public.safe_assign_rep_to_account(
    account_uuid UUID,
    rep_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    account_tenant_id UUID;
    rep_tenant_id UUID;
BEGIN
    -- Get the tenant ID of the account
    SELECT tenant_id INTO account_tenant_id 
    FROM public.accounts 
    WHERE id = account_uuid;
    
    IF account_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Account % not found', account_uuid;
    END IF;
    
    -- Get the tenant ID of the representative
    SELECT tenant_id INTO rep_tenant_id 
    FROM public.user_profiles 
    WHERE id = rep_uuid AND is_active = true;
    
    IF rep_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Representative % not found or inactive', rep_uuid;
    END IF;
    
    -- Check if they belong to the same tenant
    IF account_tenant_id != rep_tenant_id THEN
        -- Allow super admin to assign cross-tenant
        IF NOT public.is_super_admin_from_auth() THEN
            RAISE EXCEPTION 'Cannot assign representative % from tenant % to account in tenant %', 
                rep_uuid, rep_tenant_id, account_tenant_id;
        END IF;
    END IF;
    
    -- Perform the assignment
    UPDATE public.accounts 
    SET assigned_rep_id = rep_uuid,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = account_uuid;
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to assign representative: %', SQLERRM;
END;
$function$;