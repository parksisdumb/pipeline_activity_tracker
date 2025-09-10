import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isToday, isFuture, isPast } from 'date-fns';

import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';


import ActivitiesTable from './components/ActivitiesTable';

import ActivityFilters from './components/ActivityFilters';

import { useAuth } from '../../contexts/AuthContext';
import { activitiesService } from '../../services/activitiesService';
import Icon from '../../components/AppIcon';


const ActivitiesPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // New activity view state
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'past', 'today', 'future'
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 'all', 'today', 'this_week', 'last_7_days', 'this_month', 'last_30_days', 'custom'
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  // View states
  const [sortConfig, setSortConfig] = useState({ key: 'activity_date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  // Data states
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Activity type options based on schema enum
  const activityTypeOptions = [
    { value: '', label: 'All Activity Types' },
    { value: 'Phone Call', label: 'Phone Call' },
    { value: 'Email', label: 'Email' },
    { value: 'Meeting', label: 'Meeting' },
    { value: 'Site Visit', label: 'Site Visit' },
    { value: 'Proposal Sent', label: 'Proposal Sent' },
    { value: 'Follow-up', label: 'Follow-up' },
    { value: 'Assessment', label: 'Assessment' },
    { value: 'Contract Signed', label: 'Contract Signed' }
  ];

  // Outcome options based on schema enum
  const outcomeOptions = [
    { value: '', label: 'All Outcomes' },
    { value: 'Successful', label: 'Successful' },
    { value: 'No Answer', label: 'No Answer' },
    { value: 'Callback Requested', label: 'Callback Requested' },
    { value: 'Not Interested', label: 'Not Interested' },
    { value: 'Interested', label: 'Interested' },
    { value: 'Proposal Requested', label: 'Proposal Requested' },
    { value: 'Meeting Scheduled', label: 'Meeting Scheduled' },
    { value: 'Contract Signed', label: 'Contract Signed' }
  ];

  // Date range options
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Activity view tabs configuration
  const activityTabs = [
    { 
      id: 'all', 
      label: 'All Activities', 
      icon: 'Activity',
      description: 'All logged and scheduled activities'
    },
    { 
      id: 'past', 
      label: 'Past Activities', 
      icon: 'History',
      description: 'Completed activities from the past'
    },
    { 
      id: 'today', 
      label: "Today\'s Activities", 
      icon: 'Calendar',
      description: 'Activities scheduled for today'
    },
    { 
      id: 'future', 
      label: 'Upcoming Tasks', 
      icon: 'CalendarDays',
      description: 'Future scheduled activities and follow-ups'
    }
  ];

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    
    switch (dateRangeFilter) {
      case 'today':
        return {
          dateFrom: format(now, 'yyyy-MM-dd'),
          dateTo: format(now, 'yyyy-MM-dd')
        };
      case 'this_week':
        return {
          dateFrom: format(startOfWeek(now), 'yyyy-MM-dd'),
          dateTo: format(endOfWeek(now), 'yyyy-MM-dd')
        };
      case 'last_7_days':
        return {
          dateFrom: format(subDays(now, 7), 'yyyy-MM-dd'),
          dateTo: format(now, 'yyyy-MM-dd')
        };
      case 'this_month':
        return {
          dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
          dateTo: format(endOfMonth(now), 'yyyy-MM-dd')
        };
      case 'last_30_days':
        return {
          dateFrom: format(subDays(now, 30), 'yyyy-MM-dd'),
          dateTo: format(now, 'yyyy-MM-dd')
        };
      case 'custom':
        return {
          dateFrom: customDateFrom,
          dateTo: customDateTo
        };
      default:
        return {};
    }
  };

  // Load activities
  const loadActivities = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    const dateRange = getDateRange();
    const filters = {
      searchQuery: searchTerm,
      activityType: activityTypeFilter,
      outcome: outcomeFilter,
      userId: userFilter || user?.id,
      accountId: accountFilter,
      ...dateRange,
      sortBy: sortConfig?.key,
      sortDirection: sortConfig?.direction,
      limit: 500 // Load more for client-side filtering
    };

    const result = await activitiesService?.getActivities(filters);

    if (result?.success) {
      setActivities(result?.data || []);
    } else {
      setError(result?.error || 'Failed to load activities');
    }

    setLoading(false);
  };

  // Load data when component mounts or filters change
  useEffect(() => {
    if (user && !authLoading) {
      loadActivities();
    }
  }, [
    user, 
    authLoading, 
    searchTerm, 
    activityTypeFilter, 
    outcomeFilter, 
    userFilter,
    accountFilter,
    dateRangeFilter,
    customDateFrom,
    customDateTo,
    sortConfig
  ]);

  // Enhanced activity filtering with categorization
  const categorizedActivities = useMemo(() => {
    let filteredList = activities?.filter(activity => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm?.toLowerCase();
        const matchesSearch = 
          activity?.subject?.toLowerCase()?.includes(searchLower) ||
          activity?.description?.toLowerCase()?.includes(searchLower) ||
          activity?.notes?.toLowerCase()?.includes(searchLower) ||
          activity?.account?.name?.toLowerCase()?.includes(searchLower) ||
          activity?.contact?.first_name?.toLowerCase()?.includes(searchLower) ||
          activity?.contact?.last_name?.toLowerCase()?.includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      return true;
    });

    // Apply tab-based filtering
    if (activeTab !== 'all') {
      filteredList = filteredList?.filter(activity => {
        const activityDate = new Date(activity?.activity_date);
        const now = new Date();
        
        switch (activeTab) {
          case 'past':
            return isPast(activityDate) && !isToday(activityDate);
          case 'today':
            return isToday(activityDate);
          case 'future':
            return isFuture(activityDate) && !isToday(activityDate);
          default:
            return true;
        }
      });
    }

    return filteredList || [];
  }, [activities, searchTerm, activeTab]);

  // Enhanced statistics with categorization
  const enhancedStats = useMemo(() => {
    const now = new Date();
    
    const pastActivities = activities?.filter(activity => {
      const activityDate = new Date(activity?.activity_date);
      return isPast(activityDate) && !isToday(activityDate);
    })?.length || 0;

    const todayActivities = activities?.filter(activity => {
      const activityDate = new Date(activity?.activity_date);
      return isToday(activityDate);
    })?.length || 0;

    const futureActivities = activities?.filter(activity => {
      const activityDate = new Date(activity?.activity_date);
      return isFuture(activityDate) && !isToday(activityDate);
    })?.length || 0;

    // Also check follow-up dates for future tasks
    const followUpTasks = activities?.filter(activity => {
      if (!activity?.follow_up_date) return false;
      const followUpDate = new Date(activity?.follow_up_date);
      return isFuture(followUpDate) || isToday(followUpDate);
    })?.length || 0;

    const overdueTasks = activities?.filter(activity => {
      if (!activity?.follow_up_date) return false;
      const followUpDate = new Date(activity?.follow_up_date);
      return isPast(followUpDate) && !isToday(followUpDate);
    })?.length || 0;

    return {
      total: activities?.length || 0,
      past: pastActivities,
      today: todayActivities,
      future: futureActivities,
      followUps: followUpTasks,
      overdue: overdueTasks
    };
  }, [activities]);

  // Calculate pagination for categorized activities
  const totalPages = Math.ceil(categorizedActivities?.length / itemsPerPage);
  const paginatedActivities = categorizedActivities?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setActivityTypeFilter('');
    setOutcomeFilter('');
    setUserFilter('');
    setAccountFilter('');
    setDateRangeFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setCurrentPage(1);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadActivities();
    setIsRefreshing(false);
  };

  // Handle page changes
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activityTypeFilter, outcomeFilter, userFilter, accountFilter, dateRangeFilter, customDateFrom, customDateTo]);

  // Show loading state while auth is loading
  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div>Loading...</div>
    </div>;
  }

  // Show login prompt if not authenticated
  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Please sign in to access activities</h2>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        userRole={user?.user_metadata?.role || 'rep'}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMenuOpen={isMobileMenuOpen}
      />
      {/* Sidebar Navigation */}
      <SidebarNavigation
        userRole={user?.user_metadata?.role || 'rep'}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="hidden lg:block"
      />
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarNavigation
            userRole={user?.user_metadata?.role || 'rep'}
            isCollapsed={false}
            onToggleCollapse={() => setIsMobileMenuOpen(false)}
            className="relative z-10"
          />
        </div>
      )}
      {/* Main Content */}
      <main className={`pt-16 transition-all duration-200 ${
        isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
      }`}>
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Activities Hub</h1>
              <p className="text-muted-foreground">
                Manage past activities, today's tasks, and future scheduled activities
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                iconName="RefreshCw"
                iconPosition="left"
                className="w-full sm:w-auto"
              >
                Refresh
              </Button>
              <Button
                onClick={() => navigate('/log-activity')}
                iconName="Plus"
                iconPosition="left"
                className="w-full sm:w-auto"
              >
                Log Activity
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
              <button 
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Enhanced Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                  <p className="text-2xl font-bold text-foreground">{enhancedStats?.total}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon name="Activity" size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Past Activities</p>
                  <p className="text-2xl font-bold text-foreground">{enhancedStats?.past}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Icon name="History" size={24} className="text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Tasks</p>
                  <p className="text-2xl font-bold text-foreground">{enhancedStats?.today}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                  <Icon name="Calendar" size={24} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold text-foreground">{enhancedStats?.future}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Icon name="CalendarDays" size={24} className="text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Follow-ups</p>
                  <p className="text-2xl font-bold text-foreground">{enhancedStats?.followUps}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center">
                  <Icon name="Clock" size={24} className="text-cyan-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-foreground">{enhancedStats?.overdue}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                  <Icon name="AlertTriangle" size={24} className="text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Category Tabs */}
          <div className="bg-white rounded-lg border">
            <div className="border-b p-4">
              <h3 className="text-lg font-medium text-foreground mb-4">Activity Categories</h3>
              <div className="flex flex-wrap gap-2">
                {activityTabs?.map((tab) => (
                  <Button
                    key={tab?.id}
                    variant={activeTab === tab?.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTabChange(tab?.id)}
                    iconName={tab?.icon}
                    iconPosition="left"
                    className="flex items-center gap-2"
                  >
                    <span className="hidden sm:inline">{tab?.label}</span>
                    <span className="sm:hidden">{tab?.label?.split(' ')?.[0]}</span>
                  </Button>
                ))}
              </div>
              
              {/* Active tab description */}
              <div className="mt-3 text-sm text-muted-foreground">
                {activityTabs?.find(tab => tab?.id === activeTab)?.description}
              </div>
            </div>

            <div className="p-4">
              {/* Search and Quick Filters */}
              <ActivityFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activityTypeFilter={activityTypeFilter}
                onActivityTypeChange={setActivityTypeFilter}
                outcomeFilter={outcomeFilter}
                onOutcomeChange={setOutcomeFilter}
                dateRangeFilter={dateRangeFilter}
                onDateRangeChange={setDateRangeFilter}
                customDateFrom={customDateFrom}
                onCustomDateFromChange={setCustomDateFrom}
                customDateTo={customDateTo}
                onCustomDateToChange={setCustomDateTo}
                onClearFilters={handleClearFilters}
                activitiesCount={categorizedActivities?.length}
                totalCount={activities?.length}
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">Loading activities...</div>
            </div>
          )}

          {/* Activities Table */}
          {!loading && (
            <ActivitiesTable
              activities={paginatedActivities}
              sortConfig={sortConfig}
              onSort={handleSort}
              expandedActivity={expandedActivity}
              onToggleExpand={setExpandedActivity}
              onNavigateToAccount={(accountId) => navigate(`/account-details?id=${accountId}`)}
              activeTab={activeTab}
            />
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="bg-white rounded-lg border p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, categorizedActivities?.length)} of {categorizedActivities?.length} activities
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    iconName="ChevronLeft"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + Math.max(1, currentPage - 2);
                      if (pageNum > totalPages) return null;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    iconName="ChevronRight"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced No Results */}
          {!loading && categorizedActivities?.length === 0 && (
            <div className="bg-white rounded-lg border p-8 text-center">
              <div className="text-muted-foreground mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  {activeTab === 'past' && <Icon name="History" size={32} />}
                  {activeTab === 'today' && <Icon name="Calendar" size={32} />}
                  {activeTab === 'future' && <Icon name="CalendarDays" size={32} />}
                  {activeTab === 'all' && <Icon name="Activity" size={32} />}
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {activeTab === 'past' && 'No past activities found'}
                  {activeTab === 'today' && 'No activities scheduled for today'}
                  {activeTab === 'future' && 'No upcoming activities scheduled'}
                  {activeTab === 'all' && 'No activities found'}
                </h3>
                <p>
                  {activeTab === 'past' && 'Past activities will appear here once you log them.'}
                  {activeTab === 'today' && 'Schedule activities for today or log completed ones.'}
                  {activeTab === 'future' && 'Schedule future activities and set follow-up dates.'}
                  {activeTab === 'all' && 'No activities match your current filters. Try adjusting your search criteria.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
                <Button onClick={() => navigate('/log-activity')}>
                  Log Activity
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Quick Action Button - Mobile Only */}
      <QuickActionButton onClick={() => navigate('/log-activity')} />
    </div>
  );
};

export default ActivitiesPage;