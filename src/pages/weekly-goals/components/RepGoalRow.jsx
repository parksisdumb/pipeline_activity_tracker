import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const RepGoalRow = ({ rep, goals, previousWeekPerformance, onGoalChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localGoals, setLocalGoals] = useState({
    pop_ins: 0,
    dm_conversations: 0,
    assessments_booked: 0,
    proposals_sent: 0,
    wins: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state with props whenever goals change
  useEffect(() => {
    if (goals) {
      setLocalGoals({
        pop_ins: goals?.pop_ins || 0,
        dm_conversations: goals?.dm_conversations || 0,
        assessments_booked: goals?.assessments_booked || 0,
        proposals_sent: goals?.proposals_sent || 0,
        wins: goals?.wins || 0
      });
    }
  }, [goals?.pop_ins, goals?.dm_conversations, goals?.assessments_booked, goals?.proposals_sent, goals?.wins, rep?.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onGoalChange(rep?.id, localGoals);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save goals:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to current props values
    setLocalGoals({
      pop_ins: goals?.pop_ins || 0,
      dm_conversations: goals?.dm_conversations || 0,
      assessments_booked: goals?.assessments_booked || 0,
      proposals_sent: goals?.proposals_sent || 0,
      wins: goals?.wins || 0
    });
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    const numValue = parseInt(value) || 0;
    setLocalGoals(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  // Use props values when not editing, local values when editing
  const displayGoals = isEditing ? localGoals : {
    pop_ins: goals?.pop_ins || 0,
    dm_conversations: goals?.dm_conversations || 0,
    assessments_booked: goals?.assessments_booked || 0,
    proposals_sent: goals?.proposals_sent || 0,
    wins: goals?.wins || 0
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        {/* Representative Info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {rep?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground truncate">
              {rep?.name || 'Unknown Rep'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {rep?.email || ''}
            </div>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-5 gap-4 flex-1 max-w-md mx-4">
          {/* Pop-ins */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Pop-ins</div>
            {isEditing ? (
              <Input
                type="number"
                value={localGoals?.pop_ins}
                onChange={(e) => handleInputChange('pop_ins', e?.target?.value)}
                className="w-16 h-8 text-center text-xs"
                min="0"
              />
            ) : (
              <div className="text-sm font-medium text-foreground">
                {displayGoals?.pop_ins}
              </div>
            )}
            {previousWeekPerformance?.pop_ins !== undefined && (
              <div className="text-xs text-muted-foreground">
                Prev: {previousWeekPerformance?.pop_ins}
              </div>
            )}
          </div>

          {/* DM Conversations */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">DM Convos</div>
            {isEditing ? (
              <Input
                type="number"
                value={localGoals?.dm_conversations}
                onChange={(e) => handleInputChange('dm_conversations', e?.target?.value)}
                className="w-16 h-8 text-center text-xs"
                min="0"
              />
            ) : (
              <div className="text-sm font-medium text-foreground">
                {displayGoals?.dm_conversations}
              </div>
            )}
            {previousWeekPerformance?.dm_conversations !== undefined && (
              <div className="text-xs text-muted-foreground">
                Prev: {previousWeekPerformance?.dm_conversations}
              </div>
            )}
          </div>

          {/* Assessments Booked */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Assessments</div>
            {isEditing ? (
              <Input
                type="number"
                value={localGoals?.assessments_booked}
                onChange={(e) => handleInputChange('assessments_booked', e?.target?.value)}
                className="w-16 h-8 text-center text-xs"
                min="0"
              />
            ) : (
              <div className="text-sm font-medium text-foreground">
                {displayGoals?.assessments_booked}
              </div>
            )}
            {previousWeekPerformance?.assessments_booked !== undefined && (
              <div className="text-xs text-muted-foreground">
                Prev: {previousWeekPerformance?.assessments_booked}
              </div>
            )}
          </div>

          {/* Proposals Sent */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Proposals</div>
            {isEditing ? (
              <Input
                type="number"
                value={localGoals?.proposals_sent}
                onChange={(e) => handleInputChange('proposals_sent', e?.target?.value)}
                className="w-16 h-8 text-center text-xs"
                min="0"
              />
            ) : (
              <div className="text-sm font-medium text-foreground">
                {displayGoals?.proposals_sent}
              </div>
            )}
            {previousWeekPerformance?.proposals_sent !== undefined && (
              <div className="text-xs text-muted-foreground">
                Prev: {previousWeekPerformance?.proposals_sent}
              </div>
            )}
          </div>

          {/* Wins */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Wins</div>
            {isEditing ? (
              <Input
                type="number"
                value={localGoals?.wins}
                onChange={(e) => handleInputChange('wins', e?.target?.value)}
                className="w-16 h-8 text-center text-xs"
                min="0"
              />
            ) : (
              <div className="text-sm font-medium text-foreground">
                {displayGoals?.wins}
              </div>
            )}
            {previousWeekPerformance?.wins !== undefined && (
              <div className="text-xs text-muted-foreground">
                Prev: {previousWeekPerformance?.wins}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
                className="bg-primary text-primary-foreground"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepGoalRow;