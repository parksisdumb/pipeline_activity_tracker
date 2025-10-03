import React from 'react';
import Button from '../../../components/ui/Button';


const ConversionSuccess = ({ result, leadData, onComplete }) => {
  if (!result?.success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-destructive" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Conversion Failed
        </h3>
        <p className="text-muted-foreground">
          Something went wrong during the conversion process.
        </p>
      </div>
    );
  }

  const getConversionTypeLabel = () => {
    switch (result?.conversionType) {
      case 'existing_account':
        return 'Linked to Existing Account';
      case 'new_property':
        return 'Created Account & Property';
      default:
        return 'Created New Account';
    }
  };

  const getConversionIcon = () => {
    switch (result?.conversionType) {
      case 'existing_account':
        return '🔗';
      case 'new_property':
        return '🏘️';
      default:
        return '🏢';
    }
  };

  return (
    <div className="text-center py-8">
      {/* Success Icon */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
        <svg className="w-10 h-10 text-success" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>

      {/* Success Message */}
      <h3 className="text-xl font-semibold text-success mb-2">
        🎉 Conversion Complete!
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {result?.message || `${leadData?.name} has been successfully converted to your CRM.`}
      </p>

      {/* Conversion Summary */}
      <div className="bg-success/5 border border-success/20 rounded-lg p-6 mb-6 text-left">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{getConversionIcon()}</span>
          <h4 className="font-semibold text-foreground">{getConversionTypeLabel()}</h4>
        </div>

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
            <p className="font-medium">{leadData?.source || 'Direct'}</p>
          </div>
        </div>
      </div>

      {/* What Was Created */}
      <div className="space-y-4 mb-8">
        <h4 className="font-medium text-foreground">What was created:</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Account */}
          <div className="bg-background border rounded-lg p-4">
            <div className="text-2xl mb-2">🏢</div>
            <h5 className="font-medium text-foreground mb-1">Account</h5>
            <p className="text-sm text-muted-foreground">
              {result?.conversionType === 'existing_account' ? 'Linked to existing' : 'New account created'}
            </p>
          </div>

          {/* Property */}
          <div className="bg-background border rounded-lg p-4">
            <div className="text-2xl mb-2">🏘️</div>
            <h5 className="font-medium text-foreground mb-1">Property</h5>
            <p className="text-sm text-muted-foreground">
              {result?.propertyId ? 'Property record created' : 'No property created'}
            </p>
          </div>

          {/* Tasks */}
          <div className="bg-background border rounded-lg p-4">
            <div className="text-2xl mb-2">✅</div>
            <h5 className="font-medium text-foreground mb-1">Follow-up Tasks</h5>
            <p className="text-sm text-muted-foreground">
              {result?.tasksCount || 0} task{result?.tasksCount !== 1 ? 's' : ''} created
            </p>
          </div>
        </div>

        {/* Contacts */}
        {result?.contactsCount > 0 && (
          <div className="bg-background border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">👥</div>
                <div>
                  <h5 className="font-medium text-foreground">Contacts Added</h5>
                  <p className="text-sm text-muted-foreground">
                    {result?.contactsCount} contact{result?.contactsCount !== 1 ? 's' : ''} added to account
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Next Steps */}
      <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left">
        <h4 className="font-medium text-foreground mb-3">Next Steps:</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Review the created account and update any missing information
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Complete your follow-up tasks according to the schedule
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Begin outreach to establish relationships with key contacts
          </li>
          {result?.propertyId && (
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Schedule property assessment to move the opportunity forward
            </li>
          )}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onComplete}
          className="flex-1"
          iconName="ExternalLink"
        >
          Go to Account
        </Button>
        
        <Button
          variant="outline"
          onClick={() => window.location.href = '/tasks'}
          className="flex-1"
          iconName="CheckSquare"
        >
          View Tasks
        </Button>
      </div>

      {/* Success Animation */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-success rounded-full animate-ping"></div>
          Lead successfully converted and ready for pipeline progression
        </div>
      </div>
    </div>
  );
};

export default ConversionSuccess;