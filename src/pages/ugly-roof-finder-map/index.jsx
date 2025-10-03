import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import { useAuth } from '../../contexts/AuthContext';
import RoofMap from './components/RoofMap';
import LeadDrawer from './components/LeadDrawer';
import FiltersBar from './components/FiltersBar';
import roofLeadsService from '../../services/roofLeadsService';

export default function UglyRoofFinderMap() {
  const { user, userProfile } = useAuth();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    condition: '',
    tags: [],
    scoreRange: [1, 5]
  });
  const [mapBounds, setMapBounds] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load leads based on current map bounds and filters
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const result = await roofLeadsService?.listLeads({
        bbox: mapBounds,
        search: filters?.search,
        status: filters?.status || undefined,
        tags: filters?.tags,
        minScore: filters?.scoreRange?.[0],
        maxScore: filters?.scoreRange?.[1],
        limit: 100
      });

      if (result?.success) {
        setLeads(result?.data || []);
      } else {
        console.error('Failed to load leads:', result?.error);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  }, [mapBounds, filters]);

  // Apply client-side filtering for immediate UI response
  const applyFilters = useCallback(() => {
    let filtered = leads;

    // Additional client-side filtering for immediate response
    if (filters?.condition) {
      filtered = filtered?.filter(lead => lead?.condition_label === filters?.condition);
    }

    setFilteredLeads(filtered);
  }, [leads, filters]);

  // Load leads when bounds or filters change
  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user, loadLeads]);

  // Apply filters when leads or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Handle map bounds change
  const handleMapBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds);
  }, []);

  // Handle drawing completion (new lead creation)
  const handleDrawComplete = useCallback(async (geojson, drawingType) => {
    try {
      // Create basic lead data structure
      const leadData = {
        name: `New ${drawingType === 'point' ? 'Pin' : 'Area'} Lead`,
        geojson: geojson,
        condition_label: 'other',
        condition_score: 1,
        tags: ['new'],
        notes: `Created via map drawing (${drawingType})`
      };

      const result = await roofLeadsService?.createLead(leadData);
      
      if (result?.success) {
        // Reload leads to include new one
        loadLeads();
        
        // Open drawer with new lead
        const newLeadResult = await roofLeadsService?.getLead(result?.data?.id);
        if (newLeadResult?.success) {
          setSelectedLead(newLeadResult?.data);
          setIsDrawerOpen(true);
        }
      } else {
        console.error('Failed to create lead:', result?.error);
        // TODO: Show error notification
      }
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  }, [loadLeads]);

  // Handle lead selection from map
  const handleLeadSelect = useCallback(async (leadId) => {
    try {
      const result = await roofLeadsService?.getLead(leadId);
      if (result?.success) {
        setSelectedLead(result?.data);
        setIsDrawerOpen(true);
      }
    } catch (error) {
      console.error('Error loading lead details:', error);
    }
  }, []);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedLead(null);
  }, []);

  // Handle lead updates from drawer
  const handleLeadUpdate = useCallback((updatedLead) => {
    setLeads(prevLeads => 
      prevLeads?.map(lead => 
        lead?.id === updatedLead?.id ? updatedLead : lead
      )
    );
    setSelectedLead(updatedLead);
  }, []);

  // Handle lead deletion
  const handleLeadDelete = useCallback(async (leadId) => {
    try {
      const result = await roofLeadsService?.deleteLead(leadId);
      if (result?.success) {
        setLeads(prevLeads => prevLeads?.filter(lead => lead?.id !== leadId));
        handleDrawerClose();
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  }, [handleDrawerClose]);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  // Handle menu toggle for header
  const handleMenuToggle = useCallback(() => {
    // Handle mobile menu toggle logic if needed
    console.log('Menu toggle clicked');
  }, []);

  // Memoize map markers for performance
  const mapMarkers = useMemo(() => 
    filteredLeads?.map(lead => ({
      id: lead?.id,
      coordinates: lead?.coordinates,
      condition_label: lead?.condition_label,
      condition_score: lead?.condition_score,
      name: lead?.name,
      status: lead?.status
    }))
  , [filteredLeads]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to access the Roof Finder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <SidebarNavigation onToggleCollapse={handleSidebarToggle} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={handleMenuToggle} />
        
        {/* Filters Bar */}
        <FiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          leadCount={filteredLeads?.length}
          loading={loading}
        />

        {/* Main Map Container */}
        <div className="flex-1 relative">
          <RoofMap
            leads={mapMarkers}
            onBoundsChange={handleMapBoundsChange}
            onDrawComplete={handleDrawComplete}
            onLeadSelect={handleLeadSelect}
            loading={loading}
          />
          
          {/* Lead Details Drawer */}
          <LeadDrawer
            isOpen={isDrawerOpen}
            lead={selectedLead}
            onClose={handleDrawerClose}
            onUpdate={handleLeadUpdate}
            onDelete={handleLeadDelete}
          />
        </div>
      </div>
    </div>
  );
}