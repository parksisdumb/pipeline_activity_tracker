-- Enhanced Authentication Workflow Migration
-- Fixes user creation workflow issues and adds temporary password support

BEGIN;

-- Add temporary password support columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS temp_password_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ DEFAULT null,
ADD COLUMN IF NOT EXISTS security_question TEXT DEFAULT null,
ADD COLUMN IF NOT EXISTS security_answer_hash TEXT DEFAULT null,
ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_temp_password_used 
ON public.user_profiles(temp_password_used);

CREATE INDEX IF NOT EXISTS idx_user_profiles_temp_password_expires 
ON public.user_profiles(temp_password_expires_at);

CREATE INDEX IF NOT EXISTS idx_user_profiles_confirmation_status 
ON public.user_profiles(confirmation_status);

-- Function to create user with temporary password workflow
CREATE OR REPLACE FUNCTION public.create_user_with_temp_password(
    user_email TEXT,
    user_full_name TEXT,
    user_role TEXT DEFAULT 'rep',
    user_phone TEXT DEFAULT NULL,
    user_organization TEXT DEFAULT NULL,
    target_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID,
    temp_password TEXT,
    needs_confirmation BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    generated_temp_password TEXT;
    assigned_tenant_id UUID;
    current_user_role TEXT;
BEGIN
    -- Check if current user has permission to create users
    SELECT up.role::TEXT INTO current_user_role
    FROM public.user_profiles up
    WHERE up.id = auth.uid();

    IF current_user_role NOT IN ('super_admin', 'admin') THEN
        RETURN QUERY SELECT FALSE, 'Insufficient permissions to create users'::TEXT, NULL::UUID, ''::TEXT, FALSE;
        RETURN;
    END IF;

    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE email = user_email) THEN
        RETURN QUERY SELECT FALSE, 'User with this email already exists'::TEXT, NULL::UUID, ''::TEXT, FALSE;
        RETURN;
    END IF;

    -- Generate secure temporary password
    generated_temp_password := 'Temp' || substr(md5(random()::text), 1, 8) || '!' || extract(epoch from now())::int % 100;
    
    -- Generate new user ID
    new_user_id := gen_random_uuid();

    -- Determine tenant assignment
    assigned_tenant_id := COALESCE(
        target_tenant_id,
        (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()),
        (SELECT id FROM public.tenants WHERE status = 'active'::tenant_status ORDER BY created_at ASC LIMIT 1)
    );

    IF assigned_tenant_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'No valid tenant found for user assignment'::TEXT, NULL::UUID, ''::TEXT, FALSE;
        RETURN;
    END IF;

    -- Create auth user with temporary password
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, created_at, updated_at, 
        raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous
    ) VALUES (
        new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        user_email, crypt(generated_temp_password, gen_salt('bf', 10)), 
        NULL, -- Email not confirmed yet
        NOW(), NOW(),
        jsonb_build_object('full_name', user_full_name, 'role', user_role, 'setup_required', true),
        jsonb_build_object('provider', 'temp_password', 'providers', ARRAY['temp_password']),
        false, false
    );

    -- Create user profile with temporary password flags
    INSERT INTO public.user_profiles (
        id, email, full_name, role, phone, organization, tenant_id,
        is_active, password_set, profile_completed,
        temp_password_used, temp_password_expires_at, confirmation_status,
        created_at, updated_at
    ) VALUES (
        new_user_id, user_email, user_full_name, 
        user_role::public.user_role, user_phone, user_organization, assigned_tenant_id,
        true, false, false,  -- User needs to set permanent password and complete profile
        false, NOW() + INTERVAL '7 days', 'pending',  -- Temp password expires in 7 days
        NOW(), NOW()
    );

    RETURN QUERY SELECT 
        TRUE, 
        'User created successfully with temporary password'::TEXT, 
        new_user_id,
        generated_temp_password,
        TRUE;  -- needs_confirmation = true

EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT FALSE, 'User with this email already exists'::TEXT, NULL::UUID, ''::TEXT, FALSE;
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, ('Error creating user: ' || SQLERRM)::TEXT, NULL::UUID, ''::TEXT, FALSE;
END;
$$;

-- Function to handle temporary password verification and setup
CREATE OR REPLACE FUNCTION public.verify_temp_password_and_setup(
    user_email TEXT,
    temp_password TEXT,
    security_question TEXT DEFAULT NULL,
    security_answer TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID,
    needs_password_setup BOOLEAN,
    needs_profile_completion BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    stored_password TEXT;
    is_temp_expired BOOLEAN := FALSE;
    profile_complete BOOLEAN := FALSE;
    password_is_set BOOLEAN := FALSE;
BEGIN
    -- Find user and check temporary password status
    SELECT 
        up.id,
        COALESCE(up.profile_completed, false),
        COALESCE(up.password_set, false),
        (up.temp_password_expires_at < NOW())
    INTO 
        target_user_id, profile_complete, password_is_set, is_temp_expired
    FROM public.user_profiles up
    WHERE up.email = user_email AND up.is_active = true;

    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User not found or inactive'::TEXT, NULL::UUID, FALSE, FALSE;
        RETURN;
    END IF;

    -- Check if temporary password has expired
    IF is_temp_expired THEN
        RETURN QUERY SELECT FALSE, 'Temporary password has expired. Please request a new one.'::TEXT, target_user_id, FALSE, FALSE;
        RETURN;
    END IF;

    -- Verify password against auth.users
    SELECT au.encrypted_password INTO stored_password
    FROM auth.users au
    WHERE au.id = target_user_id;

    -- Use crypt to verify password
    IF NOT (crypt(temp_password, stored_password) = stored_password) THEN
        RETURN QUERY SELECT FALSE, 'Invalid temporary password'::TEXT, target_user_id, FALSE, FALSE;
        RETURN;
    END IF;

    -- Store security question/answer if provided
    IF security_question IS NOT NULL AND security_answer IS NOT NULL THEN
        UPDATE public.user_profiles
        SET 
            security_question = verify_temp_password_and_setup.security_question,
            security_answer_hash = crypt(security_answer, gen_salt('bf', 10)),
            updated_at = NOW()
        WHERE id = target_user_id;
    END IF;

    -- Mark temporary password as used
    UPDATE public.user_profiles
    SET 
        temp_password_used = true,
        confirmation_status = 'verified',
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN QUERY SELECT 
        TRUE, 
        'Temporary password verified successfully'::TEXT,
        target_user_id,
        NOT password_is_set,  -- needs_password_setup
        NOT profile_complete; -- needs_profile_completion

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            ('Error verifying temporary password: ' || SQLERRM)::TEXT,
            NULL::UUID,
            FALSE,
            FALSE;
END;
$$;

-- Enhanced function to handle email confirmation with better redirect logic
CREATE OR REPLACE FUNCTION public.handle_email_confirmation_workflow(
    user_id UUID, 
    user_email TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    next_step TEXT,
    needs_password_setup BOOLEAN,
    needs_profile_completion BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    profile_complete BOOLEAN := FALSE;
    password_is_set BOOLEAN := FALSE;
    user_full_name TEXT := '';
    temp_password_used BOOLEAN := FALSE;
    confirmation_status TEXT := 'pending';
BEGIN
    -- Check if user profile exists and get current state
    SELECT 
        (up.id IS NOT NULL),
        COALESCE(up.profile_completed, false),
        COALESCE(up.password_set, false),
        COALESCE(up.full_name, ''),
        COALESCE(up.temp_password_used, false),
        COALESCE(up.confirmation_status, 'pending')
    INTO 
        profile_exists, profile_complete, password_is_set, user_full_name, temp_password_used, confirmation_status
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

    -- Update confirmation status
    UPDATE public.user_profiles
    SET 
        confirmation_status = 'confirmed',
        updated_at = NOW()
    WHERE id = user_id;

    -- Determine next step based on user state
    IF temp_password_used AND NOT password_is_set THEN
        -- User used temporary password but hasn't set permanent password
        RETURN QUERY SELECT 
            TRUE, 
            'Email confirmed. Please set your permanent password and complete your profile.'::TEXT,
            'setup-password'::TEXT,
            TRUE,  -- needs_password_setup
            NOT profile_complete OR user_full_name = '';  -- needs_profile_completion
    ELSIF NOT password_is_set AND NOT profile_complete THEN
        -- User needs both password and profile setup
        RETURN QUERY SELECT 
            TRUE, 
            'Email confirmed. Please set your password and complete your profile.'::TEXT,
            'setup-password'::TEXT,
            TRUE,  -- needs_password_setup
            TRUE;  -- needs_profile_completion
    ELSIF NOT password_is_set THEN
        -- User only needs password setup
        RETURN QUERY SELECT 
            TRUE, 
            'Email confirmed. Please set your password to complete setup.'::TEXT,
            'setup-password'::TEXT,
            TRUE,  -- needs_password_setup
            FALSE; -- needs_profile_completion
    ELSIF NOT profile_complete OR user_full_name = '' THEN
        -- User only needs profile completion
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

-- Function to generate and assign temporary password for existing user
CREATE OR REPLACE FUNCTION public.generate_temp_password_for_user(
    user_email TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    temp_password TEXT,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    generated_temp_password TEXT;
    expiry_date TIMESTAMPTZ;
    current_user_role TEXT;
BEGIN
    -- Check if current user has permission
    SELECT up.role::TEXT INTO current_user_role
    FROM public.user_profiles up
    WHERE up.id = auth.uid();

    IF current_user_role NOT IN ('super_admin', 'admin') THEN
        RETURN QUERY SELECT FALSE, 'Insufficient permissions'::TEXT, ''::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Find the target user
    SELECT id INTO target_user_id
    FROM public.user_profiles
    WHERE email = user_email AND is_active = true;

    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, ''::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Generate new temporary password
    generated_temp_password := 'Temp' || substr(md5(random()::text), 1, 8) || '!' || extract(epoch from now())::int % 100;
    expiry_date := NOW() + INTERVAL '7 days';

    -- Update auth.users with new temporary password
    UPDATE auth.users
    SET 
        encrypted_password = crypt(generated_temp_password, gen_salt('bf', 10)),
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Update user profile
    UPDATE public.user_profiles
    SET 
        temp_password_used = false,
        temp_password_expires_at = expiry_date,
        confirmation_status = 'temp_password_assigned',
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN QUERY SELECT 
        TRUE, 
        'Temporary password generated successfully'::TEXT,
        generated_temp_password,
        expiry_date;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, 
            ('Error generating temporary password: ' || SQLERRM)::TEXT,
            ''::TEXT,
            NULL::TIMESTAMPTZ;
END;
$$;

-- Add comment for migration tracking
COMMENT ON FUNCTION public.create_user_with_temp_password IS 'Enhanced user creation with temporary password support for admin workflows';
COMMENT ON FUNCTION public.verify_temp_password_and_setup IS 'Verifies temporary password and determines next setup steps';
COMMENT ON FUNCTION public.generate_temp_password_for_user IS 'Generates new temporary password for existing users';

COMMIT;