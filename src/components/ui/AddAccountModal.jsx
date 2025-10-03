import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { accountsService } from '../../services/accountsService';

const AddAccountModal = ({ isOpen, onClose, onAccountAdded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    company_type: 'Property Management',
    notes: ''
  });

  const companyTypes = [
    'Property Management',
    'General Contractor',
    'Developer', 
    'REIT/Institutional Investor',
    'Asset Manager',
    'Building Owner',
    'Facility Manager',
    'Roofing Contractor',
    'Insurance',
    'Architecture/Engineering',
    'Commercial Office',
    'Retail',
    'Healthcare',
    'Affiliate: Real Estate',
    'Affiliate: Manufacturer'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData?.name?.trim()) {
      setError('Company name is required');
      return false;
    }
    if (!formData?.company_type) {
      setError('Company type is required');
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
      const result = await accountsService?.createAccount(formData);
      
      if (result?.success) {
        onAccountAdded?.(result?.data);
        handleClose();
      } else {
        setError(result?.error || 'Failed to create account');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Create account error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      company_type: 'Property Management',
      notes: ''
    });
    setError('');
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Account"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name *"
            value={formData?.name}
            onChange={(e) => handleInputChange('name', e?.target?.value)}
            placeholder="Enter company name"
            disabled={loading}
            required
          />

          <Select
            label="Company Type *"
            value={formData?.company_type}
            onChange={(value) => handleInputChange('company_type', value)}
            onSearchChange={() => {}}
            options={companyTypes?.map(type => ({ value: type, label: type }))}
            disabled={loading}
            required
            error=""
            id="company_type"
            onOpenChange={() => {}}
            name="company_type"
            description=""
            ref={null}
          />

          <Input
            label="Email"
            type="email"
            value={formData?.email}
            onChange={(e) => handleInputChange('email', e?.target?.value)}
            placeholder="company@example.com"
            disabled={loading}
          />

          <Input
            label="Phone"
            value={formData?.phone}
            onChange={(e) => handleInputChange('phone', e?.target?.value)}
            placeholder="(555) 123-4567"
            disabled={loading}
          />

          <Input
            label="Website"
            value={formData?.website}
            onChange={(e) => handleInputChange('website', e?.target?.value)}
            placeholder="https://company.com"
            disabled={loading}
          />

          <Input
            label="Address"
            value={formData?.address}
            onChange={(e) => handleInputChange('address', e?.target?.value)}
            placeholder="Street address"
            disabled={loading}
          />

          <Input
            label="City"
            value={formData?.city}
            onChange={(e) => handleInputChange('city', e?.target?.value)}
            placeholder="City"
            disabled={loading}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="State"
              value={formData?.state}
              onChange={(e) => handleInputChange('state', e?.target?.value)}
              placeholder="TX"
              disabled={loading}
            />
            <Input
              label="ZIP Code"
              value={formData?.zip_code}
              onChange={(e) => handleInputChange('zip_code', e?.target?.value)}
              placeholder="12345"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            value={formData?.notes}
            onChange={(e) => handleInputChange('notes', e?.target?.value)}
            placeholder="Additional notes about this account..."
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
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
            iconName="Plus"
            iconPosition="left"
          >
            {loading ? 'Adding Account...' : 'Add Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAccountModal;