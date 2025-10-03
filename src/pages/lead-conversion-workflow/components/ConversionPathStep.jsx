import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';

const CONVERSION_PATHS = {
  NEW_PROSPECT: 'new_prospect',
  EXISTING_ACCOUNT: 'existing_account',
  NEW_PROPERTY: 'new_property'
};

const ConversionPathStep = ({ leadData, duplicateAccounts, onComplete, onBack }) => {
  const [selectedPath, setSelectedPath] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);

  const pathOptions = [
    {
      id: CONVERSION_PATHS?.NEW_PROSPECT,
      title: 'Create New Account',
      description: 'Create a new account for this prospect with basic company information',
      icon: '🏢',
      recommended: duplicateAccounts?.length === 0
    },
    {
      id: CONVERSION_PATHS?.EXISTING_ACCOUNT,
      title: 'Link to Existing Account',
      description: 'Connect this lead to an existing account in your CRM',
      icon: '🔗',
      recommended: duplicateAccounts?.length > 0,
      disabled: duplicateAccounts?.length === 0
    },
    {
      id: CONVERSION_PATHS?.NEW_PROPERTY,
      title: 'Create Account + Property',
      description: 'Create both an account and a property record for comprehensive tracking',
      icon: '🏘️',
      recommended: false
    }
  ];

  const handlePathSelect = (pathId) => {
    setSelectedPath(pathId);
    setSelectedAccount(null);
  };

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
  };

  const handleContinue = () => {
    if (!selectedPath) return;
    
    onComplete({
      path: selectedPath,
      selectedAccount: selectedAccount
    });
  };

  const isValid = () => {
    if (!selectedPath) return false;
    
    if (selectedPath === CONVERSION_PATHS?.EXISTING_ACCOUNT) {
      return selectedAccount !== null;
    }
    
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Choose Conversion Path
        </h3>
        <p className="text-sm text-muted-foreground">
          Select how you want to convert this lead. This determines what records will be created in your CRM.
        </p>
      </div>
      {/* Path Options */}
      <div className="space-y-3">
        {pathOptions?.map((option) => (
          <div
            key={option?.id}
            className={cn(
              'relative border rounded-lg p-4 cursor-pointer transition-all',
              {
                'border-primary bg-primary/5 ring-2 ring-primary/20': selectedPath === option?.id,
                'border-border hover:border-primary/50': selectedPath !== option?.id && !option?.disabled,
                'border-muted bg-muted/30 cursor-not-allowed opacity-60': option?.disabled
              }
            )}
            onClick={() => !option?.disabled && handlePathSelect(option?.id)}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{option?.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground">{option?.title}</h4>
                  {option?.recommended && (
                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      Recommended
                    </span>
                  )}
                  {option?.disabled && (
                    <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                      Not Available
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{option?.description}</p>
              </div>
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                {
                  'border-primary bg-primary': selectedPath === option?.id,
                  'border-muted': selectedPath !== option?.id
                }
              )}>
                {selectedPath === option?.id && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Account Selection for Existing Account Path */}
      {selectedPath === CONVERSION_PATHS?.EXISTING_ACCOUNT && duplicateAccounts?.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="font-medium text-foreground mb-4">
            Select Existing Account
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {duplicateAccounts?.map((account, index) => (
              <div
                key={account?.id || index}
                className={cn(
                  'border rounded-lg p-3 cursor-pointer transition-all',
                  {
                    'border-primary bg-primary/5': selectedAccount?.id === account?.id,
                    'border-border hover:border-primary/50': selectedAccount?.id !== account?.id
                  }
                )}
                onClick={() => handleAccountSelect(account)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-sm">{account?.name}</h5>
                      <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                        {account?.stage}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{account?.company_type}</p>
                      <p>{account?.city}, {account?.state}</p>
                      {account?.assigned_rep && (
                        <p>Assigned to: {account?.assigned_rep}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs text-muted-foreground">
                      Match: {account?.similarity_score ? `${Math.round(account?.similarity_score * 100)}%` : 'High'}
                    </div>
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      {
                        'border-primary bg-primary': selectedAccount?.id === account?.id,
                        'border-muted': selectedAccount?.id !== account?.id
                      }
                    )}>
                      {selectedAccount?.id === account?.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Lead Information Summary */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-3">Lead Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Company:</span>
            <p className="font-medium">{leadData?.name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span>
            <p className="font-medium">{leadData?.company_type}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Location:</span>
            <p className="font-medium">{leadData?.city}, {leadData?.state}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Source:</span>
            <p className="font-medium">{leadData?.source || 'Unknown'}</p>
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          iconName="ArrowLeft"
          className="sm:w-auto"
        >
          Back
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={!isValid()}
          className="flex-1"
          iconName="ArrowRight"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default ConversionPathStep;