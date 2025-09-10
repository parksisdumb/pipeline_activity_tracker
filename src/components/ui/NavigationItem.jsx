import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';

const NavigationItem = ({ 
  label, 
  path, 
  icon, 
  description, 
  isCollapsed = false,
  onClick,
  className = '',
  children 
}) => {
  const location = useLocation();
  const isActive = location?.pathname === path;

  const itemClasses = `
    group flex items-center px-3 py-2 text-sm font-medium rounded-md 
    transition-colors duration-200 cursor-pointer
    ${isActive 
      ? 'bg-accent text-accent-foreground' 
      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }
    ${className}
  `;

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const content = (
    <>
      {icon && (
        <Icon 
          name={icon} 
          size={18} 
          className="flex-shrink-0"
        />
      )}
      {!isCollapsed && (
        <span className="ml-3 truncate">{label}</span>
      )}
      {children}
    </>
  );

  if (path) {
    return (
      <Link
        to={path}
        className={itemClasses}
        title={isCollapsed ? `${label}${description ? ` - ${description}` : ''}` : ''}
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={itemClasses}
      title={isCollapsed ? `${label}${description ? ` - ${description}` : ''}` : ''}
      onClick={handleClick}
    >
      {content}
    </div>
  );
};

export default NavigationItem;