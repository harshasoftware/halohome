/**
 * VastuWorkspace - Main workspace page for Halo Homes
 *
 * Features:
 * - 2D Google Maps (replaces 3D globe)
 * - Property/ZIP code search
 * - Vastu compass overlay
 * - Right panel with Vastu analysis
 * - Property boundary drawing
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth-context';
import { useVastuStore } from '@/stores/vastuStore';
import { toast } from 'sonner';

// Components
import VastuMap, { type VastuMapMethods } from '@/features/globe/components/VastuMap';
import PropertySearchBar from '@/features/globe/components/PropertySearchBar';
import VastuParcelScout from '@/features/globe/components/VastuParcelScout';
import VastuCompassOverlay from '@/components/VastuCompassOverlay';
import VastuPanelContent from '@/features/globe/components/panels/VastuPanelContent';
import GoogleMapsWrapper from '@/contexts/GoogleMapsWrapper';

// UI Components
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Compass,
  MapPin,
  PenTool,
  Trash2,
  History,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  X,
  Scan,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const VastuWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const mapRef = useRef<VastuMapMethods>(null);

  // Auth
  const { user } = useAuth();

  // Vastu store
  const {
    propertyCoordinates: center,
    setPropertyCoordinates: setCenter,
    propertyBoundary,
    setPropertyBoundary,
    propertyAddress,
    setPropertyAddress,
    vastuAnalysis: analysis,
    searchHistory,
    clearHistory,
    addToHistory,
  } = useVastuStore();

  // Local state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(!isMobile);
  const [activeTab, setActiveTab] = useState<'analysis' | 'scout' | 'history'>('analysis');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(5);
  const [autoSegmentLocation, setAutoSegmentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [zipCodeBounds, setZipCodeBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [zipCodeBoundary, setZipCodeBoundary] = useState<Array<{ lat: number; lng: number }> | null>(null); // Actual ZIP boundary polygon
  const [currentZipCode, setCurrentZipCode] = useState<string | null>(null);

  // Memoize the onZipCodeSearch callback to ensure it's stable
  const handleZipCodeSearch = useCallback(async (zipCode: string, zipBoundaryGeoJSON?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null) => {
    try {
      console.log(`[VastuWorkspace] onZipCodeSearch CALLBACK INVOKED:`, {
        zipCode,
        hasBoundary: !!zipBoundaryGeoJSON,
        boundaryType: zipBoundaryGeoJSON?.type,
      });
      setCurrentZipCode(zipCode);
      
      // If boundary is already available from the search, use it directly
      if (zipBoundaryGeoJSON) {
        console.log(`[VastuWorkspace] Using ZIP boundary from search result, type: ${zipBoundaryGeoJSON.type}`);
        // Convert GeoJSON to LatLng array for map display
        let coordinates: number[][];
        
        if (zipBoundaryGeoJSON.type === 'Polygon') {
          coordinates = zipBoundaryGeoJSON.coordinates[0];
        } else if (zipBoundaryGeoJSON.type === 'MultiPolygon') {
          coordinates = zipBoundaryGeoJSON.coordinates[0]?.[0] || [];
        } else {
          console.warn(`[VastuWorkspace] Unsupported GeoJSON type: ${zipBoundaryGeoJSON.type}`);
          return;
        }
        
        if (coordinates && coordinates.length > 2) {
          const boundary = coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
          console.log(`[VastuWorkspace] Converted ${boundary.length} coordinates from search result, setting state`);
          setZipCodeBoundary(boundary);
          // Get bounds for map fitting
          const { getZipBoundaryBounds } = await import('@/lib/zip-boundaries/zip-boundary-service');
          const bounds = await getZipBoundaryBounds(zipCode);
          if (bounds) {
            setZipCodeBounds(bounds);
            console.log(`[VastuWorkspace] Set ZIP bounds for map fitting`);
          }
        } else {
          console.warn(`[VastuWorkspace] Invalid coordinates, length: ${coordinates?.length}`);
        }
      } else {
        console.log(`[VastuWorkspace] No boundary provided, will fetch via useEffect`);
      }
    } catch (error) {
      console.error(`[VastuWorkspace] Error in onZipCodeSearch callback:`, error);
    }
  }, []);

  // Fetch ZIP boundary polygon whenever currentZipCode changes
  useEffect(() => {
    console.log(`[VastuWorkspace] useEffect triggered, currentZipCode:`, currentZipCode);
    
    if (!currentZipCode || currentZipCode.length !== 5) {
      console.log(`[VastuWorkspace] Invalid ZIP code, clearing boundary`);
      setZipCodeBoundary(null);
      setZipCodeBounds(null);
      return;
    }

    // Fetch ZIP boundary polygon from Supabase
    (async () => {
      try {
        const { getZipBoundaryGeoJSON, getZipBoundaryBounds } = await import('@/lib/zip-boundaries/zip-boundary-service');
        console.log(`[VastuWorkspace] useEffect: Fetching ZIP boundary for: ${currentZipCode}`);
        
        const zipBoundaryGeoJSON = await getZipBoundaryGeoJSON(currentZipCode);
        const bounds = await getZipBoundaryBounds(currentZipCode);
        
        console.log(`[VastuWorkspace] useEffect: ZIP boundary fetch result:`, {
          hasGeoJSON: !!zipBoundaryGeoJSON,
          geoJSONType: zipBoundaryGeoJSON?.type,
          hasBounds: !!bounds,
        });
        
        if (zipBoundaryGeoJSON && bounds) {
          // Convert GeoJSON to LatLng array for map display
          let coordinates: number[][];
          
          if (zipBoundaryGeoJSON.type === 'Polygon') {
            coordinates = zipBoundaryGeoJSON.coordinates[0];
          } else if (zipBoundaryGeoJSON.type === 'MultiPolygon') {
            coordinates = zipBoundaryGeoJSON.coordinates[0]?.[0] || [];
          } else {
            console.warn(`[VastuWorkspace] Unsupported GeoJSON type: ${zipBoundaryGeoJSON.type}`);
            return;
          }
          
          if (coordinates && coordinates.length > 2) {
            const boundary = coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
            console.log(`[VastuWorkspace] useEffect: Converted ${boundary.length} coordinates to boundary polygon, setting state`);
            setZipCodeBoundary(boundary);
            setZipCodeBounds(bounds);
            console.log(`[VastuWorkspace] useEffect: State updated with boundary polygon`);
          } else {
            console.warn(`[VastuWorkspace] Invalid coordinates array, length:`, coordinates?.length);
          }
        } else {
          console.warn(`[VastuWorkspace] ZIP boundary not found in database for: ${currentZipCode}`);
          setZipCodeBoundary(null);
          setZipCodeBounds(null);
        }
      } catch (error) {
        console.error('[VastuWorkspace] Failed to fetch ZIP boundary:', error);
        setZipCodeBoundary(null);
        setZipCodeBounds(null);
      }
    })();
  }, [currentZipCode]);
  const [isScoutLoading, setIsScoutLoading] = useState(false);
  const [autoSearchZipCode, setAutoSearchZipCode] = useState<string | null>(null);
  const [scoutSelectedBoundary, setScoutSelectedBoundary] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const [scoutSelectedMarker, setScoutSelectedMarker] = useState<{ lat: number; lng: number; name: string; score?: number } | null>(null);
  const [scoutParcels, setScoutParcels] = useState<Array<{
    id: string;
    coordinates: Array<{ lat: number; lng: number }>;
    vastuScore?: number;
    type?: 'plot' | 'building';
  }>>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  // Handle URL params for initial location
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const address = searchParams.get('address');

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setCenter({ lat: latNum, lng: lngNum });
        setTimeout(() => {
          mapRef.current?.panTo(latNum, lngNum, 18);
        }, 500);
      }
    }
  }, [searchParams, setCenter]);

  // Handle property/ZIP search result
  const handleLocationSelect = useCallback((lat: number, lng: number, address: string, isZipCode: boolean) => {
    console.log(`[VastuWorkspace] handleLocationSelect called:`, { lat, lng, address, isZipCode });
    setCenter({ lat, lng });
    setPropertyAddress(address); // Store the address for Vastu analysis

    // Zoom level: 18-20 for property segmentation/scouting, 18 for addresses
    // ZIP codes need 18-20 zoom to enable SAM v2 property boundary detection
    const targetZoom = isZipCode ? 19 : 18;
    setMapZoom(targetZoom);

    // Pan map to location
    mapRef.current?.panTo(lat, lng, targetZoom);

    // If ZIP code, switch to scout tab and show bounding box
    if (isZipCode) {
      console.log(`[VastuWorkspace] Processing ZIP code: ${address}`);
      setActiveTab('scout');
      if (isMobile) {
        setMobileSheetOpen(true);
      }
      // Clear any prior scout selection overlay
      setScoutSelectedBoundary(null);
      setScoutSelectedMarker(null);
      // Clear auto-segment for ZIP code searches
      setAutoSegmentLocation(null);
      // Clear property boundary since we're in scout mode
      setPropertyBoundary([]);

      // Fetch actual ZIP boundary from Supabase PostGIS
      console.log(`[VastuWorkspace] Setting currentZipCode to: ${address}`);
      setCurrentZipCode(address);
      setZipCodeBoundary(null); // Clear previous boundary
      setZipCodeBounds(null); // Clear previous bounds
      
      // Try to fetch actual ZIP boundary (async, don't await - let it update state when ready)
      (async () => {
        try {
          const { getZipBoundaryGeoJSON, getZipBoundaryBounds } = await import('@/lib/zip-boundaries/zip-boundary-service');
          console.log(`[VastuWorkspace] Fetching ZIP boundary for: ${address}`);
          
          const zipBoundaryGeoJSON = await getZipBoundaryGeoJSON(address);
          const bounds = await getZipBoundaryBounds(address);
          
          console.log(`[VastuWorkspace] ZIP boundary fetch result:`, {
            hasGeoJSON: !!zipBoundaryGeoJSON,
            geoJSONType: zipBoundaryGeoJSON?.type,
            hasBounds: !!bounds,
          });
          
          if (zipBoundaryGeoJSON && bounds) {
            // Convert GeoJSON to LatLng array for map display
            let coordinates: number[][];
            
            if (zipBoundaryGeoJSON.type === 'Polygon') {
              // Polygon: coordinates[0] is the outer ring
              coordinates = zipBoundaryGeoJSON.coordinates[0];
            } else if (zipBoundaryGeoJSON.type === 'MultiPolygon') {
              // MultiPolygon: coordinates[0][0] is the first polygon's outer ring
              coordinates = zipBoundaryGeoJSON.coordinates[0]?.[0] || [];
            } else {
              console.warn(`[VastuWorkspace] Unsupported GeoJSON type: ${zipBoundaryGeoJSON.type}`);
              throw new Error(`Unsupported geometry type: ${zipBoundaryGeoJSON.type}`);
            }
            
            if (coordinates && coordinates.length > 2) {
              const boundary = coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
              console.log(`[VastuWorkspace] Converted ${boundary.length} coordinates to boundary polygon`);
              setZipCodeBoundary(boundary);
              setZipCodeBounds(bounds);
            } else {
              console.warn(`[VastuWorkspace] Invalid coordinates array:`, coordinates);
              throw new Error('Invalid coordinates array');
            }
          } else {
            console.warn(`[VastuWorkspace] ZIP boundary not found in database for: ${address}`);
            // Fallback to approximate bounding box if ZIP boundary not found
            const radiusKm = 3;
            const latDegPerKm = 1 / 111.32;
            const lngDegPerKm = 1 / (111.32 * Math.cos((lat * Math.PI) / 180));
            setZipCodeBounds({
              north: lat + radiusKm * latDegPerKm,
              south: lat - radiusKm * latDegPerKm,
              east: lng + radiusKm * lngDegPerKm,
              west: lng - radiusKm * lngDegPerKm,
            });
            setZipCodeBoundary(null); // Ensure boundary is cleared
          }
        } catch (error) {
          console.error('[VastuWorkspace] Failed to fetch ZIP boundary, using approximate bounds:', error);
          // Fallback to approximate bounding box
          const radiusKm = 3;
          const latDegPerKm = 1 / 111.32;
          const lngDegPerKm = 1 / (111.32 * Math.cos((lat * Math.PI) / 180));
          setZipCodeBounds({
            north: lat + radiusKm * latDegPerKm,
            south: lat - radiusKm * latDegPerKm,
            east: lng + radiusKm * lngDegPerKm,
            west: lng - radiusKm * lngDegPerKm,
          });
          setZipCodeBoundary(null); // Ensure boundary is cleared
        }
      })();
    } else {
      // For property addresses, clear existing boundary and trigger auto-segmentation
      setPropertyBoundary([]);
      // Clear any prior scout selection overlay
      setScoutSelectedBoundary(null);
      setScoutSelectedMarker(null);
      setAutoSegmentLocation({ lat, lng });
      // Clear ZIP code bounds since we're analyzing a single property
      setZipCodeBounds(null);
      setZipCodeBoundary(null);
      setCurrentZipCode(null);

      // Switch to analysis tab for single property
      setActiveTab('analysis');
      if (isMobile) {
        setMobileSheetOpen(true);
      }
    }

    toast.success(isZipCode ? `Searching ZIP: ${address}` : `Analyzing: ${address}`);
  }, [setCenter, setPropertyAddress, setPropertyBoundary, isMobile]);

  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (isDrawingMode) return; // Let drawing manager handle clicks

    // Optional: Set as analysis point
    // setCenter({ lat, lng });
  }, [isDrawingMode]);

  // Handle boundary complete (manual drawing overrides auto-segmentation)
  const handleBoundaryComplete = useCallback((path: google.maps.LatLng[]) => {
    setIsDrawingMode(false);

    // Clear auto-segment location since user drew manually
    setAutoSegmentLocation(null);

    // Switch to analysis tab
    setActiveTab('analysis');
    if (isMobile) {
      setMobileSheetOpen(true);
    }

    toast.success('Property boundary saved! Analyzing Vastu...');
  }, [isMobile]);

  // Clear boundary
  const handleClearBoundary = useCallback(() => {
    setPropertyBoundary([]);
    setScoutSelectedBoundary(null);
    setScoutSelectedMarker(null);
    toast.info('Property boundary cleared');
  }, [setPropertyBoundary]);

  // Handle parcel select from scout
  // Note: onCenterMap callback handles the panTo, so we just set the marker and boundary here
  const handleParcelSelect = useCallback((parcel: any) => {
    // Calculate centroid from boundary if available (more accurate than pre-calculated)
    let lat: number | undefined;
    let lng: number | undefined;
    
    if (Array.isArray(parcel?.boundary) && parcel.boundary.length > 2) {
      // Calculate centroid from boundary polygon for accuracy
      const sumLat = parcel.boundary.reduce((sum: number, c: { lat: number; lng: number }) => sum + c.lat, 0);
      const sumLng = parcel.boundary.reduce((sum: number, c: { lat: number; lng: number }) => sum + c.lng, 0);
      lat = sumLat / parcel.boundary.length;
      lng = sumLng / parcel.boundary.length;
      setScoutSelectedBoundary(parcel.boundary);
    } else if (parcel?.coordinates?.lat && parcel?.coordinates?.lng) {
      // Fallback to pre-calculated coordinates if boundary not available
      lat = parcel.coordinates.lat;
      lng = parcel.coordinates.lng;
    }
    
    if (typeof lat === 'number' && typeof lng === 'number') {
      // Set marker position (onCenterMap callback will handle panTo)
      setScoutSelectedMarker({
        lat,
        lng,
        name: parcel.address || 'Selected home',
        score: parcel.vastuScore,
      });
    }
  }, []);

  // Handle scout button click on ZIP code bounding box
  const handleScoutClick = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    // Trigger auto-search in VastuParcelScout using the current ZIP code
    if (currentZipCode) {
      setAutoSearchZipCode(currentZipCode);
      // Switch to scout tab to show results
      setActiveTab('scout');
      if (isMobile) {
        setMobileSheetOpen(true);
      }
    }
  }, [currentZipCode, isMobile]);

  // Callbacks for VastuParcelScout auto-search
  const handleScoutSearchStart = useCallback(() => {
    setIsScoutLoading(true);
    setScoutSelectedBoundary(null);
    setScoutSelectedMarker(null);
  }, []);

  const handleScoutSearchComplete = useCallback((success: boolean, count: number) => {
    setIsScoutLoading(false);
    // Clear the auto-search trigger after completion
    setAutoSearchZipCode(null);
  }, []);

  // When autoSearchZipCode is set, also set currentZipCode to trigger boundary fetch
  useEffect(() => {
    if (autoSearchZipCode && autoSearchZipCode.length === 5) {
      console.log(`[VastuWorkspace] autoSearchZipCode changed, setting currentZipCode: ${autoSearchZipCode}`);
      setCurrentZipCode(autoSearchZipCode);
    }
  }, [autoSearchZipCode]);

  // Render right panel content
  const renderPanelContent = () => (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as any)}
      className="h-full flex flex-col min-h-0"
    >
      <TabsList className="grid w-full grid-cols-3 shrink-0">
        <TabsTrigger value="analysis" className="text-xs">
          <Compass className="h-3 w-3 mr-1" />
          Analysis
        </TabsTrigger>
        <TabsTrigger value="scout" className="text-xs">
          <Search className="h-3 w-3 mr-1" />
          Scout
        </TabsTrigger>
        <TabsTrigger value="history" className="text-xs">
          <History className="h-3 w-3 mr-1" />
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analysis" className="flex-1 min-h-0 overflow-hidden mt-2">
        <VastuPanelContent />
      </TabsContent>

      <TabsContent value="scout" className="flex-1 min-h-0 overflow-hidden mt-2">
        <VastuParcelScout
          onParcelSelect={(parcel) => {
            handleParcelSelect(parcel);
            setSelectedParcelId(parcel.id);
          }}
          onCenterMap={(lat, lng) => {
            console.log('[VastuWorkspace] onCenterMap callback called with:', { lat, lng });
            // Use requestAnimationFrame + setTimeout to ensure this panTo happens after any other map operations
            // This prevents the center prop from overriding our panTo
            requestAnimationFrame(() => {
              setTimeout(() => {
                console.log('[VastuWorkspace] Executing panTo with:', { lat, lng });
                mapRef.current?.panTo(lat, lng, 19); // Zoom 19 for property detail
              }, 100);
            });
          }}
          autoSearchZipCode={autoSearchZipCode}
          onSearchStart={() => {
            handleScoutSearchStart();
            // When search starts, ensure currentZipCode is set if we have autoSearchZipCode
            if (autoSearchZipCode && autoSearchZipCode.length === 5) {
              console.log(`[VastuWorkspace] Search starting, setting currentZipCode: ${autoSearchZipCode}`);
              setCurrentZipCode(autoSearchZipCode);
            }
          }}
          onSearchComplete={handleScoutSearchComplete}
          onLoadingChange={setIsScoutLoading}
          onParcelsChange={(parcels) => {
            setScoutParcels(parcels);
          }}
          onParcelSelected={setSelectedParcelId}
          onZipCodeSearch={handleZipCodeSearch}
        />
      </TabsContent>

      <TabsContent value="history" className="flex-1 min-h-0 overflow-y-auto mt-2 p-2">
        {searchHistory.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No search history yet</p>
            <p className="text-xs mt-1">Your recent searches will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">{searchHistory.length} searches</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="h-6 text-xs text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
            {searchHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  mapRef.current?.panTo(
                    item.coordinates.lat,
                    item.coordinates.lng,
                    item.isZipCode ? 13 : 18
                  );
                }}
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {item.isZipCode ? (
                    <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                  ) : (
                    <Home className="h-4 w-4 text-amber-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.address}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(item.timestamp).toLocaleDateString()}
                      {item.vastuScore !== undefined && (
                        <span className="ml-2 text-amber-600">Score: {item.vastuScore}</span>
                      )}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <GoogleMapsWrapper>
    <div className="h-screen w-screen flex flex-col bg-slate-900">
      {/* Top Toolbar */}
      <div className="h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-white/10 flex items-center px-4 gap-4 shrink-0 z-20">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-semibold text-amber-600"
        >
          <Compass className="h-5 w-5" />
          <span className="hidden sm:inline">HALO HOME</span>
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg">
          <PropertySearchBar
            onLocationSelect={handleLocationSelect}
            isMobile={isMobile}
          />
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Scout Button - Only show when ZIP code is selected */}
          {currentZipCode && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (currentZipCode) {
                  setAutoSearchZipCode(currentZipCode);
                  setActiveTab('scout');
                  if (isMobile) {
                    setMobileSheetOpen(true);
                  }
                }
              }}
              disabled={isScoutLoading}
              className="bg-[#d4a5a5] hover:bg-[#c49595] text-white"
            >
              {isScoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline ml-1">Scanning...</span>
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Scout Properties</span>
                  <Sparkles className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          )}

          {/* Draw Mode Toggle */}
          <Button
            variant={isDrawingMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={cn(
              isDrawingMode && 'bg-amber-500 hover:bg-amber-600'
            )}
          >
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">
              {isDrawingMode ? 'Drawing...' : 'Draw'}
            </span>
          </Button>

          {/* Clear Boundary */}
          {propertyBoundary.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearBoundary}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Clear</span>
            </Button>
          )}

          {/* Panel Toggle (desktop) */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPanelOpen(!isPanelOpen)}
            >
              {isPanelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}

          {/* Mobile Menu */}
          {isMobile && (
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Vastu Analysis</SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-60px)]">
                  {renderPanelContent()}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {isMobile ? (
          // Mobile: Full map
          <VastuMap
            ref={mapRef}
            center={center || undefined}
            zoom={mapZoom}
            isDrawingMode={isDrawingMode}
            onMapClick={handleMapClick}
            onBoundaryComplete={handleBoundaryComplete}
            propertyBoundary={propertyBoundary}
            propertyAddress={propertyAddress}
            showCompass={true}
            showEntranceMarker={activeTab === 'analysis'}
            autoSegmentLocation={autoSegmentLocation}
            onAutoSegmentComplete={(success) => {
              if (success) {
                toast.success('Property boundary detected!');
              }
              // Clear the trigger after processing
              setAutoSegmentLocation(null);
            }}
                zipCodeBounds={zipCodeBounds}
                zipCodeBoundary={zipCodeBoundary}
                currentZipCode={currentZipCode}
            onScoutClick={handleScoutClick}
            isScoutLoading={isScoutLoading}
            scoutSelectedBoundary={scoutSelectedBoundary}
            scoutSelectedMarker={scoutSelectedMarker}
            parcels={scoutParcels}
            selectedParcelId={selectedParcelId}
          />
        ) : (
          // Desktop: Resizable panels
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Map Panel */}
            <ResizablePanel id="vastu-map-panel" order={1} defaultSize={isPanelOpen ? 70 : 100} minSize={50}>
              <VastuMap
                ref={mapRef}
                center={center || undefined}
                zoom={mapZoom}
                isDrawingMode={isDrawingMode}
                onMapClick={handleMapClick}
                onBoundaryComplete={handleBoundaryComplete}
                propertyBoundary={propertyBoundary}
                propertyAddress={propertyAddress}
                showCompass={true}
                showEntranceMarker={activeTab === 'analysis'}
                autoSegmentLocation={autoSegmentLocation}
                onAutoSegmentComplete={(success) => {
                  if (success) {
                    toast.success('Property boundary detected!');
                  }
                  // Clear the trigger after processing
                  setAutoSegmentLocation(null);
                }}
                zipCodeBounds={zipCodeBounds}
                zipCodeBoundary={zipCodeBoundary}
                currentZipCode={currentZipCode}
                onScoutClick={handleScoutClick}
                isScoutLoading={isScoutLoading}
                scoutSelectedBoundary={scoutSelectedBoundary}
                scoutSelectedMarker={scoutSelectedMarker}
                parcels={scoutParcels}
                selectedParcelId={selectedParcelId}
              />
            </ResizablePanel>

            {/* Right Panel */}
            {isPanelOpen && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel id="vastu-right-panel" order={2} defaultSize={30} minSize={20} maxSize={50}>
                  <div className="h-full bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-white/10">
                    {renderPanelContent()}
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}

        {/* Drawing Mode Indicator */}
        {isDrawingMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              <span className="text-sm font-medium">Click to draw property boundary</span>
              <button
                onClick={() => setIsDrawingMode(false)}
                className="ml-2 hover:bg-white/20 rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Compass Overlay (larger, for when not on map) */}
        {analysis && !isMobile && (
          <div className="absolute bottom-4 left-4 z-10">
            <VastuCompassOverlay
              size={120}
              rotation={analysis.orientation}
              showLabels={true}
              highlightDirection={analysis.entrance?.direction || null}
            />
          </div>
        )}
      </div>
    </div>
    </GoogleMapsWrapper>
  );
};

export default VastuWorkspace;
