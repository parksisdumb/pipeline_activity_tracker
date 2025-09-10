import React from 'react';
import Icon from '../../../components/AppIcon';

const TrustSignals = ({ className = '' }) => {
  const trustFeatures = [
    {
      icon: 'Shield',
      title: 'Enterprise Security',
      description: 'SSL encrypted data transmission'
    },
    {
      icon: 'Lock',
      title: 'Secure Authentication',
      description: 'Multi-tenant organization access'
    },
    {
      icon: 'Users',
      title: 'Team Management',
      description: 'Role-based permissions system'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
        <Icon name="ShieldCheck" size={16} className="text-success" />
        <span>SSL Secured Connection</span>
      </div>
      {/* Trust Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {trustFeatures?.map((feature, index) => (
          <div key={index} className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Icon name={feature?.icon} size={18} className="text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">
                {feature?.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {feature?.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* Copyright */}
      <div className="text-center text-xs text-muted-foreground">
        © {new Date()?.getFullYear()} Pipeline Tracker. All rights reserved.
      </div>
    </div>
  );
};

export default TrustSignals;