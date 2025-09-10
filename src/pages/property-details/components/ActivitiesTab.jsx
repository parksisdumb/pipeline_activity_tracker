import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const ActivitiesTab = ({ activities, propertyId, onActivityLog }) => {
  const getActivityTypeIcon = (type) => {
    const icons = {
      'Phone Call': 'Phone',
      'Email': 'Mail',
      'Meeting': 'Users',
      'Site Visit': 'MapPin',
      'Proposal Sent': 'FileText',
      'Follow-up': 'Clock',
      'Assessment': 'Clipboard',
      'Contract Signed': 'CheckCircle'
    };
    return icons?.[type] || 'Activity';
  };

  const getOutcomeColor = (outcome) => {
    const colors = {
      'Successful': 'text-green-700 bg-green-100',
      'No Answer': 'text-gray-700 bg-gray-100',
      'Callback Requested': 'text-blue-700 bg-blue-100',
      'Not Interested': 'text-red-700 bg-red-100',
      'Interested': 'text-green-700 bg-green-100',
      'Proposal Requested': 'text-purple-700 bg-purple-100',
      'Meeting Scheduled': 'text-blue-700 bg-blue-100',
      'Contract Signed': 'text-emerald-700 bg-emerald-100'
    };
    return colors?.[outcome] || 'text-gray-700 bg-gray-100';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (!activities?.length) {
    return (
      <div className="text-center py-12">
        <Icon name="Activity" size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No activities yet</h3>
        <p className="text-muted-foreground mb-6">
          Start tracking interactions with this property by logging your first activity.
        </p>
        <Button onClick={onActivityLog} iconName="Plus" iconPosition="left">
          Log First Activity
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Log Activity Button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Recent Activities</h4>
        <Button size="sm" onClick={onActivityLog} iconName="Plus" iconPosition="left">
          Log Activity
        </Button>
      </div>

      {/* Activities Timeline */}
      <div className="space-y-4">
        {activities?.map((activity) => (
          <div key={activity?.id} className="flex gap-4 p-4 bg-muted/30 rounded-lg">
            {/* Activity Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon 
                name={getActivityTypeIcon(activity?.activity_type)} 
                size={18} 
                className="text-primary" 
              />
            </div>

            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-foreground truncate">{activity?.subject}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{activity?.activity_type}</span>
                    {activity?.duration_minutes && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(activity?.duration_minutes)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(activity?.activity_date)}
                </div>
              </div>

              {/* Description */}
              {activity?.description && (
                <p className="text-sm text-muted-foreground mb-3">{activity?.description}</p>
              )}

              {/* Notes */}
              {activity?.notes && (
                <p className="text-sm text-foreground mb-3">{activity?.notes}</p>
              )}

              {/* Outcome and Contact Info */}
              <div className="flex flex-wrap items-center gap-3">
                {activity?.outcome && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(activity?.outcome)}`}>
                    {activity?.outcome}
                  </span>
                )}
                
                {activity?.contact && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Icon name="User" size={14} />
                    <span>{activity?.contact?.first_name} {activity?.contact?.last_name}</span>
                  </div>
                )}

                {activity?.user && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Icon name="UserCheck" size={14} />
                    <span>{activity?.user?.full_name}</span>
                  </div>
                )}
              </div>

              {/* Follow-up */}
              {activity?.follow_up_date && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <div className="flex items-center gap-1 text-blue-700">
                    <Icon name="Calendar" size={14} />
                    <span className="font-medium">Follow-up:</span>
                    <span>{formatDate(activity?.follow_up_date)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {activities?.length >= 10 && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            Load More Activities
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivitiesTab;