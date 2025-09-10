import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../AppIcon';
import Button from './Button';

const SidebarNavigation = ({ 
  userRole = 'rep', 
  isCollapsed = false, 
  onToggleCollapse,
  className = '' 
}) => {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { signOut, user, userProfile } = useAuth();

  const navigationItems = [
    { 
      label: 'Today', 
      path: '/today', 
      icon: 'Home', 
      roles: ['rep', 'manager'],
      description: 'Daily activity hub'
    },
    { 
      label: 'Log Activity', 
      path: '/log-activity', 
      icon: 'Plus', 
      roles: ['rep', 'manager'],
      description: 'Quick activity logging'
    },
    { 
      label: 'My Weekly Goals', 
      path: '/weekly-goals', 
      icon: 'Target', 
      roles: ['rep'],
      description: 'View assigned weekly goals'
    },
    { 
      label: 'Accounts', 
      path: '/accounts-list', 
      icon: 'Building2', 
      roles: ['rep', 'manager'],
      description: 'Account management'
    },
    { 
      label: 'Properties', 
      path: '/properties-list', 
      icon: 'MapPin', 
      roles: ['rep', 'manager'],
      description: 'Property tracking'
    },
    { 
      label: 'Contacts', 
      path: '/contacts-list', 
      icon: 'Users', 
      roles: ['rep', 'manager'],
      description: 'Contact management'
    },
  ];

  const managerItems = [
    { 
      label: 'Team Dashboard', 
      path: '/manager-dashboard', 
      icon: 'BarChart3', 
      roles: ['manager'],
      description: 'Team performance analytics'
    },
    { 
      label: 'Team Weekly Goals', 
      path: '/weekly-goals', 
      icon: 'Target', 
      roles: ['manager'],
      description: 'Goal setting and tracking'
    },
  ];

  const isActive = (path) => location?.pathname === path;

  const handleLogout = async () => {
    console.log('Logging out...');
    setUserMenuOpen(false);
    setIsLoggingOut(true);
    
    try {
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
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Use actual user data from auth context if available
  const displayUser = {
    name: userProfile?.full_name || user?.email?.split('@')?.[0] || 'John Smith',
    role: userProfile?.role || (userRole === 'manager' ? 'Sales Manager' : 'Sales Rep')
  };

  return (
    <aside 
      className={`fixed left-0 top-0 z-100 h-full bg-card border-r border-border elevation-1 transition-all duration-200 ease-out ${
        isCollapsed ? 'w-16' : 'w-60'
      } ${className}`}
    >
      <div className="flex flex-col h-full">
        {/* Logo and Brand */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <Link to="/today" className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="Activity" size={20} color="var(--color-primary-foreground)" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  Pipeline Tracker
                </h1>
              </div>
            )}
          </Link>
          
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="ml-auto flex-shrink-0"
            >
              <Icon name="ChevronLeft" size={16} />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigationItems?.filter(item => item?.roles?.includes(userRole))?.map((item) => (
                <Link
                  key={item?.path}
                  to={item?.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    isActive(item?.path)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title={isCollapsed ? item?.label : ''}
                >
                  <Icon 
                    name={item?.icon} 
                    size={18} 
                    className="flex-shrink-0"
                  />
                  {!isCollapsed && (
                    <span className="ml-3 truncate">{item?.label}</span>
                  )}
                </Link>
              ))}
          </div>

          {/* Manager Section */}
          {userRole === 'manager' && managerItems?.length > 0 && (
            <>
              <div className="pt-4">
                {!isCollapsed && (
                  <div className="px-3 mb-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Team Performance
                    </h3>
                  </div>
                )}
                <div className="space-y-1">
                  {managerItems?.map((item) => (
                    <Link
                      key={item?.path}
                      to={item?.path}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                        isActive(item?.path)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      title={isCollapsed ? item?.label : ''}
                    >
                      <Icon 
                        name={item?.icon} 
                        size={18} 
                        className="flex-shrink-0"
                      />
                      {!isCollapsed && (
                        <span className="ml-3 truncate">{item?.label}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* User Profile and Actions */}
        <div className="border-t border-border p-3">
          {isCollapsed ? (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="w-full"
                title="Expand sidebar"
              >
                <Icon name="ChevronRight" size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                title="User profile"
              >
                <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                  <Icon name="User" size={14} color="var(--color-secondary-foreground)" />
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
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
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex-shrink-0"
                >
                  <Icon name="MoreVertical" size={14} />
                </Button>
              </div>
              
              {userMenuOpen && (
                <div className="bg-muted rounded-md py-1">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`flex items-center w-full px-3 py-2 text-sm transition-colors duration-200 ${
                      isLoggingOut 
                        ? 'text-muted-foreground cursor-not-allowed' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon name="LogOut" size={14} className="mr-2" />
                    {isLoggingOut ? 'Signing Out...' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SidebarNavigation;