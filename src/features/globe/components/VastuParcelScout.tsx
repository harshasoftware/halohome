/**
 * VastuParcelScout - Component for parcel-level Vastu analysis
 *
 * Uses building footprint extraction from Google Maps imagery
 * combined with edge detection to identify property boundaries.
 * No longer requires Regrid API.
 */

import React, { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  MapPin,
  Home,
  Compass,
  Star,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Scan,
  Telescope,
  Sparkles,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { VastuDirection } from '@/stores/vastuStore';
import { useBuildingFootprints, type ParcelWithVastu } from '../hooks/useBuildingFootprints';

// Parcel data structure (now comes from real extraction)
interface Parcel {
  id: string;
  address?: string;
  coordinates: { lat: number; lng: number };
  /** Full parcel boundary polygon (lat/lngs) for drawing/highlighting on map */
  boundary?: Array<{ lat: number; lng: number }>;
  vastuScore: number;
  orientation?: number;
  entranceDirection: VastuDirection;
  entranceBearingDegrees?: number | null;
  shape: 'square' | 'rectangle' | 'irregular' | 'L-shaped' | 'triangular';
  size: number; // sq meters (converted from area)
  highlights: string[];
  issues: string[];
  confidence?: number;
}

const bearingTo16Wind = (bearingDegrees: number): string => {
  const normalized = ((bearingDegrees % 360) + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const idx = Math.round(normalized / 22.5) % 16;
  return directions[idx];
};

const formatEntranceDirection = (parcel: Parcel): string => {
  if (typeof parcel.entranceBearingDegrees === 'number' && Number.isFinite(parcel.entranceBearingDegrees)) {
    return bearingTo16Wind(parcel.entranceBearingDegrees);
  }
  return parcel.entranceDirection;
};

const formatBearingDegrees = (bearingDegrees: number): string => {
  const normalized = ((bearingDegrees % 360) + 360) % 360;
  return `${Math.round(normalized)}°`;
};

// Convert ParcelWithVastu to Parcel for display
function convertToDisplayParcel(parcel: ParcelWithVastu): Parcel {
  // Convert area from sq meters to sq ft for display
  const sizeInSqFt = Math.round(parcel.area * 10.764);

  // Ensure coordinates is an array (polygon boundary)
  // In BuildingFootprint, coordinates is the polygon array, not a point
  const boundary = Array.isArray(parcel.coordinates) && parcel.coordinates.length > 2
    ? parcel.coordinates
    : undefined;

  return {
    id: parcel.id,
    // Prefer Regrid-provided headline address when available; reverse-geocode only as fallback.
    address: parcel.address || undefined,
    coordinates: parcel.centroid, // Centroid is a single point {lat, lng}
    boundary, // Boundary is the polygon array [{lat, lng}, ...]
    vastuScore: parcel.vastuScore,
    orientation: undefined,
    entranceDirection: parcel.entranceDirection,
    entranceBearingDegrees: parcel.entranceBearingDegrees ?? null,
    shape: parcel.shape,
    size: sizeInSqFt,
    highlights: parcel.highlights,
    issues: parcel.issues,
    confidence: parcel.confidence,
  };
}

// Score color helper
const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreBg = (score: number) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

// Parcel Card Component
const ParcelCard = memo(({
  parcel,
  onSelect,
  isSelected,
}: {
  parcel: Parcel;
  onSelect: (parcel: Parcel) => void;
  isSelected: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'p-3 rounded-lg border transition-all cursor-pointer',
          isSelected
            ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15'
            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
        )}
        onClick={() => onSelect(parcel)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {parcel.address || 'Fetching address…'}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                {parcel.shape}
              </span>
              <span className="flex items-center gap-1">
                <Compass className="h-3 w-3" />
                <span>{formatEntranceDirection(parcel)}</span>
                {typeof parcel.entranceBearingDegrees === 'number' && Number.isFinite(parcel.entranceBearingDegrees) && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                    · {formatBearingDegrees(parcel.entranceBearingDegrees)}
                  </span>
                )}
              </span>
              <span>{parcel.size.toLocaleString()} sq ft</span>
              {parcel.confidence !== undefined && (
                <span className="text-slate-400">
                  {Math.round(parcel.confidence * 100)}% conf
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('text-lg font-bold', getScoreColor(parcel.vastuScore))}>
              {parcel.vastuScore}
            </div>
            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          {parcel.highlights.length > 0 && (
            <div className="space-y-1">
              {parcel.highlights.map((highlight, i) => (
                <p key={i} className="text-xs text-green-600 flex items-start gap-1">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {highlight}
                </p>
              ))}
            </div>
          )}
          {parcel.issues.length > 0 && (
            <div className="space-y-1">
              {parcel.issues.map((issue, i) => (
                <p key={i} className="text-xs text-orange-600 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {issue}
                </p>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7 mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(parcel);
            }}
          >
            <MapPin className="h-3 w-3 mr-1" />
            View on Map
          </Button>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});
ParcelCard.displayName = 'ParcelCard';

// Main Scout Component
interface VastuParcelScoutProps {
  onParcelSelect?: (parcel: Parcel) => void;
  onCenterMap?: (lat: number, lng: number) => void;
  /** Prefill the ZIP input (does not auto-run scout). */
  prefillZipCode?: string | null;
  /** Auto-search this ZIP code when set */
  autoSearchZipCode?: string | null;
  /** Callback when search starts */
  onSearchStart?: () => void;
  /** Callback when search completes */
  onSearchComplete?: (success: boolean, count: number) => void;
  /** Callback when loading state changes (for zoom locking) */
  onLoadingChange?: (isLoading: boolean) => void;
  /** Callback when parcels are updated (for map visualization) */
  onParcelsChange?: (parcels: Array<{
    id: string;
    coordinates: Array<{ lat: number; lng: number }>;
    vastuScore?: number;
    type?: 'plot' | 'building';
  }>) => void;
  /** Callback when a parcel is selected (for map highlighting) */
  onParcelSelected?: (parcelId: string | null) => void;
  /** Callback when a ZIP code search is performed (for boundary display) */
  onZipCodeSearch?: (zipCode: string, zipBoundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null) => void;
}

const VastuParcelScout: React.FC<VastuParcelScoutProps> = ({
  onParcelSelect,
  onCenterMap,
  prefillZipCode,
  autoSearchZipCode,
  onSearchStart,
  onSearchComplete,
  onLoadingChange,
  onParcelsChange,
  onParcelSelected,
  onZipCodeSearch,
}) => {
  // Store callback in ref to avoid dependency issues
  useEffect(() => {
    onZipCodeSearchRef.current = onZipCodeSearch;
    console.log(`[VastuParcelScout] Component mounted/updated, onZipCodeSearch provided:`, !!onZipCodeSearch);
  }, [onZipCodeSearch]);
  const [zipCode, setZipCode] = useState('');
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'good' | 'excellent'>('all');
  const lastAutoSearchRef = useRef<string | null>(null);
  const lastBoundaryNotificationRef = useRef<string | null>(null); // Track last ZIP code we notified about
  const onZipCodeSearchRef = useRef(onZipCodeSearch); // Store callback in ref to avoid dependency issues
  // Deduplicate onSearchComplete callbacks (e.g. StrictMode/dev double-invocation)
  const lastSearchCompleteKeyRef = useRef<string | null>(null);

  // Prefill ZIP input without triggering a scout.
  useEffect(() => {
    if (!prefillZipCode || prefillZipCode.length < 5) return;
    if (zipCode === prefillZipCode) return;
    setZipCode(prefillZipCode);
    setSelectedParcelId(null);
  }, [prefillZipCode, zipCode]);

  // Use the building footprints hook
  const {
    parcels: rawParcels,
    isLoading,
    error,
    progressPhase,
    progressPercent,
    zipBoundary,
    searchByZipCode,
    stats,
    clear,
  } = useBuildingFootprints({
    extractPlots: true,
    extractBuildings: true,
    maxResults: 30,
    minConfidence: 0.3,
  });

  // Convert to display format
  // Show plots (parcels) in the list; buildings are still forwarded to the map overlay via onParcelsChange.
  const parcels: Parcel[] = rawParcels.filter((p) => p.type === 'plot').map(convertToDisplayParcel);

  // Plot-only stats for the list UI (raw hook stats include buildings too)
  const plotStats = useMemo(() => {
    const total = parcels.length;
    const excellent = parcels.filter((p) => p.vastuScore >= 80).length;
    const good = parcels.filter((p) => p.vastuScore >= 60 && p.vastuScore < 80).length;
    const sum = parcels.reduce((acc, p) => acc + p.vastuScore, 0);
    const avgScore = total > 0 ? Math.round(sum / total) : 0;

    return {
      total,
      excellent,
      good,
      avgScore,
      processingTimeMs: stats.processingTimeMs,
    };
  }, [parcels, stats.processingTimeMs]);

  // Reverse-geocode addresses for the list (Google Maps Geocoder), cached by rounded lat/lng.
  const addressCacheRef = useRef(new Map<string, string>());
  const inFlightRef = useRef(new Set<string>());
  const [addressById, setAddressById] = useState<Record<string, string>>({});

  const listParcelsWithAddress = useMemo(() => {
    return parcels.map((p) => ({
      ...p,
      address: p.address || addressById[p.id] || undefined,
    }));
  }, [parcels, addressById]);

  useEffect(() => {
    // Only run when Google Maps JS API is available
    if (typeof google === 'undefined' || !google.maps?.Geocoder) return;
    if (listParcelsWithAddress.length === 0) return;

    const geocoder = new google.maps.Geocoder();
    const toKey = (lat: number, lng: number) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

    const targets = listParcelsWithAddress
      .filter((p) => !p.address)
      .map((p) => ({
        id: p.id,
        lat: p.coordinates.lat,
        lng: p.coordinates.lng,
      }))
      .filter((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng));

    if (targets.length === 0) return;

    let cancelled = false;

    const run = async () => {
      const maxConcurrent = 4;
      let idx = 0;

      const worker = async () => {
        while (!cancelled && idx < targets.length) {
          const t = targets[idx++];
          const coordKey = toKey(t.lat, t.lng);

          // If already cached, just apply
          const cached = addressCacheRef.current.get(coordKey);
          if (cached) {
            if (!cancelled) {
              setAddressById((prev) => (prev[t.id] ? prev : { ...prev, [t.id]: cached }));
            }
            continue;
          }

          // Avoid duplicate in-flight for same coordinate
          if (inFlightRef.current.has(coordKey)) continue;
          inFlightRef.current.add(coordKey);

          try {
            const { results, status } = await new Promise<{
              results: google.maps.GeocoderResult[];
              status: google.maps.GeocoderStatus;
            }>((resolve) => {
              geocoder.geocode({ location: { lat: t.lat, lng: t.lng } }, (results, status) => {
                resolve({ results: results ?? [], status });
              });
            });

            if (cancelled) return;

            if (status === 'OK' && results[0]?.formatted_address) {
              const addr = results[0].formatted_address;
              addressCacheRef.current.set(coordKey, addr);
              setAddressById((prev) => ({ ...prev, [t.id]: addr }));
            }
          } catch {
            // Ignore: keep "Fetching address…" fallback
          } finally {
            inFlightRef.current.delete(coordKey);
          }

          // Light throttling to avoid hitting rate limits hard
          await new Promise((r) => setTimeout(r, 120));
        }
      };

      await Promise.all(Array.from({ length: maxConcurrent }, () => worker()));
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [listParcelsWithAddress]);

  // Notify parent when parcels change (for map visualization)
  useEffect(() => {
    if (onParcelsChange) {
      const mapParcels = rawParcels.map((p) => ({
        id: p.id,
        coordinates: p.coordinates,
        vastuScore: p.vastuScore,
        type: p.type,
        centroid: p.centroid,
        entrancePoint: (p as any).entrancePoint ?? null,
        entranceBearingDegrees: (p as any).entranceBearingDegrees ?? null,
        // Preserve Regrid data if available
        address: (p as any).address,
        regridId: (p as any).regridId,
        owner: (p as any).owner,
      }));
      onParcelsChange(mapParcels);
    }
  }, [rawParcels, onParcelsChange]);

  const handleSearch = useCallback(async () => {
    if (!zipCode || zipCode.length < 5) return;
    setSelectedParcelId(null);
    lastSearchCompleteKeyRef.current = null;
    onSearchStart?.();
    // Notify parent that a ZIP code search is starting (for boundary display)
    console.log(`[VastuParcelScout] Manual search starting for ZIP: ${zipCode}`);
    if (onZipCodeSearch) {
      console.log(`[VastuParcelScout] Calling onZipCodeSearch callback immediately`);
      onZipCodeSearch(zipCode, undefined); // Will be updated when zipBoundary is available
    }
    try {
      await searchByZipCode(zipCode);
    } catch (err) {
      console.error(`[VastuParcelScout] Search failed:`, err);
    }
  }, [zipCode, searchByZipCode, onZipCodeSearch, onSearchStart]);

  const handleParcelSelect = useCallback((parcel: Parcel) => {
    setSelectedParcelId(parcel.id);
    onParcelSelect?.(parcel);
    
    // Calculate centroid from boundary if available (more accurate than pre-calculated)
    let lat: number;
    let lng: number;
    if (Array.isArray(parcel.boundary) && parcel.boundary.length > 2) {
      // Calculate centroid from boundary polygon for accuracy
      const sumLat = parcel.boundary.reduce((sum, c) => sum + c.lat, 0);
      const sumLng = parcel.boundary.reduce((sum, c) => sum + c.lng, 0);
      lat = sumLat / parcel.boundary.length;
      lng = sumLng / parcel.boundary.length;
    } else {
      // Fallback to pre-calculated coordinates if boundary not available
      lat = parcel.coordinates.lat;
      lng = parcel.coordinates.lng;
    }
    
    // Center map on parcel centroid
    if (onCenterMap) {
      onCenterMap(lat, lng);
    }
    onParcelSelected?.(parcel.id);
  }, [onParcelSelect, onCenterMap, onParcelSelected]);

  // Auto-search when autoSearchZipCode changes (triggered by Scout button on map)
  useEffect(() => {
    if (!autoSearchZipCode || autoSearchZipCode.length < 5) return;
    if (lastAutoSearchRef.current === autoSearchZipCode) return;

    lastAutoSearchRef.current = autoSearchZipCode;
    setZipCode(autoSearchZipCode);
    setSelectedParcelId(null);

    const performAutoSearch = async () => {
      onSearchStart?.();
      lastSearchCompleteKeyRef.current = null;
      // Notify parent that a ZIP code search is starting (for boundary display)
      console.log(`[VastuParcelScout] Auto-search starting for ZIP: ${autoSearchZipCode}`);
      if (onZipCodeSearch) {
        console.log(`[VastuParcelScout] Calling onZipCodeSearch callback immediately`);
        onZipCodeSearch(autoSearchZipCode, undefined); // Will be updated when zipBoundary is available
      }
      try {
        await searchByZipCode(autoSearchZipCode);
        // Check parcels count after search completes
      } catch (err) {
        onSearchComplete?.(false, 0);
      }
    };

    performAutoSearch();
  }, [autoSearchZipCode, searchByZipCode, onSearchStart, onSearchComplete, onZipCodeSearch]);

  // Notify parent when ZIP boundary becomes available (only once per ZIP code)
  useEffect(() => {
    // zipCode state is set before/when a ZIP search runs (manual or auto)
    const currentZip = zipCode;
    
    // Reset notification ref when ZIP code changes (before checking boundary)
    if (currentZip && currentZip !== lastBoundaryNotificationRef.current && lastBoundaryNotificationRef.current !== null) {
      console.log(`[VastuParcelScout] ZIP code changed from ${lastBoundaryNotificationRef.current} to ${currentZip}, resetting notification ref`);
      lastBoundaryNotificationRef.current = null;
    }
    
    if (zipBoundary && currentZip && currentZip.length === 5) {
      // Only notify if we haven't already notified for this ZIP code
      if (lastBoundaryNotificationRef.current === currentZip) {
        console.log(`[VastuParcelScout] Already notified parent for ZIP: ${currentZip}, skipping`);
        return;
      }
      
      console.log(`[VastuParcelScout] ZIP boundary available, notifying parent for ZIP: ${currentZip}`, {
        boundaryType: zipBoundary.type,
        hasCoordinates: !!zipBoundary.coordinates,
        coordinatesLength: zipBoundary.type === 'Polygon' ? zipBoundary.coordinates[0]?.length : zipBoundary.coordinates[0]?.[0]?.length,
      });
      
      const callback = onZipCodeSearchRef.current;
      if (callback) {
        console.log(`[VastuParcelScout] Calling onZipCodeSearch callback with boundary`);
        try {
          // Mark that we've notified BEFORE calling (to prevent duplicate calls during async operations)
          lastBoundaryNotificationRef.current = currentZip;
          callback(currentZip, zipBoundary);
        } catch (error) {
          console.error(`[VastuParcelScout] Error calling onZipCodeSearch:`, error);
          // Reset the ref on error so we can retry
          lastBoundaryNotificationRef.current = null;
        }
      } else {
        console.warn(`[VastuParcelScout] onZipCodeSearch callback not provided!`);
      }
    } else {
      console.log(`[VastuParcelScout] Conditions not met for boundary notification:`, {
        hasZipBoundary: !!zipBoundary,
        currentZip,
        zipLength: currentZip?.length,
        lastNotified: lastBoundaryNotificationRef.current,
      });
    }
  }, [zipBoundary, zipCode]); // Removed onZipCodeSearch from deps, using ref instead

  // Notify parent of loading state changes for zoom locking
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // Pan map to first parcel when results are loaded (disabled - let user click to center)
  // This was causing zoom to ZIP code center instead of parcel centroid
  // useEffect(() => {
  //   if (parcels.length > 0 && !isLoading && onCenterMap) {
  //     const firstParcel = parcels[0];
  //     // Calculate centroid from boundary if available
  //     let lat: number | undefined;
  //     let lng: number | undefined;
  //     if (Array.isArray(firstParcel.boundary) && firstParcel.boundary.length > 2) {
  //       const sumLat = firstParcel.boundary.reduce((sum, c) => sum + c.lat, 0);
  //       const sumLng = firstParcel.boundary.reduce((sum, c) => sum + c.lng, 0);
  //       lat = sumLat / firstParcel.boundary.length;
  //       lng = sumLng / firstParcel.boundary.length;
  //     } else if (firstParcel.coordinates) {
  //       lat = firstParcel.coordinates.lat;
  //       lng = firstParcel.coordinates.lng;
  //     }
  //     if (lat !== undefined && lng !== undefined) {
  //       onCenterMap(lat, lng);
  //     }
  //   }
  // }, [parcels, isLoading, onCenterMap]);

  // Notify when search completes and log results
  useEffect(() => {
    if (isLoading) return;
    if (!zipCode || zipCode.length < 5) return;

    if (parcels.length > 0) {
      const key = `success:${zipCode}:${parcels.length}`;
      if (lastSearchCompleteKeyRef.current === key) return;
      lastSearchCompleteKeyRef.current = key;

      console.log(`[VastuParcelScout] Found ${parcels.length} parcels:`, parcels.map(p => ({
        id: p.id,
        score: p.vastuScore,
        shape: p.shape,
        coords: p.coordinates,
      })));
      onSearchComplete?.(true, parcels.length);
    } else if (parcels.length === 0) {
      const key = `empty:${zipCode}:0`;
      if (lastSearchCompleteKeyRef.current === key) return;
      lastSearchCompleteKeyRef.current = key;

      console.warn(`[VastuParcelScout] No parcels found for ZIP code: ${zipCode}`);
      onSearchComplete?.(false, 0);
    }
  }, [parcels, isLoading, zipCode, onSearchComplete]);

  const filteredParcels = listParcelsWithAddress.filter((parcel) => {
    if (filter === 'all') return true;
    if (filter === 'good') return parcel.vastuScore >= 60;
    if (filter === 'excellent') return parcel.vastuScore >= 80;
    return true;
  });

  return (
    <div className="flex flex-col min-h-0 h-full flex-1">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex gap-2">
          <Input
            placeholder="Enter ZIP code..."
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
            maxLength={10}
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || zipCode.length < 5}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Telescope className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isLoading && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {progressPhase || 'Analyzing parcels...'}
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {error && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {parcels.length > 0 && (
        <>
          {/* Stats Bar */}
          <div className="p-3 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {plotStats.total} parcels • Avg: <span className={getScoreColor(plotStats.avgScore)}>{plotStats.avgScore}</span>
                {plotStats.processingTimeMs > 0 && (
                  <span className="text-slate-400 ml-1">
                    ({(plotStats.processingTimeMs / 1000).toFixed(1)}s)
                  </span>
                )}
              </span>
              <div className="flex gap-1">
                <span className="text-green-600">{plotStats.excellent} excellent</span>
                <span className="text-slate-400">•</span>
                <span className="text-yellow-600">{plotStats.good} good</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-200 dark:border-white/10 px-3">
            {(['all', 'good', 'excellent'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors capitalize',
                  filter === f
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {f} ({f === 'all' ? plotStats.total : f === 'good' ? plotStats.good + plotStats.excellent : plotStats.excellent})
              </button>
            ))}
          </div>

          {/* Parcel List */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-scroll-optimized p-3 space-y-2"
          >
            {filteredParcels.map((parcel) => (
              <ParcelCard
                key={parcel.id}
                parcel={parcel}
                onSelect={handleParcelSelect}
                isSelected={selectedParcelId === parcel.id}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && parcels.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Scan className="h-12 w-12 text-amber-500/60 dark:text-amber-400/60 mb-4" />
          <p className="text-lg font-medium">Vastu Parcel Scout</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Enter a ZIP code to scan and analyze properties for Vastu insights.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 max-w-xs">
            <Sparkles className="h-4 w-4 inline mr-1" />
            Scans parcels and buildings to generate Vastu scores.
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Analysis based on Vastu Shastra principles.
          <br />
        </p>
      </div>
    </div>
  );
};

export default memo(VastuParcelScout);
