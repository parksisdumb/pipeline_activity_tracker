import { supabase } from '../lib/supabase';
import { managerService } from './managerService';

export const accountsService = {
  // Get all accounts for the current user with role-based access
  async getAccounts(filters = {}) {
    try {
      // Get current user to determine role-based access
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      if (userError || !user) {
        return { success: false, error: 'Authentication required' };
      }

      // Get user profile to check role
      const { data: userProfile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('role, id')
        ?.eq('id', user?.id)
        ?.single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return { success: false, error: 'Failed to determine user permissions' };
      }

      let data = [];

      // Use role-specific data fetching with improved error handling
      if (userProfile?.role === 'manager') {
        // FIXED: Use getAllTenantAccounts for managers and properly fetch property counts
        try {
          console.log('Fetching ALL tenant accounts for manager:', userProfile?.id);
          
          // Get ALL accounts within manager's tenant
          const managerAccounts = await managerService?.getAllTenantAccounts(userProfile?.id);
          
          if (managerAccounts && Array.isArray(managerAccounts)) {
            console.log('Manager tenant accounts fetched:', managerAccounts?.length);
            
            // Get account IDs to fetch properties
            const accountIds = managerAccounts?.map(account => account?.id)?.filter(Boolean);
            
            // Fetch properties for all accounts at once
            let propertiesByAccount = {};
            if (accountIds?.length > 0) {
              const { data: propertiesData, error: propertiesError } = await supabase
                ?.from('properties')
                ?.select('id, name, stage, account_id')
                ?.in('account_id', accountIds);

              if (propertiesError) {
                console.warn('Error fetching properties for manager accounts:', propertiesError);
                // Continue without properties data
              } else {
                // Group properties by account_id
                propertiesData?.forEach(property => {
                  if (!propertiesByAccount?.[property?.account_id]) {
                    propertiesByAccount[property?.account_id] = [];
                  }
                  propertiesByAccount?.[property?.account_id]?.push(property);
                });
              }
            }
            
            // Transform manager-specific data to match expected structure
            data = managerAccounts?.map(account => ({
              // Core account fields
              id: account?.id,
              name: account?.name,
              company_type: account?.company_type,
              stage: account?.stage,
              city: account?.city,
              state: account?.state,
              email: account?.email,
              phone: account?.phone,
              created_at: account?.created_at,
              updated_at: account?.updated_at,
              notes: account?.notes,
              is_active: account?.is_active !== false, // Default to true if undefined
              
              // Transform assigned reps data
              assigned_reps: account?.assigned_reps || [],
              primary_rep_name: account?.primary_rep_name,
              
              // Create assigned_rep object for compatibility with existing UI components
              assigned_rep: account?.primary_rep_name ? {
                full_name: account?.primary_rep_name,
                id: null,
                email: null
              } : null,
              
              // Add computed fields for UI compatibility
              companyType: account?.company_type,
              assignedRep: account?.primary_rep_name || 'Unassigned',
              lastActivity: account?.updated_at,
              primaryContact: null, // Will be filled from contacts if needed
              
              // FIXED: Get actual properties and count them
              properties: propertiesByAccount?.[account?.id] || [],
              propertiesCount: (propertiesByAccount?.[account?.id] || [])?.length,
              contacts: [] // Empty for now, can be populated if needed
            })) || [];
            
            console.log('Transformed manager tenant accounts with property counts:', data?.length);
          } else {
            console.warn('Manager function returned invalid data:', managerAccounts);
            data = [];
          }

        } catch (managerError) {
          console.error('Manager tenant account access error:', managerError);
          
          // Fallback to standard query if manager function fails
          console.log('Falling back to standard account query for manager');
          
          let query = supabase?.from('accounts')?.select(`
              *,
              assigned_rep:user_profiles!assigned_rep_id(id, full_name, email),
              properties(id, name, stage),
              contacts(id, first_name, last_name, is_primary_contact)
            `);

          const { data: queryData, error } = await query?.eq('is_active', true);

          if (error) {
            console.error('Fallback accounts query error:', error);
            return { success: false, error: error?.message };
          }

          data = queryData || [];
        }
      } else {
        // Use standard query for reps, admins, and super_admins
        console.log('Fetching standard accounts for role:', userProfile?.role);
        
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

        const { data: queryData, error } = await query;

        if (error) {
          console.error('Accounts query error:', error);
          return { success: false, error: error?.message };
        }

        data = queryData || [];
        console.log('Standard accounts fetched:', data?.length);
      }

      // Apply client-side filtering for manager accounts (since function doesn't support filtering)
      if (userProfile?.role === 'manager' && filters && Object.keys(filters)?.length > 0) {
        console.log('Applying client-side filters:', filters);
        
        if (filters?.searchTerm) {
          const searchLower = filters?.searchTerm?.toLowerCase();
          data = data?.filter(account => 
            account?.name?.toLowerCase()?.includes(searchLower) ||
            account?.email?.toLowerCase()?.includes(searchLower)
          );
        }

        if (filters?.companyType) {
          data = data?.filter(account => account?.company_type === filters?.companyType);
        }

        if (filters?.stage) {
          data = data?.filter(account => account?.stage === filters?.stage);
        }

        if (filters?.assignedRep) {
          data = data?.filter(account => 
            account?.assigned_reps?.some(rep => rep?.rep_id === filters?.assignedRep) ||
            account?.assigned_rep_id === filters?.assignedRep
          );
        }

        if (!filters?.showInactive) {
          data = data?.filter(account => account?.is_active !== false);
        }

        // Apply sorting
        const sortColumn = filters?.sortBy || 'name';
        const sortDirection = filters?.sortDirection === 'desc' ? -1 : 1;
        data = data?.sort((a, b) => {
          const aVal = a?.[sortColumn] || '';
          const bVal = b?.[sortColumn] || '';
          return aVal?.toString()?.localeCompare(bVal?.toString()) * sortDirection;
        });
      }

      // Transform data to include computed properties for UI consistency
      const transformedData = data?.map(account => ({
        ...account,
        // Ensure all required fields exist
        id: account?.id,
        name: account?.name,
        company_type: account?.company_type,
        stage: account?.stage,
        is_active: account?.is_active !== false,
        
        // Computed properties - FIXED to use actual property counts
        propertiesCount: account?.propertiesCount ?? (account?.properties?.length || 0),
        lastActivity: account?.updated_at,
        primaryContact: account?.contacts?.find(c => c?.is_primary_contact),
        
        // UI-friendly field mappings
        companyType: account?.company_type,
        assignedRep: account?.primary_rep_name || account?.assigned_rep?.full_name || 'Unassigned',
        
        // Manager-specific data
        assignedRepsData: account?.assigned_reps || [],
        primaryRepName: account?.primary_rep_name || account?.assigned_rep?.full_name,
        
        // Ensure arrays exist
        properties: account?.properties || [],
        contacts: account?.contacts || [],
        assigned_reps: account?.assigned_reps || []
      }));

      console.log('Final transformed accounts:', transformedData?.length);
      console.log('Sample account with property count:', transformedData?.[0]);

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
      // Enhanced query to fetch comprehensive account data
      const { data, error } = await supabase
        ?.from('accounts')
        ?.select(`
          *,
          assigned_rep:user_profiles!assigned_rep_id(id, full_name, email, phone, role),
          properties(id, name, stage, building_type, square_footage, year_built, address, city, state),
          contacts(id, first_name, last_name, title, email, phone, mobile_phone, stage, is_primary_contact),
          activities(id, activity_type, activity_date, subject, outcome, notes, duration_minutes),
          opportunities(id, name, stage, opportunity_type, bid_value, probability, expected_close_date),
          account_assignments!account_assignments_account_id_fkey(
            id,
            rep_id,
            is_primary,
            assigned_at,
            notes,
            assigned_by,
            rep:user_profiles!account_assignments_rep_id_fkey(id, full_name, email, phone, role),
            assigner:user_profiles!account_assignments_assigned_by_fkey(id, full_name, email)
          )
        `)
        ?.eq('id', accountId)
        ?.single();

      if (error) {
        if (error?.code === 'PGRST116') {
          return { success: false, error: 'Account not found' };
        }
        console.error('Get account error:', error);
        return { success: false, error: error?.message };
      }

      // Transform the data to include computed fields for UI
      const transformedAccount = {
        ...data,
        // Transform assigned reps for UI compatibility
        assigned_reps: data?.account_assignments?.map(assignment => ({
          rep_id: assignment?.rep_id,
          rep_name: assignment?.rep?.full_name,
          rep_email: assignment?.rep?.email,
          rep_phone: assignment?.rep?.phone,
          rep_role: assignment?.rep?.role,
          is_primary: assignment?.is_primary,
          assigned_at: assignment?.assigned_at,
          assignment_notes: assignment?.notes,
          assigned_by_name: assignment?.assigner?.full_name,
          assigned_by_email: assignment?.assigner?.email
        })) || [],
        
        // Add computed fields for UI compatibility
        companyType: data?.company_type,
        primaryContact: data?.contacts?.find(c => c?.is_primary_contact),
        propertiesCount: data?.properties?.length || 0,
        contactsCount: data?.contacts?.length || 0,
        activitiesCount: data?.activities?.length || 0,
        opportunitiesCount: data?.opportunities?.length || 0,
        lastActivity: data?.activities?.length > 0 
          ? data?.activities?.sort((a, b) => new Date(b?.activity_date) - new Date(a?.activity_date))?.[0]?.activity_date
          : data?.updated_at,

        // Legacy compatibility
        primary_rep_name: data?.assigned_rep?.full_name,
        assignedRep: data?.assigned_rep?.full_name || 'Unassigned'
      };

      return { success: true, data: transformedAccount };
    } catch (error) {
      console.error('Service error:', error);
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Cannot connect to database. Your Supabase project may be paused or inactive. Please check your Supabase dashboard and resume your project if needed.' 
        };
      }
      return { success: false, error: 'Failed to load account' };
    }
  },

  // Create a new account - Fixed to handle tenant issues
  async createAccount(accountData) {
    try {
      // Ensure required fields are present
      const requiredFields = ['name', 'company_type'];
      for (const field of requiredFields) {
        if (!accountData?.[field]) {
          return { success: false, error: `${field} is required` };
        }
      }

      // Get current user to handle tenant assignment
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      if (userError || !user) {
        return { success: false, error: 'Authentication required to create account' };
      }

      // If no assigned rep is provided, assign to current user
      if (!accountData?.assigned_rep_id) {
        accountData.assigned_rep_id = user?.id;
      }

      const { data, error } = await supabase?.from('accounts')?.insert(accountData)?.select(`
          *,
          assigned_rep:user_profiles(id, full_name, email)
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

        // Handle tenant-related errors
        if (error?.message?.includes('tenant')) {
          return { success: false, error: 'Unable to determine organization. Please contact support.' };
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
          assigned_rep:user_profiles(id, full_name, email)
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