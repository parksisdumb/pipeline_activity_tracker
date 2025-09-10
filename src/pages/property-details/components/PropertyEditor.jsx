import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

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
                error={errors?.building_type}
              >
                <option value="">Select building type</option>
                {buildingTypes?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>

              <Select
                label="Roof Type"
                value={formData?.roof_type}
                onChange={(value) => handleInputChange('roof_type', value)}
              >
                <option value="">Select roof type</option>
                {roofTypes?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>

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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="Save" size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyEditor;