import React, { useState, useEffect } from 'react';
import { notificationsService } from '../../services/notificationsService';
import Button from './Button';
import Icon from '../AppIcon';
import NotificationPanel from './NotificationPanel';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial unread count
  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Subscribe to real-time notification changes
  useEffect(() => {
    const unsubscribe = notificationsService?.subscribeToNotifications((payload) => {
      // Reload unread count when notifications change
      loadUnreadCount();
    });

    return unsubscribe;
  }, []);

  const loadUnreadCount = async () => {
    try {
      setLoading(true);
      const count = await notificationsService?.getUnreadCount();
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService?.markAllAsRead();
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationRead = async (notificationId) => {
    try {
      await notificationsService?.markAsRead(notificationId);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBellClick}
          className={`relative transition-colors duration-200 h-8 w-8 p-0 ${
            isOpen ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
          }`}
          disabled={loading}
        >
          <Icon 
            name="Bell" 
            size={16} 
            className={loading ? 'animate-pulse' : ''}
          />
          
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-medium rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 border border-background text-[10px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Notification panel with improved positioning */}
        {isOpen && (
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 z-50 w-screen max-w-[320px] sm:max-w-[384px] sm:left-auto sm:right-0 sm:transform-none">
            <div className="mx-4 sm:mx-0">
              <NotificationPanel
                onClose={handleClose}
                onMarkAllAsRead={handleMarkAllAsRead}
                onNotificationRead={handleNotificationRead}
                unreadCount={unreadCount}
              />
            </div>
          </div>
        )}
      </div>

      {/* Overlay to close panel when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-transparent"
          onClick={handleClose}
        />
      )}
    </>
  );
};

export default NotificationBell;