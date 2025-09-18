-- Location: supabase/migrations/20251218173900_fix_authentication_system.sql
-- Schema Analysis: user_profiles table exists but missing critical auth columns
-- Integration Type: Modificative - Adding missing columns and functions
-- Dependencies: Existing user_profiles, tenants tables

-- 1. Add missing columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS organization TEXT;

-- Add index for password_set column for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_password_set 
ON public.user_profiles(password_set);

-- 2. Update the existing handle_new_user function to include new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    role, 
    tenant_id, 
    password_set, 
    profile_completed,
    organization
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'rep'::public.user_role
    ),
    -- Get the first active tenant or create a default one
    COALESCE(
      (SELECT id FROM public.tenants WHERE tenant_status = 'active' LIMIT 1),
      (SELECT id FROM public.tenants LIMIT 1)
    ),
    false, -- password_set defaults to false
    false, -- profile_completed defaults to false
    NEW.raw_user_meta_data->>'organization'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create function to complete user profile setup
CREATE OR REPLACE FUNCTION public.complete_user_profile_setup(
  user_uuid UUID,
  full_name_param TEXT,
  organization_param TEXT DEFAULT NULL,
  role_param TEXT DEFAULT 'rep'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user profile with complete information
  UPDATE public.user_profiles
  SET 
    full_name = full_name_param,
    organization = organization_param,
    role = role_param::public.user_role,
    profile_completed = true,
    password_set = true,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = user_uuid;

  -- Check if update was successful
  IF FOUND THEN
    RETURN QUERY SELECT true, 'Profile setup completed successfully'::TEXT;
  ELSE
    RETURN QUERY SELECT false, 'User profile not found'::TEXT;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error updating profile: ' || SQLERRM)::TEXT;
END;
$$;

-- 4. Create function to send password setup email
CREATE OR REPLACE FUNCTION public.send_password_setup_email(
  user_email TEXT,
  redirect_url TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_id UUID;
  default_redirect TEXT;
BEGIN
  -- Get current origin for proper redirect URL
  default_redirect := COALESCE(
    redirect_url,
    (SELECT CASE 
      WHEN current_setting('request.headers', true)::json->>'host' IS NOT NULL 
      THEN 'https://' || (current_setting('request.headers', true)::json->>'host') || '/password-setup'
      ELSE 'https://localhost:3000/password-setup'
    END)
  );

  -- Get user ID from auth.users
  SELECT id INTO auth_user_id 
  FROM auth.users 
  WHERE email = user_email 
  LIMIT 1;

  IF auth_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found with that email address'::TEXT;
    RETURN;
  END IF;

  -- Update user_profiles to indicate password setup is needed
  UPDATE public.user_profiles
  SET 
    password_set = false,
    profile_completed = false,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = auth_user_id;

  RETURN QUERY SELECT true, 'Password setup process initiated'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error initiating password setup: ' || SQLERRM)::TEXT;
END;
$$;

-- 5. Create new function with different name to avoid conflicts
CREATE OR REPLACE FUNCTION public.get_user_authentication_status(
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE(
  user_exists BOOLEAN,
  profile_exists BOOLEAN,
  password_set BOOLEAN,
  profile_completed BOOLEAN,
  email TEXT,
  full_name TEXT,
  role TEXT,
  needs_setup BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user auth.users%ROWTYPE;
  profile_user public.user_profiles%ROWTYPE;
BEGIN
  -- Get auth user
  SELECT * INTO auth_user FROM auth.users WHERE id = user_uuid;
  
  -- Get profile user
  SELECT * INTO profile_user FROM public.user_profiles WHERE id = user_uuid;

  RETURN QUERY SELECT
    (auth_user.id IS NOT NULL)::BOOLEAN,
    (profile_user.id IS NOT NULL)::BOOLEAN,
    COALESCE(profile_user.password_set, false)::BOOLEAN,
    COALESCE(profile_user.profile_completed, false)::BOOLEAN,
    COALESCE(auth_user.email, '')::TEXT,
    COALESCE(profile_user.full_name, '')::TEXT,
    COALESCE(profile_user.role::TEXT, 'rep')::TEXT,
    (
      auth_user.id IS NOT NULL AND 
      (profile_user.id IS NULL OR NOT profile_user.password_set OR NOT profile_user.profile_completed)
    )::BOOLEAN;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, false, false, false, '', '', 'rep', true;
END;
$$;

-- 6. Update existing user profiles to have proper defaults where missing
UPDATE public.user_profiles
SET 
  password_set = COALESCE(password_set, true),  -- Assume existing users have passwords
  profile_completed = COALESCE(profile_completed, true)  -- Assume existing profiles are complete
WHERE password_set IS NULL OR profile_completed IS NULL;

-- 7. Create admin function to force password reset for users
CREATE OR REPLACE FUNCTION public.admin_force_password_reset(
  target_email TEXT,
  admin_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  is_admin BOOLEAN := false;
BEGIN
  -- Check if current user is admin or super_admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = admin_user_id 
    AND role IN ('admin', 'super_admin')
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN QUERY SELECT false, 'Insufficient permissions'::TEXT;
    RETURN;
  END IF;

  -- Get target user ID
  SELECT au.id INTO target_user_id
  FROM auth.users au
  WHERE au.email = target_email;

  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Reset password flags
  UPDATE public.user_profiles
  SET 
    password_set = false,
    profile_completed = false,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = target_user_id;

  RETURN QUERY SELECT true, 'Password reset initiated for user'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Error during password reset: ' || SQLERRM)::TEXT;
END;
$$;

-- 8. Create function to check if user needs password setup
CREATE OR REPLACE FUNCTION public.user_needs_password_setup(
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT NOT COALESCE(
  (SELECT password_set FROM public.user_profiles WHERE id = user_uuid),
  false
);
$$;

-- 9. Create function to check if user profile is complete
CREATE OR REPLACE FUNCTION public.user_profile_is_complete(
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
  (SELECT profile_completed FROM public.user_profiles WHERE id = user_uuid),
  false
);
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.complete_user_profile_setup TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_password_setup_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_authentication_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_password_reset TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_needs_password_setup TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_profile_is_complete TO authenticated;