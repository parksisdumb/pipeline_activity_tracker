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

  // Bulk create or update goals for multiple users
  async bulkSetGoals(userIds, weekStartDate, goals) {
    if (!userIds?.length) return { success: false, error: 'No users selected' };
    if (!weekStartDate) return { success: false, error: 'Week start date is required' };
    if (!goals || Object.keys(goals)?.length === 0) return { success: false, error: 'No goals provided' };

    try {
      const goalTypes = ['accounts_added', 'contacts_reached', 'pop_ins', 'conversations', 'follow_ups', 'inspections_booked', 'proposals_sent'];
      const goalsToInsert = [];

      for (const userId of userIds) {
        for (const goalType of goalTypes) {
          if (goals?.[goalType] !== undefined && goals?.[goalType] > 0) {
            goalsToInsert?.push({
              user_id: userId,
              week_start_date: weekStartDate,
              goal_type: goalType,
              target_value: goals?.[goalType],
              current_value: 0,
              status: 'Not Started'
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
        console.error('Delete existing goals error:', deleteError);
        return { success: false, error: deleteError?.message };
      }

      // Then insert new goals
      const { data, error } = await supabase?.from('weekly_goals')?.insert(goalsToInsert)?.select(`
          *,
          user:user_profiles!user_id(id, full_name)
        `);

      if (error) {
        console.error('Bulk set goals error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data, count: data?.length || 0 };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to set goals' };
    }
  },

  // Create weekly goals from template for multiple users
  async createWeeklyGoalsFromTemplate(userIds, weekStartDate, template = 'standard') {
    const templates = {
      'aggressive': {
        accounts_added: 8,
        contacts_reached: 25,
        pop_ins: 20,
        conversations: 15,
        follow_ups: 12,
        inspections_booked: 8,
        proposals_sent: 5
      },
      'standard': {
        accounts_added: 5,
        contacts_reached: 20,
        pop_ins: 15,
        conversations: 12,
        follow_ups: 8,
        inspections_booked: 6,
        proposals_sent: 4
      },
      'conservative': {
        accounts_added: 3,
        contacts_reached: 15,
        pop_ins: 10,
        conversations: 8,
        follow_ups: 6,
        inspections_booked: 4,
        proposals_sent: 2
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
      const { data, error } = await supabase?.from('weekly_goals')?.insert(goalData)?.select(`
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
      const { data, error } = await supabase?.from('weekly_goals')?.update({ ...updates, updated_at: new Date()?.toISOString() })?.eq('id', goalId)?.select(`
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
      const { data, error } = await supabase?.from('weekly_goals')?.update({ ...updates, updated_at: new Date()?.toISOString() })?.in('id', goalIds)?.select();

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
};