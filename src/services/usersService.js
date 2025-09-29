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

  // Get all users - alias for getActiveUsers for backward compatibility
  async getUsers() {
    return this.getActiveUsers();
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
  },

  // Create new user (Super Admin function)
  async createUser(userData) {
    try {
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data: result, error } = await supabase?.rpc(
        'create_admin_user_with_workflow',
        {
          user_email: userData?.email,
          user_full_name: userData?.fullName,
          user_role: userData?.role || 'rep',
          user_organization: userData?.organization || null,
          user_tenant_id: userData?.tenantId || null,
          temporary_password: userData?.tempPassword || null,
          send_confirmation_email: userData?.sendEmail !== false
        }
      );

      if (error) {
        return { success: false, error: error?.message };
      }

      const userResult = result?.[0];
      return {
        success: userResult?.success || false,
        data: userResult,
        error: userResult?.success ? null : userResult?.message
      };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  },

  // Resend confirmation email
  async resendConfirmation(userId) {
    try {
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data: result, error } = await supabase?.rpc(
        'resend_confirmation_workflow',
        { user_uuid: userId }
      );

      if (error) {
        return { success: false, error: error?.message };
      }

      const resendResult = result?.[0];
      return {
        success: resendResult?.success || false,
        data: resendResult,
        error: resendResult?.success ? null : resendResult?.message
      };
    } catch (error) {
      console.error('Resend confirmation error:', error);
      return { success: false, error: 'Failed to resend confirmation email' };
    }
  },

  // Reset user password
  async resetUserPassword(userId) {
    try {
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data: result, error } = await supabase?.rpc(
        'admin_force_password_reset',
        { target_user_id: userId }
      );

      if (error) {
        return { success: false, error: error?.message };
      }

      const resetResult = result?.[0];
      return {
        success: resetResult?.success || false,
        data: resetResult,
        error: resetResult?.success ? null : resetResult?.message
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }
};