import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { propertiesService } from '../../services/propertiesService';

const AddPropertyModal = ({ isOpen, onClose, onPropertyAdded, preselectedAccountId = null }) => {
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    building_type: 'Industrial',
    roof_type: 'TPO',
    square_footage: '',
    year_built: '',
    account_id: preselectedAccountId || '',
    notes: ''
  });

  const buildingTypes = [
    'Industrial',
    'Warehouse', 
    'Manufacturing',
    'Hospitality',
    'Multifamily',
    'Commercial Office',
    'Retail',
    'Healthcare'
  ];

  const roofTypes = [
    'TPO',
    'EPDM',
    'Metal',
    'Modified Bitumen',
    'Shingle',
    'PVC',
    'BUR'
  ];

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedAccountId) {
      setFormData(prev => ({
        ...prev,
        account_id: preselectedAccountId
      }));
    }
  }, [preselectedAccountId]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      // Use the new method to get all available accounts for shared access
      const result = await propertiesService?.getAllAvailableAccounts();
      if (result?.success) {
        setAccounts(result?.data || []);
        
        // Show helpful message if no accounts are available
        if (!result?.data?.length) {
          setError('No active accounts available. Please contact your administrator.');
        }
      } else {
        setError(result?.error || 'Failed to load accounts');
      }
    } catch (err) {
      console.error('Load accounts error:', err);
      setError('Failed to load accounts');
    } finally {
      setLoadingAccounts(false);
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
    if (!formData?.name?.trim()) {
      setError('Property name is required');
      return false;
    }
    if (!formData?.address?.trim()) {
      setError('Address is required');
      return false;
    }
    if (!formData?.building_type) {
      setError('Building type is required');
      return false;
    }
    if (!formData?.account_id) {
      setError('Please select an account');
      return false;
    }
    if (formData?.square_footage && isNaN(formData?.square_footage)) {
      setError('Square footage must be a number');
      return false;
    }
    if (formData?.year_built && (isNaN(formData?.year_built) || formData?.year_built < 1800 || formData?.year_built > new Date()?.getFullYear())) {
      setError('Please enter a valid year built');
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
      const propertyData = {
        ...formData,
        square_footage: formData?.square_footage ? parseInt(formData?.square_footage) : null,
        year_built: formData?.year_built ? parseInt(formData?.year_built) : null
      };

      const result = await propertiesService?.createProperty(propertyData);
      
      if (result?.success) {
        onPropertyAdded?.(result?.data);
        handleClose();
      } else {
        setError(result?.error || 'Failed to create property');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Create property error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      building_type: 'Industrial',
      roof_type: 'TPO',
      square_footage: '',
      year_built: '',
      account_id: preselectedAccountId || '',
      notes: ''
    });
    setError('');
    onClose?.();
  };

  const accountOptions = accounts?.map(account => ({
    value: account?.id,
    label: `${account?.name} (${account?.company_type})`
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Property"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
            {error?.includes('No accounts assigned') && (
              <p className="text-xs text-muted-foreground mt-1">
                Contact your manager or admin to assign accounts to your profile.
              </p>
            )}
          </div>
        )}

        {/* Updated account selection info */}
        {!loadingAccounts && accounts?.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              You can create properties for any active account ({accounts?.length} available).
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Property Name *"
            value={formData?.name}
            onChange={(e) => handleInputChange('name', e?.target?.value)}
            placeholder="Enter property name"
            disabled={loading}
            required
          />

          <Select
            label="Account *"
            value={formData?.account_id}
            onChange={(e) => handleInputChange('account_id', e?.target?.value)}
            options={accountOptions}
            placeholder={
              loadingAccounts 
                ? "Loading accounts..." 
                : accounts?.length === 0 
                  ? "No accounts available" 
                  : "Select an account"
            }
            disabled={loading || loadingAccounts || accounts?.length === 0}
            required
            id="account_id"
            name="account_id"
            error=""
            description=""
            onSearchChange={() => {}}
            onOpenChange={() => {}}
          />

          <Input
            label="Address *"
            value={formData?.address}
            onChange={(e) => handleInputChange('address', e?.target?.value)}
            placeholder="Street address"
            disabled={loading}
            required
            className="md:col-span-2"
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

          <Select
            label="Building Type *"
            value={formData?.building_type}
            onChange={(e) => handleInputChange('building_type', e?.target?.value)}
            options={buildingTypes?.map(type => ({ value: type, label: type }))}
            disabled={loading}
            required
            id="building_type"
            name="building_type"
            error=""
            description=""
            onSearchChange={() => {}}
            onOpenChange={() => {}}
          />

          <Select
            label="Roof Type"
            value={formData?.roof_type}
            onChange={(e) => handleInputChange('roof_type', e?.target?.value)}
            options={roofTypes?.map(type => ({ value: type, label: type }))}
            disabled={loading}
            id="roof_type"
            name="roof_type"
            error=""
            description=""
            onSearchChange={() => {}}
            onOpenChange={() => {}}
          />

          <Input
            label="Square Footage"
            type="number"
            value={formData?.square_footage}
            onChange={(e) => handleInputChange('square_footage', e?.target?.value)}
            placeholder="e.g., 50000"
            disabled={loading}
          />

          <Input
            label="Year Built"
            type="number"
            value={formData?.year_built}
            onChange={(e) => handleInputChange('year_built', e?.target?.value)}
            placeholder="e.g., 2020"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            value={formData?.notes}
            onChange={(e) => handleInputChange('notes', e?.target?.value)}
            placeholder="Additional notes about this property..."
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
            disabled={loading || accounts?.length === 0}
            iconName="Plus"
            iconPosition="left"
          >
            {loading ? 'Adding Property...' : 'Add Property'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPropertyModal;