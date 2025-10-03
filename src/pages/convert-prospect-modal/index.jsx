import React, { useState } from 'react';
import { X, Building2, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';
import { accountsService } from '../../services/accountsService';
import { prospectsService } from '../../services/prospectsService';

// Company type mapping from prospect values to account enum values
const COMPANY_TYPE_MAPPING = {
  // Lowercase/mixed case prospect values -> Proper enum values
  'property management': 'Property Management',
  'general contractor': 'General Contractor',
  'developer': 'Developer',
  'reit/institutional investor': 'REIT/Institutional Investor',
  'asset manager': 'Asset Manager',
  'building owner': 'Building Owner',
  'facility manager': 'Facility Manager',
  'roofing contractor': 'Roofing Contractor',
  'insurance': 'Insurance',
  'architecture/engineering': 'Architecture/Engineering',
  'commercial office': 'Commercial Office',
  'retail': 'Retail',
  'healthcare': 'Healthcare',
  'affiliate: manufacturer': 'Affiliate: Manufacturer',
  'affiliate: real estate': 'Affiliate: Real Estate',
  // Also handle already properly capitalized values
  'Property Management': 'Property Management',
  'General Contractor': 'General Contractor',
  'Developer': 'Developer',
  'REIT/Institutional Investor': 'REIT/Institutional Investor',
  'Asset Manager': 'Asset Manager',
  'Building Owner': 'Building Owner',
  'Facility Manager': 'Facility Manager',
  'Roofing Contractor': 'Roofing Contractor',
  'Insurance': 'Insurance',
  'Architecture/Engineering': 'Architecture/Engineering',
  'Commercial Office': 'Commercial Office',
  'Retail': 'Retail',
  'Healthcare': 'Healthcare',
  'Affiliate: Manufacturer': 'Affiliate: Manufacturer',
  'Affiliate: Real Estate': 'Affiliate: Real Estate'
};

const mapCompanyType = (prospectCompanyType) => {
  if (!prospectCompanyType) return 'Property Management'; // Default fallback
  
  // Try exact match first
  if (COMPANY_TYPE_MAPPING?.[prospectCompanyType]) {
    return COMPANY_TYPE_MAPPING?.[prospectCompanyType];
  }
  
  // Try lowercase match
  const lowerCaseMatch = COMPANY_TYPE_MAPPING?.[prospectCompanyType?.toLowerCase()];
  if (lowerCaseMatch) {
    return lowerCaseMatch;
  }
  
  // Default fallback
  return 'Property Management';
};

const AddAccountModal = ({ 
  prospect, 
  isOpen, 
  onClose, 
  onConversionSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddAccount = async () => {
    if (!prospect) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log('Adding account from prospect:', prospect?.name);
      console.log('Original company_type:', prospect?.company_type);
      
      // Map company type properly
      const mappedCompanyType = mapCompanyType(prospect?.company_type);
      console.log('Mapped company_type:', mappedCompanyType);
      
      // Create account data from prospect
      const accountData = {
        name: prospect?.name || '',
        company_type: mappedCompanyType, // Use mapped value
        phone: prospect?.phone || '',
        website: prospect?.website || '',
        address: prospect?.address || '',
        city: prospect?.city || '',
        state: prospect?.state || '',
        zip_code: prospect?.zip_code || '', 
        notes: prospect?.notes ? `From prospect: ${prospect?.notes}` : `Added from prospects page on ${new Date()?.toLocaleDateString()}`
      };

      console.log('Account data to create:', accountData);

      // Create the new account
      const accountResult = await accountsService?.createAccount(accountData);
      
      if (accountResult?.error) {
        setError(`Failed to create account: ${accountResult?.error}`);
        return;
      }

      console.log('Account created successfully:', accountResult?.data?.id);

      // Update prospect status to converted 
      const prospectResult = await prospectsService?.updateProspect(prospect?.id, {
        status: 'converted',
        linked_account_id: accountResult?.data?.id,
        notes: (prospect?.notes || '') + ` [Converted to account on ${new Date()?.toLocaleDateString()}]`
      });

      if (prospectResult?.error) {
        console.warn('Account created but failed to update prospect status:', prospectResult?.error);
        // Continue anyway since the account was created successfully
      }

      // Call success handler
      onConversionSuccess?.({
        success: true,
        message: `Successfully added "${prospect?.name}" to your accounts!`,
        accountId: accountResult?.data?.id,
        prospectId: prospect?.id,
        conversionType: 'new'
      });

      handleClose();
      
    } catch (error) {
      console.error('Error adding account from prospect:', error);
      setError('Failed to add account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose?.();
    }
  };

  if (!isOpen || !prospect) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Plus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add Account</h2>
              <p className="text-sm text-gray-600">Add "{prospect?.name}" to your accounts</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleClose}
            disabled={loading}
            className="p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Prospect Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Building2 className="w-5 h-5 text-gray-500" />
              <h3 className="font-medium text-gray-900">{prospect?.name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Type:</span>{' '}
                <span className="text-gray-900">{prospect?.company_type || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-gray-500">Location:</span>{' '}
                <span className="text-gray-900">
                  {prospect?.city && prospect?.state ? `${prospect?.city}, ${prospect?.state}` : 'Not specified'}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This will create a new account with the prospect's information and mark the prospect as converted.
              You can then manage this company from your accounts page.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddAccount}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;