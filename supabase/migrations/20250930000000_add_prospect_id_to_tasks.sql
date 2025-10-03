-- Migration: Add prospect_id column to tasks table for prospect-task relationships
-- Schema Analysis: Existing tasks table lacks prospect_id foreign key to prospects table
-- Integration Type: Modificative - ALTER existing tasks table
-- Dependencies: Existing tasks and prospects tables

-- Add prospect_id column with foreign key reference to prospects table
ALTER TABLE public.tasks
ADD COLUMN prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL;

-- Add index for efficient queries on prospect_id
CREATE INDEX idx_tasks_prospect_id ON public.tasks(prospect_id);

-- Update existing RLS policies to handle prospect-related tasks
-- No changes needed to existing policies as prospect_id is nullable and optional

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.prospect_id IS 'Optional foreign key to prospects table for prospect-related tasks';