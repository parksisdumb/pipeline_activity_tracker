import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

import { contactsService } from '../../../services/contactsService';

const PropertyEditor = ({ property, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: property?.name || '',
    address: property?.address || '',
    city: property?.city || '',
    state: property?.state || '',
    zip_code: property?.zip_code || '',
    building_type: property?.building_type || '',
    roof_type: property?.roof_type || '',
    square_footage: property?.square_footage || '',
    year_built: property?.year_built || '',
    notes: property?.notes || ''
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Database enum values - exact matches
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

  // Load contacts for the property's account
  useEffect(() => {
    if (property?.account_id) {
      loadContactsForAccount(property?.account_id);
    }
  }, [property?.account_id]);

  const loadContactsForAccount = async (accountId) => {
    if (!accountId) return;
    
    setLoadingContacts(true);
    try {
      const result = await contactsService?.getContactsByAccount(accountId);
      if (result?.success) {
        setContacts(result?.data || []);
      } else {
        console.error('Failed to load contacts:', result?.error);
        setContacts([]);
      }
    } catch (err) {
      console.error('Load contacts error:', err);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.name?.trim()) {
      newErrors.name = 'Property name is required';
    }

    if (!formData?.address?.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData?.building_type) {
      newErrors.building_type = 'Building type is required';
    }

    // Validate square footage if provided
    if (formData?.square_footage && (isNaN(formData?.square_footage) || parseInt(formData?.square_footage) < 0)) {
      newErrors.square_footage = 'Square footage must be a valid positive number';
    }

    // Validate year built if provided
    if (formData?.year_built) {
      const year = parseInt(formData?.year_built);
      const currentYear = new Date()?.getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear + 5) {
        newErrors.year_built = `Year built must be between 1800 and ${currentYear + 5}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Convert numeric fields
      const updateData = {
        ...formData,
        square_footage: formData?.square_footage ? parseInt(formData?.square_footage) : null,
        year_built: formData?.year_built ? parseInt(formData?.year_built) : null
      };

      await onSave?.(updateData);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Transform data for Select components
  const buildingTypeOptions = buildingTypes?.map(type => ({
    value: type,
    label: type
  }));

  const roofTypeOptions = roofTypes?.map(type => ({
    value: type,
    label: type
  }));

  const contactOptions = contacts?.map(contact => ({
    value: contact?.id,
    label: `${contact?.first_name} ${contact?.last_name}${contact?.title ? ` - ${contact?.title}` : ''}${contact?.is_primary_contact ? ' (Primary)' : ''}`
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Edit Property</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            iconName="X"
          />
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Property Name *"
                  value={formData?.name}
                  onChange={(e) => handleInputChange('name', e?.target?.value)}
                  error={errors?.name}
                  placeholder="Enter property name"
                />
              </div>
              
              <div className="md:col-span-2">
                <Input
                  label="Address *"
                  value={formData?.address}
                  onChange={(e) => handleInputChange('address', e?.target?.value)}
                  error={errors?.address}
                  placeholder="Enter street address"
                />
              </div>

              <Input
                label="City"
                value={formData?.city}
                onChange={(e) => handleInputChange('city', e?.target?.value)}
                placeholder="Enter city"
              />

              <Input
                label="State"
                value={formData?.state}
                onChange={(e) => handleInputChange('state', e?.target?.value)}
                placeholder="Enter state"
              />

              <Input
                label="ZIP Code"
                value={formData?.zip_code}
                onChange={(e) => handleInputChange('zip_code', e?.target?.value)}
                placeholder="Enter ZIP code"
              />
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Property Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Building Type *"
                value={formData?.building_type}
                onChange={(value) => handleInputChange('building_type', value)}
                options={buildingTypeOptions}
                error={errors?.building_type}
                placeholder="Select building type"
                id="building_type"
                name="building_type"
                onSearchChange={() => {}}
                onOpenChange={() => {}}
                description=""
              />

              <Select
                label="Roof Type"
                value={formData?.roof_type}
                onChange={(value) => handleInputChange('roof_type', value)}
                options={roofTypeOptions}
                placeholder="Select roof type"
                id="roof_type"
                name="roof_type"
                onSearchChange={() => {}}
                onOpenChange={() => {}}
                description=""
              />

              <Input
                label="Square Footage"
                type="number"
                value={formData?.square_footage}
                onChange={(e) => handleInputChange('square_footage', e?.target?.value)}
                error={errors?.square_footage}
                placeholder="Enter square footage"
              />

              <Input
                label="Year Built"
                type="number"
                value={formData?.year_built}
                onChange={(e) => handleInputChange('year_built', e?.target?.value)}
                error={errors?.year_built}
                placeholder="Enter year built"
              />
            </div>
          </div>

          {/* Contact Assignment */}
          {property?.account && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Contact Information</h3>
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Account
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {property?.account?.name} ({property?.account?.company_type})
                    </p>
                  </div>
                  
                  <Select
                    label="Primary Contact (Optional)"
                    value=""
                    onChange={(value) => {
                      // This is for display only - contacts are managed at account level
                      console.log('Contact selected for reference:', value);
                    }}
                    options={contactOptions}
                    placeholder={
                      loadingContacts 
                        ? "Loading contacts..." 
                        : contacts?.length === 0 
                          ? "No contacts available" : "View account contacts"
                    }
                    disabled={loadingContacts}
                    clearable
                    id="primary_contact"
                    name="primary_contact"
                    onSearchChange={() => {}}
                    onOpenChange={() => {}}
                    description=""
                  />
                </div>
                
                {contacts?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Available contacts for this account:
                    </p>
                    <div className="space-y-1">
                      {contacts?.slice(0, 3)?.map(contact => (
                        <p key={contact?.id} className="text-xs text-muted-foreground">
                          • {contact?.first_name} {contact?.last_name}
                          {contact?.title && ` - ${contact?.title}`}
                          {contact?.is_primary_contact && ' (Primary)'}
                        </p>
                      ))}
                      {contacts?.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          + {contacts?.length - 3} more contacts
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
            <textarea
              value={formData?.notes}
              onChange={(e) => handleInputChange('notes', e?.target?.value)}
              placeholder="Add any notes about this property..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} loading={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyEditor;