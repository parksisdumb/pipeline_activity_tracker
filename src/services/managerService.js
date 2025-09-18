import { supabase } from '../lib/supabase';

export const managerService = {
  // Get current user's team members (if they are a manager)
  async getTeamMembers(managerId) {
    if (!managerId) return { success: false, error: 'Manager ID is required' };

    try {
      const { data, error } = await supabase
        ?.rpc('get_manager_team_members', { manager_uuid: managerId });

      if (error) {
        console.error('Get team members error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load team members' };
    }
  },

  // Get accounts accessible to manager (own + team's accounts)
  async getAccessibleAccounts(managerId) {
    if (!managerId) return { success: false, error: 'Manager ID is required' };

    try {
      const { data, error } = await supabase
        ?.rpc('get_manager_accessible_accounts', { manager_uuid: managerId });

      if (error) {
        console.error('Get accessible accounts error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load accessible accounts' };
    }
  },

  // Get team performance data for manager dashboard
  async getTeamPerformance(managerId, weekStartDate = null) {
    if (!managerId) return { success: false, error: 'Manager ID is required' };

    try {
      const params = { manager_uuid: managerId };
      if (weekStartDate) {
        params.week_start_date = weekStartDate;
      }

      const { data, error } = await supabase
        ?.rpc('get_manager_team_performance', params);

      if (error) {
        console.error('Get team performance error:', error);
        return { success: false, error: error?.message };
      }

      // If no team performance data, try to get current user's data as fallback
      if (!data || data?.length === 0) {
        console.log('No team members found, fetching manager\'s own data as fallback');
        return await this.getManagerOwnPerformance(managerId, weekStartDate);
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load team performance' };
    }
  },

  // Fallback method to get manager's own performance data when no team exists
  async getManagerOwnPerformance(managerId, weekStartDate = null) {
    try {
      // Get manager's own profile data
      const { data: profileData, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('id', managerId)
        ?.single();

      if (profileError) {
        return { success: false, error: profileError?.message };
      }

      // Get manager's accounts
      const { data: accountsData, error: accountsError } = await supabase
        ?.from('accounts')
        ?.select('*')
        ?.eq('assigned_rep_id', managerId);

      if (accountsError) {
        console.error('Get accounts error:', accountsError);
      }

      // Get manager's activities for the week
      let activitiesQuery = supabase
        ?.from('activities')
        ?.select('*')
        ?.eq('user_id', managerId);

      if (weekStartDate) {
        const weekEnd = new Date(weekStartDate);
        weekEnd?.setDate(weekEnd?.getDate() + 7);
        activitiesQuery = activitiesQuery
          ?.gte('created_at', weekStartDate)
          ?.lt('created_at', weekEnd?.toISOString()?.split('T')?.[0]);
      }

      const { data: activitiesData, error: activitiesError } = await activitiesQuery;

      if (activitiesError) {
        console.error('Get activities error:', activitiesError);
      }

      // Get manager's weekly goals
      let goalsQuery = supabase
        ?.from('weekly_goals')
        ?.select('*')
        ?.eq('user_id', managerId);

      if (weekStartDate) {
        goalsQuery = goalsQuery?.eq('week_start_date', weekStartDate);
      }

      const { data: goalsData, error: goalsError } = await goalsQuery;

      if (goalsError) {
        console.error('Get goals error:', goalsError);
      }

      // Get contacts count
      const { data: contactsData, error: contactsError } = await supabase
        ?.from('contacts')
        ?.select('id')
        ?.in('account_id', (accountsData || [])?.map(acc => acc?.id));

      if (contactsError) {
        console.error('Get contacts error:', contactsError);
      }

      // Format the data to match the expected structure
      const managerPerformance = [{
        user_id: profileData?.id,
        user_name: profileData?.full_name,
        user_email: profileData?.email,
        user_role: profileData?.role,
        total_accounts: accountsData?.length || 0,
        total_contacts: contactsData?.length || 0,
        current_week_activities: activitiesData?.length || 0,
        weekly_goals: goalsData || [],
        goal_completion_rate: goalsData?.length > 0 
          ? Math.round((goalsData?.filter(g => g?.status === 'Completed')?.length / goalsData?.length) * 100)
          : 0
      }];

      return { success: true, data: managerPerformance };
    } catch (error) {
      console.error('Fallback performance error:', error);
      return { success: false, error: 'Failed to load performance data' };
    }
  },

  // Get aggregated team metrics for manager dashboard
  async getTeamMetrics(managerId, weekStartDate = null) {
    try {
      const performanceResult = await this.getTeamPerformance(managerId, weekStartDate);
      if (!performanceResult?.success) {
        return performanceResult;
      }

      const teamData = performanceResult?.data;
      
      // Calculate aggregated metrics
      const metrics = {
        totalAccounts: teamData?.reduce((sum, member) => sum + (member?.total_accounts || 0), 0),
        totalContacts: teamData?.reduce((sum, member) => sum + (member?.total_contacts || 0), 0),
        weeklyActivities: teamData?.reduce((sum, member) => sum + (member?.current_week_activities || 0), 0),
        averageGoalCompletion: teamData?.length > 0 
          ? Math.round(teamData?.reduce((sum, member) => sum + (member?.goal_completion_rate || 0), 0) / teamData?.length)
          : 0,
        activeReps: teamData?.filter(member => member?.user_role === 'rep')?.length,
        
        // Goal-specific aggregations
        goalsByType: {},
        teamGoalCompletion: 0
      };

      // Aggregate goals by type
      let totalGoals = 0;
      let completedGoals = 0;

      teamData?.forEach(member => {
        if (member?.weekly_goals && Array.isArray(member?.weekly_goals)) {
          member?.weekly_goals?.forEach(goal => {
            if (!metrics?.goalsByType?.[goal?.goal_type]) {
              metrics.goalsByType[goal.goal_type] = {
                target: 0,
                current: 0,
                completed: 0,
                total: 0
              };
            }
            
            metrics.goalsByType[goal.goal_type].target += goal?.target_value || 0;
            metrics.goalsByType[goal.goal_type].current += goal?.current_value || 0;
            metrics.goalsByType[goal.goal_type].total += 1;
            
            if (goal?.status === 'Completed') {
              metrics.goalsByType[goal.goal_type].completed += 1;
              completedGoals += 1;
            }
            totalGoals += 1;
          });
        }
      });

      // Calculate overall team goal completion rate
      if (totalGoals > 0) {
        metrics.teamGoalCompletion = Math.round((completedGoals / totalGoals) * 100);
      }

      return { success: true, data: metrics };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to calculate team metrics' };
    }
  },

  // Get team funnel metrics (prospects -> wins conversion)
  async getTeamFunnelMetrics(managerId, dateFrom = null, dateTo = null) {
    if (!managerId) return { success: false, error: 'Manager ID is required' };

    try {
      // First get accessible accounts
      const accountsResult = await this.getAccessibleAccounts(managerId);
      if (!accountsResult?.success) {
        return accountsResult;
      }

      const accounts = accountsResult?.data;
      
      // Group accounts by stage to create funnel
      const funnel = {
        prospects: accounts?.filter(acc => acc?.stage === 'Prospect')?.length,
        contacted: accounts?.filter(acc => acc?.stage === 'Contacted')?.length,
        qualified: accounts?.filter(acc => acc?.stage === 'Qualified')?.length,
        assessmentScheduled: accounts?.filter(acc => acc?.stage === 'Assessment Scheduled')?.length,
        assessed: accounts?.filter(acc => acc?.stage === 'Assessed')?.length,
        proposalSent: accounts?.filter(acc => acc?.stage === 'Proposal Sent')?.length,
        inNegotiation: accounts?.filter(acc => acc?.stage === 'In Negotiation')?.length,
        won: accounts?.filter(acc => acc?.stage === 'Won')?.length,
        lost: accounts?.filter(acc => acc?.stage === 'Lost')?.length,
        
        // Calculate conversion rates
        totalAccounts: accounts?.length,
        winRate: 0,
        conversionRate: 0
      };

      // Calculate rates
      if (funnel?.prospects > 0) {
        funnel.winRate = Math.round((funnel?.won / funnel?.prospects) * 100);
        funnel.conversionRate = Math.round(((funnel?.won + funnel?.inNegotiation) / funnel?.prospects) * 100);
      }

      return { success: true, data: funnel };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load team funnel metrics' };
    }
  },

  // Check if current user is a manager of a specific user
  async isManagerOf(managerId, userId) {
    if (!managerId || !userId) return { success: false, error: 'Manager ID and User ID are required' };

    try {
      const { data, error } = await supabase
        ?.rpc('is_manager_of_user', { 
          manager_uuid: managerId,
          user_uuid: userId 
        });

      if (error) {
        console.error('Is manager of user error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || false };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to check manager relationship' };
    }
  },

  // Get team activities for recent activity feed
  async getTeamActivities(managerId, filters = {}) {
    try {
      const teamResult = await this.getTeamMembers(managerId);
      if (!teamResult?.success) {
        return teamResult;
      }

      const teamMemberIds = teamResult?.data?.map(member => member?.id);

      let query = supabase
        ?.from('activities')
        ?.select(`
          *,
          user:user_profiles!user_id(id, full_name),
          account:accounts(id, name),
          contact:contacts(id, full_name),
          property:properties(id, address)
        `)
        ?.in('user_id', teamMemberIds);

      // Apply filters
      if (filters?.dateFrom) {
        query = query?.gte('created_at', filters?.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query?.lte('created_at', filters?.dateTo);
      }

      if (filters?.activityType) {
        query = query?.eq('activity_type', filters?.activityType);
      }

      if (filters?.limit) {
        query = query?.limit(filters?.limit);
      } else {
        query = query?.limit(50); // Default limit
      }

      query = query?.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Get team activities error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load team activities' };
    }
  },

  // Get team summary data for dashboard cards
  async getTeamSummary(managerId) {
    try {
      const [teamResult, accountsResult, metricsResult] = await Promise.all([
        this.getTeamMembers(managerId),
        this.getAccessibleAccounts(managerId),
        this.getTeamMetrics(managerId)
      ]);

      if (!teamResult?.success) return teamResult;
      if (!accountsResult?.success) return accountsResult;
      if (!metricsResult?.success) return metricsResult;

      const summary = {
        activeReps: teamResult?.data?.filter(member => member?.role === 'rep' && member?.is_active)?.length + 1, // +1 for manager
        totalAccounts: accountsResult?.data?.length,
        weeklyActivities: metricsResult?.data?.weeklyActivities,
        goalCompletion: metricsResult?.data?.teamGoalCompletion,
        
        // Additional metrics
        totalContacts: metricsResult?.data?.totalContacts,
        avgDealsPerRep: teamResult?.data?.length > 0 
          ? Math.round(accountsResult?.data?.length / teamResult?.data?.length)
          : 0
      };

      return { success: true, data: summary };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load team summary' };
    }
  }
};