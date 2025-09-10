import React from 'react';
import Icon from '../../../components/AppIcon';

const AchievementBadges = ({ userGoals, goalStats, actualProgress }) => {
  // Calculate achievements
  const achievements = [];

  // Perfect Week - All goals completed
  if (goalStats?.total > 0 && goalStats?.completed === goalStats?.total) {
    achievements?.push({
      id: 'perfect-week',
      title: 'Perfect Week',
      description: 'Completed all weekly goals',
      icon: 'Crown',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 border-yellow-200',
      iconBg: 'bg-yellow-100'
    });
  }

  // High Performer - 80%+ completion rate
  if (goalStats?.completionRate >= 80) {
    achievements?.push({
      id: 'high-performer',
      title: 'High Performer',
      description: '80%+ goal completion rate',
      icon: 'TrendingUp',
      color: 'text-green-500',
      bgColor: 'bg-green-50 border-green-200',
      iconBg: 'bg-green-100'
    });
  }

  // Consistent Achiever - More than half goals completed
  if (goalStats?.completed > goalStats?.total / 2) {
    achievements?.push({
      id: 'consistent',
      title: 'Consistent Achiever',
      description: 'Completed majority of goals',
      icon: 'Award',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 border-blue-200',
      iconBg: 'bg-blue-100'
    });
  }

  // Goal Crusher - Any goal exceeded by 20%
  const hasExceededGoal = userGoals?.some(goal => {
    const actual = actualProgress?.[goal?.goal_type] || 0;
    return actual > goal?.target_value * 1.2;
  });

  if (hasExceededGoal) {
    achievements?.push({
      id: 'goal-crusher',
      title: 'Goal Crusher',
      description: 'Exceeded a goal by 20%+',
      icon: 'Target',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 border-purple-200',
      iconBg: 'bg-purple-100'
    });
  }

  // Early Starter - At least one goal in progress
  if (goalStats?.inProgress > 0) {
    achievements?.push({
      id: 'early-starter',
      title: 'Early Starter',
      description: 'Made progress on goals',
      icon: 'Play',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 border-indigo-200',
      iconBg: 'bg-indigo-100'
    });
  }

  // If no achievements, show motivational message
  if (achievements?.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <Icon name="Target" size={24} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ready to Achieve?</h3>
            <p className="text-sm text-muted-foreground">
              Start working on your goals to unlock achievement badges!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Achievements</h2>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Award" size={16} />
          <span>{achievements?.length} earned this week</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {achievements?.map((achievement) => (
          <div 
            key={achievement?.id}
            className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${achievement?.bgColor}`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${achievement?.iconBg}`}>
                <Icon 
                  name={achievement?.icon} 
                  size={20} 
                  className={achievement?.color}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`font-semibold ${achievement?.color}`}>
                  {achievement?.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {achievement?.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementBadges;