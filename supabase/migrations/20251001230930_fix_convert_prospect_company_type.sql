-- Fix the convert_prospect_to_account function to handle company_type enum casting
CREATE OR REPLACE FUNCTION public.convert_prospect_to_account(prospect_uuid uuid, link_to_existing_account_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(success boolean, message text, account_id uuid, prospect_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    prospect_record public.prospects%ROWTYPE;
    new_account_id UUID;
    current_user_id UUID;
    current_tenant_id UUID;
    manager_id UUID;
    valid_company_type public.company_type;
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
    
    -- FIXED: Handle company_type enum conversion with fallback
    BEGIN
        -- Try to cast the prospect's company_type to the enum
        valid_company_type := COALESCE(prospect_record.company_type, 'Property Management')::public.company_type;
    EXCEPTION WHEN others THEN
        -- If casting fails, use default
        valid_company_type := 'Property Management'::public.company_type;
    END;
    
    -- Create new account from prospect data with proper type casting
    INSERT INTO public.accounts (
        tenant_id, name, company_type, phone, website, address, city, state, zip_code, 
        notes, assigned_rep_id, stage, is_active
    ) VALUES (
        current_tenant_id, 
        prospect_record.name, 
        valid_company_type, -- FIXED: Use properly cast enum value
        prospect_record.phone, 
        prospect_record.website, 
        prospect_record.address, 
        prospect_record.city, 
        prospect_record.state, 
        prospect_record.zip_code,
        COALESCE(prospect_record.notes, 'Converted from prospect: ' || prospect_record.name),
        current_user_id, 
        'Prospect'::public.account_stage, -- FIXED: Explicit enum casting
        TRUE
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
    
EXCEPTION WHEN others THEN
    -- ENHANCED: Better error logging and handling
    RAISE LOG 'Error in convert_prospect_to_account: % %', SQLERRM, SQLSTATE;
    RETURN QUERY SELECT FALSE, 
        'Conversion failed: ' || CASE 
            WHEN SQLSTATE = '23505' THEN 'Duplicate account detected'
            WHEN SQLSTATE = '23503' THEN 'Invalid reference data'
            WHEN SQLSTATE = '23514' THEN 'Data validation failed'
            ELSE 'Database error occurred'
        END, 
        NULL::UUID, 
        prospect_uuid;
    RETURN;
END;
$function$;

-- Add helpful comment
COMMENT ON FUNCTION public.convert_prospect_to_account(uuid, uuid) IS 
'Converts a prospect to an account with proper enum type handling and comprehensive error management';