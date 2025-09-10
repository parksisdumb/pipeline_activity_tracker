import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { activitiesService } from '../../../services/activitiesService';

const RecentActivities = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load recent activities from database
  useEffect(() => {
    const loadRecentActivities = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const result = await activitiesService?.getRecentActivities(user?.id, 5);
        if (result?.success) {
          setActivities(result?.data || []);
        }
      } catch (error) {
        console.error('Failed to load recent activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentActivities();
  }, [user?.id, refreshKey]);

  // Add refresh function for real-time updates
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Auto-refresh every 30 seconds when tab is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type) => {
    const iconMap = {
      'Phone Call': "Phone",
      'Email': "Mail", 
      'Meeting': "Users",
      'Site Visit': "MapPin",
      'Proposal Sent': "FileText",
      'Follow-up': "MessageCircle", 
      'Assessment': "Calendar",
      'Contract Signed': "Trophy"
    };
    return iconMap?.[type] || "Activity";
  };

  const getActivityColor = (type) => {
    const colorMap = {
      'Phone Call': "text-indigo-600 bg-indigo-100",
      'Email': "text-cyan-600 bg-cyan-100", 
      'Meeting': "text-pink-600 bg-pink-100",
      'Site Visit': "text-blue-600 bg-blue-100",
      'Proposal Sent': "text-orange-600 bg-orange-100",
      'Follow-up': "text-green-600 bg-green-100",
      'Assessment': "text-purple-600 bg-purple-100",
      'Contract Signed': "text-yellow-600 bg-yellow-100"
    };
    return colorMap?.[type] || "text-gray-600 bg-gray-100";
  };

  const getActivityLabel = (type) => {
    return type || "Activity";
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diffInHours = Math.floor((now - activityDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - activityDate) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return activityDate?.toLocaleDateString();
    }
  };

  const handleViewAllActivities = () => {
    navigate('/activities');
  };

  if (loading) {
    return (
      <div className={`bg-card rounded-xl border border-border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Recent Activities</h2>
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <div className="space-y-4">
          {[...Array(3)]?.map((_, i) => (
            <div key={i} className="flex items-start space-x-4 p-4 rounded-xl bg-muted/30 animate-pulse">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-xl border border-border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Recent Activities</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            iconName="RefreshCw"
            className="text-xs"
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAllActivities}
            iconName="ArrowRight"
            iconPosition="right"
          >
            View All
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {activities?.map((activity) => (
          <div key={activity?.id} className="flex items-start space-x-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity?.activity_type)}`}>
              <Icon 
                name={getActivityIcon(activity?.activity_type)} 
                size={16}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {getActivityLabel(activity?.activity_type)}
                </p>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatTimestamp(activity?.activity_date)}
                </span>
              </div>
              
              <p className="text-sm text-foreground font-medium mb-1">
                {activity?.account?.name || 'Unknown Account'}
              </p>
              
              {activity?.contact && (
                <p className="text-xs text-muted-foreground mb-2">
                  {activity?.contact?.first_name} {activity?.contact?.last_name}
                </p>
              )}
              
              {activity?.outcome && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                    {activity?.outcome}
                  </span>
                </div>
              )}
              
              {activity?.subject && (
                <p className="text-xs text-muted-foreground line-clamp-1 font-medium">
                  {activity?.subject}
                </p>
              )}
              
              {activity?.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {activity?.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {activities?.length === 0 && (
        <div className="text-center py-8">
          <Icon name="Activity" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No recent activities</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start logging your field activities to see them here
          </p>
          <Button 
            onClick={() => navigate('/log-activity')}
            className="mt-4"
            size="sm"
          >
            Log Activity
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecentActivities;