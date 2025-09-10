import React from 'react';
import Icon from '../../../components/AppIcon';

const GoalMetricsHeader = ({ className = '' }) => {
  const metrics = [
    {
      key: 'pop_ins',
      label: 'Pop-ins',
      icon: 'MapPin',
      description: 'Unscheduled property visits'
    },
    {
      key: 'dm_conversations',
      label: 'DM Conversations',
      icon: 'MessageCircle',
      description: 'Decision maker conversations'
    },
    {
      key: 'assessments_booked',
      label: 'Assessments Booked',
      icon: 'Calendar',
      description: 'Scheduled property assessments'
    },
    {
      key: 'proposals_sent',
      label: 'Proposals Sent',
      icon: 'FileText',
      description: 'Formal proposals submitted'
    },
    {
      key: 'wins',
      label: 'Wins',
      icon: 'Trophy',
      description: 'Closed deals'
    }
  ];

  return (
    <div className={`grid grid-cols-6 gap-4 bg-muted/50 p-4 rounded-lg border border-border ${className}`}>
      <div className="font-semibold text-foreground">
        Representative
      </div>
      {metrics?.map((metric) => (
        <div key={metric?.key} className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Icon name={metric?.icon} size={16} className="text-accent" />
            <span className="font-semibold text-sm text-foreground">
              {metric?.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {metric?.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default GoalMetricsHeader;