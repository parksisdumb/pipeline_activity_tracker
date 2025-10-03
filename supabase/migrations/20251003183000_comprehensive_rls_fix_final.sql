-- Location: supabase/migrations/20251003183000_comprehensive_rls_fix_final.sql
-- Schema Analysis: Comprehensive RLS policy fix to resolve permission denied errors and role hierarchy issues
-- Integration Type: Corrective - Complete RLS policy rebuild with proper patterns
-- Dependencies: Existing user_profiles, prospects, accounts, properties, contacts, activities, weekly_goals, tasks, opportunities tables

-- STEP 0: Drop ALL policies that depend on problematic functions first
-- This is critical to avoid the "cannot drop function" error

-- Drop ALL super admin policies mentioned in the error
DROP POLICY IF EXISTS "super_admin_full_access_accounts" ON public.accounts;
DROP POLICY IF EXISTS "super_admin_full_access_activities" ON public.activities;
DROP POLICY IF EXISTS "super_admin_full_access_contacts" ON public.contacts;
DROP POLICY IF EXISTS "super_admin_full_access_properties" ON public.properties;
DROP POLICY IF EXISTS "super_admin_full_access_tenants" ON public.tenants;
DROP POLICY IF EXISTS "super_admin_full_access_weekly_goals" ON public.weekly_goals;
DROP POLICY IF EXISTS "users_managers_accounts_access" ON public.accounts;
DROP POLICY IF EXISTS "super_admin_full_access_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "tenant_users_opportunities_access" ON public.opportunities;
DROP POLICY IF EXISTS "super_admin_full_access_task_comments" ON public.task_comments;
DROP POLICY IF EXISTS "super_admin_full_access_prospects" ON public.prospects;
DROP POLICY IF EXISTS "super_admin_full_access_documents" ON public.documents;
DROP POLICY IF EXISTS "super_admin_full_access_document_events" ON public.document_events;
DROP POLICY IF EXISTS "super_admin_storage_access" ON storage.objects;

-- Drop additional policies that may also depend on these functions
DROP POLICY IF EXISTS "tenant_users_accounts_access" ON public.accounts;
DROP POLICY IF EXISTS "tenant_users_activities_access" ON public.activities;  
DROP POLICY IF EXISTS "tenant_users_contacts_access" ON public.contacts;
DROP POLICY IF EXISTS "tenant_users_properties_access" ON public.properties;
DROP POLICY IF EXISTS "tenant_users_weekly_goals_access" ON public.weekly_goals;
DROP POLICY IF EXISTS "tenant_users_prospects_access" ON public.prospects;
DROP POLICY IF EXISTS "tenant_users_documents_access" ON public.documents;
DROP POLICY IF EXISTS "tenant_users_document_events_access" ON public.document_events;
DROP POLICY IF EXISTS "tenant_users_tasks_access" ON public.tasks;

-- STEP 1: Drop all other existing potentially problematic RLS policies
-- User profiles policies
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_full_access_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "manager_access_team_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "managers_access_team_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "tenant_isolation_user_profiles" ON public.user_profiles;

-- Prospects policies  
DROP POLICY IF EXISTS "users_access_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "users_access_assigned_prospects" ON public.prospects;
DROP POLICY IF EXISTS "manager_access_team_prospects" ON public.prospects;
DROP POLICY IF EXISTS "managers_access_team_prospects" ON public.prospects;
DROP POLICY IF EXISTS "admin_access_all_prospects" ON public.prospects;
DROP POLICY IF EXISTS "admin_full_access_prospects" ON public.prospects;
DROP POLICY IF EXISTS "tenant_isolation_prospects" ON public.prospects;

-- Accounts policies
DROP POLICY IF EXISTS "users_access_assigned_accounts" ON public.accounts;
DROP POLICY IF EXISTS "users_manage_assigned_accounts" ON public.accounts;
DROP POLICY IF EXISTS "manager_access_team_accounts" ON public.accounts;
DROP POLICY IF EXISTS "managers_access_team_accounts" ON public.accounts;
DROP POLICY IF EXISTS "admin_access_all_accounts" ON public.accounts;
DROP POLICY IF EXISTS "admin_full_access_accounts" ON public.accounts;

-- Properties policies
DROP POLICY IF EXISTS "users_access_assigned_properties" ON public.properties;
DROP POLICY IF EXISTS "manager_access_team_properties" ON public.properties;
DROP POLICY IF EXISTS "managers_access_team_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_access_all_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_full_access_properties" ON public.properties;
DROP POLICY IF EXISTS "users_access_account_properties" ON public.properties;

-- Contacts policies
DROP POLICY IF EXISTS "users_access_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_access_assigned_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_access_account_contacts" ON public.contacts;
DROP POLICY IF EXISTS "managers_access_team_contacts" ON public.contacts;
DROP POLICY IF EXISTS "admin_full_access_contacts" ON public.contacts;

-- Activities policies
DROP POLICY IF EXISTS "users_access_own_activities" ON public.activities;
DROP POLICY IF EXISTS "users_manage_own_activities" ON public.activities;
DROP POLICY IF EXISTS "managers_access_team_activities" ON public.activities;
DROP POLICY IF EXISTS "admin_full_access_activities" ON public.activities;

-- Weekly goals policies
DROP POLICY IF EXISTS "users_manage_own_weekly_goals" ON public.weekly_goals;
DROP POLICY IF EXISTS "managers_can_manage_team_weekly_goals" ON public.weekly_goals;
DROP POLICY IF EXISTS "managers_manage_team_weekly_goals" ON public.weekly_goals;
DROP POLICY IF EXISTS "admin_full_access_weekly_goals" ON public.weekly_goals;

-- Tasks policies (if exist)
DROP POLICY IF EXISTS "users_access_own_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_access_assigned_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_manage_assigned_tasks" ON public.tasks;
DROP POLICY IF EXISTS "managers_access_team_tasks" ON public.tasks;
DROP POLICY IF EXISTS "admin_full_access_tasks" ON public.tasks;
DROP POLICY IF EXISTS "super_admin_full_access_tasks" ON public.tasks;

-- Opportunities policies (if exist)
DROP POLICY IF EXISTS "users_access_assigned_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "managers_access_team_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "admin_full_access_opportunities" ON public.opportunities;

-- STEP 2: Drop existing problematic functions with CASCADE 
-- This will force drop any remaining dependent objects
DROP FUNCTION IF EXISTS public.get_user_role_from_auth() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_super_admin_from_auth() CASCADE;
DROP FUNCTION IF EXISTS public.is_manager_from_auth() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin_from_auth() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_manager_of_user(UUID) CASCADE;

-- STEP 3: Create safe helper functions that use auth.users metadata exclusively
-- These functions avoid querying user_profiles to prevent circular dependencies

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role',
    'rep'
)::TEXT;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.get_current_user_role() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_manager_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.get_current_user_role() = 'manager';
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS BOOLEAN  
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT public.get_current_user_role() = 'super_admin';
$$;

-- Safe function to check manager relationships without querying user_profiles in RLS context
CREATE OR REPLACE FUNCTION public.can_manage_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT CASE 
    WHEN public.is_admin_user() THEN true
    WHEN public.is_manager_user() THEN (
        SELECT EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = target_user_id 
            AND up.manager_id = auth.uid()
        )
    )
    ELSE false
END;
$$;

-- STEP 4: Update auth.users metadata to ensure proper role synchronization
-- This ensures the JWT tokens contain the correct role information
DO $$
BEGIN
    UPDATE auth.users 
    SET 
        raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb), 
            '{role}', 
            to_jsonb(COALESCE(up.role::TEXT, 'rep'))
        )
    FROM public.user_profiles up
    WHERE auth.users.id = up.id
    AND (
        raw_user_meta_data->>'role' IS NULL 
        OR raw_user_meta_data->>'role' != up.role::TEXT
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update auth.users metadata: %', SQLERRM;
END $$;

-- STEP 5: Create safe RLS policies using JWT-based functions

-- USER_PROFILES TABLE - Pattern 1 (Core User Table) - SIMPLE POLICIES ONLY
CREATE POLICY "user_profiles_self_access"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_admin_access"
ON public.user_profiles
FOR ALL
TO authenticated  
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "user_profiles_manager_read"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    public.is_manager_user() 
    AND manager_id = auth.uid()
);

-- PROSPECTS TABLE - Pattern 2 (Simple User Ownership)
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
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "prospects_manager_access"
ON public.prospects
FOR SELECT
TO authenticated  
USING (
    public.is_manager_user() 
    AND public.can_manage_user(assigned_to)
);

-- ACCOUNTS TABLE - Pattern 2 (Simple User Ownership)  
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
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "accounts_manager_access"
ON public.accounts
FOR SELECT
TO authenticated
USING (
    public.is_manager_user() 
    AND public.can_manage_user(assigned_rep_id)
);

-- PROPERTIES TABLE - Pattern 7 (Complex Relationship)
-- Properties are accessed through account ownership
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
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "properties_manager_access"
ON public.properties
FOR SELECT
TO authenticated
USING (
    public.is_manager_user() 
    AND EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND public.can_manage_user(a.assigned_rep_id)
    )
);

-- CONTACTS TABLE - Pattern 7 (Complex Relationship)
-- Contacts are accessed through account ownership
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
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "contacts_manager_access"
ON public.contacts
FOR SELECT
TO authenticated
USING (
    public.is_manager_user() 
    AND EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND public.can_manage_user(a.assigned_rep_id)
    )
);

-- ACTIVITIES TABLE - Pattern 2 (Simple User Ownership)
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
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "activities_manager_access"
ON public.activities
FOR SELECT
TO authenticated
USING (
    public.is_manager_user() 
    AND public.can_manage_user(user_id)
);

-- WEEKLY_GOALS TABLE - Pattern 2 (Simple User Ownership)
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
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "weekly_goals_manager_access"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (
    public.is_manager_user() 
    AND public.can_manage_user(user_id)
)
WITH CHECK (
    public.is_manager_user() 
    AND public.can_manage_user(user_id)
);

-- TASKS TABLE (if exists) - Pattern 2 (Simple User Ownership)
DO $$
BEGIN
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
        USING (public.is_admin_user())
        WITH CHECK (public.is_admin_user())';
        
        EXECUTE 'CREATE POLICY "tasks_manager_access"
        ON public.tasks
        FOR SELECT
        TO authenticated
        USING (
            public.is_manager_user() 
            AND public.can_manage_user(assigned_to)
        )';
    END IF;
END
$$;

-- OPPORTUNITIES TABLE (if exists) - Pattern 2 (Simple User Ownership)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
        -- Check for correct column name and create policies accordingly
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'assigned_to') THEN
            EXECUTE 'CREATE POLICY "opportunities_owner_access"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (assigned_to = auth.uid())
            WITH CHECK (assigned_to = auth.uid())';
            
            EXECUTE 'CREATE POLICY "opportunities_admin_access"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (public.is_admin_user())
            WITH CHECK (public.is_admin_user())';
            
            EXECUTE 'CREATE POLICY "opportunities_manager_access"
            ON public.opportunities
            FOR SELECT
            TO authenticated
            USING (
                public.is_manager_user() 
                AND public.can_manage_user(assigned_to)
            )';
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'assigned_rep_id') THEN
            EXECUTE 'CREATE POLICY "opportunities_owner_access"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (assigned_rep_id = auth.uid())
            WITH CHECK (assigned_rep_id = auth.uid())';
            
            EXECUTE 'CREATE POLICY "opportunities_admin_access"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (public.is_admin_user())
            WITH CHECK (public.is_admin_user())';
            
            EXECUTE 'CREATE POLICY "opportunities_manager_access"
            ON public.opportunities
            FOR SELECT
            TO authenticated
            USING (
                public.is_manager_user() 
                AND public.can_manage_user(assigned_rep_id)
            )';
        END IF;
    END IF;
END
$$;

-- DOCUMENTS TABLE (if exists) - Pattern 2 (Simple User Ownership)
DO $$
BEGIN
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
            USING (public.is_admin_user())
            WITH CHECK (public.is_admin_user())';
        END IF;
    END IF;
END
$$;

-- TENANTS TABLE (if exists) - Admin-only access pattern
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        EXECUTE 'CREATE POLICY "tenants_admin_access"
        ON public.tenants
        FOR ALL
        TO authenticated
        USING (public.is_admin_user())
        WITH CHECK (public.is_admin_user())';
    END IF;
END
$$;

-- STEP 6: Grant necessary permissions on helper functions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_user(UUID) TO authenticated;

-- STEP 7: Add helpful comments for documentation
COMMENT ON FUNCTION public.get_current_user_role() IS 'Gets user role from JWT metadata to avoid circular dependencies with user_profiles RLS policies';
COMMENT ON FUNCTION public.is_admin_user() IS 'Checks if current user is admin or super_admin using JWT metadata';
COMMENT ON FUNCTION public.is_manager_user() IS 'Checks if current user is manager using JWT metadata';
COMMENT ON FUNCTION public.is_super_admin_user() IS 'Checks if current user is super_admin using JWT metadata';
COMMENT ON FUNCTION public.can_manage_user(UUID) IS 'Checks if current user can manage the specified user based on role hierarchy';

-- Add policy comments for documentation
COMMENT ON POLICY "user_profiles_self_access" ON public.user_profiles IS 'Pattern 1: Users can access their own profiles';
COMMENT ON POLICY "user_profiles_admin_access" ON public.user_profiles IS 'Pattern 6: Admin and super admin full access using JWT metadata';
COMMENT ON POLICY "user_profiles_manager_read" ON public.user_profiles IS 'Pattern 6: Managers can view their team members profiles';

COMMENT ON POLICY "prospects_owner_access" ON public.prospects IS 'Pattern 2: Users can access prospects assigned to them';
COMMENT ON POLICY "accounts_owner_access" ON public.accounts IS 'Pattern 2: Users can access accounts assigned to them (assigned_rep_id)';
COMMENT ON POLICY "properties_account_owner_access" ON public.properties IS 'Pattern 7: Properties accessed through account assignment';
COMMENT ON POLICY "contacts_account_owner_access" ON public.contacts IS 'Pattern 7: Contacts accessed through account assignment';
COMMENT ON POLICY "activities_owner_access" ON public.activities IS 'Pattern 2: Users can access their own activities';
COMMENT ON POLICY "weekly_goals_owner_access" ON public.weekly_goals IS 'Pattern 2: Users can access their own weekly goals';

-- STEP 8: Ensure all tables have RLS enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on optional tables if they exist
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

-- STEP 9: Create a validation check to ensure migration worked
DO $$
DECLARE
    missing_policies TEXT[];
    policy_count INTEGER;
BEGIN
    -- Check that essential policies were created
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('user_profiles', 'accounts', 'prospects', 'activities', 'contacts', 'properties', 'weekly_goals');
    
    IF policy_count < 10 THEN
        RAISE WARNING 'Migration may be incomplete - only % policies found', policy_count;
    ELSE
        RAISE NOTICE 'Migration completed successfully - % policies created', policy_count;
    END IF;
END $$;