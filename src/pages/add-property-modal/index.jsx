import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import { propertiesService } from '../../services/propertiesService';
import { accountsService } from '../../services/accountsService';
import AddAccountForm from './components/AddAccountForm';
import AccountSelector from './components/AccountSelector';

const AddPropertyModal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const preselectedAccountId = searchParams?.get('accountId');

  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState('');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    buildingType: 'Industrial',
    roofType: 'TPO',
    squareFootage: '',
    accountId: preselectedAccountId || '',
    stage: 'Unassessed',
    notes: ''
  });

  const buildingTypes = [
    { value: 'Industrial', label: 'Industrial' },
    { value: 'Warehouse', label: 'Warehouse' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Hospitality', label: 'Hospitality' },
    { value: 'Multifamily', label: 'Multifamily' },
    { value: 'Commercial Office', label: 'Commercial Office' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Healthcare', label: 'Healthcare' }
  ];

  const roofTypes = [
    { value: 'TPO', label: 'TPO' },
    { value: 'EPDM', label: 'EPDM' },
    { value: 'Metal', label: 'Metal' },
    { value: 'Modified Bitumen', label: 'Modified Bitumen' },
    { value: 'Shingle', label: 'Shingle' },
    { value: 'PVC', label: 'PVC' },
    { value: 'BUR', label: 'BUR' }
  ];

  const propertyStages = [
    { value: 'Unassessed', label: 'Unassessed' },
    { value: 'Assessment Scheduled', label: 'Assessment Scheduled' },
    { value: 'Assessed', label: 'Assessed' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'In Negotiation', label: 'In Negotiation' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' }
  ];

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (!searchTerm?.trim()) {
      setFilteredAccounts(accounts);
    } else {
      const searchLower = searchTerm?.toLowerCase();
      const filtered = accounts?.filter(account =>
        account?.name?.toLowerCase()?.includes(searchLower) ||
        account?.company_type?.toLowerCase()?.includes(searchLower)
      );
      setFilteredAccounts(filtered);
    }
  }, [searchTerm, accounts]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const result = await accountsService?.getAccounts();
      if (result?.success) {
        const activeAccounts = result?.data?.filter(account => account?.is_active) || [];
        setAccounts(activeAccounts);
        setFilteredAccounts(activeAccounts);
      } else {
        console.error('Failed to load accounts:', result?.error);
        setAccounts([]);
        setFilteredAccounts([]);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setAccounts([]);
      setFilteredAccounts([]);
    }
    setLoadingAccounts(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    const selectedAccount = accounts?.find(account => account?.id === formData?.accountId);
    if (formData?.accountId && value !== selectedAccount?.name) {
      setFormData(prev => ({
        ...prev,
        accountId: ''
      }));
    }
  };

  const handleAccountSelect = (accountId) => {
    const account = accounts?.find(acc => acc?.id === accountId);
    setFormData(prev => ({
      ...prev,
      accountId
    }));
    setSearchTerm(account?.name || '');
  };

  const handleAddNewAccount = () => {
    setShowAddAccount(true);
  };

  const handleAccountAdded = (newAccount) => {
    setAccounts(prev => [newAccount, ...prev]);
    setFilteredAccounts(prev => [newAccount, ...prev]);
    setFormData(prev => ({
      ...prev,
      accountId: newAccount?.id
    }));
    setSearchTerm(newAccount?.name || '');
    setShowAddAccount(false);
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
    if (!formData?.buildingType) {
      setError('Building type is required');
      return false;
    }
    if (!formData?.accountId) {
      setError('Please select an account');
      return false;
    }
    if (formData?.squareFootage && (isNaN(formData?.squareFootage) || formData?.squareFootage <= 0)) {
      setError('Square footage must be a positive number');
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
        name: formData?.name?.trim(),
        address: formData?.address?.trim(),
        building_type: formData?.buildingType,
        roof_type: formData?.roofType,
        square_footage: formData?.squareFootage ? parseInt(formData?.squareFootage) : null,
        account_id: formData?.accountId,
        stage: formData?.stage,
        notes: formData?.notes?.trim() || null
      };

      const result = await propertiesService?.createProperty(propertyData);

      if (result?.success) {
        // Navigate back with success message
        if (preselectedAccountId) {
          navigate(`/account-details/${preselectedAccountId}?tab=properties&success=property-added`);
        } else {
          navigate('/properties-list?success=property-added');
        }
      } else {
        setError(result?.error || 'Failed to create property');
      }
    } catch (error) {
      console.error('Error creating property:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (preselectedAccountId) {
      navigate(`/account-details/${preselectedAccountId}`);
    } else {
      navigate(-1);
    }
  };

  const selectedAccount = accounts?.find(account => account?.id === formData?.accountId);

  if (showAddAccount) {
    return (
      <AddAccountForm
        onCancel={() => setShowAddAccount(false)}
        onAccountAdded={handleAccountAdded}
        user={user}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground">Add New Property</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
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

            {/* Property Name */}
            <Input
              label="Property Name *"
              value={formData?.name}
              onChange={(e) => handleInputChange('name', e?.target?.value)}
              placeholder="Enter property name"
              disabled={loading}
              required
            />

            {/* Address */}
            <Input
              label="Address *"
              value={formData?.address}
              onChange={(e) => handleInputChange('address', e?.target?.value)}
              placeholder="Enter property address"
              disabled={loading}
              required
            />

            {/* Building Type */}
            <Select
              label="Building Type *"
              value={formData?.buildingType}
              onChange={(e) => handleInputChange('buildingType', e?.target?.value)}
              options={buildingTypes}
              disabled={loading}
              required
            />

            {/* Roof Type */}
            <Select
              label="Roof Type"
              value={formData?.roofType}
              onChange={(e) => handleInputChange('roofType', e?.target?.value)}
              options={roofTypes}
              disabled={loading}
            />

            {/* Square Footage */}
            <Input
              label="Square Footage"
              type="number"
              value={formData?.squareFootage}
              onChange={(e) => handleInputChange('squareFootage', e?.target?.value)}
              placeholder="Enter square footage"
              disabled={loading}
              min="1"
              step="1"
            />

            {/* Account Selection */}
            <AccountSelector
              selectedAccount={selectedAccount}
              accounts={filteredAccounts}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onAccountSelect={handleAccountSelect}
              onAddNewAccount={handleAddNewAccount}
              loading={loadingAccounts}
              disabled={loading}
            />

            {/* Property Stage */}
            <Select
              label="Property Stage"
              value={formData?.stage}
              onChange={(e) => handleInputChange('stage', e?.target?.value)}
              options={propertyStages}
              disabled={loading}
            />

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Notes
              </label>
              <textarea
                value={formData?.notes}
                onChange={(e) => handleInputChange('notes', e?.target?.value)}
                placeholder="Additional notes about this property..."
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !formData?.accountId}
                loading={loading}
              >
                {loading ? 'Adding...' : 'Add Property'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPropertyModal;