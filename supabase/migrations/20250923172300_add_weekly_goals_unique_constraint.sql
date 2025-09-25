-- Location: supabase/migrations/20250923172300_add_weekly_goals_unique_constraint.sql
-- Schema Analysis: weekly_goals table exists with columns user_id, week_start_date, goal_type
-- Integration Type: modificative - adding unique constraint to existing table
-- Dependencies: weekly_goals table (existing)

-- Fix: Add unique constraint for ON CONFLICT specification in manager_assign_team_goals function
-- This ensures a user can only have one goal of each type per week

-- Add unique constraint to support the ON CONFLICT clause in the manager_assign_team_goals function
ALTER TABLE public.weekly_goals 
ADD CONSTRAINT unique_user_week_goal_type 
UNIQUE (user_id, week_start_date, goal_type);

-- Create index to improve performance on the constraint
CREATE INDEX IF NOT EXISTS idx_weekly_goals_unique_constraint 
ON public.weekly_goals (user_id, week_start_date, goal_type);