import React, { useState, useEffect } from 'react';
import { X, Building2, User, DollarSign, Calendar } from 'lucide-react';

const CreateOpportunityModal = ({ 
  onClose, 
  onCreate, 
  accounts = [], 
  properties = [], 
  teamMembers = [], 
  opportunityTypes = [] 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    account_id: '',
    property_id: '',
    opportunity_type: '',
    stage: 'identified',
    bid_value: '',
    currency: 'USD',
    expected_close_date: '',
    probability: '',
    description: '',
    assigned_to: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter properties based on selected account
  const [filteredProperties, setFilteredProperties] = useState(properties);

  useEffect(() => {
    if (formData?.account_id) {
      const accountProperties = properties?.filter(
        property => property?.account_id === formData?.account_id
      );
      setFilteredProperties(accountProperties);
      
      // Clear property selection if it's not valid for the selected account
      if (formData?.property_id && !accountProperties?.some(p => p?.id === formData?.property_id)) {
        setFormData(prev => ({ ...prev, property_id: '' }));
      }
    } else {
      setFilteredProperties(properties);
    }
  }, [formData?.account_id, properties]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.name?.trim()) {
      newErrors.name = 'Opportunity name is required';
    }

    if (!formData?.account_id) {
      newErrors.account_id = 'Account is required';
    }

    if (!formData?.opportunity_type) {
      newErrors.opportunity_type = 'Opportunity type is required';
    }

    if (formData?.bid_value && (isNaN(formData?.bid_value) || parseFloat(formData?.bid_value) < 0)) {
      newErrors.bid_value = 'Bid value must be a valid positive number';
    }

    if (formData?.probability && (isNaN(formData?.probability) || 
        parseFloat(formData?.probability) < 0 || parseFloat(formData?.probability) > 100)) {
      newErrors.probability = 'Probability must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        bid_value: formData?.bid_value ? parseFloat(formData?.bid_value) : null,
        probability: formData?.probability ? parseInt(formData?.probability) : null,
        expected_close_date: formData?.expected_close_date || null,
        assigned_to: formData?.assigned_to || null,
        property_id: formData?.property_id || null
      };

      await onCreate?.(submitData);
    } catch (error) {
      console.error('Error creating opportunity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Create New Opportunity</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Opportunity Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opportunity Name *
            </label>
            <input
              type="text"
              className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors?.name ? 'border-red-300' : 'border-gray-300'
              }`}
              value={formData?.name}
              onChange={(e) => handleInputChange('name', e?.target?.value)}
              placeholder="Enter opportunity name"
            />
            {errors?.name && (
              <p className="mt-1 text-sm text-red-600">{errors?.name}</p>
            )}
          </div>

          {/* Account and Property */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account *
              </label>
              <select
                className={`w-full border rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500 ${
                  errors?.account_id ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData?.account_id}
                onChange={(e) => handleInputChange('account_id', e?.target?.value)}
              >
                <option value="">Select Account</option>
                {accounts?.map(account => (
                  <option key={account?.id} value={account?.id}>
                    {account?.name}
                  </option>
                ))}
              </select>
              {errors?.account_id && (
                <p className="mt-1 text-sm text-red-600">{errors?.account_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property (Optional)
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
                value={formData?.property_id}
                onChange={(e) => handleInputChange('property_id', e?.target?.value)}
                disabled={!formData?.account_id}
              >
                <option value="">Select Property</option>
                {filteredProperties?.map(property => (
                  <option key={property?.id} value={property?.id}>
                    {property?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opportunity Type and Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opportunity Type *
              </label>
              <select
                className={`w-full border rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500 ${
                  errors?.opportunity_type ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData?.opportunity_type}
                onChange={(e) => handleInputChange('opportunity_type', e?.target?.value)}
              >
                <option value="">Select Type</option>
                {opportunityTypes?.map(type => (
                  <option key={type?.value} value={type?.value}>
                    {type?.label}
                  </option>
                ))}
              </select>
              {errors?.opportunity_type && (
                <p className="mt-1 text-sm text-red-600">{errors?.opportunity_type}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Stage
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
                value={formData?.stage}
                onChange={(e) => handleInputChange('stage', e?.target?.value)}
              >
                <option value="identified">Identified</option>
                <option value="qualified">Qualified</option>
                <option value="proposal_sent">Proposal Sent</option>
                <option value="negotiation">Negotiation</option>
              </select>
            </div>
          </div>

          {/* Bid Value and Probability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bid Value
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`w-full border rounded-md pl-10 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors?.bid_value ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData?.bid_value}
                  onChange={(e) => handleInputChange('bid_value', e?.target?.value)}
                  placeholder="0.00"
                />
              </div>
              {errors?.bid_value && (
                <p className="mt-1 text-sm text-red-600">{errors?.bid_value}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors?.probability ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData?.probability}
                onChange={(e) => handleInputChange('probability', e?.target?.value)}
                placeholder="50"
              />
              {errors?.probability && (
                <p className="mt-1 text-sm text-red-600">{errors?.probability}</p>
              )}
            </div>
          </div>

          {/* Expected Close Date and Assigned To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Close Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData?.expected_close_date}
                  onChange={(e) => handleInputChange('expected_close_date', e?.target?.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={formData?.assigned_to}
                  onChange={(e) => handleInputChange('assigned_to', e?.target?.value)}
                >
                  <option value="">Select Team Member</option>
                  {teamMembers?.map(member => (
                    <option key={member?.id} value={member?.id}>
                      {member?.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={formData?.description}
              onChange={(e) => handleInputChange('description', e?.target?.value)}
              placeholder="Enter opportunity description..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOpportunityModal;