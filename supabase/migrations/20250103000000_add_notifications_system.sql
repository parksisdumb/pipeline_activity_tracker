-- Location: supabase/migrations/20250103000000_add_notifications_system.sql
-- Schema Analysis: Existing schema has user_profiles, tenants, tasks, and activities tables
-- Integration Type: NEW_MODULE - adding notifications functionality
-- Dependencies: user_profiles, tenants, tasks, activities tables

-- 1. Create notification types enum
CREATE TYPE public.notification_type AS ENUM (
  'task_assigned', 
  'task_due', 
  'task_overdue',
  'activity_assessment',
  'activity_contract_signed',
  'system_alert'
);

-- 2. Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes for performance
CREATE INDEX idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read_at, created_at);
CREATE INDEX idx_notifications_type_created ON public.notifications(type, created_at);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- 4. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies using Pattern 2: Simple User Ownership
CREATE POLICY "users_manage_own_notifications"
ON public.notifications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. Create helper functions for notification triggers
CREATE OR REPLACE FUNCTION public.create_task_assignment_notification()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create notification if task is assigned to someone other than creator
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.assigned_by THEN
    INSERT INTO public.notifications (
      tenant_id,
      user_id,
      type,
      title,
      body,
      data
    ) VALUES (
      NEW.tenant_id,
      NEW.assigned_to,
      'task_assigned'::public.notification_type,
      'New Task Assigned',
      'You have been assigned a new task: ' || NEW.title,
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', NEW.title,
        'assigned_by', NEW.assigned_by,
        'due_date', NEW.due_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Create function for activity notifications
CREATE OR REPLACE FUNCTION public.create_activity_notification()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  should_notify BOOLEAN := false;
BEGIN
  -- Check if this is an Assessment or Contract Signed activity
  IF NEW.activity_type = 'Assessment' OR NEW.outcome = 'Contract Signed' THEN
    should_notify := true;
    
    IF NEW.activity_type = 'Assessment' THEN
      notification_title := 'Assessment Completed';
      notification_body := 'An assessment has been completed: ' || NEW.subject;
    ELSIF NEW.outcome = 'Contract Signed' THEN
      notification_title := 'Contract Signed!';
      notification_body := 'Great news! A contract has been signed: ' || NEW.subject;
    END IF;
    
    -- Create notification for the user who performed the activity
    IF should_notify AND NEW.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        tenant_id,
        user_id,
        type,
        title,
        body,
        data
      ) VALUES (
        NEW.tenant_id,
        NEW.user_id,
        CASE 
          WHEN NEW.activity_type = 'Assessment' THEN 'activity_assessment'::public.notification_type
          WHEN NEW.outcome = 'Contract Signed' THEN 'activity_contract_signed'::public.notification_type
        END,
        notification_title,
        notification_body,
        jsonb_build_object(
          'activity_id', NEW.id,
          'activity_type', NEW.activity_type,
          'outcome', NEW.outcome,
          'subject', NEW.subject,
          'account_id', NEW.account_id,
          'contact_id', NEW.contact_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Create function for due/overdue task notifications
CREATE OR REPLACE FUNCTION public.create_task_due_notifications()
RETURNS TABLE(notifications_created INTEGER)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  task_record RECORD;
  notifications_count INTEGER := 0;
BEGIN
  -- Find tasks due today that haven't been completed
  FOR task_record IN
    SELECT t.id, t.tenant_id, t.assigned_to, t.title, t.due_date, t.priority
    FROM public.tasks t
    WHERE t.due_date::date = CURRENT_DATE
    AND t.status != 'completed'
    AND t.assigned_to IS NOT NULL
    -- Only create notification if one doesn't already exist for today
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = t.assigned_to
      AND n.type = 'task_due'
      AND n.data->>'task_id' = t.id::text
      AND n.created_at::date = CURRENT_DATE
    )
  LOOP
    INSERT INTO public.notifications (
      tenant_id,
      user_id,
      type,
      title,
      body,
      data
    ) VALUES (
      task_record.tenant_id,
      task_record.assigned_to,
      'task_due'::public.notification_type,
      'Task Due Today',
      'Task "' || task_record.title || '" is due today.',
      jsonb_build_object(
        'task_id', task_record.id,
        'task_title', task_record.title,
        'due_date', task_record.due_date,
        'priority', task_record.priority
      )
    );
    
    notifications_count := notifications_count + 1;
  END LOOP;
  
  -- Find overdue tasks
  FOR task_record IN
    SELECT t.id, t.tenant_id, t.assigned_to, t.title, t.due_date, t.priority
    FROM public.tasks t
    WHERE t.due_date < CURRENT_DATE
    AND t.status != 'completed'
    AND t.assigned_to IS NOT NULL
    -- Only create notification if one doesn't already exist for today
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = t.assigned_to
      AND n.type = 'task_overdue'
      AND n.data->>'task_id' = t.id::text
      AND n.created_at::date = CURRENT_DATE
    )
  LOOP
    INSERT INTO public.notifications (
      tenant_id,
      user_id,
      type,
      title,
      body,
      data
    ) VALUES (
      task_record.tenant_id,
      task_record.assigned_to,
      'task_overdue'::public.notification_type,
      'Task Overdue',
      'Task "' || task_record.title || '" is overdue.',
      jsonb_build_object(
        'task_id', task_record.id,
        'task_title', task_record.title,
        'due_date', task_record.due_date,
        'priority', task_record.priority
      )
    );
    
    notifications_count := notifications_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT notifications_count;
END;
$$;

-- 9. Create triggers
CREATE TRIGGER trigger_task_assignment_notification
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_task_assignment_notification();

CREATE TRIGGER trigger_activity_notification
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_notification();

-- 10. Add updated_at trigger for notifications
CREATE TRIGGER handle_updated_at_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 11. Create sample notifications for existing users
DO $$
DECLARE
  existing_user_id UUID;
  existing_tenant_id UUID;
  sample_task_id UUID;
BEGIN
  -- Get existing user and tenant IDs
  SELECT id, tenant_id INTO existing_user_id, existing_tenant_id 
  FROM public.user_profiles 
  WHERE is_active = true 
  LIMIT 1;
  
  -- Get existing task ID
  SELECT id INTO sample_task_id
  FROM public.tasks
  WHERE assigned_to = existing_user_id
  LIMIT 1;
  
  -- Only create sample notifications if we found valid data
  IF existing_user_id IS NOT NULL AND existing_tenant_id IS NOT NULL THEN
    INSERT INTO public.notifications (tenant_id, user_id, type, title, body, data, created_at) VALUES
      (existing_tenant_id, existing_user_id, 'task_assigned', 'Welcome to Notifications', 'This is your first notification! You will receive alerts here for task assignments and key activities.', 
       jsonb_build_object('source', 'welcome'), CURRENT_TIMESTAMP - INTERVAL '1 hour'),
      (existing_tenant_id, existing_user_id, 'system_alert', 'System Update', 'The notification system has been successfully set up for your account.', 
       '{}', CURRENT_TIMESTAMP - INTERVAL '30 minutes');
    
    -- Add task-specific notification if we have a task
    IF sample_task_id IS NOT NULL THEN
      INSERT INTO public.notifications (tenant_id, user_id, type, title, body, data, created_at) VALUES
        (existing_tenant_id, existing_user_id, 'task_due', 'Task Reminder', 'You have tasks that need attention. Check your task list to stay on track.', 
         jsonb_build_object('task_id', sample_task_id, 'source', 'sample'), CURRENT_TIMESTAMP - INTERVAL '15 minutes');
    END IF;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors in sample data creation
    RAISE NOTICE 'Sample notification creation skipped: %', SQLERRM;
END $$;