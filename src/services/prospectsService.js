import { supabase } from '../lib/supabase';

export const prospectsService = {
  // Get prospects with advanced filtering and pagination (improved version)
  async listProspects(filters = {}, sort = {}, pagination = {}) {
    try {
      const {
        status = ['uncontacted', 'researching', 'attempted', 'contacted'], // More inclusive default
        min_icp_score = 0, // Include all by default
        state = null,
        city = null,
        source = null,
        assigned_to = null,
        search = null
      } = filters;

      const {
        column = 'created_at', // Sort by created_at by default to show newest first
        direction = 'desc'
      } = sort;

      const {
        limit = 50,
        offset = 0
      } = pagination;

      // Always use direct query instead of problematic database function
      let query = supabase
        ?.from('prospects')
        ?.select(`
          *,
          assigned_user:user_profiles!prospects_assigned_to_fkey(id, full_name, email)
        `);

      // Apply filters
      if (status?.length > 0) {
        query = query?.in('status', status);
      }
      
      if (min_icp_score > 0) {
        query = query?.gte('icp_fit_score', min_icp_score);
      }

      if (state) {
        query = query?.ilike('state', `%${state}%`);
      }

      if (city) {
        query = query?.ilike('city', `%${city}%`);
      }

      if (source) {
        query = query?.ilike('source', `%${source}%`);
      }

      // Handle assigned_to filter
      if (assigned_to === 'me') {
        const { data: { user } } = await supabase?.auth?.getUser();
        if (user) {
          query = query?.eq('assigned_to', user?.id);
        }
      } else if (assigned_to === 'unassigned') {
        query = query?.is('assigned_to', null);
      } else if (assigned_to && assigned_to !== 'any') {
        query = query?.eq('assigned_to', assigned_to);
      }

      if (search) {
        query = query?.or(`name.ilike.%${search}%,domain.ilike.%${search}%`);
      }

      // Apply sorting with proper column names
      const sortColumn = column === 'icp_fit_score' ? 'icp_fit_score' : 
                        column === 'name' ? 'name' : 
                        column === 'created_at' ? 'created_at' :
                        column === 'last_activity_at' ? 'last_activity_at' : 'created_at';
      
      query = query?.order(sortColumn, { ascending: direction === 'asc' });

      // Apply pagination
      query = query?.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching prospects:', error);
        return { data: [], error: error?.message, totalCount: 0 };
      }

      // Process data to include derived fields that the database function would have provided
      const processedData = (data || [])?.map(prospect => ({
        ...prospect,
        assigned_to_name: prospect?.assigned_user?.full_name || null,
        has_phone: !!prospect?.phone,
        has_website: !!prospect?.website
      }));

      return {
        data: processedData,
        error: null,
        totalCount: processedData?.length || 0
      };
    } catch (error) {
      console.error('Prospects service error:', error);
      return { 
        data: [], 
        error: 'Failed to load prospects. Please try again.',
        totalCount: 0
      };
    }
  },

  // Get prospect statistics/counts by status for KPIs
  async getProspectStats() {
    try {
      const { data, error } = await supabase
        ?.from('prospects')
        ?.select('status, id');

      if (error) {
        console.error('Error getting prospect stats:', error);
        return { data: {}, error: error?.message };
      }

      // Count by status
      const counts = (data || [])?.reduce((acc, prospect) => {
        acc[prospect?.status] = (acc?.[prospect?.status] || 0) + 1;
        acc.total = (acc?.total || 0) + 1;
        return acc;
      }, {});

      return { data: counts, error: null };
    } catch (error) {
      console.error('Get stats error:', error);
      return { data: {}, error: 'Failed to get prospect statistics.' };
    }
  },

  // Start sequence or create task for prospect
  async startSequenceOrTask(id) {
    try {
      // Create a first-touch task since sequences aren't implemented yet
      const taskData = {
        title: `First outreach to prospect`,
        description: `Initial contact attempt for prospect`,
        category: 'other',
        priority: 'medium',
        status: 'pending',
        due_date: new Date()?.toISOString()?.split('T')?.[0], // Today's date
        prospect_id: id // Note: You may need to add this column to tasks table if it doesn't exist
      };

      const { data, error } = await supabase
        ?.from('tasks')
        ?.insert([taskData])
        ?.select()
        ?.single();

      if (error) {
        console.error('Error creating first outreach task:', error);
        return { data: null, error: error?.message };
      }

      // Update prospect status to attempted and set last activity
      await this.updateProspect(id, {
        status: 'attempted',
        last_activity_at: new Date()?.toISOString()
      });

      return { data, error: null };
    } catch (error) {
      console.error('Start sequence error:', error);
      return { data: null, error: 'Failed to start sequence.' };
    }
  },

  // Export prospects to CSV data
  async exportProspects(filters = {}) {
    try {
      // Get all prospects matching filters without pagination
      const result = await this.listProspects(filters, {}, { limit: 10000, offset: 0 });
      
      if (result?.error) {
        return { data: null, error: result?.error };
      }

      // Format data for CSV export
      const csvData = (result?.data || [])?.map(prospect => ({
        Name: prospect?.name || '',
        Domain: prospect?.domain || '',
        Phone: prospect?.phone || '',
        City: prospect?.city || '',
        State: prospect?.state || '',
        'Company Type': prospect?.company_type || '',
        'ICP Score': prospect?.icp_fit_score || '',
        Status: prospect?.status || '',
        Source: prospect?.source || '',
        'Assigned To': prospect?.assigned_to_name || 'Unassigned', // Updated field name
        Created: prospect?.created_at ? new Date(prospect?.created_at)?.toLocaleDateString() : ''
      }));

      return { data: csvData, error: null };
    } catch (error) {
      console.error('Export prospects error:', error);
      return { data: null, error: 'Failed to export prospects.' };
    }
  },

  // Get prospects with advanced filtering and pagination
  async getProspects(filters = {}) {
    try {
      const {
        status = ['uncontacted'],
        minIcpScore = 0,
        state = null,
        city = null,
        source = null,
        assignedFilter = 'any', // 'me', 'unassigned', 'any'
        searchTerm = null,
        sortBy = 'icp_fit_score',
        sortDirection = 'desc',
        limit = 50,
        offset = 0
      } = filters;

      // Map assignedFilter to assigned_to parameter for consistency
      let assignedTo = 'any';
      if (assignedFilter === 'me') {
        assignedTo = 'me';
      } else if (assignedFilter === 'unassigned') {
        assignedTo = 'unassigned';
      }

      // Use listProspects method for consistency
      return await this.listProspects({
        status,
        min_icp_score: minIcpScore,
        state,
        city,
        source,
        assigned_to: assignedTo,
        search: searchTerm
      }, {
        column: sortBy,
        direction: sortDirection
      }, {
        limit,
        offset
      });
    } catch (error) {
      console.error('Prospects service error:', error);
      return { 
        data: [], 
        error: 'Failed to load prospects. Please try again.',
        totalCount: 0
      };
    }
  },

  // Get single prospect by ID - FIXED VERSION WITH BETTER ID VALIDATION
  async getProspect(id) {
    try {
      // Enhanced validation for id parameter
      if (!id) {
        console.error('No prospect ID provided');
        return { data: null, error: 'Prospect ID is required' };
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (typeof id !== 'string' || !uuidRegex?.test(id)) {
        console.error('Invalid UUID format for prospect ID:', id);
        return { data: null, error: 'Invalid prospect ID format' };
      }

      console.log('Fetching prospect with ID:', id);

      const { data, error } = await supabase
        ?.from('prospects')
        ?.select(`
          *,
          assigned_user:user_profiles!prospects_assigned_to_fkey(id, full_name, email),
          creator:user_profiles!prospects_created_by_fkey(id, full_name, email),
          linked_account:accounts(id, name, stage)
        `)
        ?.eq('id', id)
        ?.single();

      if (error) {
        console.error('Supabase error fetching prospect:', error);
        
        // Handle specific error cases
        if (error?.code === 'PGRST116') {
          return { data: null, error: 'Prospect not found' };
        } else if (error?.code === '22P02') {
          return { data: null, error: 'Invalid prospect ID format' };
        }
        
        return { data: null, error: error?.message || 'Failed to fetch prospect details' };
      }

      if (!data) {
        return { data: null, error: 'Prospect not found' };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Get prospect error:', error);
      return { data: null, error: 'Failed to load prospect details.' };
    }
  },

  // Create new prospect
  async createProspect(prospectData) {
    try {
      // Helper function to convert empty string to null for integer fields
      const parseIntOrNull = (value) => {
        if (!value || value === '' || value === null || value === undefined) {
          return null;
        }
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
      };

      // Get current user to handle tenant assignment and created_by field
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      if (userError || !user) {
        return { data: null, error: 'Authentication required to create prospect' };
      }

      // Get user profile to get tenant_id
      const { data: userProfile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('tenant_id')
        ?.eq('id', user?.id)
        ?.single();

      if (profileError) {
        console.error('Error fetching user profile for prospect creation:', profileError);
        return { data: null, error: 'Unable to determine organization. Please contact support.' };
      }

      if (!userProfile?.tenant_id) {
        return { data: null, error: 'User profile does not have a valid organization. Please contact support.' };
      }

      const { data, error } = await supabase
        ?.from('prospects')
        ?.insert([{
          name: prospectData?.name,
          domain: prospectData?.domain,
          phone: prospectData?.phone,
          website: prospectData?.website,
          address: prospectData?.address,
          city: prospectData?.city,
          state: prospectData?.state,
          zip_code: prospectData?.zipCode,
          company_type: prospectData?.companyType,
          employee_count: parseIntOrNull(prospectData?.employeeCount),
          property_count_estimate: parseIntOrNull(prospectData?.propertyCount),
          sqft_estimate: parseIntOrNull(prospectData?.sqftEstimate),
          building_types: prospectData?.buildingTypes || [],
          icp_fit_score: parseIntOrNull(prospectData?.icpFitScore),
          source: prospectData?.source,
          tags: prospectData?.tags || [],
          notes: prospectData?.notes,
          // Required fields for RLS policy compliance
          tenant_id: userProfile?.tenant_id,
          created_by: user?.id
        }])
        ?.select()
        ?.single();

      if (error) {
        console.error('Error creating prospect:', error);
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Create prospect error:', error);
      return { data: null, error: 'Failed to create prospect.' };
    }
  },

  // Update prospect
  async updateProspect(id, updates) {
    try {
      // Validate ID format before updating
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!id || typeof id !== 'string' || !uuidRegex?.test(id)) {
        console.error('Invalid UUID format for prospect update:', id);
        return { data: null, error: 'Invalid prospect ID format' };
      }

      const { data, error } = await supabase
        ?.from('prospects')
        ?.update({
          ...updates,
          last_activity_at: new Date()?.toISOString()
        })
        ?.eq('id', id)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error updating prospect:', error);
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Update prospect error:', error);
      return { data: null, error: 'Failed to update prospect.' };
    }
  },

  // Claim prospect (assign to current user)
  async claimProspect(id) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) {
        return { data: null, error: 'No authenticated user found.' };
      }

      const { data, error } = await supabase
        ?.from('prospects')
        ?.update({ 
          assigned_to: user?.id,
          last_activity_at: new Date()?.toISOString()
        })
        ?.eq('id', id)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error claiming prospect:', error);
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Claim prospect error:', error);
      return { data: null, error: 'Failed to claim prospect.' };
    }
  },

  // Update prospect status
  async updateStatus(id, status, notes = null) {
    try {
      const updates = {
        status,
        last_activity_at: new Date()?.toISOString()
      };

      if (notes) {
        updates.notes = notes;
      }

      const { data, error } = await supabase
        ?.from('prospects')
        ?.update(updates)
        ?.eq('id', id)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error updating prospect status:', error);
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Update status error:', error);
      return { data: null, error: 'Failed to update prospect status.' };
    }
  },

  // Find duplicate accounts for prospect - ENHANCED VERSION WITH BETTER ERROR HANDLING
  async findDuplicateAccounts(prospectData) {
    try {
      // Enhanced input validation
      if (!prospectData || typeof prospectData !== 'object') {
        console.error('Invalid prospect data provided for duplicate check');
        return { data: [], error: 'Invalid prospect data' };
      }

      // Get current user's tenant_id for the function call
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) {
        return { data: [], error: 'Authentication required' };
      }

      // Get user profile to get tenant_id
      const { data: userProfile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('tenant_id')
        ?.eq('id', user?.id)
        ?.single();

      if (profileError || !userProfile?.tenant_id) {
        console.error('Error getting user tenant for duplicate check:', profileError);
        return { data: [], error: 'Unable to determine user organization' };
      }

      console.log('Calling find_account_duplicates with:', {
        prospect_name: prospectData?.name,
        prospect_domain: prospectData?.domain,
        prospect_phone: prospectData?.phone,
        prospect_city: prospectData?.city,
        prospect_state: prospectData?.state,
        current_tenant_id: userProfile?.tenant_id
      });

      // Call the database function with error handling
      const { data, error } = await supabase?.rpc('find_account_duplicates', {
        prospect_name: prospectData?.name || '',
        prospect_domain: prospectData?.domain || '',
        prospect_phone: prospectData?.phone || '',
        prospect_city: prospectData?.city || '',
        prospect_state: prospectData?.state || '',
        current_tenant_id: userProfile?.tenant_id
      });

      if (error) {
        console.error('Database function error finding duplicates:', error);
        
        // If the function fails due to similarity issues, return empty array rather than error
        if (error?.message?.includes('similarity') || error?.code === '42883') {
          console.warn('Similarity function unavailable, skipping duplicate check');
          return { data: [], error: null };
        }
        
        return { data: [], error: error?.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Find duplicates error:', error);
      
      // If it's a function-related error, return empty results instead of failing
      if (error?.message?.includes('similarity') || error?.message?.includes('function')) {
        console.warn('Duplicate checking function unavailable, continuing without checks');
        return { data: [], error: null };
      }
      
      return { data: [], error: 'Failed to check for duplicate accounts.' };
    }
  },

  // Convert prospect to account - FIXED TO MATCH DATABASE FUNCTION SIGNATURE
  async convertToAccount(prospectId, linkAccountId = null) {
    try {
      // Validate prospect ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!prospectId || typeof prospectId !== 'string' || !uuidRegex?.test(prospectId)) {
        console.error('Invalid UUID format for prospect conversion:', prospectId);
        return { data: null, error: 'Invalid prospect ID format' };
      }

      console.log('Converting prospect with ID:', prospectId, 'Link to account:', linkAccountId);

      // Call database function with correct parameters (matches function signature)
      const { data, error } = await supabase?.rpc('convert_prospect_to_account', {
        prospect_uuid: prospectId,
        link_to_existing_account_id: linkAccountId || null
      });

      if (error) {
        console.error('Error converting prospect:', error);
        return { data: null, error: error?.message };
      }

      // Handle the returned data from the function
      const result = data?.[0];
      if (!result?.success) {
        return { data: null, error: result?.message || 'Conversion failed.' };
      }

      return { 
        data: {
          success: true,
          message: result?.message,
          accountId: result?.account_id,
          prospectId: result?.prospect_id
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Convert prospect error:', error);
      return { data: null, error: 'Failed to convert prospect to account.' };
    }
  },

  // Add prospect to route (create task)
  async addToRoute(id, routeDate, notes = null) {
    try {
      // Create task for the prospect
      const taskData = {
        title: `Follow up with prospect`,
        description: `Route visit for prospect. ${notes ? `Notes: ${notes}` : ''}`,
        category: 'other',
        priority: 'medium',
        status: 'pending',
        due_date: routeDate,
        prospect_id: id // Note: You may need to add this column to tasks table if it doesn't exist
      };

      const { data, error } = await supabase
        ?.from('tasks')
        ?.insert([taskData])
        ?.select()
        ?.single();

      if (error) {
        console.error('Error adding to route:', error);
        return { data: null, error: error?.message };
      }

      // Update prospect with last activity
      await this.updateProspect(id, {
        last_activity_at: new Date()?.toISOString(),
        notes: notes ? `Route added: ${notes}` : 'Added to route'
      });

      return { data, error: null };
    } catch (error) {
      console.error('Add to route error:', error);
      return { data: null, error: 'Failed to add prospect to route.' };
    }
  },

  // Bulk operations
  async bulkAssign(prospectIds, userId) {
    try {
      const { data, error } = await supabase
        ?.from('prospects')
        ?.update({ 
          assigned_to: userId,
          last_activity_at: new Date()?.toISOString()
        })
        ?.in('id', prospectIds)
        ?.select();

      if (error) {
        console.error('Error bulk assigning prospects:', error);
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Bulk assign error:', error);
      return { data: null, error: 'Failed to bulk assign prospects.' };
    }
  },

  async bulkUpdateStatus(prospectIds, status) {
    try {
      const { data, error } = await supabase
        ?.from('prospects')
        ?.update({ 
          status,
          last_activity_at: new Date()?.toISOString()
        })
        ?.in('id', prospectIds)
        ?.select();

      if (error) {
        console.error('Error bulk updating status:', error);
        return { data: null, error: error?.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Bulk status update error:', error);
      return { data: null, error: 'Failed to bulk update prospect status.' };
    }
  },

  // Get prospect counts by status for KPIs (alias for getProspectStats)
  async getProspectCounts() {
    return await this.getProspectStats();
  },

  // Delete prospect
  async deleteProspect(id) {
    try {
      const { error } = await supabase
        ?.from('prospects')
        ?.delete()
        ?.eq('id', id);

      if (error) {
        console.error('Error deleting prospect:', error);
        return { error: error?.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Delete prospect error:', error);
      return { error: 'Failed to delete prospect.' };
    }
  }
};

export default prospectsService;