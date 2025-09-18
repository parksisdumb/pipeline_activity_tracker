-- Schema Analysis: Existing CRM system with contacts, properties, accounts tables
-- Integration Type: Modificative - Adding property linking to contacts
-- Dependencies: contacts, properties tables

-- Add property_id column to contacts table to enable direct property association
ALTER TABLE public.contacts
ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- Add index for the new foreign key column for performance
CREATE INDEX idx_contacts_property_id ON public.contacts(property_id);

-- Add a function to get available properties for a contact based on their account
CREATE OR REPLACE FUNCTION public.get_contact_available_properties(contact_uuid UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    address TEXT,
    building_type TEXT,
    stage TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    p.id,
    p.name,
    p.address,
    p.building_type::TEXT,
    p.stage::TEXT
FROM public.properties p
JOIN public.contacts c ON c.account_id = p.account_id
WHERE c.id = contact_uuid
ORDER BY p.name;
$$;

-- Add a function to link contact to property with validation
CREATE OR REPLACE FUNCTION public.link_contact_to_property(
    contact_uuid UUID,
    property_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    contact_account_id UUID;
    property_account_id UUID;
BEGIN
    -- Get contact's account_id
    SELECT account_id INTO contact_account_id 
    FROM public.contacts 
    WHERE id = contact_uuid;
    
    -- Get property's account_id
    SELECT account_id INTO property_account_id 
    FROM public.properties 
    WHERE id = property_uuid;
    
    -- Validate that both contact and property belong to the same account
    IF contact_account_id != property_account_id THEN
        RAISE EXCEPTION 'Contact and property must belong to the same account';
    END IF;
    
    -- Update the contact with the property_id
    UPDATE public.contacts 
    SET property_id = property_uuid, updated_at = CURRENT_TIMESTAMP
    WHERE id = contact_uuid;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to link contact to property: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Add a function to unlink contact from property
CREATE OR REPLACE FUNCTION public.unlink_contact_from_property(contact_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.contacts 
    SET property_id = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = contact_uuid;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to unlink contact from property: %', SQLERRM;
        RETURN FALSE;
END;
$$;