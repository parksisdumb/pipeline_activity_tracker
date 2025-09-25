import React from 'react';
import Select from '../../../components/ui/Select';

const OpportunityTypeSelector = ({ value, onChange, error, required = false }) => {
  const opportunityTypes = [
    { value: 'New Construction', label: 'New Construction' },
    { value: 'Inspection', label: 'Inspection' },
    { value: 'Repair', label: 'Repair' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Re-roof', label: 'Re-roof' }
  ]

  return (
    <div>
      <Select
        value={value || ''}
        onValueChange={onChange}
        placeholder="Select opportunity type"
        options={opportunityTypes}
        error={error}
        required={required}
        onSearchChange={() => {}}
        id="opportunity-type-selector"
        onOpenChange={() => {}}
        label="Opportunity Type"
        name="opportunityType"
        description="Select the type of roofing opportunity"
      />
      
      {/* Type descriptions */}
      <div className="mt-2 text-xs text-gray-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <div><strong>New Construction:</strong> New building projects</div>
          <div><strong>Inspection:</strong> Roof assessment services</div>
          <div><strong>Repair:</strong> Fix existing roof issues</div>
          <div><strong>Maintenance:</strong> Ongoing maintenance contracts</div>
          <div><strong>Re-roof:</strong> Complete roof replacement</div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityTypeSelector;