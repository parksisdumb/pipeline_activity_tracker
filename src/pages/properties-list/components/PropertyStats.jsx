import React from 'react';
import Icon from '../../../components/AppIcon';

const PropertyStats = ({ properties }) => {
  const stats = [
    {
      label: 'Total Properties',
      value: properties?.length,
      icon: 'Building2',
      color: 'text-blue-600'
    },
    {
      label: 'Unassessed',
      value: properties?.filter(p => p?.stage === 'Unassessed')?.length,
      icon: 'AlertCircle',
      color: 'text-slate-600'
    },
    {
      label: 'Assessed',
      value: properties?.filter(p => p?.stage === 'Assessed')?.length,
      icon: 'CheckCircle',
      color: 'text-blue-600'
    },
    {
      label: 'Proposals Sent',
      value: properties?.filter(p => p?.stage === 'Proposal Sent')?.length,
      icon: 'FileText',
      color: 'text-yellow-600'
    },
    {
      label: 'In Negotiation',
      value: properties?.filter(p => p?.stage === 'In Negotiation')?.length,
      icon: 'MessageSquare',
      color: 'text-orange-600'
    },
    {
      label: 'Won',
      value: properties?.filter(p => p?.stage === 'Won')?.length,
      icon: 'Trophy',
      color: 'text-green-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {stats?.map((stat, index) => (
        <div key={index} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-muted ${stat?.color}`}>
              <Icon name={stat?.icon} size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat?.value}</p>
              <p className="text-sm text-muted-foreground">{stat?.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PropertyStats;