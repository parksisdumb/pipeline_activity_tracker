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

  // New method to get prioritized tasks for Today view
  async getTodayTasks(userUuid = null, limit = 10) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get all active tasks
      const tasks = await this.getTasksWithDetails(userUuid, 'pending,in_progress', null);

      // Sort by: overdue → due today → due in 3 days, then by priority
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow?.setDate(today?.getDate() + 3);

      const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };

      const sortedTasks = tasks?.sort((a, b) => {
        const aDue = a?.due_date ? new Date(a.due_date) : null;
        const bDue = b?.due_date ? new Date(b.due_date) : null;
        const aPriority = priorityWeight?.[a?.priority] || 2;
        const bPriority = priorityWeight?.[b?.priority] || 2;

        // Categorize tasks by due date
        const getDateCategory = (dueDate) => {
          if (!dueDate) return 4; // No due date = lowest priority
          if (dueDate < today) return 1; // Overdue
          if (dueDate?.toDateString() === today?.toDateString()) return 2; // Due today
          if (dueDate <= threeDaysFromNow) return 3; // Upcoming (3 days)
          return 4; // Future
        };

        const aCategory = getDateCategory(aDue);
        const bCategory = getDateCategory(bDue);

        // Sort by category first, then priority
        if (aCategory !== bCategory) {
          return aCategory - bCategory;
        }
        return bPriority - aPriority;
      });

      return sortedTasks?.slice(0, limit);
    } catch (error) {
      console.error('Failed to get today tasks:', error);
      throw error;
    }
  },

  // New method to get task counts by urgency
  async getTaskCountsByUrgency(userUuid = null) {
    try {
      const tasks = await this.getTasksWithDetails(userUuid, 'pending,in_progress', null);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow?.setDate(today?.getDate() + 3);

      const counts = { overdue: 0, dueToday: 0, upcoming: 0, total: tasks?.length };

      tasks?.forEach(task => {
        if (task?.due_date) {
          const dueDate = new Date(task.due_date);
          if (dueDate < today) {
            counts.overdue++;
          } else if (dueDate?.toDateString() === today?.toDateString()) {
            counts.dueToday++;
          } else if (dueDate <= threeDaysFromNow) {
            counts.upcoming++;
          }
        }
      });

      return counts;
    } catch (error) {
      console.error('Failed to get task counts:', error);
      return { overdue: 0, dueToday: 0, upcoming: 0, total: 0 };
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

  // Get tasks by prospect ID - NEW METHOD
  async getTasksByProspectId(prospectId) {
    try {
      const { data, error } = await supabase?.from('tasks')?.select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          creator:assigned_by(id, full_name, email),
          account:account_id(id, name),
          property:property_id(id, name),
          contact:contact_id(id, first_name, last_name),
          opportunity:opportunity_id(id, name),
          prospect:prospect_id(id, name)
        `)?.eq('prospect_id', prospectId)?.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Failed to get tasks by prospect ID:', error);
      return { data: [], error };
    }
  },

  // Get tasks with filters
  async getTasks(filters = {}) {
    try {
      let query = supabase?.from('tasks')?.select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          creator:assigned_by(id, full_name, email),
          account:account_id(id, name, company_type),
          contact:contact_id(id, first_name, last_name),
          property:property_id(id, name, address),
          opportunity:opportunity_id(id, name, stage)
        `);

      // Apply filters
      if (filters?.searchQuery) {
        query = query?.or(`title.ilike.%${filters?.searchQuery}%,description.ilike.%${filters?.searchQuery}%`);
      }

      if (filters?.status) {
        query = query?.eq('status', filters?.status);
      }

      if (filters?.priority) {
        query = query?.eq('priority', filters?.priority);
      }

      if (filters?.category) {
        query = query?.eq('category', filters?.category);
      }

      if (filters?.assignedTo) {
        query = query?.eq('assigned_to', filters?.assignedTo);
      }

      if (filters?.dueDateFrom) {
        query = query?.gte('due_date', filters?.dueDateFrom);
      }

      if (filters?.dueDateTo) {
        query = query?.lte('due_date', filters?.dueDateTo);
      }

      if (filters?.createdBy) {
        query = query?.eq('assigned_by', filters?.createdBy);
      }

      // Apply sorting
      const sortColumn = filters?.sortBy || 'due_date';
      const sortDirection = filters?.sortDirection === 'desc' ? false : true;
      query = query?.order(sortColumn, { ascending: sortDirection });

      const { data, error } = await query;

      if (error) {
        console.error('Tasks query error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load tasks' };
    }
  },

  // Enhanced getTasksForUser with priority sorting
  async getTasksForUser(userId, filters = {}) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const today = new Date();
      today?.setHours(0, 0, 0, 0);
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow?.setDate(today?.getDate() + 3);

      let query = supabase?.from('tasks')?.select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          creator:assigned_by(id, full_name, email),
          account:account_id(id, name, company_type),
          contact:contact_id(id, first_name, last_name),
          property:property_id(id, name, address),
          opportunity:opportunity_id(id, name, stage)
        `)?.eq('assigned_to', userId);

      // Apply filters
      if (filters?.status) {
        query = query?.eq('status', filters?.status);
      }

      if (filters?.dueWithin) {
        query = query?.lte('due_date', threeDaysFromNow?.toISOString());
      }

      if (filters?.overdue) {
        query = query?.lt('due_date', today?.toISOString());
      }

      if (filters?.category) {
        query = query?.eq('category', filters?.category);
      }

      // Priority-aware sorting: overdue → due today → due in 3 days, then by priority
      const { data, error } = await query?.order('due_date', { ascending: true });

      if (error) {
        console.error('Get tasks for user error:', error);
        return { success: false, error: error?.message };
      }

      // Sort tasks by urgency and priority
      const sortedTasks = (data || [])?.sort((a, b) => {
        const aDueDate = new Date(a?.due_date);
        const bDueDate = new Date(b?.due_date);

        // Define urgency categories
        const getUrgency = (dueDate) => {
          if (dueDate < today) return 3; // overdue (highest priority)
          if (dueDate?.toDateString() === today?.toDateString()) return 2; // due today
          if (dueDate <= threeDaysFromNow) return 1; // due within 3 days
          return 0; // future
        };

        const aUrgency = getUrgency(aDueDate);
        const bUrgency = getUrgency(bDueDate);

        // First sort by urgency
        if (aUrgency !== bUrgency) {
          return bUrgency - aUrgency; // higher urgency first
        }

        // Then by priority within same urgency
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder?.[a?.priority] || 0;
        const bPriority = priorityOrder?.[b?.priority] || 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        // Finally by due date
        return aDueDate - bDueDate;
      });

      return { success: true, data: sortedTasks };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load user tasks' };
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

  // Enhanced getTaskStats with better categorization
  async getTaskStats(userId, filters = {}) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      let query = supabase?.from('tasks')?.select('status, priority, due_date, category')?.eq('assigned_to', userId);

      if (filters?.dateFrom) {
        query = query?.gte('due_date', filters?.dateFrom);
      }

      if (filters?.dateTo) {
        query = query?.lte('due_date', filters?.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Task stats error:', error);
        return { success: false, error: error?.message };
      }

      // Calculate enhanced statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow?.setDate(today?.getDate() + 3);

      const stats = {
        total: data?.length || 0,
        byStatus: {},
        byPriority: {},
        byCategory: {},
        urgency: {
          overdue: 0,
          dueToday: 0,
          dueWithin3Days: 0,
          future: 0
        },
        pending: 0,
        completed: 0,
        inProgress: 0
      };

      data?.forEach(task => {
        const dueDate = new Date(task?.due_date);
        
        // Count by status
        if (task?.status) {
          stats.byStatus[task.status] = (stats?.byStatus?.[task?.status] || 0) + 1;
          
          // Count main status categories
          if (task?.status === 'pending') stats.pending++;
          else if (task?.status === 'completed') stats.completed++;
          else if (task?.status === 'in_progress') stats.inProgress++;
        }

        // Count by priority
        if (task?.priority) {
          stats.byPriority[task.priority] = (stats?.byPriority?.[task?.priority] || 0) + 1;
        }

        // Count by category
        if (task?.category) {
          stats.byCategory[task.category] = (stats?.byCategory?.[task?.category] || 0) + 1;
        }

        // Count by urgency (only for pending/in-progress tasks)
        if (task?.status !== 'completed') {
          if (dueDate < today) {
            stats.urgency.overdue++;
          } else if (dueDate?.toDateString() === today?.toDateString()) {
            stats.urgency.dueToday++;
          } else if (dueDate <= threeDaysFromNow) {
            stats.urgency.dueWithin3Days++;
          } else {
            stats.urgency.future++;
          }
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load task statistics' };
    }
  },

  async getTask(taskId) {
    if (!taskId) return { success: false, error: 'Task ID is required' };

    try {
      const { data, error } = await supabase?.from('tasks')?.select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          creator:assigned_by(id, full_name, email),
          account:account_id(id, name, company_type),
          contact:contact_id(id, first_name, last_name),
          property:property_id(id, name, address),
          opportunity:opportunity_id(id, name, stage)
        `)?.eq('id', taskId)?.single();

      if (error) {
        if (error?.code === 'PGRST116') {
          return { success: false, error: 'Task not found' };
        }
        console.error('Get task error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load task' };
    }
  },

  // Enhanced createTask method with better category handling
  async createTask(taskData) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Set default assigned_to to current user if not specified
      const taskWithDefaults = {
        ...taskData,
        assigned_by: user?.id,
        assigned_to: taskData?.assigned_to || user?.id,
        // Ensure category is valid
        category: taskData?.category || 'other',
        priority: taskData?.priority || 'medium',
        status: taskData?.status || 'pending'
      };

      const { data, error } = await supabase?.from('tasks')?.insert([taskWithDefaults])?.select(`
          *,
          assigned_user:assigned_to(id, full_name, email),
          creator:assigned_by(id, full_name, email),
          account:account_id(id, name),
          property:property_id(id, name),
          contact:contact_id(id, first_name, last_name),
          opportunity:opportunity_id(id, name),
          prospect:prospect_id(id, name)
        `)?.single();

      if (error) {
        console.error('Create task error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create task:', error);
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
      const { data, error } = await supabase?.rpc('update_task_status', {
        task_uuid: taskId,
        new_status: 'completed',
        completion_notes_param: null
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
      const [accountsResult, propertiesResult, contactsResult, opportunitiesResult, prospectsResult] = await Promise.all([
        supabase?.from('accounts')?.select('id, name')?.eq('is_active', true)?.order('name'),
        supabase?.from('properties')?.select('id, name')?.order('name'),
        supabase?.from('contacts')?.select('id, first_name, last_name')?.order('first_name'),
        supabase?.from('opportunities')?.select('id, name')?.order('name'),
        supabase?.from('prospects')?.select('id, name')?.order('name')
      ]);

      return {
        data: {
          accounts: accountsResult?.data || [],
          properties: propertiesResult?.data || [],
          contacts: (contactsResult?.data || [])?.map(contact => ({
            ...contact,
            name: `${contact?.first_name} ${contact?.last_name}`
          })),
          opportunities: opportunitiesResult?.data || [],
          prospects: prospectsResult?.data || []
        },
        error: null
      };
    } catch (error) {
      return { 
        data: { accounts: [], properties: [], contacts: [], opportunities: [], prospects: [] }, 
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

  async getTasksByAccount(accountId, limit) {
    if (!accountId) return { success: false, error: 'Account ID is required' };

    try {
      let query = supabase?.from('tasks')?.select(`
          *,
          assigned_user:assigned_to(id, full_name),
          contact:contact_id(id, first_name, last_name)
        `)?.eq('account_id', accountId)?.order('due_date', { ascending: true });

      if (limit) {
        query = query?.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Get tasks by account error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load account tasks' };
    }
  },

  async getTasksByContact(contactId, limit) {
    if (!contactId) return { success: false, error: 'Contact ID is required' };

    try {
      let query = supabase?.from('tasks')?.select(`
          *,
          assigned_user:assigned_to(id, full_name),
          account:account_id(id, name)
        `)?.eq('contact_id', contactId)?.order('due_date', { ascending: true });

      if (limit) {
        query = query?.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Get tasks by contact error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load contact tasks' };
    }
  },

  // Get recent tasks for dashboard
  async getRecentTasks(userId, limit = 5) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const { data, error } = await supabase?.from('tasks')?.select(`
          *,
          account:account_id(id, name),
          contact:contact_id(id, first_name, last_name)
        `)?.eq('assigned_to', userId)?.order('created_at', { ascending: false })?.limit(limit);

      if (error) {
        console.error('Get recent tasks error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load recent tasks' };
    }
  },

  // Get overdue tasks
  async getOverdueTasks(userId, limit = 10) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const now = new Date()?.toISOString();

      const { data, error } = await supabase?.from('tasks')?.select(`
          *,
          account:account_id(id, name),
          contact:contact_id(id, first_name, last_name)
        `)?.eq('assigned_to', userId)?.neq('status', 'completed')?.lt('due_date', now)?.order('due_date', { ascending: true })?.limit(limit);

      if (error) {
        console.error('Get overdue tasks error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load overdue tasks' };
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