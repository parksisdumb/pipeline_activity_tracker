import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';
import Button from './Button';

const UserProfileDropdown = ({ 
  user = { name: 'John Smith', role: 'Sales Rep', email: 'john.smith@company.com' },
  isCollapsed = false,
  onLogout,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { signOut, userProfile, user: authUser } = useAuth();

  // Use actual user data from auth context if available
  const displayUser = {
    name: userProfile?.full_name || authUser?.email?.split('@')?.[0] || user?.name,
    role: userProfile?.role || user?.role,
    email: authUser?.email || user?.email
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    console.log('Logging out...');
    setIsOpen(false);
    setIsLoggingOut(true);
    
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        alert(`Sign out failed: ${error?.message}`);
      } else {
        // Navigate to login page after successful sign out
        navigate('/login');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Sign out failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    // Navigate to profile page based on user role
    if (userProfile?.role === 'rep') {
      navigate('/profile');
    } else {
      // For managers and admins, show settings or profile page
      navigate('/profile');
    }
  };

  const menuItems = [
    { 
      label: 'Profile Settings', 
      icon: 'Settings', 
      action: handleProfileClick 
    },
    { label: 'Help & Support', icon: 'HelpCircle', action: () => console.log('Help') },
    { 
      label: isLoggingOut ? 'Signing Out...' : 'Sign Out', 
      icon: 'LogOut', 
      action: handleLogout, 
      variant: 'destructive',
      disabled: isLoggingOut
    },
  ];

  if (isCollapsed) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
          title={`${displayUser?.name} - ${displayUser?.role}`}
        >
          <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
            <Icon name="User" size={14} color="var(--color-secondary-foreground)" />
          </div>
        </Button>
        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-popover border border-border rounded-md elevation-2 py-1 z-300 dropdown-visible">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-popover-foreground truncate">{displayUser?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{displayUser?.role}</p>
            </div>
            {menuItems?.map((item, index) => (
              <button
                key={index}
                onClick={item?.action}
                disabled={item?.disabled}
                className={`flex items-center w-full px-3 py-2 text-sm transition-colors duration-200 ${
                  item?.disabled 
                    ? 'text-muted-foreground cursor-not-allowed' 
                    : item?.variant === 'destructive' ?'text-destructive hover:bg-destructive hover:text-destructive-foreground' :'text-popover-foreground hover:bg-muted'
                }`}
              >
                <Icon name={item?.icon} size={14} className="mr-2" />
                {item?.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex items-center space-x-3 px-2">
        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
          <Icon name="User" size={16} color="var(--color-secondary-foreground)" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{displayUser?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{displayUser?.role}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-shrink-0"
        >
          <Icon name="MoreVertical" size={14} />
        </Button>
      </div>
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-md elevation-2 py-1 z-300 dropdown-visible">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground truncate">{displayUser?.email}</p>
          </div>
          {menuItems?.map((item, index) => (
            <button
              key={index}
              onClick={item?.action}
              disabled={item?.disabled}
              className={`flex items-center w-full px-3 py-2 text-sm transition-colors duration-200 ${
                item?.disabled 
                  ? 'text-muted-foreground cursor-not-allowed' 
                  : item?.variant === 'destructive' ?'text-destructive hover:bg-destructive hover:text-destructive-foreground' :'text-popover-foreground hover:bg-muted'
              }`}
            >
              <Icon name={item?.icon} size={14} className="mr-2" />
              {item?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;