import { supabase } from '../lib/supabase';

export const adminService = {
  // Get all organizations (accounts) with stats
  async getAllOrganizations() {
    try {
      const { data, error } = await supabase
        ?.from('accounts')
        ?.select(`
          *,
          user_profiles!assigned_rep_id(id, full_name, email, role),
          contacts(count),
          properties(count),
          activities(count)
        `)
        ?.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organizations:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to fetch organizations' };
    }
  },

  // Get all users with their roles and organization assignments
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select(`
          *,
          accounts!assigned_rep_id(id, name, company_type, stage)
        `)
        ?.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to fetch users' };
    }
  },

  // Get system metrics for admin dashboard
  async getSystemMetrics() {
    try {
      // Get total counts for main entities
      const [organizationsResult, usersResult, contactsResult, propertiesResult] = await Promise.all([
        supabase?.from('accounts')?.select('id', { count: 'exact', head: true }),
        supabase?.from('user_profiles')?.select('id', { count: 'exact', head: true }),
        supabase?.from('contacts')?.select('id', { count: 'exact', head: true }),
        supabase?.from('properties')?.select('id', { count: 'exact', head: true })
      ]);

      // Get user role breakdown
      const { data: roleBreakdown, error: roleError } = await supabase
        ?.from('user_profiles')
        ?.select('role');

      if (roleError) {
        console.error('Error fetching role breakdown:', roleError);
      }

      // Get recent activity count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo?.setDate(sevenDaysAgo?.getDate() - 7);
      
      const { data: recentActivity, error: activityError } = await supabase
        ?.from('activities')
        ?.select('id', { count: 'exact', head: true })
        ?.gte('created_at', sevenDaysAgo?.toISOString());

      if (activityError) {
        console.error('Error fetching recent activity:', activityError);
      }

      // Process role breakdown
      const roles = { admin: 0, manager: 0, rep: 0 };
      roleBreakdown?.forEach(user => {
        if (roles?.hasOwnProperty(user?.role)) {
          roles[user.role]++;
        }
      });

      return {
        success: true,
        data: {
          totalOrganizations: organizationsResult?.count || 0,
          totalUsers: usersResult?.count || 0,
          totalContacts: contactsResult?.count || 0,
          totalProperties: propertiesResult?.count || 0,
          recentActivity: recentActivity?.count || 0,
          userRoleBreakdown: roles
        }
      };
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      return { success: false, error: 'Failed to fetch system metrics' };
    }
  },

  // Update user role
  async updateUserRole(userId, newRole) {
    if (!userId || !newRole) {
      return { success: false, error: 'User ID and role are required' };
    }

    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.update({ role: newRole, updated_at: new Date()?.toISOString() })
        ?.eq('id', userId)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error updating user role:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to update user role' };
    }
  },

  // Update user active status
  async updateUserStatus(userId, isActive) {
    if (!userId || typeof isActive !== 'boolean') {
      return { success: false, error: 'User ID and status are required' };
    }

    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.update({ is_active: isActive, updated_at: new Date()?.toISOString() })
        ?.eq('id', userId)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error updating user status:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to update user status' };
    }
  },

  // Assign user to organization
  async assignUserToOrganization(userId, organizationId) {
    if (!userId || !organizationId) {
      return { success: false, error: 'User ID and organization ID are required' };
    }

    try {
      // Update the organization's assigned rep
      const { data, error } = await supabase
        ?.from('accounts')
        ?.update({ assigned_rep_id: userId, updated_at: new Date()?.toISOString() })
        ?.eq('id', organizationId)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error assigning user to organization:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to assign user to organization' };
    }
  },

  // Remove user from organization
  async removeUserFromOrganization(organizationId) {
    if (!organizationId) {
      return { success: false, error: 'Organization ID is required' };
    }

    try {
      const { data, error } = await supabase
        ?.from('accounts')
        ?.update({ assigned_rep_id: null, updated_at: new Date()?.toISOString() })
        ?.eq('id', organizationId)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error removing user from organization:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to remove user from organization' };
    }
  },

  // Get pending registrations (users created but not active)
  async getPendingRegistrations() {
    try {
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('is_active', false)
        ?.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending registrations:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to fetch pending registrations' };
    }
  },

  // Approve user registration
  async approveUserRegistration(userId) {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    return this.updateUserStatus(userId, true);
  },

  // Reject user registration
  async rejectUserRegistration(userId) {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    try {
      const { error } = await supabase
        ?.from('user_profiles')
        ?.delete()
        ?.eq('id', userId);

      if (error) {
        console.error('Error rejecting user registration:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, message: 'User registration rejected successfully' };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to reject user registration' };
    }
  },

  // Create new organization
  async createOrganization(organizationData) {
    if (!organizationData?.name) {
      return { success: false, error: 'Organization name is required' };
    }

    try {
      const { data, error } = await supabase
        ?.from('accounts')
        ?.insert([organizationData])
        ?.select()
        ?.single();

      if (error) {
        console.error('Error creating organization:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to create organization' };
    }
  },

  // Update organization
  async updateOrganization(organizationId, updates) {
    if (!organizationId) {
      return { success: false, error: 'Organization ID is required' };
    }

    try {
      const { data, error } = await supabase
        ?.from('accounts')
        ?.update({ ...updates, updated_at: new Date()?.toISOString() })
        ?.eq('id', organizationId)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error updating organization:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to update organization' };
    }
  },

  // Delete organization (admin only)
  async deleteOrganization(organizationId) {
    if (!organizationId) {
      return { success: false, error: 'Organization ID is required' };
    }

    try {
      const { error } = await supabase
        ?.from('accounts')
        ?.delete()
        ?.eq('id', organizationId);

      if (error) {
        console.error('Error deleting organization:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, message: 'Organization deleted successfully' };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to delete organization' };
    }
  }
};