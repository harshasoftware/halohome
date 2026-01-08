/**
 * CompatibilityPanel Component
 * Displays ranked list of compatible locations for two people
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MapPin,
  Sparkles,
  Trophy,
  ChevronDown,
  Users,
  X,
  Loader2,
  TrendingUp,
  Home,
  Plane,
  Briefcase,
  Pencil,
  Trash2,
  Info,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  CompatibilityMode,
  CompatibilityAnalysis,
  CompatibleLocation,
} from '@/lib/compatibility-utils';
import { getAllModes, getModeInfo } from '@/lib/compatibility-utils';
import { PLANET_COLORS } from '@/lib/astro-types';
import type { BirthChart } from '@/hooks/useBirthCharts';

interface CompatibilityPanelProps {
  analysis: CompatibilityAnalysis | null;
  mode: CompatibilityMode;
  onModeChange: (mode: CompatibilityMode) => void;
  onLocationZoom: (lat: number, lng: number, cityName?: string) => void;
  onLocationCityInfo: (lat: number, lng: number, cityName?: string) => void;
  onClose: () => void;
  onEditPartner?: () => void;
  onClearPartner?: () => void;
  onSelectPartner?: (chart: BirthChart) => void;
  savedCharts?: BirthChart[];
  currentPartnerId?: string;
  isLoading?: boolean;
  person1Name?: string;
  person2Name?: string;
  isMobile?: boolean;
}

const ModeIcon: React.FC<{ mode: CompatibilityMode; className?: string }> = ({ mode, className }) => {
  switch (mode) {
    case 'honeymoon':
      return <Heart className={className} />;
    case 'relocation':
      return <Home className={className} />;
    case 'travel':
      return <Plane className={className} />;
    case 'business':
      return <Briefcase className={className} />;
  }
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <Trophy className="w-4 h-4 text-amber-500" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-500 dark:text-slate-300">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">3</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
      <span className="text-sm font-medium text-slate-400">{rank}</span>
    </div>
  );
};

const LocationCard: React.FC<{
  location: CompatibleLocation;
  rank: number;
  onZoom: () => void;
  onCityInfo: () => void;
}> = ({ location, rank, onZoom, onCityInfo }) => {
  const googleMapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

  const handleCoordsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCityInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCityInfo();
  };

  return (
    <div
      onClick={onZoom}
      className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <RankBadge rank={rank} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-medium text-slate-900 dark:text-white truncate">
                {location.cityName || 'Unknown Location'}
                {location.country && (
                  <span className="text-slate-500 dark:text-slate-400 font-normal">, {location.country}</span>
                )}
              </h4>
              <button
                onClick={handleCoordsClick}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
                title="Open in Google Maps"
              >
                <MapPin className="w-3 h-3" />
                {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30">
              <Sparkles className="w-3 h-3 text-pink-500" />
              <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
                {location.combinedScore}
              </span>
            </div>
          </div>

          {/* Planet lines for each person */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">You:</span>
              {location.person1Lines.slice(0, 3).map((line, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${PLANET_COLORS[line.planet]}15`,
                    color: PLANET_COLORS[line.planet],
                  }}
                >
                  {line.planet.slice(0, 3)} {line.lineType}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">Partner:</span>
              {location.person2Lines.slice(0, 3).map((line, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${PLANET_COLORS[line.planet]}15`,
                    color: PLANET_COLORS[line.planet],
                  }}
                >
                  {line.planet.slice(0, 3)} {line.lineType}
                </span>
              ))}
            </div>
          </div>

          {/* Themes */}
          {location.themes.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {location.themes.map((theme) => (
                <span
                  key={theme}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* Interpretation */}
          {location.interpretation && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {location.interpretation}
            </p>
          )}

          {/* City Info Button */}
          <button
            onClick={handleCityInfoClick}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm font-medium"
          >
            <Info className="w-4 h-4" />
            View City Info
          </button>
        </div>
      </div>
    </div>
  );
};

const CompatibilityPanelComponent: React.FC<CompatibilityPanelProps> = ({
  analysis,
  mode,
  onModeChange,
  onLocationZoom,
  onLocationCityInfo,
  onClose,
  onEditPartner,
  onClearPartner,
  onSelectPartner,
  savedCharts = [],
  currentPartnerId,
  isLoading = false,
  person1Name = 'You',
  person2Name = 'Partner',
  isMobile = false,
}) => {
  const modeInfo = getModeInfo(mode);
  const allModes = getAllModes();

  // Filter out the current partner from the switch options
  const otherCharts = savedCharts.filter(c => c.id !== currentPartnerId);

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Compatible Spots
            </h3>
            <div className="flex items-center gap-1.5">
              {/* Partner selector - show dropdown if there are other charts to choose from */}
              {onSelectPartner && otherCharts.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                      {person1Name} + <span className="font-medium text-pink-600 dark:text-pink-400">{person2Name}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      Switch Partner
                    </div>
                    <DropdownMenuSeparator />
                    {otherCharts.map((chart) => (
                      <DropdownMenuItem
                        key={chart.id}
                        onClick={() => onSelectPartner(chart)}
                        className="gap-2"
                      >
                        <Heart className="w-4 h-4 text-pink-500" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{chart.name}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {chart.city_name || `${chart.latitude.toFixed(2)}°, ${chart.longitude.toFixed(2)}°`}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {onEditPartner && (
                      <DropdownMenuItem onClick={onEditPartner} className="gap-2">
                        <Pencil className="w-4 h-4" />
                        Edit Current Partner
                      </DropdownMenuItem>
                    )}
                    {onClearPartner && (
                      <DropdownMenuItem onClick={onClearPartner} className="gap-2 text-red-600 dark:text-red-400">
                        <Trash2 className="w-4 h-4" />
                        Remove Partner
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {person1Name} + {person2Name}
                  </p>
                  {onEditPartner && (
                    <button
                      onClick={onEditPartner}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit partner"
                    >
                      <Pencil className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                    </button>
                  )}
                  {onClearPartner && (
                    <button
                      onClick={onClearPartner}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Remove partner"
                    >
                      <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Mode selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                <ModeIcon mode={mode} className="w-4 h-4" />
                <span className="text-xs">{modeInfo.label}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allModes.map((m) => {
                const info = getModeInfo(m);
                return (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => onModeChange(m)}
                    className="gap-2"
                  >
                    <span>{info.icon}</span>
                    <div>
                      <div className="font-medium">{info.label}</div>
                      <div className="text-xs text-slate-500">{info.description}</div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Finding your perfect destinations...
            </p>
          </div>
        ) : !analysis || analysis.topLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-1">
              No intersections found
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Your astrocartography lines don't cross at the moment. Try adjusting birth data or exploring different line types.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Stats summary */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-pink-500" />
                <span className="text-sm text-pink-700 dark:text-pink-300">
                  <strong>{analysis.totalIntersections}</strong> line intersections
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-500" />
                <span className="text-sm text-pink-700 dark:text-pink-300">
                  <strong>{analysis.topLocations.length}</strong> destinations
                </span>
              </div>
            </div>

            {/* Location list */}
            <div className="space-y-2">
              {analysis.topLocations.map((location, index) => (
                <LocationCard
                  key={`${location.lat}-${location.lng}`}
                  location={location}
                  rank={index + 1}
                  onZoom={() => onLocationZoom(location.lat, location.lng, location.cityName)}
                  onCityInfo={() => onLocationCityInfo(location.lat, location.lng, location.cityName)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  // Mobile: bottom sheet style with proper flex height for scrolling
  if (isMobile) {
    return (
      <div className="flex flex-col w-full h-full bg-white dark:bg-slate-900">
        {panelContent}
      </div>
    );
  }

  // Desktop: side panel
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 flex flex-col">
      {panelContent}
    </div>
  );
};

export const CompatibilityPanel = React.memo(CompatibilityPanelComponent);

export default CompatibilityPanel;
