-- Location: supabase/migrations/20250909160000_add_contact_stage_column.sql
-- Schema Analysis: Existing contacts table missing stage column, application expects it
-- Integration Type: MODIFICATIVE - Adding column to existing table
-- Dependencies: public.contacts table (existing)

-- Create contact stage enum type
CREATE TYPE public.contact_stage AS ENUM (
    'Identified',
    'Reached', 
    'DM Confirmed',
    'Engaged',
    'Dormant'
);

-- Add stage column to existing contacts table with default value
ALTER TABLE public.contacts 
ADD COLUMN stage public.contact_stage DEFAULT 'Identified'::public.contact_stage;

-- Add index for new column to improve query performance
CREATE INDEX idx_contacts_stage ON public.contacts(stage);

-- Update existing contacts to have a meaningful stage based on existing data
DO $$
BEGIN
    -- Set existing contacts with phone/email as "Reached"
    UPDATE public.contacts 
    SET stage = 'Reached'::public.contact_stage 
    WHERE (phone IS NOT NULL OR email IS NOT NULL) 
    AND stage = 'Identified'::public.contact_stage;
    
    -- Set primary contacts as "Engaged" 
    UPDATE public.contacts 
    SET stage = 'Engaged'::public.contact_stage 
    WHERE is_primary_contact = true;
    
    RAISE NOTICE 'Updated existing contacts with appropriate stage values';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating contact stages: %', SQLERRM;
END $$;