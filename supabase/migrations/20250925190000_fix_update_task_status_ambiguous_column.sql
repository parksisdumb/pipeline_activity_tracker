-- Location: supabase/migrations/20250925190000_fix_update_task_status_ambiguous_column.sql
-- Schema Analysis: Existing tasks table with completion_notes column
-- Integration Type: Function modification to fix ambiguous column reference
-- Dependencies: Existing tasks table, task_status enum

-- Fix the update_task_status function to resolve ambiguous column reference
-- The issue is that both the function parameter and table column are named "completion_notes"
-- PostgreSQL cannot determine which one to use in the assignment

CREATE OR REPLACE FUNCTION public.update_task_status(
    task_uuid uuid, 
    new_status task_status, 
    completion_notes_param text DEFAULT NULL::text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Update task status with explicit parameter reference
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
$function$