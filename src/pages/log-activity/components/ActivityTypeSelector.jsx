import React from 'react';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const ActivityTypeSelector = ({ value, onChange, error, disabled = false }) => {
  const activityTypes = [
    { 
      value: 'pop_in', 
      label: 'Pop-in Visit',
      description: 'Unscheduled property visit'
    },
    { 
      value: 'dm_conversation', 
      label: 'Decision Maker Conversation',
      description: 'Direct conversation with key decision maker'
    },
    { 
      value: 'assessment_booked', 
      label: 'Assessment Booked',
      description: 'Scheduled property assessment appointment'
    },
    { 
      value: 'proposal_sent', 
      label: 'Proposal Sent',
      description: 'Formal proposal submitted to client'
    },
    { 
      value: 'win', 
      label: 'Win',
      description: 'Successfully closed deal'
    },
    { 
      value: 'loss', 
      label: 'Loss',
      description: 'Lost opportunity or deal'
    },
    { 
      value: 'call', 
      label: 'Phone Call',
      description: 'Telephone conversation'
    },
    { 
      value: 'email', 
      label: 'Email',
      description: 'Email communication'
    },
    { 
      value: 'meeting', 
      label: 'Meeting',
      description: 'Scheduled meeting or appointment'
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
      />
    </div>
  );
};

export default ActivityTypeSelector;