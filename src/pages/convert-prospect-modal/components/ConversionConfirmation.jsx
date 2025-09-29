import React from 'react';
import { CheckCircle, Building, ArrowRight, Phone, Mail, Globe, MapPin, FileText, Users } from 'lucide-react';

const ConversionConfirmation = ({ 
  prospect, 
  conversionData, 
  duplicateAccounts,
  loading, 
  onConfirm, 
  onBack, 
  onCancel 
}) => {
  const isLinkingToExisting = !conversionData?.createNew && conversionData?.selectedAccountId;
  const selectedAccount = duplicateAccounts?.find(acc => acc?.account_id === conversionData?.selectedAccountId);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Conversion Summary Header */}
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {isLinkingToExisting ? 'Link Prospect to Existing Account' : 'Create New Account from Prospect'}
          </h3>
          <div className="flex items-center text-sm text-gray-600">
            <Building className="w-4 h-4 mr-1" />
            Review & Confirm
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="text-center">
            <div className="p-3 bg-white rounded-lg shadow-sm mb-2">
              <Building className="w-6 h-6 text-blue-600 mx-auto" />
            </div>
            <div className="font-medium text-gray-900">{prospect?.name}</div>
            <div className="text-gray-500">Prospect</div>
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-400" />
          
          <div className="text-center">
            <div className="p-3 bg-white rounded-lg shadow-sm mb-2">
              {isLinkingToExisting ? (
                <Users className="w-6 h-6 text-orange-600 mx-auto" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
              )}
            </div>
            <div className="font-medium text-gray-900">
              {isLinkingToExisting ? selectedAccount?.account_name : conversionData?.accountData?.name}
            </div>
            <div className="text-gray-500">
              {isLinkingToExisting ? 'Existing Account' : 'New Account'}
            </div>
          </div>
        </div>
      </div>
      {/* Conversion Details */}
      <div className="space-y-6">
        {/* Account Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2 text-blue-600" />
            {isLinkingToExisting ? 'Target Account Details' : 'New Account Details'}
          </h4>
          
          {isLinkingToExisting ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Account Name:</span>
                  <span className="text-gray-700">{selectedAccount?.account_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Match Type:</span>
                  <span className="text-gray-700 capitalize">
                    {selectedAccount?.match_type?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Similarity:</span>
                  <span className="text-gray-700">
                    {Math.round(parseFloat(selectedAccount?.similarity_score || 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-600">Company Name:</span>
                  <span className="text-gray-900">{conversionData?.accountData?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-600">Company Type:</span>
                  <span className="text-gray-900">{conversionData?.accountData?.companyType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-600">Initial Stage:</span>
                  <span className="text-gray-900">{conversionData?.accountData?.stage}</span>
                </div>
                {conversionData?.accountData?.email && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600 flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      Email:
                    </span>
                    <span className="text-gray-900">{conversionData?.accountData?.email}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {conversionData?.accountData?.phone && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600 flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      Phone:
                    </span>
                    <span className="text-gray-900">{conversionData?.accountData?.phone}</span>
                  </div>
                )}
                {conversionData?.accountData?.website && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600 flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      Website:
                    </span>
                    <span className="text-gray-900">{conversionData?.accountData?.website}</span>
                  </div>
                )}
                {(conversionData?.accountData?.city || conversionData?.accountData?.state) && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Location:
                    </span>
                    <span className="text-gray-900">
                      {[conversionData?.accountData?.city, conversionData?.accountData?.state]?.filter(Boolean)?.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Research Data Transfer */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-purple-600" />
            Research Data Transfer
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900 mb-1">ICP Score</div>
              <div className="text-gray-700">{prospect?.icp_fit_score || 'N/A'}/100</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900 mb-1">Source</div>
              <div className="text-gray-700 capitalize">
                {prospect?.source?.replace('_', ' ') || 'N/A'}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900 mb-1">Research Tags</div>
              <div className="text-gray-700">
                {prospect?.tags?.length ? `${prospect?.tags?.length} tags` : 'No tags'}
              </div>
            </div>
            {prospect?.property_count_estimate && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Properties</div>
                <div className="text-gray-700">{prospect?.property_count_estimate} estimated</div>
              </div>
            )}
            {prospect?.sqft_estimate && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Square Footage</div>
                <div className="text-gray-700">{prospect?.sqft_estimate?.toLocaleString()} sq ft</div>
              </div>
            )}
            {prospect?.building_types?.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900 mb-1">Building Types</div>
                <div className="text-gray-700">
                  {prospect?.building_types?.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversion Notes */}
        {conversionData?.notes && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              Conversion Notes
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{conversionData?.notes}</p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-blue-900 mb-3">
            What will happen next?
          </h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-blue-600" />
              {isLinkingToExisting ? 
                'Prospect will be linked to the existing account' : 'New account will be created with the provided information'
              }
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-blue-600" />
              Prospect status will be updated to "converted"
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-blue-600" />
              {isLinkingToExisting ? 
                'A follow-up task will be created on the existing account' : 'You will be assigned as the primary rep for this account'
              }
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-blue-600" />
              A review task will be created for your manager
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-blue-600" />
              All research data and notes will be preserved
            </li>
          </ul>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex justify-between space-x-3 pt-6 border-t border-gray-200 mt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back to Review
        </button>
        
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Converting...' : `${isLinkingToExisting ? 'Link' : 'Create'} Account`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversionConfirmation;