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
  const outcomeOptions = [
    { value: 'positive', label: 'Positive', description: 'Good response or progress made' },
    { value: 'neutral', label: 'Neutral', description: 'Standard interaction, no clear outcome' },
    { value: 'negative', label: 'Negative', description: 'Poor response or setback' },
    { value: 'follow_up_needed', label: 'Follow-up Needed', description: 'Requires additional action' },
    { value: 'appointment_scheduled', label: 'Appointment Scheduled', description: 'Next meeting booked' },
    { value: 'proposal_requested', label: 'Proposal Requested', description: 'Client requested formal proposal' },
    { value: 'not_interested', label: 'Not Interested', description: 'Client declined or not interested' },
    { value: 'decision_pending', label: 'Decision Pending', description: 'Waiting for client decision' }
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