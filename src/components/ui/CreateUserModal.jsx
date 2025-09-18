import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { adminService } from '../../services/adminService';

const CreateUserModal = ({ isOpen, onClose, onUserCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'rep',
    tenant_id: '',
    is_active: true
  });

  const userRoles = [
    { value: 'rep', label: 'Representative' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Administrator' },
    { value: 'super_admin', label: 'Super Administrator' }
  ];

  // Load tenants for dropdown
  useEffect(() => {
    if (isOpen) {
      loadTenants();
    }
  }, [isOpen]);

  const loadTenants = async () => {
    setLoadingTenants(true);
    try {
      let result = await adminService?.getAllOrganizations();
      if (result?.success) {
        const tenantOptions = result?.data?.map(tenant => ({
          value: tenant?.id,
          label: `${tenant?.name} (${tenant?.status})`
        }));
        setTenants(tenantOptions || []);
      } else {
        console.error('Failed to load tenants:', result?.error);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData?.full_name?.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData?.email?.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData?.role) {
      setError('User role is required');
      return false;
    }
    if (!formData?.tenant_id && formData?.role !== 'super_admin') {
      setError('Tenant assignment is required for non-super-admin users');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      let result;
      
      // Use different service methods based on role
      if (formData?.role === 'super_admin') {
        // For super admin users, don't require tenant_id
        result = await adminService?.createSuperAdminUser({
          ...formData,
          tenant_id: formData?.tenant_id || null // Can be null for super admins
        });
      } else {
        // For regular users, require tenant assignment
        result = await adminService?.createUserWithTenant(formData);
      }
      
      if (result?.success) {
        // Show success message with temporary password if provided
        if (result?.tempPassword) {
          setError('');
          // You could show a success message modal here with the temp password
          console.log('User created with temporary password:', result?.tempPassword);
        }
        
        onUserCreated?.(result?.data);
        handleClose();
      } else {
        setError(result?.error || 'Failed to create user');
      }
    } catch (err) {
      setError('An unexpected error occurred while creating the user');
      console.error('Create user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'rep',
      tenant_id: '',
      is_active: true
    });
    setError('');
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New User"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">User Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Full Name *"
                value={formData?.full_name}
                onChange={(e) => handleInputChange('full_name', e?.target?.value)}
                placeholder="Enter full name"
                disabled={loading}
                required
              />
            </div>

            <Input
              label="Email Address *"
              type="email"
              value={formData?.email}
              onChange={(e) => handleInputChange('email', e?.target?.value)}
              placeholder="user@company.com"
              disabled={loading}
              required
            />

            <Input
              label="Phone Number"
              value={formData?.phone}
              onChange={(e) => handleInputChange('phone', e?.target?.value)}
              placeholder="(555) 123-4567"
              disabled={loading}
            />
          </div>
        </div>

        {/* Role & Tenant Assignment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Access & Permissions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="User Role *"
              value={formData?.role}
              onChange={(value) => handleInputChange('role', value)}
              onSearchChange={() => {}}
              onOpenChange={() => {}}
              options={userRoles}
              disabled={loading}
              id="role"
              name="role"
              error=""
              description="Determines user permissions and access level"
              ref={null}
            />

            <div>
              <Select
                label={formData?.role === 'super_admin' ? 'Tenant Assignment (Optional)' : 'Tenant Assignment *'}
                value={formData?.tenant_id}
                onChange={(value) => handleInputChange('tenant_id', value)}
                onSearchChange={() => {}}
                onOpenChange={() => {}}
                options={tenants}
                disabled={loading || loadingTenants}
                id="tenant_id"
                name="tenant_id"
                error=""
                description={formData?.role === 'super_admin' ? 'Super admins can access all tenants' : 'User will be assigned to this organization'}
                placeholder={loadingTenants ? 'Loading tenants...' : 'Select tenant organization'}
                ref={null}
              />
              {loadingTenants && (
                <p className="text-xs text-muted-foreground mt-1">Loading available tenants...</p>
              )}
            </div>
          </div>

          {/* Role descriptions */}
          <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
            <div className="font-medium mb-2">Role Descriptions:</div>
            <ul className="space-y-1 text-xs">
              <li><strong>Representative:</strong> Basic user with limited access to assigned accounts</li>
              <li><strong>Manager:</strong> Can view team performance and manage representatives</li>
              <li><strong>Administrator:</strong> Full access to tenant data and user management</li>
              <li><strong>Super Administrator:</strong> Cross-tenant access with system-wide control</li>
            </ul>
          </div>
        </div>

        {/* User Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">User Status</h3>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData?.is_active}
              onChange={(e) => handleInputChange('is_active', e?.target?.checked)}
              className="w-4 h-4 text-red-600 bg-background border-border rounded focus:ring-red-500 focus:ring-2"
              disabled={loading}
            />
            <label htmlFor="is_active" className="text-sm font-medium text-foreground">
              Active User
            </label>
            <span className="text-xs text-muted-foreground">
              (User can log in and access the system)
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 text-blue-600 mt-0.5">🔐</div>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Security Notice</h4>
              <p className="text-xs text-blue-600 mt-1">
                A temporary password will be generated for the new user. They will be prompted to change it on first login.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading || loadingTenants}
            iconName="UserPlus"
            iconPosition="left"
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? 'Creating User...' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;