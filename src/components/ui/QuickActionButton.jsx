import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import Icon from '../AppIcon';

const QuickActionButton = ({ 
  variant = 'floating',
  className = '',
  onClick,
  disabled = false 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/log-activity');
    }
  };

  if (variant === 'floating') {
    return (
      <Button
        onClick={handleClick}
        disabled={disabled}
        className={`fixed bottom-6 right-6 z-200 w-14 h-14 rounded-full elevation-2 lg:hidden ${className}`}
        size="icon"
        title="Log Activity"
      >
        <Icon name="Plus" size={24} />
      </Button>
    );
  }

  if (variant === 'inline') {
    return (
      <Button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full ${className}`}
        iconName="Plus"
        iconPosition="left"
      >
        Log Activity
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        onClick={handleClick}
        disabled={disabled}
        size="sm"
        className={className}
        iconName="Plus"
        iconPosition="left"
      >
        Log Activity
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      className={className}
      iconName="Plus"
      iconPosition="left"
    >
      Log Activity
    </Button>
  );
};

export default QuickActionButton;