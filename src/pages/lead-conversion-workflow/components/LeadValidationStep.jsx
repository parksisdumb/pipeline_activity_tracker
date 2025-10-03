import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { prospectsService } from '../../../services/prospectsService';


const LeadValidationStep = ({ leadData, duplicateAccounts, onComplete, onError }) => {
  const [formData, setFormData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);

  useEffect(() => {
    if (leadData) {
      setFormData({
        name: leadData?.name || '',
        company_type: leadData?.company_type || '',
        phone: leadData?.phone || '',
        website: leadData?.website || '',
        address: leadData?.address || '',
        city: leadData?.city || '',
        state: leadData?.state || '',
        zip_code: leadData?.zip_code || '',
        notes: leadData?.notes || '',
        estimated_property_value: '',
        roof_condition_score: '',
        tags: leadData?.tags || []
      });
    }
    
    if (duplicateAccounts?.length > 0) {
      setShowDuplicates(true);
    }
  }, [leadData, duplicateAccounts]);

  const companyTypes = [
    'Property Management',
    'General Contractor', 
    'Developer',
    'REIT/Institutional Investor',
    'Asset Manager',
    'Building Owner',
    'Facility Manager',
    'Roofing Contractor',
    'Insurance',
    'Architecture/Engineering',
    'Commercial Office',
    'Retail',
    'Healthcare',
    'Affiliate: Manufacturer',
    'Affiliate: Real Estate'
  ];

  const validateForm = () => {
    const errors = {};
    
    if (!formData?.name?.trim()) {
      errors.name = 'Company name is required';
    }
    
    if (!formData?.company_type) {
      errors.company_type = 'Company type is required';
    }
    
    if (formData?.phone && !/^[\+]?[1-9][\d]{0,15}$/?.test(formData?.phone?.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (formData?.website && !/^https?:\/\/.+/?.test(formData?.website)) {
      if (!formData?.website?.startsWith('http')) {
        // Auto-fix website URL
        setFormData(prev => ({
          ...prev,
          website: `https://${formData?.website}`
        }));
      } else {
        errors.website = 'Please enter a valid website URL';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsUpdating(true);
    onError('');
    
    try {
      const updates = {
        name: formData?.name,
        company_type: formData?.company_type,
        phone: formData?.phone,
        website: formData?.website,
        address: formData?.address,
        city: formData?.city,
        state: formData?.state,
        zip_code: formData?.zip_code,
        notes: formData?.notes,
        tags: formData?.tags
      };
      
      const result = await prospectsService?.updateProspect(leadData?.id, updates);
      
      if (result?.error) {
        onError(`Failed to update lead: ${result?.error}`);
        return;
      }
      
      // Success - pass updated data to parent
      onComplete({
        updatedLead: { ...leadData, ...updates }
      });
      
    } catch (error) {
      console.error('Error updating lead:', error);
      onError('Failed to update lead information');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleContinueWithoutChanges = () => {
    onComplete({
      updatedLead: leadData
    });
  };

  if (!leadData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No lead data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Validate Lead Information
        </h3>
        <p className="text-sm text-muted-foreground">
          Review and update the lead information before conversion. This data will be used to create the account and property records.
        </p>
      </div>
      {/* Duplicate Accounts Warning */}
      {showDuplicates && duplicateAccounts?.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-warning mb-1">
                Potential Duplicate Accounts Found
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {duplicateAccounts?.length} similar account{duplicateAccounts?.length !== 1 ? 's' : ''} found. 
                You may want to link to an existing account instead of creating a new one.
              </p>
              <div className="space-y-2">
                {duplicateAccounts?.slice(0, 3)?.map((account, index) => (
                  <div key={account?.id || index} className="bg-background rounded p-3 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{account?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account?.company_type} • {account?.city}, {account?.state}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Match: {account?.similarity_score ? `${Math.round(account?.similarity_score * 100)}%` : 'High'}
                      </div>
                    </div>
                  </div>
                ))}
                {duplicateAccounts?.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{duplicateAccounts?.length - 3} more matches found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Company Name"
            value={formData?.name}
            onChange={(e) => handleInputChange('name', e?.target?.value)}
            error={validationErrors?.name}
            required
          />
        </div>
        
        <Select
          label="Company Type"
          value={formData?.company_type}
          onChange={(value) => handleInputChange('company_type', value)}
          error={validationErrors?.company_type}
          required
          id="company_type"
          name="company_type"
          onSearchChange={() => {}}
          onOpenChange={() => {}}
        >
          <option value="">Select company type</option>
          {companyTypes?.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
        
        <Input
          label="Phone Number"
          value={formData?.phone}
          onChange={(e) => handleInputChange('phone', e?.target?.value)}
          error={validationErrors?.phone}
          placeholder="+1 (555) 123-4567"
        />
        
        <Input
          label="Website"
          value={formData?.website}
          onChange={(e) => handleInputChange('website', e?.target?.value)}
          error={validationErrors?.website}
          placeholder="https://company.com"
        />
        
        <Input
          label="Address"
          value={formData?.address}
          onChange={(e) => handleInputChange('address', e?.target?.value)}
        />
        
        <Input
          label="City"
          value={formData?.city}
          onChange={(e) => handleInputChange('city', e?.target?.value)}
        />
        
        <Input
          label="State"
          value={formData?.state}
          onChange={(e) => handleInputChange('state', e?.target?.value)}
          placeholder="TX"
        />
        
        <Input
          label="ZIP Code"
          value={formData?.zip_code}
          onChange={(e) => handleInputChange('zip_code', e?.target?.value)}
          placeholder="12345"
        />
      </div>
      {/* Assessment Fields */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-foreground mb-4">Property Assessment</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Estimated Project Value"
            type="number"
            value={formData?.estimated_property_value}
            onChange={(e) => handleInputChange('estimated_property_value', e?.target?.value)}
            placeholder="50000"
          />
          
          <Select
            label="Roof Condition Score"
            value={formData?.roof_condition_score}
            onChange={(value) => handleInputChange('roof_condition_score', value)}
            id="roof_condition_score"
            name="roof_condition_score"
            onSearchChange={() => {}}
            onOpenChange={() => {}}
          >
            <option value="">Select condition</option>
            <option value="1">1 - Poor (Immediate attention needed)</option>
            <option value="2">2 - Fair (Repairs needed)</option>
            <option value="3">3 - Good (Minor maintenance)</option>
            <option value="4">4 - Very Good (Preventive maintenance)</option>
            <option value="5">5 - Excellent (No issues)</option>
          </Select>
        </div>
      </div>
      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Notes
        </label>
        <textarea
          className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground resize-none"
          value={formData?.notes}
          onChange={(e) => handleInputChange('notes', e?.target?.value)}
          placeholder="Additional notes about this lead..."
        />
      </div>
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
        <Button
          onClick={handleSaveChanges}
          loading={isUpdating}
          className="flex-1"
          iconName="Save"
        >
          Update & Continue
        </Button>
        
        <Button
          variant="outline"
          onClick={handleContinueWithoutChanges}
          className="flex-1"
          iconName="ArrowRight"
        >
          Continue Without Changes
        </Button>
      </div>
    </div>
  );
};

export default LeadValidationStep;