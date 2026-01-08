/**
 * AstroLegend Component
 * Displays a legend for planetary lines with visibility toggles
 *
 * Uses Zustand stores for state management:
 * - astroStore: visibility, mode, loading, birth data
 * - uiStore: legend minimized state
 *
 * Props are optional - will use store values by default.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, ChevronDown, Eye, EyeOff, Loader2, Sparkles, Compass, SlidersHorizontal, X, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AstroVisibilityState,
  Planet,
  LineType,
  ALL_PLANETS,
  ALL_LINE_TYPES,
  PLANET_COLORS,
  AstroMode,
} from '@/lib/astro-types';
import { useAstroLegendState } from '@/stores/astroStore';
import { useUIStore } from '@/stores/uiStore';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

interface AstroLegendProps {
  // All props are now optional - will use store values by default
  visibility?: AstroVisibilityState;
  onTogglePlanet?: (planet: Planet) => void;
  onToggleLineType?: (lineType: LineType) => void;
  onToggleAspects?: () => void;
  onToggleHarmoniousAspects?: () => void;
  onToggleDisharmoniousAspects?: () => void;
  onToggleParans?: () => void;
  onToggleZenithPoints?: () => void;
  onToggleLocalSpace?: () => void;
  onToggleLineLabels?: () => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
  isMinimized?: boolean;
  onToggleMinimized?: () => void;
  loading?: boolean;
  onClearBirthData?: () => void;
  // Mode controls
  mode?: AstroMode;
  isRelocated?: boolean;
  relocationName?: string;
  localSpaceOriginName?: string;  // Name of current local space origin (city)
  onEnableLocalSpace?: () => void;
  onReturnToStandard?: () => void;
}

const LINE_TYPE_LABELS: Record<LineType, string> = {
  MC: 'Midheaven (MC)',
  IC: 'Imum Coeli (IC)',
  ASC: 'Ascendant (ASC)',
  DSC: 'Descendant (DSC)',
};

const LINE_TYPE_DESCRIPTIONS: Record<LineType, string> = {
  MC: 'Career, recognition, authority',
  IC: 'Home, family, foundations',
  ASC: 'Vitality, health, presence',
  DSC: 'Love, partnerships, others',
};

const AstroLegendComponent: React.FC<AstroLegendProps> = (props) => {
  const isMobile = useIsMobile();
  const [isMaximized, setIsMaximized] = useState(false);

  // Get store values
  const astroState = useAstroLegendState();
  const uiIsMinimized = useUIStore((state) => state.isLegendMinimized);
  const uiToggleLegend = useUIStore((state) => state.toggleLegend);

  // Global store for syncing maximize state with toolbar
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  // Handle maximize toggle - sync with global store to hide toolbar
  const handleToggleMaximize = () => {
    const newMaximized = !isMaximized;
    setIsMaximized(newMaximized);
    setMobileSheetMaximized(newMaximized);
  };

  // Handle close - ensure we reset maximize state
  const handleClose = () => {
    if (isMaximized) {
      setMobileSheetMaximized(false);
      setIsMaximized(false);
    }
    onToggleMinimized();
  };

  // Use props or fall back to store values
  const visibility = props.visibility ?? astroState.visibility;
  const onTogglePlanet = props.onTogglePlanet ?? astroState.onTogglePlanet;
  const onToggleLineType = props.onToggleLineType ?? astroState.onToggleLineType;
  const onToggleAspects = props.onToggleAspects ?? astroState.onToggleAspects;
  const onToggleHarmoniousAspects = props.onToggleHarmoniousAspects ?? astroState.onToggleHarmoniousAspects;
  const onToggleDisharmoniousAspects = props.onToggleDisharmoniousAspects ?? astroState.onToggleDisharmoniousAspects;
  const onToggleParans = props.onToggleParans ?? astroState.onToggleParans;
  const onToggleZenithPoints = props.onToggleZenithPoints ?? astroState.onToggleZenithPoints;
  const onToggleLocalSpace = props.onToggleLocalSpace ?? astroState.onToggleLocalSpace;
  const onToggleLineLabels = props.onToggleLineLabels ?? astroState.onToggleLineLabels;
  const onShowAll = props.onShowAll ?? astroState.onShowAll;
  const onHideAll = props.onHideAll ?? astroState.onHideAll;
  const isMinimized = props.isMinimized ?? uiIsMinimized;
  const onToggleMinimized = props.onToggleMinimized ?? uiToggleLegend;
  const loading = props.loading ?? astroState.loading;
  const mode = props.mode ?? astroState.mode;

  // Mobile: Bottom sheet style legend
  if (isMobile) {
    // Minimized state for mobile - return null (Filters button in bottom nav controls this)
    if (isMinimized) {
      return null;
    }

    // Expanded mobile bottom sheet (bottom-0 since bottom nav is hidden when expanded)
    return (
      <div className={`fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300 ${isMaximized ? 'inset-0 mx-0' : 'mx-2'}`}>
        <div
          className={`bg-white dark:bg-[#0a0a0a] backdrop-blur-md shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden ${isMaximized ? 'rounded-none' : 'rounded-t-2xl'}`}
          style={{
            height: isMaximized ? '100dvh' : undefined,
            maxHeight: isMaximized ? '100dvh' : '60vh',
            paddingTop: isMaximized ? 'env(safe-area-inset-top, 0px)' : undefined,
          }}
        >
          {/* Header with drag handle */}
          <div className="flex flex-col items-center border-b border-slate-200 dark:border-white/10 flex-shrink-0">
            {/* Drag handle - hide when maximized */}
            {!isMaximized && (
              <div className="pt-2 pb-1">
                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>
            )}
            <div
              className="flex items-center justify-between w-full px-4"
              style={{
                paddingTop: isMaximized ? '12px' : '0',
                paddingBottom: '12px',
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Planetary Lines</span>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>
              <div className="flex items-center gap-2">
                {/* Maximize/Minimize button */}
                <button
                  onClick={handleToggleMaximize}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  aria-label={isMaximized ? 'Minimize' : 'Maximize'}
                >
                  {isMaximized ? (
                    <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  )}
                </button>
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  {isMaximized ? (
                    <X className="w-5 h-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 space-y-5">
              {/* Quick actions (hidden in local space mode) */}
              {mode !== 'localSpace' && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1 h-12 text-sm"
                    onClick={onShowAll}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Show All
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1 h-12 text-sm"
                    onClick={onHideAll}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide All
                  </Button>
                </div>
              )}

              {/* Planets - visible in all modes including local space */}
              <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                  Planets
                </h4>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLANETS.map((planet) => (
                    <button
                      key={planet}
                      onClick={() => onTogglePlanet(planet)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                        visibility.planets[planet]
                          ? 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/20'
                          : 'bg-transparent border-slate-200 dark:border-white/10 opacity-50'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: PLANET_COLORS[planet] }}
                      />
                      <span className="text-sm font-medium">{planet === 'NorthNode' ? 'N.Node' : planet}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Types - larger touch targets (hidden in local space mode) */}
              {mode !== 'localSpace' && (
                <div>
                  <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                    Line Types
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_LINE_TYPES.map((lineType) => (
                      <button
                        key={lineType}
                        onClick={() => onToggleLineType(lineType)}
                        className={`flex flex-col items-start p-3 rounded-xl border transition-all ${
                          visibility.lineTypes[lineType]
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                            : 'bg-transparent border-slate-200 dark:border-white/10 opacity-60'
                        }`}
                      >
                        <span className="text-sm font-semibold">{lineType}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {LINE_TYPE_DESCRIPTIONS[lineType]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced options in a compact grid (hidden in local space mode) */}
              {mode !== 'localSpace' && (
                <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                  Advanced
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {onToggleAspects && (
                    <button
                      type="button"
                      onClick={onToggleAspects}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        visibility.showAspects
                          ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                          : 'bg-transparent border-slate-200 dark:border-white/10 opacity-60'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${visibility.showAspects ? 'bg-purple-600 border-purple-600' : 'border-slate-300 dark:border-slate-600'}`}>
                        {visibility.showAspects && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium">Aspects</span>
                    </button>
                  )}
                  {onToggleParans && (
                    <button
                      type="button"
                      onClick={onToggleParans}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        visibility.showParans
                          ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                          : 'bg-transparent border-slate-200 dark:border-white/10 opacity-60'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${visibility.showParans ? 'bg-purple-600 border-purple-600' : 'border-slate-300 dark:border-slate-600'}`}>
                        {visibility.showParans && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium">Parans</span>
                    </button>
                  )}
                  {onToggleZenithPoints && (
                    <button
                      type="button"
                      onClick={onToggleZenithPoints}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        visibility.showZenithPoints
                          ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                          : 'bg-transparent border-slate-200 dark:border-white/10 opacity-60'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${visibility.showZenithPoints ? 'bg-purple-600 border-purple-600' : 'border-slate-300 dark:border-slate-600'}`}>
                        {visibility.showZenithPoints && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium">Zenith</span>
                    </button>
                  )}
                  {onToggleLineLabels && (
                    <button
                      type="button"
                      onClick={onToggleLineLabels}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                        visibility.showLineLabels
                          ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
                          : 'bg-transparent border-slate-200 dark:border-white/10 opacity-60'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${visibility.showLineLabels ? 'bg-purple-600 border-purple-600' : 'border-slate-300 dark:border-slate-600'}`}>
                        {visibility.showLineLabels && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium">Labels</span>
                    </button>
                  )}
                </div>
                {/* Sub-options for aspects when enabled */}
                {visibility.showAspects && (onToggleHarmoniousAspects || onToggleDisharmoniousAspects) && (
                  <div className="flex gap-2 mt-2 pl-4">
                    {onToggleHarmoniousAspects && (
                      <button
                        onClick={onToggleHarmoniousAspects}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          visibility.showHarmoniousAspects
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                            : 'border-slate-200 dark:border-white/10 opacity-60'
                        }`}
                      >
                        Harmonious
                      </button>
                    )}
                    {onToggleDisharmoniousAspects && (
                      <button
                        onClick={onToggleDisharmoniousAspects}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          visibility.showDisharmoniousAspects
                            ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                            : 'border-slate-200 dark:border-white/10 opacity-60'
                        }`}
                      >
                        Challenging
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}

            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Desktop: Original sidebar legend
  // Minimized collapsed bar
  if (isMinimized) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-white dark:hover:bg-[#0a0a0a] transition-colors"
        onClick={onToggleMinimized}
      >
        <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Filters</span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  return (
    <Card className="w-64 bg-white/90 dark:bg-[#0a0a0a]/90 dark:border-white/10 backdrop-blur-md shadow-lg flex flex-col overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          Planetary Lines
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleMinimized}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </CardHeader>
      <ScrollArea className="h-[calc(70vh-60px)]">
        <CardContent className="space-y-4 pr-4">
          {/* Quick actions (hidden in local space mode) */}
          {mode !== 'localSpace' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={onShowAll}
              >
                <Eye className="w-3 h-3 mr-1" />
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={onHideAll}
              >
                <EyeOff className="w-3 h-3 mr-1" />
                Hide All
              </Button>
            </div>
          )}

          {/* Line Types (hidden in local space mode) */}
          {mode !== 'localSpace' && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Line Types
              </h4>
              <div className="space-y-1">
                {ALL_LINE_TYPES.map((lineType) => (
                  <label
                    key={lineType}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded"
                  >
                    <Checkbox
                      checked={visibility.lineTypes[lineType]}
                      onCheckedChange={() => onToggleLineType(lineType)}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-medium">{lineType}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                        {LINE_TYPE_DESCRIPTIONS[lineType]}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Line Types (hidden in local space mode) */}
          {mode !== 'localSpace' && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Aspect Lines
              </h4>
              <div className="space-y-1">
                {onToggleAspects && (
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded">
                    <Checkbox
                      checked={visibility.showAspects}
                      onCheckedChange={onToggleAspects}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-medium">Show Aspects</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                        Planet to angle
                      </span>
                    </div>
                  </label>
                )}
                {/* Harmonious/Disharmonious sub-options - only show when aspects are enabled */}
                {visibility.showAspects && (
                  <div className="ml-4 space-y-1 border-l-2 border-slate-200 dark:border-white/10 pl-2">
                    {onToggleHarmoniousAspects && (
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded">
                        <Checkbox
                          checked={visibility.showHarmoniousAspects}
                          onCheckedChange={onToggleHarmoniousAspects}
                        />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">Harmonious</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                            Trine, Sextile
                          </span>
                        </div>
                      </label>
                    )}
                    {onToggleDisharmoniousAspects && (
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded">
                        <Checkbox
                          checked={visibility.showDisharmoniousAspects}
                          onCheckedChange={onToggleDisharmoniousAspects}
                        />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">Challenging</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                            Square
                          </span>
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paran Lines (hidden in local space mode) */}
          {mode !== 'localSpace' && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Paran Lines
              </h4>
              <div className="space-y-1">
                {onToggleParans && (
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded">
                    <Checkbox
                      checked={visibility.showParans}
                      onCheckedChange={onToggleParans}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-medium">Show Parans</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                        Line crossings
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Zenith Points (hidden in local space mode) */}
          {mode !== 'localSpace' && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Zenith Points
              </h4>
              <div className="space-y-1">
                {onToggleZenithPoints && (
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded">
                    <Checkbox
                      checked={visibility.showZenithPoints}
                      onCheckedChange={onToggleZenithPoints}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-medium">Show Zenith</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                        Max power points
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Line Labels (hidden in local space mode) */}
          {mode !== 'localSpace' && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Line Labels
              </h4>
              <div className="space-y-1">
                {onToggleLineLabels && (
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded">
                    <Checkbox
                      checked={visibility.showLineLabels}
                      onCheckedChange={onToggleLineLabels}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-medium">Show Labels</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                        Line names on globe
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Local Space Lines (hidden in local space mode - they're always shown there) */}
          {mode !== 'localSpace' && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Local Space
              </h4>
              <div className="space-y-1">
                {onToggleLocalSpace && (
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded">
                    <Checkbox
                      checked={visibility.showLocalSpace}
                      onCheckedChange={onToggleLocalSpace}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-medium">Show Local Space</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                        Azimuth lines
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Planets - visible in all modes including local space */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Planets
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {ALL_PLANETS.map((planet) => (
                <label
                  key={planet}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-1 rounded"
                >
                  <Checkbox
                    checked={visibility.planets[planet]}
                    onCheckedChange={() => onTogglePlanet(planet)}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PLANET_COLORS[planet] }}
                  />
                  <span className="text-xs">{planet === 'NorthNode' ? 'N.Node' : planet}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Legend explanation (hidden in local space mode) */}
          {mode !== 'localSpace' && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-white/10">
              <p className="mb-1">
                <strong>MC/IC:</strong> Vertical meridian lines
              </p>
              <p>
                <strong>ASC/DSC:</strong> Curved horizon lines
              </p>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export const AstroLegend = React.memo(AstroLegendComponent);

export default AstroLegend;
