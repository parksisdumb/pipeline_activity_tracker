import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Map, Layer, Source, NavigationControl, GeolocateControl, ScaleControl } from 'react-map-gl';
import { MapPin, Square } from 'lucide-react';
import Button from '../../../components/ui/Button';

// MapLibre GL JS styles - Updated import path for better compatibility
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

  // Handle map bounds change
  const handleMove = useCallback((evt) => {
    const { viewState: newViewState } = evt;
    setViewState(newViewState);
    
    // Get visible bounds and notify parent
    try {
      const map = mapRef?.current?.getMap?.();
      if (map && onBoundsChange && typeof map?.getBounds === 'function') {
        const bounds = map?.getBounds();
        if (bounds && typeof bounds?.toArray === 'function') {
          const boundsArray = bounds?.toArray();
          const bbox = [
            boundsArray?.[0]?.[0], // west
            boundsArray?.[0]?.[1], // south
            boundsArray?.[1]?.[0], // east
            boundsArray?.[1]?.[1]  // north
          ];
          onBoundsChange(bbox);
        }
      }
    } catch (error) {
      console.warn('Error getting map bounds:', error);
    }
  }, [onBoundsChange]);

  // Handle map clicks for drawing
  const handleMapClick = useCallback((event) => {
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
        
        // Close polygon with double-click or when clicking near start point
        if (newPoints?.length >= 3) {
          const firstPoint = newPoints?.[0];
          const distance = Math.sqrt(
            Math.pow(lng - firstPoint?.[0], 2) + Math.pow(lat - firstPoint?.[1], 2)
          );
          
          // Close polygon if clicked near start (within 0.001 degrees)
          if (distance < 0.001) {
            const closedPoints = [...newPoints, firstPoint];
            const polygonGeometry = {
              type: 'Polygon',
              coordinates: [closedPoints]
            };
            
            onDrawComplete?.(polygonGeometry, 'polygon');
            setDrawingMode(null);
            setDrawingPoints([]);
            setIsDrawing(false);
          }
        }
      }
    }
  }, [drawingMode, drawingPoints, isDrawing, onDrawComplete]);

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

  // Handle marker clicks
  const handleMarkerClick = useCallback((leadId) => {
    if (!drawingMode) {
      onLeadSelect?.(leadId);
    }
  }, [drawingMode, onLeadSelect]);

  // Create GeoJSON for lead markers
  const leadMarkersGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: leads?.filter(lead => lead?.coordinates)?.map(lead => ({
      type: 'Feature',
      properties: {
        id: lead?.id,
        name: lead?.name || 'Unnamed Lead',
        condition_label: lead?.condition_label || 'unknown',
        condition_score: lead?.condition_score || 1,
        status: lead?.status || 'new'
      },
      geometry: lead?.coordinates
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

  // Handle marker layer clicks
  const handleMarkerLayerClick = useCallback((event) => {
    const feature = event?.features?.[0];
    if (feature?.properties?.id && !drawingMode) {
      handleMarkerClick(feature?.properties?.id);
    }
  }, [drawingMode, handleMarkerClick]);

  return (
    <div className="relative w-full h-full">
      {/* Drawing Instructions */}
      {drawingMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg px-4 py-2">
          <div className="text-sm font-medium text-gray-900">
            {drawingMode === 'point' && 'Click on the map to drop a pin'}
            {drawingMode === 'polygon' && (
              <>
                {!isDrawing ? 'Click to start drawing area' : 'Click to add points, click near start to finish'}
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

      {/* Lead Count Badge */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg px-3 py-2">
        <div className="text-sm font-medium text-gray-900">
          {loading ? 'Loading...' : `${leads?.length || 0} roof leads`}
        </div>
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        mapLib={import('maplibre-gl')}
        interactiveLayerIds={['lead-markers']}
      >
        {/* Map Controls */}
        <NavigationControl position="top-left" />
        <GeolocateControl position="top-left" />
        <ScaleControl position="bottom-right" />

        {/* Lead Markers */}
        {leadMarkersGeoJSON?.features?.length > 0 && (
          <Source id="lead-markers" type="geojson" data={leadMarkersGeoJSON}>
            <Layer
              id="lead-markers"
              type="circle"
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
              onClick={handleMarkerLayerClick}
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