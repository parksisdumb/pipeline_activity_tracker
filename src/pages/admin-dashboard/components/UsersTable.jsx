import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';

const UsersTable = ({ users = [], onRoleChange, onStatusChange, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

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

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">User Management</h2>
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
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Assigned Organizations</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Last Active</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers?.map(user => {
                const assignedOrgs = user?.accounts || [];
                return (
                  <tr key={user?.id} className="border-b border-border hover:bg-muted/20">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                          <Icon name="User" size={20} className="text-accent" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user?.role)}`}>
                          {user?.role?.charAt(0)?.toUpperCase() + user?.role?.slice(1)}
                        </span>
                        <Select
                          value={user?.role || ''}
                          onChange={(newRole) => handleRoleChange(user?.id, newRole)}
                          onSearchChange={() => {}}
                          error=""
                          id={`role-${user?.id}`}
                          onOpenChange={() => {}}
                          name={`userRole-${user?.id}`}
                          description="Change user role"
                          options={roles?.map(role => ({ 
                            value: role, 
                            label: role?.charAt(0)?.toUpperCase() + role?.slice(1) 
                          }))}
                          size="sm"
                          className="w-24"
                        />
                      </div>
                    </td>
                    <td className="p-4">
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
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {assignedOrgs?.length > 0 ? (
                          assignedOrgs?.slice(0, 2)?.map(org => (
                            <span key={org?.id} className="px-2 py-1 text-xs bg-info/10 text-info rounded">
                              {org?.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No assignments</span>
                        )}
                        {assignedOrgs?.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                            +{assignedOrgs?.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(user?.updated_at)?.toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="Edit"
                          onClick={() => {
                            // Could open user edit modal
                            console.log('Edit user:', user?.id);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="MoreHorizontal"
                          onClick={() => {
                            // Could open context menu
                            console.log('More actions for user:', user?.id);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers?.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Users" size={48} className="text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground">Try adjusting your search filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersTable;