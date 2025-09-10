import React from 'react';
import Icon from '../../../components/AppIcon';

const MetricsCard = ({ 
  title, 
  value, 
  icon, 
  color = 'accent',
  trend = null,
  subtitle = null,
  className = '' 
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'text-success bg-success/10 border-success/20';
      case 'warning':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'error':
        return 'text-error bg-error/10 border-error/20';
      case 'info':
        return 'text-info bg-info/10 border-info/20';
      default:
        return 'text-accent bg-accent/10 border-accent/20';
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 elevation-1 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses()}`}>
            <Icon name={icon} size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-3xl font-bold text-foreground">{value?.toLocaleString?.() || value}</span>
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        {trend !== null && (
          <div className={`flex items-center space-x-1 text-xs ${
            trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-muted-foreground'
          }`}>
            <Icon 
              name={trend > 0 ? 'TrendingUp' : trend < 0 ? 'TrendingDown' : 'Minus'} 
              size={12} 
            />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-between">
        <div className={`text-xs px-2 py-1 rounded-full ${getColorClasses()}`}>
          System Health: Good
        </div>
        
        <div className="text-xs text-muted-foreground">
          Updated now
        </div>
      </div>
    </div>
  );
};

export default MetricsCard;