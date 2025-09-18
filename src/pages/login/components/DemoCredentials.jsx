import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const DemoCredentials = ({ onCredentialSelect, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const demoCredentials = [
    {
      email: 'admin@acmeroofing.com',
      password: 'password123',
      role: 'Admin',
      description: 'Tenant Admin Access',
      icon: 'Shield'
    },
    {
      email: 'manager@summitpm.com', 
      password: 'password123',
      role: 'Manager',
      description: 'Property Manager Access',
      icon: 'BarChart3'
    },
    {
      email: 'team@dillyos.com',
      password: 'Rom@ns_116',
      role: 'Super Admin',
      description: 'Cross-Tenant Super Admin Access',
      icon: 'Crown'
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
          
          {demoCredentials?.map((account, index) => (
            <button
              key={index}
              onClick={() => handleCredentialClick(account)}
              className="w-full text-left p-3 bg-card border border-border rounded-md hover:bg-muted transition-colors duration-200"
            >
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 ${
                  account?.role === 'Super Admin' ? 'bg-red-500' :
                  account?.role === 'Admin' ? 'bg-purple-500' : 'bg-primary'
                }/10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon 
                    name={account?.icon} 
                    size={16} 
                    className={
                      account?.role === 'Super Admin' ? 'text-red-500' :
                      account?.role === 'Admin' ? 'text-purple-500' : 'text-primary'
                    } 
                  />
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

          {/* Special Super Admin Badge */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Icon name="Crown" size={16} className="text-white" />
                </div>
                <div>
                  <div className="font-medium text-white">Super Administrator</div>
                  <div className="text-xs text-red-100">Complete system control</div>
                </div>
              </div>
              <button
                onClick={() => handleCredentialClick({
                  email: 'team@dillyos.com',
                  password: 'Rom@ns_116'
                })}
                className="text-xs px-3 py-1 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
              >
                Use Super Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoCredentials;