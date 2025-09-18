import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import EditUserModal from './EditUserModal';
import { MoreHorizontal, Edit2, Trash2, Mail, Key, UserCheck } from 'lucide-react';

// Mock authService for admin functions
const authService = {
  adminForcePasswordReset: async (email) => {
    // This would typically be imported from a service file
    console.log(`Password reset for ${email}`);
    return { success: true };
  },
  sendMagicLink: async (email) => {
    // This would typically be imported from a service file  
    console.log(`Magic link sent to ${email}`);
    return { success: true };
  }
};

// Mock toast for notifications
const toast = {
  success: (message) => console.log('Success:', message),
  error: (message) => console.error('Error:', message)
};

const UsersTable = ({ users = [], onRoleChange, onStatusChange, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  const roles = ['admin', 'manager', 'rep'];

  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchTerm || 
      user?.full_name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      user?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user?.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user?.is_active) ||
      (filterStatus === 'inactive' && !user?.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = async (userId, newRole) => {
    try {
      const result = await onRoleChange?.(userId, newRole);
      if (result?.success) {
        // Success handled by parent component
      }
    } catch (error) {
      console.error('Error changing user role:', error);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const result = await onStatusChange?.(userId, !currentStatus);
      if (result?.success) {
        // Success handled by parent component
      }
    } catch (error) {
      console.error('Error changing user status:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } catch (error) {
      console.error('Error refreshing users:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-accent text-accent-foreground';
      case 'manager': return 'bg-success text-success-foreground';
      case 'rep': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-success text-success-foreground'
      : 'bg-error text-error-foreground';
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleSaveUser = async (updatedUser) => {
    const originalUser = editingUser;
    
    try {
      // Handle role change
      if (updatedUser?.role !== originalUser?.role) {
        const roleResult = await onRoleChange?.(updatedUser?.id, updatedUser?.role);
        if (!roleResult?.success) {
          return { success: false, error: roleResult?.error || 'Failed to update role' };
        }
      }

      // Handle status change
      if (updatedUser?.is_active !== originalUser?.is_active) {
        const statusResult = await onStatusChange?.(updatedUser?.id, updatedUser?.is_active);
        if (!statusResult?.success) {
          return { success: false, error: statusResult?.error || 'Failed to update status' };
        }
      }

      // TODO: If we add more editable fields in the future (like name, phone), 
      // we would handle those updates here through additional service methods

      setShowEditModal(false);
      setEditingUser(null);
      return { success: true };
    } catch (error) {
      console.error('Error saving user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleForcePasswordReset = async (userEmail) => {
    if (!userEmail) return;
    
    const confirmed = window.confirm(
      `Send password reset email to ${userEmail}?\n\nThis will allow the user to create a new password for their account.`
    );
    
    if (!confirmed) return;
    
    setActionMenuOpen(null);
    
    try {
      const result = await authService?.adminForcePasswordReset(userEmail);
      
      if (result?.success) {
        toast?.success(`Password reset email sent to ${userEmail}`);
      } else {
        toast?.error(result?.error || 'Failed to send password reset email');
      }
    } catch (error) {
      console.error('Force password reset error:', error);
      toast?.error('Failed to send password reset email');
    }
  };

  const handleResendConfirmation = async (userEmail) => {
    if (!userEmail) return;
    
    const confirmed = window.confirm(
      `Resend confirmation email to ${userEmail}?`
    );
    
    if (!confirmed) return;
    
    setActionMenuOpen(null);
    
    try {
      const result = await authService?.sendMagicLink(userEmail);
      
      if (result?.success) {
        toast?.success(`Confirmation email sent to ${userEmail}`);
      } else {
        toast?.error(result?.error || 'Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Resend confirmation error:', error);
      toast?.error('Failed to send confirmation email');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!userId) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this user? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    setActionMenuOpen(null);
    
    try {
      // This would typically call a delete service
      console.log(`Delete user ${userId}`);
      toast?.success('User deleted successfully');
      await onRefresh?.();
    } catch (error) {
      console.error('Delete user error:', error);
      toast?.error('Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">User Management</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            iconName="RefreshCw"
            className="text-muted-foreground hover:text-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
            className="w-64"
            iconName="Search"
          />
          <Select
            value={filterRole}
            onChange={(value) => setFilterRole(value)}
            onSearchChange={() => {}}
            error=""
            id="filter-role"
            onOpenChange={() => {}}
            name="filterRole"
            description="Filter users by role"
            ref={null}
            options={[
              { value: 'all', label: 'All Roles' },
              ...roles?.map(role => ({ 
                value: role, 
                label: role?.charAt(0)?.toUpperCase() + role?.slice(1) 
              }))
            ]}
            className="w-32"
          />
          <Select
            value={filterStatus}
            onChange={(value) => setFilterStatus(value)}
            onSearchChange={() => {}}
            error=""
            id="filter-status"
            onOpenChange={() => {}}
            name="filterStatus"
            description="Filter users by status"
            ref={null}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Users Count Display */}
      <div className="flex items-center justify-between bg-muted/20 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Icon name="Users" size={20} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Total Users: <span className="font-medium text-foreground">{users?.length || 0}</span>
          </span>
          {filteredUsers?.length !== users?.length && (
            <span className="text-sm text-muted-foreground">
              | Filtered: <span className="font-medium text-foreground">{filteredUsers?.length || 0}</span>
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date()?.toLocaleTimeString()}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organization</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map(user => (
                <tr key={user?.id} className="border-b border-border hover:bg-accent/5">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-foreground">{user?.full_name}</div>
                      <div className="text-sm text-muted-foreground">{user?.email}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-foreground">{user?.tenant_name || 'No Organization'}</div>
                      {user?.tenant_status && (
                        <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                          user?.tenant_status === 'active' ? 'bg-success/20 text-success' :
                          user?.tenant_status === 'trial' ? 'bg-info/20 text-info' : 
                          user?.tenant_status === 'expired' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
                        }`}>
                          {user?.tenant_status} - {user?.tenant_plan || 'unknown'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                      user?.role === 'super_admin' ? 'bg-purple/20 text-purple border border-purple/30' :
                      user?.role === 'admin' ? 'bg-accent/20 text-accent' :
                      user?.role === 'manager' ? 'bg-success/20 text-success' : 'bg-info/20 text-info'
                    }`}>
                      {user?.role === 'super_admin' ? 'MASTER ADMIN' : user?.role}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user?.is_active)}`}>
                        {user?.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusToggle(user?.id, user?.is_active)}
                        iconName={user?.is_active ? 'UserX' : 'UserCheck'}
                        className={user?.is_active ? 'text-error hover:text-error' : 'text-success hover:text-success'}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(user?.updated_at)?.toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Edit"
                        onClick={() => handleEditUser(user)}
                        className="text-accent hover:text-accent"
                      />
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === user?.id ? null : user?.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {actionMenuOpen === user?.id && (
                          <div className="absolute right-0 z-20 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                            <div className="py-1">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit User
                              </button>
                              
                              {/* New Force Password Reset Option */}
                              <button
                                onClick={() => handleForcePasswordReset(user?.email)}
                                className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                              >
                                <Key className="w-4 h-4 mr-2" />
                                Send Password Reset
                              </button>
                              
                              <button
                                onClick={() => handleResendConfirmation(user?.email)}
                                className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Resend Confirmation
                              </button>
                              
                              <button
                                onClick={() => handleDeleteUser(user?.id)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers?.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Users" size={48} className="text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              {users?.length === 0 
                ? 'No users have been created yet. Create your first user using the System Settings tab.' :'Try adjusting your search filters.'}
            </p>
            {users?.length === 0 && (
              <Button
                onClick={handleRefresh}
                iconName="RefreshCw"
                loading={refreshing}
              >
                Refresh Users
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
};

export default UsersTable;