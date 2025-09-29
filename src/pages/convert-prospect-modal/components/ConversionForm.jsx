import React, { useState } from 'react';
import { Building, Phone, Mail, Globe, MapPin, FileText, Tag } from 'lucide-react';

const ConversionForm = ({ 
  prospect, 
  initialData, 
  loading, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState(initialData);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      accountData: {
        ...prev?.accountData,
        [field]: value
      }
    }));
  };

  const handleNotesChange = (value) => {
    setFormData(prev => ({
      ...prev,
      notes: value
    }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSubmit?.(formData);
  };

  const companyTypes = [
    'Property Management',
    'General Contractor', 
    'Developer',
    'REIT/Institutional Investor',
    'Asset Manager',
    'Building Owner',
    'Facility Manager'
  ];

  const accountStages = [
    'Prospect',
    'Contacted', 
    'Vendor Packet Request',
    'Vendor Packet Submitted',
    'Approved for Work',
    'Actively Engaged'
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Prospect Overview */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Building className="w-4 h-4 mr-2" />
          Current Prospect Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Company:</span>
            <span className="ml-2 text-gray-900">{prospect?.name}</span>
          </div>
          {prospect?.company_type && (
            <div>
              <span className="font-medium text-gray-600">Type:</span>
              <span className="ml-2 text-gray-900">{prospect?.company_type}</span>
            </div>
          )}
          {prospect?.icp_fit_score && (
            <div>
              <span className="font-medium text-gray-600">ICP Score:</span>
              <span className="ml-2 text-gray-900">{prospect?.icp_fit_score}/100</span>
            </div>
          )}
          {prospect?.source && (
            <div>
              <span className="font-medium text-gray-600">Source:</span>
              <span className="ml-2 text-gray-900 capitalize">{prospect?.source?.replace('_', ' ')}</span>
            </div>
          )}
          {prospect?.city && prospect?.state && (
            <div>
              <span className="font-medium text-gray-600">Location:</span>
              <span className="ml-2 text-gray-900">{prospect?.city}, {prospect?.state}</span>
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2 text-blue-600" />
            Account Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={formData?.accountData?.name || ''}
                onChange={(e) => handleInputChange('name', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company name"
                required
              />
            </div>

            {/* Company Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Type *
              </label>
              <select
                value={formData?.accountData?.companyType || ''}
                onChange={(e) => handleInputChange('companyType', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select company type</option>
                {companyTypes?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Account Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Stage
              </label>
              <select
                value={formData?.accountData?.stage || 'Prospect'}
                onChange={(e) => handleInputChange('stage', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {accountStages?.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData?.accountData?.email || ''}
                onChange={(e) => handleInputChange('email', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="company@example.com"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Phone className="w-5 h-5 mr-2 text-green-600" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData?.accountData?.phone || ''}
                onChange={(e) => handleInputChange('phone', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Globe className="w-4 h-4 mr-1" />
                Website
              </label>
              <input
                type="url"
                value={formData?.accountData?.website || ''}
                onChange={(e) => handleInputChange('website', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://company.com"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-red-600" />
            Address Information
          </h3>
          
          <div className="space-y-4">
            {/* Street Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData?.accountData?.address || ''}
                onChange={(e) => handleInputChange('address', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Business Ave"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData?.accountData?.city || ''}
                  onChange={(e) => handleInputChange('city', e?.target?.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData?.accountData?.state || ''}
                  onChange={(e) => handleInputChange('state', e?.target?.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="State"
                  maxLength="2"
                />
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData?.accountData?.zipCode || ''}
                  onChange={(e) => handleInputChange('zipCode', e?.target?.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Notes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-purple-600" />
            Conversion Notes
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData?.notes || ''}
              onChange={(e) => handleNotesChange(e?.target?.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional notes about this prospect conversion..."
            />
          </div>

          {/* Research Quality Assessment */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Research Quality Assessment</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <Tag className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-blue-800">
                  {prospect?.tags?.length || 0} research tags applied
                </span>
              </div>
              <div className="flex items-center">
                <Building className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-blue-800">
                  {prospect?.property_count_estimate ? `${prospect?.property_count_estimate} properties estimated` : 'Property count unknown'}
                </span>
              </div>
              <div className="flex items-center">
                <Globe className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-blue-800">
                  {prospect?.website || prospect?.domain ? 'Website identified' : 'No website found'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData?.accountData?.name || !formData?.accountData?.companyType}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Checking for Duplicates...' : 'Continue to Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConversionForm;