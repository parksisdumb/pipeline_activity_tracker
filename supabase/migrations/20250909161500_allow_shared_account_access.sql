-- Location: supabase/migrations/20250909161500_allow_shared_account_access.sql
-- Schema Analysis: Existing CRM schema with accounts, properties, contacts, user_profiles tables
-- Integration Type: Modificative - Update RLS policies to allow shared access
-- Dependencies: accounts, properties, contacts, user_profiles tables

-- Create new function for shared account access (based on user role)
CREATE OR REPLACE FUNCTION public.can_access_any_account()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() 
    AND up.is_active = true
    AND up.role IN ('admin', 'manager', 'rep')
)
$$;

-- Create function to get all active accounts for property creation
CREATE OR REPLACE FUNCTION public.get_all_available_accounts()
RETURNS TABLE(
    id UUID,
    name TEXT,
    company_type public.company_type,
    stage public.account_stage
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT a.id, a.name, a.company_type, a.stage
FROM public.accounts a
WHERE a.is_active = true
AND public.can_access_any_account()
ORDER BY a.name
$$;

-- Update accounts RLS policy to allow broader access for active users
DROP POLICY IF EXISTS "users_manage_assigned_accounts" ON public.accounts;

CREATE POLICY "authenticated_users_view_active_accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (is_active = true AND public.can_access_any_account());

CREATE POLICY "reps_insert_assigned_accounts"
ON public.accounts
FOR INSERT
TO authenticated
WITH CHECK (assigned_rep_id = auth.uid());

CREATE POLICY "reps_update_assigned_accounts"
ON public.accounts
FOR UPDATE
TO authenticated
USING (assigned_rep_id = auth.uid())
WITH CHECK (assigned_rep_id = auth.uid());

CREATE POLICY "reps_delete_assigned_accounts"
ON public.accounts
FOR DELETE
TO authenticated
USING (assigned_rep_id = auth.uid());

-- Update properties RLS policy to allow creation for any account
DROP POLICY IF EXISTS "users_access_account_properties" ON public.properties;

CREATE POLICY "authenticated_users_view_all_properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.can_access_any_account());

CREATE POLICY "authenticated_users_create_properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_any_account());

CREATE POLICY "reps_update_own_account_properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
    public.can_access_any_account() AND
    account_id IN (
        SELECT id FROM public.accounts 
        WHERE assigned_rep_id = auth.uid()
    )
);

CREATE POLICY "reps_delete_own_account_properties"
ON public.properties
FOR DELETE
TO authenticated
USING (
    public.can_access_any_account() AND
    account_id IN (
        SELECT id FROM public.accounts 
        WHERE assigned_rep_id = auth.uid()
    )
);

-- Update contacts RLS policy to allow broader access
DROP POLICY IF EXISTS "users_access_account_contacts" ON public.contacts;

CREATE POLICY "authenticated_users_view_all_contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (public.can_access_any_account());

CREATE POLICY "authenticated_users_create_contacts"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_any_account());

CREATE POLICY "reps_update_own_account_contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
    public.can_access_any_account() AND
    account_id IN (
        SELECT id FROM public.accounts 
        WHERE assigned_rep_id = auth.uid()
    )
);

CREATE POLICY "reps_delete_own_account_contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (
    public.can_access_any_account() AND
    account_id IN (
        SELECT id FROM public.accounts 
        WHERE assigned_rep_id = auth.uid()
    )
);