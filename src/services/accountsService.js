import { supabase } from '../lib/supabase';

export const accountsService = {
  // Get all accounts for the current user
  async getAccounts(filters = {}) {
    try {
      let query = supabase?.from('accounts')?.select(`
          *,
          assigned_rep:user_profiles!assigned_rep_id(id, full_name, email),
          properties(id, name, stage),
          contacts(id, first_name, last_name, is_primary_contact)
        `);

      // Apply filters
      if (filters?.searchTerm) {
        query = query?.or(`name.ilike.%${filters?.searchTerm}%,email.ilike.%${filters?.searchTerm}%`);
      }

      if (filters?.companyType) {
        query = query?.eq('company_type', filters?.companyType);
      }

      if (filters?.stage) {
        query = query?.eq('stage', filters?.stage);
      }

      if (filters?.assignedRep) {
        query = query?.eq('assigned_rep_id', filters?.assignedRep);
      }

      if (!filters?.showInactive) {
        query = query?.eq('is_active', true);
      }

      // Apply sorting
      const sortColumn = filters?.sortBy || 'name';
      const sortDirection = filters?.sortDirection === 'desc' ? false : true;
      query = query?.order(sortColumn, { ascending: sortDirection });

      const { data, error } = await query;

      if (error) {
        console.error('Accounts query error:', error);
        
        // Enhanced error handling for RLS permission issues
        if (error?.code === '42501' || error?.message?.includes('permission')) {
          return { 
            success: false, 
            error: 'Access denied. Please contact your administrator for account access.' 
          };
        }
        
        return { success: false, error: error?.message };
      }

      // Transform data to include computed properties
      const transformedData = data?.map(account => ({
        ...account,
        propertiesCount: account?.properties?.length || 0,
        lastActivity: null, // TODO: Add this when activities are implemented
        primaryContact: account?.contacts?.find(c => c?.is_primary_contact),
      }));

      return { success: true, data: transformedData };
    } catch (error) {
      console.error('Service error:', error);
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Cannot connect to database. Please check your internet connection.' 
        };
      }
      return { success: false, error: 'Failed to load accounts' };
    }
  },

  // Get a single account by ID
  async getAccount(accountId) {
    if (!accountId) return { success: false, error: 'Account ID is required' };

    try {
      const { data, error } = await supabase?.from('accounts')?.select(`
          *,
          assigned_rep:user_profiles!assigned_rep_id(id, full_name, email),
          properties(*),
          contacts(*),
          activities(*)
        `)?.eq('id', accountId)?.single();

      if (error) {
        if (error?.code === 'PGRST116') {
          return { success: false, error: 'Account not found' };
        }
        console.error('Get account error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load account' };
    }
  },

  // Create a new account
  async createAccount(accountData) {
    try {
      // Ensure required fields are present
      const requiredFields = ['name', 'company_type'];
      for (const field of requiredFields) {
        if (!accountData?.[field]) {
          return { success: false, error: `${field} is required` };
        }
      }

      // Set assigned_rep_id to current user if not provided
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!accountData?.assigned_rep_id && user?.id) {
        accountData.assigned_rep_id = user?.id;
      }

      const { data, error } = await supabase?.from('accounts')?.insert(accountData)?.select(`
          *,
          assigned_rep:user_profiles!assigned_rep_id(id, full_name, email)
        `)?.single();

      if (error) {
        console.error('Create account error:', error);
        
        // Handle specific constraint violations
        if (error?.code === '23505') {
          return { success: false, error: 'An account with this name already exists' };
        }
        
        if (error?.code === '23503') {
          return { success: false, error: 'Invalid assigned representative' };
        }

        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service create error:', error);
      return { success: false, error: 'Failed to create account' };
    }
  },

  // Update an existing account
  async updateAccount(accountId, updates) {
    if (!accountId) return { success: false, error: 'Account ID is required' };

    try {
      const { data, error } = await supabase?.from('accounts')?.update({ 
        ...updates, 
        updated_at: new Date()?.toISOString() 
      })?.eq('id', accountId)?.select(`
          *,
          assigned_rep:user_profiles!assigned_rep_id(id, full_name, email)
        `)?.single();

      if (error) {
        console.error('Update account error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to update account' };
    }
  },

  // Delete an account
  async deleteAccount(accountId) {
    if (!accountId) return { success: false, error: 'Account ID is required' };

    try {
      const { error } = await supabase?.from('accounts')?.delete()?.eq('id', accountId);

      if (error) {
        console.error('Delete account error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to delete account' };
    }
  },

  // Bulk update accounts
  async bulkUpdateAccounts(accountIds, updates) {
    if (!accountIds?.length) return { success: false, error: 'No accounts selected' };

    try {
      const { data, error } = await supabase?.from('accounts')?.update({ 
        ...updates, 
        updated_at: new Date()?.toISOString() 
      })?.in('id', accountIds)?.select();

      if (error) {
        console.error('Bulk update error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data, count: data?.length || 0 };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to update accounts' };
    }
  },

  // Get account statistics
  async getAccountStats(filters = {}) {
    try {
      let query = supabase?.from('accounts')?.select('stage, company_type');

      if (!filters?.showInactive) {
        query = query?.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Stats query error:', error);
        return { success: false, error: error?.message };
      }

      // Calculate statistics
      const stats = {
        total: data?.length || 0,
        byStage: {},
        byCompanyType: {},
      };

      data?.forEach(account => {
        // Count by stage
        if (account?.stage) {
          stats.byStage[account.stage] = (stats?.byStage?.[account?.stage] || 0) + 1;
        }

        // Count by company type
        if (account?.company_type) {
          stats.byCompanyType[account.company_type] = (stats?.byCompanyType?.[account?.company_type] || 0) + 1;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load account statistics' };
    }
  },
};