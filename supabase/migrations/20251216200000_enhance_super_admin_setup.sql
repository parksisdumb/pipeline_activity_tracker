-- Migration: Enhance Super Admin Setup and Authentication
-- Description: Fix super admin role detection and authentication issues

-- 1. Update the user with email 'team@dillyos.com' to ensure proper super_admin setup
UPDATE auth.users 
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb,
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb,
  updated_at = now()
WHERE email = 'team@dillyos.com';

-- 2. Update user profile for the super admin user to ensure role consistency
UPDATE public.user_profiles 
SET 
  role = 'super_admin'::public.user_role,
  updated_at = now()
WHERE email = 'team@dillyos.com';

-- 3. Create or update super admin profile if it doesn't exist
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  tenant_id,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Super Admin'),
  'super_admin'::public.user_role,
  NULL, -- Super admin can be cross-tenant
  true,
  now(),
  now()
FROM auth.users au
WHERE au.email = 'team@dillyos.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.email = 'team@dillyos.com'
  );

-- 4. Enhanced super admin detection function with better fallbacks
CREATE OR REPLACE FUNCTION public.is_super_admin_from_auth()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
SELECT EXISTS (
  SELECT 1 FROM auth.users au
  JOIN public.user_profiles up ON au.id = up.id
  WHERE au.id = auth.uid() 
  AND (
    -- Check auth metadata first
    au.raw_user_meta_data->>'role' = 'super_admin' 
    OR au.raw_app_meta_data->>'role' = 'super_admin'
    OR au.raw_user_meta_data->>'role' = 'master_admin'
    OR au.raw_app_meta_data->>'role' = 'master_admin'
    -- Then check profile table
    OR up.role = 'super_admin'
    -- Special email check for the super admin account
    OR au.email = 'team@dillyos.com'
  )
);
$function$;

-- 5. Create function to sync auth metadata with profile role
CREATE OR REPLACE FUNCTION public.sync_super_admin_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- If user profile role is super_admin, update auth metadata
  IF NEW.role = 'super_admin' THEN
    UPDATE auth.users
    SET 
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb,
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "super_admin"}'::jsonb,
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 6. Create trigger to keep auth and profile in sync
DROP TRIGGER IF EXISTS sync_super_admin_metadata_trigger ON public.user_profiles;
CREATE TRIGGER sync_super_admin_metadata_trigger
  AFTER INSERT OR UPDATE OF role ON public.user_profiles
  FOR EACH ROW
  WHEN (NEW.role = 'super_admin')
  EXECUTE FUNCTION public.sync_super_admin_metadata();

-- 7. Create function to get user role with super admin priority
CREATE OR REPLACE FUNCTION public.get_user_role_with_super_admin()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
SELECT CASE 
  WHEN public.is_super_admin_from_auth() THEN 'super_admin'
  ELSE COALESCE(
    (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()),
    'rep'
  )
END;
$function$;

-- 8. Add RLS policy for super admin access to all tables
DO $$ 
DECLARE
  table_record RECORD;
BEGIN
  -- Add super admin policies to all main tables
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('user_profiles', 'tenants', 'accounts', 'contacts', 'properties', 'activities', 'weekly_goals')
  LOOP
    -- Drop existing super admin policies if they exist
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS super_admin_full_access_' || table_record.table_name || ' ON public.' || table_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore errors if policy doesn't exist
    END;
    
    -- Create new super admin policy
    EXECUTE 'CREATE POLICY super_admin_full_access_' || table_record.table_name || ' ON public.' || table_record.table_name || '
      FOR ALL 
      TO authenticated
      USING (public.is_super_admin_from_auth())
      WITH CHECK (public.is_super_admin_from_auth())';
  END LOOP;
END $$;

-- 9. Create sample data verification function for super admin
CREATE OR REPLACE FUNCTION public.verify_super_admin_setup()
RETURNS TABLE(
  auth_user_exists boolean,
  profile_exists boolean,
  role_in_auth text,
  role_in_profile text,
  can_access_super_admin boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
SELECT 
  (SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'team@dillyos.com')) as auth_user_exists,
  (SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE email = 'team@dillyos.com')) as profile_exists,
  (SELECT COALESCE(raw_user_meta_data->>'role', raw_app_meta_data->>'role', 'none') FROM auth.users WHERE email = 'team@dillyos.com') as role_in_auth,
  (SELECT role::text FROM public.user_profiles WHERE email = 'team@dillyos.com') as role_in_profile,
  (SELECT public.is_super_admin_from_auth() FROM auth.users WHERE email = 'team@dillyos.com' AND id = auth.uid()) as can_access_super_admin;
$function$;

-- 10. Final verification and logging
DO $$
DECLARE
  verification_result RECORD;
BEGIN
  -- Log the migration completion
  RAISE NOTICE 'Super Admin Enhancement Migration Completed';
  RAISE NOTICE 'Migration enhances super admin role detection and authentication';
  RAISE NOTICE 'Super admin user: team@dillyos.com should now have proper access';
  
  -- Verify the setup
  SELECT * INTO verification_result FROM public.verify_super_admin_setup() LIMIT 1;
  
  IF verification_result IS NOT NULL THEN
    RAISE NOTICE 'Super Admin Setup Verification:';
    RAISE NOTICE '- Auth user exists: %', verification_result.auth_user_exists;
    RAISE NOTICE '- Profile exists: %', verification_result.profile_exists;
    RAISE NOTICE '- Role in auth: %', verification_result.role_in_auth;
    RAISE NOTICE '- Role in profile: %', verification_result.role_in_profile;
  END IF;
END $$;