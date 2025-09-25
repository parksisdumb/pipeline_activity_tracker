import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';

import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { opportunitiesService } from '../../services/opportunitiesService';
import AccountSelector from './components/AccountSelector';
import PropertySelector from './components/PropertySelector';

import OpportunityFormActions from './components/OpportunityFormActions';

const AddOpportunityModal = ({ isOpen, onClose, onSuccess, initialAccount = null, initialProperty = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    opportunity_type: '',
    stage: 'identified',
    bid_value: '',
    probability: 50,
    expected_close_date: '',
    account_id: initialAccount?.id || null,
    property_id: initialProperty?.id || null,
    assigned_to: '',
    competitive_info: '',
    notes: ''
  })

  const [availableReps, setAvailableReps] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        opportunity_type: '',
        stage: 'identified',
        bid_value: '',
        probability: 50,
        expected_close_date: '',
        account_id: initialAccount?.id || null,
        property_id: initialProperty?.id || null,
        assigned_to: '',
        competitive_info: '',
        notes: ''
      })
      setErrors({})
      setSubmitError('')
      loadAvailableReps()
    }
  }, [isOpen, initialAccount?.id, initialProperty?.id])

  const loadAvailableReps = async () => {
    const { data, error } = await opportunitiesService?.getAvailableReps()
    if (!error) {
      setAvailableReps(data)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData?.name?.trim()) {
      newErrors.name = 'Opportunity name is required'
    }
    
    if (!formData?.opportunity_type) {
      newErrors.opportunity_type = 'Opportunity type is required'
    }
    
    if (!formData?.account_id && !formData?.property_id) {
      newErrors.entity = 'Please select either an account or a property'
    }
    
    if (formData?.account_id && formData?.property_id) {
      newErrors.entity = 'Please select either an account OR a property, not both'
    }
    
    if (formData?.bid_value && isNaN(parseFloat(formData?.bid_value))) {
      newErrors.bid_value = 'Bid value must be a valid number'
    }
    
    if (formData?.probability && (formData?.probability < 0 || formData?.probability > 100)) {
      newErrors.probability = 'Probability must be between 0 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors)?.length === 0;
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    setSubmitError('')
    
    try {
      // Prepare submission data
      const submissionData = {
        ...formData,
        bid_value: formData?.bid_value ? parseFloat(formData?.bid_value) : null,
        probability: parseInt(formData?.probability || 50),
        expected_close_date: formData?.expected_close_date || null
      }
      
      // Remove empty optional fields
      Object.keys(submissionData)?.forEach(key => {
        if (submissionData?.[key] === '' || submissionData?.[key] === null) {
          delete submissionData?.[key]
        }
      })
      
      const { data, error } = await opportunitiesService?.createOpportunity(submissionData)
      
      if (error) {
        setSubmitError(error)
        return
      }
      
      // Success
      onSuccess?.(data)
      onClose?.()
      
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create opportunity')
    } finally {
      setIsSubmitting(false)
    }
  }

  const opportunityTypes = [
    { value: 'new_construction', label: 'New Construction' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'repair', label: 'Repair' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 're_roof', label: 'Re-roof' }
  ]

  const stages = [
    { value: 'identified', label: 'Identified' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' }
  ]

  const repOptions = availableReps?.map(rep => ({
    value: rep?.id,
    label: `${rep?.full_name} (${rep?.email})`
  })) || []

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Opportunity"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Opportunity Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opportunity Name *
          </label>
          <Input
            type="text"
            value={formData?.name || ''}
            onChange={(e) => handleInputChange('name', e?.target?.value)}
            placeholder="Enter opportunity name"
            error={errors?.name}
            required
          />
        </div>

        {/* Opportunity Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opportunity Type *
          </label>
          <Select
            value={formData?.opportunity_type || ''}
            onChange={(value) => handleInputChange('opportunity_type', value)}
            placeholder="Select opportunity type"
            options={opportunityTypes}
            error={errors?.opportunity_type}
            required
            id="opportunity_type"
            name="opportunity_type"
            label="Opportunity Type"
            onSearchChange={() => {}}
            onOpenChange={() => {}}
            description=""
          />
        </div>

        {/* Account/Property Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Associated Account or Property *
          </label>
          <div className="space-y-3">
            <AccountSelector
              selectedAccountId={formData?.account_id}
              onSelectAccount={(accountId) => {
                handleInputChange('account_id', accountId)
                handleInputChange('property_id', null) // Clear property when account selected
              }}
              disabled={!!formData?.property_id}
            />
            
            <div className="text-center text-sm text-gray-500">- OR -</div>
            
            <PropertySelector
              selectedPropertyId={formData?.property_id}
              onSelectProperty={(propertyId) => {
                handleInputChange('property_id', propertyId)
                handleInputChange('account_id', null) // Clear account when property selected
              }}
              disabled={!!formData?.account_id}
            />
          </div>
          {errors?.entity && (
            <p className="mt-1 text-sm text-red-600">{errors?.entity}</p>
          )}
        </div>

        {/* Stage and Assignment Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <Select
              value={formData?.stage || 'identified'}
              onChange={(value) => handleInputChange('stage', value)}
              options={stages}
              id="stage"
              name="stage"
              label="Stage"
              onSearchChange={() => {}}
              onOpenChange={() => {}}
              description=""
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Rep
            </label>
            <Select
              value={formData?.assigned_to || ''}
              onChange={(value) => handleInputChange('assigned_to', value)}
              placeholder="Select a representative"
              options={repOptions}
              id="assigned_to"
              name="assigned_to"
              label="Assigned Rep"
              onSearchChange={() => {}}
              onOpenChange={() => {}}
              description=""
            />
          </div>
        </div>

        {/* Bid Value and Probability Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bid Value ($)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData?.bid_value || ''}
              onChange={(e) => handleInputChange('bid_value', e?.target?.value)}
              placeholder="0.00"
              error={errors?.bid_value}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Probability (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData?.probability || 50}
              onChange={(e) => handleInputChange('probability', e?.target?.value)}
              error={errors?.probability}
            />
          </div>
        </div>

        {/* Expected Close Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Close Date
          </label>
          <Input
            type="date"
            value={formData?.expected_close_date || ''}
            onChange={(e) => handleInputChange('expected_close_date', e?.target?.value)}
          />
        </div>

        {/* Competitive Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Competitive Information
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            value={formData?.competitive_info || ''}
            onChange={(e) => handleInputChange('competitive_info', e?.target?.value)}
            placeholder="Information about competitors, pricing, etc."
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            value={formData?.notes || ''}
            onChange={(e) => handleInputChange('notes', e?.target?.value)}
            placeholder="Additional notes about this opportunity"
          />
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Form Actions */}
        <OpportunityFormActions
          isSubmitting={isSubmitting}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      </form>
    </Modal>
  );
}

export default AddOpportunityModal