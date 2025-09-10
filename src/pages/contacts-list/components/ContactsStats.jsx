import React from 'react';
import Icon from '../../../components/AppIcon';

const ContactsStats = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Contacts',
      value: stats?.total,
      icon: 'Users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Engaged',
      value: stats?.engaged,
      icon: 'UserCheck',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'DM Confirmed',
      value: stats?.dmConfirmed,
      icon: 'MessageCircle',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Dormant',
      value: stats?.dormant,
      icon: 'UserX',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards?.map((stat) => (
        <div
          key={stat?.title}
          className="bg-card border border-border rounded-lg p-4 elevation-1"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{stat?.title}</p>
              <p className="text-2xl font-semibold text-foreground">
                {stat?.value?.toLocaleString()}
              </p>
            </div>
            <div className={`w-10 h-10 ${stat?.bgColor} rounded-lg flex items-center justify-center`}>
              <Icon name={stat?.icon} size={20} className={stat?.color} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactsStats;