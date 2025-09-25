-- Schema Analysis: Existing account_stage enum with values: ['Prospect', 'Contacted', 'Qualified', 'Assessment Scheduled', 'Assessed', 'Proposal Sent', 'In Negotiation', 'Won', 'Lost']
-- Integration Type: MODIFICATIVE - Update existing enum values
-- Dependencies: accounts table uses account_stage enum

-- Step 1: Create new enum type with updated stages
CREATE TYPE public.account_stage_new AS ENUM (
    'Prospect', 
    'Contacted', 
    'Vendor Packet Request', 
    'Vendor Packet Submitted', 
    'Approved for Work', 
    'Actively Engaged'
);

-- Step 2: Update existing data to map old stages to new stages
DO $$
BEGIN
    -- Map existing stages to new stages
    UPDATE public.accounts SET stage = 'Prospect'::public.account_stage WHERE stage IN ('Prospect');
    UPDATE public.accounts SET stage = 'Contacted'::public.account_stage WHERE stage IN ('Contacted', 'Qualified');
    UPDATE public.accounts SET stage = 'Vendor Packet Request'::public.account_stage WHERE stage IN ('Assessment Scheduled');
    UPDATE public.accounts SET stage = 'Vendor Packet Submitted'::public.account_stage WHERE stage IN ('Assessed', 'Proposal Sent');
    UPDATE public.accounts SET stage = 'Approved for Work'::public.account_stage WHERE stage IN ('In Negotiation');
    UPDATE public.accounts SET stage = 'Actively Engaged'::public.account_stage WHERE stage IN ('Won');
    
    -- Set any remaining stages to default
    UPDATE public.accounts SET stage = 'Prospect'::public.account_stage WHERE stage = 'Lost'::public.account_stage;
END $$;

-- Step 3: Update the column to use the new enum type
ALTER TABLE public.accounts ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE public.accounts ALTER COLUMN stage TYPE public.account_stage_new 
    USING stage::text::public.account_stage_new;
ALTER TABLE public.accounts ALTER COLUMN stage SET DEFAULT 'Prospect'::public.account_stage_new;

-- Step 4: Drop the old enum type and rename the new one
DROP TYPE public.account_stage;
ALTER TYPE public.account_stage_new RENAME TO account_stage;

-- Step 5: Update the default again after rename
ALTER TABLE public.accounts ALTER COLUMN stage SET DEFAULT 'Prospect'::public.account_stage;

-- Step 6: Add a comment for future reference
COMMENT ON TYPE public.account_stage IS 'Updated account stages for vendor packet workflow: Prospect → Contacted → Vendor Packet Request → Vendor Packet Submitted → Approved for Work → Actively Engaged';