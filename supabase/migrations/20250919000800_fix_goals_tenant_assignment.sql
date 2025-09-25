-- Fix goals page tenant assignment issue
-- Problem: weekly_goals table requires tenant_id but it's not being set automatically
-- Solution: Create trigger to auto-populate tenant_id from user's tenant_id

-- Create function to auto-assign tenant_id for weekly_goals
CREATE OR REPLACE FUNCTION public.set_weekly_goals_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Get the user's tenant_id from user_profiles
    SELECT tenant_id INTO user_tenant_id 
    FROM public.user_profiles 
    WHERE id = NEW.user_id;
    
    -- If no tenant found, raise error
    IF user_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User % has no associated tenant', NEW.user_id;
    END IF;
    
    -- Set the tenant_id automatically
    NEW.tenant_id := user_tenant_id;
    
    RETURN NEW;
END;
$$;

-- Create trigger to auto-assign tenant_id before insert/update
CREATE TRIGGER set_weekly_goals_tenant_id_trigger
    BEFORE INSERT OR UPDATE ON public.weekly_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_weekly_goals_tenant_id();

-- Update existing weekly_goals records that might have NULL tenant_id
UPDATE public.weekly_goals 
SET tenant_id = (
    SELECT up.tenant_id 
    FROM public.user_profiles up 
    WHERE up.id = weekly_goals.user_id
)
WHERE tenant_id IS NULL;