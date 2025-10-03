-- Schema Analysis: Existing CRM system with activities, opportunities, and weekly_goals tables
-- Integration Type: Extension - Adding new enum values, foreign key relationship, and constraints
-- Dependencies: activities, opportunities, weekly_goals, activity_type, activity_outcome enums

-- Step 1: Add new enum values to existing activity_type enum
ALTER TYPE public.activity_type ADD VALUE 'Pop-in';
ALTER TYPE public.activity_type ADD VALUE 'Decision Maker Conversation';

-- Step 2: Add new enum value to existing activity_outcome enum  
ALTER TYPE public.activity_outcome ADD VALUE 'Assessment Completed';

-- Step 3: Add opportunity_id column to activities table
ALTER TABLE public.activities 
ADD COLUMN opportunity_id UUID NULL REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- Step 4: Add indexes for performance optimization
-- Index for activities(opportunity_id, activity_date DESC) - for opportunity activity queries
CREATE INDEX idx_activities_opportunity_id_activity_date ON public.activities(opportunity_id, activity_date DESC);

-- Index for activities(user_id, activity_date DESC) - for user activity queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_activities_user_id_activity_date ON public.activities(user_id, activity_date DESC);

-- Index for activities(follow_up_date) - for follow-up queries
CREATE INDEX idx_activities_follow_up_date ON public.activities(follow_up_date);

-- Step 5: Handle duplicate resolution before applying KPI constraint
-- This prevents unique constraint violations when mapping multiple goal types to the same KPI key
DO $$
BEGIN
    -- Create temporary table to store consolidated data before updating
    CREATE TEMP TABLE weekly_goals_consolidated AS
    SELECT DISTINCT ON (user_id, week_start_date, new_goal_type)
        user_id,
        week_start_date,
        CASE 
            WHEN goal_type IN ('calls', 'emails') THEN 'dm_conversations'
            WHEN goal_type = 'assessments' THEN 'assessments_booked'
            WHEN goal_type = 'proposals' THEN 'proposals_sent'
            WHEN goal_type = 'wins' THEN 'wins'
            WHEN goal_type = 'pop_ins' THEN 'pop_ins'
            WHEN goal_type = 'dm_conversations' THEN 'dm_conversations'
            WHEN goal_type = 'assessments_booked' THEN 'assessments_booked'
            WHEN goal_type = 'proposals_sent' THEN 'proposals_sent'
            ELSE 'dm_conversations'
        END as new_goal_type,
        -- Use first available ID for the group (using created_at for consistent ordering)
        (array_agg(id ORDER BY created_at))[1] as keep_id,
        SUM(target_value) OVER (PARTITION BY user_id, week_start_date, 
            CASE 
                WHEN goal_type IN ('calls', 'emails') THEN 'dm_conversations'
                WHEN goal_type = 'assessments' THEN 'assessments_booked'
                WHEN goal_type = 'proposals' THEN 'proposals_sent'
                WHEN goal_type = 'wins' THEN 'wins'
                WHEN goal_type = 'pop_ins' THEN 'pop_ins'
                WHEN goal_type = 'dm_conversations' THEN 'dm_conversations'
                WHEN goal_type = 'assessments_booked' THEN 'assessments_booked'
                WHEN goal_type = 'proposals_sent' THEN 'proposals_sent'
                ELSE 'dm_conversations'
            END
        ) as combined_target_value,
        SUM(current_value) OVER (PARTITION BY user_id, week_start_date, 
            CASE 
                WHEN goal_type IN ('calls', 'emails') THEN 'dm_conversations'
                WHEN goal_type = 'assessments' THEN 'assessments_booked'
                WHEN goal_type = 'proposals' THEN 'proposals_sent'
                WHEN goal_type = 'wins' THEN 'wins'
                WHEN goal_type = 'pop_ins' THEN 'pop_ins'
                WHEN goal_type = 'dm_conversations' THEN 'dm_conversations'
                WHEN goal_type = 'assessments_booked' THEN 'assessments_booked'
                WHEN goal_type = 'proposals_sent' THEN 'proposals_sent'
                ELSE 'dm_conversations'
            END
        ) as combined_current_value
    FROM public.weekly_goals 
    GROUP BY user_id, week_start_date, goal_type, id, target_value, current_value, created_at;

    -- Delete all existing weekly_goals records
    DELETE FROM public.weekly_goals;

    -- Insert consolidated records back
    INSERT INTO public.weekly_goals (id, user_id, week_start_date, goal_type, target_value, current_value)
    SELECT 
        keep_id,
        user_id,
        week_start_date,
        new_goal_type,
        combined_target_value,
        combined_current_value
    FROM weekly_goals_consolidated;

    RAISE NOTICE 'Successfully consolidated duplicate weekly goals records';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during weekly goals consolidation: %', SQLERRM;
        RAISE;
END $$;

-- Step 6: Add CHECK constraint to weekly_goals table to constrain goal_type values
ALTER TABLE public.weekly_goals 
ADD CONSTRAINT check_weekly_goals_goal_type 
CHECK (goal_type IN ('pop_ins', 'dm_conversations', 'assessments_booked', 'proposals_sent', 'wins'));

-- Step 7: Add sample activities (not weekly goals to avoid constraint conflicts)
DO $$
DECLARE
    activity_id UUID;
    opportunity_id UUID;
    user_id UUID;
    tenant_id UUID;
BEGIN
    -- Get existing opportunity and user for linking
    SELECT id INTO opportunity_id FROM public.opportunities LIMIT 1;
    SELECT id INTO user_id FROM public.user_profiles LIMIT 1;
    SELECT tenant_id INTO tenant_id FROM public.user_profiles WHERE id = user_id;
    
    -- Only add sample data if we have existing records to reference
    IF opportunity_id IS NOT NULL AND user_id IS NOT NULL AND tenant_id IS NOT NULL THEN
        -- Add sample activity with new activity type and link to opportunity
        INSERT INTO public.activities (
            id, user_id, tenant_id, opportunity_id, activity_type, outcome, 
            subject, activity_date, notes, description
        ) VALUES (
            gen_random_uuid(),
            user_id,
            tenant_id,
            opportunity_id,
            'Pop-in'::public.activity_type,
            'Assessment Completed'::public.activity_outcome,
            'Unexpected property visit - Assessment opportunity',
            NOW(),
            'Conducted impromptu assessment during pop-in visit. Property manager was very receptive.',
            'Pop-in visit that led to immediate assessment scheduling'
        );

        -- Add sample DM conversation activity
        INSERT INTO public.activities (
            id, user_id, tenant_id, opportunity_id, activity_type, outcome,
            subject, activity_date, notes, description
        ) VALUES (
            gen_random_uuid(),
            user_id,
            tenant_id,
            opportunity_id,
            'Decision Maker Conversation'::public.activity_type,
            'Interested'::public.activity_outcome,
            'Direct conversation with facility manager',
            NOW() - INTERVAL '1 day',
            'Had productive conversation with the decision maker about roofing needs.',
            'Direct access to key decision maker resulted in positive interest'
        );

        RAISE NOTICE 'Sample activities with new types and opportunity links added successfully';
    ELSE
        RAISE NOTICE 'No existing opportunities or users found. Sample data not added.';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding sample data: %', SQLERRM;
END $$;

-- Step 8: Add comment for documentation
COMMENT ON COLUMN public.activities.opportunity_id IS 'Links activity to specific opportunity for better tracking and reporting';
COMMENT ON CONSTRAINT check_weekly_goals_goal_type ON public.weekly_goals IS 'Ensures weekly goals only use predefined KPI keys: pop_ins, dm_conversations, assessments_booked, proposals_sent, wins';