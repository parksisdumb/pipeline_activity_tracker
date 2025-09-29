import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Building } from 'lucide-react';
import { prospectsService } from '../../services/prospectsService';

import { useAuth } from '../../contexts/AuthContext';
import ConversionForm from './components/ConversionForm';
import DuplicateCheckModal from './components/DuplicateCheckModal';
import ConversionConfirmation from './components/ConversionConfirmation';

const ConvertProspectModal = ({ 
  isOpen, 
  onClose, 
  prospect = null, 
  onConversionSuccess 
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState('form'); // 'form', 'duplicates', 'confirmation', 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateAccounts, setDuplicateAccounts] = useState([]);
  const [conversionData, setConversionData] = useState({
    createNew: true,
    selectedAccountId: null,
    notes: '',
    accountData: {}
  });
  const [conversionResult, setConversionResult] = useState(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && prospect) {
      setStep('form');
      setError('');
      setDuplicateAccounts([]);
      setConversionResult(null);
      setConversionData({
        createNew: true,
        selectedAccountId: null,
        notes: '',
        accountData: {
          name: prospect?.name || '',
          companyType: prospect?.company_type || 'Property Management',
          phone: prospect?.phone || '',
          email: '',
          website: prospect?.website || '',
          address: prospect?.address || '',
          city: prospect?.city || '',
          state: prospect?.state || '',
          zipCode: prospect?.zip_code || '',
          stage: 'Prospect'
        }
      });
    }
  }, [isOpen, prospect]);

  const handleClose = () => {
    setStep('form');
    setError('');
    setLoading(false);
    onClose?.();
  };

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    setError('');

    try {
      // Check for duplicates first
      const { data: duplicates, error: duplicateError } = await prospectsService?.findDuplicateAccounts({
        tenantId: user?.userProfile?.tenant_id,
        name: formData?.accountData?.name,
        domain: prospect?.domain,
        phone: formData?.accountData?.phone
      });

      if (duplicateError) {
        setError(`Failed to check for duplicates: ${duplicateError}`);
        setLoading(false);
        return;
      }

      setConversionData(formData);

      if (duplicates && duplicates?.length > 0) {
        setDuplicateAccounts(duplicates);
        setStep('duplicates');
      } else {
        setStep('confirmation');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setError('An unexpected error occurred while processing the conversion.');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateDecision = (decision, selectedAccountId = null) => {
    if (decision === 'link' && selectedAccountId) {
      setConversionData(prev => ({
        ...prev,
        createNew: false,
        selectedAccountId: selectedAccountId
      }));
    } else if (decision === 'create-new') {
      setConversionData(prev => ({
        ...prev,
        createNew: true,
        selectedAccountId: null
      }));
    }
    setStep('confirmation');
  };

  const handleConfirmConversion = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: result, error: conversionError } = await prospectsService?.convertToAccount(
        prospect?.id,
        {
          createNew: conversionData?.createNew,
          existingAccountId: conversionData?.selectedAccountId,
          notes: conversionData?.notes
        }
      );

      if (conversionError) {
        setError(`Conversion failed: ${conversionError}`);
        setLoading(false);
        return;
      }

      setConversionResult(result);
      setStep('success');
      
      // Notify parent component of successful conversion
      onConversionSuccess?.(result);
    } catch (error) {
      console.error('Conversion error:', error);
      setError('An unexpected error occurred during conversion.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Convert Prospect to Account
                </h2>
                <p className="text-sm text-gray-500">
                  {prospect?.name} → Account Creation
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${step === 'form' ? 'text-blue-600' : step === 'duplicates' || step === 'confirmation' || step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'form' ? 'bg-blue-100' : step === 'duplicates' || step === 'confirmation' || step === 'success' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {step === 'duplicates' || step === 'confirmation' || step === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">1</span>
                  )}
                </div>
                <span className="ml-2 text-sm font-medium">Account Details</span>
              </div>
              <div className="flex-1 h-px bg-gray-300" />
              <div className={`flex items-center ${step === 'duplicates' || step === 'confirmation' ? 'text-blue-600' : step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'duplicates' || step === 'confirmation' ? 'bg-blue-100' : step === 'success' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {step === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">2</span>
                  )}
                </div>
                <span className="ml-2 text-sm font-medium">Review & Convert</span>
              </div>
              <div className="flex-1 h-px bg-gray-300" />
              <div className={`flex items-center ${step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'success' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {step === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">3</span>
                  )}
                </div>
                <span className="ml-2 text-sm font-medium">Complete</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Conversion Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Step Content */}
            {step === 'form' && (
              <ConversionForm
                prospect={prospect}
                initialData={conversionData}
                loading={loading}
                onSubmit={handleFormSubmit}
                onCancel={handleClose}
              />
            )}

            {step === 'duplicates' && (
              <DuplicateCheckModal
                prospect={prospect}
                duplicateAccounts={duplicateAccounts}
                onDecision={handleDuplicateDecision}
                loading={loading}
              />
            )}

            {step === 'confirmation' && (
              <ConversionConfirmation
                prospect={prospect}
                conversionData={conversionData}
                duplicateAccounts={duplicateAccounts}
                loading={loading}
                onConfirm={handleConfirmConversion}
                onBack={() => setStep(duplicateAccounts?.length > 0 ? 'duplicates' : 'form')}
                onCancel={handleClose}
              />
            )}

            {step === 'success' && conversionResult && (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Conversion Successful!
                </h3>
                <p className="text-gray-600 mb-6">
                  {conversionResult?.message}
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  {conversionResult?.accountId && (
                    <button
                      onClick={() => {
                        handleClose();
                        // Navigate to account details - you can implement this navigation
                        window.location.href = `/account-details/${conversionResult?.accountId}`;
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Account
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvertProspectModal;