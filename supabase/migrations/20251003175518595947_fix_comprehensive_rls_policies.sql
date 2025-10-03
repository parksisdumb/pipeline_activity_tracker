-- Location: supabase/migrations/20251003175518595947_fix_comprehensive_rls_policies.sql
-- Schema Analysis: Fixing RLS policies with correct column references
-- Integration Type: Corrective - Fixing column reference errors and RLS policies
-- Dependencies: Existing user_profiles, tenants, prospects, properties, accounts, contacts, activities tables

-- STEP 1: Drop all existing problematic RLS policies that may have circular dependencies or incorrect column references

-- Drop existing policies on user_profiles that might cause infinite recursion
DROP POLICY IF EXISTS "users_view_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_full_access_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "manager_access_team_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "managers_access_team_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "tenant_isolation_user_profiles" ON public.user_profiles;

-- Drop existing policies on other key tables
DROP POLICY IF EXISTS "users_access_own_prospects" ON public.prospects;
DROP POLICY IF EXISTS "users_access_assigned_prospects" ON public.prospects;
DROP POLICY IF EXISTS "manager_access_team_prospects" ON public.prospects;
DROP POLICY IF EXISTS "managers_access_team_prospects" ON public.prospects;
DROP POLICY IF EXISTS "admin_access_all_prospects" ON public.prospects;
DROP POLICY IF EXISTS "admin_full_access_prospects" ON public.prospects;
DROP POLICY IF EXISTS "tenant_users_access_prospects" ON public.prospects;
DROP POLICY IF EXISTS "tenant_isolation_prospects" ON public.prospects;

DROP POLICY IF EXISTS "users_access_assigned_properties" ON public.properties;
DROP POLICY IF EXISTS "manager_access_team_properties" ON public.properties;
DROP POLICY IF EXISTS "managers_access_team_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_access_all_properties" ON public.properties;
DROP POLICY IF EXISTS "admin_full_access_properties" ON public.properties;
DROP POLICY IF EXISTS "users_access_account_properties" ON public.properties;

DROP POLICY IF EXISTS "users_access_assigned_accounts" ON public.accounts;
DROP POLICY IF EXISTS "users_manage_assigned_accounts" ON public.accounts;
DROP POLICY IF EXISTS "manager_access_team_accounts" ON public.accounts;
DROP POLICY IF EXISTS "managers_access_team_accounts" ON public.accounts;
DROP POLICY IF EXISTS "admin_access_all_accounts" ON public.accounts;
DROP POLICY IF EXISTS "admin_full_access_accounts" ON public.accounts;

DROP POLICY IF EXISTS "users_access_own_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_access_assigned_contacts" ON public.contacts;
DROP POLICY IF EXISTS "users_access_account_contacts" ON public.contacts;
DROP POLICY IF EXISTS "managers_access_team_contacts" ON public.contacts;
DROP POLICY IF EXISTS "admin_full_access_contacts" ON public.contacts;

DROP POLICY IF EXISTS "users_access_own_activities" ON public.activities;
DROP POLICY IF EXISTS "users_manage_own_activities" ON public.activities;
DROP POLICY IF EXISTS "managers_access_team_activities" ON public.activities;
DROP POLICY IF EXISTS "admin_full_access_activities" ON public.activities;

-- Drop existing policies on weekly_goals
DROP POLICY IF EXISTS "users_manage_own_weekly_goals" ON public.weekly_goals;
DROP POLICY IF EXISTS "managers_can_manage_team_weekly_goals" ON public.weekly_goals;
DROP POLICY IF EXISTS "managers_manage_team_weekly_goals" ON public.weekly_goals;
DROP POLICY IF EXISTS "admin_full_access_weekly_goals" ON public.weekly_goals;

-- Drop existing policies on tasks (if exist)
DROP POLICY IF EXISTS "users_access_own_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_access_assigned_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_manage_assigned_tasks" ON public.tasks;
DROP POLICY IF EXISTS "managers_access_team_tasks" ON public.tasks;
DROP POLICY IF EXISTS "admin_full_access_tasks" ON public.tasks;
DROP POLICY IF EXISTS "super_admin_full_access_tasks" ON public.tasks;

-- Drop existing policies on opportunities (if exist)
DROP POLICY IF EXISTS "users_access_assigned_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "managers_access_team_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "admin_full_access_opportunities" ON public.opportunities;

-- STEP 2: Create safe helper functions using auth.users metadata (recommended pattern)

-- Function to check roles using auth.users metadata (avoids circular dependency with user_profiles)
CREATE OR REPLACE FUNCTION public.get_user_role_from_auth()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT COALESCE(
    (SELECT au.raw_user_meta_data->>'role' FROM auth.users au WHERE au.id = auth.uid()),
    (SELECT au.raw_app_meta_data->>'role' FROM auth.users au WHERE au.id = auth.uid()),
    'rep'
)::TEXT;
$$;

-- Function to check if current user is admin or super_admin using auth metadata
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (
        au.raw_user_meta_data->>'role' IN ('admin', 'super_admin') 
        OR au.raw_app_meta_data->>'role' IN ('admin', 'super_admin')
    )
);
$$;

-- Function to check if current user is manager using auth metadata
CREATE OR REPLACE FUNCTION public.is_manager_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (
        au.raw_user_meta_data->>'role' = 'manager' 
        OR au.raw_app_meta_data->>'role' = 'manager'
    )
);
$$;

-- Function to check if current user is super_admin using auth metadata
CREATE OR REPLACE FUNCTION public.is_super_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (
        au.raw_user_meta_data->>'role' = 'super_admin' 
        OR au.raw_app_meta_data->>'role' = 'super_admin'
    )
);
$$;

-- Function to get user's tenant ID from user_profiles (safe for non-user tables)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- Function to check if user is manager of a specific user (for manager access patterns)
CREATE OR REPLACE FUNCTION public.is_manager_of_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = target_user_id
    AND up.manager_id = auth.uid()
    AND public.is_manager_from_auth()
);
$$;

-- STEP 3: Create new safe RLS policies using Pattern 1 (Core User Tables) and Pattern 6 (Role-Based Access)

-- RLS POLICIES FOR USER_PROFILES TABLE (PATTERN 1 + PATTERN 6)
-- Use simple direct access for users' own profiles, plus role-based access using auth metadata

CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "admin_full_access_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin_from_auth())
WITH CHECK (public.is_admin_or_super_admin_from_auth());

CREATE POLICY "managers_access_team_user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    manager_id = auth.uid() AND public.is_manager_from_auth()
);

-- RLS POLICIES FOR PROSPECTS TABLE (PATTERN 2 + PATTERN 6)
-- Note: Prospects table uses assigned_to column

CREATE POLICY "users_access_assigned_prospects"
ON public.prospects
FOR ALL
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "admin_full_access_prospects"
ON public.prospects
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin_from_auth())
WITH CHECK (public.is_admin_or_super_admin_from_auth());

CREATE POLICY "managers_access_team_prospects"
ON public.prospects
FOR SELECT
TO authenticated
USING (
    public.is_manager_of_user(assigned_to) AND public.is_manager_from_auth()
);

-- RLS POLICIES FOR ACCOUNTS TABLE (PATTERN 2 + PATTERN 6)
-- Note: Accounts table uses assigned_rep_id column

CREATE POLICY "users_access_assigned_accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (assigned_rep_id = auth.uid())
WITH CHECK (assigned_rep_id = auth.uid());

CREATE POLICY "admin_full_access_accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin_from_auth())
WITH CHECK (public.is_admin_or_super_admin_from_auth());

CREATE POLICY "managers_access_team_accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (
    public.is_manager_of_user(assigned_rep_id) AND public.is_manager_from_auth()
);

-- RLS POLICIES FOR PROPERTIES TABLE (PATTERN 7 + PATTERN 6)
-- Note: Properties are accessed through their account relationship, not direct assignment

CREATE POLICY "users_access_account_properties"
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

CREATE POLICY "admin_full_access_properties"
ON public.properties
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin_from_auth())
WITH CHECK (public.is_admin_or_super_admin_from_auth());

CREATE POLICY "managers_access_team_properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND public.is_manager_of_user(a.assigned_rep_id)
        AND public.is_manager_from_auth()
    )
);

-- RLS POLICIES FOR CONTACTS TABLE (PATTERN 7 + PATTERN 6)
-- Note: Contacts are accessed through their account relationship, not direct assignment

CREATE POLICY "users_access_account_contacts"
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

CREATE POLICY "admin_full_access_contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin_from_auth())
WITH CHECK (public.is_admin_or_super_admin_from_auth());

CREATE POLICY "managers_access_team_contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.accounts a 
        WHERE a.id = account_id 
        AND public.is_manager_of_user(a.assigned_rep_id)
        AND public.is_manager_from_auth()
    )
);

-- RLS POLICIES FOR ACTIVITIES TABLE (PATTERN 2 + PATTERN 6)

CREATE POLICY "users_access_own_activities"
ON public.activities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_full_access_activities"
ON public.activities
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin_from_auth())
WITH CHECK (public.is_admin_or_super_admin_from_auth());

CREATE POLICY "managers_access_team_activities"
ON public.activities
FOR SELECT
TO authenticated
USING (
    public.is_manager_of_user(user_id) AND public.is_manager_from_auth()
);

-- RLS POLICIES FOR WEEKLY_GOALS TABLE (PATTERN 2 + PATTERN 6)

CREATE POLICY "users_manage_own_weekly_goals"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_full_access_weekly_goals"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (public.is_admin_or_super_admin_from_auth())
WITH CHECK (public.is_admin_or_super_admin_from_auth());

CREATE POLICY "managers_manage_team_weekly_goals"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (
    public.is_manager_of_user(user_id) AND public.is_manager_from_auth()
)
WITH CHECK (
    public.is_manager_of_user(user_id) AND public.is_manager_from_auth()
);

-- RLS POLICIES FOR TASKS TABLE (if exists, using assigned_to)
-- Create policies only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        EXECUTE 'CREATE POLICY "users_access_assigned_tasks"
        ON public.tasks
        FOR ALL
        TO authenticated
        USING (assigned_to = auth.uid())
        WITH CHECK (assigned_to = auth.uid())';
        
        EXECUTE 'CREATE POLICY "admin_full_access_tasks"
        ON public.tasks
        FOR ALL
        TO authenticated
        USING (public.is_admin_or_super_admin_from_auth())
        WITH CHECK (public.is_admin_or_super_admin_from_auth())';
        
        EXECUTE 'CREATE POLICY "managers_access_team_tasks"
        ON public.tasks
        FOR SELECT
        TO authenticated
        USING (
            public.is_manager_of_user(assigned_to) AND public.is_manager_from_auth()
        )';
    END IF;
END
$$;

-- RLS POLICIES FOR OPPORTUNITIES TABLE (if exists, using assigned_to - need to verify column name)
-- Create policies only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
        -- First check if opportunities table uses assigned_to or assigned_rep_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'assigned_to') THEN
            EXECUTE 'CREATE POLICY "users_access_assigned_opportunities"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (assigned_to = auth.uid())
            WITH CHECK (assigned_to = auth.uid())';
            
            EXECUTE 'CREATE POLICY "admin_full_access_opportunities"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (public.is_admin_or_super_admin_from_auth())
            WITH CHECK (public.is_admin_or_super_admin_from_auth())';
            
            EXECUTE 'CREATE POLICY "managers_access_team_opportunities"
            ON public.opportunities
            FOR SELECT
            TO authenticated
            USING (
                public.is_manager_of_user(assigned_to) AND public.is_manager_from_auth()
            )';
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'assigned_rep_id') THEN
            EXECUTE 'CREATE POLICY "users_access_assigned_opportunities"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (assigned_rep_id = auth.uid())
            WITH CHECK (assigned_rep_id = auth.uid())';
            
            EXECUTE 'CREATE POLICY "admin_full_access_opportunities"
            ON public.opportunities
            FOR ALL
            TO authenticated
            USING (public.is_admin_or_super_admin_from_auth())
            WITH CHECK (public.is_admin_or_super_admin_from_auth())';
            
            EXECUTE 'CREATE POLICY "managers_access_team_opportunities"
            ON public.opportunities
            FOR SELECT
            TO authenticated
            USING (
                public.is_manager_of_user(assigned_rep_id) AND public.is_manager_from_auth()
            )';
        END IF;
    END IF;
END
$$;

-- STEP 4: Add tenant isolation policies where needed (using super_admin bypass)

-- Tenant isolation for user_profiles
CREATE POLICY "tenant_isolation_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (
    tenant_id = public.get_user_tenant_id() 
    OR public.is_super_admin_from_auth()
)
WITH CHECK (
    tenant_id = public.get_user_tenant_id() 
    OR public.is_super_admin_from_auth()
);

-- STEP 5: Update existing auth.users metadata for proper role synchronization
UPDATE auth.users 
SET 
    raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb), 
        '{role}', 
        to_jsonb(COALESCE(up.role::TEXT, 'rep'))
    ),
    raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb), 
        '{role}', 
        to_jsonb(COALESCE(up.role::TEXT, 'rep'))
    )
FROM public.user_profiles up
WHERE auth.users.id = up.id
AND (
    raw_user_meta_data->>'role' IS NULL 
    OR raw_user_meta_data->>'role' != up.role::TEXT
    OR raw_app_meta_data->>'role' IS NULL 
    OR raw_app_meta_data->>'role' != up.role::TEXT
);

-- STEP 6: Grant necessary permissions on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_role_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin_from_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_of_user(UUID) TO authenticated;

-- STEP 7: Add helpful comments for documentation
COMMENT ON FUNCTION public.get_user_role_from_auth() IS 'Gets user role from auth.users metadata to avoid circular dependencies with user_profiles RLS policies';
COMMENT ON FUNCTION public.is_admin_or_super_admin_from_auth() IS 'Checks if current user is admin or super_admin using auth metadata only';
COMMENT ON FUNCTION public.is_manager_from_auth() IS 'Checks if current user is manager using auth metadata only';
COMMENT ON FUNCTION public.is_super_admin_from_auth() IS 'Checks if current user is super_admin using auth metadata only';
COMMENT ON FUNCTION public.is_manager_of_user(UUID) IS 'Checks if current user is manager of specified user, used for team access control';

-- Add comments on key policies
COMMENT ON POLICY "users_manage_own_user_profiles" ON public.user_profiles IS 'Pattern 1: Core user table - users can access their own profiles';
COMMENT ON POLICY "admin_full_access_user_profiles" ON public.user_profiles IS 'Pattern 6A: Role-based access using auth metadata for admins and super admins';
COMMENT ON POLICY "managers_access_team_user_profiles" ON public.user_profiles IS 'Pattern 6A: Managers can view their team members profiles';

COMMENT ON POLICY "users_access_assigned_prospects" ON public.prospects IS 'Pattern 2: Simple user ownership - users access prospects assigned to them';
COMMENT ON POLICY "admin_full_access_prospects" ON public.prospects IS 'Pattern 6A: Admin and super admin full access using auth metadata';
COMMENT ON POLICY "managers_access_team_prospects" ON public.prospects IS 'Pattern 6A: Manager access to team prospects using safe helper function';

COMMENT ON POLICY "users_access_assigned_accounts" ON public.accounts IS 'Pattern 2: Simple user ownership - users access accounts assigned to them (assigned_rep_id)';
COMMENT ON POLICY "users_access_account_properties" ON public.properties IS 'Pattern 7: Complex relationship - properties accessed through account assignment';
COMMENT ON POLICY "users_access_account_contacts" ON public.contacts IS 'Pattern 7: Complex relationship - contacts accessed through account assignment';