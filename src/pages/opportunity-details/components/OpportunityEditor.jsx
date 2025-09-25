import React, { useState, useEffect } from 'react';
import { Save, X, Building2, User, DollarSign, Calendar } from 'lucide-react';
import { opportunitiesService } from '../../../services/opportunitiesService';
import { accountsService } from '../../../services/accountsService';
import { propertiesService } from '../../../services/propertiesService';
import { authService } from '../../../services/authService';

const OpportunityEditor = ({ opportunity, onUpdate, onCancel }) => {
  const [formData, setFormData] = useState({
    name: opportunity?.name || '',
    account_id: opportunity?.account?.id || '',
    property_id: opportunity?.property?.id || '',
    opportunity_type: opportunity?.opportunity_type || '',
    stage: opportunity?.stage || 'identified',
    bid_value: opportunity?.bid_value || '',
    currency: opportunity?.currency || 'USD',
    expected_close_date: opportunity?.expected_close_date || '',
    probability: opportunity?.probability || '',
    description: opportunity?.description || '',
    assigned_to: opportunity?.assigned_to?.id || '',
    notes: opportunity?.notes || ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Supporting data
  const [accounts, setAccounts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);

  // Load supporting data
  useEffect(() => {
    const loadSupportingData = async () => {
      try {
        setLoading(true);
        
        const [accountsResponse, propertiesResponse, teamResponse] = await Promise.all([
          accountsService?.getAccounts({ limit: 1000 }),
          propertiesService?.getProperties({ limit: 1000 }),
          authService?.getTeamMembers()
        ]);

        if (accountsResponse?.success) {
          setAccounts(accountsResponse?.data || []);
        }
        
        if (propertiesResponse?.success) {
          setProperties(propertiesResponse?.data || []);
        }
        
        if (teamResponse?.success) {
          setTeamMembers(teamResponse?.data || []);
        }
      } catch (error) {
        console.error('Error loading supporting data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSupportingData();
  }, []);

  // Filter properties based on selected account
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
      const updateData = {
        ...formData,
        bid_value: formData?.bid_value ? parseFloat(formData?.bid_value) : null,
        probability: formData?.probability ? parseInt(formData?.probability) : null,
        expected_close_date: formData?.expected_close_date || null,
        assigned_to: formData?.assigned_to || null,
        property_id: formData?.property_id || null
      };

      await onUpdate?.(updateData);
    } catch (error) {
      console.error('Error updating opportunity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const opportunityTypes = opportunitiesService?.getOpportunityTypes();
  const opportunityStages = opportunitiesService?.getOpportunityStages();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Edit Opportunity</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Cancel
            </button>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
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
                  Stage
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={formData?.stage}
                  onChange={(e) => handleInputChange('stage', e?.target?.value)}
                >
                  {opportunityStages?.map(stage => (
                    <option key={stage?.value} value={stage?.value}>
                      {stage?.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Account and Property */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account & Property</h3>
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
          </div>

          {/* Financial Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Currency
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={formData?.currency}
                  onChange={(e) => handleInputChange('currency', e?.target?.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
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
          </div>

          {/* Timeline and Assignment */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline & Assignment</h3>
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
          </div>

          {/* Description and Notes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Description & Notes</h3>
            <div className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  value={formData?.notes}
                  onChange={(e) => handleInputChange('notes', e?.target?.value)}
                  placeholder="Enter additional notes..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2 inline" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OpportunityEditor;