import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const ActivitiesTab = ({ accountId, activities, loading, onLogActivity, onRefreshActivities }) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('');

  const activityTypeOptions = [
    { value: '', label: 'All Activities' },
    { value: 'pop_in', label: 'Pop-in' },
    { value: 'dm_conversation', label: 'DM Conversation' },
    { value: 'assessment_booked', label: 'Assessment Booked' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'win', label: 'Win' },
    { value: 'loss', label: 'Loss' },
    { value: 'call', label: 'Call' },
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Meeting' }
  ];

  const dateRangeOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' }
  ];

  const getActivityIcon = (type) => {
    const activityIcons = {
      'pop_in': 'MapPin',
      'dm_conversation': 'MessageCircle',
      'assessment_booked': 'Calendar',
      'proposal_sent': 'FileText',
      'win': 'Trophy',
      'loss': 'X',
      'call': 'Phone',
      'email': 'Mail',
      'meeting': 'Users'
    };
    return activityIcons?.[type] || 'Activity';
  };

  const getActivityColor = (type) => {
    const activityColors = {
      'pop_in': 'text-blue-600',
      'dm_conversation': 'text-green-600',
      'assessment_booked': 'text-yellow-600',
      'proposal_sent': 'text-orange-600',
      'win': 'text-emerald-600',
      'loss': 'text-red-600',
      'call': 'text-purple-600',
      'email': 'text-indigo-600',
      'meeting': 'text-pink-600'
    };
    return activityColors?.[type] || 'text-slate-600';
  };

  const formatActivityType = (type) => {
    const typeLabels = {
      'pop_in': 'Pop-in',
      'dm_conversation': 'DM Conversation',
      'assessment_booked': 'Assessment Booked',
      'proposal_sent': 'Proposal Sent',
      'win': 'Win',
      'loss': 'Loss',
      'call': 'Call',
      'email': 'Email',
      'meeting': 'Meeting'
    };
    return typeLabels?.[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date?.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date?.getFullYear() !== now?.getFullYear() ? 'numeric' : undefined
    });
  };

  const filteredActivities = activities?.filter(activity => {
    const matchesType = !filterType || activity?.type === filterType;
    
    let matchesDateRange = true;
    if (filterDateRange) {
      const activityDate = new Date(activity.timestamp);
      const now = new Date();
      
      switch (filterDateRange) {
        case 'today':
          matchesDateRange = activityDate?.toDateString() === now?.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDateRange = activityDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          matchesDateRange = activityDate >= monthAgo;
          break;
        case 'quarter':
          const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          matchesDateRange = activityDate >= quarterAgo;
          break;
      }
    }
    
    return matchesType && matchesDateRange;
  });

  // Loading state for activities
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground">
            Activity History
          </h3>
          <Button 
            onClick={onLogActivity}
            iconName="Plus"
            iconPosition="left"
            size="sm"
          >
            Log Activity
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Log Activity Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-foreground">
            Activity History ({activities?.length})
          </h3>
          {onRefreshActivities && (
            <button
              onClick={onRefreshActivities}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh activities"
            >
              <Icon name="RefreshCw" size={16} />
            </button>
          )}
        </div>
        <Button 
          onClick={onLogActivity}
          iconName="Plus"
          iconPosition="left"
          size="sm"
        >
          Log Activity
        </Button>
      </div>
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          id="activity-type-filter"
          name="activityType"
          label="Activity Type"
          placeholder="Filter by activity type"
          options={activityTypeOptions}
          value={filterType}
          onChange={setFilterType}
          onSearchChange={() => {}}
          onOpenChange={() => {}}
          error=""
          description=""
        />
        <Select
          id="date-range-filter"
          name="dateRange"
          label="Date Range"
          placeholder="Filter by date range"
          options={dateRangeOptions}
          value={filterDateRange}
          onChange={setFilterDateRange}
          onSearchChange={() => {}}
          onOpenChange={() => {}}
          error=""
          description=""
        />
      </div>
      {/* Activities Timeline */}
      {filteredActivities?.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="Activity" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">No Activities Found</h4>
          <p className="text-muted-foreground mb-4">
            {activities?.length === 0 
              ? "No activities have been logged for this account yet."
              : "No activities match your current filters."
            }
          </p>
          {activities?.length === 0 && (
            <Button onClick={onLogActivity} iconName="Plus" iconPosition="left">
              Log First Activity
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities?.map((activity, index) => (
            <div key={activity?.id} className="relative">
              {/* Timeline Line */}
              {index < filteredActivities?.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-border"></div>
              )}
              
              <div className="flex gap-4">
                {/* Activity Icon */}
                <div className={`w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center flex-shrink-0 ${getActivityColor(activity?.type)}`}>
                  <Icon 
                    name={getActivityIcon(activity?.type)} 
                    size={20}
                  />
                </div>

                {/* Activity Content */}
                <div className="flex-1 bg-card border border-border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {formatActivityType(activity?.type)}
                      </h4>
                      {activity?.property && (
                        <p className="text-sm text-muted-foreground">
                          at {activity?.property}
                        </p>
                      )}
                      {activity?.contact && (
                        <p className="text-sm text-muted-foreground">
                          with {activity?.contact}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(activity?.timestamp)}
                    </div>
                  </div>

                  {activity?.outcome && (
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        {activity?.outcome}
                      </span>
                    </div>
                  )}

                  {activity?.notes && (
                    <p className="text-sm text-muted-foreground">
                      {activity?.notes}
                    </p>
                  )}

                  {activity?.nextAction && (
                    <div className="mt-3 p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <Icon name="ArrowRight" size={14} className="text-accent" />
                        <span className="text-sm font-medium text-foreground">Next Action:</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity?.nextAction}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivitiesTab;