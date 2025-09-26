-- Fix ambiguous column reference in update_task_status function
-- The issue is that both the function parameter and table column have the same name "completion_notes"
-- This causes PostgreSQL error 42P13: cannot change name of input parameter

-- First, drop the existing function with the old signature
DROP FUNCTION IF EXISTS public.update_task_status(uuid, task_status, text);

-- Then create the function with a different parameter name to avoid ambiguity
CREATE OR REPLACE FUNCTION public.update_task_status(
    task_uuid uuid, 
    new_status public.task_status, 
    completion_notes_param text DEFAULT NULL::text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Update task status with unambiguous parameter reference
    UPDATE public.tasks
    SET 
        status = new_status,
        completed_at = CASE WHEN new_status = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
        completion_notes = CASE WHEN new_status = 'completed' THEN completion_notes_param ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = task_uuid
    AND (assigned_to = auth.uid() OR assigned_by = auth.uid());
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Task status updated successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'Task not found or insufficient permissions'::TEXT;
    END IF;
END;
$function$;