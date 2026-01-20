/**
 * VastuPreferencesPane
 *
 * Vastu-only preferences UI (no astrocartography controls).
 * Currently contains "Scoring signals" toggles that affect Vastu scoring.
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { SlidersHorizontal, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUIStore } from '@/stores/uiStore';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import { useVastuPreferencesStore } from '@/stores/vastuPreferencesStore';

export const VastuPreferencesPane: React.FC = () => {
  const isMobile = useIsMobile();
  const [isMaximized, setIsMaximized] = useState(false);

  const isMinimized = useUIStore((s) => s.isLegendMinimized);
  const toggleMinimized = useUIStore((s) => s.toggleLegend);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const scoringPrefs = useVastuPreferencesStore((s) => s.scoring);
  const setConsiderNearbyCemeteries = useVastuPreferencesStore((s) => s.setConsiderNearbyCemeteries);
  const setConsiderCrimeRate = useVastuPreferencesStore((s) => s.setConsiderCrimeRate);
  const setConsiderSoilType = useVastuPreferencesStore((s) => s.setConsiderSoilType);
  const setConsiderNoisePollution = useVastuPreferencesStore((s) => s.setConsiderNoisePollution);
  const setConsiderAirQuality = useVastuPreferencesStore((s) => s.setConsiderAirQuality);
  const setConsiderNearbyFactories = useVastuPreferencesStore((s) => s.setConsiderNearbyFactories);

  const handleToggleMaximize = () => {
    const next = !isMaximized;
    setIsMaximized(next);
    setMobileSheetMaximized(next);
  };

  const handleClose = () => {
    if (isMaximized) {
      setMobileSheetMaximized(false);
      setIsMaximized(false);
    }
    toggleMinimized();
  };

  // Mobile: bottom sheet
  if (isMobile) {
    if (isMinimized) return null;

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
          {/* Header */}
          <div className="flex flex-col items-center border-b border-slate-200 dark:border-white/10 flex-shrink-0">
            {!isMaximized && (
              <div className="pt-2 pb-1">
                <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-600 rounded-full" />
              </div>
            )}
            <div className="flex items-center justify-between w-full px-4" style={{ paddingBottom: '12px', paddingTop: isMaximized ? '12px' : '0' }}>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-slate-800 dark:text-zinc-200">Preferences</span>
              </div>
              <div className="flex items-center gap-2">
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
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Scoring signals</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Include extra environmental signals when available.
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
                    Vastu
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Nearby cemeteries</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize homes near cemeteries.</p>
                    </div>
                    <Switch
                      checked={scoringPrefs.considerNearbyCemeteries}
                      onCheckedChange={setConsiderNearbyCemeteries}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Crime rate</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize higher-crime areas.</p>
                    </div>
                    <Switch
                      checked={scoringPrefs.considerCrimeRate}
                      onCheckedChange={setConsiderCrimeRate}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Soil grading</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize unstable / low-grade soil.</p>
                    </div>
                    <Switch
                      checked={scoringPrefs.considerSoilType}
                      onCheckedChange={setConsiderSoilType}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Noise pollution</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize noisy areas (traffic / airports).</p>
                    </div>
                    <Switch
                      checked={scoringPrefs.considerNoisePollution}
                      onCheckedChange={setConsiderNoisePollution}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Air quality (AQI)</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize poor air quality.</p>
                    </div>
                    <Switch
                      checked={scoringPrefs.considerAirQuality}
                      onCheckedChange={setConsiderAirQuality}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Nearby factories</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize heavy industry nearby.</p>
                    </div>
                    <Switch
                      checked={scoringPrefs.considerNearbyFactories}
                      onCheckedChange={setConsiderNearbyFactories}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Desktop: floating card
  if (isMinimized) return null;

  return (
    <Card className="w-80 bg-white/95 dark:bg-[#0a0a0a]/95 dark:border-white/10 backdrop-blur-md shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Preferences</span>
        </div>
        <button
          onClick={toggleMinimized}
          className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center"
          aria-label="Close preferences"
        >
          <X className="h-4 w-4 text-slate-600 dark:text-zinc-300" />
        </button>
      </div>
      <div className="p-3">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Scoring signals</p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                Include extra environmental signals when available.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
              Vastu
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Nearby cemeteries</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize homes near cemeteries.</p>
              </div>
              <Switch
                checked={scoringPrefs.considerNearbyCemeteries}
                onCheckedChange={setConsiderNearbyCemeteries}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Crime rate</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize higher-crime areas.</p>
              </div>
              <Switch
                checked={scoringPrefs.considerCrimeRate}
                onCheckedChange={setConsiderCrimeRate}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Soil grading</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize unstable / low-grade soil.</p>
              </div>
              <Switch
                checked={scoringPrefs.considerSoilType}
                onCheckedChange={setConsiderSoilType}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Noise pollution</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize noisy areas (traffic / airports).</p>
              </div>
              <Switch
                checked={scoringPrefs.considerNoisePollution}
                onCheckedChange={setConsiderNoisePollution}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Air quality (AQI)</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize poor air quality.</p>
              </div>
              <Switch
                checked={scoringPrefs.considerAirQuality}
                onCheckedChange={setConsiderAirQuality}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">Nearby factories</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Penalize heavy industry nearby.</p>
              </div>
              <Switch
                checked={scoringPrefs.considerNearbyFactories}
                onCheckedChange={setConsiderNearbyFactories}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VastuPreferencesPane;

