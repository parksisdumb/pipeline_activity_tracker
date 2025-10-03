-- Location: supabase/migrations/20251003184500_fix_permission_denied_for_table_users.sql
-- Schema Analysis: Fix "permission denied for table users" error caused by broken RLS policies and failed migration
-- Integration Type: CORRECTIVE - Fix database permission errors preventing app functionality
-- Dependencies: Existing schema with user_profiles, accounts, properties, contacts, activities, prospects, etc.

-- STEP 0: Drop ALL problematic policies and functions that cause circular dependencies
DO $$
BEGIN
    -- Drop all existing policies on all tables to start fresh
    DROP POLICY IF EXISTS "user_profiles_self_select" ON public.user_profiles;
    DROP POLICY IF EXISTS "user_profiles_self_update" ON public.user_profiles;
    DROP POLICY IF EXISTS "user_profiles_admin_all" ON public.user_profiles;
    DROP POLICY IF EXISTS "user_profiles_manager_select" ON public.user_profiles;
    
    -- Drop policies on all other tables
    DROP POLICY IF EXISTS "prospects_owner_all" ON public.prospects;
    DROP POLICY IF EXISTS "prospects_admin_all" ON public.prospects;
    DROP POLICY IF EXISTS "accounts_owner_all" ON public.accounts;
    DROP POLICY IF EXISTS "accounts_admin_all" ON public.accounts;
    DROP POLICY IF EXISTS "properties_via_account_ownership" ON public.properties;
    DROP POLICY IF EXISTS "properties_admin_all" ON public.properties;
    DROP POLICY IF EXISTS "contacts_via_account_ownership" ON public.contacts;
    DROP POLICY IF EXISTS "contacts_admin_all" ON public.contacts;
    DROP POLICY IF EXISTS "activities_owner_all" ON public.activities;
    DROP POLICY IF EXISTS "activities_admin_all" ON public.activities;
    DROP POLICY IF EXISTS "weekly_goals_owner_all" ON public.weekly_goals;
    DROP POLICY IF EXISTS "weekly_goals_admin_all" ON public.weekly_goals;
    DROP POLICY IF EXISTS "weekly_goals_manager_all" ON public.weekly_goals;
    
    -- Drop problematic functions that cause circular dependencies
    DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
    DROP FUNCTION IF EXISTS public.is_admin_or_super_admin() CASCADE;
    DROP FUNCTION IF EXISTS public.is_manager() CASCADE;
    DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
    DROP FUNCTION IF EXISTS public.can_manage_user_safe(UUID) CASCADE;
    
    RAISE NOTICE 'Dropped all problematic policies and functions';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during cleanup: %', SQLERRM;
END
$$;

-- STEP 1: Create JWT-only authentication functions that never query user_profiles
-- These functions use ONLY auth.jwt() metadata to prevent RLS conflicts

CREATE OR REPLACE FUNCTION public.get_user_role_from_jwt()
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

CREATE OR REPLACE FUNCTION public.is_admin_user_jwt()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.get_user_role_from_jwt() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_manager_user_jwt()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.get_user_role_from_jwt() = 'manager';
$$;

-- STEP 2: Sync ALL user roles to auth.users metadata to ensure JWT functions work
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

-- STEP 3: Create NEW RLS policies using Pattern 1 for core user tables
-- Pattern 1: Direct column comparison ONLY - no functions on user_profiles

-- USER_PROFILES table - Use Pattern 1 (Core User Table)
CREATE POLICY "user_profiles_self_access"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin access using JWT-only function (safe for all tables including user_profiles)
CREATE POLICY "user_profiles_admin_access"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_admin_user_jwt())
WITH CHECK (public.is_admin_user_jwt());

-- Manager access - simple check for their team members
CREATE POLICY "user_profiles_manager_access"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    public.is_manager_user_jwt() 
    AND manager_id = auth.uid()
);

-- STEP 4: Apply Pattern 2 (Simple User Ownership) to all other tables

-- PROSPECTS table - Pattern 2
CREATE POLICY "prospects_owner_access"
ON public.prospects
FOR ALL
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "prospects_admin_access"
ON public.prospects
FOR ALL
TO authenticated
USING (public.is_admin_user_jwt())
WITH CHECK (public.is_admin_user_jwt());

-- ACCOUNTS table - Pattern 2
CREATE POLICY "accounts_owner_access"
ON public.accounts
FOR ALL
TO authenticated
USING (assigned_rep_id = auth.uid())
WITH CHECK (assigned_rep_id = auth.uid());

CREATE POLICY "accounts_admin_access"
ON public.accounts
FOR ALL
TO authenticated
USING (public.is_admin_user_jwt())
WITH CHECK (public.is_admin_user_jwt());

-- PROPERTIES table - via account ownership
CREATE POLICY "properties_account_owner_access"
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

CREATE POLICY "properties_admin_access"
ON public.properties
FOR ALL
TO authenticated
USING (public.is_admin_user_jwt())
WITH CHECK (public.is_admin_user_jwt());

-- CONTACTS table - via account ownership
CREATE POLICY "contacts_account_owner_access"
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

CREATE POLICY "contacts_admin_access"
ON public.contacts
FOR ALL
TO authenticated
USING (public.is_admin_user_jwt())
WITH CHECK (public.is_admin_user_jwt());

-- ACTIVITIES table - Pattern 2
CREATE POLICY "activities_owner_access"
ON public.activities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "activities_admin_access"
ON public.activities
FOR ALL
TO authenticated
USING (public.is_admin_user_jwt())
WITH CHECK (public.is_admin_user_jwt());

-- WEEKLY_GOALS table - Pattern 2
CREATE POLICY "weekly_goals_owner_access"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "weekly_goals_admin_access"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (public.is_admin_user_jwt())
WITH CHECK (public.is_admin_user_jwt());

-- Manager access to team goals
CREATE POLICY "weekly_goals_manager_access"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (
    public.is_manager_user_jwt()
    AND EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = user_id 
        AND up.manager_id = auth.uid()
    )
)
WITH CHECK (
    public.is_manager_user_jwt()
    AND EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = user_id 
        AND up.manager_id = auth.uid()
    )
);

-- STEP 5: Handle optional tables with dynamic policy creation
DO $$
BEGIN
    -- TASKS table policies (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        EXECUTE 'CREATE POLICY "tasks_owner_access"
        ON public.tasks
        FOR ALL
        TO authenticated
        USING (assigned_to = auth.uid())
        WITH CHECK (assigned_to = auth.uid())';
        
        EXECUTE 'CREATE POLICY "tasks_admin_access"
        ON public.tasks
        FOR ALL
        TO authenticated
        USING (public.is_admin_user_jwt())
        WITH CHECK (public.is_admin_user_jwt())';
    END IF;
    
    -- OPPORTUNITIES table policies (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
        -- Check for correct column name
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'assigned_to') THEN
            EXECUTE 'CREATE POLICY "opportunities_owner_access"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (assigned_to = auth.uid())
            WITH CHECK (assigned_to = auth.uid())';
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'assigned_rep_id') THEN
            EXECUTE 'CREATE POLICY "opportunities_owner_access"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (assigned_rep_id = auth.uid())
            WITH CHECK (assigned_rep_id = auth.uid())';
        END IF;
        
        EXECUTE 'CREATE POLICY "opportunities_admin_access"
        ON public.opportunities
        FOR ALL
        TO authenticated
        USING (public.is_admin_user_jwt())
        WITH CHECK (public.is_admin_user_jwt())';
    END IF;

    -- DOCUMENTS table policies (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by') THEN
            EXECUTE 'CREATE POLICY "documents_owner_access"
            ON public.documents
            FOR ALL
            TO authenticated
            USING (uploaded_by = auth.uid())
            WITH CHECK (uploaded_by = auth.uid())';
            
            EXECUTE 'CREATE POLICY "documents_admin_access"
            ON public.documents
            FOR ALL
            TO authenticated
            USING (public.is_admin_user_jwt())
            WITH CHECK (public.is_admin_user_jwt())';
        END IF;
    END IF;

    -- TENANTS table policies (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        EXECUTE 'CREATE POLICY "tenants_admin_only"
        ON public.tenants
        FOR ALL
        TO authenticated
        USING (public.is_admin_user_jwt())
        WITH CHECK (public.is_admin_user_jwt())';
    END IF;
END
$$;

-- STEP 6: Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_user_role_from_jwt() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user_jwt() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_user_jwt() TO authenticated;

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

-- STEP 8: Create trigger to keep auth.users metadata in sync with user_profiles changes
CREATE OR REPLACE FUNCTION public.sync_user_metadata_on_profile_update()
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
    EXECUTE FUNCTION public.sync_user_metadata_on_profile_update();

GRANT EXECUTE ON FUNCTION public.sync_user_metadata_on_profile_update() TO authenticated;

-- STEP 9: Add helpful comments
COMMENT ON FUNCTION public.get_user_role_from_jwt() IS 'JWT-only role detection - never queries user_profiles to prevent RLS conflicts';
COMMENT ON FUNCTION public.is_admin_user_jwt() IS 'JWT-only admin check - safe for RLS policies on any table';
COMMENT ON FUNCTION public.is_manager_user_jwt() IS 'JWT-only manager check - safe for RLS policies on any table';
COMMENT ON FUNCTION public.sync_user_metadata_on_profile_update() IS 'Automatically sync role changes from user_profiles to auth.users metadata';

-- STEP 10: Final validation and success message
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
    AND p.proname IN ('get_user_role_from_jwt', 'is_admin_user_jwt', 'is_manager_user_jwt', 'sync_user_metadata_on_profile_update');
    
    -- Count users with role metadata
    SELECT COUNT(*) INTO auth_metadata_count
    FROM auth.users au
    WHERE raw_user_meta_data->>'role' IS NOT NULL;
    
    IF policy_count >= 10 AND function_count = 4 THEN
        RAISE NOTICE 'Migration completed successfully - % policies, % functions created, % users with role metadata', 
            policy_count, function_count, auth_metadata_count;
        RAISE NOTICE 'Permission denied errors should now be resolved';
    ELSE
        RAISE WARNING 'Migration may be incomplete - only % policies, % functions created', policy_count, function_count;
    END IF;
END $$;