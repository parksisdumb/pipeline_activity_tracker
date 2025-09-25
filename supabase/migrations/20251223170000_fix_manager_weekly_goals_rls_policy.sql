-- Fix manager weekly goals RLS policy - allows managers to create/update goals for team members
-- Migration: 20251223170000_fix_manager_weekly_goals_rls_policy.sql

-- First, create a helper function to check if current user is a manager of the goal's user
-- This function queries different tables to avoid circular dependencies
CREATE OR REPLACE FUNCTION public.is_manager_of_goal_user(goal_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = goal_user_id
    AND up.manager_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.user_profiles manager
        WHERE manager.id = auth.uid()
        AND manager.role = 'manager'
        AND manager.is_active = true
    )
);
$$;

-- Add RLS policy to allow managers to manage their team members' weekly goals
CREATE POLICY "managers_can_manage_team_weekly_goals"
ON public.weekly_goals
FOR ALL
TO authenticated
USING (
    -- Allow if user is a manager of the goal's user_id
    public.is_manager_of_goal_user(user_id)
)
WITH CHECK (
    -- Allow if user is a manager of the goal's user_id
    public.is_manager_of_goal_user(user_id)
);

-- Grant necessary permissions on the function
GRANT EXECUTE ON FUNCTION public.is_manager_of_goal_user(UUID) TO authenticated;

-- Comment on the function for documentation
COMMENT ON FUNCTION public.is_manager_of_goal_user(UUID) IS 'Checks if the current authenticated user is a manager of the specified user. Used for RLS policies to allow managers to manage team members goals.';

-- Comment on the policy for documentation
COMMENT ON POLICY "managers_can_manage_team_weekly_goals" ON public.weekly_goals IS 'Allows managers to create, read, update, and delete weekly goals for their direct team members. Uses is_manager_of_goal_user function to verify manager-team member relationship.';