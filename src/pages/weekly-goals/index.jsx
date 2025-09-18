import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { goalsService } from '../../services/goalsService';
import { activitiesService } from '../../services/activitiesService';
import { authService } from '../../services/authService';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import WeekSelector from './components/WeekSelector';
import GoalMetricsHeader from './components/GoalMetricsHeader';
import RepGoalRow from './components/RepGoalRow';
import BulkGoalActions from './components/BulkGoalActions';
import GoalProgressSummary from './components/GoalProgressSummary';
import MobileGoalCard from './components/MobileGoalCard';
import IndividualProgressView from './components/IndividualProgressView';

const WeeklyGoals = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart?.setDate(today?.getDate() - today?.getDay());
    return weekStart;
  });
  const [loading, setLoading] = useState(true);
  const [userGoals, setUserGoals] = useState([]);
  const [goalStats, setGoalStats] = useState(null);
  const [actualProgress, setActualProgress] = useState({});
  
  // New state for real representatives data
  const [representatives, setRepresentatives] = useState([]);
  const [repsLoading, setRepsLoading] = useState(true);

  // Determine if this is manager or rep view
  const isRepView = userProfile?.role === 'rep';
  const weekStartDate = currentWeek?.toISOString()?.split('T')?.[0];

  // Mock data for representatives
  const mockRepresentatives = [
    {
      id: "rep1",
      name: "Sarah Johnson",
      role: "Senior Sales Rep",
      email: "sarah.johnson@company.com"
    },
    {
      id: "rep2", 
      name: "Mike Rodriguez",
      role: "Sales Representative",
      email: "mike.rodriguez@company.com"
    },
    {
      id: "rep3",
      name: "Emily Chen",
      role: "Sales Representative", 
      email: "emily.chen@company.com"
    },
    {
      id: "rep4",
      name: "David Thompson",
      role: "Junior Sales Rep",
      email: "david.thompson@company.com"
    },
    {
      id: "rep5",
      name: "Lisa Martinez",
      role: "Senior Sales Rep",
      email: "lisa.martinez@company.com"
    }
  ];

  // Mock current week goals
  const [currentWeekGoals, setCurrentWeekGoals] = useState({
    rep1: { pop_ins: 20, dm_conversations: 12, assessments_booked: 6, proposals_sent: 4, wins: 2 },
    rep2: { pop_ins: 18, dm_conversations: 10, assessments_booked: 5, proposals_sent: 3, wins: 1 },
    rep3: { pop_ins: 22, dm_conversations: 14, assessments_booked: 7, proposals_sent: 5, wins: 2 },
    rep4: { pop_ins: 15, dm_conversations: 8, assessments_booked: 4, proposals_sent: 2, wins: 1 },
    rep5: { pop_ins: 25, dm_conversations: 15, assessments_booked: 8, proposals_sent: 6, wins: 3 }
  });

  // Mock previous week performance
  const previousWeekPerformance = {
    rep1: { pop_ins: 18, dm_conversations: 11, assessments_booked: 5, proposals_sent: 3, wins: 1 },
    rep2: { pop_ins: 16, dm_conversations: 9, assessments_booked: 4, proposals_sent: 2, wins: 1 },
    rep3: { pop_ins: 20, dm_conversations: 12, assessments_booked: 6, proposals_sent: 4, wins: 2 },
    rep4: { pop_ins: 12, dm_conversations: 6, assessments_booked: 3, proposals_sent: 1, wins: 0 },
    rep5: { pop_ins: 23, dm_conversations: 14, assessments_booked: 7, proposals_sent: 5, wins: 2 }
  };

  // Mock current week performance (partial)
  const currentWeekPerformance = {
    rep1: { pop_ins: 12, dm_conversations: 8, assessments_booked: 3, proposals_sent: 2, wins: 1 },
    rep2: { pop_ins: 10, dm_conversations: 6, assessments_booked: 2, proposals_sent: 1, wins: 0 },
    rep3: { pop_ins: 15, dm_conversations: 10, assessments_booked: 4, proposals_sent: 3, wins: 1 },
    rep4: { pop_ins: 8, dm_conversations: 4, assessments_booked: 2, proposals_sent: 1, wins: 0 },
    rep5: { pop_ins: 18, dm_conversations: 11, assessments_booked: 5, proposals_sent: 4, wins: 2 }
  };

  // Load representatives from database (for managers)
  useEffect(() => {
    if (!isRepView && userProfile?.role === 'manager') {
      loadRepresentatives();
    } else {
      setRepsLoading(false);
    }
  }, [isRepView, userProfile?.role]);

  const loadRepresentatives = async () => {
    setRepsLoading(true);
    try {
      const result = await authService?.getRepresentatives();
      if (result?.success && result?.data?.length > 0) {
        // Transform database format to component format
        const formattedReps = result?.data?.map(rep => ({
          id: rep?.id,
          name: rep?.full_name || 'Unknown Rep',
          role: 'Sales Representative',
          email: rep?.email || ''
        }));
        setRepresentatives(formattedReps);
        
        // Initialize goals structure for real reps
        const initialGoals = {};
        formattedReps?.forEach(rep => {
          initialGoals[rep?.id] = {
            pop_ins: 20,
            dm_conversations: 12,
            assessments_booked: 6,
            proposals_sent: 4,
            wins: 2
          };
        });
        setCurrentWeekGoals(initialGoals);
      } else {
        // Fallback to mock data if no real reps found
        console.log('No real representatives found, using mock data');
        setRepresentatives(mockRepresentatives);
      }
    } catch (error) {
      console.error('Error loading representatives:', error);
      // Fallback to mock data on error
      setRepresentatives(mockRepresentatives);
    } finally {
      setRepsLoading(false);
    }
  };

  // Load user's goals and progress (for reps)
  useEffect(() => {
    if (isRepView && user?.id) {
      loadUserGoalsAndProgress();
    } else {
      setLoading(false);
    }
  }, [user?.id, currentWeek, isRepView]);

  const loadUserGoalsAndProgress = async () => {
    setLoading(true);
    try {
      // Load goals for current week
      const goalsResult = await goalsService?.getWeeklyGoals(user?.id, weekStartDate);
      if (goalsResult?.success) {
        setUserGoals(goalsResult?.data || []);
      }

      // Load goal statistics
      const statsResult = await goalsService?.getGoalStats(user?.id, {
        weekStartFrom: weekStartDate,
        weekStartTo: weekStartDate
      });
      if (statsResult?.success) {
        setGoalStats(statsResult?.data);
      }

      // Calculate actual progress from activities
      await calculateActualProgress();
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateActualProgress = async () => {
    try {
      const weekEndDate = new Date(currentWeek);
      weekEndDate?.setDate(weekEndDate?.getDate() + 6);
      
      const activitiesResult = await activitiesService?.getActivitiesList({
        userId: user?.id,
        dateFrom: weekStartDate,
        dateTo: weekEndDate?.toISOString()?.split('T')?.[0]
      });

      if (activitiesResult?.success) {
        const activities = activitiesResult?.data || [];
        
        // Calculate progress based on activities
        const progress = {
          calls: activities?.filter(a => a?.activity_type === 'Phone Call')?.length || 0,
          emails: activities?.filter(a => a?.activity_type === 'Email')?.length || 0,
          meetings: activities?.filter(a => a?.activity_type === 'Meeting')?.length || 0,
          site_visits: activities?.filter(a => a?.activity_type === 'Site Visit')?.length || 0,
          assessments: activities?.filter(a => a?.activity_type === 'Assessment')?.length || 0,
          proposals: activities?.filter(a => a?.activity_type === 'Proposal Sent')?.length || 0,
          contracts: activities?.filter(a => a?.activity_type === 'Contract Signed')?.length || 0
        };

        setActualProgress(progress);
      }
    } catch (error) {
      console.error('Error calculating progress:', error);
    }
  };

  const handleGoalChange = (repId, newGoals) => {
    setCurrentWeekGoals(prev => ({
      ...prev,
      [repId]: newGoals
    }));
  };

  const handleBulkGoalSet = (repIds, goals) => {
    setCurrentWeekGoals(prev => {
      const updated = { ...prev };
      repIds?.forEach(repId => {
        updated[repId] = { ...updated?.[repId], ...goals };
      });
      return updated;
    });
  };

  const handleCopyFromPreviousWeek = () => {
    setCurrentWeekGoals(previousWeekPerformance);
  };

  const handleWeekChange = (newWeek) => {
    setCurrentWeek(newWeek);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Update loading state to include reps loading
  const isManagerLoading = !isRepView && repsLoading;
  const isRepLoading = isRepView && loading;

  // Show individual rep view
  if (isRepView) {
    return (
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <SidebarNavigation
            userRole="rep"
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        </div>
        {/* Mobile Header */}
        <div className="lg:hidden">
          <Header
            userRole="rep"
            onMenuToggle={toggleMobileMenu}
            isMenuOpen={mobileMenuOpen}
          />
        </div>
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-200 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={toggleMobileMenu} />
            <SidebarNavigation
              userRole="rep"
              isCollapsed={false}
              onToggleCollapse={() => {}}
              className="relative z-210"
            />
          </div>
        )}
        {/* Main Content */}
        <div className={`transition-all duration-200 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        } pt-16 lg:pt-0`}>
          <IndividualProgressView 
            user={user}
            userProfile={userProfile}
            currentWeek={currentWeek}
            onWeekChange={handleWeekChange}
            userGoals={userGoals}
            goalStats={goalStats}
            actualProgress={actualProgress}
            loading={loading}
            onRefresh={loadUserGoalsAndProgress}
          />
        </div>
      </div>
    );
  }

  // Show manager view with loading state
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SidebarNavigation
          userRole="manager"
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header
          userRole="manager"
          onMenuToggle={toggleMobileMenu}
          isMenuOpen={mobileMenuOpen}
        />
      </div>
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-200 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={toggleMobileMenu} />
          <SidebarNavigation
            userRole="manager"
            isCollapsed={false}
            onToggleCollapse={() => {}}
            className="relative z-210"
          />
        </div>
      )}
      {/* Main Content */}
      <div className={`transition-all duration-200 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
      } pt-16 lg:pt-0`}>
        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Team Weekly Goals</h1>
              <p className="text-muted-foreground">
                Set and manage performance targets for your sales team
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/manager-dashboard')}
                iconName="BarChart3"
                iconPosition="left"
              >
                View Dashboard
              </Button>
              <Button
                variant="secondary"
                size="sm"
                iconName="Download"
                iconPosition="left"
              >
                Export Goals
              </Button>
            </div>
          </div>

          {/* Loading State for Manager */}
          {isManagerLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading team representatives...</p>
            </div>
          )}

          {/* Show content when not loading */}
          {!isManagerLoading && (
            <>
              {/* Week Selection */}
              <WeekSelector
                currentWeek={currentWeek}
                onWeekChange={handleWeekChange}
              />

              {/* No Reps Message */}
              {representatives?.length === 0 && (
                <div className="text-center py-12 bg-card border border-border rounded-lg">
                  <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Team Representatives Found</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no sales representatives in your team yet.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin-dashboard')}
                    iconName="UserPlus"
                    iconPosition="left"
                  >
                    Add Team Members
                  </Button>
                </div>
              )}

              {/* Show goals interface when reps exist */}
              {representatives?.length > 0 && (
                <>
                  {/* Progress Summary */}
                  <GoalProgressSummary
                    representatives={representatives}
                    currentWeekGoals={currentWeekGoals}
                    currentWeekPerformance={currentWeekPerformance}
                  />

                  {/* Bulk Actions */}
                  <BulkGoalActions
                    representatives={representatives}
                    onBulkGoalSet={handleBulkGoalSet}
                    onCopyFromPreviousWeek={handleCopyFromPreviousWeek}
                  />

                  {/* Desktop Goals Table */}
                  <div className="hidden lg:block space-y-4">
                    <GoalMetricsHeader />
                    
                    <div className="space-y-3">
                      {representatives?.map((rep) => (
                        <RepGoalRow
                          key={rep?.id}
                          rep={rep}
                          goals={currentWeekGoals?.[rep?.id] || {}}
                          previousWeekPerformance={previousWeekPerformance?.[rep?.id]}
                          onGoalChange={handleGoalChange}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Mobile Goals Cards */}
                  <div className="lg:hidden space-y-4">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Icon name="Smartphone" size={16} />
                      <span>Tap any card to edit goals</span>
                    </div>
                    
                    {representatives?.map((rep) => (
                      <MobileGoalCard
                        key={rep?.id}
                        rep={rep}
                        goals={currentWeekGoals?.[rep?.id] || {}}
                        previousWeekPerformance={previousWeekPerformance?.[rep?.id]}
                        onGoalChange={handleGoalChange}
                      />
                    ))}
                  </div>

                  {/* Action Summary */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon name="CheckCircle" size={20} className="text-success" />
                        <span className="font-medium text-foreground">
                          Goals updated for {representatives?.length} rep{representatives?.length !== 1 ? 's' : ''} - Week of {currentWeek?.toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Icon name="Clock" size={16} />
                        <span>Last updated: {new Date()?.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyGoals;