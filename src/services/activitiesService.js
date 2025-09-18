import { supabase } from '../lib/supabase';

export const activitiesService = {
  // Get all activities with related information
  async getActivities(filters = {}) {
    try {
      let query = supabase?.from('activities')?.select(`
          *,
          user:user_profiles!user_id(id, full_name, email),
          account:accounts(id, name, company_type),
          contact:contacts(id, first_name, last_name, email),
          property:properties(id, name, address)
        `);

      // Apply filters
      if (filters?.searchQuery) {
        query = query?.or(`subject.ilike.%${filters?.searchQuery}%,notes.ilike.%${filters?.searchQuery}%,description.ilike.%${filters?.searchQuery}%`);
      }

      if (filters?.activityType) {
        query = query?.eq('activity_type', filters?.activityType);
      }

      if (filters?.outcome) {
        query = query?.eq('outcome', filters?.outcome);
      }

      if (filters?.userId) {
        query = query?.eq('user_id', filters?.userId);
      }

      if (filters?.accountId) {
        query = query?.eq('account_id', filters?.accountId);
      }

      if (filters?.contactId) {
        query = query?.eq('contact_id', filters?.contactId);
      }

      if (filters?.propertyId) {
        query = query?.eq('property_id', filters?.propertyId);
      }

      if (filters?.dateFrom) {
        query = query?.gte('activity_date', filters?.dateFrom);
      }

      if (filters?.dateTo) {
        query = query?.lte('activity_date', filters?.dateTo);
      }

      // Apply sorting
      const sortColumn = filters?.sortBy || 'activity_date';
      const sortDirection = filters?.sortDirection === 'asc' ? true : false;
      query = query?.order(sortColumn, { ascending: sortDirection });

      const { data, error } = await query;

      if (error) {
        console.error('Activities query error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Cannot connect to database. Please check your internet connection.' 
        };
      }
      return { success: false, error: 'Failed to load activities' };
    }
  },

  // New method to get activities with follow-up dates (upcoming tasks)
  async getUpcomingTasks(userId, limit = 10) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const now = new Date()?.toISOString();

      const { data, error } = await supabase?.from('activities')?.select(`
          *,
          account:accounts(id, name, company_type),
          contact:contacts(id, first_name, last_name, email)
        `)
        ?.eq('user_id', userId)
        ?.not('follow_up_date', 'is', null)
        ?.gte('follow_up_date', now)
        ?.order('follow_up_date', { ascending: true })
        ?.limit(limit);

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to load upcoming tasks' };
    }
  },

  // New method to get overdue follow-ups
  async getOverdueFollowUps(userId, limit = 10) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const now = new Date()?.toISOString();

      const { data, error } = await supabase?.from('activities')?.select(`
          *,
          account:accounts(id, name, company_type),
          contact:contacts(id, first_name, last_name, email)
        `)
        ?.eq('user_id', userId)
        ?.not('follow_up_date', 'is', null)
        ?.lt('follow_up_date', now)
        ?.order('follow_up_date', { ascending: true })
        ?.limit(limit);

      if (error) {
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to load overdue follow-ups' };
    }
  },

  // Enhanced activity statistics with time categorization
  async getActivityStats(userId, filters = {}) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      let query = supabase?.from('activities')?.select('activity_type, outcome, activity_date, follow_up_date')?.eq('user_id', userId);

      if (filters?.dateFrom) {
        query = query?.gte('activity_date', filters?.dateFrom);
      }

      if (filters?.dateTo) {
        query = query?.lte('activity_date', filters?.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Activity stats error:', error);
        return { success: false, error: error?.message };
      }

      // Calculate enhanced statistics
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd?.setHours(23, 59, 59, 999);
      
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = {
        total: data?.length || 0,
        byType: {},
        byOutcome: {},
        byTime: {
          past: 0,
          today: 0,
          future: 0,
        },
        followUps: {
          upcoming: 0,
          overdue: 0,
          total: 0
        },
        thisWeek: 0,
        thisMonth: 0,
        typeBreakdown: {} // Add explicit type breakdown for debugging
      };

      data?.forEach(activity => {
        const activityDate = new Date(activity?.activity_date);
        
        // Count by type with explicit tracking
        if (activity?.activity_type) {
          stats.byType[activity.activity_type] = (stats?.byType?.[activity?.activity_type] || 0) + 1;
          // Also populate typeBreakdown for easier access
          stats.typeBreakdown[activity.activity_type] = (stats?.typeBreakdown?.[activity?.activity_type] || 0) + 1;
        }

        // Count by outcome
        if (activity?.outcome) {
          stats.byOutcome[activity.outcome] = (stats?.byOutcome?.[activity?.outcome] || 0) + 1;
        }

        // Count by time category with improved date comparison
        if (activityDate < todayStart) {
          stats.byTime.past++;
        } else if (activityDate >= todayStart && activityDate <= todayEnd) {
          stats.byTime.today++;
        } else if (activityDate > todayEnd) {
          stats.byTime.future++;
        }

        // Count follow-ups
        if (activity?.follow_up_date) {
          const followUpDate = new Date(activity?.follow_up_date);
          stats.followUps.total++;
          
          if (followUpDate >= now) {
            stats.followUps.upcoming++;
          } else {
            stats.followUps.overdue++;
          }
        }

        // Count time-based activities
        if (activityDate >= weekStart) {
          stats.thisWeek++;
        }
        if (activityDate >= monthStart) {
          stats.thisMonth++;
        }
      });

      // Debug logging to track email activities
      console.log('Activity stats calculated:', {
        total: stats?.total,
        emailCount: stats?.typeBreakdown?.['Email'] || 0,
        allTypes: Object.keys(stats?.typeBreakdown),
        dateFilter: filters
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load activity statistics' };
    }
  },

  // Get a single activity by ID
  async getActivity(activityId) {
    if (!activityId) return { success: false, error: 'Activity ID is required' };

    try {
      const { data, error } = await supabase?.from('activities')?.select(`
          *,
          user:user_profiles!user_id(id, full_name, email),
          account:accounts(id, name, company_type),
          contact:contacts(id, first_name, last_name, email),
          property:properties(id, name, address)
        `)?.eq('id', activityId)?.single();

      if (error) {
        if (error?.code === 'PGRST116') {
          return { success: false, error: 'Activity not found' };
        }
        console.error('Get activity error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load activity' };
    }
  },

  // Create a new activity
  async createActivity(activityData) {
    try {
      // Ensure required fields are present
      const requiredFields = ['activity_type', 'subject', 'activity_date'];
      for (const field of requiredFields) {
        if (!activityData?.[field]) {
          return { success: false, error: `${field} is required` };
        }
      }

      // Get current user and their tenant_id
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user?.id) {
        return { success: false, error: 'User must be authenticated' };
      }

      // Get user's tenant_id from user_profiles  
      const { data: userProfile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('tenant_id')
        ?.eq('id', user?.id)
        ?.single();

      if (profileError || !userProfile?.tenant_id) {
        console.error('Failed to get user tenant:', profileError);
        return { success: false, error: 'User tenant not found. Please contact support.' };
      }

      // Set user_id and tenant_id for the activity
      const activityDataWithTenant = {
        ...activityData,
        user_id: user?.id,
        tenant_id: userProfile?.tenant_id
      };

      const { data, error } = await supabase?.from('activities')?.insert(activityDataWithTenant)?.select(`
          *,
          user:user_profiles!user_id(id, full_name, email),
          account:accounts(id, name, company_type),
          contact:contacts(id, first_name, last_name, email),
          property:properties(id, name, address)
        `)?.single();

      if (error) {
        console.error('Create activity error:', error);
        
        // Handle specific constraint violations
        if (error?.code === '23503') {
          return { success: false, error: 'Invalid reference - check account, contact, or property selection' };
        }

        // Handle tenant validation errors
        if (error?.message?.includes('does not belong to tenant')) {
          return { success: false, error: 'Access denied - invalid tenant permissions' };
        }

        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to create activity' };
    }
  },

  // Update an existing activity
  async updateActivity(activityId, updates) {
    if (!activityId) return { success: false, error: 'Activity ID is required' };

    try {
      // Get current user and their tenant_id for validation
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user?.id) {
        return { success: false, error: 'User must be authenticated' };
      }

      // Get user's tenant_id from user_profiles  
      const { data: userProfile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('tenant_id')
        ?.eq('id', user?.id)
        ?.single();

      if (profileError || !userProfile?.tenant_id) {
        console.error('Failed to get user tenant:', profileError);
        return { success: false, error: 'User tenant not found. Please contact support.' };
      }

      // Ensure tenant_id is set if it's being updated
      const updatesWithTenant = {
        ...updates,
        tenant_id: userProfile?.tenant_id
      };

      const { data, error } = await supabase?.from('activities')?.update(updatesWithTenant)?.eq('id', activityId)?.select(`
          *,
          user:user_profiles!user_id(id, full_name, email),
          account:accounts(id, name, company_type),
          contact:contacts(id, first_name, last_name, email),
          property:properties(id, name, address)
        `)?.single();

      if (error) {
        console.error('Update activity error:', error);
        
        // Handle tenant validation errors
        if (error?.message?.includes('does not belong to tenant')) {
          return { success: false, error: 'Access denied - invalid tenant permissions' };
        }

        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to update activity' };
    }
  },

  // Delete an activity
  async deleteActivity(activityId) {
    if (!activityId) return { success: false, error: 'Activity ID is required' };

    try {
      const { error } = await supabase?.from('activities')?.delete()?.eq('id', activityId);

      if (error) {
        console.error('Delete activity error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to delete activity' };
    }
  },

  // Get recent activities for dashboard
  async getRecentActivities(userId, limit = 5) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const { data, error } = await supabase?.from('activities')?.select(`
          *,
          account:accounts(id, name),
          contact:contacts(id, first_name, last_name)
        `)?.eq('user_id', userId)?.order('activity_date', { ascending: false })?.limit(limit);

      if (error) {
        console.error('Get recent activities error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load recent activities' };
    }
  },

  // Get activities by account ID
  async getActivitiesByAccount(accountId, limit) {
    if (!accountId) return { success: false, error: 'Account ID is required' };

    try {
      let query = supabase?.from('activities')?.select(`
          *,
          user:user_profiles!user_id(id, full_name),
          contact:contacts(id, first_name, last_name),
          property:properties(id, name, address)
        `)?.eq('account_id', accountId)?.order('activity_date', { ascending: false });

      if (limit) {
        query = query?.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Get activities by account error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load account activities' };
    }
  },

  // Get activities list with filters - needed for individual progress calculation
  async getActivitiesList(filters = {}) {
    try {
      let query = supabase?.from('activities')?.select(`
          *,
          account:accounts(id, name, company_type),
          contact:contacts(id, first_name, last_name, email),
          property:properties(id, address, building_type),
          user:user_profiles!user_id(id, full_name)
        `);

      if (filters?.userId) {
        query = query?.eq('user_id', filters?.userId);
      }

      if (filters?.dateFrom) {
        query = query?.gte('activity_date', filters?.dateFrom);
      }

      if (filters?.dateTo) {
        query = query?.lte('activity_date', filters?.dateTo);
      }

      if (filters?.activityType) {
        query = query?.eq('activity_type', filters?.activityType);
      }

      if (filters?.outcome) {
        query = query?.eq('outcome', filters?.outcome);
      }

      if (filters?.accountId) {
        query = query?.eq('account_id', filters?.accountId);
      }

      query = query?.order('activity_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Get activities list error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load activities list' };
    }
  },

  // Get activities by user ID
  async getActivitiesByUser(userId, filters = {}) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      let query = supabase?.from('activities')?.select(`
          *,
          account:accounts(id, name),
          contact:contacts(id, first_name, last_name),
          property:properties(id, name)
        `)?.eq('user_id', userId);

      // Apply additional filters
      if (filters?.dateFrom) {
        query = query?.gte('activity_date', filters?.dateFrom);
      }

      if (filters?.dateTo) {
        query = query?.lte('activity_date', filters?.dateTo);
      }

      query = query?.order('activity_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Get activities by user error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load user activities' };
    }
  },
};