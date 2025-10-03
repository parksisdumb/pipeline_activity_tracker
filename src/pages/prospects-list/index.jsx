import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, Search, Users, Target, ExternalLink, Phone, Briefcase } from 'lucide-react';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';


import { prospectsService } from '../../services/prospectsService';
import { usersService } from '../../services/usersService';
import ProspectsTable from './components/ProspectsTable';
import ProspectDrawer from './components/ProspectDrawer';
import BulkActions from './components/BulkActions';
import FilterToolbar from './components/FilterToolbar';
import ImportProspectsModal from './components/ImportProspectsModal';
import AddProspectModal from './components/AddProspectModal';
import EditProspectModal from './components/EditProspectModal';
import AddAccountModal from '../convert-prospect-modal';

const ProspectsList = () => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspects, setSelectedProspects] = useState(new Set());
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [addProspectModalOpen, setAddProspectModalOpen] = useState(false);
  const [editProspectModalOpen, setEditProspectModalOpen] = useState(false);
  const [prospectToEdit, setProspectToEdit] = useState(null);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [prospectToConvert, setProspectToConvert] = useState(null);
  
  // Filters state
  const [filters, setFilters] = useState({
    status: ['uncontacted', 'researching', 'attempted', 'contacted'],
    min_icp_score: 0,
    search: '',
    state: '',
    city: '',
    company_type: '',
    assigned_to: '',
    source: ''
  });

  // Sorting state
  const [sort, setSort] = useState({
    column: 'icp_fit_score',
    direction: 'desc'
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0
  });

  // Load initial data
  useEffect(() => {
    loadProspects();
    loadStats();
    loadUsers();
  }, [filters, sort, pagination?.offset]);

  const loadProspects = async () => {
    setLoading(true);
    try {
      let result = await prospectsService?.listProspects(filters, sort, {
        limit: pagination?.limit,
        offset: pagination?.offset
      });
      
      if (result?.error) {
        console.error('Failed to load prospects:', result?.error);
      } else {
        setProspects(result?.data || []);
      }
    } catch (error) {
      console.error('Error loading prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      let result = await prospectsService?.getProspectStats();
      if (!result?.error) {
        setStats(result?.data || {});
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      let result = await usersService?.getUsers();
      if (!result?.error) {
        setUsers(result?.data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  // Handle sort changes
  const handleSort = (column) => {
    setSort(prev => ({
      column,
      direction: prev?.column === column && prev?.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Handle prospect selection
  const handleSelectProspect = (prospectId, isSelected) => {
    setSelectedProspects(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet?.add(prospectId);
      } else {
        newSet?.delete(prospectId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedProspects(new Set(prospects?.map(p => p?.id) || []));
    } else {
      setSelectedProspects(new Set());
    }
  };

  // Handle prospect actions
  const handleClaimProspect = async (prospectId) => {
    try {
      let result = await prospectsService?.claimProspect(prospectId);
      if (result?.error) {
        alert('Failed to claim prospect: ' + result?.error);
      } else {
        loadProspects();
      }
    } catch (error) {
      console.error('Error claiming prospect:', error);
      alert('Failed to claim prospect');
    }
  };

  const handleUpdateStatus = async (prospectId, status) => {
    try {
      let result = await prospectsService?.updateStatus(prospectId, status);
      if (result?.error) {
        alert('Failed to update status: ' + result?.error);
      } else {
        loadProspects();
        loadStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleAddToRoute = async (prospectId) => {
    const dueDate = prompt('Enter due date for route visit (YYYY-MM-DD):');
    if (!dueDate) return;

    try {
      let result = await prospectsService?.addToRoute(prospectId, dueDate);
      if (result?.error) {
        alert('Failed to add to route: ' + result?.error);
      } else {
        alert('Successfully added to route!');
        loadProspects();
      }
    } catch (error) {
      console.error('Error adding to route:', error);
      alert('Failed to add to route');
    }
  };

  const handleStartSequence = async (prospectId) => {
    try {
      let result = await prospectsService?.startSequenceOrTask(prospectId);
      if (result?.error) {
        alert('Failed to start sequence: ' + result?.error);
      } else {
        alert('First outreach task created!');
        loadProspects();
        loadStats();
      }
    } catch (error) {
      console.error('Error starting sequence:', error);
      alert('Failed to start sequence');
    }
  };

  const handleConvertToAccount = async (prospectId) => {
    // Find the prospect and open the add account modal
    const prospect = prospects?.find(p => p?.id === prospectId);
    if (prospect) {
      setProspectToConvert(prospect);
      setConvertModalOpen(true);
    }
  };

  const handleDisqualify = async (prospectId) => {
    const reason = prompt('Enter reason for disqualification:');
    if (!reason) return;

    try {
      let result = await prospectsService?.updateStatus(prospectId, 'disqualified', reason);
      if (result?.error) {
        alert('Failed to disqualify: ' + result?.error);
      } else {
        loadProspects();
        loadStats();
      }
    } catch (error) {
      console.error('Error disqualifying prospect:', error);
      alert('Failed to disqualify prospect');
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action, data) => {
    try {
      let result = null;
      
      switch (action) {
        case 'assign':
          result = await prospectsService?.bulkAssign(Array.from(selectedProspects), data?.assigneeId);
          break;
        case 'export':
          result = await prospectsService?.exportProspects(filters);
          if (!result?.error) {
            // Trigger CSV download
            const csvContent = "data:text/csv;charset=utf-8," + "Name,Domain,Phone,City,State,Company Type,ICP Score,Status,Source,Assigned To,Created\n" +
              result?.data?.map(row => Object.values(row)?.join(','))?.join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link?.setAttribute('href', encodedUri);
            link?.setAttribute('download', `prospects_${new Date()?.toISOString()?.split('T')?.[0]}.csv`);
            document.body?.appendChild(link);
            link?.click();
            document.body?.removeChild(link);
          }
          break;
        default:
          console.warn('Unknown bulk action:', action);
          return;
      }

      if (result?.error) {
        alert(`Failed to ${action}: ${result?.error}`);
      } else {
        alert(`Successfully completed ${action}!`);
        setSelectedProspects(new Set());
        loadProspects();
      }
    } catch (error) {
      console.error(`Error with bulk ${action}:`, error);
      alert(`Failed to ${action}`);
    }
  };

  // Handle create prospect
  const handleCreateProspect = async (prospectData) => {
    try {
      let result = await prospectsService?.createProspect(prospectData);
      
      if (result?.error) {
        return { error: result?.error };
      }
      
      // Refresh data
      loadProspects();
      loadStats();
      
      return { success: true };
    } catch (error) {
      console.error('Error creating prospect:', error);
      return { error: 'Failed to create prospect. Please try again.' };
    }
  };

  // Handle edit prospect
  const handleEditProspect = (prospect) => {
    setProspectToEdit(prospect);
    setEditProspectModalOpen(true);
  };

  // Handle prospect update
  const handleUpdateProspect = async (prospectId, updateData) => {
    try {
      let result = await prospectsService?.updateProspect(prospectId, updateData);
      if (result?.error) {
        return { error: result?.error };
      } else {
        // Refresh data
        loadProspects();
        loadStats();
        return { success: true };
      }
    } catch (error) {
      console.error('Error updating prospect:', error);
      return { error: 'Failed to update prospect. Please try again.' };
    }
  };

  const handleViewDetails = (prospect) => {
    setSelectedProspect(prospect);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedProspect(null);
    loadProspects(); // Refresh list in case of changes
    loadStats(); // Refresh stats
  };

  const handleEditModalClose = () => {
    setEditProspectModalOpen(false);
    setProspectToEdit(null);
    loadProspects(); // Refresh list in case of changes
    loadStats(); // Refresh stats
  };

  const handleConversionSuccess = (result) => {
    console.log('Add Account Success:', result);
    
    if (!result) {
      console.error('No result provided to success handler');
      return;
    }

    // Display success notification
    if (result?.message) {
      // Create a simple notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 500;
        max-width: 400px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      `;
      
      notification.innerHTML = `
        <div style="display: flex; align-items: center;">
          <svg style="width: 20px; height: 20px; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          ${result?.message}
        </div>
      `;
      
      document.body?.appendChild(notification);
      
      // Remove notification after 4 seconds
      setTimeout(() => {
        if (notification?.parentNode) {
          notification?.parentNode?.removeChild(notification);
        }
      }, 4000);
    }
    
    // Refresh data to ensure UI consistency
    loadProspects();
    loadStats();
    
    // Close modal
    setConvertModalOpen(false);
    setProspectToConvert(null);
    
    // Offer navigation to the new account
    if (result?.accountId) {
      setTimeout(() => {
        const shouldNavigate = window.confirm(
          'Account successfully added! Would you like to view the new account details?'
        );
        if (shouldNavigate) {
          navigate(`/account-details/${result?.accountId}`);
        }
      }, 1000);
    }
  };

  const handleConvertModalClose = () => {
    setConvertModalOpen(false);
    setProspectToConvert(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={() => {}} />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header with KPIs */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Prospects</h1>
                <p className="text-gray-600">Hunt uncontacted ICP companies before they become accounts</p>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => setAddProspectModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Prospect
                </Button>
                <Button
                  onClick={() => setImportModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Import Prospects
                </Button>
              </div>
            </div>

            {/* KPI Cards - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-gray-500 mr-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600 truncate">Total</p>
                    <p className="text-xl font-semibold text-gray-900">{stats?.total || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center">
                  <Target className="w-5 h-5 text-blue-500 mr-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600 truncate">Uncontacted</p>
                    <p className="text-xl font-semibold text-blue-600">{stats?.uncontacted || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center">
                  <Search className="w-5 h-5 text-yellow-500 mr-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600 truncate">Researching</p>
                    <p className="text-xl font-semibold text-yellow-600">{stats?.researching || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-orange-500 mr-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600 truncate">Attempted</p>
                    <p className="text-xl font-semibold text-orange-600">{stats?.attempted || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center">
                  <Briefcase className="w-5 h-5 text-green-500 mr-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600 truncate">Contacted</p>
                    <p className="text-xl font-semibold text-green-600">{stats?.contacted || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center">
                  <ExternalLink className="w-5 h-5 text-red-500 mr-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-600 truncate">Disqualified</p>
                    <p className="text-xl font-semibold text-red-600">{stats?.disqualified || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <FilterToolbar
            filters={filters}
            onFilterChange={handleFilterChange}
            users={users}
          />

          {/* Bulk Actions */}
          {selectedProspects?.size > 0 && (
            <BulkActions
              selectedCount={selectedProspects?.size}
              users={users}
              onBulkAction={handleBulkAction}
              onClearSelection={() => setSelectedProspects(new Set())}
            />
          )}

          {/* Prospects Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <ProspectsTable
              prospects={prospects}
              loading={loading}
              selectedProspects={selectedProspects}
              onSelectProspect={handleSelectProspect}
              onSelectAll={handleSelectAll}
              onSort={handleSort}
              sort={sort}
              onViewDetails={handleViewDetails}
              onEditProspect={handleEditProspect}
              onClaimProspect={handleClaimProspect}
              onUpdateStatus={handleUpdateStatus}
              onAddToRoute={handleAddToRoute}
              onStartSequence={handleStartSequence}
              onConvertToAccount={handleConvertToAccount}
              onDisqualify={handleDisqualify}
            />
          </div>

          {/* Pagination */}
          {prospects?.length >= pagination?.limit && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-700">
                Showing {pagination?.offset + 1} to {Math.min(pagination?.offset + pagination?.limit, pagination?.total)} of {pagination?.total} results
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={pagination?.offset === 0}
                  onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev?.offset - prev?.limit) }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={prospects?.length < pagination?.limit}
                  onClick={() => setPagination(prev => ({ ...prev, offset: prev?.offset + prev?.limit }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Prospect Detail Drawer */}
      {drawerOpen && selectedProspect && (
        <ProspectDrawer
          prospect={selectedProspect}
          isOpen={drawerOpen}
          onClose={handleDrawerClose}
          onUpdate={loadProspects}
        />
      )}
      
      {/* Add Prospect Modal */}
      {addProspectModalOpen && (
        <AddProspectModal
          isOpen={addProspectModalOpen}
          onClose={() => setAddProspectModalOpen(false)}
          onProspectCreated={handleCreateProspect}
        />
      )}
      
      {/* Import Prospects Modal */}
      {importModalOpen && (
        <ImportProspectsModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImportComplete={() => {
            setImportModalOpen(false);
            loadProspects();
            loadStats();
          }}
        />
      )}
      
      {/* Edit Prospect Modal */}
      {editProspectModalOpen && prospectToEdit && (
        <EditProspectModal
          isOpen={editProspectModalOpen}
          onClose={handleEditModalClose}
          prospect={prospectToEdit}
          onProspectUpdated={handleUpdateProspect}
        />
      )}
      
      {/* Add Account Modal */}
      {convertModalOpen && prospectToConvert && (
        <AddAccountModal
          isOpen={convertModalOpen}
          prospect={prospectToConvert}
          onClose={handleConvertModalClose}
          onConversionSuccess={handleConversionSuccess}
        />
      )}
    </div>
  );
};

export default ProspectsList;