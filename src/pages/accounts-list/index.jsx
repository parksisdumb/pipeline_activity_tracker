import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
import AddAccountModal from '../../components/ui/AddAccountModal';
import { AccountsTable } from './components/AccountsTable';
import FilterToolbar from './components/FilterToolbar';
import BulkActions from './components/BulkActions';
import Pagination from './components/Pagination';
import ViewOptions from './components/ViewOptions';
import { AssignRepsModal } from '../manager-dashboard/components/AssignRepsModal';

import { useAuth } from '../../contexts/AuthContext';
import { accountsService } from '../../services/accountsService';

export default function AccountsList() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [assignedRepFilter, setAssignedRepFilter] = useState('');
  
  // Table states
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // View states
  const [viewMode, setViewMode] = useState('table');
  const [showInactive, setShowInactive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add missing state variables for assign reps modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAccountForReps, setSelectedAccountForReps] = useState(null);

  // Load accounts
  const loadAccounts = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    // Remove filters from service call - handle filtering client-side only
    const filters = {
      showInactive,
      sortBy: sortConfig?.key,
      sortDirection: sortConfig?.direction,
    };

    let result = await accountsService?.getAccounts(filters);

    if (result?.success) {
      setAccounts(result?.data || []);
    } else {
      setError(result?.error || 'Failed to load accounts');
    }

    setLoading(false);
  };

  // Load data when component mounts or filters change
  useEffect(() => {
    if (user && !authLoading) {
      loadAccounts();
    }
  }, [
    user, 
    authLoading, 
    searchTerm, 
    companyTypeFilter, 
    stageFilter, 
    assignedRepFilter, 
    showInactive, 
    sortConfig
  ]);

  // Filter accounts based on current filters
  const filteredAccounts = useMemo(() => {
    return accounts?.filter(account => {
      // Show/hide inactive filter
      if (!showInactive && !account?.is_active) return false;
      
      // Search filter
      if (searchTerm && !account?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase())) {
        return false;
      }
      
      // Company type filter
      if (companyTypeFilter && account?.company_type !== companyTypeFilter) {
        return false;
      }
      
      // Stage filter
      if (stageFilter && account?.stage !== stageFilter) {
        return false;
      }
      
      // Assigned rep filter
      if (assignedRepFilter && account?.assigned_rep_id !== assignedRepFilter) {
        return false;
      }
      
      return true;
    });
  }, [accounts, searchTerm, companyTypeFilter, stageFilter, assignedRepFilter, showInactive]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAccounts?.length / itemsPerPage);

  // Handle selection
  const handleSelectAccount = (accountId) => {
    setSelectedAccounts(prev => 
      prev?.includes(accountId) 
        ? prev?.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAccounts?.length === filteredAccounts?.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(filteredAccounts?.map(account => account?.id));
    }
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle bulk actions
  const handleBulkAction = async (actionType, actionValue, accountIds) => {
    if (!accountIds?.length) return;

    let result;
    
    if (actionType === 'stage') {
      result = await accountsService?.bulkUpdateAccounts(accountIds, { stage: actionValue });
    } else if (actionType === 'assignedRep') {
      result = await accountsService?.bulkUpdateAccounts(accountIds, { assigned_rep_id: actionValue });
    } else if (actionType === 'delete') {
      // Handle bulk delete
      const deletePromises = accountIds?.map(id => accountsService?.deleteAccount(id));
      const results = await Promise.all(deletePromises);
      const successCount = results?.filter(r => r?.success)?.length;
      
      if (successCount > 0) {
        setError(`Successfully deleted ${successCount} accounts`);
        await loadAccounts(); // Reload data
      } else {
        setError('Failed to delete accounts');
      }
      
      setSelectedAccounts([]);
      return;
    }

    if (result?.success) {
      setError(`Successfully updated ${result?.count || accountIds?.length} accounts`);
      await loadAccounts(); // Reload data
    } else {
      setError(result?.error || 'Failed to update accounts');
    }
    
    setSelectedAccounts([]);
  };

  // Handle filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setCompanyTypeFilter('');
    setStageFilter('');
    setAssignedRepFilter('');
    setCurrentPage(1);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAccounts();
    setIsRefreshing(false);
  };

  // Handle page changes
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, companyTypeFilter, stageFilter, assignedRepFilter, showInactive]);

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
        <h2 className="text-2xl font-semibold mb-4">Please sign in to access accounts</h2>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    </div>;
  }

  const handleAccountAdded = async (newAccount) => {
    try {
      // Refresh the accounts list
      await loadAccounts();
      setIsAddAccountModalOpen(false);
    } catch (error) {
      console.error('Error refreshing accounts:', error);
    }
  };

  const handleAddAccount = () => {
    setIsAddAccountModalOpen(true);
  };

  // Add missing handler functions
  const handleViewAccount = (account) => {
    navigate(`/accounts/${account?.id}`);
  };

  const handleEditAccount = (account) => {
    navigate(`/accounts/${account?.id}/edit`);
  };

  const handleAssignReps = (account) => {
    setSelectedAccountForReps(account);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    loadAccounts(); // Refresh accounts list to show updated assignments
    setShowAssignModal(false);
    setSelectedAccountForReps(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <h1 className="text-2xl font-semibold text-foreground">Accounts</h1>
              <p className="text-muted-foreground">
                Manage and track your sales accounts and pipeline progress
              </p>
            </div>
            <Button
              onClick={handleAddAccount}
              iconName="Plus"
              iconPosition="left"
              className="w-full sm:w-auto"
            >
              Add Account
            </Button>
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

          {/* Filter Toolbar */}
          <FilterToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            companyTypeFilter={companyTypeFilter}
            onCompanyTypeChange={setCompanyTypeFilter}
            stageFilter={stageFilter}
            onStageChange={setStageFilter}
            assignedRepFilter={assignedRepFilter}
            onAssignedRepChange={setAssignedRepFilter}
            onClearFilters={handleClearFilters}
            resultsCount={filteredAccounts?.length}
            totalCount={accounts?.length}
          />

          {/* View Options */}
          <ViewOptions
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            showInactive={showInactive}
            onToggleInactive={() => setShowInactive(!showInactive)}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing || loading}
          />

          {/* Bulk Actions */}
          <BulkActions
            selectedAccounts={selectedAccounts}
            onBulkAction={handleBulkAction}
            onClearSelection={() => setSelectedAccounts([])}
          />

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <div>Loading accounts...</div>
            </div>
          )}

          {/* Accounts Table */}
          {!loading && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <AccountsTable
                accounts={filteredAccounts}
                onView={handleViewAccount}
                onEdit={handleEditAccount}
                onAssignReps={handleAssignReps}
                selectedAccounts={selectedAccounts}
                onSelectAccount={handleSelectAccount}
                onSelectAll={handleSelectAll}
                currentUser={user}
                sortConfig={sortConfig}
                onSort={handleSort}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredAccounts?.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </div>
      </main>
      {/* Quick Action Button - Mobile Only */}
      <QuickActionButton onClick={handleAddAccount} />
      
      <AddAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onAccountAdded={handleAccountAdded}
      />
      
      {/* Assign Reps Modal */}
      <AssignRepsModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedAccountForReps(null);
        }}
        account={selectedAccountForReps}
        onSuccess={handleAssignSuccess}
      />
    </div>
  );
}