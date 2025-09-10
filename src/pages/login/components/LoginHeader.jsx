import React from 'react';
import Icon from '../../../components/AppIcon';

const LoginHeader = ({ className = '' }) => {
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
          Welcome Back
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in to access your sales pipeline and track your progress
        </p>
      </div>
    </div>
  );
};

export default LoginHeader;