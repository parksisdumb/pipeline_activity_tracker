-- Location: supabase/migrations/20250905162000_fix_authentication_demo_users.sql
-- Fix authentication issue by ensuring demo users exist properly in auth.users
-- This addresses the "invalid login credentials" error for demo accounts

-- First, let's clean up any incomplete user data
DO $$
DECLARE
    demo_emails TEXT[] := ARRAY['admin@roofcrm.com', 'manager@roofcrm.com', 'john.smith@roofcrm.com', 'sarah.johnson@roofcrm.com'];
    email_to_clean TEXT;
BEGIN
    -- Clean up any existing incomplete demo user data
    FOREACH email_to_clean IN ARRAY demo_emails LOOP
        -- Delete from user_profiles first (child table)
        DELETE FROM public.user_profiles WHERE email = email_to_clean;
        -- Delete from auth.users (parent table)
        DELETE FROM auth.users WHERE email = email_to_clean;
    END LOOP;
    
    RAISE NOTICE 'Cleaned up existing demo user data';
END $$;

-- Now create complete, properly linked demo users
DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
    manager_uuid UUID := gen_random_uuid();
    rep1_uuid UUID := gen_random_uuid();
    rep2_uuid UUID := gen_random_uuid();
BEGIN
    -- Step 1: Create complete auth.users records with all required fields
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at, last_sign_in_at
    ) VALUES
        (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'admin@roofcrm.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Admin User", "role": "admin"}'::jsonb, 
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null, null),
        (manager_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'manager@roofcrm.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Sales Manager", "role": "manager"}'::jsonb, 
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null, null),
        (rep1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'john.smith@roofcrm.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "John Smith", "role": "rep"}'::jsonb, 
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null, null),
        (rep2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'sarah.johnson@roofcrm.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Sarah Johnson", "role": "rep"}'::jsonb, 
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null, null);

    -- Step 2: Manually create user_profiles since the trigger might not be working
    INSERT INTO public.user_profiles (id, email, full_name, role, is_active, created_at, updated_at)
    VALUES
        (admin_uuid, 'admin@roofcrm.com', 'Admin User', 'admin'::public.user_role, true, now(), now()),
        (manager_uuid, 'manager@roofcrm.com', 'Sales Manager', 'manager'::public.user_role, true, now(), now()),
        (rep1_uuid, 'john.smith@roofcrm.com', 'John Smith', 'rep'::public.user_role, true, now(), now()),
        (rep2_uuid, 'sarah.johnson@roofcrm.com', 'Sarah Johnson', 'rep'::public.user_role, true, now(), now())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = now();

    -- Step 3: Update existing accounts to reference the new user IDs
    UPDATE public.accounts 
    SET assigned_rep_id = rep1_uuid 
    WHERE assigned_rep_id IN (
        SELECT id FROM public.user_profiles WHERE email = 'john.smith@roofcrm.com'
    );
    
    UPDATE public.accounts 
    SET assigned_rep_id = rep2_uuid 
    WHERE assigned_rep_id IN (
        SELECT id FROM public.user_profiles WHERE email = 'sarah.johnson@roofcrm.com'
    );

    -- Step 4: Update activities to reference correct user IDs
    UPDATE public.activities 
    SET user_id = rep1_uuid 
    WHERE user_id IN (
        SELECT id FROM public.user_profiles WHERE email = 'john.smith@roofcrm.com'
    );
    
    UPDATE public.activities 
    SET user_id = rep2_uuid 
    WHERE user_id IN (
        SELECT id FROM public.user_profiles WHERE email = 'sarah.johnson@roofcrm.com'
    );

    -- Step 5: Update weekly goals to reference correct user IDs
    UPDATE public.weekly_goals 
    SET user_id = rep1_uuid 
    WHERE user_id IN (
        SELECT id FROM public.user_profiles WHERE email = 'john.smith@roofcrm.com'
    );
    
    UPDATE public.weekly_goals 
    SET user_id = rep2_uuid 
    WHERE user_id IN (
        SELECT id FROM public.user_profiles WHERE email = 'sarah.johnson@roofcrm.com'
    );

    RAISE NOTICE 'Successfully created demo users with IDs: Admin=%, Manager=%, Rep1=%, Rep2=%', 
                 admin_uuid, manager_uuid, rep1_uuid, rep2_uuid;
                 
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error: %', SQLERRM;
END $$;

-- Verify that the authentication setup is working
CREATE OR REPLACE FUNCTION public.verify_auth_setup()
RETURNS TABLE(
    email TEXT,
    auth_exists BOOLEAN,
    profile_exists BOOLEAN,
    ids_match BOOLEAN,
    can_authenticate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.email::TEXT,
        (au.id IS NOT NULL) AS auth_exists,
        (up.id IS NOT NULL) AS profile_exists,
        (au.id = up.id) AS ids_match,
        (au.encrypted_password IS NOT NULL AND au.email_confirmed_at IS NOT NULL) AS can_authenticate
    FROM auth.users au
    FULL OUTER JOIN public.user_profiles up ON au.id = up.id
    WHERE au.email LIKE '%@roofcrm.com' OR up.email LIKE '%@roofcrm.com'
    ORDER BY au.email;
END;
$$;

-- Run verification check
DO $$
DECLARE
    verification_result RECORD;
BEGIN
    RAISE NOTICE '=== AUTHENTICATION VERIFICATION ===';
    FOR verification_result IN 
        SELECT * FROM public.verify_auth_setup()
    LOOP
        RAISE NOTICE 'Email: %, Auth: %, Profile: %, IDs Match: %, Can Auth: %',
                     verification_result.email,
                     verification_result.auth_exists,
                     verification_result.profile_exists,
                     verification_result.ids_match,
                     verification_result.can_authenticate;
    END LOOP;
END $$;