import React from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const OutcomeNotesSection = ({ 
  outcome, 
  onOutcomeChange, 
  notes, 
  onNotesChange, 
  outcomeError,
  notesError,
  disabled = false 
}) => {
  // Fixed: Use correct database enum values for activity_outcome
  const outcomeOptions = [
    { value: 'Successful', label: 'Successful', description: 'Activity completed successfully' },
    { value: 'No Answer', label: 'No Answer', description: 'No response from contact' },
    { value: 'Callback Requested', label: 'Callback Requested', description: 'Contact requested a callback' },
    { value: 'Not Interested', label: 'Not Interested', description: 'Contact not interested' },
    { value: 'Interested', label: 'Interested', description: 'Contact showed interest' },
    { value: 'Proposal Requested', label: 'Proposal Requested', description: 'Contact requested a proposal' },
    { value: 'Meeting Scheduled', label: 'Meeting Scheduled', description: 'Follow-up meeting scheduled' },
    { value: 'Contract Signed', label: 'Contract Signed', description: 'Contract successfully signed' }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Icon name="Target" size={18} className="text-secondary" />
          <h3 className="text-sm font-medium text-foreground">Outcome</h3>
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </div>
        <Select
          options={outcomeOptions}
          value={outcome}
          onChange={onOutcomeChange}
          placeholder="Select outcome..."
          error={outcomeError}
          disabled={disabled}
          clearable
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Icon name="FileText" size={18} className="text-secondary" />
          <h3 className="text-sm font-medium text-foreground">Notes</h3>
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </div>
        <Input
          type="text"
          placeholder="Add notes about this activity..."
          value={notes}
          onChange={(e) => onNotesChange(e?.target?.value)}
          error={notesError}
          disabled={disabled}
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
};

export default OutcomeNotesSection;