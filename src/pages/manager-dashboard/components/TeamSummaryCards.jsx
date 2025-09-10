import React from 'react';
import Icon from '../../../components/AppIcon';

const TeamSummaryCards = ({ summaryData, className = '' }) => {
  const cards = [
    {
      title: 'Active Reps',
      value: summaryData?.activeReps,
      icon: 'Users',
      color: 'accent',
      description: 'Team members'
    },
    {
      title: 'Total Accounts',
      value: summaryData?.totalAccounts,
      icon: 'Building2',
      color: 'success',
      description: 'In pipeline'
    },
    {
      title: 'This Week Revenue',
      value: `$${summaryData?.weeklyRevenue?.toLocaleString()}`,
      icon: 'DollarSign',
      color: 'warning',
      description: 'Closed deals'
    },
    {
      title: 'Avg Deal Size',
      value: `$${summaryData?.avgDealSize?.toLocaleString()}`,
      icon: 'TrendingUp',
      color: 'error',
      description: 'Per opportunity'
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'success':
        return 'text-success bg-success/10 border-success/20';
      case 'warning':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'error':
        return 'text-error bg-error/10 border-error/20';
      default:
        return 'text-accent bg-accent/10 border-accent/20';
    }
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {cards?.map((card, index) => (
        <div key={index} className="bg-card border border-border rounded-lg p-6 elevation-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(card?.color)}`}>
                <Icon name={card?.icon} size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card?.title}</p>
                <p className="text-2xl font-bold text-foreground">{card?.value}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{card?.description}</p>
        </div>
      ))}
    </div>
  );
};

export default TeamSummaryCards;