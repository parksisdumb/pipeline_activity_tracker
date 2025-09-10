import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { accountsService } from '../../../services/accountsService';

const AddAccountForm = ({ onCancel, onAccountAdded, user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    companyType: 'Property Management',
    stage: 'Prospect',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    website: ''
  });

  const companyTypes = [
    { value: 'Property Management', label: 'Property Management' },
    { value: 'General Contractor', label: 'General Contractor' },
    { value: 'Developer', label: 'Developer' },
    { value: 'REIT/Institutional Investor', label: 'REIT/Institutional Investor' },
    { value: 'Asset Manager', label: 'Asset Manager' },
    { value: 'Building Owner', label: 'Building Owner' },
    { value: 'Facility Manager', label: 'Facility Manager' },
    { value: 'Roofing Contractor', label: 'Roofing Contractor' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Architecture/Engineering', label: 'Architecture/Engineering' },
    { value: 'Commercial Office', label: 'Commercial Office' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Healthcare', label: 'Healthcare' }
  ];

  const stageOptions = [
    { value: 'Prospect', label: 'Prospect' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Qualified', label: 'Qualified' },
    { value: 'Assessment Scheduled', label: 'Assessment Scheduled' },
    { value: 'Assessed', label: 'Assessed' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'In Negotiation', label: 'In Negotiation' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' }
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
      setError('Account name is required');
      return false;
    }
    if (formData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      setError('Please enter a valid email address');
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
      const accountData = {
        name: formData?.name?.trim(),
        company_type: formData?.companyType,
        stage: formData?.stage,
        address: formData?.address?.trim() || null,
        city: formData?.city?.trim() || null,
        state: formData?.state?.trim() || null,
        zip_code: formData?.zipCode?.trim() || null,
        phone: formData?.phone?.trim() || null,
        email: formData?.email?.trim() || null,
        website: formData?.website?.trim() || null,
        assigned_rep_id: user?.id,
        is_active: true
      };

      const result = await accountsService?.createAccount(accountData);

      if (result?.success) {
        onAccountAdded(result?.data);
      } else {
        setError(result?.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground">Add New Account</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="w-8 h-8"
            >
              <Icon name="X" size={16} />
            </Button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Account Name */}
            <Input
              label="Account Name *"
              value={formData?.name}
              onChange={(e) => handleInputChange('name', e?.target?.value)}
              placeholder="Enter account name"
              disabled={loading}
              required
            />

            {/* Company Type */}
            <Select
              label="Company Type"
              value={formData?.companyType}
              onChange={(e) => handleInputChange('companyType', e?.target?.value)}
              options={companyTypes}
              disabled={loading}
            />

            {/* Stage */}
            <Select
              label="Account Stage"
              value={formData?.stage}
              onChange={(e) => handleInputChange('stage', e?.target?.value)}
              options={stageOptions}
              disabled={loading}
            />

            {/* Address */}
            <Input
              label="Address"
              value={formData?.address}
              onChange={(e) => handleInputChange('address', e?.target?.value)}
              placeholder="Street address"
              disabled={loading}
            />

            {/* City, State, ZIP */}
            <div className="grid grid-cols-2 gap-3">
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
                  label="ZIP"
                  value={formData?.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e?.target?.value)}
                  placeholder="12345"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Contact Information */}
            <Input
              label="Phone"
              type="tel"
              value={formData?.phone}
              onChange={(e) => handleInputChange('phone', e?.target?.value)}
              placeholder="(555) 123-4567"
              disabled={loading}
            />

            <Input
              label="Email"
              type="email"
              value={formData?.email}
              onChange={(e) => handleInputChange('email', e?.target?.value)}
              placeholder="contact@company.com"
              disabled={loading}
            />

            <Input
              label="Website"
              type="url"
              value={formData?.website}
              onChange={(e) => handleInputChange('website', e?.target?.value)}
              placeholder="https://company.com"
              disabled={loading}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAccountForm;