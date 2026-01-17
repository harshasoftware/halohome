/**
 * VastuParcelScout - Component for parcel-level Vastu analysis
 *
 * Uses building footprint extraction from Google Maps imagery
 * combined with edge detection to identify property boundaries.
 * No longer requires Regrid API.
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
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
  vastuScore: number;
  orientation?: number;
  entranceDirection: VastuDirection;
  shape: 'square' | 'rectangle' | 'irregular' | 'L-shaped' | 'triangular';
  size: number; // sq meters (converted from area)
  highlights: string[];
  issues: string[];
  confidence?: number;
}

// Convert ParcelWithVastu to Parcel for display
function convertToDisplayParcel(parcel: ParcelWithVastu): Parcel {
  // Convert area from sq meters to sq ft for display
  const sizeInSqFt = Math.round(parcel.area * 10.764);

  return {
    id: parcel.id,
    address: undefined, // Will be reverse geocoded if needed
    coordinates: parcel.centroid,
    vastuScore: parcel.vastuScore,
    orientation: undefined,
    entranceDirection: parcel.entranceDirection,
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
            ? 'border-[#d4a5a5] bg-[#d4a5a5]/10 dark:bg-[#d4a5a5]/10'
            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
        )}
        onClick={() => onSelect(parcel)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {parcel.address || `${parcel.coordinates.lat.toFixed(5)}, ${parcel.coordinates.lng.toFixed(5)}`}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                {parcel.shape}
              </span>
              <span className="flex items-center gap-1">
                <Compass className="h-3 w-3" />
                {parcel.entranceDirection}
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
  /** Auto-search this ZIP code when set */
  autoSearchZipCode?: string | null;
  /** Callback when search starts */
  onSearchStart?: () => void;
  /** Callback when search completes */
  onSearchComplete?: (success: boolean, count: number) => void;
}

const VastuParcelScout: React.FC<VastuParcelScoutProps> = ({
  onParcelSelect,
  onCenterMap,
  autoSearchZipCode,
  onSearchStart,
  onSearchComplete,
}) => {
  const [zipCode, setZipCode] = useState('');
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'good' | 'excellent'>('all');
  const lastAutoSearchRef = useRef<string | null>(null);

  // Use the building footprints hook
  const {
    parcels: rawParcels,
    isLoading,
    error,
    progressPhase,
    progressPercent,
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
  const parcels: Parcel[] = rawParcels.map(convertToDisplayParcel);

  const handleSearch = useCallback(async () => {
    if (!zipCode || zipCode.length < 5) return;
    setSelectedParcelId(null);
    await searchByZipCode(zipCode);
  }, [zipCode, searchByZipCode]);

  const handleParcelSelect = useCallback((parcel: Parcel) => {
    setSelectedParcelId(parcel.id);
    onParcelSelect?.(parcel);
    onCenterMap?.(parcel.coordinates.lat, parcel.coordinates.lng);
  }, [onParcelSelect, onCenterMap]);

  // Auto-search when autoSearchZipCode changes (triggered by Scout button on map)
  useEffect(() => {
    if (!autoSearchZipCode || autoSearchZipCode.length < 5) return;
    if (lastAutoSearchRef.current === autoSearchZipCode) return;

    lastAutoSearchRef.current = autoSearchZipCode;
    setZipCode(autoSearchZipCode);
    setSelectedParcelId(null);

    const performAutoSearch = async () => {
      onSearchStart?.();
      try {
        await searchByZipCode(autoSearchZipCode);
        // Check parcels count after search completes
      } catch (err) {
        onSearchComplete?.(false, 0);
      }
    };

    performAutoSearch();
  }, [autoSearchZipCode, searchByZipCode, onSearchStart, onSearchComplete]);

  // Notify when search completes
  useEffect(() => {
    if (!isLoading && lastAutoSearchRef.current) {
      onSearchComplete?.(parcels.length > 0, parcels.length);
    }
  }, [isLoading, parcels.length, onSearchComplete]);

  const filteredParcels = parcels.filter((parcel) => {
    if (filter === 'all') return true;
    if (filter === 'good') return parcel.vastuScore >= 60;
    if (filter === 'excellent') return parcel.vastuScore >= 80;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
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
            className="bg-[#d4a5a5] hover:bg-[#c49595]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Scan className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isLoading && (
          <div className="mt-3">
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
                {stats.total} parcels • Avg: <span className={getScoreColor(stats.avgScore)}>{stats.avgScore}</span>
                {stats.processingTimeMs > 0 && (
                  <span className="text-slate-400 ml-1">
                    ({(stats.processingTimeMs / 1000).toFixed(1)}s)
                  </span>
                )}
              </span>
              <div className="flex gap-1">
                <span className="text-green-600">{stats.excellent} excellent</span>
                <span className="text-slate-400">•</span>
                <span className="text-yellow-600">{stats.good} good</span>
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
                    ? 'border-[#d4a5a5] text-[#d4a5a5]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {f} ({f === 'all' ? stats.total : f === 'good' ? stats.good + stats.excellent : stats.excellent})
              </button>
            ))}
          </div>

          {/* Parcel List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
          <Scan className="h-12 w-12 text-[#d4a5a5]/50 mb-4" />
          <p className="text-lg font-medium">Vastu Parcel Scout</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Enter a ZIP code to scan and analyze properties with SAM v2 AI segmentation.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-[#d4a5a5]/10 text-xs text-[#d4a5a5] max-w-xs">
            <Sparkles className="h-4 w-4 inline mr-1" />
            Uses Meta's SAM v2 to detect plots and buildings for Vastu analysis.
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Analysis based on Vastu Shastra principles.
          <br />
          <span className="text-[#d4a5a5] flex items-center justify-center gap-1 mt-1">
            <Sparkles className="h-3 w-3" />
            SAM v2 segmentation • No third-party data costs
          </span>
        </p>
      </div>
    </div>
  );
};

export default memo(VastuParcelScout);
