import React from 'react';
import Icon from '../../../components/AppIcon';

const ActivityStats = ({ activities = [], loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 })?.map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalActivities = activities?.length || 0;
  
  // Calculate stats
  const todayActivities = activities?.filter(activity => {
    const activityDate = new Date(activity?.activity_date);
    const today = new Date();
    return activityDate?.toDateString() === today?.toDateString();
  })?.length || 0;

  const weekActivities = activities?.filter(activity => {
    const activityDate = new Date(activity?.activity_date);
    const weekAgo = new Date();
    weekAgo?.setDate(weekAgo?.getDate() - 7);
    return activityDate >= weekAgo;
  })?.length || 0;

  const successfulActivities = activities?.filter(activity => 
    activity?.outcome === 'Successful' || 
    activity?.outcome === 'Contract Signed' ||
    activity?.outcome === 'Meeting Scheduled'
  )?.length || 0;

  const stats = [
    {
      label: 'Total Activities',
      value: totalActivities,
      icon: 'Activity',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Today',
      value: todayActivities,
      icon: 'Calendar',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'This Week',
      value: weekActivities,
      icon: 'CalendarDays',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Successful',
      value: successfulActivities,
      icon: 'CheckCircle',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats?.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat?.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat?.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${stat?.bgColor} flex items-center justify-center`}>
              <Icon name={stat?.icon} size={24} className={stat?.color} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityStats;