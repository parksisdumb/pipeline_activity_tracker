import { supabase } from '../lib/supabase';

export const contactsService = {
  // Get all contacts with account information
  async getContacts(filters = {}) {
    try {
      let query = supabase?.from('contacts')?.select(`
          *,
          account:accounts(id, name, company_type)
        `);

      // Apply filters
      if (filters?.searchQuery) {
        query = query?.or(`first_name.ilike.%${filters?.searchQuery}%,last_name.ilike.%${filters?.searchQuery}%,email.ilike.%${filters?.searchQuery}%`);
      }

      if (filters?.accountId) {
        query = query?.eq('account_id', filters?.accountId);
      }

      if (filters?.isPrimary !== undefined) {
        query = query?.eq('is_primary_contact', filters?.isPrimary);
      }

      // Apply sorting
      const sortColumn = filters?.sortBy || 'last_name';
      const sortDirection = filters?.sortDirection === 'desc' ? false : true;
      query = query?.order(sortColumn, { ascending: sortDirection });

      const { data, error } = await query;

      if (error) {
        console.error('Contacts query error:', error);
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
      return { success: false, error: 'Failed to load contacts' };
    }
  },

  // Get a single contact by ID
  async getContact(contactId) {
    if (!contactId) return { success: false, error: 'Contact ID is required' };

    try {
      const { data, error } = await supabase?.from('contacts')?.select(`
          *,
          account:accounts(id, name, company_type),
          activities(*)
        `)?.eq('id', contactId)?.single();

      if (error) {
        if (error?.code === 'PGRST116') {
          return { success: false, error: 'Contact not found' };
        }
        console.error('Get contact error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load contact' };
    }
  },

  // Create a new contact
  async createContact(contactData) {
    try {
      // Enhanced debugging and validation
      console.log('=== CONTACT CREATION DEBUG ===');
      console.log('Contact data being sent:', JSON.stringify(contactData, null, 2));
      
      // Ensure required fields are present
      const requiredFields = ['first_name', 'last_name'];
      for (const field of requiredFields) {
        if (!contactData?.[field]) {
          return { success: false, error: `${field?.replace('_', ' ')} is required` };
        }
      }

      // Enhanced account validation with debugging
      if (contactData?.account_id) {
        console.log('Validating account access for account ID:', contactData?.account_id);
        const { data: accountCheck, error: accountError } = await supabase
          ?.from('accounts')
          ?.select('id, name, tenant_id')
          ?.eq('id', contactData?.account_id)
          ?.single();
        
        if (accountError || !accountCheck) {
          console.error('Account validation failed:', accountError);
          return { 
            success: false, 
            error: 'Selected account not found or access denied. Please verify the account exists and you have permission to access it.' 
          };
        }
        
        console.log('Account validation successful:', accountCheck);
      }

      // Get current user tenant information for debugging - FIXED METHOD
      try {
        // Use proper method to get current user
        const { data: authData, error: authError } = await supabase?.auth?.getUser();
        
        if (authError || !authData?.user?.id) {
          console.warn('Could not get current user from auth:', authError || 'No user session');
        } else {
          const { data: currentUser, error: userError } = await supabase
            ?.from('user_profiles')
            ?.select('id, tenant_id, full_name, email')
            ?.eq('id', authData?.user?.id)
            ?.single();
            
          if (currentUser) {
            console.log('Current user tenant info:', currentUser);
          } else {
            console.warn('Could not get user profile info:', userError);
          }
        }
      } catch (debugError) {
        console.warn('Error getting user info for debugging:', debugError);
        // Don't fail the contact creation due to debugging info
      }

      // If this is set as primary contact, ensure no other contact is primary for this account
      if (contactData?.is_primary_contact && contactData?.account_id) {
        console.log('Setting as primary contact - clearing other primary contacts');
        const { error: updateError } = await supabase
          ?.from('contacts')
          ?.update({ is_primary_contact: false })
          ?.eq('account_id', contactData?.account_id)
          ?.eq('is_primary_contact', true);
          
        if (updateError) {
          console.error('Failed to update existing primary contacts:', updateError);
        }
      }

      // Enhanced contact creation with better error context
      const { data, error } = await supabase?.from('contacts')?.insert(contactData)?.select(`
          *,
          account:accounts(id, name, company_type)
        `)?.single();

      if (error) {
        console.error('Contact creation error details:', error);
        
        // Enhanced error handling with specific tenant-related messages
        if (error?.code === '23505') {
          return { success: false, error: 'A contact with this email already exists in your organization' };
        }
        
        if (error?.code === '23503') {
          if (error?.message?.includes('account_id')) {
            return { success: false, error: 'Invalid account selected. The account may no longer exist or you may not have access to it.' };
          }
          if (error?.message?.includes('tenant_id')) {
            return { success: false, error: 'Tenant access error. Please contact your administrator.' };
          }
          return { success: false, error: 'Invalid data provided. Please check all fields and try again.' };
        }
        
        // Enhanced tenant-related error messages
        if (error?.message?.includes('tenant') || error?.message?.includes('Tenant')) {
          return { 
            success: false, 
            error: `Access denied: ${error?.message}. Please ensure you have proper permissions for the FOX roofing tenant or contact your administrator.` 
          };
        }
        
        if (error?.message?.includes('Account') && error?.message?.includes('does not belong')) {
          return { 
            success: false, 
            error: 'The selected account does not belong to your organization (FOX roofing). Please select a valid account or create a new one.' 
          };
        }

        // Generic error with better context
        return { 
          success: false, 
          error: `Contact creation failed: ${error?.message || 'Unknown database error'}. If this persists, please contact support.` 
        };
      }

      console.log('Contact created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Service error in createContact:', error);
      
      // Enhanced network and connectivity error handling
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        return { 
          success: false, 
          error: 'Network connection error. Please check your internet connection and try again.' 
        };
      }
      
      if (error?.message?.includes('JWT') || error?.message?.includes('token')) {
        return { 
          success: false, 
          error: 'Authentication expired. Please refresh the page and try again.' 
        };
      }
      
      return { 
        success: false, 
        error: 'Failed to create contact. Please try again or contact support if the problem persists.' 
      };
    }
  },

  // Update an existing contact
  async updateContact(contactId, updates) {
    if (!contactId) return { success: false, error: 'Contact ID is required' };

    try {
      // If setting as primary contact, ensure no other contact is primary for this account
      if (updates?.is_primary_contact) {
        const { data: currentContact } = await supabase?.from('contacts')?.select('account_id')?.eq('id', contactId)?.single();

        if (currentContact?.account_id) {
          await supabase?.from('contacts')?.update({ is_primary_contact: false })?.eq('account_id', currentContact?.account_id)?.eq('is_primary_contact', true);
        }
      }

      const { data, error } = await supabase?.from('contacts')?.update({ 
        ...updates, 
        updated_at: new Date()?.toISOString() 
      })?.eq('id', contactId)?.select(`
          *,
          account:accounts(id, name, company_type)
        `)?.single();

      if (error) {
        console.error('Update contact error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to update contact' };
    }
  },

  // Delete a contact
  async deleteContact(contactId) {
    if (!contactId) return { success: false, error: 'Contact ID is required' };

    try {
      const { error } = await supabase?.from('contacts')?.delete()?.eq('id', contactId);

      if (error) {
        console.error('Delete contact error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to delete contact' };
    }
  },

  // Get contacts by account ID - Fixed method for better error handling
  async getContactsByAccount(accountId) {
    if (!accountId) return { success: false, error: 'Account ID is required' };

    try {
      // First verify the account exists and user has access
      const { data: account, error: accountError } = await supabase?.from('accounts')?.select('id, name')?.eq('id', accountId)?.single();
      
      if (accountError) {
        console.error('Account verification error:', accountError);
        if (accountError?.code === 'PGRST116') {
          return { success: false, error: 'Account not found or access denied' };
        }
        return { success: false, error: 'Failed to verify account access' };
      }

      // Now get contacts for this account
      const { data, error } = await supabase?.from('contacts')?.select('*')?.eq('account_id', accountId)?.order('is_primary_contact', { ascending: false })?.order('last_name');

      if (error) {
        console.error('Get contacts by account error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load account contacts' };
    }
  },

  // Get contact statistics
  async getContactStats() {
    try {
      const { data, error } = await supabase?.from('contacts')?.select('account_id, is_primary_contact');

      if (error) {
        console.error('Contact stats error:', error);
        return { success: false, error: error?.message };
      }

      const stats = {
        total: data?.length || 0,
        primaryContacts: data?.filter(c => c?.is_primary_contact)?.length || 0,
        accountsWithContacts: new Set(data?.map(c => c?.account_id))?.size || 0,
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load contact statistics' };
    }
  },

  // Get available properties for contact linking
  async getAvailableProperties(contactId) {
    if (!contactId) return { success: false, error: 'Contact ID is required' };

    // Validate that contactId is a proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex?.test(contactId)) {
      console.error('Invalid contact ID format:', contactId);
      return { success: false, error: 'Invalid contact ID format. Expected UUID.' };
    }

    try {
      console.log('Calling get_contact_available_properties with contact_uuid:', contactId);
      
      const { data, error } = await supabase
        ?.rpc('get_contact_available_properties', { contact_uuid: contactId });

      if (error) {
        console.error('Get available properties error:', error);
        return { success: false, error: error?.message || 'Failed to load properties' };
      }

      console.log('Properties data from database:', data);

      // Ensure we return an array even if data is null/undefined
      const properties = data || [];
      
      return { success: true, data: properties };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load available properties' };
    }
  },

  // Link contact to property
  async linkToProperty(contactId, propertyId) {
    if (!contactId || !propertyId) {
      return { success: false, error: 'Contact ID and Property ID are required' };
    }

    // Validate that both IDs are proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex?.test(contactId)) {
      console.error('Invalid contact ID format:', contactId);
      return { success: false, error: 'Invalid contact ID format. Expected UUID.' };
    }
    if (!uuidRegex?.test(propertyId)) {
      console.error('Invalid property ID format:', propertyId);
      return { success: false, error: 'Invalid property ID format. Expected UUID.' };
    }

    try {
      const { data, error } = await supabase
        ?.rpc('link_contact_to_property', { 
          contact_uuid: contactId, 
          property_uuid: propertyId 
        });

      if (error) {
        console.error('Link to property error:', error);
        return { success: false, error: error?.message };
      }

      if (!data) {
        return { success: false, error: 'Failed to link contact to property' };
      }

      return { success: true };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to link contact to property' };
    }
  },

  // Unlink contact from property
  async unlinkFromProperty(contactId) {
    if (!contactId) return { success: false, error: 'Contact ID is required' };

    // Validate that contactId is a proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex?.test(contactId)) {
      console.error('Invalid contact ID format:', contactId);
      return { success: false, error: 'Invalid contact ID format. Expected UUID.' };
    }

    try {
      const { data, error } = await supabase
        ?.rpc('unlink_contact_from_property', { contact_uuid: contactId });

      if (error) {
        console.error('Unlink from property error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to unlink contact from property' };
    }
  },

  // Set reminder for contact
  async setReminder(contactId, reminderData) {
    if (!contactId) return { success: false, error: 'Contact ID is required' };

    try {
      // Create an activity with reminder type
      const activityData = {
        activity_type: 'Follow-up',
        contact_id: contactId,
        description: reminderData?.notes || 'Follow-up reminder',
        outcome: 'Scheduled',
        activity_date: reminderData?.date,
        created_at: new Date()?.toISOString()
      };

      const { data, error } = await supabase
        ?.from('activities')
        ?.insert(activityData)
        ?.select()
        ?.single();

      if (error) {
        console.error('Set reminder error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to set reminder' };
    }
  }
};