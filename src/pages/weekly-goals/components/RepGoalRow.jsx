import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const RepGoalRow = ({ 
  rep, 
  goals, 
  previousWeekPerformance, 
  onGoalChange, 
  className = '' 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localGoals, setLocalGoals] = useState(goals);

  const metrics = [
    { key: 'pop_ins', label: 'Pop-ins' },
    { key: 'dm_conversations', label: 'DM Conversations' },
    { key: 'assessments_booked', label: 'Assessments Booked' },
    { key: 'proposals_sent', label: 'Proposals Sent' },
    { key: 'wins', label: 'Wins' }
  ];

  const handleLocalChange = (metric, value) => {
    const numValue = parseInt(value) || 0;
    setLocalGoals(prev => ({
      ...prev,
      [metric]: numValue
    }));
  };

  const handleSave = () => {
    onGoalChange(rep?.id, localGoals);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalGoals(goals);
    setIsEditing(false);
  };

  const getPerformanceStatus = (current, previous) => {
    if (!previous) return 'neutral';
    const change = ((current - previous) / previous) * 100;
    if (change > 20) return 'increase';
    if (change < -20) return 'decrease';
    return 'neutral';
  };

  return (
    <div className={`grid grid-cols-6 gap-4 p-4 bg-card border border-border rounded-lg hover:bg-muted/20 transition-colors duration-200 ${className}`}>
      {/* Representative Info */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
          <Icon name="User" size={20} color="var(--color-secondary-foreground)" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{rep?.name}</p>
          <p className="text-sm text-muted-foreground truncate">{rep?.role}</p>
        </div>
      </div>
      {/* Goal Metrics */}
      {metrics?.map((metric) => {
        const currentGoal = isEditing ? localGoals?.[metric?.key] : goals?.[metric?.key];
        const previousPerformance = previousWeekPerformance?.[metric?.key] || 0;
        const status = getPerformanceStatus(currentGoal, previousPerformance);

        return (
          <div key={metric?.key} className="text-center space-y-2">
            {isEditing ? (
              <Input
                type="number"
                value={localGoals?.[metric?.key] || ''}
                onChange={(e) => handleLocalChange(metric?.key, e?.target?.value)}
                placeholder="0"
                className="text-center"
                min="0"
              />
            ) : (
              <div className="space-y-1">
                <div className="text-lg font-semibold text-foreground">
                  {currentGoal || 0}
                </div>
                {previousPerformance > 0 && (
                  <div className="flex items-center justify-center space-x-1 text-xs">
                    <span className="text-muted-foreground">Last:</span>
                    <span className={`font-medium ${
                      status === 'increase' ? 'text-success' :
                      status === 'decrease'? 'text-warning' : 'text-muted-foreground'
                    }`}>
                      {previousPerformance}
                    </span>
                    {status === 'increase' && <Icon name="TrendingUp" size={12} className="text-success" />}
                    {status === 'decrease' && <Icon name="TrendingDown" size={12} className="text-warning" />}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              iconName="X"
              iconPosition="left"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              iconName="Check"
              iconPosition="left"
            >
              Save
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            iconName="Edit"
            iconPosition="left"
          >
            Edit Goals
          </Button>
        )}
      </div>
    </div>
  );
};

export default RepGoalRow;