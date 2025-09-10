import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const MobileGoalCard = ({ 
  rep, 
  goals, 
  previousWeekPerformance, 
  onGoalChange,
  className = '' 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localGoals, setLocalGoals] = useState(goals);

  const metrics = [
    { key: 'pop_ins', label: 'Pop-ins', icon: 'MapPin' },
    { key: 'dm_conversations', label: 'DM Conversations', icon: 'MessageCircle' },
    { key: 'assessments_booked', label: 'Assessments Booked', icon: 'Calendar' },
    { key: 'proposals_sent', label: 'Proposals Sent', icon: 'FileText' },
    { key: 'wins', label: 'Wins', icon: 'Trophy' }
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
    <div className={`bg-card border border-border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Representative Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
            <Icon name="User" size={24} color="var(--color-secondary-foreground)" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{rep?.name}</h3>
            <p className="text-sm text-muted-foreground">{rep?.role}</p>
          </div>
        </div>
        
        <Button
          variant={isEditing ? "outline" : "ghost"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          iconName={isEditing ? "X" : "Edit"}
          iconPosition="left"
        >
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>
      {/* Goals Grid */}
      <div className="space-y-3">
        {metrics?.map((metric) => {
          const currentGoal = isEditing ? localGoals?.[metric?.key] : goals?.[metric?.key];
          const previousPerformance = previousWeekPerformance?.[metric?.key] || 0;
          const status = getPerformanceStatus(currentGoal, previousPerformance);

          return (
            <div key={metric?.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon name={metric?.icon} size={20} className="text-accent" />
                <div>
                  <p className="font-medium text-foreground">{metric?.label}</p>
                  {previousPerformance > 0 && (
                    <div className="flex items-center space-x-1 text-xs">
                      <span className="text-muted-foreground">Last week:</span>
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
              </div>
              <div className="w-20">
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
                  <div className="text-center">
                    <span className="text-lg font-semibold text-foreground">
                      {currentGoal || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Action Buttons */}
      {isEditing && (
        <div className="flex items-center space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="flex-1"
            iconName="Check"
            iconPosition="left"
          >
            Save Goals
          </Button>
        </div>
      )}
    </div>
  );
};

export default MobileGoalCard;