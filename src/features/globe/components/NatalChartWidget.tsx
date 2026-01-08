/**
 * NatalChartWidget Component
 * A minimizable/maximizable widget for displaying the natal chart
 * Desktop: Bottom-left corner widget
 * Mobile: Bottom sheet modal
 *
 * Uses natalChartStore for settings and widget state.
 * Chart data (positions, results) comes from props.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from 'next-themes';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Circle,
  Sparkles,
  Settings2,
  X,
} from 'lucide-react';
import { NatalChart, PlanetInfoList } from './NatalChart';
import { NatalChartSettings } from './NatalChartSettings';
import type {
  PlanetaryPosition,
  NatalChartResult,
  NatalChartSettings as NatalSettings,
  RelocationChartResult,
} from '@/lib/astro-types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useNatalChartSettings,
  useNatalChartMinimized,
  useNatalChartShowSettings,
  useNatalChartWidgetActions,
  useNatalChartSettingsActions,
} from '@/stores/natalChartStore';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

interface NatalChartWidgetProps {
  // Chart data - required
  planetaryPositions: PlanetaryPosition[];
  natalChartResult?: NatalChartResult;  // Enhanced natal chart data from WASM
  ascendant?: number;
  midheaven?: number;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  // Widget state - optional, uses store by default
  isMinimized?: boolean;
  onToggleMinimized?: () => void;
  onClose?: () => void;
  settings?: NatalSettings;
  onSettingsChange?: (settings: NatalSettings) => void;
  // Duo mode / Partner chart props
  isDuoMode?: boolean;
  personName?: string;
  partnerPlanetaryPositions?: PlanetaryPosition[];
  partnerNatalChartResult?: NatalChartResult;
  partnerAscendant?: number;
  partnerMidheaven?: number;
  partnerName?: string;
  // Relocation chart props
  relocationResult?: RelocationChartResult | null;
  relocationLocationName?: string;
}

export const NatalChartWidget: React.FC<NatalChartWidgetProps> = (props) => {
  const {
    planetaryPositions,
    natalChartResult,
    ascendant = 0,
    midheaven,
    birthDate,
    birthTime,
    birthLocation,
    onClose,
    // Duo mode props
    isDuoMode = false,
    personName = 'You',
    partnerPlanetaryPositions,
    partnerNatalChartResult,
    partnerAscendant = 0,
    partnerMidheaven,
    partnerName = 'Partner',
    // Relocation props
    relocationResult,
    relocationLocationName,
  } = props;

  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  // Tab state for duo mode: 'self' or 'partner'
  const [activeTab, setActiveTab] = useState<'self' | 'partner'>('self');
  // Tab state for relocation mode: 'natal' or 'relocated'
  const [relocationTab, setRelocationTab] = useState<'natal' | 'relocated'>('natal');

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

  // Check if relocation data is available
  const hasRelocationData = !!relocationResult && relocationResult.planets.length > 0;

  // Get store values
  const storeSettings = useNatalChartSettings();
  const storeIsMinimized = useNatalChartMinimized();
  const storeShowSettings = useNatalChartShowSettings();
  const { toggleMinimized, toggleSettings, setShowSettings: storeSetShowSettings } = useNatalChartWidgetActions();
  const { setSettings: storeSetSettings } = useNatalChartSettingsActions();

  // Use props or store values
  const isMinimized = props.isMinimized ?? storeIsMinimized;
  const onToggleMinimized = props.onToggleMinimized ?? toggleMinimized;
  const settings = props.settings ?? storeSettings;
  const showSettings = storeShowSettings;
  const setShowSettings = storeSetShowSettings;

  // Determine which chart data to show based on active tab
  const showingPartner = isDuoMode && activeTab === 'partner';
  const showingRelocated = hasRelocationData && relocationTab === 'relocated';

  // Use natal chart result data if available, or relocated data if showing relocated
  const effectiveAscendant = showingRelocated
    ? relocationResult!.relocatedAscendant
    : showingPartner
      ? (partnerNatalChartResult?.ascendant ?? partnerAscendant)
      : (natalChartResult?.ascendant ?? ascendant);
  const effectiveMidheaven = showingRelocated
    ? relocationResult!.relocatedMidheaven
    : showingPartner
      ? (partnerNatalChartResult?.midheaven ?? partnerMidheaven)
      : (natalChartResult?.midheaven ?? midheaven);
  const houseCusps = showingRelocated
    ? relocationResult!.relocatedHouseCusps
    : showingPartner
      ? partnerNatalChartResult?.houseCusps
      : natalChartResult?.houseCusps;

  // Convert relocation planets to natal planet format for display
  const relocatedNatalPositions = showingRelocated && relocationResult
    ? relocationResult.planets.map(p => ({
        planet: p.planet,
        longitude: p.longitude,
        signIndex: Math.floor(p.longitude / 30),
        signName: p.signName,
        degreeInSign: p.degreeInSign,
        retrograde: false, // Relocation doesn't change retrograde status
        house: p.relocatedHouse, // Use the relocated house
      }))
    : undefined;

  const natalPositions = showingRelocated
    ? relocatedNatalPositions
    : showingPartner
      ? partnerNatalChartResult?.planets
      : natalChartResult?.planets;
  const currentPositions = showingPartner
    ? (partnerPlanetaryPositions || [])
    : planetaryPositions;
  const currentChartResult = showingRelocated
    ? {
        ...natalChartResult!,
        ascendant: relocationResult!.relocatedAscendant,
        midheaven: relocationResult!.relocatedMidheaven,
        descendant: relocationResult!.relocatedDescendant,
        imumCoeli: relocationResult!.relocatedIc,
        houseCusps: relocationResult!.relocatedHouseCusps,
        planets: relocatedNatalPositions!,
      }
    : showingPartner
      ? partnerNatalChartResult
      : natalChartResult;

  const handleSettingsChange = (newSettings: NatalSettings) => {
    // Update store
    storeSetSettings(newSettings);
    // Also call prop callback if provided (for backwards compatibility)
    props.onSettingsChange?.(newSettings);
  };

  // Mobile: Bottom sheet style
  if (isMobile) {
    if (isMinimized) {
      return null; // Widget is hidden on mobile when minimized
    }

    return (
      <div className={`fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300 ${isMaximized ? 'inset-0' : ''}`}>
        <div
          className={`bg-white dark:bg-[#0a0a0a] backdrop-blur-md shadow-2xl border-t border-slate-200 dark:border-white/10 flex flex-col ${isMaximized ? 'rounded-none' : 'rounded-t-3xl'}`}
          style={{
            height: isMaximized ? '100dvh' : undefined,
            maxHeight: isMaximized ? '100dvh' : '85vh',
            paddingTop: isMaximized ? 'env(safe-area-inset-top, 0px)' : undefined,
          }}
        >
          {/* Drag handle - hide when maximized */}
          {!isMaximized && (
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 border-b border-slate-200 dark:border-white/10 flex-shrink-0"
            style={{
              paddingTop: isMaximized ? '12px' : '0',
              paddingBottom: '12px',
            }}
          >
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                showingRelocated
                  ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                  : showingPartner
                    ? 'bg-gradient-to-br from-pink-400 to-rose-500'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500'
              }`}>
                <Circle className="w-4 h-4 text-white" fill="white" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  {isDuoMode
                    ? (showingPartner ? partnerName : personName) + (showingRelocated ? "'s Relocated" : "'s Chart")
                    : showingRelocated
                      ? 'Relocated Chart'
                      : 'Birth Chart'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {showingRelocated && relocationLocationName ? `@ ${relocationLocationName} · ` : ''}
                  {settings.zodiacType === 'sidereal' ? 'Vedic' : 'Western'} · {settings.houseSystem}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${showSettings ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}
              >
                <Settings2 className={`w-5 h-5 ${showSettings ? 'text-amber-600' : 'text-slate-500'}`} />
              </button>
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

          {/* Duo Mode Tabs */}
          {isDuoMode && (
            <div className="flex px-5 pt-3 gap-2">
              <button
                onClick={() => setActiveTab('self')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'self'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {personName}
              </button>
              <button
                onClick={() => setActiveTab('partner')}
                disabled={!partnerPlanetaryPositions || partnerPlanetaryPositions.length === 0}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'partner'
                    ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                } ${(!partnerPlanetaryPositions || partnerPlanetaryPositions.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {partnerName}
              </button>
            </div>
          )}

          {/* Relocation Tabs - show when relocation data is available */}
          {hasRelocationData && (
            <div className="flex px-5 pt-3 gap-2">
              <button
                onClick={() => setRelocationTab('natal')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  relocationTab === 'natal'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                Birth Location
              </button>
              <button
                onClick={() => setRelocationTab('relocated')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  relocationTab === 'relocated'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {relocationLocationName || 'Relocated'}
              </button>
            </div>
          )}

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Settings Panel */}
              {showSettings && (
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                  <NatalChartSettings
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    compact={false}
                  />
                </div>
              )}

              {/* Chart */}
              <div className="flex justify-center">
                <NatalChart
                  planetaryPositions={currentPositions}
                  natalPositions={natalPositions}
                  ascendant={effectiveAscendant}
                  midheaven={effectiveMidheaven}
                  houseCusps={houseCusps}
                  houseSystem={settings.houseSystem}
                  zodiacType={settings.zodiacType}
                  ayanamsa={currentChartResult?.ayanamsa}
                  size={isMaximized ? 340 : (isExpanded ? 320 : 260)}
                  showHouses={settings.showHouses}
                  isDark={isDark}
                />
              </div>

              {/* Birth info */}
              {birthLocation && (
                <div className="text-center text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-2">
                  {birthDate && birthTime && (
                    <span className="block">{birthDate} at {birthTime}</span>
                  )}
                  {birthLocation}
                </div>
              )}

              {/* Planet positions - show when expanded or maximized */}
              {(isExpanded || isMaximized) && (
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${showingPartner ? 'text-pink-500' : 'text-amber-500'}`} />
                    Planet Positions
                  </h4>
                  <PlanetInfoList
                    planetaryPositions={currentPositions}
                    natalPositions={natalPositions}
                    showHouses={settings.showHouses}
                    compact={false}
                    isDark={isDark}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Desktop: Bottom-left corner widget
  if (isMinimized) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-white dark:hover:bg-[#0a0a0a] transition-colors"
        onClick={onToggleMinimized}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Circle className="w-2.5 h-2.5 text-white" fill="white" />
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Birth Chart
        </span>
        <ChevronUp className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  return (
    <Card
      className={`bg-white/95 dark:bg-[#0a0a0a]/95 dark:border-white/10 backdrop-blur-md shadow-lg transition-all duration-300 ${
        isExpanded ? 'w-[420px]' : 'w-72'
      }`}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            showingRelocated
              ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
              : showingPartner
                ? 'bg-gradient-to-br from-pink-400 to-rose-500'
                : 'bg-gradient-to-br from-amber-400 to-orange-500'
          }`}>
            <Circle className="w-2.5 h-2.5 text-white" fill="white" />
          </div>
          <div>
            <span>
              {isDuoMode
                ? (showingPartner ? partnerName : personName) + (showingRelocated ? "'s Relocated" : "'s Chart")
                : showingRelocated
                  ? 'Relocated Chart'
                  : 'Birth Chart'}
            </span>
            <span className="text-[10px] text-slate-400 font-normal ml-1.5">
              {showingRelocated && relocationLocationName ? `@ ${relocationLocationName}` : settings.zodiacType === 'sidereal' ? 'Vedic' : 'Western'}
            </span>
          </div>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${showSettings ? 'bg-amber-100 dark:bg-amber-900/30' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className={`h-3.5 w-3.5 ${showSettings ? 'text-amber-600' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleMinimized}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Duo Mode Tabs */}
        {isDuoMode && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('self')}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                activeTab === 'self'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {personName}
            </button>
            <button
              onClick={() => setActiveTab('partner')}
              disabled={!partnerPlanetaryPositions || partnerPlanetaryPositions.length === 0}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                activeTab === 'partner'
                  ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              } ${(!partnerPlanetaryPositions || partnerPlanetaryPositions.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {partnerName}
            </button>
          </div>
        )}

        {/* Relocation Tabs - show when relocation data is available */}
        {hasRelocationData && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setRelocationTab('natal')}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                relocationTab === 'natal'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Birth Location
            </button>
            <button
              onClick={() => setRelocationTab('relocated')}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                relocationTab === 'relocated'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {relocationLocationName || 'Relocated'}
            </button>
          </div>
        )}

        {/* Settings Panel (expanded only) */}
        {showSettings && isExpanded && (
          <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
            <NatalChartSettings
              settings={settings}
              onSettingsChange={handleSettingsChange}
              compact={true}
            />
          </div>
        )}

        {/* Settings indicator (compact) */}
        {showSettings && !isExpanded && (
          <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
            <NatalChartSettings
              settings={settings}
              onSettingsChange={handleSettingsChange}
              compact={true}
            />
          </div>
        )}

        {/* Birth info */}
        {(birthDate || birthTime || birthLocation) && !showSettings && !isDuoMode && (
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 rounded px-2 py-1 text-center">
            {birthDate && birthTime && (
              <span>
                {birthDate} at {birthTime}
              </span>
            )}
            {birthLocation && (
              <span className="block text-[10px] mt-0.5">{birthLocation}</span>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="flex justify-center">
          <NatalChart
            planetaryPositions={currentPositions}
            natalPositions={natalPositions}
            ascendant={effectiveAscendant}
            midheaven={effectiveMidheaven}
            houseCusps={houseCusps}
            houseSystem={settings.houseSystem}
            zodiacType={settings.zodiacType}
            ayanamsa={currentChartResult?.ayanamsa}
            size={isExpanded ? 300 : 200}
            showHouses={settings.showHouses}
            isDark={isDark}
          />
        </div>

        {/* Planet positions - only show when expanded */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-200 dark:border-white/10">
            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <Sparkles className={`w-3 h-3 ${showingPartner ? 'text-pink-500' : 'text-amber-500'}`} />
              Positions
            </h4>
            <PlanetInfoList
              planetaryPositions={currentPositions}
              natalPositions={natalPositions}
              showHouses={settings.showHouses}
              compact={true}
              isDark={isDark}
            />
          </div>
        )}

        {/* Compact planet list when not expanded */}
        {!isExpanded && !showSettings && (
          <PlanetInfoList
            planetaryPositions={currentPositions}
            natalPositions={natalPositions}
            showHouses={settings.showHouses}
            compact={true}
            isDark={isDark}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default NatalChartWidget;
