-- Fix weekly goals tenant validation trigger order issue
-- Schema Analysis: weekly_goals table with tenant validation triggers
-- Integration Type: modification - fixing trigger execution order
-- Dependencies: existing weekly_goals table, user_profiles table, validate_tenant_consistency function

-- The issue: Both set_weekly_goals_tenant_id_trigger and validate_tenant_consistency trigger 
-- are running BEFORE INSERT/UPDATE, causing validation to fail before tenant_id is set

-- Solution: Drop the separate validation trigger and enhance the set_tenant_id function 
-- to include validation logic, ensuring tenant_id is set first, then validated

-- Drop the problematic validation trigger
DROP TRIGGER IF EXISTS trigger_validate_weekly_goals_tenant_consistency ON public.weekly_goals;

-- Create enhanced function that both sets tenant_id AND validates consistency
CREATE OR REPLACE FUNCTION public.set_and_validate_weekly_goals_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Get the user's tenant_id from user_profiles
    SELECT tenant_id INTO user_tenant_id 
    FROM public.user_profiles 
    WHERE id = NEW.user_id;
    
    -- If no tenant found for user, raise error
    IF user_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User % has no associated tenant', NEW.user_id;
    END IF;
    
    -- If tenant_id is explicitly provided, validate it matches user's tenant
    IF NEW.tenant_id IS NOT NULL AND NEW.tenant_id != user_tenant_id THEN
        RAISE EXCEPTION 'User % does not belong to tenant %', NEW.user_id, NEW.tenant_id;
    END IF;
    
    -- Set the tenant_id automatically to ensure consistency
    NEW.tenant_id := user_tenant_id;
    
    RETURN NEW;
END;
$function$;

-- Drop the old trigger and create new enhanced trigger
DROP TRIGGER IF EXISTS set_weekly_goals_tenant_id_trigger ON public.weekly_goals;

CREATE TRIGGER set_and_validate_weekly_goals_tenant_trigger
    BEFORE INSERT OR UPDATE ON public.weekly_goals
    FOR EACH ROW EXECUTE FUNCTION public.set_and_validate_weekly_goals_tenant();

-- Update any existing weekly_goals records that may have inconsistent tenant assignments
DO $$
DECLARE
    goal_record RECORD;
    correct_tenant_id UUID;
BEGIN
    -- Check all weekly_goals for tenant consistency
    FOR goal_record IN 
        SELECT wg.id, wg.user_id, wg.tenant_id, up.tenant_id as user_tenant_id
        FROM public.weekly_goals wg
        JOIN public.user_profiles up ON wg.user_id = up.id
        WHERE wg.tenant_id != up.tenant_id OR wg.tenant_id IS NULL
    LOOP
        -- Update the goal with correct tenant_id
        UPDATE public.weekly_goals 
        SET tenant_id = goal_record.user_tenant_id 
        WHERE id = goal_record.id;
        
        RAISE NOTICE 'Fixed tenant assignment for goal % - set to tenant %', 
            goal_record.id, goal_record.user_tenant_id;
    END LOOP;
END $$;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.set_and_validate_weekly_goals_tenant() IS 
'Enhanced trigger function that both sets tenant_id from user_profiles and validates tenant consistency in a single operation. Prevents validation errors that occurred when validation ran before tenant_id was set.';