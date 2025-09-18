import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';

const UserProfileDropdown = ({ 
  user = { name: 'John Smith', role: 'Sales Rep', email: 'john.smith@company.com' },
  isCollapsed = false,
  onLogout,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document?.addEventListener('mousedown', handleClickOutside);
    return () => document?.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        alert(`Sign out failed: ${error?.message}`);
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Sign out failed. Please try again.');
    }
  };

  const getUserInitials = () => {
    const name = user?.name || user?.full_name || 'User';
    return name?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase() || 'U';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors duration-200 w-full"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-primary-foreground text-sm font-medium">
            {getUserInitials()}
          </span>
        </div>

        {/* User info - only show if not collapsed */}
        {!isCollapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name || user?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role || 'Sales Rep'}
              </p>
            </div>
            
            {/* Dropdown indicator */}
            <Icon 
              name={isOpen ? 'ChevronUp' : 'ChevronDown'} 
              size={14} 
              className="text-muted-foreground flex-shrink-0" 
            />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={`absolute ${isCollapsed ? 'left-full ml-2' : 'right-0'} top-0 w-56 bg-popover border border-border rounded-md elevation-2 py-1 z-200`}>
          {/* User info header - always show in dropdown */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-medium">
                  {getUserInitials()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-popover-foreground truncate">
                  {user?.name || user?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || 'user@company.com'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.role || 'Sales Rep'}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              to="/user-profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors duration-200"
            >
              <Icon name="User" size={16} />
              <span>Profile Settings</span>
            </Link>
            
            <Link
              to="/weekly-goals"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors duration-200"
            >
              <Icon name="Target" size={16} />
              <span>Weekly Goals</span>
            </Link>

            <hr className="my-1 border-border" />
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors duration-200 w-full text-left"
            >
              <Icon name="LogOut" size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;