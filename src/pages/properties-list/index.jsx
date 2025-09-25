import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import QuickActionButton from '../../components/ui/QuickActionButton';
import AddPropertyModal from '../../components/ui/AddPropertyModal';
import PropertyFilters from './components/PropertyFilters';
import PropertyTable from './components/PropertyTable';
import BulkActions from './components/BulkActions';
import PropertyStats from './components/PropertyStats';
import Icon from '../../components/AppIcon';

import { useAuth } from '../../contexts/AuthContext';
import { propertiesService } from '../../services/propertiesService';

const PropertiesList = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  
  // UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filter states
  const [buildingTypeFilter, setBuildingTypeFilter] = useState('');
  const [roofTypeFilter, setRoofTypeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Data states
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load properties
  const loadProperties = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    const filters = {
      searchTerm: searchQuery, // Fixed: changed from searchQuery to searchTerm to match service
      buildingType: buildingTypeFilter,
      roofType: roofTypeFilter, // This now maps correctly to roof_type in service
      stage: stageFilter,
      sortBy: sortConfig?.key,
      sortDirection: sortConfig?.direction,
    };

    const result = await propertiesService?.getProperties(filters);

    if (result?.success) {
      setProperties(result?.data || []);
      
      // Clear error if properties load successfully
      if (error && result?.data?.length >= 0) {
        setError(null);
      }
    } else {
      setError(result?.error || 'Failed to load properties');
      
      // If access denied, show helpful message
      if (result?.error?.includes('Access denied')) {
        setError('No properties found. You can only view properties from accounts assigned to you. Contact your manager if you need access to additional accounts.');
      }
    }

    setLoading(false);
  };

  // Load data when component mounts or filters change
  useEffect(() => {
    if (user && !authLoading) {
      loadProperties();
    }
  }, [
    user, 
    authLoading, 
    searchQuery, 
    buildingTypeFilter, 
    roofTypeFilter, 
    stageFilter, 
    sortConfig
  ]);

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties?.filter(property => {
      const matchesSearch = !searchQuery || 
        property?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        property?.address?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        property?.account?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase());
      
      const matchesBuildingType = !buildingTypeFilter || property?.building_type === buildingTypeFilter;
      const matchesRoofType = !roofTypeFilter || property?.roof_type === roofTypeFilter;
      const matchesStage = !stageFilter || property?.stage === stageFilter;

      return matchesSearch && matchesBuildingType && matchesRoofType && matchesStage;
    });

    // Sort properties - Handle special sorting cases
    if (sortConfig?.key) {
      filtered?.sort((a, b) => {
        let aValue = a?.[sortConfig?.key];
        let bValue = b?.[sortConfig?.key];

        // Handle special cases for nested account data
        if (sortConfig?.key === 'account_id') {
          aValue = a?.account?.name || '';
          bValue = b?.account?.name || '';
        }

        // Handle special cases
        if (sortConfig?.key === 'last_assessment') {
          aValue = aValue ? new Date(aValue) : new Date(0);
          bValue = bValue ? new Date(bValue) : new Date(0);
        }

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue?.toLowerCase();
          bValue = bValue?.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig?.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig?.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [properties, buildingTypeFilter, roofTypeFilter, stageFilter, searchQuery, sortConfig]);

  // Event handlers
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig?.key === key && prevConfig?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectProperty = (propertyId, isSelected) => {
    setSelectedProperties(prev => 
      isSelected 
        ? [...prev, propertyId]
        : prev?.filter(id => id !== propertyId)
    );
  };

  const handleSelectAll = (isSelected) => {
    setSelectedProperties(isSelected ? filteredAndSortedProperties?.map(p => p?.id) : []);
  };

  const handleClearFilters = () => {
    setBuildingTypeFilter('');
    setRoofTypeFilter('');
    setStageFilter('');
    setSearchQuery('');
  };

  const handleBulkStageUpdate = async (newStage) => {
    if (!selectedProperties?.length) return;

    const result = await propertiesService?.bulkUpdateProperties(selectedProperties, { stage: newStage });
    
    if (result?.success) {
      setError(`Successfully updated ${result?.count || selectedProperties?.length} properties`);
      await loadProperties(); // Reload data
    } else {
      setError(result?.error || 'Failed to update properties');
    }
    
    setSelectedProperties([]);
  };

  const handleBulkExport = () => {
    const selectedData = filteredAndSortedProperties?.filter(p => selectedProperties?.includes(p?.id));
    
    // Create CSV content
    const headers = ['Name', 'Address', 'Account', 'Building Type', 'Roof Type', 'Stage', 'Last Assessment'];
    const csvContent = [
      headers?.join(','),
      ...selectedData?.map(property => [
        `"${property?.name}"`,
        `"${property?.address}"`,
        `"${property?.account?.name || ''}"`,
        property?.building_type,
        property?.roof_type,
        property?.stage,
        property?.last_assessment ? new Date(property.last_assessment)?.toLocaleDateString() : 'Never'
      ]?.join(','))
    ]?.join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL?.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `properties-export-${new Date()?.toISOString()?.split('T')?.[0]}.csv`;
    a?.click();
    window.URL?.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    if (!selectedProperties?.length) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedProperties?.length} properties? This action cannot be undone.`)) {
      const deletePromises = selectedProperties?.map(id => propertiesService?.deleteProperty(id));
      const results = await Promise.all(deletePromises);
      const successCount = results?.filter(r => r?.success)?.length;
      
      if (successCount > 0) {
        setError(`Successfully deleted ${successCount} properties`);
        await loadProperties(); // Reload data
      } else {
        setError('Failed to delete properties');
      }
      
      setSelectedProperties([]);
    }
  };

  const handlePropertyAdded = async (newProperty) => {
    try {
      // Show success message
      setError(`Property "${newProperty?.name}" has been added successfully!`);
      
      // Refresh the properties list
      await loadProperties();
      setIsAddPropertyModalOpen(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (error) {
      console.error('Error refreshing properties:', error);
      setError('Property added but failed to refresh list. Please reload the page.');
    }
  };

  const handleAddProperty = () => {
    setIsAddPropertyModalOpen(true);
  };

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
        <h2 className="text-2xl font-semibold mb-4">Please sign in to access properties</h2>
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Properties</h1>
              <p className="mt-2 text-muted-foreground">
                Manage and track commercial properties in your pipeline
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddProperty}
                iconName="Plus"
                iconPosition="left"
                className="w-full sm:w-auto"
              >
                Add Property
              </Button>
            </div>
          </div>

          {/* Enhanced Error/Success Message */}
          {error && (
            <div className={`px-4 py-3 rounded-md border ${
              error?.includes('successfully') 
                ? 'bg-green-50 border-green-200 text-green-700' :'bg-red-50 border-red-200 text-red-700'
            }`}>
              {error}
              <button 
                onClick={() => setError(null)}
                className={`ml-2 hover:opacity-75 ${
                  error?.includes('successfully') ? 'text-green-500' : 'text-red-500'
                }`}
              >
                ×
              </button>
            </div>
          )}

          {/* Stats */}
          <PropertyStats properties={filteredAndSortedProperties} />

          {/* Filters */}
          <PropertyFilters
            buildingTypeFilter={buildingTypeFilter}
            setBuildingTypeFilter={setBuildingTypeFilter}
            roofTypeFilter={roofTypeFilter}
            setRoofTypeFilter={setRoofTypeFilter}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onClearFilters={handleClearFilters}
            resultCount={filteredAndSortedProperties?.length}
          />

          {/* Bulk Actions */}
          <BulkActions
            selectedCount={selectedProperties?.length}
            onBulkStageUpdate={handleBulkStageUpdate}
            onBulkExport={handleBulkExport}
            onBulkDelete={handleBulkDelete}
            onClearSelection={() => setSelectedProperties([])}
          />

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <div>Loading properties...</div>
            </div>
          )}

          {/* Properties Table */}
          {!loading && filteredAndSortedProperties?.length > 0 && (
            <PropertyTable
              properties={filteredAndSortedProperties}
              selectedProperties={selectedProperties}
              onSelectProperty={handleSelectProperty}
              onSelectAll={handleSelectAll}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          )}

          {/* Enhanced Empty State with Account Assignment Info */}
          {!loading && filteredAndSortedProperties?.length === 0 && properties?.length === 0 && (
            <div className="text-center py-12">
              <Icon name="Building2" size={64} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">No properties available</h3>
              <p className="text-muted-foreground mb-4">
                You can only view and create properties for accounts assigned to you.
              </p>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p>• Properties must be linked to accounts you're assigned to</p>
                  <p>• Contact your manager to assign accounts to your profile</p>
                  <p>• Once assigned, you can create properties for those accounts</p>
                </div>
                <Button
                  onClick={handleAddProperty}
                  iconName="Plus"
                  iconPosition="left"
                  className="mt-4"
                >
                  Add Your First Property
                </Button>
              </div>
            </div>
          )}

          {/* No Results State */}
          {!loading && filteredAndSortedProperties?.length === 0 && properties?.length > 0 && (
            <div className="text-center py-12">
              <Icon name="Search" size={64} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">No properties found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search criteria or filters.
              </p>
              <Button onClick={handleClearFilters}>Clear Filters</Button>
            </div>
          )}
        </div>
      </main>
      <QuickActionButton onClick={handleAddProperty} />
      <AddPropertyModal
        isOpen={isAddPropertyModalOpen}
        onClose={() => setIsAddPropertyModalOpen(false)}
        onPropertyAdded={handlePropertyAdded}
      />
    </div>
  );
};

export default PropertiesList;