import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const BulkGoalActions = ({ 
  representatives, 
  onBulkGoalSet, 
  onCopyFromPreviousWeek,
  className = '' 
}) => {
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [selectedReps, setSelectedReps] = useState([]);
  const [bulkGoals, setBulkGoals] = useState({
    'accounts_added': '',
    'contacts_reached': '',
    'pop_ins': '',
    'conversations': '',
    'follow_ups': '',
    'inspections_booked': '',
    'proposals_sent': ''
  });

  const repOptions = representatives?.map(rep => ({
    value: rep?.id,
    label: rep?.name
  }));

  const goalTemplates = [
    {
      value: 'aggressive',
      label: 'Aggressive Goals',
      goals: { 
        accounts_added: 8, 
        contacts_reached: 25, 
        pop_ins: 20, 
        conversations: 15, 
        follow_ups: 12, 
        inspections_booked: 8, 
        proposals_sent: 5 
      }
    },
    {
      value: 'standard',
      label: 'Standard Goals',
      goals: { 
        accounts_added: 5, 
        contacts_reached: 20, 
        pop_ins: 15, 
        conversations: 12, 
        follow_ups: 8, 
        inspections_booked: 6, 
        proposals_sent: 4 
      }
    },
    {
      value: 'conservative',
      label: 'Conservative Goals',
      goals: { 
        accounts_added: 3, 
        contacts_reached: 15, 
        pop_ins: 10, 
        conversations: 8, 
        follow_ups: 6, 
        inspections_booked: 4, 
        proposals_sent: 2 
      }
    }
  ];

  const handleTemplateSelect = (templateValue) => {
    const template = goalTemplates?.find(t => t?.value === templateValue);
    if (template) {
      setBulkGoals(template?.goals);
    }
  };

  const handleBulkGoalChange = (metric, value) => {
    setBulkGoals(prev => ({
      ...prev,
      [metric]: parseInt(value) || ''
    }));
  };

  const handleApplyBulkGoals = () => {
    if (selectedReps?.length === 0) return;
    
    const goalsToApply = Object.fromEntries(
      Object.entries(bulkGoals)?.map(([key, value]) => [key, parseInt(value) || 0])
    );
    
    onBulkGoalSet(selectedReps, goalsToApply);
    setShowBulkForm(false);
    setSelectedReps([]);
    setBulkGoals({
      'accounts_added': '',
      'contacts_reached': '',
      'pop_ins': '',
      'conversations': '',
      'follow_ups': '',
      'inspections_booked': '',
      'proposals_sent': ''
    });
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Bulk Goal Management</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyFromPreviousWeek}
            iconName="Copy"
            iconPosition="left"
          >
            Copy Previous Week
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBulkForm(!showBulkForm)}
            iconName={showBulkForm ? "ChevronUp" : "ChevronDown"}
            iconPosition="right"
          >
            Bulk Set Goals
          </Button>
        </div>
      </div>
      {showBulkForm && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Select Representatives"
              placeholder="Choose representatives..."
              multiple
              searchable
              options={repOptions}
              value={selectedReps}
              onChange={setSelectedReps}
            />
            
            <Select
              label="Goal Template (Optional)"
              placeholder="Choose a template..."
              options={goalTemplates}
              onChange={handleTemplateSelect}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Input
              label="Accounts Added"
              type="number"
              placeholder="0"
              value={bulkGoals?.accounts_added}
              onChange={(e) => handleBulkGoalChange('accounts_added', e?.target?.value)}
              min="0"
            />
            <Input
              label="Contacts Reached"
              type="number"
              placeholder="0"
              value={bulkGoals?.contacts_reached}
              onChange={(e) => handleBulkGoalChange('contacts_reached', e?.target?.value)}
              min="0"
            />
            <Input
              label="Pop-ins"
              type="number"
              placeholder="0"
              value={bulkGoals?.pop_ins}
              onChange={(e) => handleBulkGoalChange('pop_ins', e?.target?.value)}
              min="0"
            />
            <Input
              label="Conversations"
              type="number"
              placeholder="0"
              value={bulkGoals?.conversations}
              onChange={(e) => handleBulkGoalChange('conversations', e?.target?.value)}
              min="0"
            />
            <Input
              label="Follow Ups"
              type="number"
              placeholder="0"
              value={bulkGoals?.follow_ups}
              onChange={(e) => handleBulkGoalChange('follow_ups', e?.target?.value)}
              min="0"
            />
            <Input
              label="Inspections Booked"
              type="number"
              placeholder="0"
              value={bulkGoals?.inspections_booked}
              onChange={(e) => handleBulkGoalChange('inspections_booked', e?.target?.value)}
              min="0"
            />
            <Input
              label="Proposals Sent"
              type="number"
              placeholder="0"
              value={bulkGoals?.proposals_sent}
              onChange={(e) => handleBulkGoalChange('proposals_sent', e?.target?.value)}
              min="0"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon name="Info" size={16} />
              <span>Goals will be applied to {selectedReps?.length} selected representative(s)</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyBulkGoals}
                disabled={selectedReps?.length === 0}
                iconName="Check"
                iconPosition="left"
              >
                Apply Goals
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkGoalActions;