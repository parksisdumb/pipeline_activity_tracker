import React, { useState, useEffect, useRef, useCallback } from 'react';
import { notificationsService } from '../../services/notificationsService';
import Button from './Button';
import Icon from '../AppIcon';

const NotificationPanel = ({ 
  onClose, 
  onMarkAllAsRead, 
  onNotificationRead,
  unreadCount = 0 
}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState(null);
  const scrollContainerRef = useRef(null);

  // Load initial notifications
  useEffect(() => {
    loadNotifications(true);
  }, []);

  // Load notifications with pagination support
  const loadNotifications = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const cursor = isInitial ? null : nextCursor;
      const result = await notificationsService?.getNotificationsPaginated(
        cursor, 
        20, // limit
        false // unreadOnly
      );

      const formattedNotifications = result?.items?.map(notification => 
        notificationsService?.formatNotification(notification)
      ) || [];

      setNotifications(prev => 
        isInitial ? formattedNotifications : [...prev, ...formattedNotifications]
      );
      setHasMore(result?.hasMore || false);
      setNextCursor(result?.nextCursor || null);

    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Handle scroll for infinite loading
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e?.target;
    const threshold = 100; // Load more when 100px from bottom

    if (
      scrollHeight - scrollTop - clientHeight < threshold &&
      hasMore &&
      !loadingMore
    ) {
      loadNotifications(false);
    }
  }, [hasMore, loadingMore, nextCursor]);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (notification?.isUnread) {
      try {
        await onNotificationRead?.(notification?.id);
        
        // Update local state
        setNotifications(prev => 
          prev?.map(n => 
            n?.id === notification?.id 
              ? { ...n, isUnread: false, read_at: new Date()?.toISOString() }
              : n
          )
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // Handle navigation based on notification data
    if (notification?.data?.task_id) {
      // Navigate to task details or task management
      window.location.href = `/task-management`;
    } else if (notification?.data?.activity_id) {
      // Navigate to activities
      window.location.href = `/activities`;
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await onMarkAllAsRead?.();
      
      // Update local state
      setNotifications(prev => 
        prev?.map(n => ({ 
          ...n, 
          isUnread: false, 
          read_at: new Date()?.toISOString() 
        }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Get notification display color based on type and read status
  const getNotificationColor = (notification) => {
    if (notification?.isUnread) {
      if (notification?.priority === 'high') {
        return 'border-l-destructive bg-destructive/5';
      } else if (notification?.priority === 'medium') {
        return 'border-l-warning bg-warning/5';
      }
      return 'border-l-primary bg-primary/5';
    }
    return 'border-l-muted-foreground/20 bg-transparent';
  };

  if (loading) {
    return (
      <div className="w-80 sm:w-96 bg-popover border border-border rounded-lg shadow-lg elevation-3 p-4">
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 sm:w-96 bg-popover border border-border rounded-lg shadow-lg elevation-3">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Icon name="Bell" size={18} />
          <h3 className="font-medium text-popover-foreground">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
        </div>
        
        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <Icon name="X" size={16} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div 
        ref={scrollContainerRef}
        className="max-h-96 overflow-y-auto"
        onScroll={handleScroll}
      >
        {error && (
          <div className="p-4 text-center text-destructive">
            <Icon name="AlertTriangle" size={20} className="mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadNotifications(true)}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {notifications?.length === 0 && !error && (
          <div className="p-8 text-center text-muted-foreground">
            <Icon name="Bell" size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs mt-1">You'll see updates about tasks and activities here</p>
          </div>
        )}

        {notifications?.length > 0 && (
          <div className="divide-y divide-border">
            {notifications?.map((notification) => (
              <div
                key={notification?.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-l-4 cursor-pointer hover:bg-muted/50 transition-colors duration-200 ${getNotificationColor(notification)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${notification?.isUnread ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Icon name={notification?.icon} size={18} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-medium truncate ${
                        notification?.isUnread ? 'text-popover-foreground' : 'text-muted-foreground'
                      }`}>
                        {notification?.title}
                      </h4>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {notification?.timeAgo}
                      </span>
                    </div>
                    
                    <p className={`text-sm mt-1 line-clamp-2 ${
                      notification?.isUnread ? 'text-popover-foreground' : 'text-muted-foreground'
                    }`}>
                      {notification?.body}
                    </p>

                    {notification?.isUnread && (
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-xs text-primary ml-2">Unread</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="p-4 text-center">
                <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && notifications?.length > 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                You've reached the end of your notifications
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;