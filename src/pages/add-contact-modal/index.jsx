import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import { contactsService } from '../../services/contactsService';
import { accountsService } from '../../services/accountsService';
import AddAccountForm from './components/AddAccountForm';
import AccountSelector from './components/AccountSelector';

const AddContactModal = () => {
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
    fullName: '',
    role: '',
    phone: '',
    email: '',
    accountId: preselectedAccountId || '',
    stage: 'Identified',
    notes: ''
  });

  const contactStages = [
    { value: 'Identified', label: 'Identified' },
    { value: 'Reached', label: 'Reached' }, 
    { value: 'DM Confirmed', label: 'DM Confirmed' },
    { value: 'Engaged', label: 'Engaged' },
    { value: 'Dormant', label: 'Dormant' }
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
      console.log('Loading accounts for FOX roofing tenant...');
      const result = await accountsService?.getAccounts();
      if (result?.success) {
        const activeAccounts = result?.data?.filter(account => account?.is_active) || [];
        setAccounts(activeAccounts);
        setFilteredAccounts(activeAccounts);
        
        console.log(`FOX roofing accounts loaded: ${activeAccounts?.length} accounts`);
        console.log('Account details:', activeAccounts?.map(acc => ({ 
          id: acc?.id?.substring(0, 8) + '...', 
          name: acc?.name 
        })));
      } else {
        console.error('Failed to load FOX roofing accounts:', result?.error);
        setAccounts([]);
        setFilteredAccounts([]);
        
        // Show specific error for FOX roofing tenant
        setError(`Unable to load accounts for FOX roofing: ${result?.error || 'Unknown error'}. Please contact your administrator.`);
      }
    } catch (error) {
      console.error('Error loading FOX roofing accounts:', error);
      setAccounts([]);
      setFilteredAccounts([]);
      setError('Network error while loading FOX roofing accounts. Please check your connection and try again.');
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
    if (!formData?.fullName?.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData?.phone?.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData?.email?.trim()) {
      setError('Email address is required');
      return false;
    }
    if (formData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData?.accountId) {
      setError('Please select an account');
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
      const nameParts = formData?.fullName?.trim()?.split(' ') || [];
      const firstName = nameParts?.[0] || '';
      const lastName = nameParts?.length > 1 ? nameParts?.slice(1)?.join(' ') : '';

      const contactData = {
        first_name: firstName,
        last_name: lastName,
        email: formData?.email?.trim(),
        phone: formData?.phone?.trim(),
        title: formData?.role?.trim() || null,
        account_id: formData?.accountId,
        stage: formData?.stage,
        notes: formData?.notes?.trim() || null,
        is_primary_contact: false
      };

      // Enhanced debugging for FOX roofing tenant
      console.log('=== FOX ROOFING CONTACT CREATION DEBUG ===');
      console.log('User email: tyler@foxroofing.co');
      console.log('Contact data being submitted:', contactData);
      console.log('Selected account from form:', formData?.accountId);
      console.log('Available accounts:', accounts?.length);

      const result = await contactsService?.createContact(contactData);

      if (result?.success) {
        console.log('✅ Contact created successfully for FOX roofing!');
        // Navigate back with success message
        if (preselectedAccountId) {
          navigate(`/account-details/${preselectedAccountId}?tab=contacts&success=contact-added`);
        } else {
          navigate('/contacts-list?success=contact-added');
        }
      } else {
        console.error('❌ Contact creation failed for FOX roofing:', result?.error);
        
        // Enhanced error message specifically for Tyler Fox / FOX roofing
        let errorMessage = result?.error || 'Failed to create contact';
        if (errorMessage?.includes('tenant') || errorMessage?.includes('access')) {
          errorMessage = `FOX Roofing Access Issue: ${errorMessage}
          
🔧 Troubleshooting Steps:
1. Verify your account permissions with your administrator
2. Ensure the selected account belongs to FOX roofing
3. Try refreshing the page and logging in again
4. Contact support if the issue persists

Debug Info: Tyler Fox (tyler@foxroofing.co) - FOX roofing tenant`;
        }
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Unexpected error in FOX roofing contact creation:', error);
      setError('An unexpected error occurred while creating the contact for FOX roofing. Please try again or contact support.');
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
        <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground">Add New Contact</h1>
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

            {/* Full Name */}
            <Input
              label="Full Name *"
              value={formData?.fullName}
              onChange={(e) => handleInputChange('fullName', e?.target?.value)}
              placeholder="Enter full name"
              disabled={loading}
              required
            />

            {/* Role/Title */}
            <Input
              label="Role/Title"
              value={formData?.role}
              onChange={(e) => handleInputChange('role', e?.target?.value)}
              placeholder="e.g., Property Manager, Facility Director"
              disabled={loading}
            />

            {/* Phone */}
            <Input
              label="Phone Number *"
              type="tel"
              value={formData?.phone}
              onChange={(e) => handleInputChange('phone', e?.target?.value)}
              placeholder="(555) 123-4567"
              disabled={loading}
              required
            />

            {/* Email */}
            <Input
              label="Email Address *"
              type="email"
              value={formData?.email}
              onChange={(e) => handleInputChange('email', e?.target?.value)}
              placeholder="contact@company.com"
              disabled={loading}
              required
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

            {/* Contact Stage */}
            <Select
              label="Contact Stage"
              value={formData?.stage}
              onChange={(e) => handleInputChange('stage', e?.target?.value)}
              options={contactStages}
              disabled={loading}
              onSearchChange={() => {}}
              error=""
              id="contact-stage"
              onOpenChange={() => {}}
              name="stage"
              description=""
            />

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Notes
              </label>
              <textarea
                value={formData?.notes}
                onChange={(e) => handleInputChange('notes', e?.target?.value)}
                placeholder="Optional notes about this contact..."
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
                {loading ? 'Adding...' : 'Add Contact'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;