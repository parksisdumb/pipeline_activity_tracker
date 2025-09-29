import React, { useState } from 'react';
import { AlertTriangle, Building, Phone, Globe, ExternalLink } from 'lucide-react';

const DuplicateCheckModal = ({ 
  prospect, 
  duplicateAccounts, 
  onDecision, 
  loading 
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [decision, setDecision] = useState(null); // 'link' or 'create-new'

  const handleLinkToExisting = () => {
    if (selectedAccountId) {
      onDecision?.('link', selectedAccountId);
    }
  };

  const handleCreateNew = () => {
    onDecision?.('create-new');
  };

  const getMatchTypeLabel = (matchType) => {
    switch (matchType) {
      case 'domain':
        return { label: 'Domain Match', color: 'bg-red-100 text-red-800', icon: Globe };
      case 'phone':
        return { label: 'Phone Match', color: 'bg-orange-100 text-orange-800', icon: Phone };
      case 'name_similarity':
        return { label: 'Name Similar', color: 'bg-yellow-100 text-yellow-800', icon: Building };
      default:
        return { label: 'Fuzzy Match', color: 'bg-gray-100 text-gray-800', icon: Building };
    }
  };

  const formatSimilarityScore = (score) => {
    return `${Math.round(parseFloat(score || 0) * 100)}%`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Warning Header */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-yellow-800">
            Potential Duplicate Accounts Found
          </h3>
          <p className="text-yellow-700 mt-1">
            We found {duplicateAccounts?.length} potential duplicate account{duplicateAccounts?.length !== 1 ? 's' : ''} 
            for "<strong>{prospect?.name}</strong>". Please review and decide how to proceed.
          </p>
        </div>
      </div>
      {/* Duplicate Accounts List */}
      <div className="space-y-4 mb-8">
        <h4 className="text-lg font-medium text-gray-900">Potential Matches</h4>
        {duplicateAccounts?.map((account, index) => {
          const matchInfo = getMatchTypeLabel(account?.match_type);
          const MatchIcon = matchInfo?.icon;
          
          return (
            <div
              key={account?.account_id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedAccountId === account?.account_id
                  ? 'border-blue-500 bg-blue-50' :'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedAccountId(account?.account_id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <input
                      type="radio"
                      name="selectedAccount"
                      value={account?.account_id}
                      checked={selectedAccountId === account?.account_id}
                      onChange={() => setSelectedAccountId(account?.account_id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="text-lg font-medium text-gray-900">
                        {account?.account_name}
                      </h5>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${matchInfo?.color}`}>
                        <MatchIcon className="w-3 h-3 mr-1" />
                        {matchInfo?.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatSimilarityScore(account?.similarity_score)} similarity
                      </span>
                    </div>
                    
                    {/* Account Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Match Reason:</span>
                        <span className="ml-1 capitalize">
                          {account?.match_type?.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Similarity:</span>
                        <span className="ml-1">
                          {formatSimilarityScore(account?.similarity_score)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* View Account Link */}
                <button
                  onClick={(e) => {
                    e?.stopPropagation();
                    // Open account details in new tab
                    window.open(`/account-details/${account?.account_id}`, '_blank');
                  }}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View account details"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Decision Options */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          How would you like to proceed?
        </h4>
        
        <div className="space-y-4">
          {/* Link to Existing Account */}
          <div
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              decision === 'link' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setDecision('link')}
          >
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="decision"
                value="link"
                checked={decision === 'link'}
                onChange={() => setDecision('link')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <h5 className="text-base font-medium text-gray-900">
                  Link to Existing Account
                </h5>
                <p className="text-sm text-gray-600 mt-1">
                  Mark this prospect as converted and link it to one of the existing accounts above. 
                  No new account will be created.
                </p>
                {decision === 'link' && !selectedAccountId && (
                  <p className="text-sm text-red-600 mt-2">
                    Please select an account to link to from the list above.
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* Create New Account */}
          <div
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              decision === 'create-new' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setDecision('create-new')}
          >
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="decision"
                value="create-new"
                checked={decision === 'create-new'}
                onChange={() => setDecision('create-new')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <h5 className="text-base font-medium text-gray-900">
                  Create New Account Anyway
                </h5>
                <p className="text-sm text-gray-600 mt-1">
                  Proceed with creating a new account despite the potential duplicates. 
                  This should only be used if you're confident this is a different company.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
        <button
          type="button"
          onClick={() => onDecision?.('back')}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back to Form
        </button>
        
        {decision === 'link' && (
          <button
            type="button"
            onClick={handleLinkToExisting}
            disabled={loading || !selectedAccountId}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Linking...' : 'Link to Selected Account'}
          </button>
        )}
        
        {decision === 'create-new' && (
          <button
            type="button"
            onClick={handleCreateNew}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Proceeding...' : 'Create New Account'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DuplicateCheckModal;