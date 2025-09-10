import React from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import Button from '../../../components/ui/Button';


const WeekSelector = ({ currentWeek, onWeekChange, className = '' }) => {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const handlePreviousWeek = () => {
    onWeekChange(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(currentWeek, 1));
  };

  const handleCurrentWeek = () => {
    onWeekChange(new Date());
  };

  const isCurrentWeek = () => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    return weekStart?.getTime() === currentWeekStart?.getTime();
  };

  return (
    <div className={`flex items-center justify-between bg-card border border-border rounded-lg p-4 elevation-1 ${className}`}>
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold text-foreground">Weekly Performance</h2>
        <div className="text-sm text-muted-foreground">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          iconName="ChevronLeft"
          onClick={handlePreviousWeek}
          title="Previous Week"
        />
        
        {!isCurrentWeek() && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentWeek}
          >
            Current Week
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          iconName="ChevronRight"
          onClick={handleNextWeek}
          title="Next Week"
        />
      </div>
    </div>
  );
};

export default WeekSelector;