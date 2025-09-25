import React from 'react';
import Icon from '../../../components/AppIcon';

const TeamSummaryCards = ({ summaryData, className = '' }) => {
  // Handle both formats - direct function return and transformed data
  const getCardValue = (field, fallback = 'N/A') => {
    if (!summaryData) return fallback;
    
    // Handle direct function return format
    if (Array.isArray(summaryData) && summaryData?.length > 0) {
      const data = summaryData?.[0];
      switch (field) {
        case 'activeReps':
          return data?.team_size || 0;
        case 'totalAccounts': 
          return data?.active_accounts || 0;
        case 'weeklyRevenue':
          return data?.total_activities_this_week || 0; // Use activities as proxy for revenue
        case 'avgDealSize':
          return data?.total_properties || 0; // Use properties as proxy for deal size
        default:
          return fallback;
      }
    }
    
    // Handle transformed object format (backward compatibility)
    switch (field) {
      case 'activeReps':
        return summaryData?.activeReps || summaryData?.team_size || 0;
      case 'totalAccounts':
        return summaryData?.totalAccounts || summaryData?.active_accounts || 0;
      case 'weeklyRevenue':
        return summaryData?.weeklyRevenue || summaryData?.total_activities_this_week || 0;
      case 'avgDealSize':
        return summaryData?.avgDealSize || summaryData?.total_properties || 0;
      default:
        return fallback;
    }
  };

  const cards = [
    {
      title: 'Active Reps',
      value: getCardValue('activeReps'),
      icon: 'Users',
      color: 'accent',
      description: 'Team members'
    },
    {
      title: 'Total Accounts',
      value: getCardValue('totalAccounts'),
      icon: 'Building2',
      color: 'success',
      description: 'In pipeline'
    },
    {
      title: 'This Week Activities',
      value: getCardValue('weeklyRevenue'),
      icon: 'Activity',
      color: 'warning',
      description: 'Team activities'
    },
    {
      title: 'Total Properties',
      value: getCardValue('avgDealSize'),
      icon: 'MapPin',
      color: 'error',
      description: 'Properties managed'
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