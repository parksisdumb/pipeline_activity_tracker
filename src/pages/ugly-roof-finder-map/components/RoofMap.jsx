import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Map, Layer, Source, NavigationControl, GeolocateControl, ScaleControl } from 'react-map-gl';
import { MapPin, Square } from 'lucide-react';
import Button from '../../../components/ui/Button';
import maplibregl from 'maplibre-gl';

// MapLibre GL JS styles - Static import for race safety
import 'maplibre-gl/dist/maplibre-gl.css';

export default function RoofMap({ leads = [], onBoundsChange, onDrawComplete, onLeadSelect, loading = false }) {
  const mapRef = useRef();
  const [viewState, setViewState] = useState({
    latitude: 29.7604, // Houston default
    longitude: -95.3698,
    zoom: 10
  });
  const [drawingMode, setDrawingMode] = useState(null); // 'point' | 'polygon' | null
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Map style configuration - using OpenStreetMap for better compatibility
  const mapStyle = useMemo(() => {
    const tileUrl = import.meta.env?.VITE_MAP_TILES_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    return {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };
  }, []);

  // Set bounds change to moveend only (no spam)
  useEffect(() => {
    const map = mapRef?.current?.getMap?.();
    if (!map || !onBoundsChange) return;
    
    const handler = () => {
      const b = map?.getBounds()?.toArray();
      if (!b) return;
      onBoundsChange([b?.[0]?.[0], b?.[0]?.[1], b?.[1]?.[0], b?.[1]?.[1]]);
    };
    
    map?.on('moveend', handler);
    return () => map?.off('moveend', handler);
  }, [onBoundsChange]);

  // Handle map clicks for drawing and marker selection
  const handleMapClick = useCallback((event) => {
    if (!event) return;

    // Check for cluster clicks first (zoom in)
    const cluster = event?.features?.find(f => f?.layer?.id === 'clusters');
    if (cluster) {
      const map = mapRef?.current?.getMap?.();
      const [lng, lat] = cluster?.geometry?.coordinates || [];
      if (map && lng != null && lat != null) {
        map?.easeTo({ center: [lng, lat], zoom: viewState?.zoom + 1 });
      }
      return;
    }

    // Check for marker clicks (lead selection)
    const feat = event?.features?.find(f => f?.layer?.id === 'lead-markers');
    if (feat?.properties?.id && !drawingMode) {
      onLeadSelect?.(feat?.properties?.id);
      return;
    }

    // Drawing logic
    if (!drawingMode || !event?.lngLat) return;
    const { lng, lat } = event?.lngLat;

    if (drawingMode === 'point') {
      // Create point geometry
      const pointGeometry = {
        type: 'Point',
        coordinates: [lng, lat]
      };
      
      onDrawComplete?.(pointGeometry, 'point');
      setDrawingMode(null);
      
    } else if (drawingMode === 'polygon') {
      const newPoint = [lng, lat];
      
      if (!isDrawing) {
        // Start drawing
        setDrawingPoints([newPoint]);
        setIsDrawing(true);
      } else {
        // Add point to polygon
        const newPoints = [...drawingPoints, newPoint];
        setDrawingPoints(newPoints);
      }
    }
  }, [drawingMode, drawingPoints, isDrawing, onDrawComplete, onLeadSelect, viewState?.zoom]);

  // Finish polygon drawing
  const finishPolygon = useCallback(() => {
    if (drawingPoints?.length >= 3) {
      const closedPoints = [...drawingPoints, drawingPoints?.[0]];
      const polygonGeometry = {
        type: 'Polygon',
        coordinates: [closedPoints]
      };
      
      onDrawComplete?.(polygonGeometry, 'polygon');
      setDrawingPoints([]);
      setIsDrawing(false);
      setDrawingMode(null);
    }
  }, [drawingPoints, onDrawComplete]);

  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    setDrawingMode(null);
    setDrawingPoints([]);
    setIsDrawing(false);
  }, []);

  // Start drawing mode
  const startDrawing = useCallback((mode) => {
    cancelDrawing();
    setDrawingMode(mode);
  }, [cancelDrawing]);

  // Create GeoJSON for lead markers with clustering
  const leadMarkersGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: leads?.map(lead => ({
      type: 'Feature',
      properties: {
        id: lead?.id,
        name: lead?.name || 'Unnamed Lead',
        condition_label: lead?.condition_label || 'unknown',
        condition_score: lead?.condition_score || 1,
        status: lead?.status || 'new'
      },
      geometry: lead?.geometry
    })) || []
  }), [leads]);

  // Create GeoJSON for drawing preview
  const drawingGeoJSON = useMemo(() => {
    if (drawingMode === 'polygon' && drawingPoints?.length > 0) {
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: drawingPoints
          }
        }]
      };
    }
    return { type: 'FeatureCollection', features: [] };
  }, [drawingMode, drawingPoints]);

  // Handle key press for canceling drawing
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event?.key === 'Escape') {
        cancelDrawing();
      }
    };

    if (drawingMode) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [drawingMode, cancelDrawing]);

  // Handle double-click to finish polygon
  const handleMapDoubleClick = useCallback((event) => {
    if (drawingMode === 'polygon' && isDrawing) {
      event?.preventDefault();
      finishPolygon();
    }
  }, [drawingMode, isDrawing, finishPolygon]);

  return (
    <div className="relative w-full h-full">
      {/* Loading/Empty States */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-white/70 rounded px-3 py-2 text-sm">Loading map data…</div>
        </div>
      )}
      {!loading && leads?.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-white/70 rounded px-3 py-2 text-sm">No leads in this view</div>
        </div>
      )}

      {/* Drawing Instructions */}
      {drawingMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg px-4 py-2">
          <div className="text-sm font-medium text-gray-900">
            {drawingMode === 'point' && 'Click on the map to drop a pin'}
            {drawingMode === 'polygon' && (
              <>
                {!isDrawing ? 'Click to start drawing area' : 'Click to add points, double-click or use Finish button to complete'}
              </>
            )}
          </div>
          <button
            onClick={cancelDrawing}
            className="text-xs text-gray-500 hover:text-gray-700 mt-1"
          >
            Press ESC to cancel
          </button>
        </div>
      )}

      {/* Finish Area Button */}
      {drawingMode === 'polygon' && isDrawing && (
        <Button 
          size="xs" 
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10" 
          onClick={finishPolygon}
        >
          Finish Area
        </Button>
      )}

      {/* Drawing Tools */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          onClick={() => startDrawing('point')}
          variant={drawingMode === 'point' ? 'primary' : 'secondary'}
          size="sm"
          className="flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Pin
        </Button>
        <Button
          onClick={() => startDrawing('polygon')}
          variant={drawingMode === 'polygon' ? 'primary' : 'secondary'}
          size="sm"
          className="flex items-center gap-2"
        >
          <Square className="w-4 h-4" />
          Area
        </Button>
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={({ viewState: newViewState }) => setViewState(newViewState)}
        onClick={handleMapClick}
        onDblClick={handleMapDoubleClick}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapLib={maplibregl}
        interactiveLayerIds={['clusters', 'lead-markers']}
      >
        {/* Map Controls */}
        <NavigationControl position="top-left" />
        <GeolocateControl position="top-left" />
        <ScaleControl position="bottom-right" />

        {/* Lead Markers with Clustering */}
        {leadMarkersGeoJSON?.features?.length > 0 && (
          <Source 
            id="lead-markers" 
            type="geojson" 
            data={leadMarkersGeoJSON}
            cluster
            clusterRadius={50}
            clusterMaxZoom={14}
          >
            {/* Clusters */}
            <Layer
              id="clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-color': '#93C5FD',
                'circle-radius': ['step', ['get', 'point_count'], 15, 50, 20, 100, 25]
              }}
            />
            
            {/* Cluster Count */}
            <Layer
              id="cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{ 
                'text-field': '{point_count_abbreviated}', 
                'text-size': 12 
              }}
              paint={{ 'text-color': '#1F2937' }}
            />
            
            {/* Individual Markers */}
            <Layer
              id="lead-markers"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['get', 'condition_score'],
                  1, 6,
                  5, 12
                ],
                'circle-color': [
                  'case',
                  ['==', ['get', 'status'], 'converted'], '#10B981',
                  ['>=', ['get', 'condition_score'], 4], '#EF4444',
                  ['>=', ['get', 'condition_score'], 3], '#F59E0B',
                  '#6B7280'
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF',
                'circle-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* Drawing Preview */}
        {drawingGeoJSON?.features?.length > 0 && (
          <Source id="drawing-preview" type="geojson" data={drawingGeoJSON}>
            <Layer
              id="drawing-line"
              type="line"
              paint={{
                'line-color': '#3B82F6',
                'line-width': 2,
                'line-dasharray': [2, 2]
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}