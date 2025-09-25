-- Schema Analysis: CRM system with contacts-properties relationship
-- Integration Type: Addition - adding missing function
-- Dependencies: contacts, properties tables (both exist)

-- Function to get linked properties for a specific contact
-- This function returns properties that are currently linked to a contact via property_id
CREATE OR REPLACE FUNCTION public.get_contact_linked_properties(contact_uuid UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    building_type TEXT,
    roof_type TEXT,
    square_footage INTEGER,
    year_built INTEGER,
    stage TEXT,
    account_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT DISTINCT
    p.id,
    p.name,
    p.address,
    p.city,
    p.state,
    p.zip_code,
    p.building_type::TEXT,
    p.roof_type::TEXT,
    p.square_footage,
    p.year_built,
    p.stage::TEXT,
    p.account_id,
    p.created_at,
    p.updated_at
FROM public.properties p
INNER JOIN public.contacts c ON c.property_id = p.id
WHERE c.id = contact_uuid
  AND c.tenant_id = get_user_tenant_id()
  AND p.tenant_id = get_user_tenant_id()
ORDER BY p.name;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_contact_linked_properties(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_linked_properties(UUID) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_contact_linked_properties(UUID) IS 
'Returns properties that are currently linked to a specific contact. Uses tenant isolation for security.';