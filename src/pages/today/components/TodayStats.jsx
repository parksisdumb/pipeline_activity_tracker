import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import { activitiesService } from '../../../services/activitiesService';
import { accountsService } from '../../../services/accountsService';
import { contactsService } from '../../../services/contactsService';
import { format } from 'date-fns';

const TodayStats = ({ className = '' }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayActivities: 0,
    newAccounts: 0,
    newContacts: 0,
    followUps: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load today's stats from database
  useEffect(() => {
    const loadTodayStats = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // Use current date in YYYY-MM-DD format for precise date matching
        const today = new Date();
        const todayStart = format(today, 'yyyy-MM-dd');
        const todayEnd = format(today, 'yyyy-MM-dd') + 'T23:59:59.999Z';
        
        // Load today's activities with improved date filtering
        const activitiesResult = await activitiesService?.getActivityStats(user?.id, {
          dateFrom: todayStart + 'T00:00:00.000Z',
          dateTo: todayEnd
        });
        
        console.log('Today activities result:', activitiesResult); // Debug log
        
        // Load accounts created today (filter by created_at)
        const accountsResult = await accountsService?.getAccounts({
          userId: user?.id,
          limit: 100
        });

        // Load contacts created today (filter by created_at)
        const contactsResult = await contactsService?.getContacts({
          userId: user?.id,
          limit: 100
        });

        // Load upcoming follow-ups for today
        const followUpsResult = await activitiesService?.getUpcomingTasks(user?.id, 20);

        // Filter accounts and contacts created today
        const todayAccountsCount = accountsResult?.success ? accountsResult?.data?.filter(account => {
          const createdDate = new Date(account?.created_at);
          return format(createdDate, 'yyyy-MM-dd') === todayStart;
        })?.length || 0 : 0;

        const todayContactsCount = contactsResult?.success ? contactsResult?.data?.filter(contact => {
          const createdDate = new Date(contact?.created_at);
          return format(createdDate, 'yyyy-MM-dd') === todayStart;
        })?.length || 0 : 0;

        // Filter follow-ups due today
        const todayFollowUpsCount = followUpsResult?.success ? followUpsResult?.data?.filter(task => {
          const followUpDate = new Date(task?.follow_up_date);
          return format(followUpDate, 'yyyy-MM-dd') === todayStart;
        })?.length || 0 : 0;

        setStats({
          // Use the total count from activity stats, which includes ALL activity types including emails
          todayActivities: activitiesResult?.success ? (activitiesResult?.data?.total || 0) : 0,
          newAccounts: todayAccountsCount,
          newContacts: todayContactsCount,
          followUps: todayFollowUpsCount
        });

        // Debug log to verify email activities are included
        if (activitiesResult?.success && activitiesResult?.data?.typeBreakdown) {
          console.log('Activity type breakdown:', activitiesResult?.data?.typeBreakdown);
          console.log('Email activities:', activitiesResult?.data?.typeBreakdown?.['Email'] || 0);
        }
      } catch (error) {
        console.error('Failed to load today stats:', error);
        // Set stats to 0 on error to avoid showing undefined values
        setStats({
          todayActivities: 0,
          newAccounts: 0,
          newContacts: 0,
          followUps: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadTodayStats();
  }, [user?.id, refreshKey]);

  // Auto-refresh every 60 seconds when tab is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setRefreshKey(prev => prev + 1);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const todayStats = [
    {
      id: 1,
      label: "Today\'s Activities",
      value: stats?.todayActivities,
      change: "Logged today",
      icon: "Activity",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      id: 2,
      label: "New Accounts",
      value: stats?.newAccounts,
      change: "Added today",
      icon: "Building2",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      id: 3,
      label: "New Contacts",
      value: stats?.newContacts,
      change: "Added today",
      icon: "UserPlus",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      id: 4,
      label: "Follow-ups Due",
      value: stats?.followUps,
      change: "Due today",
      icon: "Clock",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  if (loading) {
    return (
      <div className={`bg-card rounded-xl border border-border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Today's Overview</h2>
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)]?.map((_, i) => (
            <div key={i} className="text-center animate-pulse">
              <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-3" />
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded w-8 mx-auto" />
                <div className="h-3 bg-muted rounded w-16 mx-auto" />
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
        <h2 className="text-lg font-semibold text-foreground">Today's Overview</h2>
        <Icon
          name="RefreshCw"
          size={16}
          className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setRefreshKey(prev => prev + 1)}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {todayStats?.map((stat) => (
          <div key={stat?.id} className="text-center">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${stat?.bgColor}`}>
              <Icon 
                name={stat?.icon} 
                size={20} 
                className={stat?.color}
              />
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">
                {stat?.value}
              </p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {stat?.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {stat?.change}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodayStats;