import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import WeekSelector from './WeekSelector';
import ProgressCard from './ProgressCard';
import GoalProgressChart from './GoalProgressChart';
import AchievementBadges from './AchievementBadges';

const IndividualProgressView = ({
  user,
  userProfile,
  currentWeek,
  onWeekChange,
  userGoals,
  goalStats,
  actualProgress,
  loading,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [viewType, setViewType] = useState('cards'); // 'cards' or 'chart'

  // Calculate completion percentage
  const calculateCompletion = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  // Get status color based on progress
  const getStatusColor = (current, target, status) => {
    if (status === 'Completed') return 'text-success';
    const completion = calculateCompletion(current, target);
    if (completion >= 100) return 'text-success';
    if (completion >= 75) return 'text-warning';
    if (completion >= 50) return 'text-info';
    return 'text-muted-foreground';
  };

  // Group goals by type for better display
  const goalsByType = userGoals?.reduce((acc, goal) => {
    acc[goal?.goal_type] = goal;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)]?.map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Weekly Goals Progress</h1>
          <p className="text-muted-foreground">
            Track your individual performance against weekly targets
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <Icon name="User" size={16} color="var(--color-secondary-foreground)" />
            </div>
            <span className="text-sm font-medium text-foreground">{userProfile?.full_name}</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded capitalize">
              {userProfile?.role}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewType === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('cards')}
              iconName="Grid3x3"
              className="px-3"
            >
              Cards
            </Button>
            <Button
              variant={viewType === 'chart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('chart')}
              iconName="BarChart3"
              className="px-3"
            >
              Chart
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            iconName="RefreshCw"
            iconPosition="left"
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/today')}
            iconName="Home"
            iconPosition="left"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Week Selection */}
      <WeekSelector
        currentWeek={currentWeek}
        onWeekChange={onWeekChange}
      />

      {/* Quick Stats Summary */}
      {goalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="Target" size={20} className="text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{goalStats?.total}</p>
                <p className="text-sm text-muted-foreground">Total Goals</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="CheckCircle" size={20} className="text-success" />
              <div>
                <p className="text-2xl font-bold text-success">{goalStats?.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="Clock" size={20} className="text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{goalStats?.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="TrendingUp" size={20} className="text-info" />
              <div>
                <p className="text-2xl font-bold text-info">{goalStats?.completionRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Badges */}
      <AchievementBadges 
        userGoals={userGoals}
        goalStats={goalStats}
        actualProgress={actualProgress}
      />

      {/* Progress View */}
      {viewType === 'cards' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Goal Progress</h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon name="Info" size={16} />
              <span>Based on logged activities this week</span>
            </div>
          </div>
          
          {userGoals?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userGoals?.map((goal) => (
                <ProgressCard
                  key={goal?.id}
                  goal={goal}
                  actualValue={actualProgress?.[goal?.goal_type] || 0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <Icon name="Target" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Goals Set Yet</h3>
              <p className="text-muted-foreground mb-4">
                Your manager hasn't set weekly goals for you yet.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/today')}
                iconName="Home"
                iconPosition="left"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      ) : (
        <GoalProgressChart 
          userGoals={userGoals}
          actualProgress={actualProgress}
        />
      )}

      {/* Action Center */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/log-activity')}
            iconName="Plus"
            iconPosition="left"
            className="justify-start"
          >
            Log New Activity
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/activities')}
            iconName="List"
            iconPosition="left"
            className="justify-start"
          >
            View All Activities
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/today')}
            iconName="Calendar"
            iconPosition="left"
            className="justify-start"
          >
            Today's Dashboard
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Clock" size={16} />
          <span>Last updated: {new Date()?.toLocaleTimeString()}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            iconName="RefreshCw"
            className="ml-2"
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IndividualProgressView;