import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const WeekSelector = ({ 
  currentWeek, 
  onWeekChange, 
  className = '' 
}) => {
  const formatWeekRange = (weekStart) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end?.setDate(start?.getDate() + 6);
    
    return `${start?.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${end?.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })}`;
  };

  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek?.setDate(newWeek?.getDate() + (direction * 7));
    onWeekChange(newWeek);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart?.setDate(today?.getDate() - today?.getDay());
    onWeekChange(currentWeekStart);
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart?.setDate(today?.getDate() - today?.getDay());
    return currentWeek?.toDateString() === currentWeekStart?.toDateString();
  };

  return (
    <div className={`flex items-center justify-between bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateWeek(-1)}
          iconName="ChevronLeft"
          iconPosition="left"
        >
          Previous Week
        </Button>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {formatWeekRange(currentWeek)}
          </h3>
          <p className="text-sm text-muted-foreground">
            Week of {currentWeek?.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateWeek(1)}
          iconName="ChevronRight"
          iconPosition="right"
        >
          Next Week
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        {!isCurrentWeek() && (
          <Button
            variant="secondary"
            size="sm"
            onClick={goToCurrentWeek}
            iconName="Calendar"
            iconPosition="left"
          >
            Current Week
          </Button>
        )}
        
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Icon name="Info" size={16} />
          <span>Set goals for current and future weeks</span>
        </div>
      </div>
    </div>
  );
};

export default WeekSelector;