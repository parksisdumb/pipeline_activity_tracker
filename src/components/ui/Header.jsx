import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import UserProfileDropdown from './UserProfileDropdown';

const Header = ({ userRole = 'rep', onMenuToggle, isMenuOpen = false }) => {
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const navigationItems = [
    { label: 'Today', path: '/today', icon: 'Home', roles: ['rep', 'manager'] },
    { label: 'Accounts', path: '/accounts', icon: 'Building2', roles: ['rep', 'manager'] },
    { label: 'Properties', path: '/properties', icon: 'MapPin', roles: ['rep', 'manager'] },
    { label: 'Contacts', path: '/contacts', icon: 'Users', roles: ['rep', 'manager'] },
    { label: 'Activities', path: '/activities', icon: 'Activity', roles: ['rep', 'manager'] },
    { label: 'Dashboard', path: '/manager-dashboard', icon: 'BarChart3', roles: ['manager'] },
  ];

  const visibleItems = navigationItems?.filter(item => 
    item?.roles?.includes(userRole)
  )?.slice(0, 4);

  const overflowItems = navigationItems?.filter(item => 
    item?.roles?.includes(userRole)
  )?.slice(4);

  const isActive = (path) => location?.pathname === path;

  const handleLogout = async () => {
    console.log('Header logout triggered');
    setUserMenuOpen(false);
    
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
    }
  };

  // Use actual user data from auth context if available
  const displayUser = {
    name: userProfile?.full_name || user?.email?.split('@')?.[0] || 'John Smith',
    role: userProfile?.role || (userRole === 'manager' ? 'Sales Manager' : 'Sales Rep'),
    email: user?.email || 'john.smith@company.com'
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-100 bg-card border-b border-border elevation-1">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Icon name={isMenuOpen ? 'X' : 'Menu'} size={20} />
          </Button>
          
          <Link to="/today" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Activity" size={20} color="var(--color-primary-foreground)" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">Pipeline Tracker</h1>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {visibleItems?.map((item) => (
            <Link
              key={item?.path}
              to={item?.path}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                isActive(item?.path)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon name={item?.icon} size={16} />
              <span>{item?.label}</span>
            </Link>
          ))}
          
          {overflowItems?.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-1"
              >
                <Icon name="MoreHorizontal" size={16} />
                <span>More</span>
              </Button>
              
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md elevation-2 py-1">
                  {overflowItems?.map((item) => (
                    <Link
                      key={item?.path}
                      to={item?.path}
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 text-sm transition-colors duration-200 ${
                        isActive(item?.path)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-popover-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon name={item?.icon} size={16} />
                      <span>{item?.label}</span>
                    </Link>
                  ))}
                  <hr className="my-1 border-border" />
                  <Link
                    to="/weekly-goals"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors duration-200"
                  >
                    <Icon name="Target" size={16} />
                    <span>Weekly Goals</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Profile - Use UserProfileDropdown component */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block">
            <UserProfileDropdown 
              user={displayUser}
              isCollapsed={false}
            />
          </div>
          
          <div className="sm:hidden">
            <UserProfileDropdown 
              user={displayUser}
              isCollapsed={true}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;