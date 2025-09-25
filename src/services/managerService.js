import { supabase } from '../lib/supabase';

export const managerService = {
  // Get team members managed by this manager
  async getTeamMembers(managerId) {
    try {
      const { data, error } = await supabase?.rpc('get_manager_team_members', { manager_uuid: managerId });
      
      if (error) {
        throw new Error(`Failed to fetch team members: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  },

  // ENHANCED: Get ALL users within manager's tenant (not just direct reports)
  async getAllTenantUsers(managerId) {
    try {
      const { data, error } = await supabase?.rpc('get_manager_all_tenant_users', { manager_uuid: managerId });
      
      if (error) {
        throw new Error(`Failed to fetch tenant users: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching tenant users:', error);
      throw error;
    }
  },

  // Get team metrics aggregated by goal type
  async getTeamMetrics(managerId, weekStartDate = null) {
    try {
      const params = { manager_uuid: managerId };
      if (weekStartDate) {
        params.week_start = weekStartDate;
      }

      const { data, error } = await supabase?.rpc('get_manager_team_metrics', params);
      
      if (error) {
        console.error('Supabase error getting team metrics:', error);
        return {
          success: false,
          error: error?.message,
          data: null
        };
      }
      
      return {
        success: true,
        data: data || {},
        error: null
      };
    } catch (error) {
      console.error('Error fetching team metrics:', error);
      return {
        success: false,
        error: error?.message,
        data: null
      };
    }
  },

  // Get team funnel metrics
  async getTeamFunnelMetrics(managerId) {
    try {
      const { data, error } = await supabase?.rpc('get_manager_team_funnel_metrics', { manager_uuid: managerId });
      
      if (error) {
        console.error('Supabase error getting funnel metrics:', error);
        return {
          success: false,
          error: error?.message,
          data: null
        };
      }
      
      return {
        success: true,
        data: data || {},
        error: null
      };
    } catch (error) {
      console.error('Error fetching team funnel metrics:', error);
      return {
        success: false,
        error: error?.message,
        data: null
      };
    }
  },

  // Get team summary data
  async getTeamSummary(managerId) {
    try {
      const { data, error } = await supabase?.rpc('get_manager_team_summary', { manager_uuid: managerId });
      
      if (error) {
        console.error('Supabase error getting team summary:', error);
        return {
          success: false,
          error: error?.message,
          data: null
        };
      }
      
      return {
        success: true,
        data: data || {},
        error: null
      };
    } catch (error) {
      console.error('Error fetching team summary:', error);
      return {
        success: false,
        error: error?.message,
        data: null
      };
    }
  },

  // Get team performance metrics (enhanced version)
  async getTeamPerformance(managerId, weekStartDate = null) {
    try {
      const params = { manager_uuid: managerId };
      if (weekStartDate) {
        params.week_start = weekStartDate;
      }

      const { data, error } = await supabase?.rpc('get_manager_team_performance_detailed', params);
      
      if (error) {
        console.error('Supabase error getting team performance:', error);
        return {
          success: false,
          error: error?.message,
          data: null
        };
      }
      
      return {
        success: true,
        data: data || [],
        error: null
      };
    } catch (error) {
      console.error('Error fetching team performance:', error);
      return {
        success: false,
        error: error?.message,
        data: null
      };
    }
  },

  // ENHANCED: Get ALL accounts within manager's tenant (not just team-assigned accounts)
  async getAllTenantAccounts(managerId) {
    try {
      const { data, error } = await supabase?.rpc('get_manager_all_tenant_accounts', { manager_uuid: managerId });
      
      if (error) {
        throw new Error(`Failed to fetch tenant accounts: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching tenant accounts:', error);
      throw error;
    }
  },

  // Get all accounts accessible by manager (enhanced with assignments) - LEGACY
  async getAccessibleAccountsWithAssignments(managerId) {
    try {
      const { data, error } = await supabase?.rpc('get_manager_accessible_accounts_with_assignments', { manager_uuid: managerId });
      
      if (error) {
        throw new Error(`Failed to fetch accessible accounts: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching accessible accounts:', error);
      throw error;
    }
  },

  // Get all accounts accessible by manager (legacy function)
  async getAccessibleAccounts(managerId) {
    try {
      const { data, error } = await supabase?.rpc('get_manager_accessible_accounts', { manager_uuid: managerId });
      
      if (error) {
        throw new Error(`Failed to fetch accessible accounts: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching accessible accounts:', error);
      throw error;
    }
  },

  // Get reps assigned to a specific account
  async getAccountReps(accountId) {
    try {
      const { data, error } = await supabase?.rpc('get_account_reps', { account_uuid: accountId });
      
      if (error) {
        throw new Error(`Failed to fetch account reps: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching account reps:', error);
      throw error;
    }
  },

  // ENHANCED: Assign multiple reps to an account with full tenant authority
  async assignRepsToAccount(managerId, accountId, repIds, primaryRepId = null) {
    try {
      // Convert Set to Array if necessary and ensure it's a proper array
      const repIdsArray = Array.isArray(repIds) ? repIds : Array.from(repIds);
      
      // Validate that we have a proper array of strings/UUIDs
      if (!repIdsArray || repIdsArray?.length === 0) {
        throw new Error('No representatives selected for assignment');
      }
      
      console.log('Assigning reps - managerId:', managerId, 'accountId:', accountId, 'repIds:', repIdsArray, 'primaryRepId:', primaryRepId);
      
      const { data, error } = await supabase?.rpc('manager_assign_account_to_reps', {
        manager_uuid: managerId,
        account_uuid: accountId,
        rep_ids: repIdsArray, // Now properly converted to array
        primary_rep_id: primaryRepId
      });
      
      if (error) {
        console.error('Supabase error in assignRepsToAccount:', error);
        throw new Error(`Failed to assign reps: ${error.message}`);
      }
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to assign reps to account');
      }
      
      console.log('Successfully assigned reps:', result);
      return result;
    } catch (error) {
      console.error('Error assigning reps to account:', error);
      throw error;
    }
  },

  // ENHANCED: Assign goals to any users within the manager's tenant
  async assignTeamGoals(managerId, goalAssignments) {
    try {
      const { data, error } = await supabase?.rpc('manager_assign_team_goals', {
        manager_uuid: managerId,
        goal_data: {
          week_start: goalAssignments?.weekStart || new Date()?.toISOString()?.split('T')?.[0],
          assignments: goalAssignments?.assignments || []
        }
      });
      
      if (error) {
        throw new Error(`Failed to assign goals: ${error.message}`);
      }
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to assign team goals');
      }
      
      return result;
    } catch (error) {
      console.error('Error assigning team goals:', error);
      throw error;
    }
  },

  // Remove a rep from an account
  async removeRepFromAccount(accountId, repId, managerId = null) {
    try {
      const params = {
        account_uuid: accountId,
        rep_uuid: repId
      };
      
      if (managerId) {
        params.manager_uuid = managerId;
      }

      const { data, error } = await supabase?.rpc('remove_rep_from_account', params);
      
      if (error) {
        throw new Error(`Failed to remove rep: ${error.message}`);
      }
      
      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to remove rep from account');
      }
      
      return result;
    } catch (error) {
      console.error('Error removing rep from account:', error);
      throw error;
    }
  },

  // Check if manager can manage assignments for an account
  async canManageAccountAssignments(managerId, accountId) {
    try {
      const { data, error } = await supabase?.rpc('manager_can_manage_account_assignments', { 
          manager_uuid: managerId,
          account_uuid: accountId 
        });
      
      if (error) {
        throw new Error(`Failed to check manager permissions: ${error.message}`);
      }
      
      return data || false;
    } catch (error) {
      console.error('Error checking manager permissions:', error);
      throw error;
    }
  },

  // Check if user is manager of another user
  async isManagerOf(managerId, userId) {
    try {
      const { data, error } = await supabase?.rpc('is_manager_of_user', { 
          manager_uuid: managerId,
          user_uuid: userId 
        });
      
      if (error) {
        throw new Error(`Failed to check manager relationship: ${error.message}`);
      }
      
      return data || false;
    } catch (error) {
      console.error('Error checking manager relationship:', error);
      throw error;
    }
  },

  // ENHANCED: Bulk update account assignments with tenant authority
  async bulkUpdateAccountAssignments(managerId, updates) {
    try {
      const results = [];
      
      for (const update of updates) {
        const { accountId, repIds, primaryRepId } = update;
        const result = await this.assignRepsToAccount(managerId, accountId, repIds, primaryRepId);
        results?.push({ accountId, ...result });
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk update account assignments:', error);
      throw error;
    }
  },

  // ENHANCED: Get comprehensive tenant overview for managers
  async getTenantOverview(managerId) {
    try {
      const [accounts, users] = await Promise.all([
        this.getAllTenantAccounts(managerId),
        this.getAllTenantUsers(managerId)
      ]);

      return {
        success: true,
        data: {
          accounts: accounts || [],
          users: users || [],
          totalAccounts: accounts?.length || 0,
          totalUsers: users?.length || 0,
          activeReps: users?.filter(u => u?.role === 'rep' && u?.is_active)?.length || 0,
          totalAccountsAssigned: accounts?.filter(a => a?.assigned_reps?.length > 0)?.length || 0
        },
        error: null
      };
    } catch (error) {
      console.error('Error fetching tenant overview:', error);
      return {
        success: false,
        error: error?.message,
        data: null
      };
    }
  }
};