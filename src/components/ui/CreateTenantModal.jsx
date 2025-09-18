import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { adminService } from '../../services/adminService';

const CreateTenantModal = ({ isOpen, onClose, onTenantCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    contact_email: '',
    contact_phone: '',
    description: '',
    subscription_plan: 'free',
    status: 'trial',
    max_users: 5,
    max_accounts: 100,
    max_properties: 500,
    max_storage_mb: 1000,
    city: '',
    state: '',
    country: 'US',
    domain: '',
    timezone: 'UTC'
  });

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

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'America/Phoenix', label: 'Arizona Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-generate slug from name
    if (field === 'name' && value) {
      const slug = value?.toLowerCase()?.replace(/[^a-z0-9\s-]/g, '')?.replace(/\s+/g, '-')?.replace(/-+/g, '-')?.replace(/^-|-$/g, '');
      
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }

    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData?.name?.trim()) {
      setError('Organization name is required');
      return false;
    }
    if (!formData?.slug?.trim()) {
      setError('Organization slug is required');
      return false;
    }
    if (!/^[a-z0-9-]+$/?.test(formData?.slug)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens');
      return false;
    }
    if (formData?.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.contact_email)) {
      setError('Please enter a valid contact email address');
      return false;
    }
    if (formData?.domain && !/^[a-z0-9-]+(\.[a-z0-9-]+)*$/?.test(formData?.domain)) {
      setError('Please enter a valid domain (e.g., company.com)');
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
      const result = await adminService?.createOrganization(formData);
      
      if (result?.success) {
        onTenantCreated?.(result?.data);
        handleClose();
      } else {
        setError(result?.error || 'Failed to create tenant organization');
      }
    } catch (err) {
      setError('An unexpected error occurred while creating the tenant');
      console.error('Create tenant error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      slug: '',
      contact_email: '',
      contact_phone: '',
      description: '',
      subscription_plan: 'free',
      status: 'trial',
      max_users: 5,
      max_accounts: 100,
      max_properties: 500,
      max_storage_mb: 1000,
      city: '',
      state: '',
      country: 'US',
      domain: '',
      timezone: 'UTC'
    });
    setError('');
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Tenant Organization"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Organization Name *"
                value={formData?.name}
                onChange={(e) => handleInputChange('name', e?.target?.value)}
                placeholder="Enter organization name"
                disabled={loading}
                required
              />
            </div>

            <Input
              label="Slug *"
              value={formData?.slug}
              onChange={(e) => handleInputChange('slug', e?.target?.value)}
              placeholder="organization-slug"
              disabled={loading}
              required
              helperText="URL-friendly identifier (lowercase, numbers, hyphens only)"
            />

            <Input
              label="Domain"
              value={formData?.domain}
              onChange={(e) => handleInputChange('domain', e?.target?.value)}
              placeholder="company.com"
              disabled={loading}
              helperText="Custom domain for tenant access"
            />

            <Input
              label="Contact Email"
              type="email"
              value={formData?.contact_email}
              onChange={(e) => handleInputChange('contact_email', e?.target?.value)}
              placeholder="admin@company.com"
              disabled={loading}
            />

            <Input
              label="Contact Phone"
              value={formData?.contact_phone}
              onChange={(e) => handleInputChange('contact_phone', e?.target?.value)}
              placeholder="(555) 123-4567"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={formData?.description}
              onChange={(e) => handleInputChange('description', e?.target?.value)}
              placeholder="Brief description of the organization..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              disabled={loading}
            />
          </div>
        </div>

        {/* Subscription & Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Subscription & Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Subscription Plan"
              value={formData?.subscription_plan}
              onChange={(value) => handleInputChange('subscription_plan', value)}
              onSearchChange={() => {}}
              onOpenChange={() => {}}
              options={subscriptionPlans}
              disabled={loading}
              id="subscription_plan"
              name="subscription_plan"
              error=""
              description=""
            />

            <Select
              label="Initial Status"
              value={formData?.status}
              onChange={(value) => handleInputChange('status', value)}
              onSearchChange={() => {}}
              onOpenChange={() => {}}
              options={tenantStatuses}
              disabled={loading}
              id="status"
              name="status"
              error=""
              description=""
            />
          </div>
        </div>

        {/* Resource Limits */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Resource Limits</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Max Users"
              type="number"
              value={formData?.max_users}
              onChange={(e) => handleInputChange('max_users', parseInt(e?.target?.value) || 0)}
              placeholder="5"
              disabled={loading}
              min="1"
            />

            <Input
              label="Max Accounts"
              type="number"
              value={formData?.max_accounts}
              onChange={(e) => handleInputChange('max_accounts', parseInt(e?.target?.value) || 0)}
              placeholder="100"
              disabled={loading}
              min="1"
            />

            <Input
              label="Max Properties"
              type="number"
              value={formData?.max_properties}
              onChange={(e) => handleInputChange('max_properties', parseInt(e?.target?.value) || 0)}
              placeholder="500"
              disabled={loading}
              min="1"
            />

            <Input
              label="Storage (MB)"
              type="number"
              value={formData?.max_storage_mb}
              onChange={(e) => handleInputChange('max_storage_mb', parseInt(e?.target?.value) || 0)}
              placeholder="1000"
              disabled={loading}
              min="100"
            />
          </div>
        </div>

        {/* Location & Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Location & Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData?.city}
              onChange={(e) => handleInputChange('city', e?.target?.value)}
              placeholder="New York"
              disabled={loading}
            />

            <Input
              label="State"
              value={formData?.state}
              onChange={(e) => handleInputChange('state', e?.target?.value)}
              placeholder="NY"
              disabled={loading}
            />

            <Select
              label="Timezone"
              value={formData?.timezone}
              onChange={(value) => handleInputChange('timezone', value)}
              onSearchChange={() => {}}
              onOpenChange={() => {}}
              options={timezones}
              disabled={loading}
              id="timezone"
              name="timezone"
              error=""
              description=""
            />
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
            disabled={loading}
            iconName="Building"
            iconPosition="left"
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? 'Creating Tenant...' : 'Create Tenant'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTenantModal;