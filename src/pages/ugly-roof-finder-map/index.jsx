import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../../components/ui/Header';
import SidebarNavigation from '../../components/ui/SidebarNavigation';
import { useAuth } from '../../contexts/AuthContext';
import RoofMap from './components/RoofMap';
import LeadDrawer from './components/LeadDrawer';
import FiltersBar from './components/FiltersBar';
import roofLeadsService from '../../services/roofLeadsService';

// Helper function to debounce bounds updates
function useDebounced(value, ms) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), ms);
    return () => clearTimeout(timeout);
  }, [value, ms]);
  return debouncedValue;
}

// Helper function to convert geometry to point for markers
const toPointGeometry = (geometry) => {
  if (!geometry) return null;
  if (geometry?.type === 'Point') return geometry;
  
  try {
    // For polygons, calculate centroid manually
    if (geometry?.type === 'Polygon') {
      const ring = Array.isArray(geometry?.coordinates?.[0]) ? geometry?.coordinates?.[0] : [];
      if (!ring?.length) return null;
      
      const [sx, sy] = ring?.reduce((acc, [x, y]) => [acc?.[0] + x, acc?.[1] + y], [0, 0]);
      return { 
        type: 'Point', 
        coordinates: [sx / ring?.length, sy / ring?.length] 
      };
    }
    
    return null;
  } catch {
    return null;
  }
};

export default function UglyRoofFinderMap() {
  const { user, userProfile } = useAuth();
  const [leads, setLeads] = useState([]);
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
  
  // Debounce bounds to prevent fetch spam
  const debouncedBounds = useDebounced(mapBounds, 300);

  // Load leads based on current map bounds and filters
  const loadLeads = useCallback(async () => {
    if (!debouncedBounds) return; // Skip if bounds is null
    
    setLoading(true);
    try {
      const result = await roofLeadsService?.listLeads({
        bbox: debouncedBounds,
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
  }, [debouncedBounds, filters]);

  // Load leads when user, bounds or filters change
  useEffect(() => {
    if (user && debouncedBounds) {
      loadLeads();
    }
  }, [user, debouncedBounds, filters, loadLeads]);

  // Handle map bounds change - called on moveend only
  const handleMapBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds);
  }, []);

  // Handle drawing completion (new lead creation)
  const handleDrawComplete = useCallback(async (geojson, drawingType) => {
    try {
      // Create basic lead data structure with correct key
      const leadData = {
        name: `New ${drawingType === 'point' ? 'Pin' : 'Area'} Lead`,
        geometry: geojson, // Fixed: use 'geometry'not 'geojson' condition_label:'other',
        condition_score: 1,
        tags: ['new'],
        notes: `Created via map drawing (${drawingType})`
      };

      const result = await roofLeadsService?.createLead(leadData);
      
      if (result?.success) {
        // Optimistically add to leads list
        const newLead = { id: result?.data?.id, ...leadData };
        setLeads(prev => [newLead, ...prev]);
        
        // Open drawer with new lead
        setSelectedLead(newLead);
        setIsDrawerOpen(true);
        
        // Reconcile with server after a brief delay
        setTimeout(() => loadLeads(), 250);
      } else {
        console.error('Failed to create lead:', result?.error);
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
    console.log('Menu toggle clicked');
  }, []);

  // Normalize markers with proper point geometry and remove client-side filtering
  const mapMarkers = useMemo(() => {
    return leads?.map(lead => {
      const geom = lead?.geometry || lead?.geojson; // Unify backend shape
      const point = toPointGeometry(geom);
      if (!point) return null;
      
      return {
        id: lead?.id,
        geometry: point,
        condition_label: lead?.condition_label,
        condition_score: lead?.condition_score,
        name: lead?.name,
        status: lead?.status
      };
    })?.filter(Boolean);
  }, [leads]);

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
          leadCount={leads?.length}
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