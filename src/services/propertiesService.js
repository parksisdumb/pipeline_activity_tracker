import { supabase } from '../lib/supabase';

export const propertiesService = {
  // Get all properties for the current user's accounts
  async getProperties(filters = {}) {
    try {
      let query = supabase?.from('properties')?.select(`
          *,
          account:accounts!account_id(id, name, company_type, stage)
        `);

      // Apply filters - Fixed roofType mapping
      if (filters?.searchTerm) {
        query = query?.or(`name.ilike.%${filters?.searchTerm}%,address.ilike.%${filters?.searchTerm}%`);
      }

      if (filters?.accountId) {
        query = query?.eq('account_id', filters?.accountId);
      }

      if (filters?.buildingType) {
        query = query?.eq('building_type', filters?.buildingType);
      }

      // Fixed: Changed roofType to roof_type to match database column
      if (filters?.roofType) {
        query = query?.eq('roof_type', filters?.roofType);
      }

      if (filters?.stage) {
        query = query?.eq('stage', filters?.stage);
      }

      // Apply sorting
      const sortColumn = filters?.sortBy || 'name';
      const sortDirection = filters?.sortDirection === 'desc' ? false : true;
      query = query?.order(sortColumn, { ascending: sortDirection });

      const { data, error } = await query;

      if (error) {
        console.error('Properties query error:', error);
        
        // Enhanced error handling for RLS permission issues
        if (error?.code === '42501' || error?.message?.includes('permission')) {
          return { 
            success: false, 
            error: 'Access denied. You can only view properties from accounts assigned to you.' 
          };
        }
        
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
      return { success: false, error: 'Failed to load properties' };
    }
  },

  // Get a single property by ID
  async getProperty(propertyId) {
    if (!propertyId) return { success: false, error: 'Property ID is required' };

    try {
      const { data, error } = await supabase?.from('properties')?.select(`
          *,
          account:accounts!account_id(id, name, company_type, stage, assigned_rep_id)
        `)?.eq('id', propertyId)?.single();

      if (error) {
        if (error?.code === 'PGRST116') {
          return { success: false, error: 'Property not found or access denied' };
        }
        console.error('Get property error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load property' };
    }
  },

  // Create a new property with enhanced validation
  async createProperty(propertyData) {
    try {
      // Ensure required fields are present
      const requiredFields = ['name', 'address', 'building_type', 'account_id'];
      for (const field of requiredFields) {
        if (!propertyData?.[field]) {
          return { success: false, error: `${field} is required` };
        }
      }

      // Validate account access before creating property
      const { data: account, error: accountError } = await supabase
        ?.from('accounts')
        ?.select('id, name, assigned_rep_id')
        ?.eq('id', propertyData?.account_id)
        ?.single();

      if (accountError || !account) {
        return { 
          success: false, 
          error: 'Selected account not found or you don\'t have access to it' 
        };
      }

      const { data, error } = await supabase?.from('properties')?.insert(propertyData)?.select(`
          *,
          account:accounts!account_id(id, name, company_type)
        `)?.single();

      if (error) {
        console.error('Create property error:', error);
        
        // Handle specific constraint violations
        if (error?.code === '23503') {
          return { success: false, error: 'Invalid account selected' };
        }

        // Handle RLS policy violations
        if (error?.code === '42501') {
          return { 
            success: false, 
            error: 'Cannot create property for this account. You can only add properties to accounts assigned to you.' 
          };
        }

        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service create error:', error);
      return { success: false, error: 'Failed to create property' };
    }
  },

  // Update an existing property
  async updateProperty(propertyId, updates) {
    if (!propertyId) return { success: false, error: 'Property ID is required' };

    try {
      const { data, error } = await supabase?.from('properties')?.update({ 
        ...updates, 
        updated_at: new Date()?.toISOString() 
      })?.eq('id', propertyId)?.select(`
          *,
          account:accounts!account_id(id, name, company_type)
        `)?.single();

      if (error) {
        console.error('Update property error:', error);
        
        if (error?.code === '42501') {
          return { 
            success: false, 
            error: 'Access denied. You can only update properties from accounts assigned to you.' 
          };
        }
        
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to update property' };
    }
  },

  // Delete a property
  async deleteProperty(propertyId) {
    if (!propertyId) return { success: false, error: 'Property ID is required' };

    try {
      const { error } = await supabase?.from('properties')?.delete()?.eq('id', propertyId);

      if (error) {
        console.error('Delete property error:', error);
        
        if (error?.code === '42501') {
          return { 
            success: false, 
            error: 'Access denied. You can only delete properties from accounts assigned to you.' 
          };
        }
        
        return { success: false, error: error?.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to delete property' };
    }
  },

  // Bulk update properties
  async bulkUpdateProperties(propertyIds, updates) {
    if (!propertyIds?.length) return { success: false, error: 'No properties selected' };

    try {
      const { data, error } = await supabase?.from('properties')?.update({ 
        ...updates, 
        updated_at: new Date()?.toISOString() 
      })?.in('id', propertyIds)?.select();

      if (error) {
        console.error('Bulk update error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data, count: data?.length || 0 };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to update properties' };
    }
  },

  // Get properties by account
  async getPropertiesByAccount(accountId, filters = {}) {
    if (!accountId) return { success: false, error: 'Account ID is required' };

    try {
      let query = supabase?.from('properties')?.select('*')?.eq('account_id', accountId);

      if (filters?.buildingType) {
        query = query?.eq('building_type', filters?.buildingType);
      }

      if (filters?.stage) {
        query = query?.eq('stage', filters?.stage);
      }

      query = query?.order('name');

      const { data, error } = await query;

      if (error) {
        console.error('Get properties by account error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load account properties' };
    }
  },

  // Get property statistics
  async getPropertyStats(filters = {}) {
    try {
      let query = supabase?.from('properties')?.select('stage, building_type, square_footage');

      const { data, error } = await query;

      if (error) {
        console.error('Stats query error:', error);
        return { success: false, error: error?.message };
      }

      // Calculate statistics
      const stats = {
        total: data?.length || 0,
        byStage: {},
        byBuildingType: {},
        totalSquareFootage: data?.reduce((sum, prop) => sum + (prop?.square_footage || 0), 0) || 0,
        averageSquareFootage: 0
      };

      // Calculate average square footage
      const propertiesWithSquareFootage = data?.filter(p => p?.square_footage > 0);
      if (propertiesWithSquareFootage?.length > 0) {
        stats.averageSquareFootage = Math.round(stats?.totalSquareFootage / propertiesWithSquareFootage?.length);
      }

      // Count by stage
      data?.forEach(property => {
        if (property?.stage) {
          stats.byStage[property.stage] = (stats?.byStage?.[property?.stage] || 0) + 1;
        }

        if (property?.building_type) {
          stats.byBuildingType[property.building_type] = (stats?.byBuildingType?.[property?.building_type] || 0) + 1;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load property statistics' };
    }
  },

  // Get user's assigned accounts for property creation
  async getUserAssignedAccounts() {
    try {
      const { data, error } = await supabase
        ?.from('accounts')
        ?.select('id, name, company_type, stage')
        ?.eq('assigned_rep_id', (await supabase?.auth?.getUser())?.data?.user?.id)
        ?.order('name');

      if (error) {
        console.error('Get assigned accounts error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load assigned accounts' };
    }
  },

  // NEW: Get all available accounts for property creation (shared access)
  async getAllAvailableAccounts() {
    try {
      const { data, error } = await supabase
        ?.from('accounts')
        ?.select('id, name, company_type, stage')
        ?.eq('is_active', true)
        ?.order('name');

      if (error) {
        console.error('Get all accounts error:', error);
        // Handle specific permission errors
        if (error?.code === '42501' || error?.message?.includes('permission')) {
          return { 
            success: false, 
            error: 'Access denied. Please contact your administrator for account access.' 
          };
        }
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load available accounts' };
    }
  }
};