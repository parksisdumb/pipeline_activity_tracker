import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import { activitiesService } from '../../../services/activitiesService';

const WeeklyGoalsProgress = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [weeklyStats, setWeeklyStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Define weekly goals (these could come from user settings later)
  const weeklyGoalTargets = {
    'Phone Call': 20,
    'Email': 30, // Added email target
    'Site Visit': 15, // Pop-ins
    'Meeting': 10, // DM Conversations  
    'Assessment': 5,
    'Proposal Sent': 3
  };

  // Load weekly progress from database
  useEffect(() => {
    const loadWeeklyProgress = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const now = new Date();
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        
        const filters = {
          dateFrom: format(weekStart, 'yyyy-MM-dd'),
          dateTo: format(weekEnd, 'yyyy-MM-dd')
        };

        const result = await activitiesService?.getActivityStats(user?.id, filters);
        if (result?.success) {
          setWeeklyStats(result?.data?.byType || {});
        }
      } catch (error) {
        console.error('Failed to load weekly progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyProgress();
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

  const weeklyGoals = [
    {
      id: 1,
      label: "Phone Calls",
      type: "Phone Call",
      current: weeklyStats?.['Phone Call'] || 0,
      target: weeklyGoalTargets?.['Phone Call'],
      icon: "Phone",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      id: 2,
      label: "Emails", // Added Email tracking
      type: "Email",
      current: weeklyStats?.['Email'] || 0,
      target: weeklyGoalTargets?.['Email'],
      icon: "Mail",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    },
    {
      id: 3,
      label: "Site Visits",
      type: "Site Visit", 
      current: weeklyStats?.['Site Visit'] || 0,
      target: weeklyGoalTargets?.['Site Visit'],
      icon: "MapPin",
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      id: 4,
      label: "Meetings",
      type: "Meeting",
      current: weeklyStats?.['Meeting'] || 0,
      target: weeklyGoalTargets?.['Meeting'],
      icon: "Users",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      id: 5,
      label: "Assessments",
      type: "Assessment", 
      current: weeklyStats?.['Assessment'] || 0,
      target: weeklyGoalTargets?.['Assessment'],
      icon: "Calendar",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      id: 6,
      label: "Proposals",
      type: "Proposal Sent",
      current: weeklyStats?.['Proposal Sent'] || 0,
      target: weeklyGoalTargets?.['Proposal Sent'],
      icon: "FileText",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100"
    }
  ];

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const getCurrentWeekRange = () => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  if (loading) {
    return (
      <div className={`bg-card rounded-xl border border-border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Weekly Progress</h2>
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)]?.map((_, i) => (
            <div key={i} className="text-center animate-pulse">
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-3" />
              <div className="space-y-1">
                <div className="h-3 bg-muted rounded w-16 mx-auto" />
                <div className="h-4 bg-muted rounded w-12 mx-auto" />
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
        <div>
          <h2 className="text-lg font-semibold text-foreground">Weekly Progress</h2>
          <div className="text-sm text-muted-foreground mt-1">
            Week of {getCurrentWeekRange()}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Icon
            name="RefreshCw"
            size={16}
            className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={() => setRefreshKey(prev => prev + 1)}
          />
          <button
            onClick={() => navigate('/weekly-goals')}
            className="text-sm text-primary hover:underline"
          >
            View Details
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {weeklyGoals?.map((goal) => {
          const progress = calculateProgress(goal?.current, goal?.target);
          const isComplete = goal?.current >= goal?.target;
          
          return (
            <div key={goal?.id} className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-3">
                {/* Progress Ring */}
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-muted opacity-20"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${progress * 1.76} 176`}
                    className={goal?.color}
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Icon */}
                <div className={`absolute inset-0 flex items-center justify-center ${goal?.bgColor} rounded-full m-2`}>
                  <Icon 
                    name={goal?.icon} 
                    size={16} 
                    className={goal?.color}
                  />
                </div>
                
                {/* Completion Badge */}
                {isComplete && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-success text-success-foreground rounded-full flex items-center justify-center">
                    <Icon name="Check" size={12} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {goal?.label}
                </p>
                <p className="text-lg font-bold text-foreground">
                  {goal?.current}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{goal?.target}
                  </span>
                </p>
                <div className={`text-xs font-medium ${isComplete ? 'text-success' : goal?.color}`}>
                  {Math.round(progress)}%
                  {isComplete && ' Complete!'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyGoalsProgress;