import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';

const QuickActions = ({ className = '' }) => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Set Weekly Goals',
      description: 'Assign targets for team members',
      icon: 'Target',
      variant: 'default',
      onClick: () => navigate('/weekly-goals')
    },
    {
      label: 'View All Accounts',
      description: 'Browse account pipeline',
      icon: 'Building2',
      variant: 'outline',
      onClick: () => navigate('/accounts-list')
    },
    {
      label: 'Team Activity Log',
      description: 'Recent team activities',
      icon: 'Activity',
      variant: 'outline',
      onClick: () => navigate('/today')
    },
    {
      label: 'Export Reports',
      description: 'Download performance data',
      icon: 'Download',
      variant: 'outline',
      onClick: () => console.log('Export reports')
    }
  ];

  return (
    <div className={`bg-card border border-border rounded-lg p-6 elevation-1 ${className}`}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions?.map((action, index) => (
          <Button
            key={index}
            variant={action?.variant}
            onClick={action?.onClick}
            className="h-auto p-4 justify-start text-left"
          >
            <div className="flex items-start space-x-3 w-full">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                  <action.icon size={16} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{action?.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{action?.description}</div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;