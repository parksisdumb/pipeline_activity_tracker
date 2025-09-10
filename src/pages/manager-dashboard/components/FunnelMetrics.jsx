import React from 'react';
import Icon from '../../../components/AppIcon';

const FunnelMetrics = ({ funnelData, className = '' }) => {
  const stages = [
    { key: 'prospects', label: 'Prospects', icon: 'Users', color: 'text-blue-600' },
    { key: 'contacted', label: 'Contacted', icon: 'Phone', color: 'text-indigo-600' },
    { key: 'qualified', label: 'Qualified', icon: 'CheckCircle', color: 'text-purple-600' },
    { key: 'assessments', label: 'Assessments', icon: 'Calendar', color: 'text-pink-600' },
    { key: 'proposals', label: 'Proposals', icon: 'FileText', color: 'text-orange-600' },
    { key: 'wins', label: 'Wins', icon: 'Trophy', color: 'text-success' }
  ];

  const getConversionRate = (current, previous) => {
    if (previous === 0) return 0;
    return Math.round((current / previous) * 100);
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 elevation-1 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Sales Funnel</h3>
        <div className="text-sm text-muted-foreground">
          Team-wide conversion rates
        </div>
      </div>
      <div className="space-y-4">
        {stages?.map((stage, index) => {
          const currentValue = funnelData?.[stage?.key] || 0;
          const previousValue = index > 0 ? funnelData?.[stages?.[index - 1]?.key] || 0 : currentValue;
          const conversionRate = getConversionRate(currentValue, previousValue);
          const isFirst = index === 0;
          const isLast = index === stages?.length - 1;

          return (
            <div key={stage?.key} className="relative">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center ${stage?.color}`}>
                    <Icon name={stage?.icon} size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{stage?.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {currentValue} {stage?.key === 'wins' ? 'closed deals' : 'opportunities'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{currentValue}</div>
                  {!isFirst && (
                    <div className={`text-sm ${conversionRate >= 20 ? 'text-success' : conversionRate >= 10 ? 'text-warning' : 'text-error'}`}>
                      {conversionRate}% conversion
                    </div>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className="flex justify-center py-2">
                  <div className="w-px h-4 bg-border"></div>
                  <Icon name="ChevronDown" size={16} className="text-muted-foreground -ml-2 bg-background" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 bg-muted/20 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Conversion Rate</span>
          <span className="font-semibold text-foreground">
            {getConversionRate(funnelData?.wins || 0, funnelData?.prospects || 0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default FunnelMetrics;