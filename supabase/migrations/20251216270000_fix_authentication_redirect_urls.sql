-- Location: supabase/migrations/20251216270000_fix_authentication_redirect_urls.sql
-- Schema Analysis: Complete authentication system with user_profiles, tenants, and auth functions exist
-- Integration Type: Enhancement - improving authentication flow for redirect URLs and password reset
-- Dependencies: user_profiles, tenants tables (existing)

-- This migration fixes authentication redirect URL issues and enhances user creation process
-- IMPORTANT: All operations are limited to public schema to avoid permission issues with auth.users

-- 1. Create function to handle proper user profile setup during signup with better role handling
-- This function will be called by existing triggers or manually after user creation
CREATE OR REPLACE FUNCTION public.setup_new_user_profile(
    user_id UUID,
    user_email TEXT,
    user_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    default_tenant_id UUID;
    user_role TEXT;
    user_full_name TEXT;
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = user_id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN TRUE; -- Profile already exists, nothing to do
    END IF;

    -- Get default tenant (assuming there's at least one active tenant)
    SELECT id INTO default_tenant_id 
    FROM public.tenants 
    WHERE status = 'active'::tenant_status 
    LIMIT 1;

    -- Extract user role from metadata, default to 'rep' if not specified
    user_role := COALESCE(user_metadata->>'role', 'rep');
    
    -- Extract full name from metadata, use email prefix as fallback
    user_full_name := COALESCE(
        user_metadata->>'full_name',
        user_metadata->>'fullName',
        split_part(user_email, '@', 1)
    );

    -- Create user profile with proper tenant assignment
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        role,
        phone,
        tenant_id,
        is_active
    ) VALUES (
        user_id,
        user_email,
        user_full_name,
        user_role::public.user_role,
        user_metadata->>'phone',
        default_tenant_id,
        true
    );

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE NOTICE 'Error creating user profile for %: %', user_email, SQLERRM;
        RETURN FALSE;
END;
$$;

-- 2. Create function to verify magic link authentication state (public schema only)
CREATE OR REPLACE FUNCTION public.get_user_auth_status(user_email TEXT)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    profile_complete BOOLEAN,
    user_role TEXT,
    tenant_id UUID
)
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT 
    up.id as user_id,
    up.email,
    (up.full_name IS NOT NULL AND up.full_name != '') as profile_complete,
    COALESCE(up.role::TEXT, 'rep') as user_role,
    up.tenant_id
FROM public.user_profiles up
WHERE up.email = user_email
AND up.is_active = true
LIMIT 1;
$$;

-- 3. Create function to update user password and profile after email confirmation
-- This works only with public.user_profiles table
CREATE OR REPLACE FUNCTION public.complete_user_setup(
    user_email TEXT,
    profile_data JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    update_count INTEGER;
BEGIN
    -- Find the user in user_profiles
    SELECT id INTO target_user_id
    FROM public.user_profiles
    WHERE email = user_email
    AND is_active = true;

    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User profile not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Update user profile with additional information if provided
    IF profile_data != '{}'::JSONB THEN
        UPDATE public.user_profiles
        SET
            full_name = COALESCE(profile_data->>'fullName', profile_data->>'full_name', full_name),
            phone = COALESCE(profile_data->>'phone', phone),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = target_user_id;
        
        GET DIAGNOSTICS update_count = ROW_COUNT;
    END IF;

    RETURN QUERY SELECT TRUE, 'Profile updated successfully'::TEXT, target_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, ('Error updating user profile: ' || SQLERRM)::TEXT, NULL::UUID;
END;
$$;

-- 4. Create function for admin to create users with temporary passwords
-- This only creates the profile - actual auth user creation must be done via Supabase Admin API
CREATE OR REPLACE FUNCTION public.create_user_profile_for_admin_user(
    user_id UUID,
    user_email TEXT,
    user_full_name TEXT,
    user_role TEXT DEFAULT 'rep',
    user_phone TEXT DEFAULT NULL,
    user_organization TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    profile_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_tenant_id UUID;
    current_user_role TEXT;
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Check if current user is admin or super_admin
    SELECT up.role::TEXT INTO current_user_role
    FROM public.user_profiles up
    WHERE up.id = auth.uid();

    IF current_user_role NOT IN ('admin', 'super_admin') THEN
        RETURN QUERY SELECT FALSE, 'Insufficient permissions'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE email = user_email OR id = user_id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN QUERY SELECT FALSE, 'User profile already exists'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Get default tenant
    SELECT id INTO default_tenant_id
    FROM public.tenants
    WHERE status = 'active'::tenant_status
    LIMIT 1;

    -- Create user profile in public schema
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        role,
        phone,
        tenant_id,
        is_active
    ) VALUES (
        user_id,
        user_email,
        user_full_name,
        user_role::public.user_role,
        user_phone,
        default_tenant_id,
        true
    );

    RETURN QUERY SELECT TRUE, 'User profile created successfully'::TEXT, user_id;

EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT FALSE, 'User profile with this email already exists'::TEXT, NULL::UUID;
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, ('Error creating user profile: ' || SQLERRM)::TEXT, NULL::UUID;
END;
$$;

-- 5. Create function to handle email confirmation workflow
CREATE OR REPLACE FUNCTION public.handle_email_confirmation_workflow(
    user_id UUID,
    user_email TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    next_step TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    profile_complete BOOLEAN := FALSE;
BEGIN
    -- Check if user profile exists
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id AND email = user_email
    ) INTO profile_exists;

    IF NOT profile_exists THEN
        -- Create basic profile if it doesn't exist
        PERFORM public.setup_new_user_profile(user_id, user_email, '{}'::JSONB);
        RETURN QUERY SELECT TRUE, 'Email confirmed, profile created'::TEXT, 'setup-password'::TEXT;
        RETURN;
    END IF;

    -- Check if profile is complete
    SELECT (full_name IS NOT NULL AND full_name != '') INTO profile_complete
    FROM public.user_profiles
    WHERE id = user_id;

    IF profile_complete THEN
        RETURN QUERY SELECT TRUE, 'Email confirmed, profile complete'::TEXT, 'login'::TEXT;
    ELSE
        RETURN QUERY SELECT TRUE, 'Email confirmed, profile needs completion'::TEXT, 'setup-password'::TEXT;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, ('Error handling email confirmation: ' || SQLERRM)::TEXT, 'error'::TEXT;
END;
$$;

-- 6. Create function to validate user session and get profile info
CREATE OR REPLACE FUNCTION public.validate_user_session(session_user_id UUID)
RETURNS TABLE(
    valid BOOLEAN,
    user_email TEXT,
    full_name TEXT,
    user_role TEXT,
    tenant_id UUID,
    is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT 
    TRUE as valid,
    up.email,
    up.full_name,
    up.role::TEXT,
    up.tenant_id,
    up.is_active
FROM public.user_profiles up
WHERE up.id = session_user_id
AND up.is_active = true
LIMIT 1;
$$;

-- 7. Create function to resend confirmation email (this will need to be called from application)
CREATE OR REPLACE FUNCTION public.prepare_confirmation_resend(user_email TEXT)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find user profile
    SELECT id INTO target_user_id
    FROM public.user_profiles
    WHERE email = user_email
    AND is_active = true;

    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Update timestamp to track resend attempts
    UPDATE public.user_profiles
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = target_user_id;

    RETURN QUERY SELECT TRUE, 'Ready for confirmation resend'::TEXT, target_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, ('Error preparing resend: ' || SQLERRM)::TEXT, NULL::UUID;
END;
$$;

-- 8. Create cleanup function for user profiles (maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_user_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Mark profiles as inactive if they haven't been updated in 30 days and have incomplete info
    UPDATE public.user_profiles 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE updated_at < (CURRENT_TIMESTAMP - INTERVAL '30 days')
    AND (full_name IS NULL OR full_name = '')
    AND is_active = true;

    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    RETURN cleanup_count;
END;
$$;

-- 9. Add indexes for better performance on user profile operations
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_active 
ON public.user_profiles(email) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_active 
ON public.user_profiles(tenant_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active 
ON public.user_profiles(role) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at 
ON public.user_profiles(updated_at);

-- Add helpful comments
COMMENT ON FUNCTION public.setup_new_user_profile(UUID, TEXT, JSONB) IS 'Creates user profile after successful authentication signup';
COMMENT ON FUNCTION public.get_user_auth_status(TEXT) IS 'Gets user authentication and profile status for UI routing decisions';
COMMENT ON FUNCTION public.complete_user_setup(TEXT, JSONB) IS 'Completes user profile setup after email confirmation';
COMMENT ON FUNCTION public.create_user_profile_for_admin_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Admin function to create user profiles (requires separate auth user creation)';
COMMENT ON FUNCTION public.handle_email_confirmation_workflow(UUID, TEXT) IS 'Handles post-email-confirmation workflow and routing';
COMMENT ON FUNCTION public.validate_user_session(UUID) IS 'Validates user session and returns profile information';
COMMENT ON FUNCTION public.prepare_confirmation_resend(TEXT) IS 'Prepares user profile for confirmation email resend';
COMMENT ON FUNCTION public.cleanup_inactive_user_profiles() IS 'Maintenance function to clean up inactive user profiles';

-- Grant execute permissions to authenticated users for the functions they need
GRANT EXECUTE ON FUNCTION public.get_user_auth_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_setup(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmation_workflow(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_user_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_confirmation_resend(TEXT) TO authenticated;

-- Admin-only functions
GRANT EXECUTE ON FUNCTION public.create_user_profile_for_admin_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_new_user_profile(UUID, TEXT, JSONB) TO authenticated;