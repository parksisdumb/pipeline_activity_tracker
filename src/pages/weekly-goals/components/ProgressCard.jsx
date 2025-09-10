import React from 'react';
import Icon from '../../../components/AppIcon';

const ProgressCard = ({ goal, actualValue = 0 }) => {
  const { goal_type, target_value, current_value, status, notes } = goal;
  
  // Calculate progress percentage
  const progressPercentage = Math.min((actualValue / target_value) * 100, 100);
  const isComplete = actualValue >= target_value;
  const isOverdue = status === 'Overdue';
  
  // Get appropriate icon for goal type
  const getGoalIcon = (type) => {
    const iconMap = {
      'calls': 'Phone',
      'emails': 'Mail',
      'meetings': 'Users',
      'site_visits': 'MapPin',
      'assessments': 'ClipboardCheck',
      'proposals': 'FileText',
      'contracts': 'Award',
      'pop_ins': 'DoorOpen',
      'dm_conversations': 'MessageSquare',
      'assessments_booked': 'Calendar',
      'proposals_sent': 'Send',
      'wins': 'Trophy'
    };
    return iconMap?.[type] || 'Target';
  };

  // Get status color
  const getStatusColor = () => {
    if (isComplete) return 'text-success';
    if (isOverdue) return 'text-destructive';
    if (progressPercentage >= 75) return 'text-warning';
    if (progressPercentage >= 50) return 'text-info';
    return 'text-muted-foreground';
  };

  // Get progress bar color
  const getProgressBarColor = () => {
    if (isComplete) return 'bg-success';
    if (isOverdue) return 'bg-destructive';
    if (progressPercentage >= 75) return 'bg-warning';
    if (progressPercentage >= 50) return 'bg-info';
    return 'bg-primary';
  };

  // Format goal type for display
  const formatGoalType = (type) => {
    return type?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l?.toUpperCase());
  };

  return (
    <div className={`bg-card border rounded-lg p-6 transition-all duration-200 hover:shadow-md ${
      isComplete ? 'border-success/20 bg-success/5' : isOverdue ?'border-destructive/20 bg-destructive/5': 'border-border hover:border-primary/20'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isComplete ? 'bg-success/10' : isOverdue ?'bg-destructive/10': 'bg-primary/10'
          }`}>
            <Icon 
              name={getGoalIcon(goal_type)} 
              size={20} 
              className={
                isComplete ? 'text-success' : isOverdue ?'text-destructive': 'text-primary'
              }
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {formatGoalType(goal_type)}
            </h3>
            <p className="text-sm text-muted-foreground">
              Weekly Target
            </p>
          </div>
        </div>
        
        {isComplete && (
          <div className="flex items-center space-x-1 text-success">
            <Icon name="CheckCircle" size={16} />
            <span className="text-xs font-medium">Complete</span>
          </div>
        )}
        
        {isOverdue && (
          <div className="flex items-center space-x-1 text-destructive">
            <Icon name="AlertCircle" size={16} />
            <span className="text-xs font-medium">Behind</span>
          </div>
        )}
      </div>

      {/* Progress Numbers */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className={`text-2xl font-bold ${getStatusColor()}`}>
            {actualValue}
          </span>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">of </span>
            <span className="text-lg font-semibold text-foreground">{target_value}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${getProgressBarColor()}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {Math.round(progressPercentage)}% Complete
          </span>
          <span className="text-xs text-muted-foreground">
            {target_value - actualValue > 0 ? `${target_value - actualValue} remaining` : 'Goal exceeded!'}
          </span>
        </div>
      </div>

      {/* Status and Notes */}
      {notes && (
        <div className="pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notes}
          </p>
        </div>
      )}

      {/* Action Indicator */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1 text-muted-foreground">
          <Icon name="TrendingUp" size={12} />
          <span>Based on logged activities</span>
        </div>
        <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
          <div className={`w-2 h-2 rounded-full ${
            isComplete ? 'bg-success' : 
            progressPercentage > 50 ? 'bg-warning': 'bg-muted-foreground'
          }`} />
          <span className="capitalize">{status?.toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressCard;