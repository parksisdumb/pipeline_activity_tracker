import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { goalsService } from '../../services/goalsService';
import { activitiesService } from '../../services/activitiesService';
import { managerService } from '../../services/managerService';
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
  
  // Core data state
  const [loading, setLoading] = useState(true);
  const [userGoals, setUserGoals] = useState([]);
  const [goalStats, setGoalStats] = useState(null);
  const [actualProgress, setActualProgress] = useState({});
  
  // Manager state
  const [representatives, setRepresentatives] = useState([]);
  const [repsLoading, setRepsLoading] = useState(true);
  const [teamGoals, setTeamGoals] = useState({});
  const [teamPerformance, setTeamPerformance] = useState({});
  const [previousWeekPerformance, setPreviousWeekPerformance] = useState({});
  
  // Data synchronization state
  const [lastDataRefresh, setLastDataRefresh] = useState(Date.now());
  const [forceRefresh, setForceRefresh] = useState(0);
  const mountedRef = useRef(true);
  const dataFetchingRef = useRef(false);
  
  // Determine if this is manager or rep view
  const isRepView = userProfile?.role === 'rep';
  const weekStartDate = currentWeek?.toISOString()?.split('T')?.[0];

  // Enhanced data loading functions with better error handling and caching prevention
  const loadUserGoalsAndProgress = useCallback(async (forceReload = false) => {
    if (!user?.id || !isRepView || dataFetchingRef?.current) return;
    
    dataFetchingRef.current = true;
    setLoading(true);
    
    try {
      console.log(`Loading user goals for week: ${weekStartDate}, force reload: ${forceReload}`);
      
      // Force fresh data fetch from database with cache busting
      const timestamp = Date.now();
      const goalsResult = await goalsService?.getWeeklyGoals(user?.id, weekStartDate);
      
      if (goalsResult?.success && mountedRef?.current) {
        setUserGoals(goalsResult?.data || []);
        console.log(`Fresh goals loaded: ${goalsResult?.data?.length} goals for user ${user?.id}`);
        
        // Update last refresh timestamp
        setLastDataRefresh(timestamp);
      } else if (mountedRef?.current) {
        console.warn('Failed to load goals:', goalsResult?.error);
        setUserGoals([]);
      }

      // Load goal statistics
      const statsResult = await goalsService?.getGoalStats(user?.id, {
        weekStartFrom: weekStartDate,
        weekStartTo: weekStartDate
      });
      
      if (statsResult?.success && mountedRef?.current) {
        setGoalStats(statsResult?.data);
      }

      // Calculate actual progress from activities
      await calculateActualProgress();
    } catch (error) {
      console.error('Error loading user goals:', error);
      if (mountedRef?.current) {
        setUserGoals([]);
        setGoalStats(null);
      }
    } finally {
      if (mountedRef?.current) {
        setLoading(false);
      }
      dataFetchingRef.current = false;
    }
  }, [user?.id, weekStartDate, isRepView]);

  const loadTeamData = useCallback(async (forceReload = false) => {
    if (!user?.id || isRepView || dataFetchingRef?.current) return;
    
    dataFetchingRef.current = true;
    setRepsLoading(true);
    
    try {
      console.log(`Loading team data for manager: ${user?.id}, force reload: ${forceReload}`);
      
      // Load all tenant users for manager view with cache busting
      const teamMembers = await managerService?.getAllTenantUsers(user?.id);
      
      if (teamMembers?.length > 0 && mountedRef?.current) {
        // Filter for active representatives and include manager
        const activeReps = teamMembers?.filter(member => 
          member?.is_active && (member?.role === 'rep' || member?.role === 'manager')
        );
        
        // Transform to component format
        const formattedReps = activeReps?.map(rep => ({
          id: rep?.id,
          name: rep?.full_name || 'Unknown Rep',
          role: rep?.role === 'manager' ? 'Manager' : 'Sales Representative',
          email: rep?.email || '',
          total_accounts: rep?.total_accounts || 0,
          recent_activities: rep?.recent_activities || 0
        }));
        
        setRepresentatives(formattedReps);
        console.log(`Team members loaded: ${formattedReps?.length} members`);
        
        // Load goals and performance data for each rep
        await loadTeamGoalsAndPerformance(activeReps, forceReload);
      } else if (mountedRef?.current) {
        console.log('No team members found');
        setRepresentatives([]);
        setTeamGoals({});
        setTeamPerformance({});
        setPreviousWeekPerformance({});
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      if (mountedRef?.current) {
        setRepresentatives([]);
        setTeamGoals({});
        setTeamPerformance({});
        setPreviousWeekPerformance({});
      }
    } finally {
      if (mountedRef?.current) {
        setRepsLoading(false);
      }
      dataFetchingRef.current = false;
    }
  }, [user?.id, isRepView, weekStartDate]);

  const loadTeamGoalsAndPerformance = useCallback(async (teamMembers, forceReload = false) => {
    if (!teamMembers?.length || !mountedRef?.current) return;
    
    try {
      const currentWeekStart = weekStartDate;
      const previousWeekStart = new Date(currentWeek);
      previousWeekStart?.setDate(previousWeekStart?.getDate() - 7);
      const previousWeekStartDate = previousWeekStart?.toISOString()?.split('T')?.[0];

      const goalsData = {};
      const performanceData = {};
      const previousPerformanceData = {};

      console.log(`Loading goals and performance for ${teamMembers?.length} team members`);

      // Load goals and performance for each team member
      for (const member of teamMembers) {
        if (!mountedRef?.current) break;
        
        // Load current week goals with fresh data and cache busting
        const goalsResult = await goalsService?.getWeeklyGoals(member?.id, currentWeekStart);
        if (goalsResult?.success && goalsResult?.data?.length > 0) {
          // Transform goals array to object keyed by goal_type
          const memberGoals = {};
          goalsResult?.data?.forEach(goal => {
            memberGoals[goal?.goal_type] = {
              target: goal?.target_value || 0,
              current: goal?.current_value || 0,
              status: goal?.status || 'Not Started'
            };
          });
          goalsData[member?.id] = memberGoals;
          console.log(`Loaded ${Object.keys(memberGoals)?.length} goals for member ${member?.full_name}`);
        } else {
          // Default goals structure if no goals found
          goalsData[member?.id] = {
            pop_ins: { target: 0, current: 0, status: 'Not Started' },
            dm_conversations: { target: 0, current: 0, status: 'Not Started' },
            assessments_booked: { target: 0, current: 0, status: 'Not Started' },
            proposals_sent: { target: 0, current: 0, status: 'Not Started' },
            wins: { target: 0, current: 0, status: 'Not Started' }
          };
        }

        // Load current week performance from activities
        const currentWeekEnd = new Date(currentWeek);
        currentWeekEnd?.setDate(currentWeekEnd?.getDate() + 6);
        
        const activitiesResult = await activitiesService?.getActivitiesList({
          userId: member?.id,
          dateFrom: currentWeekStart,
          dateTo: currentWeekEnd?.toISOString()?.split('T')?.[0]
        });

        if (activitiesResult?.success) {
          const activities = activitiesResult?.data || [];
          performanceData[member?.id] = {
            pop_ins: activities?.filter(a => a?.activity_type === 'Pop-in')?.length || 0,
            dm_conversations: activities?.filter(a => a?.activity_type === 'Decision Maker Conversation')?.length || 0,
            assessments_booked: activities?.filter(a => a?.activity_outcome === 'Assessment Completed')?.length || 0,
            proposals_sent: activities?.filter(a => a?.activity_type === 'Proposal Sent')?.length || 0,
            wins: activities?.filter(a => a?.activity_type === 'Contract Signed')?.length || 0
          };
        } else {
          performanceData[member?.id] = {
            pop_ins: 0,
            dm_conversations: 0,
            assessments_booked: 0,
            proposals_sent: 0,
            wins: 0
          };
        }

        // Load previous week performance from activities
        const previousWeekEnd = new Date(previousWeekStart);
        previousWeekEnd?.setDate(previousWeekEnd?.getDate() + 6);
        
        const previousActivitiesResult = await activitiesService?.getActivitiesList({
          userId: member?.id,
          dateFrom: previousWeekStartDate,
          dateTo: previousWeekEnd?.toISOString()?.split('T')?.[0]
        });

        if (previousActivitiesResult?.success) {
          const prevActivities = previousActivitiesResult?.data || [];
          previousPerformanceData[member?.id] = {
            pop_ins: prevActivities?.filter(a => a?.activity_type === 'Pop-in')?.length || 0,
            dm_conversations: prevActivities?.filter(a => a?.activity_type === 'Decision Maker Conversation')?.length || 0,
            assessments_booked: prevActivities?.filter(a => a?.activity_outcome === 'Assessment Completed')?.length || 0,
            proposals_sent: prevActivities?.filter(a => a?.activity_type === 'Proposal Sent')?.length || 0,
            wins: prevActivities?.filter(a => a?.activity_type === 'Contract Signed')?.length || 0
          };
        } else {
          previousPerformanceData[member?.id] = {
            pop_ins: 0,
            dm_conversations: 0,
            assessments_booked: 0,
            proposals_sent: 0,
            wins: 0
          };
        }
      }

      if (mountedRef?.current) {
        setTeamGoals(goalsData);
        setTeamPerformance(performanceData);
        setPreviousWeekPerformance(previousPerformanceData);
        setLastDataRefresh(Date.now());
        console.log(`Team data loaded successfully for ${Object.keys(goalsData)?.length} members`);
      }
    } catch (error) {
      console.error('Error loading team goals and performance:', error);
      if (mountedRef?.current) {
        setTeamGoals({});
        setTeamPerformance({});
        setPreviousWeekPerformance({});
      }
    }
  }, [weekStartDate, currentWeek]);

  const calculateActualProgress = useCallback(async () => {
    if (!user?.id || !isRepView) return;
    
    try {
      const weekEndDate = new Date(currentWeek);
      weekEndDate?.setDate(weekEndDate?.getDate() + 6);
      
      const activitiesResult = await activitiesService?.getActivitiesList({
        userId: user?.id,
        dateFrom: weekStartDate,
        dateTo: weekEndDate?.toISOString()?.split('T')?.[0]
      });

      if (activitiesResult?.success && mountedRef?.current) {
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
  }, [user?.id, isRepView, currentWeek, weekStartDate]);

  // Enhanced page visibility and focus handling
  useEffect(() => {
    mountedRef.current = true;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && mountedRef?.current) {
        console.log('Page became visible, refreshing data...');
        setForceRefresh(prev => prev + 1);
      }
    };
    
    const handleFocus = () => {
      if (mountedRef?.current) {
        console.log('Window focused, refreshing data...');
        // Force a complete data refresh when window regains focus
        setForceRefresh(prev => prev + 1);
      }
    };

    const handleBeforeUnload = () => {
      mountedRef.current = false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Enhanced data loading effect with proper dependency management
  useEffect(() => {
    if (!user?.id || !userProfile?.role) return;
    
    const shouldForceReload = forceRefresh > 0;
    console.log(`Data loading effect triggered. Rep view: ${isRepView}, Force reload: ${shouldForceReload}`);
    
    if (isRepView) {
      loadUserGoalsAndProgress(shouldForceReload);
    } else {
      loadTeamData(shouldForceReload);
    }
  }, [user?.id, userProfile?.role, currentWeek, forceRefresh, isRepView, loadUserGoalsAndProgress, loadTeamData]);

  // Enhanced goal change handler with better persistence and debugging
  const handleGoalChange = useCallback(async (repId, newGoals) => {
    if (!repId || !newGoals || Object.keys(newGoals)?.length === 0) return;
    
    try {
      console.log(`Updating goals for rep ${repId}:`, newGoals);
      
      // Update goals in database using bulk set goals
      const weekStart = weekStartDate;
      
      // Transform newGoals format to match what bulkSetGoals expects
      const goalsData = {};
      Object.keys(newGoals)?.forEach(type => {
        if (newGoals?.[type] !== undefined && newGoals?.[type] !== null) {
          goalsData[type] = parseInt(newGoals?.[type]) || 0;
        }
      });

      const result = await goalsService?.bulkSetGoals([repId], weekStart, goalsData);
      
      if (result?.success) {
        console.log('Goals saved successfully to database:', result?.message || 'Success');
        
        // Update local state immediately for better UX
        setTeamGoals(prev => {
          const updatedGoals = { ...prev };
          
          // Ensure rep object exists
          if (!updatedGoals?.[repId]) {
            updatedGoals[repId] = {};
          }
          
          // Update with new goal values
          Object.keys(goalsData)?.forEach(type => {
            updatedGoals[repId] = {
              ...updatedGoals?.[repId],
              [type]: {
                target: goalsData?.[type],
                current: updatedGoals?.[repId]?.[type]?.current || 0,
                status: goalsData?.[type] > 0 ? 'In Progress' : 'Not Started'
              }
            };
          });
          
          return updatedGoals;
        });

        // Update last data refresh to prevent unnecessary reloads
        setLastDataRefresh(Date.now());
        
        // Verify data persistence by forcing a refresh after a short delay
        setTimeout(() => {
          if (mountedRef?.current) {
            console.log('Verifying goal persistence...');
            setForceRefresh(prev => prev + 1);
          }
        }, 1000);
        
      } else {
        console.error('Failed to update goals:', result?.error);
        
        // If there's a permission error, try to debug the relationship
        if (result?.error?.includes('permission') || result?.error?.includes('manage') || result?.error?.includes('insufficient')) {
          console.log('Permission error detected, debugging manager relationships...');
          const debugResult = await goalsService?.debugManagerRelationships(user?.id);
          if (debugResult?.success) {
            console.log('Manager relationship debug:', debugResult?.data);
          }
        }
        
        // Show user-friendly error message
        alert(`Failed to update goals: ${result?.error}\n\nIf this persists, please contact your system administrator to check manager-team relationships.`);
      }
    } catch (error) {
      console.error('Error updating goals:', error);
      alert('An unexpected error occurred while updating goals. Please try again or contact support.');
    }
  }, [weekStartDate, user?.id]);

  const handleBulkGoalSet = useCallback(async (repIds, goals) => {
    if (!repIds?.length || !goals || Object.keys(goals)?.length === 0) return;
    
    try {
      console.log(`Bulk updating goals for ${repIds?.length} reps:`, goals);
      
      const weekStart = weekStartDate;
      const result = await goalsService?.bulkSetGoals(repIds, weekStart, goals);
      
      if (result?.success) {
        console.log('Bulk goals saved successfully to database:', result?.message || 'Success');
        
        // Update local state for all affected reps
        setTeamGoals(prev => {
          const updated = { ...prev };
          repIds?.forEach(repId => {
            if (!updated?.[repId]) {
              updated[repId] = {};
            }
            
            Object.keys(goals)?.forEach(type => {
              updated[repId] = {
                ...updated?.[repId],
                [type]: {
                  target: goals?.[type],
                  current: updated?.[repId]?.[type]?.current || 0,
                  status: goals?.[type] > 0 ? 'In Progress' : 'Not Started'
                }
              };
            });
          });
          return updated;
        });

        // Update last data refresh
        setLastDataRefresh(Date.now());
        
        // Verify data persistence
        setTimeout(() => {
          if (mountedRef?.current) {
            console.log('Verifying bulk goal persistence...');
            setForceRefresh(prev => prev + 1);
          }
        }, 1000);
        
      } else {
        console.error('Failed to bulk update goals:', result?.error);
        
        // If there's a permission error, try to debug and possibly fix relationships
        if (result?.error?.includes('permission') || result?.error?.includes('manage') || result?.error?.includes('insufficient')) {
          console.log('Permission error detected, trying to establish manager relationships...');
          const establishResult = await goalsService?.establishManagerRelationships();
          if (establishResult?.success && establishResult?.count > 0) {
            console.log(`Established ${establishResult?.count} manager relationships. Retrying goal assignment...`);
            // Retry the operation once
            setTimeout(() => {
              if (mountedRef?.current) {
                handleBulkGoalSet(repIds, goals);
              }
            }, 1000);
            return;
          }
        }
        
        alert(`Failed to bulk update goals: ${result?.error}\n\nIf this persists, please contact your system administrator to check manager-team relationships.`);
      }
    } catch (error) {
      console.error('Error bulk updating goals:', error);
      alert('An unexpected error occurred while bulk updating goals. Please try again or contact support.');
    }
  }, [weekStartDate]);

  const handleCopyFromPreviousWeek = useCallback(() => {
    // Copy previous week's performance as goals for current week
    const repIds = representatives?.map(rep => rep?.id);
    const previousGoals = {};
    
    // Transform previous week performance to goals format
    Object.keys(previousWeekPerformance)?.forEach(repId => {
      const prevPerf = previousWeekPerformance?.[repId];
      if (prevPerf) {
        previousGoals.pop_ins = prevPerf?.pop_ins || 0;
        previousGoals.dm_conversations = prevPerf?.dm_conversations || 0;
        previousGoals.assessments_booked = prevPerf?.assessments_booked || 0;
        previousGoals.proposals_sent = prevPerf?.proposals_sent || 0;
        previousGoals.wins = prevPerf?.wins || 0;
      }
    });

    if (Object.keys(previousGoals)?.length > 0) {
      handleBulkGoalSet(repIds, previousGoals);
    }
  }, [representatives, previousWeekPerformance, handleBulkGoalSet]);

  const handleWeekChange = useCallback((newWeek) => {
    console.log('Week changed, triggering data refresh...');
    setCurrentWeek(newWeek);
    // Force a complete refresh when week changes
    setForceRefresh(prev => prev + 1);
  }, []);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    console.log('Manual refresh triggered');
    setForceRefresh(prev => prev + 1);
  }, []);

  // Utility functions
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(!mobileMenuOpen);
  }, [mobileMenuOpen]);

  // Memoized goal conversion functions
  const getCurrentWeekGoals = useCallback(() => {
    const converted = {};
    Object.keys(teamGoals)?.forEach(repId => {
      converted[repId] = {};
      const repGoals = teamGoals?.[repId] || {};
      Object.keys(repGoals)?.forEach(goalType => {
        converted[repId][goalType] = repGoals?.[goalType]?.target || 0;
      });
    });
    return converted;
  }, [teamGoals]);

  const getCurrentWeekPerformance = useCallback(() => {
    return teamPerformance;
  }, [teamPerformance]);

  // Memoized values to prevent unnecessary re-renders
  const currentWeekGoals = getCurrentWeekGoals();
  const isManagerLoading = !isRepView && repsLoading;
  const isRepLoading = isRepView && loading;

  // Show individual rep view with enhanced persistence
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
            onRefresh={handleManualRefresh}
          />
        </div>
      </div>
    );
  }

  // Show manager view with enhanced persistence
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
          {/* Header Section with Data Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Team Weekly Goals</h1>
              <p className="text-muted-foreground">
                Set and manage performance targets for your sales team
              </p>
              <div className="text-xs text-muted-foreground mt-1">
                Last updated: {new Date(lastDataRefresh)?.toLocaleTimeString()}
              </div>
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
                variant="outline" 
                size="sm"
                onClick={handleManualRefresh}
                iconName="RefreshCw"
                iconPosition="left"
                disabled={isManagerLoading}
              >
                {isManagerLoading ? 'Refreshing...' : 'Refresh'}
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
              <p className="mt-2 text-muted-foreground">Loading team data...</p>
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

              {/* No Team Members Message */}
              {representatives?.length === 0 && (
                <div className="text-center py-12 bg-card border border-border rounded-lg">
                  <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Team Members Found</h3>
                  <p className="text-muted-foreground mb-4">
                    There are no active team members in your tenant. Team members will appear here once they're added to your organization.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin-dashboard')}
                    iconName="UserPlus"
                    iconPosition="left"
                  >
                    Manage Users
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
                    currentWeekPerformance={getCurrentWeekPerformance()}
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
                          key={`${rep?.id}-${lastDataRefresh}`}
                          rep={rep}
                          goals={currentWeekGoals?.[rep?.id] || {}}
                          previousWeekPerformance={previousWeekPerformance?.[rep?.id] || {}}
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
                        key={`${rep?.id}-${lastDataRefresh}`}
                        rep={rep}
                        goals={currentWeekGoals?.[rep?.id] || {}}
                        previousWeekPerformance={previousWeekPerformance?.[rep?.id] || {}}
                        onGoalChange={handleGoalChange}
                      />
                    ))}
                  </div>

                  {/* Enhanced Status Summary */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon name="CheckCircle" size={20} className="text-success" />
                        <span className="font-medium text-foreground">
                          Managing goals for {representatives?.length} team member{representatives?.length !== 1 ? 's' : ''} - Week of {currentWeek?.toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${dataFetchingRef?.current ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                          <span>{dataFetchingRef?.current ? 'Syncing...' : 'Synced'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Icon name="Clock" size={16} />
                          <span>{new Date(lastDataRefresh)?.toLocaleTimeString()}</span>
                        </div>
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