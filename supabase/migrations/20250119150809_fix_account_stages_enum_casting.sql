-- Fix account stages enum casting issue 
-- Issue: Cannot drop type account_stage because function get_all_available_accounts() depends on it
-- Solution: Drop dependent functions first, then recreate enum, then recreate functions

-- Step 1: Temporarily disable the tenant consistency trigger for accounts
ALTER TABLE public.accounts DISABLE TRIGGER trigger_validate_accounts_tenant_consistency;

-- Step 2: Drop the function that depends on account_stage enum
DROP FUNCTION IF EXISTS public.get_all_available_accounts();

-- Step 3: Create new enum type with updated stages  
CREATE TYPE public.account_stage_new AS ENUM (
    'Prospect', 
    'Contacted', 
    'Vendor Packet Request', 
    'Vendor Packet Submitted', 
    'Approved for Work', 
    'Actively Engaged'
);

-- Step 4: Add a temporary column with the new enum type
ALTER TABLE public.accounts ADD COLUMN stage_new public.account_stage_new;

-- Step 5: Update the temporary column with mapped values (using text conversion)
DO $$
BEGIN
    -- Map existing stages to new stages using the new enum type
    UPDATE public.accounts SET stage_new = 'Prospect'::public.account_stage_new WHERE stage::text = 'Prospect';
    UPDATE public.accounts SET stage_new = 'Contacted'::public.account_stage_new WHERE stage::text = 'Contacted';
    UPDATE public.accounts SET stage_new = 'Contacted'::public.account_stage_new WHERE stage::text = 'Qualified';
    UPDATE public.accounts SET stage_new = 'Vendor Packet Request'::public.account_stage_new WHERE stage::text = 'Assessment Scheduled';
    UPDATE public.accounts SET stage_new = 'Vendor Packet Submitted'::public.account_stage_new WHERE stage::text = 'Assessed';
    UPDATE public.accounts SET stage_new = 'Vendor Packet Submitted'::public.account_stage_new WHERE stage::text = 'Proposal Sent';
    UPDATE public.accounts SET stage_new = 'Approved for Work'::public.account_stage_new WHERE stage::text = 'In Negotiation';
    UPDATE public.accounts SET stage_new = 'Actively Engaged'::public.account_stage_new WHERE stage::text = 'Won';
    
    -- Set Lost accounts to default Prospect stage
    UPDATE public.accounts SET stage_new = 'Prospect'::public.account_stage_new WHERE stage::text = 'Lost';
    
    -- Handle any NULL or unmapped values
    UPDATE public.accounts SET stage_new = 'Prospect'::public.account_stage_new WHERE stage_new IS NULL;
END $$;

-- Step 6: Drop the old stage column
ALTER TABLE public.accounts DROP COLUMN stage;

-- Step 7: Rename the new column to the original name
ALTER TABLE public.accounts RENAME COLUMN stage_new TO stage;

-- Step 8: Set default value for the new column
ALTER TABLE public.accounts ALTER COLUMN stage SET DEFAULT 'Prospect'::public.account_stage_new;

-- Step 9: Drop the old enum type and rename the new one
DROP TYPE public.account_stage;
ALTER TYPE public.account_stage_new RENAME TO account_stage;

-- Step 10: Update the default again after enum rename
ALTER TABLE public.accounts ALTER COLUMN stage SET DEFAULT 'Prospect'::public.account_stage;

-- Step 11: Recreate the function with the new enum type
CREATE OR REPLACE FUNCTION public.get_all_available_accounts()
 RETURNS TABLE(id uuid, name text, company_type company_type, stage account_stage)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
SELECT a.id, a.name, a.company_type, a.stage
FROM public.accounts a
WHERE a.is_active = true
AND public.can_access_any_account()
ORDER BY a.name
$function$;

-- Step 12: Re-enable the tenant consistency trigger
ALTER TABLE public.accounts ENABLE TRIGGER trigger_validate_accounts_tenant_consistency;

-- Step 13: Clean up any cross-tenant assignments that may cause issues
-- Set assigned_rep_id to NULL for accounts where rep doesn't belong to account's tenant
UPDATE public.accounts 
SET assigned_rep_id = NULL 
WHERE assigned_rep_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = accounts.assigned_rep_id 
    AND up.tenant_id = accounts.tenant_id
);

-- Step 14: Add a comment for future reference
COMMENT ON TYPE public.account_stage IS 'Updated account stages for vendor packet workflow: Prospect → Contacted → Vendor Packet Request → Vendor Packet Submitted → Approved for Work → Actively Engaged';

-- Step 15: Log the successful completion
DO $$
BEGIN
    RAISE NOTICE 'Account stage enum updated successfully with proper function dependency handling. Cross-tenant rep assignments have been cleared to maintain data integrity.';
END $$;