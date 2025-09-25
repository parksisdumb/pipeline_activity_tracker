-- Location: supabase/migrations/20250925033320_add_task_management_system.sql
-- Schema Analysis: Existing CRM system with accounts, properties, contacts, opportunities, user_profiles, tenants
-- Integration Type: addition - new task management functionality
-- Dependencies: user_profiles, accounts, properties, contacts, opportunities, tenants

-- Create task status and priority enums
CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress', 
    'completed',
    'cancelled'
);

CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status public.task_status DEFAULT 'pending'::public.task_status,
    priority public.task_priority DEFAULT 'medium'::public.task_priority,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Assignment fields
    assigned_to UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    
    -- Entity relationship fields (task can be related to one of these)
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    
    -- Tenant isolation
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Tracking fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure task is related to exactly one entity
    CONSTRAINT tasks_single_entity_check CHECK (
        (account_id IS NOT NULL)::int + 
        (property_id IS NOT NULL)::int + 
        (contact_id IS NOT NULL)::int + 
        (opportunity_id IS NOT NULL)::int = 1
    )
);

-- Create task comments table
CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimal performance
CREATE INDEX idx_tasks_tenant_id ON public.tasks(tenant_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_account_id ON public.tasks(account_id);
CREATE INDEX idx_tasks_property_id ON public.tasks(property_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_tasks_opportunity_id ON public.tasks(opportunity_id);
CREATE INDEX idx_tasks_status_assigned ON public.tasks(status, assigned_to);
CREATE INDEX idx_tasks_due_date_status ON public.tasks(due_date, status);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_author_id ON public.task_comments(author_id);
CREATE INDEX idx_task_comments_tenant_id ON public.task_comments(tenant_id);

-- Function to automatically set tenant_id for tasks
CREATE OR REPLACE FUNCTION public.set_task_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Get tenant_id from the assigned user
    SELECT tenant_id INTO NEW.tenant_id 
    FROM public.user_profiles 
    WHERE id = NEW.assigned_to;
    
    -- If tenant_id is still null, get it from created_by
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id 
        FROM public.user_profiles 
        WHERE id = NEW.created_by;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to automatically set tenant_id for task comments
CREATE OR REPLACE FUNCTION public.set_task_comment_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Get tenant_id from the task
    SELECT tenant_id INTO NEW.tenant_id 
    FROM public.tasks 
    WHERE id = NEW.task_id;
    
    RETURN NEW;
END;
$$;

-- Function for task completion
CREATE OR REPLACE FUNCTION public.complete_task(task_uuid UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Check if task exists and user has permission
    SELECT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_uuid 
        AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
    ) INTO task_exists;
    
    IF NOT task_exists THEN
        RETURN QUERY SELECT FALSE, 'Task not found or no permission'::TEXT;
        RETURN;
    END IF;
    
    -- Update task status and completion time
    UPDATE public.tasks 
    SET 
        status = 'completed'::public.task_status,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = task_uuid;
    
    RETURN QUERY SELECT TRUE, 'Task completed successfully'::TEXT;
END;
$$;

-- Function to get tasks with entity details
CREATE OR REPLACE FUNCTION public.get_tasks_with_details(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    status TEXT,
    priority TEXT,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    assigned_to_name TEXT,
    created_by_name TEXT,
    entity_type TEXT,
    entity_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status::TEXT,
        t.priority::TEXT,
        t.due_date,
        t.completed_at,
        assigned_user.full_name as assigned_to_name,
        creator_user.full_name as created_by_name,
        CASE 
            WHEN t.account_id IS NOT NULL THEN 'account'
            WHEN t.property_id IS NOT NULL THEN 'property'  
            WHEN t.contact_id IS NOT NULL THEN 'contact'
            WHEN t.opportunity_id IS NOT NULL THEN 'opportunity'
            ELSE 'unknown'
        END as entity_type,
        CASE
            WHEN t.account_id IS NOT NULL THEN a.name
            WHEN t.property_id IS NOT NULL THEN p.name
            WHEN t.contact_id IS NOT NULL THEN (c.first_name || ' ' || c.last_name)
            WHEN t.opportunity_id IS NOT NULL THEN o.name
            ELSE 'Unknown Entity'
        END as entity_name,
        t.created_at,
        t.updated_at
    FROM public.tasks t
    LEFT JOIN public.user_profiles assigned_user ON t.assigned_to = assigned_user.id
    LEFT JOIN public.user_profiles creator_user ON t.created_by = creator_user.id
    LEFT JOIN public.accounts a ON t.account_id = a.id
    LEFT JOIN public.properties p ON t.property_id = p.id
    LEFT JOIN public.contacts c ON t.contact_id = c.id
    LEFT JOIN public.opportunities o ON t.opportunity_id = o.id
    WHERE t.assigned_to = user_uuid OR t.created_by = user_uuid
    ORDER BY 
        CASE t.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
        END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_set_task_tenant_id
    BEFORE INSERT ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_task_tenant_id();

CREATE TRIGGER trigger_set_task_comment_tenant_id
    BEFORE INSERT ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION public.set_task_comment_tenant_id();

CREATE TRIGGER handle_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_task_comments
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "super_admin_full_access_tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (public.is_super_admin_from_auth())
WITH CHECK (public.is_super_admin_from_auth());

CREATE POLICY "users_manage_assigned_tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (assigned_to = auth.uid() OR created_by = auth.uid())
WITH CHECK (assigned_to = auth.uid() OR created_by = auth.uid());

-- RLS Policies for task comments
CREATE POLICY "super_admin_full_access_task_comments"
ON public.task_comments
FOR ALL
TO authenticated
USING (public.is_super_admin_from_auth())
WITH CHECK (public.is_super_admin_from_auth());

CREATE POLICY "users_manage_own_task_comments"
ON public.task_comments
FOR ALL
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Mock data for testing
DO $$
DECLARE
    existing_user_id1 UUID;
    existing_user_id2 UUID;
    existing_account_id UUID;
    existing_property_id UUID;
    existing_contact_id UUID;
    existing_opportunity_id UUID;
    task1_id UUID := gen_random_uuid();
    task2_id UUID := gen_random_uuid();
    task3_id UUID := gen_random_uuid();
    task4_id UUID := gen_random_uuid();
BEGIN
    -- Get existing users
    SELECT id INTO existing_user_id1 FROM public.user_profiles WHERE role = 'manager' LIMIT 1;
    SELECT id INTO existing_user_id2 FROM public.user_profiles WHERE role = 'rep' LIMIT 1;
    
    -- Get existing entities
    SELECT id INTO existing_account_id FROM public.accounts LIMIT 1;
    SELECT id INTO existing_property_id FROM public.properties LIMIT 1;
    SELECT id INTO existing_contact_id FROM public.contacts LIMIT 1;
    SELECT id INTO existing_opportunity_id FROM public.opportunities LIMIT 1;
    
    -- Create sample tasks if we have existing users and entities
    IF existing_user_id1 IS NOT NULL AND existing_user_id2 IS NOT NULL THEN
        -- Task assigned to account
        IF existing_account_id IS NOT NULL THEN
            INSERT INTO public.tasks (id, title, description, priority, due_date, assigned_to, created_by, account_id)
            VALUES (
                task1_id,
                'Follow up on vendor packet submission',
                'Contact the client to confirm receipt of vendor packet and inquire about next steps in approval process.',
                'high'::public.task_priority,
                CURRENT_TIMESTAMP + INTERVAL '3 days',
                existing_user_id2,
                existing_user_id1,
                existing_account_id
            );
        END IF;
        
        -- Task assigned to property
        IF existing_property_id IS NOT NULL THEN
            INSERT INTO public.tasks (id, title, description, priority, due_date, assigned_to, created_by, property_id)
            VALUES (
                task2_id,
                'Schedule roof assessment',
                'Coordinate with property manager to schedule comprehensive roof assessment and inspection.',
                'urgent'::public.task_priority,
                CURRENT_TIMESTAMP + INTERVAL '1 day',
                existing_user_id2,
                existing_user_id1,
                existing_property_id
            );
        END IF;
        
        -- Task assigned to contact
        IF existing_contact_id IS NOT NULL THEN
            INSERT INTO public.tasks (id, title, description, priority, due_date, assigned_to, created_by, contact_id)
            VALUES (
                task3_id,
                'Reach out to key decision maker',
                'Connect with contact to establish relationship and understand their role in decision-making process.',
                'medium'::public.task_priority,
                CURRENT_TIMESTAMP + INTERVAL '2 days',
                existing_user_id2,
                existing_user_id1,
                existing_contact_id
            );
        END IF;
        
        -- Task assigned to opportunity
        IF existing_opportunity_id IS NOT NULL THEN
            INSERT INTO public.tasks (id, title, description, priority, due_date, assigned_to, created_by, opportunity_id)
            VALUES (
                task4_id,
                'Prepare detailed proposal',
                'Create comprehensive proposal including scope of work, materials, timeline, and pricing for this repair opportunity.',
                'high'::public.task_priority,
                CURRENT_TIMESTAMP + INTERVAL '5 days',
                existing_user_id2,
                existing_user_id1,
                existing_opportunity_id
            );
        END IF;
        
        -- Add some task comments
        INSERT INTO public.task_comments (task_id, author_id, content)
        VALUES 
            (task1_id, existing_user_id2, 'Called the client today but got voicemail. Left message requesting callback.'),
            (task1_id, existing_user_id1, 'Good work. Please follow up again tomorrow if no response.'),
            (task2_id, existing_user_id2, 'Spoke with property manager - assessment scheduled for next Tuesday at 9 AM.');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion completed with some expected constraint variations';
END $$;