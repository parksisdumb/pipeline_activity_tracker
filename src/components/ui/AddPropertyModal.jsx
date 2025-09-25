import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { propertiesService } from '../../services/propertiesService';
import { contactsService } from '../../services/contactsService';

const AddPropertyModal = ({ isOpen, onClose, onPropertyAdded, preselectedAccountId = null }) => {
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    building_type: 'Industrial',
    roof_type: 'TPO',
    stage: 'Unassessed', // Add property stage field
    square_footage: '',
    year_built: '',
    account_id: preselectedAccountId || '',
    primary_contact_id: '',
    notes: ''
  });

  // US States options for the state dropdown
  const stateOptions = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' }
  ];

  // Database enum values - matching exact schema
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

  // Add property stage options from database schema
  const propertyStages = [
    'Unassessed',
    'Assessment Scheduled',
    'Assessed',
    'Proposal Sent',
    'In Negotiation',
    'Won',
    'Lost'
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
      loadContactsForAccount(preselectedAccountId);
    }
  }, [preselectedAccountId]);

  // Load contacts when account changes
  useEffect(() => {
    if (formData?.account_id && formData?.account_id !== preselectedAccountId) {
      loadContactsForAccount(formData?.account_id);
    } else if (!formData?.account_id) {
      setContacts([]);
      setFormData(prev => ({ ...prev, primary_contact_id: '' }));
    }
  }, [formData?.account_id]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const result = await propertiesService?.getUserAssignedAccounts();
      if (result?.success) {
        setAccounts(result?.data || []);
        
        if (!result?.data?.length) {
          setError('No accounts assigned to you. Please contact your manager to assign accounts before creating properties.');
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

  const loadContactsForAccount = async (accountId) => {
    if (!accountId) return;
    
    setLoadingContacts(true);
    try {
      const result = await contactsService?.getContactsByAccount(accountId);
      if (result?.success) {
        setContacts(result?.data || []);
      } else {
        console.error('Failed to load contacts:', result?.error);
        setContacts([]);
      }
    } catch (err) {
      console.error('Load contacts error:', err);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
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

      // Remove primary_contact_id from property data as it's not a property field
      delete propertyData?.primary_contact_id;

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
      stage: 'Unassessed',
      square_footage: '',
      year_built: '',
      account_id: preselectedAccountId || '',
      primary_contact_id: '',
      notes: ''
    });
    setError('');
    setContacts([]);
    onClose?.();
  };

  // Transform data for Select components
  const accountOptions = accounts?.map(account => ({
    value: account?.id,
    label: `${account?.name} (${account?.company_type})`
  }));

  const buildingTypeOptions = buildingTypes?.map(type => ({
    value: type,
    label: type
  }));

  const roofTypeOptions = roofTypes?.map(type => ({
    value: type,
    label: type
  }));

  // Add property stage options
  const propertyStageOptions = propertyStages?.map(stage => ({
    value: stage,
    label: stage
  }));

  const contactOptions = contacts?.map(contact => ({
    value: contact?.id,
    label: `${contact?.first_name} ${contact?.last_name}${contact?.title ? ` - ${contact?.title}` : ''}${contact?.is_primary_contact ? ' (Primary)' : ''}`
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

        {/* Show account selection info */}
        {!loadingAccounts && accounts?.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              You can only create properties for accounts assigned to you ({accounts?.length} available).
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
            onChange={(value) => handleInputChange('account_id', value)}
            onSearchChange={() => {}}
            error=""
            id="account-select"
            onOpenChange={() => {}}
            name="account_id"
            description=""
            options={accountOptions}
            placeholder={
              loadingAccounts 
                ? "Loading accounts..." 
                : accounts?.length === 0 
                  ? "No accounts available" : "Select an account"
            }
            disabled={loading || loadingAccounts || accounts?.length === 0}
            required
          />

          <Select
            label="Primary Contact"
            value={formData?.primary_contact_id}
            onChange={(value) => handleInputChange('primary_contact_id', value)}
            onSearchChange={() => {}}
            error=""
            id="primary-contact-select"
            onOpenChange={() => {}}
            name="primary_contact_id"
            description=""
            options={contactOptions}
            placeholder={
              !formData?.account_id 
                ? "Select account first" 
                : loadingContacts 
                  ? "Loading contacts..." 
                  : contacts?.length === 0 
                    ? "No contacts available" : "Select primary contact (optional)"
            }
            disabled={loading || !formData?.account_id || loadingContacts}
            clearable
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
            <Select
              label="State"
              value={formData?.state}
              onChange={(value) => handleInputChange('state', value)}
              onSearchChange={() => {}}
              error=""
              id="state-select"
              onOpenChange={() => {}}
              name="state"
              description=""
              options={stateOptions}
              placeholder="Select state"
              disabled={loading}
              searchable
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
            onChange={(value) => handleInputChange('building_type', value)}
            onSearchChange={() => {}}
            error=""
            id="building-type-select"
            onOpenChange={() => {}}
            name="building_type"
            description=""
            options={buildingTypeOptions}
            disabled={loading}
            required
            placeholder="Select building type"
            searchable
          />

          <Select
            label="Roof Type"
            value={formData?.roof_type}
            onChange={(value) => handleInputChange('roof_type', value)}
            onSearchChange={() => {}}
            error=""
            id="roof-type-select"
            onOpenChange={() => {}}
            name="roof_type"
            description=""
            options={roofTypeOptions}
            disabled={loading}
            placeholder="Select roof type"
            searchable
          />

          <Select
            label="Property Stage"
            value={formData?.stage}
            onChange={(value) => handleInputChange('stage', value)}
            onSearchChange={() => {}}
            error=""
            id="property-stage-select"
            onOpenChange={() => {}}
            name="stage"
            description=""
            options={propertyStageOptions}
            disabled={loading}
            placeholder="Select property stage"
            searchable
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