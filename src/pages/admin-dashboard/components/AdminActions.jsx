import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';

import { adminService } from '../../../services/adminService';

const AdminActions = ({ onRefresh }) => {
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableOrganizations, setAvailableOrganizations] = useState([]);
  
  // Create Organization Form State - Fixed to match tenants table schema
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    state: '',
    country: 'US',
    address_line_1: '',
    address_line_2: '',
    postal_code: '',
    subscription_plan: 'free',
    status: 'trial',
    max_users: 5,
    max_accounts: 100,
    max_properties: 500,
    max_storage_mb: 1000,
    owner_id: '' // Add owner_id field
  });

  // Create User Form State - Updated to include tenant organization
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'rep',
    phone: '',
    tenant_id: '' // Add tenant organization selection
  });

  // Load available users when component mounts or when create org modal opens
  useEffect(() => {
    if (isCreateOrgModalOpen) {
      loadAvailableUsers();
    }
  }, [isCreateOrgModalOpen]);

  // Load available organizations when create user modal opens
  useEffect(() => {
    if (isCreateUserModalOpen) {
      loadAvailableOrganizations();
    }
  }, [isCreateUserModalOpen]);

  const loadAvailableUsers = async () => {
    try {
      const result = await adminService?.getAllUsers();
      if (result?.success) {
        const userOptions = result?.data?.map(user => ({
          value: user?.id,
          label: `${user?.full_name} (${user?.email}) - ${user?.role}`
        })) || [];
        setAvailableUsers(userOptions);
        
        // Set current user as default owner if no owner is selected
        const currentUser = result?.data?.find(user => user?.role === 'admin');
        if (currentUser && !newOrg?.owner_id) {
          setNewOrg(prev => ({ ...prev, owner_id: currentUser?.id }));
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAvailableOrganizations = async () => {
    try {
      const result = await adminService?.getAllOrganizations();
      if (result?.success) {
        const orgOptions = result?.data?.map(org => ({
          value: org?.id,
          label: `${org?.name} (${org?.status?.toUpperCase()})`
        })) || [];
        setAvailableOrganizations(orgOptions);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const companyTypes = [
    'Property Management', 'General Contractor', 'Developer', 
    'REIT/Institutional Investor', 'Asset Manager', 'Building Owner',
    'Facility Manager', 'Roofing Contractor', 'Insurance'
  ];

  const userRoles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'rep', label: 'Representative' }
  ];

  const subscriptionPlans = [
    { value: 'free', label: 'Free' },
    { value: 'basic', label: 'Basic' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'custom', label: 'Custom' }
  ];

  const tenantStatuses = [
    { value: 'trial', label: 'Trial' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'expired', label: 'Expired' }
  ];

  const handleCreateOrganization = async () => {
    if (!newOrg?.name?.trim()) {
      alert('Organization name is required');
      return;
    }

    if (!newOrg?.owner_id?.trim()) {
      alert('Organization owner is required');
      return;
    }

    // Generate slug from name if not provided
    if (!newOrg?.slug?.trim()) {
      const generatedSlug = newOrg?.name
        ?.toLowerCase()
        ?.replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        ?.replace(/\s+/g, '-') // Replace spaces with hyphens
        ?.replace(/-+/g, '-') // Replace multiple hyphens with single
        ?.trim();
      
      newOrg.slug = generatedSlug;
    }

    setLoading(true);
    try {
      const result = await adminService?.createOrganization(newOrg);
      if (result?.success) {
        setIsCreateOrgModalOpen(false);
        setNewOrg({
          name: '',
          slug: '',
          description: '',
          contact_email: '',
          contact_phone: '',
          city: '',
          state: '',
          country: 'US',
          address_line_1: '',
          address_line_2: '',
          postal_code: '',
          subscription_plan: 'free',
          status: 'trial',
          max_users: 5,
          max_accounts: 100,
          max_properties: 500,
          max_storage_mb: 1000,
          owner_id: ''
        });
        await onRefresh?.();
        alert('Organization created successfully!');
      } else {
        alert(result?.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      alert(`Error creating organization: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser?.email?.trim() || !newUser?.full_name?.trim()) {
      alert('Email and full name are required');
      return;
    }

    setLoading(true);
    try {
      // Use the new createUserWithTenant method that handles organization assignment
      const result = await adminService?.createUserWithTenant(newUser);

      if (result?.success) {
        setIsCreateUserModalOpen(false);
        setNewUser({
          email: '',
          full_name: '',
          role: 'rep',
          phone: '',
          tenant_id: ''
        });
        
        // Show success message with temporary password and any warnings
        const message = result?.warning 
          ? `${result?.warning}\nTemporary password: ${result?.tempPassword}`
          : `User created successfully! Temporary password: ${result?.tempPassword}`;
        alert(message);
        
        // Force refresh the dashboard data
        console.log('User created, refreshing dashboard data...');
        await onRefresh?.();
        
        // Additional delay to ensure data propagation
        setTimeout(async () => {
          await onRefresh?.();
          console.log('Dashboard data refreshed after user creation');
        }, 1000);
      } else {
        alert(result?.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const systemActions = [
    {
      title: 'Create New Organization',
      description: 'Add a new organization to the system',
      icon: 'Building2',
      color: 'accent',
      action: () => setIsCreateOrgModalOpen(true)
    },
    {
      title: 'Create New User',
      description: 'Add a new user account to the system',
      icon: 'UserPlus',
      color: 'success',
      action: () => setIsCreateUserModalOpen(true)
    },
    {
      title: 'Export Data',
      description: 'Export system data for backup or analysis',
      icon: 'Download',
      color: 'info',
      action: () => {
        // Could implement data export functionality
        alert('Data export functionality would be implemented here');
      }
    },
    {
      title: 'System Analytics',
      description: 'View detailed system usage analytics',
      icon: 'BarChart3',
      color: 'warning',
      action: () => {
        // Could open analytics modal or navigate to analytics page
        alert('System analytics would be implemented here');
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">System Settings & Actions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Administrative tools and system configuration options.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {systemActions?.map((action, index) => (
          <div key={index} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                action?.color === 'accent' ? 'bg-accent/10 text-accent' :
                action?.color === 'success' ? 'bg-success/10 text-success' :
                action?.color === 'info' ? 'bg-info/10 text-info' :
                action?.color === 'warning'? 'bg-warning/10 text-warning' : 'bg-muted/10 text-muted-foreground'
              }`}>
                <Icon name={action?.icon} size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">{action?.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{action?.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={action?.action}
                  iconName={action?.icon}
                >
                  {action?.title}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Information */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Application Version:</span>
              <span className="font-medium text-foreground">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database Status:</span>
              <span className="font-medium text-success">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Backup:</span>
              <span className="font-medium text-foreground">2025-01-09</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storage Usage:</span>
              <span className="font-medium text-foreground">45% (2.1 GB)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Sessions:</span>
              <span className="font-medium text-foreground">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">System Health:</span>
              <span className="font-medium text-success">Healthy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create Organization Modal - Updated with owner selection */}
      <Modal
        isOpen={isCreateOrgModalOpen}
        onClose={() => setIsCreateOrgModalOpen(false)}
        title="Create New Organization"
      >
        <div className="space-y-4">
          <Input
            label="Organization Name *"
            value={newOrg?.name}
            onChange={(e) => setNewOrg({ ...newOrg, name: e?.target?.value })}
            placeholder="Enter organization name"
            required
          />
          
          <Select
            label="Organization Owner *"
            value={newOrg?.owner_id}
            onChange={(value) => setNewOrg({ ...newOrg, owner_id: value })}
            options={availableUsers}
            placeholder="Select organization owner"
            required
          />
          
          <Input
            label="Slug"
            value={newOrg?.slug}
            onChange={(e) => setNewOrg({ ...newOrg, slug: e?.target?.value?.toLowerCase()?.replace(/[^a-z0-9-]/g, '') })}
            placeholder="Auto-generated from name (e.g. acme-corp)"
            helperText="Used for URLs and identification. Will be auto-generated if left empty."
          />
          
          <Input
            label="Description"
            value={newOrg?.description}
            onChange={(e) => setNewOrg({ ...newOrg, description: e?.target?.value })}
            placeholder="Brief description of the organization"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              value={newOrg?.contact_email}
              onChange={(e) => setNewOrg({ ...newOrg, contact_email: e?.target?.value })}
              placeholder="Enter contact email"
            />
            
            <Input
              label="Contact Phone"
              value={newOrg?.contact_phone}
              onChange={(e) => setNewOrg({ ...newOrg, contact_phone: e?.target?.value })}
              placeholder="Enter contact phone"
            />
          </div>
          
          <Input
            label="Address Line 1"
            value={newOrg?.address_line_1}
            onChange={(e) => setNewOrg({ ...newOrg, address_line_1: e?.target?.value })}
            placeholder="Enter street address"
          />
          
          <Input
            label="Address Line 2"
            value={newOrg?.address_line_2}
            onChange={(e) => setNewOrg({ ...newOrg, address_line_2: e?.target?.value })}
            placeholder="Apartment, suite, etc. (optional)"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="City"
              value={newOrg?.city}
              onChange={(e) => setNewOrg({ ...newOrg, city: e?.target?.value })}
              placeholder="City"
            />
            
            <Input
              label="State"
              value={newOrg?.state}
              onChange={(e) => setNewOrg({ ...newOrg, state: e?.target?.value })}
              placeholder="State"
            />
            
            <Input
              label="ZIP/Postal Code"
              value={newOrg?.postal_code}
              onChange={(e) => setNewOrg({ ...newOrg, postal_code: e?.target?.value })}
              placeholder="ZIP"
            />
            
            <Select
              label="Country"
              value={newOrg?.country}
              onChange={(value) => setNewOrg({ ...newOrg, country: value })}
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'MX', label: 'Mexico' }
              ]}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Subscription Plan"
              value={newOrg?.subscription_plan}
              onChange={(value) => setNewOrg({ ...newOrg, subscription_plan: value })}
              options={subscriptionPlans}
            />
            
            <Select
              label="Status"
              value={newOrg?.status}
              onChange={(value) => setNewOrg({ ...newOrg, status: value })}
              options={tenantStatuses}
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Max Users"
              type="number"
              value={newOrg?.max_users}
              onChange={(e) => setNewOrg({ ...newOrg, max_users: parseInt(e?.target?.value) || 5 })}
              placeholder="5"
            />
            
            <Input
              label="Max Accounts"
              type="number"
              value={newOrg?.max_accounts}
              onChange={(e) => setNewOrg({ ...newOrg, max_accounts: parseInt(e?.target?.value) || 100 })}
              placeholder="100"
            />
            
            <Input
              label="Max Properties"
              type="number"
              value={newOrg?.max_properties}
              onChange={(e) => setNewOrg({ ...newOrg, max_properties: parseInt(e?.target?.value) || 500 })}
              placeholder="500"
            />
            
            <Input
              label="Storage (MB)"
              type="number"
              value={newOrg?.max_storage_mb}
              onChange={(e) => setNewOrg({ ...newOrg, max_storage_mb: parseInt(e?.target?.value) || 1000 })}
              placeholder="1000"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateOrgModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrganization}
              loading={loading}
              iconName="Building2"
            >
              Create Organization
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create User Modal - Updated with organization selection */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Create New User"
      >
        <div className="space-y-4">
          <Input
            label="Full Name *"
            value={newUser?.full_name}
            onChange={(e) => setNewUser({ ...newUser, full_name: e?.target?.value })}
            placeholder="Enter full name"
            required
          />
          
          <Input
            label="Email Address *"
            type="email"
            value={newUser?.email}
            onChange={(e) => setNewUser({ ...newUser, email: e?.target?.value })}
            placeholder="Enter email address"
            required
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="User Role"
              value={newUser?.role}
              onChange={(value) => setNewUser({ ...newUser, role: value })}
              options={userRoles}
            />
            
            <Input
              label="Phone"
              value={newUser?.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e?.target?.value })}
              placeholder="Enter phone number"
            />
          </div>
          
          <Select
            label="Tenant Organization"
            value={newUser?.tenant_id}
            onChange={(value) => setNewUser({ ...newUser, tenant_id: value })}
            options={availableOrganizations}
            placeholder="Select tenant organization (optional)"
            helperText="Choose which organization this user belongs to. Leave empty if not applicable."
          />
          
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Icon name="AlertTriangle" size={16} className="text-warning mt-0.5" />
              <div className="text-sm">
                <p className="text-warning font-medium">Temporary Password</p>
                <p className="text-warning/80 mt-1">
                  A temporary password will be generated. The user should change it upon first login.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateUserModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              loading={loading}
              iconName="UserPlus"
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminActions;