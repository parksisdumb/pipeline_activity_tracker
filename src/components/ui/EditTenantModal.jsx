import React, { useState } from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import Select from './Select';
import Input from './Input';
import Modal from './Modal';

const EditTenantModal = ({ tenant, isOpen, onClose, onSave }) => {
  const [editingTenant, setEditingTenant] = useState({ ...tenant });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'trial', label: 'Trial' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' }
  ];

  const subscriptionPlans = [
    { value: 'free', label: 'Free' },
    { value: 'basic', label: 'Basic' },
    { value: 'professional', label: 'Professional' },
    { value: 'enterprise', label: 'Enterprise' }
  ];

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await onSave?.(editingTenant);
      if (result?.success) {
        onClose?.();
      } else {
        setError(result?.error || 'Failed to save tenant changes');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingTenant({ ...tenant });
    setError('');
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Tenant">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={20} className="text-red-600" />
              <span className="text-red-600 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Basic Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Organization Name"
              value={editingTenant?.name || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, name: e?.target?.value }))}
              placeholder="Enter organization name"
              required
            />

            <Input
              label="Slug/Subdomain"
              value={editingTenant?.slug || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, slug: e?.target?.value }))}
              placeholder="Enter slug/subdomain"
              required
            />
          </div>

          <Input
            label="Description"
            value={editingTenant?.description || ''}
            onChange={(e) => setEditingTenant(prev => ({ ...prev, description: e?.target?.value }))}
            placeholder="Enter organization description (optional)"
          />
        </div>

        {/* Contact Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              value={editingTenant?.contact_email || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, contact_email: e?.target?.value }))}
              placeholder="Enter contact email"
            />

            <Input
              label="Contact Phone"
              value={editingTenant?.contact_phone || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, contact_phone: e?.target?.value }))}
              placeholder="Enter contact phone (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={editingTenant?.city || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, city: e?.target?.value }))}
              placeholder="Enter city"
            />

            <Input
              label="State"
              value={editingTenant?.state || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, state: e?.target?.value }))}
              placeholder="Enter state"
            />

            <Input
              label="Country"
              value={editingTenant?.country || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, country: e?.target?.value }))}
              placeholder="Enter country"
            />
          </div>
        </div>

        {/* Status and Subscription Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Status & Subscription</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <Select
                value={editingTenant?.status || ''}
                onChange={(status) => setEditingTenant(prev => ({ ...prev, status }))}
                onSearchChange={() => {}}
                error=""
                id="edit-tenant-status"
                onOpenChange={() => {}}
                name="editTenantStatus"
                description="Select tenant status"
                ref={null}
                options={statusOptions}
                placeholder="Select status"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Subscription Plan
              </label>
              <Select
                value={editingTenant?.subscription_plan || ''}
                onChange={(plan) => setEditingTenant(prev => ({ ...prev, subscription_plan: plan }))}
                onSearchChange={() => {}}
                error=""
                id="edit-tenant-plan"
                onOpenChange={() => {}}
                name="editTenantPlan"
                description="Select subscription plan"
                ref={null}
                options={subscriptionPlans}
                placeholder="Select plan"
              />
            </div>
          </div>
        </div>

        {/* Limits Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Resource Limits</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Max Users"
              type="number"
              value={editingTenant?.max_users || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, max_users: parseInt(e?.target?.value) || null }))}
              placeholder="Enter max users"
              min="1"
            />

            <Input
              label="Max Accounts"
              type="number"
              value={editingTenant?.max_accounts || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, max_accounts: parseInt(e?.target?.value) || null }))}
              placeholder="Enter max accounts"
              min="1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Max Properties"
              type="number"
              value={editingTenant?.max_properties || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, max_properties: parseInt(e?.target?.value) || null }))}
              placeholder="Enter max properties"
              min="1"
            />

            <Input
              label="Max Storage (MB)"
              type="number"
              value={editingTenant?.max_storage_mb || ''}
              onChange={(e) => setEditingTenant(prev => ({ ...prev, max_storage_mb: parseInt(e?.target?.value) || null }))}
              placeholder="Enter max storage in MB"
              min="1"
            />
          </div>
        </div>

        {/* Domain Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Domain Settings</h3>
          
          <Input
            label="Custom Domain"
            value={editingTenant?.domain || ''}
            onChange={(e) => setEditingTenant(prev => ({ ...prev, domain: e?.target?.value }))}
            placeholder="Enter custom domain (optional)"
          />
        </div>

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
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditTenantModal;