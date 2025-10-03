-- Location: supabase/migrations/20250102064852_add_documents_module.sql
-- Schema Analysis: Existing CRM schema with tenants, user_profiles, accounts, properties, contacts, opportunities
-- Integration Type: NEW_MODULE - Adding document management functionality
-- Dependencies: tenants(id), user_profiles(id), accounts(id), properties(id), contacts(id), opportunities(id)

-- 1. Create document types and status enums
CREATE TYPE public.document_type AS ENUM ('coi', 'w9', 'business_license', 'other');
CREATE TYPE public.document_status AS ENUM ('valid', 'expiring', 'expired', 'missing');
CREATE TYPE public.document_event_type AS ENUM ('upload', 'download', 'view', 'replace', 'delete', 'metadata_update');

-- 2. Create documents table (metadata + audit-friendly fields)
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type public.document_type NOT NULL DEFAULT 'other',
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    previous_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    valid_from DATE,
    valid_to DATE,
    status public.document_status NOT NULL DEFAULT 'valid',
    sha256_hash TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    -- Entity linking columns (nullable for future entity attachments)
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create document_events table (audit log)
CREATE TABLE public.document_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    event_type public.document_event_type NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    event_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    meta JSONB DEFAULT '{}'::jsonb
);

-- 4. Create essential indexes
CREATE INDEX idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX idx_documents_type ON public.documents(tenant_id, type);
CREATE INDEX idx_documents_status ON public.documents(tenant_id, status);
CREATE INDEX idx_documents_valid_to ON public.documents(tenant_id, valid_to);
CREATE INDEX idx_documents_uploaded_at ON public.documents(tenant_id, uploaded_at DESC);
CREATE INDEX idx_documents_account_id ON public.documents(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_documents_property_id ON public.documents(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_documents_contact_id ON public.documents(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_documents_opportunity_id ON public.documents(opportunity_id) WHERE opportunity_id IS NOT NULL;

CREATE INDEX idx_document_events_tenant_id ON public.document_events(tenant_id);
CREATE INDEX idx_document_events_document_id ON public.document_events(document_id, event_at DESC);

-- 5. Add constraints
ALTER TABLE public.documents ADD CONSTRAINT check_valid_document_type 
    CHECK (type IN ('coi', 'w9', 'business_license', 'other'));
ALTER TABLE public.documents ADD CONSTRAINT check_valid_document_status 
    CHECK (status IN ('valid', 'expiring', 'expired', 'missing'));
ALTER TABLE public.document_events ADD CONSTRAINT check_valid_event_type 
    CHECK (event_type IN ('upload', 'download', 'view', 'replace', 'delete', 'metadata_update'));

-- 6. Create storage bucket for tenant documents (private bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tenant-docs',
    'tenant-docs',
    false,
    26214400, -- 25MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
);

-- 7. Helper functions MUST be created BEFORE RLS policies
CREATE OR REPLACE FUNCTION public.can_user_manage_documents()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role IN ('admin', 'manager')
)
$$;

-- 8. Enable RLS on tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies using Pattern 2 (Simple User Ownership) and Pattern 6 (Role-Based Access)

-- Documents policies - All tenant users can view, admin/manager can manage
CREATE POLICY "tenant_users_view_documents"
ON public.documents
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "admins_managers_manage_documents"
ON public.documents
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant_id() AND public.can_user_manage_documents())
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Super admin access to all documents
CREATE POLICY "super_admin_full_access_documents"
ON public.documents
FOR ALL
TO authenticated
USING (public.is_super_admin_from_auth())
WITH CHECK (public.is_super_admin_from_auth());

-- Document events policies - All tenant users can view events, any authenticated user can log events  
CREATE POLICY "tenant_users_view_document_events"
ON public.document_events
FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "authenticated_users_log_events"
ON public.document_events
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Super admin access to all document events
CREATE POLICY "super_admin_full_access_document_events"
ON public.document_events
FOR ALL
TO authenticated
USING (public.is_super_admin_from_auth())
WITH CHECK (public.is_super_admin_from_auth());

-- 10. Storage RLS policies for tenant-docs bucket
CREATE POLICY "tenant_users_view_own_docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'tenant-docs' 
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
);

CREATE POLICY "admins_managers_upload_docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tenant-docs'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
    AND public.can_user_manage_documents()
);

CREATE POLICY "admins_managers_update_docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'tenant-docs'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
    AND public.can_user_manage_documents()
)
WITH CHECK (
    bucket_id = 'tenant-docs'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
);

CREATE POLICY "admins_managers_delete_docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'tenant-docs'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
    AND public.can_user_manage_documents()
);

-- Super admin storage access
CREATE POLICY "super_admin_storage_access"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'tenant-docs' AND public.is_super_admin_from_auth())
WITH CHECK (bucket_id = 'tenant-docs' AND public.is_super_admin_from_auth());

-- 11. Triggers for updated_at
CREATE TRIGGER handle_updated_at_documents
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 12. Mock data for documents
DO $$
DECLARE
    tenant1_id UUID := '0f839ba0-e8aa-445f-bbbd-da2ca6c4b1a6'; -- Acme Roofing
    tenant2_id UUID := '042f2a25-4820-40aa-a363-03864a1c2549'; -- Summit PM
    user1_id UUID;
    user2_id UUID;
    account1_id UUID;
    account2_id UUID;
    doc1_id UUID := gen_random_uuid();
    doc2_id UUID := gen_random_uuid();
    doc3_id UUID := gen_random_uuid();
BEGIN
    -- Get existing users and accounts for mock data
    SELECT id INTO user1_id FROM public.user_profiles WHERE tenant_id = tenant1_id LIMIT 1;
    SELECT id INTO user2_id FROM public.user_profiles WHERE tenant_id = tenant2_id LIMIT 1;
    SELECT id INTO account1_id FROM public.accounts WHERE tenant_id = tenant1_id LIMIT 1;
    SELECT id INTO account2_id FROM public.accounts WHERE tenant_id = tenant2_id LIMIT 1;

    -- Insert sample documents
    INSERT INTO public.documents (
        id, tenant_id, name, type, storage_path, mime_type, size_bytes, 
        uploaded_by, version, valid_from, valid_to, status, tags, notes, account_id
    ) VALUES
        (doc1_id, tenant1_id, 'Certificate of Insurance 2025', 'coi', 
         tenant1_id::text || '/' || doc1_id::text || '-coi-2025.pdf', 
         'application/pdf', 2457600, user1_id, 1, '2025-01-01', '2025-12-31', 
         'valid', ARRAY['insurance', '2025'], 'Annual COI renewal', account1_id),
        
        (doc2_id, tenant1_id, 'W-9 Tax Form', 'w9', 
         tenant1_id::text || '/' || doc2_id::text || '-w9-form.pdf', 
         'application/pdf', 1536000, user1_id, 1, '2025-01-01', NULL, 
         'valid', ARRAY['tax', 'w9'], 'Updated W-9 form for 2025', account1_id),
        
        (doc3_id, tenant2_id, 'Business License', 'business_license', 
         tenant2_id::text || '/' || doc3_id::text || '-business-license.pdf', 
         'application/pdf', 3072000, user2_id, 1, '2025-01-01', '2025-12-31', 
         'valid', ARRAY['license', 'business'], 'Current business license', account2_id);

    -- Insert sample document events
    INSERT INTO public.document_events (tenant_id, document_id, event_type, user_id, meta) VALUES
        (tenant1_id, doc1_id, 'upload', user1_id, '{"ip": "192.168.1.1", "user_agent": "Mozilla/5.0"}'::jsonb),
        (tenant1_id, doc2_id, 'upload', user1_id, '{"ip": "192.168.1.1", "user_agent": "Mozilla/5.0"}'::jsonb),
        (tenant2_id, doc3_id, 'upload', user2_id, '{"ip": "192.168.1.2", "user_agent": "Mozilla/5.0"}'::jsonb);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;

-- 13. Utility functions for document management
CREATE OR REPLACE FUNCTION public.get_documents_expiring(within_days INTEGER DEFAULT 30)
RETURNS TABLE(
    document_id UUID,
    document_name TEXT,
    document_type public.document_type,
    expires_on DATE,
    days_until_expiry INTEGER,
    tenant_id UUID,
    uploaded_by UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    d.id,
    d.name,
    d.type,
    d.valid_to,
    (d.valid_to - CURRENT_DATE)::INTEGER,
    d.tenant_id,
    d.uploaded_by
FROM public.documents d
WHERE d.valid_to IS NOT NULL
AND d.valid_to BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * within_days)
AND d.tenant_id = public.get_user_tenant_id()
ORDER BY d.valid_to ASC;
$$;

CREATE OR REPLACE FUNCTION public.update_document_status()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
UPDATE public.documents 
SET status = CASE
    WHEN valid_to IS NULL THEN 'valid'::public.document_status
    WHEN valid_to < CURRENT_DATE THEN 'expired'::public.document_status
    WHEN valid_to <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'::public.document_status
    ELSE 'valid'::public.document_status
END,
updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = public.get_user_tenant_id();
$$;