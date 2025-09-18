import { supabase } from '../lib/supabase';

export const usersService = {
  // Enhanced session validation helper
  async _validateSession() {
    try {
      const { data: { session }, error } = await supabase?.auth?.getSession();
      if (error || !session) {
        console.error('Session validation failed:', error);
        return { valid: false, error: 'Authentication session missing. Please log in again.' };
      }
      return { valid: true, session };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, error: 'Failed to validate authentication session.' };
    }
  },

  // Get all active user profiles for dropdowns and filters
  async getActiveUsers() {
    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select('id, full_name, email, role')
        ?.eq('is_active', true)
        ?.order('full_name', { ascending: true });

      if (error) {
        console.error('Get users error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load users' };
    }
  },

  // Get users by role for specific filtering
  async getUsersByRole(role) {
    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select('id, full_name, email, role')
        ?.eq('role', role)
        ?.eq('is_active', true)
        ?.order('full_name', { ascending: true });

      if (error) {
        console.error('Get users by role error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load users by role' };
    }
  },

  // Get a specific user profile
  async getUser(userId) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select('id, full_name, email, role, phone, is_active')
        ?.eq('id', userId)
        ?.single();

      if (error) {
        console.error('Get user error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load user' };
    }
  }
};