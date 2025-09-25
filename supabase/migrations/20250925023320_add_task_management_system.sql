-- Location: supabase/migrations/20250925023320_add_task_management_system.sql
-- Schema Analysis: Existing CRM system with accounts, properties, contacts, opportunities, user_profiles, activities
-- Integration Type: ADDITIVE - New task management module
-- Dependencies: accounts, properties, contacts, opportunities, user_profiles, tenants tables

-- 1. Create task-related enums
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_category AS ENUM (
  'follow_up_call', 
  'site_visit', 
  'proposal_review', 
  'contract_negotiation', 
  'assessment_scheduling',
  'document_review',
  'meeting_setup',
  'property_inspection',
  'client_check_in',
  'other'
);

-- 2. Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status public.task_status DEFAULT 'pending'::public.task_status,
    priority public.task_priority DEFAULT 'medium'::public.task_priority,
    category public.task_category DEFAULT 'other'::public.task_category,
    due_date TIMESTAMPTZ,
    reminder_date TIMESTAMPTZ,
    
    -- Assignment relationships
    assigned_to UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    
    -- Entity associations (flexible - can link to any of these)
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    
    -- Completion tracking
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Tenant isolation
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create task comments table for collaboration
CREATE TABLE public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- 4. Create indexes for performance
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON public.tasks(assigned_by);
CREATE INDEX idx_tasks_tenant_id ON public.tasks(tenant_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_account_id ON public.tasks(account_id);
CREATE INDEX idx_tasks_property_id ON public.tasks(property_id);
CREATE INDEX idx_tasks_contact_id ON public.tasks(contact_id);
CREATE INDEX idx_tasks_opportunity_id ON public.tasks(opportunity_id);
CREATE INDEX idx_tasks_status_priority ON public.tasks(status, priority);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_author_id ON public.task_comments(author_id);
CREATE INDEX idx_task_comments_tenant_id ON public.task_comments(tenant_id);

-- 5. Create functions for task management

-- Function to update task status and handle completion
CREATE OR REPLACE FUNCTION public.update_task_status(
    task_uuid UUID,
    new_status public.task_status,
    completion_notes TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update task status
    UPDATE public.tasks
    SET 
        status = new_status,
        completed_at = CASE WHEN new_status = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END,
        completion_notes = CASE WHEN new_status = 'completed' THEN completion_notes ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = task_uuid
    AND (assigned_to = auth.uid() OR assigned_by = auth.uid());
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Task status updated successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'Task not found or insufficient permissions'::TEXT;
    END IF;
END;
$$;

-- Function to get tasks with entity details
CREATE OR REPLACE FUNCTION public.get_tasks_with_details(
    user_uuid UUID DEFAULT NULL,
    status_filter public.task_status DEFAULT NULL,
    priority_filter public.task_priority DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    status TEXT,
    priority TEXT,
    category TEXT,
    due_date TIMESTAMPTZ,
    assigned_to_name TEXT,
    assigned_by_name TEXT,
    account_name TEXT,
    property_name TEXT,
    contact_name TEXT,
    opportunity_name TEXT,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
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
        t.category::TEXT,
        t.due_date,
        assigned.full_name as assigned_to_name,
        assigner.full_name as assigned_by_name,
        a.name as account_name,
        p.name as property_name,
        CONCAT(c.first_name, ' ', c.last_name) as contact_name,
        o.name as opportunity_name,
        t.created_at,
        t.completed_at
    FROM public.tasks t
    LEFT JOIN public.user_profiles assigned ON t.assigned_to = assigned.id
    LEFT JOIN public.user_profiles assigner ON t.assigned_by = assigner.id
    LEFT JOIN public.accounts a ON t.account_id = a.id
    LEFT JOIN public.properties p ON t.property_id = p.id
    LEFT JOIN public.contacts c ON t.contact_id = c.id
    LEFT JOIN public.opportunities o ON t.opportunity_id = o.id
    WHERE t.tenant_id = get_user_tenant_id()
    AND (user_uuid IS NULL OR t.assigned_to = user_uuid OR t.assigned_by = user_uuid)
    AND (status_filter IS NULL OR t.status = status_filter)
    AND (priority_filter IS NULL OR t.priority = priority_filter)
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

-- Function to get task completion metrics
CREATE OR REPLACE FUNCTION public.get_task_metrics()
RETURNS TABLE(
    total_tasks INTEGER,
    pending_tasks INTEGER,
    in_progress_tasks INTEGER,
    completed_tasks INTEGER,
    overdue_tasks INTEGER,
    completion_rate DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::INTEGER as in_progress_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_tasks,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END)::INTEGER as overdue_tasks,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100, 2)
            ELSE 0
        END as completion_rate
    FROM public.tasks
    WHERE tenant_id = get_user_tenant_id()
    AND (assigned_to = auth.uid() OR assigned_by = auth.uid());
END;
$$;

-- 6. Create triggers for task management

-- Trigger to set tenant_id on tasks (only if not already provided)
CREATE OR REPLACE FUNCTION public.set_task_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only set tenant_id if it's not already provided
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id = get_user_tenant_id();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_task_tenant_id
    BEFORE INSERT ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_task_tenant_id();

-- Trigger to set tenant_id on task comments (only if not already provided)
CREATE OR REPLACE FUNCTION public.set_task_comment_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only set tenant_id if it's not already provided
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id = get_user_tenant_id();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_task_comment_tenant_id
    BEFORE INSERT ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION public.set_task_comment_tenant_id();

-- Trigger to validate task tenant consistency
CREATE TRIGGER trigger_validate_tasks_tenant_consistency
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_consistency();

CREATE TRIGGER trigger_validate_task_comments_tenant_consistency
    BEFORE INSERT OR UPDATE ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_consistency();

-- Trigger to handle updated_at
CREATE TRIGGER handle_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 7. Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies using Pattern 2 (Simple User Ownership)

-- Tasks policies - users can manage their assigned tasks or tasks they created
CREATE POLICY "users_manage_assigned_tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (
    (tenant_id = get_user_tenant_id()) AND 
    (assigned_to = auth.uid() OR assigned_by = auth.uid())
)
WITH CHECK (
    (tenant_id = get_user_tenant_id()) AND 
    (assigned_to = auth.uid() OR assigned_by = auth.uid())
);

-- Managers can view and manage tasks for their team members
CREATE POLICY "managers_access_team_tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (
    (tenant_id = get_user_tenant_id()) AND
    (assigned_to IN (
        SELECT id FROM public.user_profiles 
        WHERE manager_id = auth.uid() AND tenant_id = get_user_tenant_id()
    ) OR assigned_by = auth.uid())
)
WITH CHECK (
    (tenant_id = get_user_tenant_id()) AND
    (assigned_to IN (
        SELECT id FROM public.user_profiles 
        WHERE manager_id = auth.uid() AND tenant_id = get_user_tenant_id()
    ) OR assigned_by = auth.uid())
);

-- Task comments policies
CREATE POLICY "users_manage_own_task_comments"
ON public.task_comments
FOR ALL
TO authenticated
USING (
    (tenant_id = get_user_tenant_id()) AND 
    (author_id = auth.uid() OR 
     EXISTS (
        SELECT 1 FROM public.tasks t 
        WHERE t.id = task_id 
        AND (t.assigned_to = auth.uid() OR t.assigned_by = auth.uid())
    ))
)
WITH CHECK (
    (tenant_id = get_user_tenant_id()) AND 
    author_id = auth.uid()
);

-- Super admin policies
CREATE POLICY "super_admin_full_access_tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (is_super_admin_from_auth())
WITH CHECK (is_super_admin_from_auth());

CREATE POLICY "super_admin_full_access_task_comments"
ON public.task_comments
FOR ALL
TO authenticated
USING (is_super_admin_from_auth())
WITH CHECK (is_super_admin_from_auth());

-- 9. Create sample task data
DO $$
DECLARE
    manager_id UUID;
    rep1_id UUID;
    rep2_id UUID;
    account1_id UUID;
    account2_id UUID;
    property1_id UUID;
    contact1_id UUID;
    opportunity1_id UUID;
    tenant1_id UUID;
    task1_id UUID := gen_random_uuid();
    task2_id UUID := gen_random_uuid();
    task3_id UUID := gen_random_uuid();
    task4_id UUID := gen_random_uuid();
BEGIN
    -- Get existing users and entities
    SELECT id INTO tenant1_id FROM public.tenants LIMIT 1;
    
    IF tenant1_id IS NOT NULL THEN
        SELECT id INTO manager_id FROM public.user_profiles 
        WHERE role = 'manager' AND tenant_id = tenant1_id LIMIT 1;
        
        SELECT id INTO rep1_id FROM public.user_profiles 
        WHERE role = 'rep' AND tenant_id = tenant1_id LIMIT 1;
        
        SELECT id INTO rep2_id FROM public.user_profiles 
        WHERE role = 'rep' AND tenant_id = tenant1_id 
        AND id != COALESCE(rep1_id, '00000000-0000-0000-0000-000000000000') LIMIT 1;
        
        SELECT id INTO account1_id FROM public.accounts WHERE tenant_id = tenant1_id LIMIT 1;
        SELECT id INTO account2_id FROM public.accounts WHERE tenant_id = tenant1_id AND id != COALESCE(account1_id, '00000000-0000-0000-0000-000000000000') LIMIT 1;
        SELECT id INTO property1_id FROM public.properties WHERE tenant_id = tenant1_id LIMIT 1;
        SELECT id INTO contact1_id FROM public.contacts WHERE tenant_id = tenant1_id LIMIT 1;
        SELECT id INTO opportunity1_id FROM public.opportunities WHERE tenant_id = tenant1_id LIMIT 1;
        
        -- Create sample tasks with various entity associations
        IF manager_id IS NOT NULL AND rep1_id IS NOT NULL THEN
            INSERT INTO public.tasks (
                id, title, description, status, priority, category, due_date,
                assigned_to, assigned_by, account_id, tenant_id
            ) VALUES (
                task1_id,
                'Follow up on roofing proposal',
                'Contact client to discuss the commercial roofing proposal submitted last week. Address any questions and negotiate pricing.',
                'pending',
                'high',
                'follow_up_call',
                CURRENT_TIMESTAMP + INTERVAL '2 days',
                rep1_id,
                manager_id,
                account1_id,
                tenant1_id
            );
            
            INSERT INTO public.tasks (
                id, title, description, status, priority, category, due_date,
                assigned_to, assigned_by, property_id, tenant_id
            ) VALUES (
                task2_id,
                'Schedule property inspection',
                'Coordinate with property manager to schedule comprehensive roof inspection for the industrial complex.',
                'in_progress',
                'medium',
                'site_visit',
                CURRENT_TIMESTAMP + INTERVAL '5 days',
                rep1_id,
                manager_id,
                property1_id,
                tenant1_id
            );
            
            IF rep2_id IS NOT NULL THEN
                INSERT INTO public.tasks (
                    id, title, description, status, priority, category, due_date,
                    assigned_to, assigned_by, contact_id, tenant_id
                ) VALUES (
                    task3_id,
                    'Build relationship with facilities manager',
                    'Set up initial meeting with the new facilities manager to introduce our services and establish working relationship.',
                    'pending',
                    'medium',
                    'meeting_setup',
                    CURRENT_TIMESTAMP + INTERVAL '3 days',
                    rep2_id,
                    manager_id,
                    contact1_id,
                    tenant1_id
                );
            END IF;
            
            INSERT INTO public.tasks (
                id, title, description, status, priority, category, due_date,
                assigned_to, assigned_by, opportunity_id, tenant_id, reminder_date
            ) VALUES (
                task4_id,
                'Finalize contract negotiations',
                'Review contract terms and finalize pricing for the warehouse re-roofing project. Prepare final proposal for client signature.',
                'pending',
                'urgent',
                'contract_negotiation',
                CURRENT_TIMESTAMP + INTERVAL '1 day',
                rep1_id,
                manager_id,
                opportunity1_id,
                tenant1_id,
                CURRENT_TIMESTAMP + INTERVAL '12 hours'
            );
            
            -- Add some sample comments
            INSERT INTO public.task_comments (task_id, author_id, content, tenant_id) VALUES
                (task1_id, manager_id, 'Remember to emphasize our 25-year warranty when discussing pricing.', tenant1_id),
                (task2_id, rep1_id, 'Property manager confirmed availability for Thursday morning inspection.', tenant1_id),
                (task4_id, manager_id, 'Client is very interested. This could lead to additional projects with their other properties.', tenant1_id);
        END IF;
    END IF;
END $$;