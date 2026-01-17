/**
 * MobileLocationAnalysisSheet - Bottom sheet for location analysis on mobile
 *
 * Shows the analysis results when user double-taps on a location on the globe.
 */

import React, { useState } from 'react';
import type { LocationAnalysis } from '@/lib/location-line-utils';
import { MobileBottomSheet } from './MobileBottomSheet';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

// Planet colors for styling
const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700',
  Moon: '#C0C0C0',
  Mercury: '#B8860B',
  Venus: '#FF69B4',
  Mars: '#DC143C',
  Jupiter: '#9400D3',
  Saturn: '#8B4513',
  Uranus: '#00CED1',
  Neptune: '#4169E1',
  Pluto: '#2F4F4F',
};

interface MobileLocationAnalysisSheetProps {
  analysis: LocationAnalysis;
  onClose: () => void;
}

export const MobileLocationAnalysisSheet: React.FC<MobileLocationAnalysisSheetProps> = ({
  analysis,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const handleClose = () => {
    setMobileSheetMaximized(false);
    onClose();
  };

  const icon = (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  );

  return (
    <MobileBottomSheet
      onClose={handleClose}
      title="Location Analysis"
      subtitle={`${analysis.latitude.toFixed(4)}°, ${analysis.longitude.toFixed(4)}°`}
      icon={icon}
      maxHeight="70vh"
      allowMaximize={true}
      isMaximized={isMaximized}
      onToggleMaximize={() => setIsMaximized(!isMaximized)}
      onMaximizeChange={setMobileSheetMaximized}
    >
      <div className="px-5 py-4 space-y-4">
        {/* Score display */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{
                background:
                  analysis.aggregateScore >= 60
                    ? '#FFD700'
                    : analysis.aggregateScore >= 40
                    ? '#22C55E'
                    : analysis.aggregateScore >= 20
                    ? '#3B82F6'
                    : '#94A3B8',
              }}
            >
              {analysis.aggregateScore}
            </div>
            <div>
              <p className="font-semibold text-base">
                {analysis.aggregateScore >= 60
                  ? 'Strong'
                  : analysis.aggregateScore >= 40
                  ? 'Notable'
                  : analysis.aggregateScore >= 20
                  ? 'Moderate'
                  : 'Minimal'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Influence Score</p>
            </div>
          </div>
          {analysis.dominantPlanets.length > 0 && (
            <div className="flex -space-x-2">
              {analysis.dominantPlanets.slice(0, 3).map((planet) => (
                <div
                  key={planet}
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: PLANET_COLORS[planet] || '#888' }}
                  title={planet}
                >
                  {planet.charAt(0)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interpretation */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {analysis.overallInterpretation}
          </p>
        </div>

        {/* Nearby lines summary */}
        {analysis.lines.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
              Nearby Lines ({analysis.lines.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.lines.slice(0, 6).map((line, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: `${PLANET_COLORS[line.planet] || '#888'}20`,
                    color: PLANET_COLORS[line.planet] || '#888',
                    border: `1px solid ${PLANET_COLORS[line.planet] || '#888'}40`,
                  }}
                >
                  {line.planet} {line.lineType || line.aspectType}
                </span>
              ))}
              {analysis.lines.length > 6 && (
                <span className="text-xs px-2 py-1 text-slate-500">
                  +{analysis.lines.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </MobileBottomSheet>
  );
};

export default MobileLocationAnalysisSheet;
