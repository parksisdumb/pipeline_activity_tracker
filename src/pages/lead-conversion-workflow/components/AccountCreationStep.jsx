import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';


const CONVERSION_PATHS = {
  NEW_PROSPECT: 'new_prospect',
  NEW_PROPERTY: 'new_property'
};

const AccountCreationStep = ({ leadData, conversionPath, onComplete, onBack }) => {
  const [accountData, setAccountData] = useState({});
  const [propertyData, setPropertyData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [createProperty, setCreateProperty] = useState(conversionPath === CONVERSION_PATHS?.NEW_PROPERTY);

  useEffect(() => {
    if (leadData) {
      // Pre-populate account data from lead
      setAccountData({
        name: leadData?.name || '',
        company_type: leadData?.company_type || 'Property Management',
        phone: leadData?.phone || '',
        email: '',
        website: leadData?.website || '',
        address: leadData?.address || '',
        city: leadData?.city || '',
        state: leadData?.state || '',
        zip_code: leadData?.zip_code || '',
        notes: leadData?.notes || '',
        stage: 'Prospect',
        territory_assignment: '',
        initial_opportunity_stage: 'identified',
        estimated_revenue_potential: ''
      });

      // Pre-populate property data if needed
      if (conversionPath === CONVERSION_PATHS?.NEW_PROPERTY) {
        setPropertyData({
          name: `${leadData?.name} - Main Property`,
          address: leadData?.address || '',
          city: leadData?.city || '',
          state: leadData?.state || '',
          zip_code: leadData?.zip_code || '',
          building_type: 'Commercial Office',
          square_footage: '',
          year_built: '',
          roof_type: '',
          stage: 'Unassessed',
          notes: ''
        });
      }
    }
  }, [leadData, conversionPath]);

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

  const accountStages = [
    'Prospect',
    'Contacted',
    'Vendor Packet Request',
    'Vendor Packet Submitted',
    'Approved for Work',
    'Actively Engaged'
  ];

  const buildingTypes = [
    'Industrial',
    'Warehouse',
    'Manufacturing',
    'Hospitality',
    'Multifamily',
    'Commercial Office',
    'Retail',
    'Healthcare'
  ];

  const roofTypes = [
    'TPO',
    'EPDM',
    'Metal',
    'Modified Bitumen',
    'Shingle',
    'PVC',
    'BUR'
  ];

  const propertyStages = [
    'Unassessed',
    'Assessment Scheduled',
    'Assessed',
    'Proposal Sent',
    'In Negotiation',
    'Won',
    'Lost'
  ];

  const validateForm = () => {
    const errors = {};
    
    // Account validation
    if (!accountData?.name?.trim()) {
      errors.account_name = 'Account name is required';
    }
    
    if (!accountData?.company_type) {
      errors.company_type = 'Company type is required';
    }

    if (accountData?.phone && !/^[\+]?[1-9][\d]{0,15}$/?.test(accountData?.phone?.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (accountData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(accountData?.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Property validation (if creating property)
    if (createProperty) {
      if (!propertyData?.name?.trim()) {
        errors.property_name = 'Property name is required';
      }
      
      if (!propertyData?.address?.trim()) {
        errors.property_address = 'Property address is required';
      }
      
      if (!propertyData?.building_type) {
        errors.building_type = 'Building type is required';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleAccountInputChange = (field, value) => {
    setAccountData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handlePropertyInputChange = (field, value) => {
    setPropertyData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleContinue = () => {
    if (!validateForm()) {
      return;
    }

    onComplete({
      accountData,
      propertyData: createProperty ? propertyData : {}
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {conversionPath === CONVERSION_PATHS?.NEW_PROPERTY ? 'Create Account & Property' : 'Create New Account'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Set up the account information and relationship mapping for your sales pipeline.
        </p>
      </div>
      {/* Account Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground border-b pb-2">Account Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Account Name"
              value={accountData?.name}
              onChange={(e) => handleAccountInputChange('name', e?.target?.value)}
              error={validationErrors?.account_name}
              required
            />
          </div>
          
          <Select
            label="Company Type"
            value={accountData?.company_type}
            onChange={(value) => handleAccountInputChange('company_type', value)}
            error={validationErrors?.company_type}
            required
            id="company-type"
            name="company_type"
            description=""
            onSearchChange={() => {}}
            onOpenChange={() => {}}
            ref={null}
          >
            {companyTypes?.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
          
          <Select
            label="Account Stage"
            value={accountData?.stage}
            onChange={(value) => handleAccountInputChange('stage', value)}
            id="account-stage"
            name="stage"
            description=""
            onSearchChange={() => {}}
            onOpenChange={() => {}}
            ref={null}
          >
            {accountStages?.map(stage => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </Select>
          
          <Input
            label="Phone Number"
            value={accountData?.phone}
            onChange={(e) => handleAccountInputChange('phone', e?.target?.value)}
            error={validationErrors?.phone}
            placeholder="+1 (555) 123-4567"
          />
          
          <Input
            label="Email Address"
            value={accountData?.email}
            onChange={(e) => handleAccountInputChange('email', e?.target?.value)}
            error={validationErrors?.email}
            placeholder="contact@company.com"
          />
          
          <div className="md:col-span-2">
            <Input
              label="Website"
              value={accountData?.website}
              onChange={(e) => handleAccountInputChange('website', e?.target?.value)}
              placeholder="https://company.com"
            />
          </div>
        </div>
      </div>
      {/* Address Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground border-b pb-2">Address Information</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Address"
              value={accountData?.address}
              onChange={(e) => handleAccountInputChange('address', e?.target?.value)}
              placeholder="123 Main Street"
            />
          </div>
          
          <Input
            label="City"
            value={accountData?.city}
            onChange={(e) => handleAccountInputChange('city', e?.target?.value)}
            placeholder="Houston"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="State"
              value={accountData?.state}
              onChange={(e) => handleAccountInputChange('state', e?.target?.value)}
              placeholder="TX"
            />
            <Input
              label="ZIP Code"
              value={accountData?.zip_code}
              onChange={(e) => handleAccountInputChange('zip_code', e?.target?.value)}
              placeholder="77001"
            />
          </div>
        </div>
      </div>
      {/* Pipeline Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground border-b pb-2">Pipeline Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Territory Assignment"
            value={accountData?.territory_assignment}
            onChange={(e) => handleAccountInputChange('territory_assignment', e?.target?.value)}
            placeholder="Central Houston"
          />
          
          <Input
            label="Estimated Revenue Potential"
            type="number"
            value={accountData?.estimated_revenue_potential}
            onChange={(e) => handleAccountInputChange('estimated_revenue_potential', e?.target?.value)}
            placeholder="50000"
          />
        </div>
      </div>
      {/* Property Creation Option */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b pb-2">
          <Checkbox
            checked={createProperty}
            onChange={setCreateProperty}
            id="create-property"
          />
          <label htmlFor="create-property" className="font-medium text-foreground cursor-pointer">
            Create Property Record
          </label>
        </div>

        {createProperty && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Property Name"
                  value={propertyData?.name}
                  onChange={(e) => handlePropertyInputChange('name', e?.target?.value)}
                  error={validationErrors?.property_name}
                  required={createProperty}
                />
              </div>
              
              <div className="md:col-span-2">
                <Input
                  label="Property Address"
                  value={propertyData?.address}
                  onChange={(e) => handlePropertyInputChange('address', e?.target?.value)}
                  error={validationErrors?.property_address}
                  required={createProperty}
                  placeholder="456 Property Lane (can be different from account address)"
                />
              </div>
              
              <Input
                label="City"
                value={propertyData?.city}
                onChange={(e) => handlePropertyInputChange('city', e?.target?.value)}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="State"
                  value={propertyData?.state}
                  onChange={(e) => handlePropertyInputChange('state', e?.target?.value)}
                  placeholder="TX"
                />
                <Input
                  label="ZIP Code"
                  value={propertyData?.zip_code}
                  onChange={(e) => handlePropertyInputChange('zip_code', e?.target?.value)}
                  placeholder="77002"
                />
              </div>
              
              <Select
                label="Building Type"
                value={propertyData?.building_type}
                onChange={(value) => handlePropertyInputChange('building_type', value)}
                error={validationErrors?.building_type}
                required={createProperty}
                id="building-type"
                name="building_type"
                description=""
                onSearchChange={() => {}}
                onOpenChange={() => {}}
                ref={null}
              >
                <option value="">Select building type</option>
                {buildingTypes?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
              
              <Select
                label="Roof Type"
                value={propertyData?.roof_type}
                onChange={(value) => handlePropertyInputChange('roof_type', value)}
                id="roof-type"
                name="roof_type"
                description=""
                onSearchChange={() => {}}
                onOpenChange={() => {}}
                ref={null}
              >
                <option value="">Select roof type</option>
                {roofTypes?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
              
              <Input
                label="Square Footage"
                type="number"
                value={propertyData?.square_footage}
                onChange={(e) => handlePropertyInputChange('square_footage', e?.target?.value)}
                placeholder="50000"
              />
              
              <Input
                label="Year Built"
                type="number"
                value={propertyData?.year_built}
                onChange={(e) => handlePropertyInputChange('year_built', e?.target?.value)}
                placeholder="2010"
              />
            </div>
          </div>
        )}
      </div>
      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Additional Notes
        </label>
        <textarea
          className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground resize-none"
          value={accountData?.notes}
          onChange={(e) => handleAccountInputChange('notes', e?.target?.value)}
          placeholder="Additional notes about this account..."
        />
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
          className="flex-1"
          iconName="ArrowRight"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default AccountCreationStep;