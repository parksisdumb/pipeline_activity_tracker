-- Schema Analysis: Existing CRM system with user_profiles, tenants, and authentication functions
-- Integration Type: Enhancement of existing authentication workflow
-- Dependencies: user_profiles, tenants, existing authentication functions

-- Fix authentication workflow for account creation and password setup
-- This migration enhances existing functions and adds missing workflow components

-- 1. Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.handle_email_confirmation_workflow(uuid, text);

-- 1.1. Enhanced email confirmation workflow function (replaces existing)
CREATE OR REPLACE FUNCTION public.handle_email_confirmation_workflow(user_id uuid, user_email text)
RETURNS TABLE(success boolean, message text, next_step text, needs_password_setup boolean, needs_profile_completion boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    profile_complete BOOLEAN := FALSE;
    password_is_set BOOLEAN := FALSE;
    user_full_name TEXT := '';
BEGIN
    -- Check if user profile exists and get current state
    SELECT 
        (up.id IS NOT NULL),
        COALESCE(up.profile_completed, false),
        COALESCE(up.password_set, false),
        COALESCE(up.full_name, '')
    INTO 
        profile_exists, profile_complete, password_is_set, user_full_name
    FROM public.user_profiles up
    WHERE up.id = user_id AND up.email = user_email;

    -- If no profile exists, create one
    IF NOT profile_exists THEN
        PERFORM public.setup_new_user_profile(user_id, user_email, '{}'::jsonb);
        
        RETURN QUERY SELECT 
            TRUE, 
            'Email confirmed and profile created. Please complete your account setup.'::TEXT,
            'setup-password'::TEXT,
            TRUE,  -- needs_password_setup
            TRUE;  -- needs_profile_completion
        RETURN;
    END IF;

    -- Determine what needs to be completed
    IF NOT password_is_set AND NOT profile_complete THEN
        RETURN QUERY SELECT 
            TRUE, 
            'Email confirmed. Please set your password and complete your profile.'::TEXT,
            'setup-password'::TEXT,
            TRUE,  -- needs_password_setup
            TRUE;  -- needs_profile_completion
    ELSIF NOT password_is_set THEN
        RETURN QUERY SELECT 
            TRUE, 
            'Email confirmed. Please set your password to complete setup.'::TEXT,
            'setup-password'::TEXT,
            TRUE,  -- needs_password_setup
            FALSE; -- needs_profile_completion
    ELSIF NOT profile_complete OR user_full_name = '' THEN
        RETURN QUERY SELECT 
            TRUE, 
            'Email confirmed. Please complete your profile information.'::TEXT,
            'complete-profile'::TEXT,
            FALSE, -- needs_password_setup
            TRUE;  -- needs_profile_completion
    ELSE
        -- User is fully set up, redirect to appropriate dashboard
        RETURN QUERY SELECT 
            TRUE, 
            'Email confirmed. Welcome back!'::TEXT,
            'dashboard'::TEXT,
            FALSE, -- needs_password_setup
            FALSE; -- needs_profile_completion
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            ('Error handling email confirmation: ' || SQLERRM)::TEXT,
            'error'::TEXT,
            FALSE,
            FALSE;
END;
$$;

-- 2. Enhanced user setup completion function
CREATE OR REPLACE FUNCTION public.complete_user_setup_enhanced(
    user_email text, 
    profile_data jsonb DEFAULT '{}'::jsonb,
    mark_password_set boolean DEFAULT FALSE
)
RETURNS TABLE(success boolean, message text, user_id uuid, redirect_to text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    user_role TEXT;
    tenant_assignment UUID;
BEGIN
    -- Find the user in user_profiles
    SELECT id INTO target_user_id
    FROM public.user_profiles
    WHERE email = user_email
    AND is_active = true;

    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, 
            'User profile not found'::TEXT, 
            NULL::UUID,
            'error'::TEXT;
        RETURN;
    END IF;

    -- Extract role and other data from profile_data
    user_role := COALESCE(profile_data->>'role', 'rep');

    -- Update user profile with complete information
    UPDATE public.user_profiles
    SET
        full_name = COALESCE(profile_data->>'fullName', profile_data->>'full_name', full_name),
        phone = COALESCE(profile_data->>'phone', phone),
        organization = COALESCE(profile_data->>'organization', organization),
        role = COALESCE(user_role::public.user_role, role),
        profile_completed = true,
        password_set = CASE 
            WHEN mark_password_set THEN true 
            ELSE COALESCE(password_set, false)
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_user_id;

    -- Determine redirect based on role
    SELECT role INTO user_role FROM public.user_profiles WHERE id = target_user_id;
    
    RETURN QUERY SELECT 
        TRUE, 
        'Profile setup completed successfully'::TEXT, 
        target_user_id,
        CASE 
            WHEN user_role = 'super_admin' THEN 'super-admin-dashboard'
            WHEN user_role = 'admin' THEN 'admin-dashboard'
            WHEN user_role = 'manager' THEN 'manager-dashboard'
            ELSE 'today'
        END::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            ('Error completing user setup: ' || SQLERRM)::TEXT, 
            NULL::UUID,
            'error'::TEXT;
END;
$$;

-- 3. Function to check user authentication status with detailed response
CREATE OR REPLACE FUNCTION public.get_detailed_user_auth_status(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE(
    user_exists boolean, 
    profile_exists boolean, 
    password_set boolean, 
    profile_completed boolean, 
    email text, 
    full_name text, 
    role text, 
    needs_setup boolean,
    next_action text,
    redirect_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user auth.users%ROWTYPE;
    profile_user public.user_profiles%ROWTYPE;
    user_role_text TEXT;
BEGIN
    -- Get auth user
    SELECT * INTO auth_user FROM auth.users WHERE id = user_uuid;
    
    -- Get profile user  
    SELECT * INTO profile_user FROM public.user_profiles WHERE id = user_uuid;

    -- Convert role to text
    user_role_text := COALESCE(profile_user.role::TEXT, 'rep');

    -- Determine next action and redirect URL
    IF auth_user.id IS NULL THEN
        -- No auth user found
        RETURN QUERY SELECT
            false, false, false, false, 
            '', '', 'rep', true, 
            'login'::TEXT,
            '/login'::TEXT;
        RETURN;
    END IF;

    IF profile_user.id IS NULL THEN
        -- Auth user exists but no profile
        RETURN QUERY SELECT
            true, false, false, false,
            COALESCE(auth_user.email, ''), '', 'rep', true,
            'create-profile'::TEXT,
            '/password-setup'::TEXT;
        RETURN;
    END IF;

    IF NOT COALESCE(profile_user.password_set, false) THEN
        -- Profile exists but password not set
        RETURN QUERY SELECT
            true, true, false, COALESCE(profile_user.profile_completed, false),
            COALESCE(auth_user.email, ''), COALESCE(profile_user.full_name, ''), user_role_text, true,
            'set-password'::TEXT,
            '/password-setup'::TEXT;
        RETURN;
    END IF;

    IF NOT COALESCE(profile_user.profile_completed, false) OR COALESCE(profile_user.full_name, '') = '' THEN
        -- Password set but profile incomplete
        RETURN QUERY SELECT
            true, true, true, false,
            COALESCE(auth_user.email, ''), COALESCE(profile_user.full_name, ''), user_role_text, true,
            'complete-profile'::TEXT,
            '/password-setup'::TEXT;
        RETURN;
    END IF;

    -- Fully set up user - redirect to appropriate dashboard
    RETURN QUERY SELECT
        true, true, true, true,
        COALESCE(auth_user.email, ''), COALESCE(profile_user.full_name, ''), user_role_text, false,
        'dashboard'::TEXT,
        CASE 
            WHEN user_role_text = 'super_admin' THEN '/super-admin-dashboard'
            WHEN user_role_text = 'admin' THEN '/admin-dashboard'
            WHEN user_role_text = 'manager' THEN '/manager-dashboard'
            ELSE '/today'
        END::TEXT;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            false, false, false, false, 
            '', '', 'rep', true, 
            'error'::TEXT,
            '/login'::TEXT;
END;
$$;

-- 4. Enhanced function for admin user creation workflow
CREATE OR REPLACE FUNCTION public.create_admin_user_with_workflow(
    user_email text,
    user_full_name text,
    user_role text DEFAULT 'admin',
    user_phone text DEFAULT NULL,
    user_organization text DEFAULT NULL,
    temp_password text DEFAULT 'TempPass123!'
)
RETURNS TABLE(success boolean, message text, user_id uuid, confirmation_needed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    default_tenant_id UUID;
    current_user_role TEXT;
BEGIN
    -- Check if current user has permission to create admin users
    SELECT up.role::TEXT INTO current_user_role
    FROM public.user_profiles up
    WHERE up.id = auth.uid();

    IF current_user_role NOT IN ('super_admin', 'admin') THEN
        RETURN QUERY SELECT FALSE, 'Insufficient permissions to create admin users'::TEXT, NULL::UUID, FALSE;
        RETURN;
    END IF;

    -- Generate new user ID
    new_user_id := gen_random_uuid();

    -- Get default tenant for assignment
    SELECT id INTO default_tenant_id
    FROM public.tenants
    WHERE status = 'active'::tenant_status
    ORDER BY created_at ASC
    LIMIT 1;

    IF default_tenant_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No active tenant found for user assignment'::TEXT, NULL::UUID, FALSE;
        RETURN;
    END IF;

    -- Create auth user with temporary password
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, created_at, updated_at, 
        raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES (
        new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        user_email, crypt(temp_password, gen_salt('bf', 10)), 
        NOW(), NOW(), NOW(),
        jsonb_build_object('full_name', user_full_name, 'role', user_role),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        false, false, '', null, '', null, '', '', null, '', 0, 
        '', null, user_phone, '', '', null
    );

    -- Create user profile
    INSERT INTO public.user_profiles (
        id, email, full_name, role, phone, organization, tenant_id,
        is_active, password_set, profile_completed,
        created_at, updated_at
    ) VALUES (
        new_user_id, user_email, user_full_name, 
        user_role::public.user_role, user_phone, user_organization, default_tenant_id,
        true, false, false,  -- Requires password setup and profile completion
        NOW(), NOW()
    );

    RETURN QUERY SELECT 
        TRUE, 
        'Admin user created successfully. User must set password and confirm setup on first login.'::TEXT, 
        new_user_id,
        TRUE;  -- confirmation_needed = true

EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT FALSE, 'User with this email already exists'::TEXT, NULL::UUID, FALSE;
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, ('Error creating admin user: ' || SQLERRM)::TEXT, NULL::UUID, FALSE;
END;
$$;

-- 5. Function to handle password setup completion
CREATE OR REPLACE FUNCTION public.complete_password_setup(
    user_uuid uuid,
    mark_password_complete boolean DEFAULT true
)
RETURNS TABLE(success boolean, message text, next_step text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_complete BOOLEAN := FALSE;
    user_name TEXT := '';
BEGIN
    -- Check current profile status
    SELECT 
        COALESCE(up.profile_completed, false),
        COALESCE(up.full_name, '')
    INTO profile_complete, user_name
    FROM public.user_profiles up
    WHERE up.id = user_uuid;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User profile not found'::TEXT, 'error'::TEXT;
        RETURN;
    END IF;

    -- Mark password as set
    IF mark_password_complete THEN
        UPDATE public.user_profiles
        SET 
            password_set = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = user_uuid;
    END IF;

    -- Determine next step
    IF profile_complete AND user_name != '' THEN
        RETURN QUERY SELECT TRUE, 'Password setup completed successfully!'::TEXT, 'dashboard'::TEXT;
    ELSE
        RETURN QUERY SELECT TRUE, 'Password set. Please complete your profile information.'::TEXT, 'complete-profile'::TEXT;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, ('Error completing password setup: ' || SQLERRM)::TEXT, 'error'::TEXT;
END;
$$;

-- 6. Function to resend confirmation email workflow
CREATE OR REPLACE FUNCTION public.resend_confirmation_workflow(user_email text)
RETURNS TABLE(success boolean, message text, requires_signup boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_exists BOOLEAN := FALSE;
    profile_exists BOOLEAN := FALSE;
    email_confirmed BOOLEAN := FALSE;
BEGIN
    -- Check if auth user exists and is confirmed
    SELECT 
        (au.id IS NOT NULL),
        (au.email_confirmed_at IS NOT NULL)
    INTO auth_user_exists, email_confirmed
    FROM auth.users au
    WHERE au.email = user_email;

    -- Check if profile exists
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles up WHERE up.email = user_email
    ) INTO profile_exists;

    IF NOT auth_user_exists THEN
        RETURN QUERY SELECT FALSE, 'No account found with this email. Please sign up first.'::TEXT, TRUE;
        RETURN;
    END IF;

    IF email_confirmed THEN
        RETURN QUERY SELECT TRUE, 'Your email is already confirmed. You can proceed to login or complete setup.'::TEXT, FALSE;
        RETURN;
    END IF;

    -- User exists but email not confirmed - they need a new confirmation email
    -- Note: The actual email sending would be handled by the client-side Supabase auth
    RETURN QUERY SELECT TRUE, 'Confirmation email will be resent. Please check your inbox and spam folder.'::TEXT, FALSE;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, ('Error checking confirmation status: ' || SQLERRM)::TEXT, FALSE;
END;
$$;

-- Comment: No additional RLS policies needed as these functions use SECURITY DEFINER
-- and the existing RLS policies on user_profiles and auth.users are sufficient