import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';

const EditUserModal = ({ user, isOpen, onClose, onSave }) => {
  const [editingUser, setEditingUser] = useState({ ...user });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = ['admin', 'manager', 'rep'];

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await onSave?.(editingUser);
      if (result?.success) {
        onClose?.();
      } else {
        setError(result?.error || 'Failed to save user changes');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingUser({ ...user });
    setError('');
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit User">
      <div className="space-y-6">
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={20} className="text-error" />
              <span className="text-error font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* User Identity Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">User Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={editingUser?.full_name || ''}
              onChange={(e) => setEditingUser(prev => ({ ...prev, full_name: e?.target?.value }))}
              placeholder="Enter full name"
              required
            />

            <Input
              label="Email"
              type="email"
              value={editingUser?.email || ''}
              onChange={(e) => setEditingUser(prev => ({ ...prev, email: e?.target?.value }))}
              placeholder="Enter email address"
              required
              disabled // Email should not be editable as it's used for auth
              className="bg-muted/50 cursor-not-allowed"
            />
          </div>

          <Input
            label="Phone"
            value={editingUser?.phone || ''}
            onChange={(e) => setEditingUser(prev => ({ ...prev, phone: e?.target?.value }))}
            placeholder="Enter phone number (optional)"
          />
        </div>

        {/* Role and Status Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Access & Permissions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Role
              </label>
              <Select
                value={editingUser?.role || ''}
                onChange={(newRole) => setEditingUser(prev => ({ ...prev, role: newRole }))}
                onSearchChange={() => {}}
                error=""
                id="edit-user-role"
                onOpenChange={() => {}}
                name="editUserRole"
                description="Select user role"
                ref={null}
                options={roles?.map(role => ({ 
                  value: role, 
                  label: role?.charAt(0)?.toUpperCase() + role?.slice(1) 
                }))}
                placeholder="Select role"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <Select
                value={editingUser?.is_active ? 'active' : 'inactive'}
                onChange={(status) => setEditingUser(prev => ({ ...prev, is_active: status === 'active' }))}
                onSearchChange={() => {}}
                error=""
                id="edit-user-status"
                onOpenChange={() => {}}
                name="editUserStatus"
                description="Select user status"
                ref={null}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
                placeholder="Select status"
              />
            </div>
          </div>
        </div>

        {/* Tenant Information (Read-only) */}
        {editingUser?.tenant_id && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Tenant Assignment</h3>
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="Building2" size={16} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Tenant ID: {editingUser?.tenant_id?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            iconName="Save"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditUserModal;