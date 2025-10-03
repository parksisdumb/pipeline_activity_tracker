-- Location: supabase/migrations/20251003183001_final_rls_fix_no_user_profiles_queries.sql
-- Schema Analysis: Final RLS policy fix - completely eliminate user_profiles queries from RLS context
-- Integration Type: CORRECTIVE - Fix circular dependency issues in RLS policies  
-- Dependencies: auth.users metadata must contain role information

-- STEP 0: Drop ALL current policies to start fresh
-- This ensures no residual policies interfere

-- Drop user_profiles policies  
DROP POLICY IF EXISTS "user_profiles_self_access" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_access" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_manager_read" ON public.user_profiles;

-- Drop prospects policies
DROP POLICY IF EXISTS "prospects_owner_access" ON public.prospects;
DROP POLICY IF EXISTS "prospects_admin_access" ON public.prospects; 
DROP POLICY IF EXISTS "prospects_manager_access" ON public.prospects;

-- Drop accounts policies
DROP POLICY IF EXISTS "accounts_owner_access" ON public.accounts;
DROP POLICY IF EXISTS "accounts_admin_access" ON public.accounts;
DROP POLICY IF EXISTS "accounts_manager_access" ON public.accounts;

-- Drop properties policies
DROP POLICY IF EXISTS "properties_account_owner_access" ON public.properties;
DROP POLICY IF EXISTS "properties_admin_access" ON public.properties;
DROP POLICY IF EXISTS "properties_manager_access" ON public.properties;

-- Drop contacts policies
DROP POLICY IF EXISTS "contacts_account_owner_access" ON public.contacts;
DROP POLICY IF EXISTS "contacts_admin_access" ON public.contacts;
DROP POLICY IF EXISTS "contacts_manager_access" ON public.contacts;

-- Drop activities policies
DROP POLICY IF EXISTS "activities_owner_access" ON public.activities;
DROP POLICY IF EXISTS "activities_admin_access" ON public.activities;
DROP POLICY IF EXISTS "activities_manager_access" ON public.activities;

-- Drop weekly_goals policies  
DROP POLICY IF EXISTS "weekly_goals_owner_access" ON public.weekly_goals;
DROP POLICY IF EXISTS "weekly_goals_admin_access" ON public.weekly_goals;
DROP POLICY IF EXISTS "weekly_goals_manager_access" ON public.weekly_goals;

-- Drop conditional policies on optional tables
DO $$
BEGIN
    -- Tasks policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        EXECUTE 'DROP POLICY IF EXISTS "tasks_owner_access" ON public.tasks';
        EXECUTE 'DROP POLICY IF EXISTS "tasks_admin_access" ON public.tasks';
        EXECUTE 'DROP POLICY IF EXISTS "tasks_manager_access" ON public.tasks';
    END IF;
    
    -- Opportunities policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
        EXECUTE 'DROP POLICY IF EXISTS "opportunities_owner_access" ON public.opportunities';
        EXECUTE 'DROP POLICY IF EXISTS "opportunities_admin_access" ON public.opportunities';
        EXECUTE 'DROP POLICY IF EXISTS "opportunities_manager_access" ON public.opportunities';
    END IF;

    -- Documents policies  
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        EXECUTE 'DROP POLICY IF EXISTS "documents_owner_access" ON public.documents';
        EXECUTE 'DROP POLICY IF EXISTS "documents_admin_access" ON public.documents';
    END IF;

    -- Tenants policies
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        EXECUTE 'DROP POLICY IF EXISTS "tenants_admin_access" ON public.tenants';
    END IF;
END
$$;

-- STEP 1: Drop and recreate all helper functions to eliminate user_profiles dependencies  
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_manager_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin_user() CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_user(UUID) CASCADE;

-- STEP 2: Create JWT-only authentication functions - NO user_profiles queries allowed
-- These functions work ONLY with auth.jwt() data to prevent RLS conflicts

-- Get user role from JWT metadata only
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
    -- Check user_metadata first (set during signup)
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
    -- Check app_metadata second (set by admin)
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role',
    -- Default to 'rep' if no role found
    'rep'
)::TEXT;
$$;

-- Check if user is admin or super_admin - JWT metadata only
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.get_current_user_role() IN ('admin', 'super_admin');
$$;

-- Check if user is manager - JWT metadata only
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.get_current_user_role() = 'manager';
$$;

-- Check if user is super_admin - JWT metadata only
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.get_current_user_role() = 'super_admin';
$$;

-- **CRITICAL CHANGE**: Manager relationship check without querying user_profiles in RLS context
-- This function bypasses RLS by using a direct query that doesn't trigger RLS policies
CREATE OR REPLACE FUNCTION public.can_manage_user_safe(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_role TEXT;
    is_manager_of_target BOOLEAN := false;
BEGIN
    -- Get current user role from JWT only
    current_role := public.get_current_user_role();
    
    -- Admin and super_admin can manage anyone
    IF current_role IN ('admin', 'super_admin') THEN
        RETURN true;
    END IF;
    
    -- If not manager, cannot manage others
    IF current_role != 'manager' THEN
        RETURN false;
    END IF;
    
    -- For managers, check relationship using a direct SQL query
    -- This bypasses RLS by using SECURITY DEFINER context
    BEGIN
        EXECUTE format('
            SELECT EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = %L AND manager_id = %L
            )', target_user_id, auth.uid())
        INTO is_manager_of_target;
        
        RETURN is_manager_of_target;
    EXCEPTION
        WHEN OTHERS THEN
            -- If any error occurs, default to false for security
            RETURN false;
    END;
END;
$$;

-- STEP 3: Synchronize ALL user roles to auth.users metadata
-- This ensures JWT tokens contain correct role information
DO $$
DECLARE
    user_record RECORD;
    update_count INTEGER := 0;
BEGIN
    -- Process all users and sync their roles to auth metadata
    FOR user_record IN 
        SELECT au.id, au.raw_user_meta_data, up.role, up.full_name
        FROM auth.users au
        LEFT JOIN public.user_profiles up ON au.id = up.id
        WHERE up.role IS NOT NULL
    LOOP
        -- Update auth.users metadata with role from user_profiles
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{role}', 
                to_jsonb(user_record.role::TEXT)
            ),
            '{full_name}',
            to_jsonb(COALESCE(user_record.full_name, ''))
        )
        WHERE id = user_record.id
        AND (
            raw_user_meta_data IS NULL 
            OR (raw_user_meta_data->>'role') IS NULL 
            OR (raw_user_meta_data->>'role') != user_record.role::TEXT
        );
        
        IF FOUND THEN
            update_count := update_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Updated auth metadata for % users', update_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating auth metadata: %', SQLERRM;
END $$;

-- STEP 4: Create NEW RLS policies using ONLY JWT-based functions
-- These policies never query user_profiles directly

-- USER_PROFILES table policies - Allow self access and admin access
CREATE POLICY "user_profiles_self_select"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "user_profiles_self_update"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_admin_all"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- Manager can view their team - but uses safe function
CREATE POLICY "user_profiles_manager_select"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    public.is_manager() 
    AND manager_id = auth.uid()
);

-- PROSPECTS table policies
CREATE POLICY "prospects_owner_all"
ON public.prospects
FOR ALL
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "prospects_admin_all"
ON public.prospects
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- ACCOUNTS table policies
CREATE POLICY "accounts_owner_all"
ON public.accounts
FOR ALL
TO authenticated
USING (assigned_rep_id = auth.uid())
WITH CHECK (assigned_rep_id = auth.uid());

CREATE POLICY "accounts_admin_all"
ON public.accounts
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- PROPERTIES table policies (via account ownership)
CREATE POLICY "properties_via_account_ownership"
ON public.properties
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND a.assigned_rep_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND a.assigned_rep_id = auth.uid()
    )
);

CREATE POLICY "properties_admin_all"
ON public.properties
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- CONTACTS table policies (via account ownership)  
CREATE POLICY "contacts_via_account_ownership"
ON public.contacts
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND a.assigned_rep_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND a.assigned_rep_id = auth.uid()
    )
);

CREATE POLICY "contacts_admin_all"
ON public.contacts
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- ACTIVITIES table policies
CREATE POLICY "activities_owner_all"
ON public.activities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "activities_admin_all"
ON public.activities
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

-- WEEKLY_GOALS table policies
CREATE POLICY "weekly_goals_owner_all"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "weekly_goals_admin_all"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin())
WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "weekly_goals_manager_all"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (
    public.is_manager() 
    AND public.can_manage_user_safe(user_id)
)
WITH CHECK (
    public.is_manager() 
    AND public.can_manage_user_safe(user_id)
);

-- STEP 5: Handle optional tables with dynamic policy creation
DO $$
BEGIN
    -- TASKS table policies (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        EXECUTE 'CREATE POLICY "tasks_owner_all"
        ON public.tasks
        FOR ALL
        TO authenticated
        USING (assigned_to = auth.uid())
        WITH CHECK (assigned_to = auth.uid())';
        
        EXECUTE 'CREATE POLICY "tasks_admin_all"
        ON public.tasks
        FOR ALL
        TO authenticated
        USING (public.is_admin_or_super_admin())
        WITH CHECK (public.is_admin_or_super_admin())';
    END IF;
    
    -- OPPORTUNITIES table policies (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
        -- Check for correct column name
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'assigned_to') THEN
            EXECUTE 'CREATE POLICY "opportunities_owner_all"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (assigned_to = auth.uid())
            WITH CHECK (assigned_to = auth.uid())';
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'assigned_rep_id') THEN
            EXECUTE 'CREATE POLICY "opportunities_owner_all"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (assigned_rep_id = auth.uid())
            WITH CHECK (assigned_rep_id = auth.uid())';
        END IF;
        
        EXECUTE 'CREATE POLICY "opportunities_admin_all"
        ON public.opportunities
        FOR ALL
        TO authenticated
        USING (public.is_admin_or_super_admin())
        WITH CHECK (public.is_admin_or_super_admin())';
    END IF;

    -- DOCUMENTS table policies (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by') THEN
            EXECUTE 'CREATE POLICY "documents_owner_all"
            ON public.documents
            FOR ALL
            TO authenticated
            USING (uploaded_by = auth.uid())
            WITH CHECK (uploaded_by = auth.uid())';
            
            EXECUTE 'CREATE POLICY "documents_admin_all"
            ON public.documents
            FOR ALL
            TO authenticated
            USING (public.is_admin_or_super_admin())
            WITH CHECK (public.is_admin_or_super_admin())';
        END IF;
    END IF;

    -- TENANTS table policies (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        EXECUTE 'CREATE POLICY "tenants_admin_only"
        ON public.tenants
        FOR ALL
        TO authenticated
        USING (public.is_admin_or_super_admin())
        WITH CHECK (public.is_admin_or_super_admin())';
    END IF;
END
$$;

-- STEP 6: Grant execute permissions on all new functions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_user_safe(UUID) TO authenticated;

-- STEP 7: Ensure all tables have RLS enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on optional tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        EXECUTE 'ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
        EXECUTE 'ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        EXECUTE 'ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        EXECUTE 'ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY';
    END IF;
END
$$;

-- STEP 8: Add helpful comments
COMMENT ON FUNCTION public.get_current_user_role() IS 'JWT-only role detection - never queries user_profiles to prevent RLS conflicts';
COMMENT ON FUNCTION public.is_admin_or_super_admin() IS 'JWT-only admin check - safe for RLS policies';
COMMENT ON FUNCTION public.is_manager() IS 'JWT-only manager check - safe for RLS policies';
COMMENT ON FUNCTION public.is_super_admin() IS 'JWT-only super admin check - safe for RLS policies';
COMMENT ON FUNCTION public.can_manage_user_safe(UUID) IS 'Manager relationship check using SECURITY DEFINER to bypass RLS';

-- STEP 9: Final validation
DO $$
DECLARE
    policy_count INTEGER;
    function_count INTEGER;
    auth_metadata_count INTEGER;
BEGIN
    -- Count created policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('user_profiles', 'accounts', 'prospects', 'activities', 'contacts', 'properties', 'weekly_goals');
    
    -- Count created functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN ('get_current_user_role', 'is_admin_or_super_admin', 'is_manager', 'is_super_admin', 'can_manage_user_safe');
    
    -- Count users with role metadata
    SELECT COUNT(*) INTO auth_metadata_count
    FROM auth.users au
    WHERE raw_user_meta_data->>'role' IS NOT NULL;
    
    IF policy_count >= 10 AND function_count = 5 THEN
        RAISE NOTICE 'Migration completed successfully - % policies, % functions created, % users with role metadata', 
            policy_count, function_count, auth_metadata_count;
    ELSE
        RAISE WARNING 'Migration may be incomplete - only % policies, % functions created', policy_count, function_count;
    END IF;
END $$;

-- STEP 10: Create trigger to keep auth.users metadata in sync with user_profiles changes  
CREATE OR REPLACE FUNCTION public.sync_user_metadata_on_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update auth.users metadata when user_profiles role changes
    IF (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) OR TG_OP = 'INSERT' THEN
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_set(
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{role}', 
                to_jsonb(NEW.role::TEXT)
            ),
            '{full_name}',
            to_jsonb(COALESCE(NEW.full_name, ''))
        )
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on user_profiles to keep metadata synced
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON public.user_profiles;
CREATE TRIGGER sync_user_metadata_trigger
    AFTER INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_metadata_on_profile_change();

GRANT EXECUTE ON FUNCTION public.sync_user_metadata_on_profile_change() TO authenticated;

COMMENT ON FUNCTION public.sync_user_metadata_on_profile_change() IS 'Automatically sync role changes from user_profiles to auth.users metadata';
COMMENT ON TRIGGER sync_user_metadata_trigger ON public.user_profiles IS 'Keeps auth.users metadata in sync with user_profiles changes';