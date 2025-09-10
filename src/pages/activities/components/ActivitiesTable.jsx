import React from 'react';
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { cn } from '../../../utils/cn';

const ActivitiesTable = ({
  activities = [],
  sortConfig = {},
  onSort,
  expandedActivity,
  onToggleExpand,
  onNavigateToAccount,
  activeTab = 'all'
}) => {
  const handleSort = (key) => {
    onSort?.(key);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig?.key !== columnKey) {
      return 'ArrowUpDown';
    }
    return sortConfig?.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateShort = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, HH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  const getActivityTypeIcon = (type) => {
    const icons = {
      'Phone Call': 'Phone',
      'Email': 'Mail',
      'Meeting': 'Users',
      'Site Visit': 'MapPin',
      'Proposal Sent': 'FileText',
      'Follow-up': 'Clock',
      'Assessment': 'CheckSquare',
      'Contract Signed': 'Award'
    };
    return icons?.[type] || 'Activity';
  };

  const getOutcomeBadge = (outcome) => {
    const badges = {
      'Successful': 'bg-green-100 text-green-800',
      'Contract Signed': 'bg-emerald-100 text-emerald-800',
      'Meeting Scheduled': 'bg-blue-100 text-blue-800',
      'Proposal Requested': 'bg-purple-100 text-purple-800',
      'Interested': 'bg-cyan-100 text-cyan-800',
      'Callback Requested': 'bg-yellow-100 text-yellow-800',
      'No Answer': 'bg-gray-100 text-gray-800',
      'Not Interested': 'bg-red-100 text-red-800'
    };
    
    return badges?.[outcome] || 'bg-gray-100 text-gray-800';
  };

  const getDateBadge = (dateString) => {
    try {
      const activityDate = new Date(dateString);
      
      if (isToday(activityDate)) {
        return 'bg-green-100 text-green-800 border border-green-200';
      } else if (isFuture(activityDate)) {
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      } else if (isPast(activityDate)) {
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      }
      
      return 'bg-gray-100 text-gray-800';
    } catch {
      return 'bg-red-100 text-red-800';
    }
  };

  const getTimeIndicator = (dateString) => {
    try {
      const activityDate = new Date(dateString);
      
      if (isToday(activityDate)) {
        return { label: 'Today', color: 'text-green-600' };
      } else if (isFuture(activityDate)) {
        return { label: 'Future', color: 'text-blue-600' };
      } else if (isPast(activityDate)) {
        return { label: 'Past', color: 'text-gray-600' };
      }
      
      return { label: 'Unknown', color: 'text-gray-600' };
    } catch {
      return { label: 'Invalid', color: 'text-red-600' };
    }
  };

  if (activities?.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <Icon name="Activity" size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No activities to display</h3>
        <p className="text-muted-foreground">Activities will appear here when they match your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('activity_date')}
                  iconName={getSortIcon('activity_date')}
                  iconPosition="right"
                  className="font-medium text-foreground"
                >
                  Date & Time
                </Button>
              </th>
              <th className="text-left p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('activity_type')}
                  iconName={getSortIcon('activity_type')}
                  iconPosition="right"
                  className="font-medium text-foreground"
                >
                  Type
                </Button>
              </th>
              <th className="text-left p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('subject')}
                  iconName={getSortIcon('subject')}
                  iconPosition="right"
                  className="font-medium text-foreground"
                >
                  Subject
                </Button>
              </th>
              <th className="text-left p-4">Account</th>
              <th className="text-left p-4">Contact</th>
              <th className="text-left p-4">Outcome</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activities?.map((activity) => {
              const timeIndicator = getTimeIndicator(activity?.activity_date);
              return (
                <React.Fragment key={activity?.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">
                          {formatDate(activity?.activity_date)}
                        </div>
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          getDateBadge(activity?.activity_date)
                        )}>
                          {timeIndicator?.label}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Icon 
                          name={getActivityTypeIcon(activity?.activity_type)} 
                          size={16} 
                          className="text-muted-foreground" 
                        />
                        <span className="text-sm font-medium">{activity?.activity_type}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-foreground max-w-xs truncate">
                        {activity?.subject}
                      </div>
                      {activity?.description && (
                        <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                          {activity?.description}
                        </div>
                      )}
                      {/* Show follow-up date if exists and is future */}
                      {activity?.follow_up_date && isFuture(new Date(activity?.follow_up_date)) && (
                        <div className="flex items-center gap-1 mt-1">
                          <Icon name="Clock" size={12} className="text-cyan-600" />
                          <span className="text-xs text-cyan-600 font-medium">
                            Follow-up: {formatDateShort(activity?.follow_up_date)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {activity?.account ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateToAccount?.(activity?.account?.id)}
                          className="text-blue-600 hover:text-blue-800 p-0 h-auto font-normal"
                        >
                          {activity?.account?.name}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {activity?.contact ? (
                        <div className="text-sm">
                          {activity?.contact?.first_name} {activity?.contact?.last_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {activity?.outcome ? (
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          getOutcomeBadge(activity?.outcome)
                        )}>
                          {activity?.outcome}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleExpand?.(
                          expandedActivity === activity?.id ? null : activity?.id
                        )}
                        iconName={expandedActivity === activity?.id ? "ChevronUp" : "ChevronDown"}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                  {/* Expanded Row */}
                  {expandedActivity === activity?.id && (
                    <tr>
                      <td colSpan={7} className="p-4 bg-gray-50 border-t">
                        <div className="space-y-3">
                          {activity?.description && (
                            <div>
                              <h4 className="font-medium text-sm text-foreground mb-1">Description</h4>
                              <p className="text-sm text-muted-foreground">{activity?.description}</p>
                            </div>
                          )}
                          
                          {activity?.notes && (
                            <div>
                              <h4 className="font-medium text-sm text-foreground mb-1">Notes</h4>
                              <p className="text-sm text-muted-foreground">{activity?.notes}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            {activity?.duration_minutes && (
                              <div>
                                <span className="font-medium">Duration:</span>
                                <span className="ml-1 text-muted-foreground">
                                  {activity?.duration_minutes} minutes
                                </span>
                              </div>
                            )}
                            
                            {activity?.follow_up_date && (
                              <div>
                                <span className="font-medium">Follow-up:</span>
                                <span className="ml-1 text-muted-foreground">
                                  {formatDate(activity?.follow_up_date)}
                                </span>
                              </div>
                            )}
                            
                            {activity?.property && (
                              <div>
                                <span className="font-medium">Property:</span>
                                <span className="ml-1 text-muted-foreground">
                                  {activity?.property?.name}
                                </span>
                              </div>
                            )}
                            
                            {activity?.user && (
                              <div>
                                <span className="font-medium">Rep:</span>
                                <span className="ml-1 text-muted-foreground">
                                  {activity?.user?.full_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-200">
        {activities?.map((activity) => {
          const timeIndicator = getTimeIndicator(activity?.activity_date);
          return (
            <div key={activity?.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon 
                    name={getActivityTypeIcon(activity?.activity_type)} 
                    size={18} 
                    className="text-muted-foreground" 
                  />
                  <span className="font-medium text-sm">{activity?.activity_type}</span>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {formatDateShort(activity?.activity_date)}
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    getDateBadge(activity?.activity_date)
                  )}>
                    {timeIndicator?.label}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-sm">{activity?.subject}</h3>
                
                {activity?.description && (
                  <p className="text-xs text-muted-foreground">{activity?.description}</p>
                )}

                {/* Follow-up indicator for mobile */}
                {activity?.follow_up_date && isFuture(new Date(activity?.follow_up_date)) && (
                  <div className="flex items-center gap-1">
                    <Icon name="Clock" size={12} className="text-cyan-600" />
                    <span className="text-xs text-cyan-600 font-medium">
                      Follow-up: {formatDateShort(activity?.follow_up_date)}
                    </span>
                  </div>
                )}

                {activity?.outcome && (
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    getOutcomeBadge(activity?.outcome)
                  )}>
                    {activity?.outcome}
                  </span>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    {activity?.account ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigateToAccount?.(activity?.account?.id)}
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto font-normal text-xs"
                      >
                        {activity?.account?.name}
                      </Button>
                    ) : (
                      'No account'
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleExpand?.(
                      expandedActivity === activity?.id ? null : activity?.id
                    )}
                    iconName={expandedActivity === activity?.id ? "ChevronUp" : "ChevronDown"}
                    className="text-xs"
                  >
                    {expandedActivity === activity?.id ? 'Less' : 'More'}
                  </Button>
                </div>
                
                {/* Mobile Expanded Content */}
                {expandedActivity === activity?.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {activity?.notes && (
                      <div>
                        <h4 className="font-medium text-xs mb-1">Notes</h4>
                        <p className="text-xs text-muted-foreground">{activity?.notes}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {activity?.contact && (
                        <div>
                          <span className="font-medium">Contact:</span>
                          <span className="ml-1 text-muted-foreground">
                            {activity?.contact?.first_name} {activity?.contact?.last_name}
                          </span>
                        </div>
                      )}
                      
                      {activity?.duration_minutes && (
                        <div>
                          <span className="font-medium">Duration:</span>
                          <span className="ml-1 text-muted-foreground">
                            {activity?.duration_minutes}m
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivitiesTable;