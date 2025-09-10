import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
import ActivityLogButton from './components/ActivityLogButton';
import WeeklyGoalsProgress from './components/WeeklyGoalsProgress';
import RecentActivities from './components/RecentActivities';
import QuickActions from './components/QuickActions';
import TodayStats from './components/TodayStats';

const TodayPage = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole] = useState('rep'); // This would come from auth context

  useEffect(() => {
    // Set page title
    document.title = 'Today - Pipeline Activity Tracker';
  }, []);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header 
          userRole={userRole}
          onMenuToggle={handleToggleMobileMenu}
          isMenuOpen={mobileMenuOpen}
        />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarNavigation
          userRole={userRole}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={handleToggleMobileMenu} />
          <SidebarNavigation
            userRole={userRole}
            isCollapsed={false}
            onToggleCollapse={handleToggleMobileMenu}
            className="relative z-10"
          />
        </div>
      )}

      {/* Main Content */}
      <main 
        className={`transition-all duration-200 ease-out pt-16 lg:pt-0 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Good morning, John! 👋
            </h1>
            <p className="text-muted-foreground">
              Ready to make today productive? Start by logging your field activities.
            </p>
          </div>

          {/* Primary Action - Log Activity */}
          <div className="mb-8">
            <ActivityLogButton />
          </div>

          {/* Today's Stats */}
          <TodayStats className="mb-6" />

          {/* Weekly Goals Progress */}
          <WeeklyGoalsProgress className="mb-6" />

          {/* Recent Activities */}
          <RecentActivities className="mb-6" />

          {/* Quick Actions */}
          <QuickActions className="mb-6" />

          {/* Additional Context for Mobile Users */}
          <div className="lg:hidden bg-card rounded-lg border border-border p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Field-Optimized Design
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                This interface is designed for quick data entry while you're on the go. 
                Large buttons and streamlined workflows help you log activities in under 10 seconds.
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Touch-friendly</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Fast entry</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Offline capable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <QuickActionButton variant="floating" onClick={() => navigate('/log-activity')} />
    </div>
  );
};

export default TodayPage;