import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { Calendar, Clock, Phone, MessageCircle, Briefcase, FileText, Trophy } from 'lucide-react';
import { tasksService } from '../../../services/tasksService';
import { supabase } from '../../../lib/supabase';

const OutcomeNotesSection = ({ 
  outcome, 
  onOutcomeChange, 
  notes, 
  onNotesChange, 
  outcomeError, 
  notesError, 
  disabled,
  selectedEntityData = {},
  onFollowUpCreated = () => {}
}) => {
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);

  const activityOutcomes = [
    { 
      value: 'Successful', 
      label: 'Successful',
      description: 'Activity completed successfully' 
    },
    { 
      value: 'No Answer', 
      label: 'No Answer',
      description: 'No response received' 
    },
    { 
      value: 'Callback Requested', 
      label: 'Callback Requested',
      description: 'Client requested callback' 
    },
    { 
      value: 'Not Interested', 
      label: 'Not Interested',
      description: 'Client showed no interest' 
    },
    { 
      value: 'Interested', 
      label: 'Interested',
      description: 'Client expressed interest' 
    },
    { 
      value: 'Proposal Requested', 
      label: 'Proposal Requested',
      description: 'Client requested formal proposal' 
    },
    { 
      value: 'Meeting Scheduled', 
      label: 'Meeting Scheduled',
      description: 'Follow-up meeting arranged' 
    },
    { 
      value: 'Assessment Completed', 
      label: 'Assessment Completed',
      description: 'Property assessment finished successfully' 
    },
    { 
      value: 'Contract Signed', 
      label: 'Contract Signed',
      description: 'Agreement finalized and executed' 
    }
  ];

  // Follow-up date presets
  const followUpPresets = [
    {
      label: '+2 Days',
      value: 2,
      description: 'Quick follow-up'
    },
    {
      label: '+5 Days',
      value: 5,
      description: 'Standard follow-up'
    },
    {
      label: '+7 Days',
      value: 7,
      description: 'Weekly follow-up'
    },
    {
      label: '+14 Days',
      value: 14,
      description: 'Bi-weekly follow-up'
    }
  ];

  // Next step quick actions
  const nextStepActions = [
    {
      id: 'call',
      label: 'Call',
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-200',
      description: 'Schedule a follow-up call',
      defaultFollowUp: 2
    },
    {
      id: 'dm_conversation',
      label: 'DM Conversation',
      icon: MessageCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
      description: 'Decision maker conversation',
      defaultFollowUp: 3
    },
    {
      id: 'assessment',
      label: 'Book Assessment',
      icon: Briefcase,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      borderColor: 'border-purple-200',
      description: 'Schedule property assessment',
      defaultFollowUp: 7
    },
    {
      id: 'proposal',
      label: 'Send Proposal',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      borderColor: 'border-orange-200',
      description: 'Prepare and send proposal',
      defaultFollowUp: 5
    },
    {
      id: 'win',
      label: 'Mark Win',
      icon: Trophy,
      color: 'text-green-700',
      bgColor: 'bg-green-50 hover:bg-green-100',
      borderColor: 'border-green-200',
      description: 'Mark as successful completion',
      defaultFollowUp: null // No follow-up needed for wins
    }
  ];

  // Calculate follow-up date based on preset days
  const calculateFollowUpDate = (days) => {
    const date = new Date();
    date?.setDate(date?.getDate() + days);
    return date?.toISOString()?.split('T')?.[0]; // YYYY-MM-DD format
  };

  // Handle follow-up preset click
  const handleFollowUpPreset = (days) => {
    const date = calculateFollowUpDate(days);
    setFollowUpDate(date);
    setShowFollowUp(true);
  };

  // Handle next step action
  const handleNextStepAction = async (action) => {
    try {
      setIsCreatingFollowUp(true);

      let taskData = {
        title: `Follow-up: ${action?.label}`,
        description: `${action?.description} - Created from activity log`,
        category: 'follow_up_call',
        priority: 'medium',
        status: 'pending'
      };

      // Set appropriate defaults based on action type
      switch (action?.id) {
        case 'call': 
          onOutcomeChange('Callback Requested');
          taskData.category = 'follow_up_call';
          taskData.title = 'Follow-up Call';
          break;
        case 'dm_conversation': 
          onOutcomeChange('Interested');
          taskData.category = 'meeting_setup';
          taskData.title = 'Decision Maker Conversation';
          break;
        case 'assessment': 
          onOutcomeChange('Interested');
          taskData.category = 'assessment_scheduling';
          taskData.title = 'Schedule Property Assessment';
          break;
        case 'proposal': 
          onOutcomeChange('Proposal Requested');
          taskData.category = 'proposal_review';
          taskData.title = 'Prepare and Send Proposal';
          break;
        case 'win': 
          onOutcomeChange('Contract Signed');
          // No task needed for wins, just set outcome
          return;
      }

      // Add entity relationships to task
      if (selectedEntityData?.account) {
        taskData.account_id = selectedEntityData?.account;
      }
      if (selectedEntityData?.contact) {
        taskData.contact_id = selectedEntityData?.contact;
      }
      if (selectedEntityData?.property) {
        taskData.property_id = selectedEntityData?.property;
      }

      // Set due date if follow-up is specified
      if (action?.defaultFollowUp) {
        const dueDate = new Date();
        dueDate?.setDate(dueDate?.getDate() + action?.defaultFollowUp);
        taskData.due_date = dueDate?.toISOString();
      }

      // Get current user for assignment
      const { data: { user } } = await supabase?.auth?.getUser();
      if (user?.id) {
        taskData.assigned_to = user?.id;
      }

      // Create the follow-up task
      const createdTask = await tasksService?.createTask(taskData);

      // Notify parent component
      onFollowUpCreated({
        type: 'next_step',
        action: action?.label,
        task: createdTask
      });

      alert(`${action?.label} task created successfully!`);
    } catch (error) {
      console.error('Error creating next step task:', error);
      alert(`Failed to create ${action?.label} task. Please try again.`);
    } finally {
      setIsCreatingFollowUp(false);
    }
  };

  // Handle manual follow-up creation
  const handleCreateFollowUp = async () => {
    if (!followUpDate) {
      alert('Please select a follow-up date');
      return;
    }

    try {
      setIsCreatingFollowUp(true);

      const taskData = {
        title: 'Follow-up Call',
        description: `Follow-up from activity log - Due ${new Date(followUpDate)?.toLocaleDateString()}`,
        category: 'follow_up_call',
        priority: 'medium',
        status: 'pending',
        due_date: new Date(followUpDate + 'T09:00:00')?.toISOString() // Set to 9 AM
      };

      // Add entity relationships
      if (selectedEntityData?.account) {
        taskData.account_id = selectedEntityData?.account;
      }
      if (selectedEntityData?.contact) {
        taskData.contact_id = selectedEntityData?.contact;
      }
      if (selectedEntityData?.property) {
        taskData.property_id = selectedEntityData?.property;
      }

      // Get current user for assignment
      const { data: { user } } = await supabase?.auth?.getUser();
      if (user?.id) {
        taskData.assigned_to = user?.id;
      }

      // Create the follow-up task
      const createdTask = await tasksService?.createTask(taskData);

      // Notify parent component
      onFollowUpCreated({
        type: 'manual_follow_up',
        date: followUpDate,
        task: createdTask
      });

      alert('Follow-up task created successfully!');
      
      // Reset follow-up state
      setShowFollowUp(false);
      setFollowUpDate('');
    } catch (error) {
      console.error('Error creating follow-up task:', error);
      alert('Failed to create follow-up task. Please try again.');
    } finally {
      setIsCreatingFollowUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Outcome Section */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Icon name="Target" size={18} className="text-secondary" />
          <h3 className="text-sm font-medium text-foreground">Outcome</h3>
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </div>
        <Select
          options={activityOutcomes}
          value={outcome}
          onChange={onOutcomeChange}
          placeholder="Select outcome..."
          error={outcomeError}
          disabled={disabled}
          clearable
        />
      </div>
      {/* Next Step Quick Actions */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Icon name="ArrowRight" size={18} className="text-primary" />
          <h3 className="text-sm font-medium text-foreground">Next Step</h3>
          <span className="text-xs text-muted-foreground">(Quick Actions)</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {nextStepActions?.map((action) => {
            const IconComponent = action?.icon;
            return (
              <Button
                key={action?.id}
                variant="outline"
                size="sm"
                onClick={() => handleNextStepAction(action)}
                disabled={disabled || isCreatingFollowUp}
                className={`
                  flex flex-col items-center space-y-1 p-3 h-auto border-2 transition-all
                  ${action?.bgColor} ${action?.borderColor} ${action?.color}
                  hover:shadow-sm
                `}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-xs font-medium">{action?.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
      {/* Follow-up Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-medium text-foreground">Follow-up</h3>
          <span className="text-xs text-muted-foreground">(14-day cadence)</span>
        </div>
        
        {!showFollowUp ? (
          <div className="flex flex-wrap gap-2">
            {followUpPresets?.map((preset) => (
              <Button
                key={preset?.value}
                variant="outline"
                size="sm"
                onClick={() => handleFollowUpPreset(preset?.value)}
                disabled={disabled}
                className="flex items-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Clock className="w-3 h-3" />
                <span>{preset?.label}</span>
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFollowUp(true)}
              disabled={disabled}
              className="flex items-center space-x-2"
            >
              <Calendar className="w-3 h-3" />
              <span>Custom Date</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/20">
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e?.target?.value)}
                disabled={disabled}
                min={new Date()?.toISOString()?.split('T')?.[0]}
                className="flex-1"
              />
              <Button
                onClick={handleCreateFollowUp}
                disabled={disabled || !followUpDate || isCreatingFollowUp}
                size="sm"
              >
                {isCreatingFollowUp ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowFollowUp(false);
                setFollowUpDate('');
              }}
              disabled={disabled}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
      {/* Notes Section */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Icon name="FileText" size={18} className="text-secondary" />
          <h3 className="text-sm font-medium text-foreground">Notes</h3>
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </div>
        <Input
          type="textarea"
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