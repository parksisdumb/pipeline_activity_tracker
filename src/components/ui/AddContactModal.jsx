import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { Checkbox } from './Checkbox';
import { contactsService } from '../../services/contactsService';
import { accountsService } from '../../services/accountsService';

const AddContactModal = ({ isOpen, onClose, onContactAdded, preselectedAccountId = null }) => {
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile_phone: '',
    title: '',
    account_id: preselectedAccountId || '',
    is_primary_contact: false,
    stage: 'Identified', // Default stage
    notes: ''
  });

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
    setError(''); // Clear any previous errors
    try {
      console.log('Loading accounts for contact creation...');
      const result = await accountsService?.getAccounts();
      if (result?.success) {
        setAccounts(result?.data || []);
        
        // Enhanced debugging for account loading issues
        console.log('Accounts loaded successfully:', result?.data?.length, 'accounts');
        console.log('Account details:', result?.data?.map(acc => ({ 
          id: acc?.id, 
          name: acc?.name, 
          tenant_id: acc?.tenant_id 
        })));
        
        // Show helpful message if no accounts available
        if (!result?.data || result?.data?.length === 0) {
          setError('No accounts available for your organization (FOX roofing). You may need to create an account first or contact your administrator to verify your permissions.');
        }
      } else {
        console.error('Failed to load accounts:', result?.error);
        setError(`Failed to load accounts: ${result?.error || 'Unknown error'}. Please try refreshing the page or contact support.`);
      }
    } catch (err) {
      console.error('Load accounts error:', err);
      setError('Unable to load accounts. Please check your connection and try again. If the problem persists, contact support.');
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
    if (!formData?.first_name?.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData?.last_name?.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData?.account_id) {
      setError('Please select an account');
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
      // Enhanced debugging for Tyler Fox's issue 
      console.log('=== CONTACT FORM SUBMISSION ===');
      console.log('Form data:', formData);
      console.log('Selected account ID:', formData?.account_id);
      
      // Find selected account info for debugging
      const selectedAccount = accounts?.find(acc => acc?.id === formData?.account_id);
      console.log('Selected account details:', selectedAccount);

      const result = await contactsService?.createContact(formData);
      
      if (result?.success) {
        console.log('Contact creation successful!');
        onContactAdded?.(result?.data);
        handleClose();
      } else {
        console.error('Contact creation failed:', result?.error);
        
        // Enhanced error display with debugging info for admins
        let errorMessage = result?.error || 'Failed to create contact';
        
        // Add debugging information for FOX roofing tenant issues
        if (errorMessage?.includes('tenant') || errorMessage?.includes('access')) {
          errorMessage += '\n\n🔧 Debug Info:\n';
          errorMessage += `- User: ${formData?.email || 'Unknown'}\n`;
          errorMessage += `- Selected Account: ${selectedAccount?.name || 'Unknown'}\n`;
          errorMessage += `- Available Accounts: ${accounts?.length || 0}\n`;
          errorMessage += '- Contact support with this information if the issue persists.';
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Unexpected error in contact creation:', err);
      setError('An unexpected error occurred. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile_phone: '',
      title: '',
      account_id: preselectedAccountId || '',
      is_primary_contact: false,
      stage: 'Identified', // Reset to default stage
      notes: ''
    });
    setError('');
    onClose?.();
  };

  const accountOptions = accounts?.map(account => ({
    value: account?.id,
    label: account?.name
  }));

  // Contact stage options based on the database ENUM
  const stageOptions = [
    { value: 'Identified', label: 'Identified' },
    { value: 'Reached', label: 'Reached' },
    { value: 'DM Confirmed', label: 'DM Confirmed' },
    { value: 'Engaged', label: 'Engaged' },
    { value: 'Dormant', label: 'Dormant' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Contact"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Debug info - remove in production */}
        {process.env?.NODE_ENV === 'development' && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-xs">
            <p>Debug: {accounts?.length || 0} accounts loaded</p>
            {loadingAccounts && <p>Loading accounts...</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name *"
            value={formData?.first_name}
            onChange={(e) => handleInputChange('first_name', e?.target?.value)}
            placeholder="Enter first name"
            disabled={loading}
            required
          />

          <Input
            label="Last Name *"
            value={formData?.last_name}
            onChange={(e) => handleInputChange('last_name', e?.target?.value)}
            placeholder="Enter last name"
            disabled={loading}
            required
          />

          <Input
            label="Email"
            type="email"
            value={formData?.email}
            onChange={(e) => handleInputChange('email', e?.target?.value)}
            placeholder="contact@example.com"
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
            label="Mobile Phone"
            value={formData?.mobile_phone}
            onChange={(e) => handleInputChange('mobile_phone', e?.target?.value)}
            placeholder="(555) 123-4567"
            disabled={loading}
          />

          <Input
            label="Title"
            value={formData?.title}
            onChange={(e) => handleInputChange('title', e?.target?.value)}
            placeholder="Job title"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="account_select"
            name="account_id"
            label="Account *"
            value={formData?.account_id}
            onChange={(value) => handleInputChange('account_id', value)}
            onSearchChange={() => {}}
            onOpenChange={() => {}}
            options={accountOptions}
            placeholder={
              loadingAccounts 
                ? "Loading accounts..." 
                : accountOptions?.length === 0 
                ? "No accounts available" 
                : "Select an account"
            }
            disabled={loading || loadingAccounts}
            required
            loading={loadingAccounts}
            error=""
            description=""
          />

          <Select
            id="stage_select"
            name="stage"
            label="Contact Stage"
            value={formData?.stage}
            onChange={(value) => handleInputChange('stage', value)}
            onSearchChange={() => {}}
            onOpenChange={() => {}}
            options={stageOptions}
            placeholder="Select contact stage"
            disabled={loading}
            error=""
            description=""
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_primary_contact"
            checked={formData?.is_primary_contact}
            onChange={(checked) => handleInputChange('is_primary_contact', checked)}
            disabled={loading}
          />
          <label htmlFor="is_primary_contact" className="text-sm text-foreground">
            Set as primary contact for this account
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            value={formData?.notes}
            onChange={(e) => handleInputChange('notes', e?.target?.value)}
            placeholder="Additional notes about this contact..."
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
            {loading ? 'Adding Contact...' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddContactModal;