import { supabase } from '../lib/supabase';

export const notificationsService = {
  // Get notifications with optional pagination and filters
  async getNotifications(options = {}) {
    try {
      const { 
        unreadOnly = false, 
        limit = 20, 
        offset = 0,
        type = null 
      } = options;

      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        ?.from('notifications')
        ?.select('*')
        ?.eq('user_id', user?.id)
        ?.order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query?.is('read_at', null);
      }

      if (type) {
        query = query?.eq('type', type);
      }

      if (limit) {
        query = query?.limit(limit);
      }

      if (offset) {
        query = query?.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  },

  // Get unread notification count
  async getUnreadCount() {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        ?.from('notifications')
        ?.select('id')
        ?.eq('user_id', user?.id)
        ?.is('read_at', null);

      if (error) {
        throw error;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  },

  // Mark a specific notification as read
  async markAsRead(notificationId) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        ?.from('notifications')
        ?.update({ 
          read_at: new Date()?.toISOString(),
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', notificationId)
        ?.eq('user_id', user?.id)
        ?.select()
        ?.single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        ?.from('notifications')
        ?.update({ 
          read_at: new Date()?.toISOString(),
          updated_at: new Date()?.toISOString()
        })
        ?.eq('user_id', user?.id)
        ?.is('read_at', null)
        ?.select();

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },

  // Create a new notification (for system use)
  async createNotification(notificationData) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get user's tenant_id from user_profiles
      const { data: userProfile, error: profileError } = await supabase
        ?.from('user_profiles')?.select('tenant_id')?.eq('id', user?.id)
        ?.single();

      if (profileError || !userProfile?.tenant_id) {
        throw new Error('User profile not found');
      }

      const { data, error } = await supabase
        ?.from('notifications')
        ?.insert([{
          ...notificationData,
          user_id: notificationData?.user_id || user?.id,
          tenant_id: userProfile?.tenant_id
        }])
        ?.select()
        ?.single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  },

  // Delete a notification
  async deleteNotification(notificationId) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        ?.from('notifications')?.delete()?.eq('id', notificationId)
        ?.eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  },

  // Get notifications with infinite scroll support
  async getNotificationsPaginated(cursor = null, limit = 20, unreadOnly = false) {
    try {
      const { data: { user }, error: userError } = await supabase?.auth?.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      let query = supabase
        ?.from('notifications')?.select('*')?.eq('user_id', user?.id)?.order('created_at', { ascending: false })
        ?.limit(limit + 1); // Get one extra to check if there are more

      if (unreadOnly) {
        query = query?.is('read_at', null);
      }

      if (cursor) {
        query = query?.lt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const notifications = data || [];
      const hasMore = notifications?.length > limit;
      const items = hasMore ? notifications?.slice(0, limit) : notifications;
      const nextCursor = hasMore ? items?.[items?.length - 1]?.created_at : null;

      return {
        items,
        hasMore,
        nextCursor
      };
    } catch (error) {
      console.error('Failed to get paginated notifications:', error);
      throw error;
    }
  },

  // Subscribe to notification changes for real-time updates
  subscribeToNotifications(callback) {
    try {
      // Create a cleanup function holder
      let cleanup = () => {};

      // Handle the async user check
      const setupSubscription = async () => {
        try {
          const { data: { user }, error: userError } = await supabase?.auth?.getUser();
          
          if (userError || !user) {
            console.error('Cannot subscribe: user not authenticated');
            return;
          }

          const channel = supabase
            ?.channel(`notifications_${user?.id}`)
            ?.on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user?.id}`
              },
              callback
            )
            ?.subscribe();

          // Update cleanup function with actual channel cleanup
          cleanup = () => supabase?.removeChannel(channel);
        } catch (error) {
          console.error('Failed to setup subscription:', error);
        }
      };

      // Start the subscription setup
      setupSubscription();

      // Return cleanup function immediately
      return () => cleanup();
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      return () => {};
    }
  },

  // Helper function to format notification for display
  formatNotification(notification) {
    if (!notification) return null;

    const timeAgo = (date) => {
      const now = new Date();
      const notificationDate = new Date(date);
      const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    return {
      ...notification,
      timeAgo: timeAgo(notification?.created_at),
      isUnread: !notification?.read_at,
      icon: this.getNotificationIcon(notification?.type),
      priority: this.getNotificationPriority(notification?.type)
    };
  },

  // Get icon name for notification type
  getNotificationIcon(type) {
    const iconMap = {
      task_assigned: 'UserPlus',
      task_due: 'Clock',
      task_overdue: 'AlertTriangle',
      activity_assessment: 'CheckCircle',
      activity_contract_signed: 'FileCheck',
      system_alert: 'Info'
    };
    return iconMap?.[type] || 'Bell';
  },

  // Get priority level for notification type
  getNotificationPriority(type) {
    const priorityMap = {
      task_overdue: 'high',
      activity_contract_signed: 'high',
      task_due: 'medium',
      task_assigned: 'medium',
      activity_assessment: 'medium',
      system_alert: 'low'
    };
    return priorityMap?.[type] || 'low';
  }
};

export default notificationsService;