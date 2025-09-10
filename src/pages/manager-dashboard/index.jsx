import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
import MetricsCard from './components/MetricsCard';
import TeamPerformanceTable from './components/TeamPerformanceTable';
import WeekSelector from './components/WeekSelector';
import FunnelMetrics from './components/FunnelMetrics';
import QuickActions from './components/QuickActions';
import TeamSummaryCards from './components/TeamSummaryCards';

const ManagerDashboard = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mock data for team metrics
  const teamMetrics = [
    {
      title: 'Pop-ins',
      current: 127,
      target: 150,
      icon: 'MapPin',
      color: 'accent',
      trend: 8
    },
    {
      title: 'DM Conversations',
      current: 89,
      target: 100,
      icon: 'MessageCircle',
      color: 'success',
      trend: 12
    },
    {
      title: 'Assessments Booked',
      current: 34,
      target: 40,
      icon: 'Calendar',
      color: 'warning',
      trend: -3
    },
    {
      title: 'Proposals Sent',
      current: 18,
      target: 20,
      icon: 'FileText',
      color: 'accent',
      trend: 5
    },
    {
      title: 'Wins',
      current: 7,
      target: 8,
      icon: 'Trophy',
      color: 'success',
      trend: 15
    }
  ];

  // Mock team performance data
  const teamData = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      popIns: { current: 32, target: 30 },
      dmConversations: { current: 24, target: 25 },
      assessments: { current: 8, target: 10 },
      proposals: { current: 5, target: 5 },
      wins: { current: 2, target: 2 },
      showRate: 85,
      winRate: 40
    },
    {
      id: 2,
      name: 'Mike Rodriguez',
      email: 'mike.rodriguez@company.com',
      popIns: { current: 28, target: 30 },
      dmConversations: { current: 19, target: 25 },
      assessments: { current: 7, target: 10 },
      proposals: { current: 4, target: 5 },
      wins: { current: 1, target: 2 },
      showRate: 78,
      winRate: 25
    },
    {
      id: 3,
      name: 'Emily Chen',
      email: 'emily.chen@company.com',
      popIns: { current: 35, target: 30 },
      dmConversations: { current: 26, target: 25 },
      assessments: { current: 12, target: 10 },
      proposals: { current: 6, target: 5 },
      wins: { current: 3, target: 2 },
      showRate: 92,
      winRate: 50
    },
    {
      id: 4,
      name: 'David Thompson',
      email: 'david.thompson@company.com',
      popIns: { current: 25, target: 30 },
      dmConversations: { current: 15, target: 25 },
      assessments: { current: 5, target: 10 },
      proposals: { current: 2, target: 5 },
      wins: { current: 1, target: 2 },
      showRate: 60,
      winRate: 50
    },
    {
      id: 5,
      name: 'Lisa Park',
      email: 'lisa.park@company.com',
      popIns: { current: 30, target: 30 },
      dmConversations: { current: 22, target: 25 },
      assessments: { current: 9, target: 10 },
      proposals: { current: 4, target: 5 },
      wins: { current: 2, target: 2 },
      showRate: 89,
      winRate: 50
    }
  ];

  // Mock funnel data
  const funnelData = {
    prospects: 450,
    contacted: 320,
    qualified: 180,
    assessments: 89,
    proposals: 34,
    wins: 12
  };

  // Mock summary data
  const summaryData = {
    activeReps: 5,
    totalAccounts: 234,
    weeklyRevenue: 125000,
    avgDealSize: 18500
  };

  const handleWeekChange = (newWeek) => {
    setCurrentWeek(newWeek);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <Helmet>
        <title>Manager Dashboard - Pipeline Activity Tracker</title>
        <meta name="description" content="Comprehensive team oversight with real-time goal tracking and performance analytics for sales managers." />
      </Helmet>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <Header 
            userRole="manager"
            onMenuToggle={toggleMobileMenu}
            isMenuOpen={isMobileMenuOpen}
          />
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <SidebarNavigation
            userRole="manager"
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={toggleMobileMenu} />
            <SidebarNavigation
              userRole="manager"
              isCollapsed={false}
              onToggleCollapse={() => {}}
              className="relative z-10"
            />
          </div>
        )}

        {/* Main Content */}
        <main className={`transition-all duration-200 ease-out ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        } pt-16 lg:pt-0`}>
          <div className="p-6 space-y-6">
            {/* Week Selector */}
            <WeekSelector 
              currentWeek={currentWeek}
              onWeekChange={handleWeekChange}
            />

            {/* Team Summary Cards */}
            <TeamSummaryCards summaryData={summaryData} />

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {teamMetrics?.map((metric, index) => (
                <MetricsCard
                  key={index}
                  title={metric?.title}
                  current={metric?.current}
                  target={metric?.target}
                  icon={metric?.icon}
                  color={metric?.color}
                  trend={metric?.trend}
                />
              ))}
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Team Performance Table - Takes 2 columns */}
              <div className="xl:col-span-2">
                <TeamPerformanceTable teamData={teamData} />
              </div>

              {/* Side Panel */}
              <div className="space-y-6">
                <FunnelMetrics funnelData={funnelData} />
                <QuickActions />
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Quick Action Button */}
        <QuickActionButton variant="floating" onClick={() => {}} />
      </div>
    </>
  );
};

export default ManagerDashboard;