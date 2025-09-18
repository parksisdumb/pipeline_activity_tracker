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
import { managerService } from '../../services/managerService';
import { useAuth } from '../../contexts/AuthContext';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data states
  const [teamMetrics, setTeamMetrics] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [funnelData, setFunnelData] = useState({});
  const [summaryData, setSummaryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get week start date for queries
  const getWeekStartDate = (date) => {
    const weekStart = new Date(date);
    weekStart?.setDate(weekStart?.getDate() - weekStart?.getDay());
    return weekStart?.toISOString()?.split('T')?.[0];
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const weekStartDate = getWeekStartDate(currentWeek);
      
      // Load all manager data in parallel
      const [
        teamPerformanceResult,
        teamMetricsResult,
        funnelMetricsResult,
        teamSummaryResult
      ] = await Promise.all([
        managerService?.getTeamPerformance(user?.id, weekStartDate),
        managerService?.getTeamMetrics(user?.id, weekStartDate),
        managerService?.getTeamFunnelMetrics(user?.id),
        managerService?.getTeamSummary(user?.id)
      ]);

      // Handle team performance data
      if (teamPerformanceResult?.success) {
        const teamData = teamPerformanceResult?.data || [];
        setTeamData(teamData);
        
        // Log for debugging
        console.log('Team performance data loaded:', teamData);
        
        if (teamData?.length === 0) {
          console.warn('No team performance data found - check manager hierarchy setup');
        }
      } else {
        console.error('Failed to load team performance:', teamPerformanceResult?.error);
        setError(`Team data error: ${teamPerformanceResult?.error}`);
      }

      // Handle team metrics
      if (teamMetricsResult?.success) {
        const metrics = teamMetricsResult?.data;
        console.log('Team metrics loaded:', metrics);
        
        // Transform metrics into cards format
        const metricsCards = [
          {
            title: 'Pop-ins',
            current: metrics?.goalsByType?.pop_ins?.current || 0,
            target: metrics?.goalsByType?.pop_ins?.target || 0,
            icon: 'MapPin',
            color: 'accent',
            trend: Math.random() * 20 - 10 // TODO: Calculate real trend
          },
          {
            title: 'DM Conversations',
            current: metrics?.goalsByType?.conversations?.current || metrics?.goalsByType?.calls?.current || 0,
            target: metrics?.goalsByType?.conversations?.target || metrics?.goalsByType?.calls?.target || 0,
            icon: 'MessageCircle',
            color: 'success',
            trend: Math.random() * 20 - 10
          },
          {
            title: 'Assessments Booked',
            current: metrics?.goalsByType?.inspections_booked?.current || metrics?.goalsByType?.meetings?.current || 0,
            target: metrics?.goalsByType?.inspections_booked?.target || metrics?.goalsByType?.meetings?.target || 0,
            icon: 'Calendar',
            color: 'warning',
            trend: Math.random() * 20 - 10
          },
          {
            title: 'Proposals Sent',
            current: metrics?.goalsByType?.proposals_sent?.current || 0,
            target: metrics?.goalsByType?.proposals_sent?.target || 0,
            icon: 'FileText',
            color: 'accent',
            trend: Math.random() * 20 - 10
          },
          {
            title: 'Accounts Added',
            current: metrics?.goalsByType?.accounts_added?.current || 0,
            target: metrics?.goalsByType?.accounts_added?.target || 0,
            icon: 'Trophy',
            color: 'success',
            trend: Math.random() * 20 - 10
          }
        ];
        
        setTeamMetrics(metricsCards);
      } else {
        console.error('Failed to load team metrics:', teamMetricsResult?.error);
        setError(`Metrics error: ${teamMetricsResult?.error}`);
      }

      // Handle funnel data
      if (funnelMetricsResult?.success) {
        setFunnelData(funnelMetricsResult?.data || {});
        console.log('Funnel data loaded:', funnelMetricsResult?.data);
      } else {
        console.error('Failed to load funnel metrics:', funnelMetricsResult?.error);
      }

      // Handle summary data
      if (teamSummaryResult?.success) {
        setSummaryData(teamSummaryResult?.data || {});
        console.log('Summary data loaded:', teamSummaryResult?.data);
      } else {
        console.error('Failed to load team summary:', teamSummaryResult?.error);
      }

    } catch (error) {
      console.error('Dashboard loading error:', error);
      setError('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or week changes
  useEffect(() => {
    loadDashboardData();
  }, [user?.id, currentWeek]);

  const handleWeekChange = (newWeek) => {
    setCurrentWeek(newWeek);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Transform team performance data for table
  const transformedTeamData = teamData?.map(member => ({
    id: member?.user_id,
    name: member?.user_name || member?.user_email?.split('@')?.[0] || 'Unknown User',
    email: member?.user_email,
    role: member?.user_role,
    popIns: { 
      current: member?.weekly_goals?.find(g => g?.goal_type === 'pop_ins')?.current_value || 0, 
      target: member?.weekly_goals?.find(g => g?.goal_type === 'pop_ins')?.target_value || 0 
    },
    dmConversations: { 
      current: member?.weekly_goals?.find(g => g?.goal_type === 'conversations' || g?.goal_type === 'calls')?.current_value || 0, 
      target: member?.weekly_goals?.find(g => g?.goal_type === 'conversations' || g?.goal_type === 'calls')?.target_value || 0 
    },
    assessments: { 
      current: member?.weekly_goals?.find(g => g?.goal_type === 'inspections_booked' || g?.goal_type === 'meetings')?.current_value || 0, 
      target: member?.weekly_goals?.find(g => g?.goal_type === 'inspections_booked' || g?.goal_type === 'meetings')?.target_value || 0 
    },
    proposals: { 
      current: member?.weekly_goals?.find(g => g?.goal_type === 'proposals_sent')?.current_value || 0, 
      target: member?.weekly_goals?.find(g => g?.goal_type === 'proposals_sent')?.target_value || 0 
    },
    wins: { 
      current: member?.weekly_goals?.find(g => g?.goal_type === 'accounts_added')?.current_value || 0, 
      target: member?.weekly_goals?.find(g => g?.goal_type === 'accounts_added')?.target_value || 0 
    },
    showRate: member?.goal_completion_rate || 0,
    winRate: Math.round(Math.random() * 100), // TODO: Calculate actual win rate from accounts
    totalAccounts: member?.total_accounts || 0,
    weeklyActivities: member?.current_week_activities || 0
  })) || [];

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dashboard Loading Error</p>
                    <p className="text-sm">{error}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      This may indicate missing team member relationships. Please contact your administrator.
                    </p>
                  </div>
                  <button 
                    onClick={loadDashboardData}
                    className="ml-2 px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Week Selector */}
            <WeekSelector 
              currentWeek={currentWeek}
              onWeekChange={handleWeekChange}
            />

            {/* Loading State */}
            {loading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4]?.map((i) => (
                    <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
                  ))}
                </div>
                <div className="h-64 bg-card rounded-lg animate-pulse" />
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 h-96 bg-card rounded-lg animate-pulse" />
                  <div className="h-96 bg-card rounded-lg animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* Team Summary Cards */}
                <TeamSummaryCards summaryData={summaryData} />

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {teamMetrics?.map((metric, index) => (
                    <MetricsCard
                      key={`${metric?.title}-${index}`}
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
                    <TeamPerformanceTable teamData={transformedTeamData} />
                  </div>

                  {/* Side Panel */}
                  <div className="space-y-6">
                    <FunnelMetrics funnelData={funnelData} />
                    <QuickActions />
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Mobile Quick Action Button */}
        <QuickActionButton variant="floating" onClick={() => {}} />
      </div>
    </>
  );
};

export default ManagerDashboard;