-- Schema Analysis: Existing CRM schema with user_profiles, accounts, account_assignments tables
-- Integration Type: Enhancement - improving manager oversight capabilities
-- Dependencies: user_profiles, accounts, account_assignments, tenants tables

-- Enhance manager functions to provide full tenant visibility
-- This addresses the requirement for sales managers to see ALL accounts and ALL users within their tenant

-- 1. Enhanced manager function for complete tenant account visibility
CREATE OR REPLACE FUNCTION public.get_manager_all_tenant_accounts(manager_uuid UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    company_type TEXT,
    stage TEXT,
    assigned_reps JSONB,
    primary_rep_name TEXT,
    city TEXT,
    state TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    notes TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $manager_accounts$
SELECT 
    a.id,
    a.name,
    a.company_type::TEXT,
    a.stage::TEXT,
    COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'rep_id', up_rep.id,
                'rep_name', up_rep.full_name,
                'rep_email', up_rep.email,
                'is_primary', aa.is_primary
            ) ORDER BY aa.is_primary DESC, up_rep.full_name
        ) FILTER (WHERE up_rep.id IS NOT NULL),
        '[]'::jsonb
    ) as assigned_reps,
    up_primary.full_name as primary_rep_name,
    a.city,
    a.state,
    a.email,
    a.phone,
    a.created_at,
    a.updated_at,
    a.notes
FROM public.accounts a
LEFT JOIN public.account_assignments aa ON a.id = aa.account_id
LEFT JOIN public.user_profiles up_rep ON aa.rep_id = up_rep.id AND up_rep.is_active = true
LEFT JOIN public.user_profiles up_primary ON a.assigned_rep_id = up_primary.id
WHERE a.tenant_id = (
    SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
)
GROUP BY a.id, a.name, a.company_type, a.stage, a.city, a.state, a.email, a.phone, a.created_at, a.updated_at, a.notes, up_primary.full_name
ORDER BY a.name;
$manager_accounts$;

-- 2. Enhanced function for all tenant users visibility
CREATE OR REPLACE FUNCTION public.get_manager_all_tenant_users(manager_uuid UUID)
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    phone TEXT,
    tenant_id UUID,
    is_active BOOLEAN,
    manager_id UUID,
    created_at TIMESTAMPTZ,
    total_accounts INTEGER,
    recent_activities INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $manager_users$
SELECT 
    up.id,
    up.full_name,
    up.email,
    up.role::TEXT,
    up.phone,
    up.tenant_id,
    up.is_active,
    up.manager_id,
    up.created_at,
    COALESCE(account_count.total, 0)::INTEGER as total_accounts,
    COALESCE(activity_count.recent, 0)::INTEGER as recent_activities
FROM public.user_profiles up
LEFT JOIN (
    SELECT 
        assigned_rep_id,
        COUNT(*) as total
    FROM public.accounts
    WHERE is_active = true
    GROUP BY assigned_rep_id
) account_count ON up.id = account_count.assigned_rep_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as recent
    FROM public.activities
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
) activity_count ON up.id = activity_count.user_id
WHERE up.tenant_id = (
    SELECT tenant_id FROM public.user_profiles WHERE id = manager_uuid LIMIT 1
)
AND up.is_active = true
ORDER BY up.role DESC, up.full_name;
$manager_users$;

-- 3. Enhanced function for comprehensive account assignment management
CREATE OR REPLACE FUNCTION public.manager_assign_account_to_reps(
    manager_uuid UUID,
    account_uuid UUID,
    rep_ids UUID[],
    primary_rep_id UUID DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    account_id UUID,
    assignments_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $assign_function$
DECLARE
    manager_tenant_id UUID;
    account_tenant_id UUID;
    assignments_count INTEGER := 0;
    rep_id UUID;
BEGIN
    -- Verify manager permissions
    SELECT tenant_id INTO manager_tenant_id 
    FROM public.user_profiles 
    WHERE id = manager_uuid AND role IN ('manager', 'admin', 'super_admin');
    
    IF manager_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid manager or insufficient permissions', account_uuid, 0;
        RETURN;
    END IF;
    
    -- Verify account belongs to same tenant
    SELECT tenant_id INTO account_tenant_id
    FROM public.accounts
    WHERE id = account_uuid;
    
    IF account_tenant_id != manager_tenant_id THEN
        RETURN QUERY SELECT false, 'Account not found or access denied', account_uuid, 0;
        RETURN;
    END IF;
    
    -- Clear existing assignments for this account
    DELETE FROM public.account_assignments WHERE account_id = account_uuid;
    
    -- Update primary rep if specified
    IF primary_rep_id IS NOT NULL THEN
        UPDATE public.accounts 
        SET assigned_rep_id = primary_rep_id 
        WHERE id = account_uuid;
    END IF;
    
    -- Create new assignments
    FOREACH rep_id IN ARRAY rep_ids LOOP
        -- Verify rep belongs to same tenant
        IF EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = rep_id 
            AND tenant_id = manager_tenant_id 
            AND is_active = true
        ) THEN
            INSERT INTO public.account_assignments (
                account_id, 
                rep_id, 
                assigned_by, 
                is_primary
            ) VALUES (
                account_uuid, 
                rep_id, 
                manager_uuid,
                COALESCE(rep_id = primary_rep_id, false)
            );
            assignments_count := assignments_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        true, 
        format('Successfully assigned %s reps to account', assignments_count),
        account_uuid,
        assignments_count;
END;
$assign_function$;

-- 4. Enhanced function for goal assignment across entire tenant
CREATE OR REPLACE FUNCTION public.manager_assign_team_goals(
    manager_uuid UUID,
    goal_data JSONB
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    goals_assigned INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $goal_function$
DECLARE
    manager_tenant_id UUID;
    goals_count INTEGER := 0;
    goal_item JSONB;
    rep_id UUID;
    week_start DATE;
BEGIN
    -- Verify manager permissions
    SELECT tenant_id INTO manager_tenant_id 
    FROM public.user_profiles 
    WHERE id = manager_uuid AND role IN ('manager', 'admin', 'super_admin');
    
    IF manager_tenant_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid manager or insufficient permissions', 0;
        RETURN;
    END IF;
    
    -- Extract week start from goal data
    week_start := COALESCE(
        (goal_data->>'week_start')::DATE, 
        DATE_TRUNC('week', CURRENT_DATE)::DATE
    );
    
    -- Process each goal assignment
    FOR goal_item IN SELECT * FROM jsonb_array_elements(goal_data->'assignments') LOOP
        rep_id := (goal_item->>'rep_id')::UUID;
        
        -- Verify rep belongs to same tenant
        IF EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = rep_id 
            AND tenant_id = manager_tenant_id
        ) THEN
            -- Insert or update goals for each goal type
            FOR goal_item IN SELECT * FROM jsonb_array_elements(goal_item->'goals') LOOP
                INSERT INTO public.weekly_goals (
                    user_id,
                    tenant_id,
                    week_start_date,
                    goal_type,
                    target_value,
                    current_value,
                    assigned_by
                ) VALUES (
                    rep_id,
                    manager_tenant_id,
                    week_start,
                    (goal_item->>'type')::TEXT,
                    COALESCE((goal_item->>'target')::INTEGER, 0),
                    COALESCE((goal_item->>'current')::INTEGER, 0),
                    manager_uuid
                )
                ON CONFLICT (user_id, week_start_date, goal_type) 
                DO UPDATE SET
                    target_value = EXCLUDED.target_value,
                    assigned_by = EXCLUDED.assigned_by,
                    updated_at = CURRENT_TIMESTAMP;
                
                goals_count := goals_count + 1;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        true, 
        format('Successfully assigned %s goals', goals_count),
        goals_count;
END;
$goal_function$;

-- 5. Grant appropriate permissions for these functions
GRANT EXECUTE ON FUNCTION public.get_manager_all_tenant_accounts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manager_all_tenant_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_assign_account_to_reps(UUID, UUID, UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_assign_team_goals(UUID, JSONB) TO authenticated;

-- 6. Add helpful comments for documentation
COMMENT ON FUNCTION public.get_manager_all_tenant_accounts(UUID) 
IS 'Enhanced manager function: Returns ALL accounts within the manager tenant, not just assigned team accounts';

COMMENT ON FUNCTION public.get_manager_all_tenant_users(UUID) 
IS 'Enhanced manager function: Returns ALL users within the manager tenant with account and activity summaries';

COMMENT ON FUNCTION public.manager_assign_account_to_reps(UUID, UUID, UUID[], UUID) 
IS 'Enhanced manager function: Allows managers to assign any account within their tenant to any reps within the tenant';

COMMENT ON FUNCTION public.manager_assign_team_goals(UUID, JSONB) 
IS 'Enhanced manager function: Allows managers to assign goals to any user within their tenant';