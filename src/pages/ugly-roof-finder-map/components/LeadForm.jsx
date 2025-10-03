import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

export default function LeadForm({ lead, onSave, onCancel, loading = false }) {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    condition_label: lead?.condition_label || 'other',
    condition_score: lead?.condition_score || 1,
    status: lead?.status || 'new',
    tags: (lead?.tags || [])?.join(', '),
    notes: lead?.notes || '',
    address: lead?.address || '',
    city: lead?.city || '',
    state: lead?.state || '',
    zip_code: lead?.zip_code || '',
    estimated_sqft: lead?.estimated_sqft || '',
    estimated_repair_cost: lead?.estimated_repair_cost || ''
  });

  const [errors, setErrors] = useState({});

  const conditionLabels = [
    { value: 'dirty', label: 'Dirty' },
    { value: 'aged', label: 'Aged' },
    { value: 'patched', label: 'Patched' },
    { value: 'ponding', label: 'Ponding' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'assessed', label: 'Assessed' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'converted', label: 'Converted' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors?.[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors?.[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData?.condition_score < 1 || formData?.condition_score > 5) {
      newErrors.condition_score = 'Score must be between 1 and 5';
    }

    if (formData?.estimated_sqft && formData?.estimated_sqft < 0) {
      newErrors.estimated_sqft = 'Square footage cannot be negative';
    }

    if (formData?.estimated_repair_cost && formData?.estimated_repair_cost < 0) {
      newErrors.estimated_repair_cost = 'Cost cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    if (!validateForm()) return;

    // Process form data
    const processedData = {
      ...formData,
      tags: formData?.tags?.split(',')?.map(tag => tag?.trim())?.filter(tag => tag?.length > 0),
      condition_score: parseInt(formData?.condition_score, 10),
      estimated_sqft: formData?.estimated_sqft ? parseInt(formData?.estimated_sqft, 10) : null,
      estimated_repair_cost: formData?.estimated_repair_cost ? parseFloat(formData?.estimated_repair_cost) : null
    };

    onSave?.(processedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Lead Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lead Name *
        </label>
        <Input
          type="text"
          value={formData?.name}
          onChange={(e) => handleChange('name', e?.target?.value)}
          placeholder="e.g., Warehouse Roof - Ponding Issues"
          error={errors?.name}
          disabled={loading}
        />
      </div>
      {/* Condition and Score */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Condition
          </label>
          <Select
            value={formData?.condition_label}
            onValueChange={(value) => handleChange('condition_label', value)}
            disabled={loading}
            onSearchChange={() => {}}
            id="condition_label"
            onOpenChange={() => {}}
            name="condition_label"
            description=""
            error=""
            onChange={(value) => handleChange('condition_label', value)}
            label="Condition"
          >
            {conditionLabels?.map(option => (
              <option key={option?.value} value={option?.value}>
                {option?.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Score (1-5)
          </label>
          <Input
            type="number"
            min="1"
            max="5"
            value={formData?.condition_score}
            onChange={(e) => handleChange('condition_score', e?.target?.value)}
            error={errors?.condition_score}
            disabled={loading}
          />
        </div>
      </div>
      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <Select
          value={formData?.status}
          onValueChange={(value) => handleChange('status', value)}
          disabled={loading}
          onSearchChange={() => {}}
          id="status"
          onOpenChange={() => {}}
          name="status"
          description=""
          error=""
          onChange={(value) => handleChange('status', value)}
          label="Status"
        >
          {statusOptions?.map(option => (
            <option key={option?.value} value={option?.value}>
              {option?.label}
            </option>
          ))}
        </Select>
      </div>
      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <Input
          type="text"
          value={formData?.tags}
          onChange={(e) => handleChange('tags', e?.target?.value)}
          placeholder="commercial, urgent, high-value (comma-separated)"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
      </div>
      {/* Address Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <Input
          type="text"
          value={formData?.address}
          onChange={(e) => handleChange('address', e?.target?.value)}
          placeholder="Street address"
          disabled={loading}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <Input
            type="text"
            value={formData?.city}
            onChange={(e) => handleChange('city', e?.target?.value)}
            placeholder="City"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State
          </label>
          <Input
            type="text"
            value={formData?.state}
            onChange={(e) => handleChange('state', e?.target?.value)}
            placeholder="TX"
            maxLength={2}
            disabled={loading}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ZIP Code
        </label>
        <Input
          type="text"
          value={formData?.zip_code}
          onChange={(e) => handleChange('zip_code', e?.target?.value)}
          placeholder="12345"
          disabled={loading}
        />
      </div>
      {/* Estimates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Est. Sq Ft
          </label>
          <Input
            type="number"
            min="0"
            value={formData?.estimated_sqft}
            onChange={(e) => handleChange('estimated_sqft', e?.target?.value)}
            placeholder="50000"
            error={errors?.estimated_sqft}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Est. Cost ($)
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData?.estimated_repair_cost}
            onChange={(e) => handleChange('estimated_repair_cost', e?.target?.value)}
            placeholder="25000.00"
            error={errors?.estimated_repair_cost}
            disabled={loading}
          />
        </div>
      </div>
      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData?.notes}
          onChange={(e) => handleChange('notes', e?.target?.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="Additional notes about the roof condition..."
          disabled={loading}
        />
      </div>
      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          loading={loading}
          className="flex-1"
        >
          Save Changes
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}