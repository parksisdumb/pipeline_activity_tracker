import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter } from 'lucide-react';
import { opportunitiesService } from '../../services/opportunitiesService';
import { accountsService } from '../../services/accountsService';
import { propertiesService } from '../../services/propertiesService';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

// UI Components
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';

// Child Components
import FilterToolbar from './components/FilterToolbar';
import OpportunitiesTable from './components/OpportunitiesTable';
import PipelineMetrics from './components/PipelineMetrics';
import BulkActions from './components/BulkActions';
import CreateOpportunityModal from './components/CreateOpportunityModal';

const OpportunitiesList = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  
  // Sidebar state management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get user role from auth context, default to 'rep'
  const userRole = userProfile?.role || 'rep';
  
  // State management
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pipelineMetrics, setPipelineMetrics] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    stage: '',
    opportunity_type: '',
    account_id: '',
    property_id: '',
    assigned_to: '',
    min_bid_value: '',
    max_bid_value: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Pagination
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });

  // Data loading
  const [accounts, setAccounts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Sidebar toggle handlers
  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Enhanced load opportunities with better error handling
  const loadOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading opportunities with filters:', filters);
      
      const response = await opportunitiesService?.getOpportunities({
        ...filters,
        limit: pagination?.limit,
        offset: pagination?.offset
      });
      
      console.log('Opportunities response:', response);
      
      if (response?.success) {
        const opportunitiesData = response?.data || [];
        setOpportunities(opportunitiesData);
        setPagination(prev => ({ 
          ...prev, 
          total: response?.count || opportunitiesData?.length || 0 
        }));
        
        // Clear any previous errors
        setError(null);
        
        console.log(`Opportunities loaded successfully: ${opportunitiesData?.length} items`);
        if (opportunitiesData?.length > 0) {
          console.log('Sample opportunity:', opportunitiesData?.[0]);
        }
      } else {
        console.error('Failed to load opportunities:', response?.error);
        setError(response?.error || 'Failed to load opportunities');
        setOpportunities([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('Error loading opportunities:', error);
      setError('An unexpected error occurred while loading opportunities');
      setOpportunities([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination?.limit, pagination?.offset]);

  // Enhanced load pipeline metrics
  const loadPipelineMetrics = useCallback(async () => {
    try {
      console.log('Loading pipeline metrics...');
      const response = await opportunitiesService?.getPipelineMetrics();
      console.log('Pipeline metrics response:', response);
      
      if (response?.success) {
        setPipelineMetrics(response?.data || []);
        console.log('Pipeline metrics loaded:', response?.data?.length);
      } else {
        console.error('Failed to load pipeline metrics:', response?.error);
        // Don't show error for metrics failure, just log it
        setPipelineMetrics([]);
      }
    } catch (error) {
      console.error('Error loading pipeline metrics:', error);
      setPipelineMetrics([]);
    }
  }, []);

  // Load supporting data
  const loadSupportingData = useCallback(async () => {
    try {
      const [accountsResponse, propertiesResponse, teamResponse] = await Promise.allSettled([
        accountsService?.getAccounts({ limit: 1000 }),
        propertiesService?.getProperties({ limit: 1000 }),
        authService?.getTeamMembers()
      ]);

      if (accountsResponse?.status === 'fulfilled' && accountsResponse?.value?.success) {
        setAccounts(accountsResponse?.value?.data || []);
      }
      
      if (propertiesResponse?.status === 'fulfilled' && propertiesResponse?.value?.success) {
        setProperties(propertiesResponse?.value?.data || []);
      }
      
      if (teamResponse?.status === 'fulfilled' && teamResponse?.value?.success) {
        setTeamMembers(teamResponse?.value?.data || []);
      }
    } catch (error) {
      console.error('Error loading supporting data:', error);
    }
  }, []);

  // Initial data loading with proper sequencing
  useEffect(() => {
    const loadAllData = async () => {
      // Load main data first
      await loadOpportunities();
      
      // Then load metrics and supporting data in parallel
      await Promise.allSettled([
        loadPipelineMetrics(),
        loadSupportingData()
      ]);
    };

    loadAllData();
  }, [loadOpportunities, loadPipelineMetrics, loadSupportingData]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  }, []);

  // Handle search
  const handleSearch = useCallback((searchTerm) => {
    handleFilterChange({ search: searchTerm });
  }, [handleFilterChange]);

  // Handle sorting
  const handleSort = useCallback((column) => {
    const newOrder = filters?.sortBy === column && filters?.sortOrder === 'asc' ? 'desc' : 'asc';
    handleFilterChange({
      sortBy: column,
      sortOrder: newOrder
    });
  }, [filters?.sortBy, filters?.sortOrder, handleFilterChange]);

  // Handle pagination
  const handlePageChange = useCallback((newOffset) => {
    setPagination(prev => ({ ...prev, offset: newOffset }));
  }, []);

  // Handle opportunity selection
  const handleOpportunitySelect = useCallback((opportunityId, selected) => {
    setSelectedOpportunities(prev => {
      if (selected) {
        return [...prev, opportunityId];
      } else {
        return prev?.filter(id => id !== opportunityId);
      }
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback((selected) => {
    if (selected) {
      setSelectedOpportunities(opportunities?.map(opp => opp?.id) || []);
    } else {
      setSelectedOpportunities([]);
    }
  }, [opportunities]);

  // Handle opportunity actions
  const handleViewOpportunity = useCallback((opportunityId) => {
    navigate(`/opportunity-details/${opportunityId}`);
  }, [navigate]);

  const handleEditOpportunity = useCallback((opportunity) => {
    navigate(`/opportunity-details/${opportunity?.id}?edit=true`);
  }, [navigate]);

  const handleDeleteOpportunity = useCallback(async (opportunityId) => {
    if (!window.confirm('Are you sure you want to delete this opportunity?')) {
      return;
    }

    try {
      const response = await opportunitiesService?.deleteOpportunity(opportunityId);
      if (response?.success) {
        await loadOpportunities();
        await loadPipelineMetrics();
        setSelectedOpportunities(prev => prev?.filter(id => id !== opportunityId));
      } else {
        setError(response?.error || 'Failed to delete opportunity');
      }
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      setError('An unexpected error occurred while deleting opportunity');
    }
  }, [loadOpportunities, loadPipelineMetrics]);

  // Handle create opportunity
  const handleCreateOpportunity = useCallback(async (opportunityData) => {
    try {
      const response = await opportunitiesService?.createOpportunity(opportunityData);
      if (response?.success) {
        setShowCreateModal(false);
        await loadOpportunities();
        await loadPipelineMetrics();
      } else {
        setError(response?.error || 'Failed to create opportunity');
      }
    } catch (error) {
      console.error('Error creating opportunity:', error);
      setError('An unexpected error occurred while creating opportunity');
    }
  }, [loadOpportunities, loadPipelineMetrics]);

  // Handle bulk actions
  const handleBulkStageUpdate = useCallback(async (newStage) => {
    try {
      const promises = selectedOpportunities?.map(id => 
        opportunitiesService?.updateOpportunityStage(id, newStage, 'Bulk stage update')
      );
      
      await Promise.all(promises);
      await loadOpportunities();
      await loadPipelineMetrics();
      setSelectedOpportunities([]);
    } catch (error) {
      console.error('Error updating opportunity stages:', error);
      setError('An unexpected error occurred while updating opportunity stages');
    }
  }, [selectedOpportunities, loadOpportunities, loadPipelineMetrics]);

  const handleBulkDelete = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedOpportunities?.length} opportunities?`)) {
      return;
    }

    try {
      const promises = selectedOpportunities?.map(id => 
        opportunitiesService?.deleteOpportunity(id)
      );
      
      await Promise.all(promises);
      await loadOpportunities();
      await loadPipelineMetrics();
      setSelectedOpportunities([]);
    } catch (error) {
      console.error('Error deleting opportunities:', error);
      setError('An unexpected error occurred while deleting opportunities');
    }
  }, [selectedOpportunities, loadOpportunities, loadPipelineMetrics]);

  // Calculate totals with enhanced safety
  const totalBidValue = opportunities?.reduce((sum, opp) => sum + (parseFloat(opp?.bid_value) || 0), 0) || 0;
  const weightedValue = opportunities?.reduce((sum, opp) => {
    const bidValue = parseFloat(opp?.bid_value) || 0;
    const probability = parseInt(opp?.probability) || 0;
    return sum + (bidValue * probability) / 100;
  }, 0) || 0;

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
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sales Opportunities</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Track and manage your sales pipeline with bid values and opportunity stages
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Opportunity
                  </button>
                </div>

                {/* Enhanced Pipeline Metrics with better error handling */}
                <PipelineMetrics 
                  metrics={pipelineMetrics}
                  totalBidValue={totalBidValue}
                  weightedValue={weightedValue}
                  opportunities={opportunities}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6">
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search opportunities by name or description..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={filters?.search || ''}
                      onChange={(e) => handleSearch(e?.target?.value)}
                    />
                  </div>
                </div>

                {/* Filter Toolbar */}
                <FilterToolbar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  accounts={accounts}
                  properties={properties}
                  teamMembers={teamMembers}
                  opportunityTypes={opportunitiesService?.getOpportunityTypes()}
                  opportunityStages={opportunitiesService?.getOpportunityStages()}
                />
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedOpportunities?.length > 0 && (
              <div className="mb-6">
                <BulkActions
                  selectedCount={selectedOpportunities?.length}
                  onStageUpdate={handleBulkStageUpdate}
                  onDelete={handleBulkDelete}
                  opportunityStages={opportunitiesService?.getOpportunityStages()}
                />
              </div>
            )}

            {/* Error Message with enhanced display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error Loading Opportunities</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button
                        type="button"
                        className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={() => {
                          setError(null);
                          loadOpportunities();
                        }}
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={() => setError(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Opportunities Table */}
            <div className="bg-white shadow rounded-lg">
              <OpportunitiesTable
                opportunities={opportunities}
                loading={loading}
                selectedOpportunities={selectedOpportunities}
                onOpportunitySelect={handleOpportunitySelect}
                onSelectAll={handleSelectAll}
                onSort={handleSort}
                onView={handleViewOpportunity}
                onEdit={handleEditOpportunity}
                onDelete={handleDeleteOpportunity}
                sortBy={filters?.sortBy}
                sortOrder={filters?.sortOrder}
                pagination={pagination}
                onPageChange={handlePageChange}
                error={error}
              />
            </div>
          </div>

          {/* Create Opportunity Modal */}
          {showCreateModal && (
            <CreateOpportunityModal
              onClose={() => setShowCreateModal(false)}
              onCreate={handleCreateOpportunity}
              accounts={accounts}
              properties={properties}
              teamMembers={teamMembers}
              opportunityTypes={opportunitiesService?.getOpportunityTypes()}
            />
          )}
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <QuickActionButton variant="floating" onClick={() => setShowCreateModal(true)} />
    </div>
  );
};

export default OpportunitiesList;