import { supabase } from '../lib/supabase';

export const goalsService = {
  // Get weekly goals for a user
  async getWeeklyGoals(userId, weekStartDate) {
    if (!userId) return { success: false, error: 'User ID is required' };
    if (!weekStartDate) return { success: false, error: 'Week start date is required' };

    try {
      const { data, error } = await supabase?.from('weekly_goals')?.select(`
          *,
          user:user_profiles!user_id(id, full_name)
        `)?.eq('user_id', userId)?.eq('week_start_date', weekStartDate)?.order('goal_type');

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Cannot connect to database. Please check your internet connection.' 
        };
      }
      return { success: false, error: 'Failed to load weekly goals' };
    }
  },

  // Bulk create or update goals for multiple users using manager function
  async bulkSetGoals(userIds, weekStartDate, goals) {
    if (!userIds?.length) return { success: false, error: 'No users selected' };
    if (!weekStartDate) return { success: false, error: 'Week start date is required' };
    if (!goals || Object.keys(goals)?.length === 0) return { success: false, error: 'No goals provided' };

    try {
      // Get current user to determine if they are a manager
      const { data: { user: currentUser } } = await supabase?.auth?.getUser();
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get user profile to check role
      const { data: userProfile } = await supabase?.from('user_profiles')?.select('id, role')?.eq('id', currentUser?.id)?.single();

      // If user is a manager, use the manager function for RLS compliance
      if (userProfile?.role === 'manager') {
        return await this.managerBulkSetGoals(userIds, weekStartDate, goals);
      } else {
        // For non-managers (reps), use direct insert approach 
        return await this.directBulkSetGoals(userIds, weekStartDate, goals);
      }
    } catch (error) {
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Cannot connect to database. Your Supabase project may be paused or inactive.' 
        };
      }
      return { success: false, error: 'Failed to set goals' };
    }
  },

  // Manager-specific bulk goal assignment using the secure function
  async managerBulkSetGoals(userIds, weekStartDate, goals) {
    try {
      // Get current user ID for manager assignment
      const { data: { user: currentUser } } = await supabase?.auth?.getUser();
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      // Enhanced validation: Check if user is actually a manager
      const { data: userProfile } = await supabase?.from('user_profiles')?.select('id, role, full_name, tenant_id')?.eq('id', currentUser?.id)?.single();
      
      if (!userProfile) {
        return { success: false, error: 'User profile not found' };
      }

      if (!['manager', 'admin', 'super_admin']?.includes(userProfile?.role)) {
        return { success: false, error: 'Insufficient permissions. Only managers, admins, and super admins can set team goals.' };
      }

      // Transform data to match the manager_assign_team_goals function format
      const assignments = userIds?.map(userId => ({
        rep_id: userId,
        goals: Object.keys(goals)?.map(goalType => ({
          type: goalType,
          target: goals?.[goalType] || 0,
          current: 0
        }))
      }));

      const goalData = {
        week_start: weekStartDate,
        assignments: assignments
      };

      console.log('Setting goals via manager function:', {
        manager_id: currentUser?.id,
        manager_name: userProfile?.full_name,
        manager_role: userProfile?.role,
        week_start: weekStartDate,
        assignments_count: assignments?.length,
        goal_types: Object.keys(goals)
      });

      // Call the secure manager function
      const { data, error } = await supabase?.rpc('manager_assign_team_goals', {
        manager_uuid: currentUser?.id,
        goal_data: goalData
      });

      if (error) {
        console.error('Manager assign goals error:', error);
        return { success: false, error: `Failed to set goals: ${error?.message}` };
      }

      // The function returns an array of results
      const result = Array.isArray(data) ? data?.[0] : data;
      
      if (result?.success) {
        console.log('Goals assigned successfully:', result);
        return { 
          success: true, 
          data: result, 
          count: result?.goals_assigned || 0,
          message: result?.message || 'Goals assigned successfully'
        };
      } else {
        return { 
          success: false, 
          error: result?.message || 'Failed to assign goals. Please check that team members are properly assigned to you as their manager.' 
        };
      }
    } catch (error) {
      console.error('Manager bulk set goals error:', error);
      return { success: false, error: 'Failed to set goals via manager function. Please check your network connection and try again.' };
    }
  },

  // Direct bulk goal setting for reps (non-managers)
  async directBulkSetGoals(userIds, weekStartDate, goals) {
    try {
      // Updated goal types to match UI expectations
      const goalTypes = ['pop_ins', 'dm_conversations', 'assessments_booked', 'proposals_sent', 'wins'];
      const goalsToInsert = [];

      for (const userId of userIds) {
        for (const goalType of goalTypes) {
          if (goals?.[goalType] !== undefined && goals?.[goalType] >= 0) {
            goalsToInsert?.push({
              user_id: userId,
              week_start_date: weekStartDate,
              goal_type: goalType,
              target_value: goals?.[goalType],
              current_value: 0,
              status: 'Not Started'
              // Note: tenant_id will be set by the trigger function automatically
            });
          }
        }
      }

      if (goalsToInsert?.length === 0) {
        return { success: false, error: 'No valid goals to set' };
      }

      // First, delete existing goals for this week and users
      const { error: deleteError } = await supabase?.from('weekly_goals')
        ?.delete()
        ?.in('user_id', userIds)
        ?.eq('week_start_date', weekStartDate);

      if (deleteError) {
        return { success: false, error: `Failed to clear existing goals: ${deleteError?.message}` };
      }

      // Then insert new goals - tenant_id will be set by trigger
      const { data, error } = await supabase?.from('weekly_goals')?.insert(goalsToInsert)?.select(`
          *,
          user:user_profiles!user_id(id, full_name)
        `);

      if (error) {
        return { success: false, error: `Failed to set goals: ${error?.message}` };
      }

      return { success: true, data, count: data?.length || 0 };
    } catch (error) {
      return { success: false, error: 'Failed to set goals via direct method' };
    }
  },

  // Create weekly goals from template for multiple users
  async createWeeklyGoalsFromTemplate(userIds, weekStartDate, template = 'standard') {
    const templates = {
      'aggressive': {
        pop_ins: 20,
        dm_conversations: 25,
        assessments_booked: 8,
        proposals_sent: 5,
        wins: 3
      },
      'standard': {
        pop_ins: 15,
        dm_conversations: 20,
        assessments_booked: 6,
        proposals_sent: 4,
        wins: 2
      },
      'conservative': {
        pop_ins: 10,
        dm_conversations: 15,
        assessments_booked: 4,
        proposals_sent: 2,
        wins: 1
      }
    };

    const goals = templates?.[template] || templates?.['standard'];
    return this.bulkSetGoals(userIds, weekStartDate, goals);
  },

  // Get all goals for a user (multiple weeks)
  async getUserGoals(userId, filters = {}) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      let query = supabase?.from('weekly_goals')?.select(`
          *,
          user:user_profiles!user_id(id, full_name)
        `)?.eq('user_id', userId);

      if (filters?.weekStartFrom) {
        query = query?.gte('week_start_date', filters?.weekStartFrom);
      }

      if (filters?.weekStartTo) {
        query = query?.lte('week_start_date', filters?.weekStartTo);
      }

      if (filters?.goalType) {
        query = query?.eq('goal_type', filters?.goalType);
      }

      if (filters?.status) {
        query = query?.eq('status', filters?.status);
      }

      query = query?.order('week_start_date', { ascending: false })?.order('goal_type');

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to load user goals' };
    }
  },

  // Create a new weekly goal
  async createWeeklyGoal(goalData) {
    try {
      // Ensure goal_type is valid
      const validGoalTypes = ['pop_ins', 'dm_conversations', 'assessments_booked', 'proposals_sent', 'wins'];
      if (!validGoalTypes?.includes(goalData?.goal_type)) {
        return { success: false, error: `Invalid goal type. Must be one of: ${validGoalTypes?.join(', ')}` };
      }

      const { data, error } = await supabase?.from('weekly_goals')?.insert({
        ...goalData,
        // tenant_id will be set by trigger
      })?.select(`
          *,
          user:user_profiles!user_id(id, full_name)
        `)?.single();

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to create weekly goal' };
    }
  },

  // Update an existing goal
  async updateGoal(goalId, updates) {
    if (!goalId) return { success: false, error: 'Goal ID is required' };

    try {
      const { data, error } = await supabase?.from('weekly_goals')?.update({ 
        ...updates, 
        updated_at: new Date()?.toISOString() 
      })?.eq('id', goalId)?.select(`
          *,
          user:user_profiles!user_id(id, full_name)
        `)?.single();

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to update goal' };
    }
  },

  // Delete a goal
  async deleteGoal(goalId) {
    if (!goalId) return { success: false, error: 'Goal ID is required' };

    try {
      const { error } = await supabase?.from('weekly_goals')?.delete()?.eq('id', goalId);

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete goal' };
    }
  },

  // Bulk update goals
  async bulkUpdateGoals(goalIds, updates) {
    if (!goalIds?.length) return { success: false, error: 'No goals selected' };

    try {
      const { data, error } = await supabase?.from('weekly_goals')?.update({ 
        ...updates, 
        updated_at: new Date()?.toISOString() 
      })?.in('id', goalIds)?.select();

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data, count: data?.length || 0 };
    } catch (error) {
      return { success: false, error: 'Failed to update goals' };
    }
  },

  // Update goal progress
  async updateGoalProgress(goalId, currentValue) {
    if (!goalId) return { success: false, error: 'Goal ID is required' };
    if (typeof currentValue !== 'number') return { success: false, error: 'Current value must be a number' };

    try {
      // Get the goal to calculate status
      const { data: goal, error: getError } = await supabase?.from('weekly_goals')?.select('target_value')?.eq('id', goalId)?.single();

      if (getError) {
        return { success: false, error: getError?.message };
      }

      // Determine status based on progress
      let status = 'Not Started';
      if (currentValue > 0) {
        if (currentValue >= goal?.target_value) {
          status = 'Completed';
        } else {
          status = 'In Progress';
        }
      }

      const { data, error } = await supabase?.from('weekly_goals')?.update({ 
          current_value: currentValue, 
          status,
          updated_at: new Date()?.toISOString() 
        })?.eq('id', goalId)?.select(`
          *,
          user:user_profiles!user_id(id, full_name)
        `)?.single();

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to update goal progress' };
    }
  },

  // Get goal statistics for a user
  async getGoalStats(userId, filters = {}) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      let query = supabase?.from('weekly_goals')?.select('status, goal_type, target_value, current_value, week_start_date')?.eq('user_id', userId);

      if (filters?.weekStartFrom) {
        query = query?.gte('week_start_date', filters?.weekStartFrom);
      }

      if (filters?.weekStartTo) {
        query = query?.lte('week_start_date', filters?.weekStartTo);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error?.message };
      }

      // Calculate statistics
      const stats = {
        total: data?.length || 0,
        completed: data?.filter(g => g?.status === 'Completed')?.length || 0,
        inProgress: data?.filter(g => g?.status === 'In Progress')?.length || 0,
        notStarted: data?.filter(g => g?.status === 'Not Started')?.length || 0,
        overdue: data?.filter(g => g?.status === 'Overdue')?.length || 0,
        byType: {},
        completionRate: 0,
        totalTargetValue: data?.reduce((sum, goal) => sum + (goal?.target_value || 0), 0) || 0,
        totalCurrentValue: data?.reduce((sum, goal) => sum + (goal?.current_value || 0), 0) || 0,
      };

      // Calculate completion rate
      if (stats?.total > 0) {
        stats.completionRate = Math.round((stats?.completed / stats?.total) * 100);
      }

      // Count by type
      data?.forEach(goal => {
        if (goal?.goal_type) {
          if (!stats?.byType?.[goal?.goal_type]) {
            stats.byType[goal.goal_type] = {
              total: 0,
              completed: 0,
              targetValue: 0,
              currentValue: 0,
            };
          }
          stats.byType[goal.goal_type].total++;
          if (goal?.status === 'Completed') {
            stats.byType[goal.goal_type].completed++;
          }
          stats.byType[goal.goal_type].targetValue += goal?.target_value || 0;
          stats.byType[goal.goal_type].currentValue += goal?.current_value || 0;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to load goal statistics' };
    }
  },

  // Get current week's goals for dashboard
  async getCurrentWeekGoals(userId) {
    if (!userId) return { success: false, error: 'User ID is required' };

    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekStartDate = weekStart?.toISOString()?.split('T')?.[0];

    return this.getWeeklyGoals(userId, weekStartDate);
  },

  // Add helper function to debug manager relationships
  async debugManagerRelationships(managerId) {
    if (!managerId) return { success: false, error: 'Manager ID is required' };

    try {
      const { data, error } = await supabase?.rpc('debug_manager_team_relationships', {
        manager_uuid: managerId
      });

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to debug manager relationships' };
    }
  },

  // Add helper function to establish manager relationships
  async establishManagerRelationships() {
    try {
      const { data, error } = await supabase?.rpc('establish_manager_team_relationships');

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [], count: data?.length || 0 };
    } catch (error) {
      return { success: false, error: 'Failed to establish manager relationships' };
    }
  },
};