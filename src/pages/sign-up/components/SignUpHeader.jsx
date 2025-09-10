import React from 'react';
import Icon from '../../../components/AppIcon';

const SignUpHeader = ({ className = '' }) => {
  return (
    <div className={`text-center space-y-6 ${className}`}>
      {/* Logo */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center elevation-1">
          <Icon name="Activity" size={32} color="var(--color-primary-foreground)" />
        </div>
      </div>

      {/* Brand and Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">
          Pipeline Tracker
        </h1>
        <p className="text-lg text-muted-foreground">
          Commercial Roofing CRM
        </p>
      </div>

      {/* Welcome Message */}
      <div className="space-y-1">
        <h2 className="text-xl font-medium text-foreground">
          Create Your Account
        </h2>
        <p className="text-sm text-muted-foreground">
          Join the leading CRM platform for roofing professionals
        </p>
      </div>
    </div>
  );
};

export default SignUpHeader;