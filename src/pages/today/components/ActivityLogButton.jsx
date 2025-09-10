import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';


const ActivityLogButton = ({ className = '' }) => {
  const navigate = useNavigate();

  const handleLogActivity = () => {
    navigate('/log-activity');
  };

  return (
    <div className={`w-full ${className}`}>
      <Button
        onClick={handleLogActivity}
        className="w-full h-16 text-lg font-semibold"
        iconName="Plus"
        iconPosition="left"
        iconSize={24}
      >
        Log Activity
      </Button>
      <p className="text-sm text-muted-foreground mt-2 text-center">
        Quick entry for pop-ins and field activities
      </p>
    </div>
  );
};

export default ActivityLogButton;