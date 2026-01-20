import React, { useState } from 'react';
import {
  Bot,
  Hexagon,
  Telescope,
  X,
  Check,
  Compass,
  Navigation,
  ChevronRight,
  Settings,
  Star,
  MapPin,
  SlidersHorizontal,
  Plus,
  Search,
  Home,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BirthChart } from '@/hooks/useBirthCharts';
import type { FavoriteCity } from '@/hooks/useFavoriteCities';

interface LeftActionBarProps {
  // Birth data state
  hasBirthData: boolean;
  hasPendingBirthLocation?: boolean;
  onClearBirthData?: () => void;
  onClearPendingBirth?: () => void;

  // Charts management
  charts?: BirthChart[];
  currentChartId?: string | null;
  onSelectChart?: (id: string) => void;
  onOpenChartPicker?: () => void;
  onAddChart?: () => void;

  // Favorites management
  favorites?: FavoriteCity[];
  onOpenFavoritesPanel?: () => void;
  onFavoriteSelect?: (lat: number, lng: number, name: string) => void;

  // AI Chat
  isAIChatOpen?: boolean;
  onToggleAIChat?: () => void;

  // Compatibility/Duo mode
  isCompatibilityEnabled?: boolean;
  isCompatibilityCalculating?: boolean;
  hasPartnerChart?: boolean;
  partnerName?: string;
  onToggleCompatibility?: () => void;
  onOpenPartnerModal?: () => void;

  // Zone drawing
  isDrawingZone?: boolean;
  drawingMode?: 'search' | 'property' | null;
  hasDrawnZone?: boolean;
  hasSearchZone?: boolean;
  hasPropertyZone?: boolean;
  zoneDrawingPointsCount?: number;
  onToggleZoneDrawing?: () => void;
  onStartSearchZone?: () => void;
  onStartPropertyZone?: () => void;
  onCompleteZoneDrawing?: () => void;
  onClearZone?: () => void;
  onClearSearchZone?: () => void;
  onClearPropertyZone?: () => void;
  onStopDrawing?: () => void;

  // Export & Share
  onOpenExport?: () => void;
  onOpenShareChart?: () => void;

  // Scout
  onOpenScoutPanel?: () => void;

  // Filters (Legend)
  onToggleFilters?: () => void;

  // Mode indicators
  isLocalSpaceMode?: boolean;
  localSpaceOriginName?: string;
  isRelocated?: boolean;
  relocationName?: string;
  onReturnToStandard?: () => void;
}

export const LeftActionBar: React.FC<LeftActionBarProps> = ({
  hasBirthData,
  hasPendingBirthLocation,
  onClearBirthData,
  onClearPendingBirth,
  charts = [],
  currentChartId,
  onSelectChart,
  onOpenChartPicker,
  onAddChart,
  favorites = [],
  onOpenFavoritesPanel,
  onFavoriteSelect,
  isAIChatOpen,
  onToggleAIChat,
  isCompatibilityEnabled,
  isCompatibilityCalculating,
  hasPartnerChart,
  partnerName,
  onToggleCompatibility,
  onOpenPartnerModal,
  isDrawingZone,
  drawingMode,
  hasDrawnZone,
  hasSearchZone,
  hasPropertyZone,
  zoneDrawingPointsCount = 0,
  onToggleZoneDrawing,
  onStartSearchZone,
  onStartPropertyZone,
  onCompleteZoneDrawing,
  onClearZone,
  onClearSearchZone,
  onClearPropertyZone,
  onStopDrawing,
  onOpenExport,
  onOpenShareChart,
  onOpenScoutPanel,
  onToggleFilters,
  isLocalSpaceMode,
  localSpaceOriginName,
  isRelocated,
  relocationName,
  onReturnToStandard,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Always show the left action bar (Vastu app doesn't require birth data)
  const hasModeIndicators = !!onReturnToStandard && (isRelocated || isLocalSpaceMode);
  const hasGuidanceSection = !!onToggleFilters || !!onToggleAIChat || !!onOpenScoutPanel;
  const hasAreasSection =
    !!onStartSearchZone ||
    !!onStartPropertyZone ||
    (!!onToggleZoneDrawing && !onStartSearchZone && !onStartPropertyZone);
  const hasSavedSection = !!onOpenFavoritesPanel || !!onOpenChartPicker;

  // Handle search zone button click
  const handleSearchZoneClick = () => {
    if (isDrawingZone && drawingMode === 'search') {
      // Currently drawing search zone
      if (zoneDrawingPointsCount >= 3 && onCompleteZoneDrawing) {
        onCompleteZoneDrawing();
      } else if (onStopDrawing) {
        onStopDrawing();
      }
    } else if (hasSearchZone) {
      // Has existing search zone - clear it
      if (onClearSearchZone) {
        onClearSearchZone();
      }
    } else if (onStartSearchZone) {
      // Start drawing search zone
      onStartSearchZone();
    }
  };

  // Handle property zone button click
  const handlePropertyZoneClick = () => {
    if (isDrawingZone && drawingMode === 'property') {
      // Currently drawing property zone
      if (zoneDrawingPointsCount >= 3 && onCompleteZoneDrawing) {
        onCompleteZoneDrawing();
      } else if (onStopDrawing) {
        onStopDrawing();
      }
    } else if (hasPropertyZone) {
      // Has existing property zone - clear it
      if (onClearPropertyZone) {
        onClearPropertyZone();
      }
    } else if (onStartPropertyZone) {
      // Start drawing property zone
      onStartPropertyZone();
    }
  };

  // Legacy handler for backwards compatibility
  const handleZoneClick = () => {
    if (isDrawingZone) {
      if (zoneDrawingPointsCount >= 3 && onCompleteZoneDrawing) {
        onCompleteZoneDrawing();
      } else if (onStopDrawing) {
        onStopDrawing();
      } else if (onToggleZoneDrawing) {
        onToggleZoneDrawing();
      }
    } else if (hasDrawnZone) {
      if (onClearZone) {
        onClearZone();
      }
    } else if (onToggleZoneDrawing) {
      onToggleZoneDrawing();
    }
  };

  const handleDuoClick = () => {
    if (!hasPartnerChart) {
      onOpenPartnerModal?.();
    } else {
      onToggleCompatibility?.();
    }
  };

  return (
    <div
      data-tour="left-toolbar"
      className={cn(
        'flex flex-col gap-1 p-2 rounded-xl transition-all duration-200 ease-out pointer-events-auto',
        'bg-white/95 dark:bg-zinc-800 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-lg',
        isExpanded ? 'w-52' : 'w-14'
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Mode indicators (only show when active) */}
      {hasModeIndicators && isExpanded && (
        <div className="px-2.5 pt-1 pb-1 text-[10px] font-semibold tracking-wide uppercase text-slate-400 dark:text-zinc-500">
          Mode
        </div>
      )}
      {hasModeIndicators && isRelocated && (
        <ActionButton
          icon={<Navigation className="w-4 h-4" />}
          label={`Relocated${relocationName ? `: ${relocationName}` : ''}`}
          onClick={onReturnToStandard}
          isExpanded={isExpanded}
          isActive
          activeColor="blue"
          actionLabel="Reset"
        />
      )}
      {hasModeIndicators && isLocalSpaceMode && (
        <ActionButton
          icon={<Compass className="w-4 h-4" />}
          label={`Local Space${localSpaceOriginName ? `: ${localSpaceOriginName}` : ''}`}
          onClick={onReturnToStandard}
          isExpanded={isExpanded}
          isActive
          activeColor="amber"
          actionLabel="Exit"
        />
      )}
      {hasModeIndicators && (hasGuidanceSection || hasAreasSection || hasSavedSection) && (
        <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
      )}

      {/* Guidance & controls */}
      {hasGuidanceSection && isExpanded && (
        <div className="px-2.5 pt-1 pb-1 text-[10px] font-semibold tracking-wide uppercase text-slate-400 dark:text-zinc-500">
          Guidance
        </div>
      )}

      {/* Preferences (Vastu) */}
      {onToggleFilters && (
        <ActionButton
          icon={<SlidersHorizontal className="w-4 h-4" />}
          label="Preferences"
          onClick={onToggleFilters}
          isExpanded={isExpanded}
          activeColor="blue"
          dataTour="filters"
        />
      )}

      {/* Vastu Guide (AI) */}
      {onToggleAIChat && (
        <ActionButton
          icon={<Bot className="w-4 h-4" />}
          label={<>Vastu Guide<span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal ml-1.5">AI</span></>}
          tooltip="Vastu Guide"
          onClick={onToggleAIChat}
          isExpanded={isExpanded}
          isActive={isAIChatOpen}
          activeColor="amber"
          dataTour="ai-chat"
        />
      )}

      {/* Scout Locations */}
      {onOpenScoutPanel && (
        <ActionButton
          icon={<Telescope className="w-4 h-4" />}
          label="Scout Locations"
          onClick={onOpenScoutPanel}
          isExpanded={isExpanded}
          dataTour="scout-button"
        />
      )}

      {hasGuidanceSection && hasAreasSection && <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />}
      {hasAreasSection && isExpanded && (
        <div className="px-2.5 pt-1 pb-1 text-[10px] font-semibold tracking-wide uppercase text-slate-400 dark:text-zinc-500">
          Areas
        </div>
      )}

      {/* Draw Search Zone */}
      {onStartSearchZone && (
        <ActionButton
          icon={
            isDrawingZone && drawingMode === 'search' ? (
              zoneDrawingPointsCount >= 3 ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )
            ) : hasSearchZone ? (
              <X className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4" />
            )
          }
          label={
            isDrawingZone && drawingMode === 'search'
              ? zoneDrawingPointsCount >= 3
                ? `Complete (${zoneDrawingPointsCount} pts)`
                : `Cancel (${zoneDrawingPointsCount} pts)`
              : hasSearchZone
                ? 'Clear Search Area'
                : 'Search Area'
          }
          onClick={handleSearchZoneClick}
          isExpanded={isExpanded}
          isActive={isDrawingZone && drawingMode === 'search' || hasSearchZone}
          activeColor="blue"
        />
      )}

      {/* Draw Property Boundary */}
      {onStartPropertyZone && (
        <ActionButton
          icon={
            isDrawingZone && drawingMode === 'property' ? (
              zoneDrawingPointsCount >= 3 ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )
            ) : hasPropertyZone ? (
              <X className="w-4 h-4" />
            ) : (
              <Home className="w-4 h-4" />
            )
          }
          label={
            isDrawingZone && drawingMode === 'property'
              ? zoneDrawingPointsCount >= 3
                ? `Complete (${zoneDrawingPointsCount} pts)`
                : `Cancel (${zoneDrawingPointsCount} pts)`
              : hasPropertyZone
                ? 'Clear Boundary'
                : 'Property Boundary'
          }
          onClick={handlePropertyZoneClick}
          isExpanded={isExpanded}
          isActive={isDrawingZone && drawingMode === 'property' || hasPropertyZone}
          activeColor="cyan"
        />
      )}

      {/* Legacy Draw Zone (for backwards compatibility) */}
      {onToggleZoneDrawing && !onStartSearchZone && !onStartPropertyZone && (
        <ActionButton
          icon={
            isDrawingZone ? (
              zoneDrawingPointsCount >= 3 ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )
            ) : hasDrawnZone ? (
              <X className="w-4 h-4" />
            ) : (
              <Hexagon className="w-4 h-4" />
            )
          }
          label={
            isDrawingZone
              ? zoneDrawingPointsCount >= 3
                ? `Complete (${zoneDrawingPointsCount} pts)`
                : `Cancel (${zoneDrawingPointsCount} pts)`
              : hasDrawnZone
                ? 'Clear Zone'
                : 'Draw Zone'
          }
          onClick={handleZoneClick}
          isExpanded={isExpanded}
          isActive={isDrawingZone || hasDrawnZone}
          activeColor="cyan"
        />
      )}

      {hasAreasSection && hasSavedSection && <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />}
      {hasSavedSection && isExpanded && (
        <div className="px-2.5 pt-1 pb-1 text-[10px] font-semibold tracking-wide uppercase text-slate-400 dark:text-zinc-500">
          Saved
        </div>
      )}

      {/* My Favorites */}
      {onOpenFavoritesPanel && (
        <FavoritesMenuButton
          favorites={favorites}
          onSelectFavorite={onFavoriteSelect}
          onOpenFavoritesPanel={onOpenFavoritesPanel}
          isExpanded={isExpanded}
        />
      )}

      {/* History - saved locations */}
      {onOpenChartPicker && (
        <HistoryMenuButton
          charts={charts}
          currentChartId={currentChartId}
          onSelectChart={onSelectChart}
          onOpenChartPicker={onOpenChartPicker}
          onAddChart={onAddChart}
          isExpanded={isExpanded}
        />
      )}
    </div>
  );
};

interface HistoryMenuButtonProps {
  charts: BirthChart[];
  currentChartId?: string | null;
  onSelectChart?: (id: string) => void;
  onOpenChartPicker: () => void;
  onAddChart?: () => void;
  isExpanded: boolean;
}

const HistoryMenuButton: React.FC<HistoryMenuButtonProps> = ({
  charts,
  currentChartId,
  onSelectChart,
  onOpenChartPicker,
  onAddChart,
  isExpanded,
}) => {
  const [showSubmenu, setShowSubmenu] = useState(false);

  const handleChartSelect = (id: string) => {
    onSelectChart?.(id);
    setShowSubmenu(false);
  };

  // If not expanded or no locations, show simple button
  if (!isExpanded || charts.length === 0) {
    return (
      <button
        onClick={onOpenChartPicker}
        className={cn(
          'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 min-h-[40px] border border-transparent',
          'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/10',
          isExpanded ? 'justify-start' : 'justify-center'
        )}
        title={!isExpanded ? 'History' : undefined}
      >
        <History className="w-4 h-4" />
        {isExpanded && (
          <span className="flex-1 text-left truncate text-sm font-medium whitespace-nowrap">
            History
          </span>
        )}
      </button>
    );
  }

  // Expanded with locations - show submenu on hover
  return (
    <div
      className="relative"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      <button
        onClick={onOpenChartPicker}
        className={cn(
          'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 min-h-[40px] border border-transparent w-full',
          'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/10',
          'justify-start'
        )}
      >
        <History className="w-4 h-4" />
        <span className="flex-1 text-left truncate text-sm font-medium whitespace-nowrap">
          History
        </span>
        <ChevronRight className={cn(
          'w-3.5 h-3.5 transition-transform duration-200',
          showSubmenu && 'rotate-90'
        )} />
      </button>

      {/* Submenu with location names */}
      {showSubmenu && (
        <div className="absolute left-full top-0 ml-1 min-w-[160px] max-w-[220px] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg shadow-lg py-1 z-50">
          {charts.slice(0, 5).map((chart) => (
            <button
              key={chart.id}
              onClick={() => handleChartSelect(chart.id)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2',
                'hover:bg-slate-100 dark:hover:bg-white/10',
                currentChartId === chart.id && 'bg-slate-100 dark:bg-white/10'
              )}
            >
              <span className="flex-1 truncate">{chart.name}</span>
              {currentChartId === chart.id && (
                <Check className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 flex-shrink-0" />
              )}
            </button>
          ))}
          <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
          <button
            onClick={() => {
              setShowSubmenu(false);
              (onAddChart || onOpenChartPicker)();
            }}
            className="w-full px-3 py-2 text-left text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2"
          >
            <Plus className="w-3 h-3" />
            Add Location
          </button>
          <button
            onClick={() => {
              setShowSubmenu(false);
              onOpenChartPicker();
            }}
            className="w-full px-3 py-2 text-left text-xs text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2"
          >
            <Settings className="w-3 h-3" />
            {charts.length > 5 ? `View all ${charts.length} locations...` : 'Manage locations...'}
          </button>
        </div>
      )}
    </div>
  );
};

interface FavoritesMenuButtonProps {
  favorites: FavoriteCity[];
  onSelectFavorite?: (lat: number, lng: number, name: string) => void;
  onOpenFavoritesPanel: () => void;
  isExpanded: boolean;
}

const FavoritesMenuButton: React.FC<FavoritesMenuButtonProps> = ({
  favorites,
  onSelectFavorite,
  onOpenFavoritesPanel,
  isExpanded,
}) => {
  const [showSubmenu, setShowSubmenu] = useState(false);

  const handleFavoriteSelect = (fav: FavoriteCity) => {
    onSelectFavorite?.(fav.latitude, fav.longitude, fav.city_name);
    setShowSubmenu(false);
  };

  // If not expanded or no favorites, show simple button
  if (!isExpanded || favorites.length === 0) {
    return (
      <button
        onClick={onOpenFavoritesPanel}
        className={cn(
          'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 min-h-[40px] border border-transparent',
          'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/10',
          isExpanded ? 'justify-start' : 'justify-center'
        )}
        title={!isExpanded ? 'My Favorites' : undefined}
      >
        <Star className="w-4 h-4" />
        {isExpanded && (
          <>
            <span className="flex-1 text-left truncate text-sm font-medium whitespace-nowrap">
              My Favorites
            </span>
            {favorites.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-zinc-500">{favorites.length}</span>
            )}
          </>
        )}
      </button>
    );
  }

  // Expanded with favorites - show submenu on hover
  return (
    <div
      className="relative"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      <button
        onClick={onOpenFavoritesPanel}
        className={cn(
          'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 min-h-[40px] border border-transparent w-full',
          'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/10',
          'justify-start'
        )}
      >
        <Star className="w-4 h-4" />
        <span className="flex-1 text-left truncate text-sm font-medium whitespace-nowrap">
          My Favorites
        </span>
        <span className="text-xs text-slate-400 dark:text-zinc-500 mr-1">{favorites.length}</span>
        <ChevronRight className={cn(
          'w-3.5 h-3.5 transition-transform duration-200',
          showSubmenu && 'rotate-90'
        )} />
      </button>

      {/* Submenu with favorite cities */}
      {showSubmenu && (
        <div className="absolute left-full top-0 ml-1 min-w-[180px] max-w-[240px] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg shadow-lg py-1 z-50">
          {favorites.slice(0, 5).map((fav) => (
            <button
              key={fav.id}
              onClick={() => handleFavoriteSelect(fav)}
              className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block truncate">{fav.city_name}</span>
                {fav.country && (
                  <span className="block text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                    {fav.country}
                  </span>
                )}
              </div>
            </button>
          ))}
          {favorites.length > 5 && (
            <>
              <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
              <button
                onClick={onOpenFavoritesPanel}
                className="w-full px-3 py-2 text-left text-xs text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2"
              >
                <Settings className="w-3 h-3" />
                View all {favorites.length} favorites...
              </button>
            </>
          )}
          {favorites.length <= 5 && (
            <>
              <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
              <button
                onClick={onOpenFavoritesPanel}
                className="w-full px-3 py-2 text-left text-xs text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2"
              >
                <Settings className="w-3 h-3" />
                Manage favorites...
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  tooltip?: string;
  onClick: () => void;
  isExpanded: boolean;
  isActive?: boolean;
  activeColor?: 'amber' | 'pink' | 'cyan' | 'blue';
  variant?: 'default' | 'danger';
  actionLabel?: string;
  dataTour?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  tooltip,
  onClick,
  isExpanded,
  isActive,
  activeColor = 'amber',
  variant = 'default',
  actionLabel,
  dataTour,
}) => {
  const colorClasses = {
    amber: {
      active: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      icon: 'text-amber-500',
    },
    pink: {
      active: 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300 border-pink-300 dark:border-pink-700',
      icon: 'text-pink-500',
    },
    cyan: {
      active: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
      icon: 'text-cyan-500',
    },
    blue: {
      active: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      icon: 'text-blue-500',
    },
  };

  const dangerClasses = 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30';
  const defaultClasses = 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/10';

  return (
    <button
      onClick={onClick}
      data-tour={dataTour}
      className={cn(
        'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 min-h-[40px] border border-transparent',
        variant === 'danger'
          ? dangerClasses
          : isActive
            ? colorClasses[activeColor].active
            : defaultClasses,
        isExpanded ? 'justify-start' : 'justify-center'
      )}
      title={!isExpanded ? tooltip : undefined}
    >
      <span className={cn(isActive && colorClasses[activeColor].icon)}>
        {icon}
      </span>
      {isExpanded && (
        <span className="flex-1 text-left truncate text-sm font-medium whitespace-nowrap">
          {label}
        </span>
      )}
      {isExpanded && actionLabel && (
        <span className="text-xs opacity-70">{actionLabel}</span>
      )}
      {!isExpanded && isActive && (
        <span
          className={cn(
            'absolute right-1 top-1 w-2 h-2 rounded-full',
            activeColor === 'amber' && 'bg-amber-500',
            activeColor === 'pink' && 'bg-pink-500',
            activeColor === 'cyan' && 'bg-cyan-500',
            activeColor === 'blue' && 'bg-blue-500'
          )}
        />
      )}
    </button>
  );
};

export default LeftActionBar;
