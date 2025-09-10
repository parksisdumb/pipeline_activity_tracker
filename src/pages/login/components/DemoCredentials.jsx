import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const DemoCredentials = ({ onCredentialSelect, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const demoAccounts = [
    {
      role: 'Sales Representative',
      email: 'rep@roofingcrm.com',
      password: 'rep123',
      description: 'Field sales rep with activity logging access',
      icon: 'User'
    },
    {
      role: 'Sales Manager',
      email: 'manager@roofingcrm.com',
      password: 'manager123',
      description: 'Team manager with dashboard and goal setting',
      icon: 'Users'
    },
    {
      role: 'Administrator',
      email: 'admin@roofingcrm.com',
      password: 'admin123',
      description: 'Full system access and organization management',
      icon: 'Shield'
    }
  ];

  const handleCredentialClick = (account) => {
    if (onCredentialSelect) {
      onCredentialSelect(account?.email, account?.password);
    }
  };

  return (
    <div className={`bg-muted/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon name="Info" size={16} className="text-accent" />
          <h3 className="text-sm font-medium text-foreground">Demo Accounts</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
          iconPosition="right"
        >
          {isExpanded ? 'Hide' : 'Show'}
        </Button>
      </div>
      {isExpanded && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground mb-4">
            Click any account below to auto-fill login credentials
          </p>
          
          {demoAccounts?.map((account, index) => (
            <button
              key={index}
              onClick={() => handleCredentialClick(account)}
              className="w-full text-left p-3 bg-card border border-border rounded-md hover:bg-muted transition-colors duration-200"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name={account?.icon} size={16} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-foreground">
                      {account?.role}
                    </h4>
                    <Icon name="ArrowRight" size={14} className="text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {account?.description}
                  </p>
                  <div className="flex items-center space-x-4 text-xs">
                    <span className="text-muted-foreground">
                      <span className="font-medium">Email:</span> {account?.email}
                    </span>
                    <span className="text-muted-foreground">
                      <span className="font-medium">Password:</span> {account?.password}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DemoCredentials;