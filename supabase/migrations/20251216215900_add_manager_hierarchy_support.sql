-- Location: supabase/migrations/20251216215900_add_manager_hierarchy_support.sql
-- Schema Analysis: Existing user_profiles table with role field, but no manager hierarchy
-- Integration Type: MODIFICATIVE - Adding manager_id column to existing user_profiles table
-- Dependencies: user_profiles table (existing)

-- Add manager_id column to user_profiles to establish manager-rep relationships
ALTER TABLE public.user_profiles
ADD COLUMN manager_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Add index for efficient manager queries
CREATE INDEX idx_user_profiles_manager_id ON public.user_profiles(manager_id);

-- Create function to get manager's team members (including manager themselves)
CREATE OR REPLACE FUNCTION public.get_manager_team_members(manager_uuid UUID)
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    phone TEXT,
    tenant_id UUID,
    is_active BOOLEAN,
    manager_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    up.id,
    up.full_name,
    up.email,
    up.role::TEXT,
    up.phone,
    up.tenant_id,
    up.is_active,
    up.manager_id
FROM public.user_profiles up
WHERE up.tenant_id = (
    SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
)
AND (
    up.manager_id = manager_uuid  -- Team members reporting to this manager
    OR up.id = manager_uuid       -- Include the manager themselves
)
AND up.is_active = true
ORDER BY up.full_name;
$$;

-- Create function to get manager's accessible accounts
CREATE OR REPLACE FUNCTION public.get_manager_accessible_accounts(manager_uuid UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    company_type TEXT,
    stage TEXT,
    assigned_rep_id UUID,
    assigned_rep_name TEXT,
    city TEXT,
    state TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
    a.id,
    a.name,
    a.company_type::TEXT,
    a.stage::TEXT,
    a.assigned_rep_id,
    up.full_name as assigned_rep_name,
    a.city,
    a.state,
    a.email,
    a.phone,
    a.created_at,
    a.updated_at
FROM public.accounts a
LEFT JOIN public.user_profiles up ON a.assigned_rep_id = up.id
WHERE a.tenant_id = (
    SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
)
AND (
    a.assigned_rep_id IN (
        SELECT id FROM public.user_profiles 
        WHERE manager_id = manager_uuid OR id = manager_uuid
    )
    OR a.assigned_rep_id = manager_uuid  -- Manager's own accounts
)
ORDER BY a.name;
$$;

-- Create function to get team performance metrics for a manager
CREATE OR REPLACE FUNCTION public.get_manager_team_performance(
    manager_uuid UUID,
    week_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days' * (EXTRACT(DOW FROM CURRENT_DATE))::INTEGER
)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_role TEXT,
    total_accounts INTEGER,
    total_contacts INTEGER,
    current_week_activities INTEGER,
    weekly_goals JSONB,
    goal_completion_rate INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH team_members AS (
    SELECT id, full_name, email, role::TEXT
    FROM public.user_profiles up
    WHERE up.tenant_id = (
        SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
    )
    AND (up.manager_id = manager_uuid OR up.id = manager_uuid)
    AND up.is_active = true
),
account_counts AS (
    SELECT 
        a.assigned_rep_id as user_id,
        COUNT(*) as account_count
    FROM public.accounts a
    INNER JOIN team_members tm ON a.assigned_rep_id = tm.id
    WHERE a.tenant_id = (
        SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
    )
    GROUP BY a.assigned_rep_id
),
contact_counts AS (
    SELECT 
        tm.id as user_id,
        COUNT(c.id) as contact_count
    FROM team_members tm
    LEFT JOIN public.accounts a ON a.assigned_rep_id = tm.id
    LEFT JOIN public.contacts c ON c.account_id = a.id
    GROUP BY tm.id
),
activity_counts AS (
    SELECT 
        act.user_id,
        COUNT(*) as activity_count
    FROM public.activities act
    INNER JOIN team_members tm ON act.user_id = tm.id
    WHERE act.tenant_id = (
        SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
    )
    AND act.created_at >= week_start_date
    AND act.created_at < week_start_date + INTERVAL '7 days'
    GROUP BY act.user_id
),
goal_data AS (
    SELECT 
        wg.user_id,
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'goal_type', wg.goal_type,
                'target_value', wg.target_value,
                'current_value', wg.current_value,
                'status', wg.status
            )
        ) as goals,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE wg.status = 'Completed')::DECIMAL / COUNT(*)) * 100)::INTEGER
        END as completion_rate
    FROM public.weekly_goals wg
    INNER JOIN team_members tm ON wg.user_id = tm.id
    WHERE wg.tenant_id = (
        SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
    )
    AND wg.week_start_date = week_start_date
    GROUP BY wg.user_id
)
SELECT 
    tm.id,
    tm.full_name,
    tm.email,
    tm.role,
    COALESCE(ac.account_count, 0)::INTEGER,
    COALESCE(cc.contact_count, 0)::INTEGER,
    COALESCE(act.activity_count, 0)::INTEGER,
    COALESCE(gd.goals, '[]'::JSONB),
    COALESCE(gd.completion_rate, 0)::INTEGER
FROM team_members tm
LEFT JOIN account_counts ac ON tm.id = ac.user_id
LEFT JOIN contact_counts cc ON tm.id = cc.user_id
LEFT JOIN activity_counts act ON tm.id = act.user_id
LEFT JOIN goal_data gd ON tm.id = gd.user_id
ORDER BY tm.full_name;
$$;

-- Create function to check if user is a manager of another user
CREATE OR REPLACE FUNCTION public.is_manager_of_user(manager_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = user_uuid 
    AND up.manager_id = manager_uuid
    AND up.tenant_id = (
        SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
    )
);
$$;

-- Update RLS policies to support manager access
-- Drop existing policies and create new ones with manager access

-- Drop existing user_profiles RLS policy
DROP POLICY IF EXISTS "tenant_users_manage_own_profiles" ON public.user_profiles;

-- Create new RLS policy for user_profiles with manager access
CREATE POLICY "users_and_managers_access_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (
    id = auth.uid() OR  -- Users can access their own profile
    manager_id = auth.uid() OR  -- Managers can access their team members
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'super_admin')
        AND up.tenant_id = user_profiles.tenant_id
    )
)
WITH CHECK (
    id = auth.uid() OR  -- Users can update their own profile
    manager_id = auth.uid() OR  -- Managers can update their team members
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'super_admin')
        AND up.tenant_id = user_profiles.tenant_id
    )
);

-- Update accounts RLS to allow managers to see their team's accounts
DROP POLICY IF EXISTS "tenant_users_full_accounts_access" ON public.accounts;

CREATE POLICY "users_managers_accounts_access"
ON public.accounts
FOR ALL
TO public
USING (
    user_can_access_tenant_data(tenant_id) OR
    assigned_rep_id = auth.uid() OR  -- Assigned rep can access
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'manager'
        AND (
            assigned_rep_id IN (
                SELECT id FROM public.user_profiles 
                WHERE manager_id = auth.uid() AND tenant_id = up.tenant_id
            )
            OR assigned_rep_id = auth.uid()  -- Manager's own accounts
        )
        AND up.tenant_id = accounts.tenant_id
    )
)
WITH CHECK (
    (tenant_id = get_user_tenant_id()) OR
    is_super_admin_from_auth() OR
    assigned_rep_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'manager'
        AND up.tenant_id = accounts.tenant_id
    )
);

-- Mock data to establish manager relationships in existing test tenant
DO $$
DECLARE
    acme_tenant_id UUID := (SELECT id FROM public.tenants WHERE slug = 'acme-roofing' LIMIT 1);
    manager_user_id UUID;
    rep1_user_id UUID;
    rep2_user_id UUID;
BEGIN
    -- Only proceed if we have the test tenant
    IF acme_tenant_id IS NOT NULL THEN
        -- Get existing users or create new ones for the test tenant
        SELECT id INTO manager_user_id 
        FROM public.user_profiles 
        WHERE tenant_id = acme_tenant_id AND role = 'admin' 
        LIMIT 1;
        
        -- If no manager exists, we'll use an existing user and change their role
        IF manager_user_id IS NULL THEN
            SELECT id INTO manager_user_id 
            FROM public.user_profiles 
            WHERE tenant_id = acme_tenant_id 
            LIMIT 1;
            
            -- Update this user to be a manager
            IF manager_user_id IS NOT NULL THEN
                UPDATE public.user_profiles 
                SET role = 'manager', 
                    full_name = 'Sarah Thompson - Sales Manager',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = manager_user_id;
            END IF;
        END IF;
        
        -- Get existing reps
        SELECT id INTO rep1_user_id 
        FROM public.user_profiles 
        WHERE tenant_id = acme_tenant_id AND id != manager_user_id AND role = 'rep'
        LIMIT 1;
        
        SELECT id INTO rep2_user_id 
        FROM public.user_profiles 
        WHERE tenant_id = acme_tenant_id 
        AND id NOT IN (manager_user_id, COALESCE(rep1_user_id, '00000000-0000-0000-0000-000000000000'::UUID))
        AND role = 'rep'
        LIMIT 1;
        
        -- Establish manager relationships
        IF manager_user_id IS NOT NULL THEN
            -- Assign existing reps to this manager
            UPDATE public.user_profiles 
            SET manager_id = manager_user_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = acme_tenant_id 
            AND role = 'rep' 
            AND id != manager_user_id;
            
            RAISE NOTICE 'Manager hierarchy established for tenant: %', acme_tenant_id;
        END IF;
    END IF;
END $$;