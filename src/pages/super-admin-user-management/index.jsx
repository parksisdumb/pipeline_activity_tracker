import React, { useState, useEffect } from 'react';
import { User, Plus, Search, MoreVertical, RefreshCw, UserCheck, UserX, Shield, AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';

const SuperAdminUserManagement = () => {
  const { user: currentUser, userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Modals
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserActions, setShowUserActions] = useState(false);
  
  // Create user form
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    organization: '',
    role: 'rep',
    tempPassword: '',
    sendEmail: true
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Bulk actions
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'pending', label: 'Pending Setup' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' }
  ];

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'rep', label: 'Sales Representative' },
    { value: 'manager', label: 'Sales Manager' },
    { value: 'admin', label: 'Administrator' }
  ];

  useEffect(() => {
    loadUsers();
    loadTenants();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select(`
          id, full_name, email, role, is_active, 
          password_set, profile_completed, created_at,
          organization, phone, tenant_id,
          tenants (name, slug)
        `)
        ?.order('created_at', { ascending: false });

      if (error) {
        setError(`Failed to load users: ${error?.message}`);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        ?.from('tenants')
        ?.select('id, name, slug, is_active')
        ?.eq('is_active', true)
        ?.order('name', { ascending: true });

      if (error) {
        console.warn('Could not load tenants:', error);
        return;
      }

      setTenants(data || []);
    } catch (error) {
      console.warn('Error loading tenants:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e?.preventDefault();
    if (!newUser?.fullName?.trim() || !newUser?.email?.trim()) {
      setError('Full name and email are required');
      return;
    }

    setCreatingUser(true);
    setError('');
    setSuccess('');

    try {
      // Find tenant by organization name
      let tenantId = null;
      if (newUser?.organization) {
        const tenant = tenants?.find(t => 
          t?.name?.toLowerCase()?.includes(newUser?.organization?.toLowerCase()) ||
          t?.slug?.toLowerCase()?.includes(newUser?.organization?.toLowerCase())
        );
        tenantId = tenant?.id || null;
      }

      // Create user with admin workflow
      const { data: result, error: createError } = await supabase?.rpc(
        'create_admin_user_with_workflow',
        {
          user_email: newUser?.email,
          user_full_name: newUser?.fullName,
          user_role: newUser?.role,
          user_organization: newUser?.organization || null,
          user_tenant_id: tenantId,
          temporary_password: newUser?.tempPassword || null,
          send_confirmation_email: newUser?.sendEmail
        }
      );

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      const userResult = result?.[0];
      if (userResult?.success) {
        setSuccess(`User ${newUser?.email} created successfully! ${newUser?.sendEmail ? 'Confirmation email sent.' : 'Manual setup required.'}`);
        setNewUser({
          fullName: '',
          email: '',
          organization: '',
          role: 'rep',
          tempPassword: '',
          sendEmail: true
        });
        setShowCreateUser(false);
        loadUsers(); // Reload users list
      } else {
        setError(userResult?.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      setError(error?.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResendConfirmation = async (userId, userEmail) => {
    try {
      const { data: result, error } = await supabase?.rpc(
        'resend_confirmation_workflow',
        { user_uuid: userId }
      );

      if (error) {
        setError(`Failed to resend confirmation: ${error?.message}`);
        return;
      }

      const resendResult = result?.[0];
      if (resendResult?.success) {
        setSuccess(`Confirmation email resent to ${userEmail}`);
      } else {
        setError(resendResult?.message || 'Failed to resend confirmation');
      }
    } catch (error) {
      setError('Failed to resend confirmation email');
    }
  };

  const handlePasswordReset = async (userId, userEmail) => {
    try {
      const { data: result, error } = await supabase?.rpc(
        'admin_force_password_reset',
        { target_user_id: userId }
      );

      if (error) {
        setError(`Failed to reset password: ${error?.message}`);
        return;
      }

      const resetResult = result?.[0];
      if (resetResult?.success) {
        setSuccess(`Password reset email sent to ${userEmail}`);
      } else {
        setError(resetResult?.message || 'Failed to reset password');
      }
    } catch (error) {
      setError('Failed to reset password');
    }
  };

  const getUserStatus = (user) => {
    if (!user?.is_active) return 'suspended';
    if (!user?.password_set || !user?.profile_completed) return 'pending';
    return 'active';
  };

  const getUserStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending Setup
        </span>;
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </span>;
      case 'suspended':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <UserX className="w-3 h-3 mr-1" />
          Suspended
        </span>;
      default:
        return null;
    }
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchTerm || 
      user?.full_name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      user?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      user?.organization?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    
    const userStatus = getUserStatus(user);
    const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;
    const matchesRole = roleFilter === 'all' || user?.role === roleFilter;
    const matchesOrg = organizationFilter === 'all' || user?.organization === organizationFilter;
    
    return matchesSearch && matchesStatus && matchesRole && matchesOrg;
  });

  const organizationOptions = [
    { value: 'all', label: 'All Organizations' },
    ...Array.from(new Set(users.map(u => u.organization).filter(Boolean)))?.map(org => ({ value: org, label: org }))
  ];

  const tenantOptions = [
    { value: '', label: 'No Organization' },
    ...tenants?.map(tenant => ({ value: tenant?.name, label: tenant?.name }))
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Create and manage users across all organizations</p>
            </div>
            <Button 
              onClick={() => setShowCreateUser(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target?.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={statusOptions}
              id="status-filter"
              name="statusFilter"
              onSearchChange={() => {}}
              error=""
              onOpenChange={() => {}}
              label="Status"
              description=""
              ref={null}
            />
            <Select
              value={roleFilter}
              onChange={(value) => setRoleFilter(value)}
              options={roleOptions}
              id="role-filter"
              name="roleFilter"
              onSearchChange={() => {}}
              error=""
              onOpenChange={() => {}}
              label="Role"
              description=""
              ref={null}
            />
            <Select
              value={organizationFilter}
              onChange={(value) => setOrganizationFilter(value)}
              options={organizationOptions}
              id="organization-filter"
              name="organizationFilter"
              onSearchChange={() => {}}
              error=""
              onOpenChange={() => {}}
              label="Organization"
              description=""
              ref={null}
            />
            <Button 
              variant="outline" 
              onClick={loadUsers}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No users found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers?.map((user) => (
                    <tr key={user?.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user?.full_name || 'No name set'}
                            </div>
                            <div className="text-sm text-gray-500">{user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user?.organization || user?.tenants?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          <Shield className="w-3 h-3 mr-1" />
                          {user?.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getUserStatusBadge(getUserStatus(user))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at)?.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {getUserStatus(user) === 'pending' && (
                            <button
                              onClick={() => handleResendConfirmation(user?.id, user?.email)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="Resend confirmation email"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handlePasswordReset(user?.id, user?.email)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded"
                            title="Reset password"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserActions(true);
                            }}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Confirmations Summary */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pending User Confirmations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Pending Setup</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {users?.filter(u => getUserStatus(u) === 'pending')?.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <UserCheck className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">Active Users</p>
                  <p className="text-2xl font-bold text-green-900">
                    {users?.filter(u => getUserStatus(u) === 'active')?.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <User className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900">{users?.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Create User Modal */}
      <Modal
        isOpen={showCreateUser}
        onClose={() => !creatingUser && setShowCreateUser(false)}
        title="Create New User"
        size="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                id="fullName"
                value={newUser?.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e?.target?.value })}
                placeholder="Enter full name"
                disabled={creatingUser}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                value={newUser?.email}
                onChange={(e) => setNewUser({ ...newUser, email: e?.target?.value })}
                placeholder="Enter email address"
                disabled={creatingUser}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              <Select
                value={newUser?.organization}
                onChange={(value) => setNewUser({ ...newUser, organization: value })}
                options={tenantOptions}
                disabled={creatingUser}
                id="organization"
                name="organization"
                onSearchChange={() => {}}
                error=""
                onOpenChange={() => {}}
                label="Organization"
                description=""
                ref={null}
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <Select
                value={newUser?.role}
                onChange={(value) => setNewUser({ ...newUser, role: value })}
                options={roleOptions?.filter(r => r?.value !== 'all')}
                disabled={creatingUser}
                id="role"
                name="role"
                onSearchChange={() => {}}
                error=""
                onOpenChange={() => {}}
                label="Role"
                description=""
                ref={null}
              />
            </div>
          </div>

          <div>
            <label htmlFor="tempPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Temporary Password <span className="text-gray-500">(Optional)</span>
            </label>
            <Input
              id="tempPassword"
              type="password"
              value={newUser?.tempPassword}
              onChange={(e) => setNewUser({ ...newUser, tempPassword: e?.target?.value })}
              placeholder="Leave blank for email-based setup"
              disabled={creatingUser}
            />
            <p className="text-xs text-gray-500 mt-1">
              If provided, user can log in immediately. Otherwise, they'll receive a setup email.
            </p>
          </div>

          <div className="flex items-center">
            <input
              id="sendEmail"
              type="checkbox"
              checked={newUser?.sendEmail}
              onChange={(e) => setNewUser({ ...newUser, sendEmail: e?.target?.checked })}
              disabled={creatingUser}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sendEmail" className="ml-2 text-sm text-gray-700">
              Send confirmation email to user
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateUser(false)}
              disabled={creatingUser}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creatingUser}
              loading={creatingUser}
            >
              {creatingUser ? 'Creating User...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminUserManagement;