import React from 'react';
import Icon from '../../../components/AppIcon';

const SignUpBenefits = ({ className = '' }) => {
  const benefits = [
    {
      icon: 'TrendingUp',
      title: 'Track Your Pipeline',
      description: 'Monitor every stage of your sales process'
    },
    {
      icon: 'Users',
      title: 'Team Collaboration',
      description: 'Work seamlessly with your team members'
    },
    {
      icon: 'Target',
      title: 'Goal Management',
      description: 'Set and achieve your weekly targets'
    },
    {
      icon: 'BarChart3',
      title: 'Analytics & Reports',
      description: 'Get insights into your performance'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
        <Icon name="ShieldCheck" size={16} className="text-green-600" />
        <span>Secure & GDPR Compliant</span>
      </div>
      
      {/* Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {benefits?.map((benefit, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name={benefit?.icon} size={16} className="text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foreground">
                {benefit?.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {benefit?.description}
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

export default SignUpBenefits;