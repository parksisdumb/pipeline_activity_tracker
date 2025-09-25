import { supabase } from '../lib/supabase';

export const opportunitiesService = {
  // Get opportunity types (static data from enum)
  getOpportunityTypes() {
    return [
      { value: 'new_construction', label: 'New Construction' },
      { value: 'inspection', label: 'Inspection' },
      { value: 'repair', label: 'Repair' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 're_roof', label: 'Re-roof' }
    ];
  },

  // Get opportunity stages (static data from enum)
  getOpportunityStages() {
    return [
      { value: 'identified', label: 'Identified' },
      { value: 'qualified', label: 'Qualified' },
      { value: 'proposal_sent', label: 'Proposal Sent' },
      { value: 'negotiation', label: 'Negotiation' },
      { value: 'won', label: 'Won' },
      { value: 'lost', label: 'Lost' }
    ];
  },

  // Fixed: Add UUID validation helper method
  isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    // Prevent ":id" placeholder and other invalid patterns
    if (uuid === ':id' || uuid?.includes(':') || uuid === '' || uuid === 'undefined' || uuid === 'null') {
      return false;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex?.test(uuid);
  },

  // Get all opportunities with enhanced error handling and better data flow
  async getOpportunities(options = {}) {
    try {
      const { 
        stage = null, 
        opportunity_type = null, 
        limit = 50, 
        offset = 0,
        search = null,
        account_id = null,
        property_id = null,
        assigned_to = null,
        min_bid_value = null,
        max_bid_value = null,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      console.log('Loading opportunities with options:', options);

      // Clean and validate UUID parameters before using them
      const cleanAccountId = this.isValidUUID(account_id) ? account_id : null;
      const cleanPropertyId = this.isValidUUID(property_id) ? property_id : null;
      const cleanAssignedTo = this.isValidUUID(assigned_to) ? assigned_to : null;

      // Use database function for simpler queries to ensure better data consistency
      if (!search && !cleanAccountId && !cleanPropertyId && !cleanAssignedTo && 
          !min_bid_value && !max_bid_value && sortBy === 'created_at' && sortOrder === 'desc') {
        
        console.log('Using database function for opportunities');
        
        const { data, error } = await supabase?.rpc('get_opportunities_with_details', {
          filter_stage: stage || null,
          filter_type: opportunity_type || null,
          limit_count: limit || 50,
          offset_count: offset || 0
        });

        if (error) {
          console.error('Database function error:', error);
          throw new Error(error?.message || 'Failed to fetch opportunities');
        }

        // Enhanced data transformation with proper field mapping
        const transformedData = (data || [])?.map(opp => ({
          id: opp?.id,
          name: opp?.name || 'Unnamed Opportunity',
          opportunity_type: opp?.opportunity_type,
          stage: opp?.stage,
          bid_value: opp?.bid_value || 0,
          currency: opp?.currency || 'USD',
          expected_close_date: opp?.expected_close_date,
          probability: opp?.probability || 0,
          description: opp?.description,
          created_at: opp?.created_at,
          updated_at: opp?.updated_at,
          // Enhanced nested objects for better UI display
          account: opp?.account_name ? {
            id: opp?.account_id,
            name: opp?.account_name,
            company_type: opp?.account_company_type || ''
          } : null,
          property: opp?.property_name ? {
            id: opp?.property_id,
            name: opp?.property_name,
            building_type: opp?.property_building_type || '',
            address: opp?.property_address || ''
          } : null,
          assigned_to: opp?.assigned_to_name ? {
            id: opp?.assigned_to_id,
            full_name: opp?.assigned_to_name,
            email: opp?.assigned_to_email || ''
          } : null
        }));

        console.log(`Opportunities loaded successfully: ${transformedData?.length} items`);
        if (transformedData?.length > 0) {
          console.log('Sample opportunity structure:', transformedData?.[0]);
        }

        return { 
          success: true, 
          data: transformedData, 
          count: transformedData?.length,
          error: null 
        };
      } else {
        // Use direct query for complex filtering with enhanced error handling
        console.log('Using direct query for complex filtering');
        
        let query = supabase?.from('opportunities')?.select(`
          *,
          account:accounts(id, name, company_type, email, phone),
          property:properties(id, name, building_type, address, square_footage),
          assigned_to:user_profiles!assigned_to(id, full_name, email)
        `, { count: 'exact' });

        // Apply filters with strict UUID validation
        if (stage) {
          query = query?.eq('stage', stage);
        }

        if (opportunity_type) {
          query = query?.eq('opportunity_type', opportunity_type);
        }

        // Only apply UUID filters if they are valid
        if (cleanAccountId) {
          query = query?.eq('account_id', cleanAccountId);
        }

        if (cleanPropertyId) {
          query = query?.eq('property_id', cleanPropertyId);
        }

        if (cleanAssignedTo) {
          query = query?.eq('assigned_to', cleanAssignedTo);
        }

        // Apply text search
        if (search && search?.trim() !== '') {
          query = query?.or(`name.ilike.%${search?.trim()}%,description.ilike.%${search?.trim()}%`);
        }

        // Apply value range filters
        if (min_bid_value && !isNaN(Number(min_bid_value))) {
          query = query?.gte('bid_value', Number(min_bid_value));
        }

        if (max_bid_value && !isNaN(Number(max_bid_value))) {
          query = query?.lte('bid_value', Number(max_bid_value));
        }

        // Apply sorting with validation
        const validSortColumns = ['name', 'stage', 'bid_value', 'created_at', 'updated_at', 'expected_close_date'];
        if (validSortColumns?.includes(sortBy)) {
          query = query?.order(sortBy, { ascending: sortOrder === 'asc' });
        } else {
          query = query?.order('created_at', { ascending: false });
        }

        // Apply pagination with bounds checking
        const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 1000));
        const safeOffset = Math.max(0, Number(offset) || 0);
        query = query?.range(safeOffset, safeOffset + safeLimit - 1);

        const { data, error, count } = await query;

        if (error) {
          console.error('Direct query error:', error);
          throw new Error(error?.message || 'Failed to fetch opportunities');
        }

        // Enhanced data processing
        const processedData = (data || [])?.map(opp => ({
          ...opp,
          bid_value: opp?.bid_value || 0,
          probability: opp?.probability || 0,
          currency: opp?.currency || 'USD'
        }));

        console.log(`Direct query completed: ${processedData?.length} items, total: ${count}`);

        return { 
          success: true, 
          data: processedData, 
          count: count || 0,
          error: null 
        };
      }
    } catch (error) {
      console.error('getOpportunities error:', error);
      return { 
        success: false,
        data: [], 
        count: 0,
        error: error?.message || 'Failed to load opportunities. Please check your connection and try again.'
      };
    }
  },

  // Enhanced pipeline metrics with better error handling
  async getPipelineMetrics() {
    try {
      console.log('Loading pipeline metrics...');
      
      const { data, error } = await supabase?.rpc('get_opportunity_pipeline_metrics');

      if (error) {
        console.error('Pipeline metrics error:', error);
        throw new Error(error?.message || 'Failed to fetch pipeline metrics');
      }

      // Enhanced data transformation with proper stage mapping
      const transformedData = (data || [])?.map(metric => {
        const stageInfo = this.getOpportunityStages()?.find(stage => stage?.value === metric?.stage);
        return {
          stage: metric?.stage,
          label: stageInfo?.label || metric?.stage?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase()),
          count_opportunities: parseInt(metric?.count_opportunities) || 0,
          total_value: parseFloat(metric?.total_value) || 0,
          avg_probability: parseFloat(metric?.avg_probability) || 0
        };
      });

      // Ensure all stages are represented (with zero values if no data)
      const allStages = this.getOpportunityStages();
      const completeMetrics = allStages?.map(stageInfo => {
        const existingMetric = transformedData?.find(m => m?.stage === stageInfo?.value);
        return existingMetric || {
          stage: stageInfo?.value,
          label: stageInfo?.label,
          count_opportunities: 0,
          total_value: 0,
          avg_probability: 0
        };
      });

      console.log('Pipeline metrics loaded successfully:', completeMetrics?.length, 'stages');
      
      return { success: true, data: completeMetrics, error: null };
    } catch (error) {
      console.error('getPipelineMetrics error:', error);
      return { 
        success: false,
        data: [], 
        error: error?.message || 'Failed to load pipeline metrics'
      };
    }
  },

  // Get single opportunity by ID with enhanced validation
  async getOpportunityById(opportunityId) {
    try {
      if (!this.isValidUUID(opportunityId)) {
        throw new Error('Invalid opportunity ID format');
      }

      const { data, error } = await supabase?.from('opportunities')?.select(`
          *,
          account:accounts(id, name, company_type, email, phone),
          property:properties(id, name, building_type, address, square_footage),
          assigned_rep:user_profiles!assigned_to(id, full_name, email)
        `)?.eq('id', opportunityId)?.single();

      if (error) {
        throw new Error(error?.message || 'Failed to fetch opportunity');
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { 
        success: false,
        data: null, 
        error: error?.message || 'Opportunity not found'
      };
    }
  },

  // Create new opportunity
  async createOpportunity(opportunityData) {
    try {
      // Validate required fields
      if (!opportunityData?.name || !opportunityData?.opportunity_type) {
        throw new Error('Opportunity name and type are required');
      }

      // Ensure numeric fields are properly formatted
      const processedData = {
        ...opportunityData,
        bid_value: opportunityData?.bid_value ? parseFloat(opportunityData?.bid_value) : null,
        probability: opportunityData?.probability ? parseInt(opportunityData?.probability) : null,
      };

      const { data, error } = await supabase?.from('opportunities')?.insert([processedData])?.select(`
          *,
          account:accounts(id, name, company_type),
          property:properties(id, name, building_type, address),
          assigned_rep:user_profiles!assigned_to(id, full_name, email)
        `)?.single();

      if (error) {
        throw new Error(error?.message || 'Failed to create opportunity');
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { 
        success: false,
        data: null, 
        error: error?.message || 'Failed to create opportunity'
      };
    }
  },

  // Update existing opportunity
  async updateOpportunity(opportunityId, updates) {
    try {
      if (!this.isValidUUID(opportunityId)) {
        throw new Error('Invalid opportunity ID format');
      }

      // Process numeric fields
      const processedUpdates = { ...updates };
      if (processedUpdates?.bid_value !== undefined) {
        processedUpdates.bid_value = processedUpdates?.bid_value ? parseFloat(processedUpdates?.bid_value) : null;
      }
      if (processedUpdates?.probability !== undefined) {
        processedUpdates.probability = processedUpdates?.probability ? parseInt(processedUpdates?.probability) : null;
      }

      const { data, error } = await supabase?.from('opportunities')?.update(processedUpdates)?.eq('id', opportunityId)?.select(`
          *,
          account:accounts(id, name, company_type),
          property:properties(id, name, building_type, address),
          assigned_rep:user_profiles!assigned_to(id, full_name, email)
        `)?.single();

      if (error) {
        throw new Error(error?.message || 'Failed to update opportunity');
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { 
        success: false,
        data: null, 
        error: error?.message || 'Failed to update opportunity'
      };
    }
  },

  // Update opportunity stage using database function
  async updateOpportunityStage(opportunityId, newStage, notes = null) {
    try {
      if (!this.isValidUUID(opportunityId)) {
        throw new Error('Invalid opportunity ID format');
      }

      const { data, error } = await supabase?.rpc('update_opportunity_stage', {
        opportunity_uuid: opportunityId,
        new_stage: newStage,
        stage_notes: notes
      });

      if (error) {
        throw new Error(error?.message || 'Failed to update opportunity stage');
      }

      const result = data?.[0];
      if (result?.success) {
        return { success: true, data: result, error: null };
      } else {
        return { success: false, data: null, error: result?.message || 'Failed to update opportunity stage' };
      }
    } catch (error) {
      return { 
        success: false,
        data: null, 
        error: error?.message || 'Failed to update opportunity stage'
      };
    }
  },

  // Delete opportunity
  async deleteOpportunity(opportunityId) {
    try {
      if (!this.isValidUUID(opportunityId)) {
        throw new Error('Invalid opportunity ID format');
      }

      const { error } = await supabase?.from('opportunities')?.delete()?.eq('id', opportunityId);

      if (error) {
        throw new Error(error?.message || 'Failed to delete opportunity');
      }

      return { success: true, error: null };
    } catch (error) {
      return { 
        success: false,
        error: error?.message || 'Failed to delete opportunity'
      };
    }
  },

  // Calculate weighted value based on bid value and probability
  calculateWeightedValue(bidValue, probability) {
    const value = parseFloat(bidValue) || 0;
    const prob = parseInt(probability) || 0;
    if (!value || !prob) return 0;
    return (value * prob) / 100;
  },

  // Format bid value as currency with enhanced formatting
  formatBidValue(value, currency = 'USD') {
    const numValue = parseFloat(value) || 0;
    if (numValue === 0) return '$0';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })?.format(numValue);
  },

  // Get stage progress percentage based on stage
  getStageProgress(stage) {
    const stageProgressMap = {
      'identified': 20,
      'qualified': 40,
      'proposal_sent': 60,
      'negotiation': 80,
      'won': 100,
      'lost': 0
    };
    return stageProgressMap?.[stage] || 0;
  },

  // Get available accounts for dropdown
  async getAvailableAccounts() {
    try {
      const { data, error } = await supabase?.from('accounts')?.select('id, name, company_type, city, state')?.eq('is_active', true)?.order('name');

      if (error) {
        throw new Error(error?.message || 'Failed to fetch accounts');
      }

      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { 
        success: false,
        data: [], 
        error: error?.message || 'Failed to fetch accounts'
      };
    }
  },

  // Get available properties for dropdown
  async getAvailableProperties() {
    try {
      const { data, error } = await supabase?.from('properties')?.select('id, name, building_type, address, city, state, account:accounts(id, name)')?.order('name');

      if (error) {
        throw new Error(error?.message || 'Failed to fetch properties');
      }

      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { 
        success: false,
        data: [], 
        error: error?.message || 'Failed to fetch properties'
      };
    }
  },

  // Get available sales reps for assignment
  async getAvailableReps() {
    try {
      const { data, error } = await supabase?.from('user_profiles')?.select('id, full_name, email, role')?.in('role', ['rep', 'manager'])?.eq('is_active', true)?.order('full_name');

      if (error) {
        throw new Error(error?.message || 'Failed to fetch representatives');
      }

      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { 
        success: false,
        data: [], 
        error: error?.message || 'Failed to fetch representatives'
      };
    }
  },

  // Get opportunities by account
  async getOpportunitiesByAccount(accountId) {
    try {
      if (!this.isValidUUID(accountId)) {
        throw new Error('Invalid account ID format');
      }

      const { data, error } = await supabase?.from('opportunities')?.select(`
          *,
          property:properties(id, name, building_type, address),
          assigned_rep:user_profiles!assigned_to(id, full_name, email)
        `)?.eq('account_id', accountId)?.order('created_at', { ascending: false });

      if (error) {
        throw new Error(error?.message || 'Failed to fetch account opportunities');
      }

      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { 
        success: false,
        data: [], 
        error: error?.message || 'Failed to fetch account opportunities'
      };
    }
  },

  // Get opportunities by property
  async getOpportunitiesByProperty(propertyId) {
    try {
      if (!this.isValidUUID(propertyId)) {
        throw new Error('Invalid property ID format');
      }

      const { data, error } = await supabase?.from('opportunities')?.select(`
          *,
          account:accounts(id, name, company_type),
          assigned_rep:user_profiles!assigned_to(id, full_name, email)
        `)?.eq('property_id', propertyId)?.order('created_at', { ascending: false });

      if (error) {
        throw new Error(error?.message || 'Failed to fetch property opportunities');
      }

      return { success: true, data: data || [], error: null };
    } catch (error) {
      return { 
        success: false,
        data: [], 
        error: error?.message || 'Failed to fetch property opportunities'
      };
    }
  }
};

export default opportunitiesService;