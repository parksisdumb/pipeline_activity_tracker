import React, { useState } from 'react';
import { X, Plus, Building, MapPin, Phone, Hash, Star } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';

const AddProspectModal = ({ isOpen, onClose, onProspectCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    companyType: '',
    employeeCount: '',
    propertyCount: '',
    sqftEstimate: '',
    buildingTypes: [],
    icpFitScore: 70,
    source: 'manual',
    tags: [],
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const companyTypes = [
    { value: 'retail', label: 'Retail' },
    { value: 'office', label: 'Office' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'government', label: 'Government' },
    { value: 'non_profit', label: 'Non-Profit' },
    { value: 'other', label: 'Other' }
  ];

  const sources = [
    { value: 'manual', label: 'Manual Entry' },
    { value: 'referral', label: 'Referral' },
    { value: 'website', label: 'Website' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'trade_show', label: 'Trade Show' },
    { value: 'cold_outreach', label: 'Cold Outreach' },
    { value: 'other', label: 'Other' }
  ];

  const buildingTypeOptions = [
    'Office Building',
    'Retail Center',
    'Warehouse',
    'Manufacturing',
    'Medical Building',
    'Restaurant',
    'Hotel',
    'School',
    'Mixed Use'
  ];

  const usStates = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleBuildingTypesChange = (type) => {
    setFormData(prev => ({
      ...prev,
      buildingTypes: prev?.buildingTypes?.includes(type)
        ? prev?.buildingTypes?.filter(t => t !== type)
        : [...prev?.buildingTypes, type]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.name?.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (formData?.domain && !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/?.test(formData?.domain)) {
      newErrors.domain = 'Please enter a valid domain (e.g., example.com)';
    }

    if (formData?.phone && !/^\+?[\d\s\-\(\)\.]{10,}$/?.test(formData?.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData?.website && !/^https?:\/\/.+\..+/?.test(formData?.website)) {
      newErrors.website = 'Please enter a valid website URL (include http:// or https://)';
    }

    if (formData?.employeeCount && (isNaN(formData?.employeeCount) || parseInt(formData?.employeeCount) < 0)) {
      newErrors.employeeCount = 'Employee count must be a positive number';
    }

    if (formData?.propertyCount && (isNaN(formData?.propertyCount) || parseInt(formData?.propertyCount) < 0)) {
      newErrors.propertyCount = 'Property count must be a positive number';
    }

    if (formData?.sqftEstimate && (isNaN(formData?.sqftEstimate) || parseInt(formData?.sqftEstimate) < 0)) {
      newErrors.sqftEstimate = 'Square footage must be a positive number';
    }

    if (formData?.icpFitScore && (isNaN(formData?.icpFitScore) || formData?.icpFitScore < 0 || formData?.icpFitScore > 100)) {
      newErrors.icpFitScore = 'ICP fit score must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object?.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await onProspectCreated(formData);
      
      if (result?.error) {
        alert('Failed to create prospect: ' + result?.error);
      } else {
        // Reset form
        setFormData({
          name: '',
          domain: '',
          phone: '',
          website: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          companyType: '',
          employeeCount: '',
          propertyCount: '',
          sqftEstimate: '',
          buildingTypes: [],
          icpFitScore: 70,
          source: 'manual',
          tags: [],
          notes: ''
        });
        setErrors({});
        onClose();
      }
    } catch (error) {
      console.error('Error creating prospect:', error);
      alert('Failed to create prospect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        domain: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        companyType: '',
        employeeCount: '',
        propertyCount: '',
        sqftEstimate: '',
        buildingTypes: [],
        icpFitScore: 70,
        source: 'manual',
        tags: [],
        notes: ''
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" title="Add New Prospect">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add New Prospect</h2>
            <p className="text-sm text-gray-600">Create a new prospect company</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="space-y-6">
          {/* Company Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Company Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Company Name"
                  value={formData?.name}
                  onChange={(e) => handleInputChange('name', e?.target?.value)}
                  placeholder="ABC Corporation"
                  required
                  error={errors?.name}
                />
              </div>
              <div>
                <Input
                  label="Domain"
                  value={formData?.domain}
                  onChange={(e) => handleInputChange('domain', e?.target?.value)}
                  placeholder="example.com"
                  error={errors?.domain}
                />
              </div>
              <div>
                <Select
                  label="Company Type"
                  value={formData?.companyType}
                  onChange={(value) => handleInputChange('companyType', value)}
                  onSearchChange={() => {}}
                  options={companyTypes}
                  placeholder="Select company type"
                  error=""
                  id="companyType"
                  onOpenChange={() => {}}
                  name="companyType"
                  description=""
                />
              </div>
              <div>
                <Select
                  label="Source"
                  value={formData?.source}
                  onChange={(value) => handleInputChange('source', value)}
                  onSearchChange={() => {}}
                  options={sources}
                  error=""
                  id="source"
                  onOpenChange={() => {}}
                  name="source"
                  description=""
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Phone Number"
                  value={formData?.phone}
                  onChange={(e) => handleInputChange('phone', e?.target?.value)}
                  placeholder="(555) 123-4567"
                  error={errors?.phone}
                />
              </div>
              <div>
                <Input
                  label="Website"
                  value={formData?.website}
                  onChange={(e) => handleInputChange('website', e?.target?.value)}
                  placeholder="https://example.com"
                  error={errors?.website}
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </h3>
            <div className="space-y-4">
              <Input
                label="Address"
                value={formData?.address}
                onChange={(e) => handleInputChange('address', e?.target?.value)}
                placeholder="123 Main Street"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    label="City"
                    value={formData?.city}
                    onChange={(e) => handleInputChange('city', e?.target?.value)}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Select
                    label="State"
                    value={formData?.state}
                    onChange={(value) => handleInputChange('state', value)}
                    onSearchChange={() => {}}
                    options={usStates}
                    placeholder="Select state"
                    error=""
                    id="state"
                    onOpenChange={() => {}}
                    name="state"
                    description=""
                  />
                </div>
                <div>
                  <Input
                    label="ZIP Code"
                    value={formData?.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e?.target?.value)}
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Hash className="w-4 h-4 mr-2" />
              Business Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  type="number"
                  label="Employee Count"
                  value={formData?.employeeCount}
                  onChange={(e) => handleInputChange('employeeCount', e?.target?.value)}
                  placeholder="50"
                  min="0"
                  error={errors?.employeeCount}
                />
              </div>
              <div>
                <Input
                  type="number"
                  label="Property Count Estimate"
                  value={formData?.propertyCount}
                  onChange={(e) => handleInputChange('propertyCount', e?.target?.value)}
                  placeholder="5"
                  min="0"
                  error={errors?.propertyCount}
                />
              </div>
              <div>
                <Input
                  type="number"
                  label="Total Sq Ft Estimate"
                  value={formData?.sqftEstimate}
                  onChange={(e) => handleInputChange('sqftEstimate', e?.target?.value)}
                  placeholder="10000"
                  min="0"
                  error={errors?.sqftEstimate}
                />
              </div>
            </div>
          </div>

          {/* Building Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Building Types
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {buildingTypeOptions?.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData?.buildingTypes?.includes(type)}
                    onChange={() => handleBuildingTypesChange(type)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ICP Fit Score */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Star className="w-4 h-4 mr-2" />
              ICP Fit Score
            </h3>
            <div className="max-w-xs">
              <Input
                type="number"
                label="Score (0-100)"
                value={formData?.icpFitScore}
                onChange={(e) => handleInputChange('icpFitScore', e?.target?.value)}
                placeholder="70"
                min="0"
                max="100"
                error={errors?.icpFitScore}
              />
              <p className="text-xs text-gray-500 mt-1">
                Rate how well this prospect fits your Ideal Customer Profile (0-100)
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData?.notes}
              onChange={(e) => handleInputChange('notes', e?.target?.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes about this prospect..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Creating...' : 'Create Prospect'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddProspectModal;