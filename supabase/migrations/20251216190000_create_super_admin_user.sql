-- Location: supabase/migrations/20251216190000_create_super_admin_user.sql
-- Schema Analysis: Existing user_profiles table with role enum containing 'super_admin', tenants table exists
-- Integration Type: Addition - Creating super admin user for cross-tenant admin access  
-- Dependencies: Existing user_profiles table, existing tenants table

-- Create the super admin user with proper authentication setup
DO $$
DECLARE
    super_admin_uuid UUID := gen_random_uuid();
    default_tenant_id UUID;
BEGIN
    -- Get first available tenant for initial assignment (super admin can access all tenants)
    SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
    
    -- Create complete auth.users record for super admin
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (super_admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'team@dillyos.com', crypt('Rom@ns_116', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Super Admin", "role": "super_admin"}'::jsonb, 
         '{"provider": "email", "providers": ["email"], "role": "super_admin"}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Insert into user_profiles with super_admin role and tenant assignment
    INSERT INTO public.user_profiles (id, email, full_name, role, tenant_id, is_active, created_at, updated_at)
    VALUES (
        super_admin_uuid, 
        'team@dillyos.com', 
        'Super Admin', 
        'super_admin'::public.user_role,
        default_tenant_id, -- Assign to default tenant but can access all tenants
        true,
        now(),
        now()
    );

    RAISE NOTICE 'Super admin user created successfully with email: team@dillyos.com and password: Rom@ns_116';

EXCEPTION
    WHEN unique_violation THEN
        -- Check if user already exists and update if needed
        UPDATE public.user_profiles 
        SET role = 'super_admin'::public.user_role, 
            is_active = true,
            updated_at = now()
        WHERE email = 'team@dillyos.com';
        
        -- Update auth metadata if user exists
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(
                jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"super_admin"'), 
                '{full_name}', '"Super Admin"'
            ),
            raw_app_meta_data = jsonb_set(
                COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"super_admin"'
            ),
            updated_at = now()
        WHERE email = 'team@dillyos.com';
        
        RAISE NOTICE 'Super admin user already exists - updated role and metadata';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating super admin user: %', SQLERRM;
END $$;

-- Create a helper function for super admin detection that works with auth metadata
CREATE OR REPLACE FUNCTION public.is_super_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (
        au.raw_user_meta_data->>'role' = 'super_admin' 
        OR au.raw_app_meta_data->>'role' = 'super_admin'
        OR au.raw_user_meta_data->>'role' = 'master_admin'
        OR au.raw_app_meta_data->>'role' = 'master_admin'
    )
)
$$;

-- Create additional RLS policies for super admin access on user_profiles
CREATE POLICY "super_admin_full_access_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_super_admin_from_auth())
WITH CHECK (public.is_super_admin_from_auth());

-- Create RLS policy for super admin access to tenants  
CREATE POLICY "super_admin_full_access_tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (public.is_super_admin_from_auth())
WITH CHECK (public.is_super_admin_from_auth());

-- Create function to allow super admin to bypass tenant restrictions
CREATE OR REPLACE FUNCTION public.can_access_any_tenant()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.is_super_admin_from_auth()
$$;