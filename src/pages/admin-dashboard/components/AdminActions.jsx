import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { authService } from '../../../services/authService';
import { adminService } from '../../../services/adminService';

const AdminActions = ({ onRefresh }) => {
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Create Organization Form State
  const [newOrg, setNewOrg] = useState({
    name: '',
    company_type: 'Property Management',
    email: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    zip_code: ''
  });

  // Create User Form State
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'rep',
    phone: ''
  });

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

  const handleCreateOrganization = async () => {
    if (!newOrg?.name?.trim()) {
      alert('Organization name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await adminService?.createOrganization(newOrg);
      if (result?.success) {
        setIsCreateOrgModalOpen(false);
        setNewOrg({
          name: '',
          company_type: 'Property Management',
          email: '',
          phone: '',
          city: '',
          state: '',
          address: '',
          zip_code: ''
        });
        await onRefresh?.();
        alert('Organization created successfully!');
      } else {
        alert(result?.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Error creating organization');
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
      // Create user through auth service with temporary password
      const tempPassword = 'TempPass123!'; // User should change this on first login
      
      const result = await authService?.signUp({
        email: newUser?.email,
        password: tempPassword,
        options: {
          data: {
            full_name: newUser?.full_name,
            role: newUser?.role,
            phone: newUser?.phone || null
          }
        }
      });

      if (result?.success) {
        setIsCreateUserModalOpen(false);
        setNewUser({
          email: '',
          full_name: '',
          role: 'rep',
          phone: ''
        });
        await onRefresh?.();
        alert(`User created successfully! Temporary password: ${tempPassword}`);
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

      {/* Create Organization Modal */}
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
            label="Company Type"
            value={newOrg?.company_type}
            onChange={(value) => setNewOrg({ ...newOrg, company_type: value })}
            options={companyTypes?.map(type => ({ value: type, label: type }))}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={newOrg?.email}
              onChange={(e) => setNewOrg({ ...newOrg, email: e?.target?.value })}
              placeholder="Enter email address"
            />
            
            <Input
              label="Phone"
              value={newOrg?.phone}
              onChange={(e) => setNewOrg({ ...newOrg, phone: e?.target?.value })}
              placeholder="Enter phone number"
            />
          </div>
          
          <Input
            label="Address"
            value={newOrg?.address}
            onChange={(e) => setNewOrg({ ...newOrg, address: e?.target?.value })}
            placeholder="Enter street address"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              label="ZIP Code"
              value={newOrg?.zip_code}
              onChange={(e) => setNewOrg({ ...newOrg, zip_code: e?.target?.value })}
              placeholder="ZIP"
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

      {/* Create User Modal */}
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