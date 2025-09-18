-- Schema Analysis: Existing tenants table with proper structure and constraints
-- Integration Type: Addition - Adding test tenant data
-- Dependencies: Existing user_profiles table (for owner_id reference)

-- Add test tenant record for multi-tenant functionality testing
DO $$
DECLARE
    existing_user_id UUID;
BEGIN
    -- Get an existing user ID from user_profiles to use as owner
    SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;
    
    -- Only insert if we have an existing user to reference
    IF existing_user_id IS NOT NULL THEN
        INSERT INTO public.tenants (
            name,
            slug,
            owner_id,
            description,
            subscription_plan,
            status,
            is_active
        ) VALUES (
            'Test Tenant',
            'test-tenant',
            existing_user_id,
            'Test tenant for multi-tenant functionality development and testing',
            'trial'::public.subscription_plan,
            'trial'::public.tenant_status,
            true
        );
        
        RAISE NOTICE 'Test tenant created successfully with name: Test Tenant';
    ELSE
        RAISE NOTICE 'No existing users found. Cannot create tenant without owner_id reference.';
    END IF;
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Tenant with slug "test-tenant" already exists. Skipping creation.';
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error: Invalid owner_id reference';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating test tenant: %', SQLERRM;
END $$;