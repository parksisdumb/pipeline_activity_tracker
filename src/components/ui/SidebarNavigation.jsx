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
  const { signOut, user, userProfile, isSuperAdmin } = useAuth();

  // Get user role from auth context, override prop if available
  const actualUserRole = userProfile?.role || userRole;
  const isSuper = isSuperAdmin || actualUserRole === 'super_admin';

  const navigationItems = [
    // Super Admin specific navigation - highest priority
    { 
      label: 'Super Admin Portal', 
      path: '/super-admin-dashboard', 
      icon: 'Crown', 
      roles: ['super_admin'],
      description: 'Super administrator control panel',
      priority: 1
    },
    { 
      label: 'Tenant Management', 
      path: '/super-admin-dashboard?tab=tenants', 
      icon: 'Building', 
      roles: ['super_admin'],
      description: 'Manage all tenant organizations',
      priority: 1
    },
    { 
      label: 'Cross-Tenant Users', 
      path: '/super-admin-dashboard?tab=all-users', 
      icon: 'Users', 
      roles: ['super_admin'],
      description: 'Manage users across all tenants',
      priority: 1
    },
    { 
      label: 'System Analytics', 
      path: '/super-admin-dashboard?tab=analytics', 
      icon: 'BarChart3', 
      roles: ['super_admin'],
      description: 'Cross-tenant system analytics',
      priority: 1
    },
    // Admin specific navigation  
    { 
      label: 'Admin Dashboard', 
      path: '/admin-dashboard', 
      icon: 'Shield', 
      roles: ['admin'],
      description: 'System administration panel'
    },
    { 
      label: 'Add New User', 
      path: '/admin-dashboard?tab=add-user', 
      icon: 'UserPlus', 
      roles: ['admin'],
      description: 'Add new system users'
    },
    { 
      label: 'View All Accounts', 
      path: '/accounts', 
      icon: 'Building2', 
      roles: ['admin'],
      description: 'View all accounts across tenants'
    },
    { 
      label: 'View All Properties', 
      path: '/properties', 
      icon: 'MapPin', 
      roles: ['admin'],
      description: 'View all properties across tenants'
    },
    { 
      label: 'View All Contacts', 
      path: '/contacts', 
      icon: 'Users', 
      roles: ['admin'],
      description: 'View all contacts across tenants'
    },
    // Regular user navigation
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
      label: 'Tasks', 
      path: '/tasks', 
      icon: 'CheckSquare', 
      roles: ['rep', 'manager'],
      description: 'Task management and assignment'
    },
    { 
      label: 'Team Dashboard', 
      path: '/manager-dashboard', 
      icon: 'BarChart3', 
      roles: ['manager'],
      description: 'Team performance analytics'
    },
    { 
      label: 'Weekly Goals', 
      path: '/weekly-goals', 
      icon: 'Target', 
      roles: ['manager'],
      description: 'Goal setting and tracking'
    },
    { 
      label: 'My Weekly Goals', 
      path: '/weekly-goals', 
      icon: 'Target', 
      roles: ['rep'],
      description: 'View assigned weekly goals'
    },
    { 
      label: 'Prospects', 
      path: '/prospects', 
      icon: 'Search', 
      roles: ['rep', 'manager'],
      description: 'Hunt uncontacted ICP companies'
    },
    { 
      label: 'Accounts', 
      path: '/accounts', 
      icon: 'Building2', 
      roles: ['rep', 'manager'],
      description: 'Account management'
    },
    { 
      label: 'Properties', 
      path: '/properties', 
      icon: 'MapPin', 
      roles: ['rep', 'manager'],
      description: 'Property tracking'
    },
    { 
      label: 'Contacts', 
      path: '/contacts', 
      icon: 'Users', 
      roles: ['rep', 'manager'],
      description: 'Contact management'
    },
    { 
      label: 'Opportunities', 
      path: '/opportunities', 
      icon: 'TrendingUp', 
      roles: ['rep', 'manager'],
      description: 'Sales opportunity management'
    },
  ];

  const isActive = (path) => {
    const currentPath = location?.pathname;
    const currentSearch = location?.search;
    
    // Handle exact path matches
    if (path?.includes('?')) {
      return `${currentPath}${currentSearch}` === path;
    }
    
    return currentPath === path;
  };

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

  // Enhanced display user logic for super admin
  const displayUser = {
    name: userProfile?.full_name || user?.email?.split('@')?.[0] || 'John Smith',
    role: isSuper ? 'Super Administrator' :
          userProfile?.role ? 
          (userProfile?.role === 'admin' ? 'Administrator' : 
           userProfile?.role === 'manager'? 'Sales Manager' : 'Sales Rep') : 
          (actualUserRole === 'admin' ? 'Administrator' : 
           actualUserRole === 'manager'? 'Sales Manager' : 'Sales Rep')
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
          <Link to={isSuper ? "/super-admin-dashboard" : "/today"} className="flex items-center space-x-3 min-w-0">
            <div className={`w-8 h-8 ${isSuper ? 'bg-red-500' : 'bg-primary'} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon name={isSuper ? "Crown" : "Activity"} size={20} color="white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {isSuper ? 'Super Admin' : 'Pipeline Tracker'}
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
          {/* Super Admin Section */}
          {isSuper && (
            <div className="space-y-1 mb-4">
              {!isCollapsed && (
                <h3 className="px-3 text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center">
                  <Icon name="Crown" size={12} className="mr-2" />
                  Super Administration
                </h3>
              )}
              {navigationItems?.filter(item => item?.roles?.includes('super_admin'))?.map((item) => (
                <Link
                  key={item?.path}
                  to={item?.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    isActive(item?.path)
                      ? 'bg-red-500/20 text-red-600 border-l-2 border-red-500' :'text-muted-foreground hover:text-red-600 hover:bg-red-500/10'
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
          )}

          {/* Admin-specific Section */}
          {actualUserRole === 'admin' && !isSuper && (
            <div className="space-y-1 mb-4">
              {!isCollapsed && (
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Administration
                </h3>
              )}
              {navigationItems?.filter(item => item?.roles?.includes('admin'))?.map((item) => (
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
          )}

          {/* Regular Navigation for non-admin users */}
          {actualUserRole !== 'admin' && !isSuper && (
            <div className="space-y-1">
              {navigationItems?.filter(item => 
                item?.roles?.includes(actualUserRole) && 
                !item?.roles?.includes('admin') &&
                !item?.roles?.includes('super_admin')
              )?.map((item) => (
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
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isSuper ? 'bg-red-500' : 
                  actualUserRole === 'admin' ? 'bg-purple-500' : 'bg-secondary'
                }`}>
                  <Icon 
                    name={isSuper ? 'Crown' : actualUserRole === 'admin' ? 'Shield' : 'User'} 
                    size={14} 
                    color="white"
                  />
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isSuper ? 'bg-red-500' : 
                  actualUserRole === 'admin' ? 'bg-purple-500' : 'bg-secondary'
                }`}>
                  <Icon 
                    name={isSuper ? 'Crown' : actualUserRole === 'admin' ? 'Shield' : 'User'} 
                    size={16} 
                    color="white"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{displayUser?.name}</p>
                  <p className={`text-xs truncate ${
                    isSuper ? 'text-red-600' : 
                    actualUserRole === 'admin' ? 'text-purple-600' : 'text-muted-foreground'
                  }`}>
                    {displayUser?.role}
                  </p>
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
                  <Link
                    to="/user-profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    <Icon name="User" size={14} className="mr-2" />
                    Profile Settings
                  </Link>
                  <Link
                    to="/weekly-goals"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    <Icon name="Target" size={14} className="mr-2" />
                    Weekly Goals
                  </Link>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`flex items-center w-full px-3 py-2 text-sm transition-colors duration-200 ${
                      isLoggingOut 
                        ? 'text-muted-foreground cursor-not-allowed' 
                        : 'text-destructive hover:text-destructive hover:bg-destructive/10'
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