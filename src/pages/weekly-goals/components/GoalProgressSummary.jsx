import React from 'react';
import Icon from '../../../components/AppIcon';

const GoalProgressSummary = ({ 
  representatives, 
  currentWeekGoals, 
  currentWeekPerformance,
  className = '' 
}) => {
  const metrics = [
    { key: 'pop_ins', label: 'Pop-ins', icon: 'MapPin' },
    { key: 'dm_conversations', label: 'DM Conversations', icon: 'MessageCircle' },
    { key: 'assessments_booked', label: 'Assessments Booked', icon: 'Calendar' },
    { key: 'proposals_sent', label: 'Proposals Sent', icon: 'FileText' },
    { key: 'wins', label: 'Wins', icon: 'Trophy' }
  ];

  const calculateTeamTotals = (metric) => {
    const totalGoal = representatives?.reduce((sum, rep) => {
      return sum + (currentWeekGoals?.[rep?.id]?.[metric] || 0);
    }, 0);
    
    const totalPerformance = representatives?.reduce((sum, rep) => {
      return sum + (currentWeekPerformance?.[rep?.id]?.[metric] || 0);
    }, 0);
    
    const progressPercentage = totalGoal > 0 ? (totalPerformance / totalGoal) * 100 : 0;
    
    return {
      goal: totalGoal,
      performance: totalPerformance,
      percentage: Math.min(progressPercentage, 100)
    };
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'text-success';
    if (percentage >= 75) return 'text-accent';
    if (percentage >= 50) return 'text-warning';
    return 'text-error';
  };

  const getProgressBgColor = (percentage) => {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 75) return 'bg-accent';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-error';
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Team Progress Summary</h3>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Users" size={16} />
          <span>{representatives?.length} Representatives</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics?.map((metric) => {
          const totals = calculateTeamTotals(metric?.key);
          
          return (
            <div key={metric?.key} className="space-y-3">
              <div className="flex items-center space-x-2">
                <Icon name={metric?.icon} size={16} className="text-accent" />
                <span className="font-medium text-sm text-foreground">
                  {metric?.label}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className={`font-semibold ${getProgressColor(totals?.percentage)}`}>
                    {totals?.percentage?.toFixed(0)}%
                  </span>
                </div>
                
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBgColor(totals?.percentage)}`}
                    style={{ width: `${totals?.percentage}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{totals?.performance} / {totals?.goal}</span>
                  <span>Team Goal</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">
              {representatives?.length}
            </p>
            <p className="text-sm text-muted-foreground">Active Reps</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-accent">
              {representatives?.reduce((sum, rep) => {
                return sum + Object.values(currentWeekGoals?.[rep?.id] || {})?.reduce((a, b) => a + b, 0);
              }, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Goals</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-success">
              {representatives?.reduce((sum, rep) => {
                return sum + Object.values(currentWeekPerformance?.[rep?.id] || {})?.reduce((a, b) => a + b, 0);
              }, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Performance</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-warning">
              {representatives?.filter(rep => {
                const repGoals = currentWeekGoals?.[rep?.id] || {};
                const repPerformance = currentWeekPerformance?.[rep?.id] || {};
                const totalGoal = Object.values(repGoals)?.reduce((a, b) => a + b, 0);
                const totalPerf = Object.values(repPerformance)?.reduce((a, b) => a + b, 0);
                return totalGoal > 0 && (totalPerf / totalGoal) < 0.5;
              })?.length}
            </p>
            <p className="text-sm text-muted-foreground">At Risk</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalProgressSummary;