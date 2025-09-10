import { supabase } from '../lib/supabase';

export const contactsService = {
  // Get all contacts with account information
  async getContacts(filters = {}) {
    try {
      let query = supabase?.from('contacts')?.select(`
          *,
          account:accounts(id, name, company_type, assigned_rep_id)
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
      // Ensure required fields are present
      const requiredFields = ['first_name', 'last_name'];
      for (const field of requiredFields) {
        if (!contactData?.[field]) {
          return { success: false, error: `${field} is required` };
        }
      }

      // If this is set as primary contact, ensure no other contact is primary for this account
      if (contactData?.is_primary_contact && contactData?.account_id) {
        await supabase?.from('contacts')?.update({ is_primary_contact: false })?.eq('account_id', contactData?.account_id)?.eq('is_primary_contact', true);
      }

      const { data, error } = await supabase?.from('contacts')?.insert(contactData)?.select(`
          *,
          account:accounts(id, name, company_type)
        `)?.single();

      if (error) {
        console.error('Create contact error:', error);
        
        // Handle specific constraint violations
        if (error?.code === '23505') {
          return { success: false, error: 'A contact with this email already exists' };
        }
        
        if (error?.code === '23503') {
          return { success: false, error: 'Invalid account selected' };
        }

        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to create contact' };
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

  // Get contacts by account ID
  async getContactsByAccount(accountId) {
    if (!accountId) return { success: false, error: 'Account ID is required' };

    try {
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
};