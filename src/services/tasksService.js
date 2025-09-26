import { supabase } from '../lib/supabase';

export const tasksService = {
  // Get tasks with details using the database function
  async getTasksWithDetails(userUuid = null, statusFilter = null, priorityFilter = null) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase?.rpc('get_tasks_with_details', {
        user_uuid: userUuid,
        status_filter: statusFilter,
        priority_filter: priorityFilter
      });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get tasks with details:', error);
      throw error;
    }
  },

  // Get tasks by contact ID
  async getTasksByContactId(contactId) {
    try {
      const { data, error } = await supabase?.from('tasks')?.select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          creator:assigned_by(id, full_name, email),
          account:account_id(id, name),
          property:property_id(id, name),
          contact:contact_id(id, first_name, last_name),
          opportunity:opportunity_id(id, name)
        `)?.eq('contact_id', contactId)?.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Failed to get tasks by contact ID:', error);
      return { data: [], error };
    }
  },

  // Get task metrics using the database function
  async getTaskMetrics() {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase?.rpc('get_task_metrics');

      if (error) {
        throw error;
      }

      return data?.[0] || {
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
        overdue_tasks: 0,
        completion_rate: 0
      };
    } catch (error) {
      console.error('Failed to get task metrics:', error);
      throw error;
    }
  },

  // Update task status using the database function
  async updateTaskStatus(taskId, newStatus, completionNotes = null) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase?.rpc('update_task_status', {
        task_uuid: taskId,
        new_status: newStatus,
        completion_notes_param: completionNotes
      });

      if (error) {
        throw error;
      }

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to update task status');
      }

      return result;
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  },

  // Get all tasks for the current user
  async getTasks() {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase?.rpc('get_tasks_with_details', {
        user_uuid: user?.id
      });

      if (error) {
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Get available assignees (team members for task assignment)
  async getAvailableAssignees() {
    try {
      const { data, error } = await supabase?.from('user_profiles')?.select('id, full_name, email, role')?.eq('is_active', true)?.order('full_name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get available assignees:', error);
      throw error;
    }
  },

  // Create a new task
  async createTask(taskData) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase?.from('tasks')?.insert([{
          ...taskData,
          assigned_by: user?.id
        }])?.select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          creator:assigned_by(id, full_name, email),
          account:account_id(id, name),
          property:property_id(id, name),
          contact:contact_id(id, first_name, last_name),
          opportunity:opportunity_id(id, name)
        `)?.single();

      if (error) {
        throw error;
      }

      return data; // Return data directly for CreateTaskModal compatibility
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  },

  // Update a task
  async updateTask(taskId, updates) {
    try {
      const { data, error } = await supabase?.from('tasks')?.update({
          ...updates,
          updated_at: new Date()?.toISOString()
        })?.eq('id', taskId)?.select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          creator:assigned_by(id, full_name, email),
          account:account_id(id, name),
          property:property_id(id, name),
          contact:contact_id(id, first_name, last_name),
          opportunity:opportunity_id(id, name)
        `)?.single();

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Complete a task using the database function
  async completeTask(taskId) {
    try {
      const { data, error } = await supabase?.rpc('complete_task', {
        task_uuid: taskId
      });

      if (error) {
        throw error;
      }

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to complete task');
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Delete a task
  async deleteTask(taskId) {
    try {
      const { error } = await supabase?.from('tasks')?.delete()?.eq('id', taskId);

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Get task comments
  async getTaskComments(taskId) {
    try {
      const { data, error } = await supabase?.from('task_comments')?.select(`
          *,
          author:author_id(id, full_name, email)
        `)?.eq('task_id', taskId)?.order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Add a comment to a task
  async addTaskComment(taskId, content) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase?.from('task_comments')?.insert([{
          task_id: taskId,
          author_id: user?.id,
          content
        }])?.select(`
          *,
          author:author_id(id, full_name, email)
        `)?.single();

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get available entities for task assignment
  async getEntitiesForAssignment() {
    try {
      const [accountsResult, propertiesResult, contactsResult, opportunitiesResult] = await Promise.all([
        supabase?.from('accounts')?.select('id, name')?.eq('is_active', true)?.order('name'),
        supabase?.from('properties')?.select('id, name')?.order('name'),
        supabase?.from('contacts')?.select('id, first_name, last_name')?.order('first_name'),
        supabase?.from('opportunities')?.select('id, name')?.order('name')
      ]);

      return {
        data: {
          accounts: accountsResult?.data || [],
          properties: propertiesResult?.data || [],
          contacts: (contactsResult?.data || [])?.map(contact => ({
            ...contact,
            name: `${contact?.first_name} ${contact?.last_name}`
          })),
          opportunities: opportunitiesResult?.data || []
        },
        error: null
      };
    } catch (error) {
      return { 
        data: { accounts: [], properties: [], contacts: [], opportunities: [] }, 
        error 
      };
    }
  },

  // Get team members for task assignment
  async getTeamMembers() {
    try {
      const { data, error } = await supabase?.from('user_profiles')?.select('id, full_name, email, role')?.eq('is_active', true)?.order('full_name');

      if (error) {
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  // Subscribe to task changes
  subscribeToTasks(callback) {
    const channel = supabase?.channel('tasks_changes')?.on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tasks' }, 
          callback)?.subscribe();

    return () => supabase?.removeChannel(channel);
  },

  // Subscribe to task comment changes
  subscribeToTaskComments(taskId, callback) {
    const channel = supabase?.channel(`task_comments_${taskId}`)?.on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'task_comments',
            filter: `task_id=eq.${taskId}`
          }, 
          callback)?.subscribe();

    return () => supabase?.removeChannel(channel);
  }
};

export default tasksService;