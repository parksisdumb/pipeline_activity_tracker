import { supabase } from '../lib/supabase';

export const adminService = {
  // Enhanced session validation helper - prevent session missing errors
  async _validateSession() {
    try {
      const { data: { session }, error } = await supabase?.auth?.getSession();
      if (error) {
        console.error('Session validation error:', error);
        return { valid: false, error: 'Authentication session error. Please log in again.' };
      }
      if (!session) {
        console.error('No active session found');
        return { valid: false, error: 'Authentication session missing. Please log in again.' };
      }
      return { valid: true, session };
    } catch (error) {
      console.error('Session validation exception:', error);
      return { valid: false, error: 'Failed to validate authentication session. Please refresh and try again.' };
    }
  },

  // Get all organizations (accounts) with stats
  async getAllOrganizations() {
    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      // Fixed the duplicate table alias issue by using proper column selection without joins
      const { data, error } = await supabase
        ?.from('tenants')
        ?.select(`
          id,
          name,
          slug,
          status,
          subscription_plan,
          contact_email,
          contact_phone,
          max_users,
          max_accounts,
          max_properties,
          max_storage_mb,
          city,
          state,
          country,
          domain,
          is_active,
          created_at,
          updated_at,
          owner_id,
          created_by,
          description,
          trial_ends_at,
          subscription_starts_at,
          subscription_ends_at
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

  // Add new method to get customer accounts
  async getAllCustomerAccounts() {
    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

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
        console.error('Error fetching customer accounts:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to fetch customer accounts' };
    }
  },

  // Enhanced getAllUsers method with proper session validation
  async getAllUsers() {
    try {
      // Enhanced session validation to prevent AuthSessionMissingError
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      // For admin users, we need to bypass tenant restrictions to see all users
      const { data: currentUser, error: authError } = await supabase?.auth?.getUser();
      
      if (authError) {
        console.error('Authentication error in getAllUsers:', authError);
        return { success: false, error: 'Authentication failed. Please log in again.' };
      }
      
      if (!currentUser?.user) {
        console.error('No authenticated user found');
        return { success: false, error: 'Authentication required. Please log in to access user data.' };
      }

      // Get current user's role and check for super admin status
      const { data: userProfile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('role, tenant_id')
        ?.eq('id', currentUser?.user?.id)
        ?.single();

      if (profileError) {
        console.error('Error getting user profile:', profileError);
        
        // More specific error handling based on error type
        if (profileError?.code === 'PGRST116') {
          return { success: false, error: 'User profile not found. Please complete your profile setup.' };
        } else if (profileError?.code === 'PGRST301') {
          return { success: false, error: 'Access denied. You do not have permission to view user data.' };
        }
        
        return { success: false, error: 'Failed to verify user permissions. Please try again or contact support.' };
      }

      // Enhanced super admin detection with multiple fallbacks
      const isSuperAdmin = currentUser?.user?.user_metadata?.role === 'super_admin' || 
                          currentUser?.user?.user_metadata?.role === 'master_admin' ||
                          currentUser?.user?.app_metadata?.role === 'super_admin' ||
                          currentUser?.user?.app_metadata?.role === 'master_admin' ||
                          userProfile?.role === 'super_admin' ||
                          currentUser?.user?.email === 'team@dillyos.com'; // Special check for super admin account

      let query = supabase?.from('user_profiles');

      // Enhanced query logic for super admin capabilities with better error handling
      if (isSuperAdmin) {
        // Super admin can see all users across all tenants with tenant information
        // Fixed: Remove the problematic accounts join that was causing the schema cache error
        query = query?.select(`
          *,
          tenants!user_profiles_tenant_id_fkey(id, name, slug, status, subscription_plan)
        `);
        console.log('Super admin access: Loading users from all tenants');
      } else if (userProfile?.role === 'admin') {
        // Regular admin can see users in their tenant only
        // Fixed: Remove the problematic accounts join
        query = query?.select(`
          *,
          tenants!user_profiles_tenant_id_fkey(id, name, slug, status, subscription_plan)
        `)?.eq('tenant_id', userProfile?.tenant_id);
        console.log(`Regular admin access: Loading users from tenant ${userProfile?.tenant_id}`);
      } else if (userProfile?.role === 'manager' || userProfile?.role === 'rep') {
        // Non-admin users see only users in their tenant with basic info
        // Fixed: Simplified query without the problematic accounts join
        query = query?.select(`
          id,
          email,
          full_name,
          role,
          is_active,
          phone,
          tenant_id,
          created_at,
          updated_at
        `)?.eq('tenant_id', userProfile?.tenant_id);
        console.log(`Regular user access: Loading users from tenant ${userProfile?.tenant_id}`);
      } else {
        console.error('User does not have sufficient permissions:', userProfile?.role);
        return { success: false, error: 'Access denied. You do not have permission to view user data.' };
      }

      const { data, error } = await query?.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        
        // Enhanced error handling based on error codes
        if (error?.code === 'PGRST116') {
          return { success: false, error: 'No users found. This may be a new organization.' };
        } else if (error?.code === 'PGRST301') {
          return { success: false, error: 'Access denied. Your permissions may have changed. Please refresh and try again.' };
        } else if (error?.code === 'PGRST201') {
          return { success: false, error: 'Database relationship error. Please refresh the page and try again.' };
        } else if (error?.message?.includes('JWT')) {
          return { success: false, error: 'Session expired. Please log in again.' };
        } else if (error?.message?.includes('RLS')) {
          return { success: false, error: 'Database access error. Please check your permissions or contact support.' };
        }
        
        return { success: false, error: `Failed to load users: ${error?.message || 'Unknown database error'}` };
      }

      // Transform data to include tenant information for display
      const transformedData = data?.map(user => ({
        ...user,
        tenant_name: user?.tenants?.name || 'Unknown Organization',
        tenant_status: user?.tenants?.status || 'unknown',
        tenant_plan: user?.tenants?.subscription_plan || 'unknown'
      }));

      console.log(`Admin service: Successfully fetched ${transformedData?.length || 0} users (Super Admin: ${isSuperAdmin})`);
      
      return { success: true, data: transformedData || [] };
    } catch (error) {
      console.error('Admin service error in getAllUsers:', error);
      
      // Enhanced error handling for different error types
      if (error?.name === 'AbortError') {
        return { success: false, error: 'Request timed out. Please check your connection and try again.' };
      } else if (error?.message?.includes('network')) {
        return { success: false, error: 'Network error. Please check your connection and try again.' };
      } else if (error?.message?.includes('fetch')) {
        return { success: false, error: 'Connection error. Please check your internet connection.' };
      }
      
      return { success: false, error: 'Failed to load users. Please refresh the page and try again.' };
    }
  },

  // Get system metrics for admin dashboard
  async getSystemMetrics() {
    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      // Get total counts for main entities - use tenants for organizations count
      const [organizationsResult, accountsResult, usersResult, contactsResult, propertiesResult] = await Promise.all([
        supabase?.from('tenants')?.select('id', { count: 'exact', head: true }),
        supabase?.from('accounts')?.select('id', { count: 'exact', head: true }),
        supabase?.from('user_profiles')?.select('id', { count: 'exact', head: true }),
        supabase?.from('contacts')?.select('id', { count: 'exact', head: true }),
        supabase?.from('properties')?.select('id', { count: 'exact', head: true })
      ]);

      // Get user role breakdown - Include super_admin in processing
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

      // Process role breakdown - Include super_admin in counts
      const roles = { admin: 0, manager: 0, rep: 0, super_admin: 0 };
      roleBreakdown?.forEach(user => {
        if (roles?.hasOwnProperty(user?.role)) {
          roles[user.role]++;
        }
      });

      return {
        success: true,
        data: {
          totalOrganizations: organizationsResult?.count || 0, // Now correctly counts tenants
          totalAccounts: accountsResult?.count || 0, // Add separate accounts count
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

  // Get system-wide contact statistics for admin dashboard
  async getContactStatistics() {
    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data, error } = await supabase?.from('contacts')?.select(`
          id,
          is_primary_contact,
          account_id,
          account:accounts!inner(
            id,
            name,
            tenant_id,
            tenant:tenants!inner(id, name)
          )
        `);

      if (error) {
        console.error('Get contact statistics error:', error);
        return { success: false, error: error?.message };
      }

      // Calculate statistics
      const stats = {
        totalContacts: data?.length || 0,
        primaryContacts: data?.filter(c => c?.is_primary_contact)?.length || 0,
        accountsWithContacts: new Set(data?.map(c => c?.account_id))?.size || 0,
        contactsByTenant: data?.reduce((acc, contact) => {
          const tenantId = contact?.account?.tenant?.id;
          if (tenantId) {
            acc[tenantId] = (acc?.[tenantId] || 0) + 1;
          }
          return acc;
        }, {})
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load contact statistics' };
    }
  },

  // Get all contacts across all tenants (admin only)
  async getAllContacts(filters = {}) {
    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      let query = supabase?.from('contacts')?.select(`
          *,
          account:accounts!inner(
            id,
            name,
            tenant_id,
            tenant:tenants!inner(id, name, status)
          )
        `);

      // Apply filters if provided
      if (filters?.searchQuery) {
        query = query?.or(`first_name.ilike.%${filters?.searchQuery}%,last_name.ilike.%${filters?.searchQuery}%,email.ilike.%${filters?.searchQuery}%`);
      }

      if (filters?.tenantId) {
        query = query?.eq('account.tenant_id', filters?.tenantId);
      }

      if (filters?.stage) {
        query = query?.eq('stage', filters?.stage);
      }

      // Apply sorting
      const sortColumn = filters?.sortBy || 'created_at';
      const sortDirection = filters?.sortDirection === 'asc' ? true : false;
      query = query?.order(sortColumn, { ascending: sortDirection });

      // Apply pagination if provided
      if (filters?.limit) {
        query = query?.limit(filters?.limit);
      }

      if (filters?.offset) {
        query = query?.range(filters?.offset, filters?.offset + (filters?.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Get all contacts error:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Service error:', error);
      return { success: false, error: 'Failed to load contacts' };
    }
  },

  // Enhanced update user with multiple fields support
  async updateUserProfile(userId, updates) {
    if (!userId || !updates) {
      return { success: false, error: 'User ID and updates are required' };
    }

    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      // Filter out fields that don't exist in the database schema
      const allowedFields = [
        'email', 'full_name', 'phone', 'role', 'is_active', 
        'tenant_id', 'created_at', 'updated_at'
      ];
      
      // Create a filtered update object with only valid database columns
      const filteredUpdates = Object.keys(updates)?.filter(key => allowedFields?.includes(key))?.reduce((obj, key) => {
          obj[key] = updates?.[key];
          return obj;
        }, {});

      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.update({ ...filteredUpdates, updated_at: new Date()?.toISOString() })
        ?.eq('id', userId)
        ?.select()
        ?.single();

      if (error) {
        console.error('Error updating user profile:', error);
        return { success: false, error: error?.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to update user profile' };
    }
  },

  // Update user role
  async updateUserRole(userId, newRole) {
    if (!userId || !newRole) {
      return { success: false, error: 'User ID and role are required' };
    }

    // Validate role against enum values - Include super_admin
    const validRoles = ['admin', 'manager', 'rep', 'super_admin'];
    if (!validRoles?.includes(newRole)) {
      return { success: false, error: 'Invalid role specified' };
    }

    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

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

      console.log('User role updated successfully:', { userId, newRole, data });
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
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

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

      console.log('User status updated successfully:', { userId, isActive, data });
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
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

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
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

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
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

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
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

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

  // Create new organization (now creates tenants)
  async createOrganization(organizationData) {
    if (!organizationData?.name) {
      return { success: false, error: 'Organization name is required' };
    }

    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      // Get the current user to set as owner and created_by
      const { data: { user }, error: authError } = await supabase?.auth?.getUser();
      
      if (authError || !user) {
        console.error('Error getting current user:', authError);
        return { success: false, error: 'User authentication required' };
      }

      // Get the user profile ID - Fixed to use correct column reference
      const { data: userProfile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('id')
        ?.eq('id', user?.id)  // ✅ Fixed: Use 'id' instead of 'user_id'
        ?.single();

      if (profileError || !userProfile) {
        console.error('Error getting user profile:', profileError);
        return { success: false, error: 'User profile not found' };
      }

      // Prepare the organization data with required owner_id and created_by
      const tenantData = {
        ...organizationData,
        owner_id: organizationData?.owner_id || userProfile?.id, // Use provided owner_id or current user
        created_by: userProfile?.id // Always set created_by to current user
      };

      const { data, error } = await supabase
        ?.from('tenants')
        ?.insert([tenantData])
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

  // Update organization (now updates tenants)
  async updateOrganization(organizationId, updates) {
    if (!organizationId) {
      return { success: false, error: 'Organization ID is required' };
    }

    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data, error } = await supabase
        ?.from('tenants')
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
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

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
  },

  // Enhanced method to create super admin user
  async createSuperAdminUser(userData) {
    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      console.log('Creating super admin user with data:', { ...userData, password: '[REDACTED]' });
      
      const { data: authData, error: authError } = await supabase?.auth?.signUp({
        email: userData?.email,
        password: userData?.password || 'SuperAdmin2025!',
        options: {
          data: {
            full_name: userData?.full_name,
            role: 'super_admin',
            phone: userData?.phone || null
          }
        }
      });

      if (authError || !authData?.user) {
        console.error('Error creating super admin account:', authError);
        return { success: false, error: authError?.message || 'Failed to create super admin account' };
      }

      console.log('Super admin user created successfully:', authData?.user?.id);

      // Update user profile with super_admin role and no specific tenant restriction
      const { data: profileData, error: updateError } = await supabase
        ?.from('user_profiles')
        ?.update({ 
          role: 'super_admin',
          tenant_id: userData?.tenant_id || null, // Can be null for cross-tenant access
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', authData?.user?.id)
        ?.select()
        ?.single();

      if (updateError) {
        console.error('Error setting super admin role:', updateError);
        return { 
          success: true, 
          data: authData?.user,
          warning: 'Super admin user created but role assignment failed'
        };
      }

      console.log('Super admin role assigned successfully');
      return { 
        success: true, 
        data: {
          ...authData?.user,
          profile: profileData
        }
      };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to create super admin user' };
    }
  },

  // Enhanced createUserWithTenant method with proper temporary password generation and email invitation
  async createUserWithTenant(userData) {
    if (!userData?.email || !userData?.full_name) {
      return { success: false, error: 'Email and full name are required' };
    }

    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      // Generate a secure temporary password
      const tempPassword = this.generateTemporaryPassword();
      
      console.log('Creating user with data:', { ...userData, password: '[REDACTED]' });
      
      const { data: authData, error: authError } = await supabase?.auth?.signUp({
        email: userData?.email,
        password: tempPassword,
        options: {
          data: {
            full_name: userData?.full_name,
            role: userData?.role || 'rep',
            phone: userData?.phone || null,
            tenant_id: userData?.tenant_id || null
          },
          emailRedirectTo: `${window.location?.origin}/password-setup`
        }
      });

      if (authError || !authData?.user) {
        console.error('Error creating user account:', authError);
        return { success: false, error: authError?.message || 'Failed to create user account' };
      }

      console.log('User created successfully:', authData?.user?.id);

      // Update user profile with tenant assignment if provided
      if (userData?.tenant_id) {
        const { error: updateError } = await supabase
          ?.from('user_profiles')
          ?.update({ 
            tenant_id: userData?.tenant_id,
            updated_at: new Date()?.toISOString()
          })
          ?.eq('id', authData?.user?.id);

        if (updateError) {
          console.error('Error assigning user to tenant:', updateError);
          // User is created but tenant assignment failed
          return { 
            success: true, 
            data: authData?.user,
            warning: 'User created but tenant assignment failed',
            tempPassword,
            instructions: 'User will receive an email to set up their password. Make sure they check their spam folder.'
          };
        }
        
        console.log('User assigned to tenant successfully');
      }

      return { 
        success: true, 
        data: authData?.user,
        tempPassword,
        instructions: 'User will receive an email invitation to set up their password. They should check their email (including spam folder) and follow the link to create their password.'
      };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  },

  // Add enhanced user creation function with proper validation
  async createUser(userData) {
    // Check if current user has permission
    const currentUser = await this.getCurrentUser();
    if (!currentUser?.success || !['admin', 'super_admin']?.includes(currentUser?.data?.profile?.role)) {
      return {
        success: false,
        error: 'Insufficient permissions to create users'
      };
    }

    try {
      // Use createUserWithTenant method instead of undefined authService
      const result = await this.createUserWithTenant({
        email: userData?.email,
        full_name: userData?.fullName,
        role: userData?.role || 'rep',
        phone: userData?.phone,
        tenant_id: userData?.organization
      });

      if (result?.success) {
        return {
          success: true,
          data: {
            ...result?.data,
            message: `User created successfully! ${result?.instructions || ''}`
          }
        };
      } else {
        return {
          success: false,
          error: result?.error || 'Failed to create user'
        };
      }
    } catch (error) {
      console.error('Admin create user error:', error);
      return {
        success: false,
        error: 'Failed to create user account'
      };
    }
  },

  // Add missing getCurrentUser method
  async getCurrentUser() {
    try {
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      const { data: { user }, error: authError } = await supabase?.auth?.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'Authentication failed' };
      }

      const { data: profile, error: profileError } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('id', user?.id)
        ?.single();

      if (profileError) {
        return { success: false, error: 'Profile not found' };
      }

      return {
        success: true,
        data: {
          user,
          profile
        }
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, error: 'Failed to get current user' };
    }
  },

  // Generate secure temporary password
  generateTemporaryPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'?.[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'?.[Math.floor(Math.random() * 26)]; // Lowercase  
    password += '0123456789'?.[Math.floor(Math.random() * 10)]; // Number
    password += '!@#$%^&*'?.[Math.floor(Math.random() * 8)]; // Special char
    
    // Fill the rest randomly
    for (let i = password?.length; i < length; i++) {
      password += charset?.[Math.floor(Math.random() * charset?.length)];
    }
    
    // Shuffle the password to avoid predictable patterns
    return password?.split('')?.sort(() => Math.random() - 0.5)?.join('');
  },

  // Send password reset invitation to existing user
  async sendPasswordResetInvitation(userId, userEmail) {
    if (!userId || !userEmail) {
      return { success: false, error: 'User ID and email are required' };
    }

    try {
      // Validate session before making API calls
      const sessionCheck = await this._validateSession();
      if (!sessionCheck?.valid) {
        return { success: false, error: sessionCheck?.error };
      }

      // Send password reset email
      const { error } = await supabase?.auth?.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location?.origin}/password-reset-confirmation`
      });

      if (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error?.message || 'Failed to send password reset email' };
      }

      return { 
        success: true, 
        message: `Password reset email sent to ${userEmail}. The user will receive instructions to create a new password.`
      };
    } catch (error) {
      console.error('Admin service error:', error);
      return { success: false, error: 'Failed to send password reset invitation' };
    }
  }
};