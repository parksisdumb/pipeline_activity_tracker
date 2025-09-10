import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ActivitiesTab = ({ activities, contactId, onActivityLog }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const activityTypes = ['all', 'Email', 'Phone Call', 'Meeting', 'Note'];
  
  const getActivityIcon = (type) => {
    const icons = {
      'Email': 'Mail',
      'Phone Call': 'Phone',
      'Meeting': 'Users',
      'Note': 'FileText',
      'Task': 'CheckSquare'
    };
    return icons?.[type] || 'Activity';
  };

  const getOutcomeColor = (outcome) => {
    const colors = {
      'Very Positive': 'text-green-600',
      'Positive': 'text-green-500',
      'Engaged': 'text-blue-500',
      'Neutral': 'text-yellow-600',
      'No Response': 'text-red-500',
      'Negative': 'text-red-600'
    };
    return colors?.[outcome] || 'text-muted-foreground';
  };

  const formatDateTime = (date) => {
    return new Date(date)?.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const filteredActivities = activities
    ?.filter(activity => filter === 'all' || activity?.type === filter)
    ?.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b?.date) - new Date(a?.date);
      }
      return a?.[sortBy]?.localeCompare(b?.[sortBy]);
    });

  const handleActivityClick = (activity) => {
    // Could open activity details modal or navigate to activity page
    console.log('Activity clicked:', activity);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Activity Type Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-foreground">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e?.target?.value)}
              className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
            >
              {activityTypes?.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-foreground">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e?.target?.value)}
              className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground"
            >
              <option value="date">Date</option>
              <option value="type">Type</option>
              <option value="outcome">Outcome</option>
            </select>
          </div>
        </div>

        {/* Add Activity Button */}
        <Button
          onClick={() => onActivityLog({ type: 'general', contactId })}
          size="sm"
        >
          <Icon name="Plus" size={16} className="mr-2" />
          Log Activity
        </Button>
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {filteredActivities?.length > 0 ? (
          filteredActivities?.map((activity) => (
            <div
              key={activity?.id}
              className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleActivityClick(activity)}
            >
              {/* Activity Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name={getActivityIcon(activity?.type)} size={16} color="var(--color-secondary-foreground)" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">{activity?.type}</h4>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(activity?.date)}</span>
                      {activity?.duration && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{formatDuration(activity?.duration)}</span>
                        </>
                      )}
                    </div>
                    <h5 className="text-sm font-medium text-foreground">{activity?.subject}</h5>
                  </div>
                </div>

                {/* Outcome Badge */}
                {activity?.outcome && (
                  <span className={`text-xs font-medium ${getOutcomeColor(activity?.outcome)}`}>
                    {activity?.outcome}
                  </span>
                )}
              </div>

              {/* Activity Description */}
              {activity?.description && (
                <div className="mb-3 pl-11">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {activity?.description}
                  </p>
                </div>
              )}

              {/* Next Action */}
              {activity?.nextAction && (
                <div className="pl-11">
                  <div className="flex items-center space-x-2 text-xs">
                    <Icon name="ArrowRight" size={12} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Next:</span>
                    <span className="text-foreground font-medium">{activity?.nextAction}</span>
                    {activity?.nextActionDate && (
                      <>
                        <span className="text-muted-foreground">by</span>
                        <span className="text-foreground">
                          {new Date(activity?.nextActionDate)?.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Icon name="Activity" size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-2">
              {filter === 'all' ? 'No activities found' : `No ${filter} activities found`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filter === 'all' ?'Start building your relationship by logging the first activity.'
                : `Try changing the filter or log a new ${filter} activity.`
              }
            </p>
            <Button
              onClick={() => onActivityLog({ type: filter === 'all' ? 'general' : filter?.toLowerCase(), contactId })}
              variant="outline"
              size="sm"
            >
              <Icon name="Plus" size={16} className="mr-2" />
              Log {filter === 'all' ? 'First' : filter} Activity
            </Button>
          </div>
        )}
      </div>

      {/* Activity Summary */}
      {filteredActivities?.length > 0 && (
        <div className="mt-6 p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {filteredActivities?.length} of {activities?.length} activities
            </span>
            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground">
                Last activity: {formatDateTime(activities?.[0]?.date)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesTab;