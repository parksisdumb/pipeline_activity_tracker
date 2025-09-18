import React from 'react';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const ActivityTypeSelector = ({ value, onChange, error, disabled = false }) => {
  const activityTypes = [
    { 
      value: 'Phone Call', 
      label: 'Phone Call',
      description: 'Telephone conversation with client'
    },
    { 
      value: 'Email', 
      label: 'Email',
      description: 'Email communication with client'
    },
    { 
      value: 'Meeting', 
      label: 'Meeting',
      description: 'Scheduled meeting or appointment'
    },
    { 
      value: 'Site Visit', 
      label: 'Site Visit',
      description: 'Visit to property location'
    },
    { 
      value: 'Proposal Sent', 
      label: 'Proposal Sent',
      description: 'Formal proposal submitted to client'
    },
    { 
      value: 'Follow-up', 
      label: 'Follow-up',
      description: 'Follow-up communication or activity'
    },
    { 
      value: 'Assessment', 
      label: 'Assessment',
      description: 'Property assessment or evaluation'
    },
    { 
      value: 'Contract Signed', 
      label: 'Contract Signed',
      description: 'Contract executed and signed'
    }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Icon name="Activity" size={18} className="text-primary" />
        <h3 className="text-sm font-medium text-foreground">Activity Type</h3>
      </div>
      <Select
        options={activityTypes}
        value={value}
        onChange={onChange}
        placeholder="Select activity type"
        error={error}
        disabled={disabled}
        required
        searchable
        onSearchChange={() => {}}
        id="activity-type-selector"
        onOpenChange={() => {}}
        label="Activity Type"
        name="activityType"
        description="Select the type of activity"
      />
    </div>
  );
};

export default ActivityTypeSelector;