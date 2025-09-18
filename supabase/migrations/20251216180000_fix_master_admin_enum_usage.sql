-- Location: supabase/migrations/20251216180000_fix_master_admin_enum_usage.sql
-- Schema Analysis: Existing user_role enum ('admin', 'manager', 'rep'), user_profiles table with tenant_id
-- Integration Type: Modificative - Fixing super_admin enum usage issue
-- Dependencies: user_profiles, tenants tables

-- Step 1: Add super_admin to existing user_role enum safely
DO $$
BEGIN
    -- Only add if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'public.user_role'::regtype) THEN
        ALTER TYPE public.user_role ADD VALUE 'super_admin';
        -- Commit this transaction to make the enum value available
        COMMIT;
    END IF;
END $$;

-- Start new transaction for using the enum value
BEGIN;

-- Step 2: Create function to check if user is super admin via auth metadata
CREATE OR REPLACE FUNCTION public.is_super_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
    (SELECT (au.raw_user_meta_data->>'role' = 'super_admin' 
             OR au.raw_app_meta_data->>'role' = 'super_admin'
             OR au.raw_user_meta_data->>'role' = 'master_admin'
             OR au.raw_app_meta_data->>'role' = 'master_admin')
     FROM auth.users au
     WHERE au.id = auth.uid()),
    false
)
$$;

-- Step 3: Create function to check if user has super_admin role in user_profiles
-- Using string comparison to avoid enum casting issues
CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role::text = 'super_admin'
    AND up.is_active = true
)
$$;

-- Step 4: Update existing admin functions to include super admin checks
CREATE OR REPLACE FUNCTION public.is_admin_from_auth_metadata()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
    (SELECT (au.raw_user_meta_data->>'role' = 'admin' 
             OR au.raw_app_meta_data->>'role' = 'admin'
             OR au.raw_user_meta_data->>'role' = 'super_admin'
             OR au.raw_app_meta_data->>'role' = 'super_admin'
             OR au.raw_user_meta_data->>'role' = 'master_admin'
             OR au.raw_app_meta_data->>'role' = 'master_admin')
     FROM auth.users au
     WHERE au.id = auth.uid()),
    false
)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role::text IN ('admin', 'super_admin')
    AND up.is_active = true
)
$$;

-- Step 5: Update RLS policies on user_profiles to allow super admin access
DROP POLICY IF EXISTS "tenant_users_manage_own_profiles" ON public.user_profiles;

-- Recreate policy with super admin access
CREATE POLICY "tenant_users_manage_own_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (
    -- Original tenant-based access
    (id = auth.uid() AND tenant_id = (
        SELECT tenant_id FROM public.user_profiles 
        WHERE id = auth.uid() LIMIT 1
    ))
    OR
    -- Super admin can access all users
    public.is_super_admin_from_auth()
    OR
    public.is_super_admin_user()
)
WITH CHECK (
    -- Original tenant-based access for modifications
    (id = auth.uid() AND tenant_id = (
        SELECT tenant_id FROM public.user_profiles 
        WHERE id = auth.uid() LIMIT 1
    ))
    OR
    -- Super admin can modify all users
    public.is_super_admin_from_auth()
    OR
    public.is_super_admin_user()
);

-- Step 6: Add super admin policy for tenants table
DROP POLICY IF EXISTS "super_admin_full_tenants_access" ON public.tenants;

CREATE POLICY "super_admin_full_tenants_access"
ON public.tenants
FOR ALL
TO authenticated
USING (
    public.is_super_admin_from_auth()
    OR
    public.is_super_admin_user()
);

-- Step 7: Create master admin user safely
DO $$
DECLARE
    master_admin_uuid UUID := gen_random_uuid();
    default_tenant_uuid UUID;
    existing_admin_count INTEGER;
BEGIN
    -- Check if a super admin already exists
    SELECT COUNT(*) INTO existing_admin_count 
    FROM auth.users au 
    WHERE au.email = 'masteradmin@crm.com';

    -- Only create if doesn't exist
    IF existing_admin_count = 0 THEN
        -- Get the first tenant for initial assignment
        SELECT id INTO default_tenant_uuid FROM public.tenants LIMIT 1;
        
        -- Create master admin in auth.users
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
            is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
            recovery_token, recovery_sent_at, email_change_token_new, email_change,
            email_change_sent_at, email_change_token_current, email_change_confirm_status,
            reauthentication_token, reauthentication_sent_at, phone, phone_change,
            phone_change_token, phone_change_sent_at
        ) VALUES (
            master_admin_uuid, 
            '00000000-0000-0000-0000-000000000000', 
            'authenticated', 
            'authenticated',
            'masteradmin@crm.com', 
            crypt('MasterAdmin2025!', gen_salt('bf', 10)), 
            now(), 
            now(), 
            now(),
            '{"full_name": "Master Administrator", "role": "super_admin"}'::jsonb, 
            '{"provider": "email", "providers": ["email"], "role": "super_admin"}'::jsonb,
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        );

        -- Create master admin profile - Use direct assignment instead of casting
        INSERT INTO public.user_profiles (
            id, email, full_name, role, tenant_id, is_active, created_at, updated_at
        ) VALUES (
            master_admin_uuid,
            'masteradmin@crm.com',
            'Master Administrator',
            'super_admin',
            default_tenant_uuid,
            true,
            now(),
            now()
        );

        RAISE NOTICE 'Master admin created successfully with email: masteradmin@crm.com';
    ELSE 
        RAISE NOTICE 'Master admin user already exists';
    END IF;
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Master admin user already exists (unique constraint)';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating master admin: %', SQLERRM;
END $$;