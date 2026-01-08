/**
 * AstrologyTab Component
 * Displays planetary line influences analysis for a city/location
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, ChevronDown, ChevronUp, Navigation, Loader2, Globe } from 'lucide-react';
import { PLANET_COLORS } from '@/lib/astro-types';
import type { LocationAnalysis, LineInfluence, InfluenceLevel } from '@/lib/location-line-utils';
import { getInfluenceLevelColor } from '@/lib/location-line-utils';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

interface AstrologyTabProps {
  analysis: LocationAnalysis | null;
  loading?: boolean;
  onRelocate?: (lat: number, lng: number) => void;
  onViewRelocationChart?: () => void;
}

const INFLUENCE_LEVEL_LABELS: Record<InfluenceLevel, string> = {
  zenith: 'Zenith',
  gold: 'Power Zone',
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
};

const InfluenceBadge: React.FC<{ level: InfluenceLevel }> = ({ level }) => {
  const color = getInfluenceLevelColor(level);
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {INFLUENCE_LEVEL_LABELS[level]}
    </span>
  );
};

const LineInfluenceItem: React.FC<{ influence: LineInfluence; index: number }> = ({ influence, index }) => {
  const [expanded, setExpanded] = useState(index < 3);
  const planetColor = PLANET_COLORS[influence.planet as keyof typeof PLANET_COLORS] || '#888';
  const setHighlightedLine = useGlobeInteractionStore((s) => s.setHighlightedLine);

  const handleMouseEnter = useCallback(() => {
    // Set the highlighted line for the globe to pick up
    setHighlightedLine({
      planet: influence.planet,
      lineType: influence.lineType || influence.aspectType || '',
    });
  }, [influence.planet, influence.lineType, influence.aspectType, setHighlightedLine]);

  const handleMouseLeave = useCallback(() => {
    setHighlightedLine(null);
  }, [setHighlightedLine]);

  return (
    <div
      className="border-b border-slate-100 dark:border-slate-800 last:border-0 py-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded p-1 -m-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: planetColor }}
          />
          <span className="text-sm font-medium">
            {influence.planet}
            {influence.lineType && ` ${influence.lineType}`}
            {influence.aspectType && ` ${influence.aspectType}`}
          </span>
          <InfluenceBadge level={influence.influenceLevel} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{influence.distance}km</span>
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-2 ml-5 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${influence.influenceScore}%`,
                  backgroundColor: planetColor,
                }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: planetColor }}>
              {influence.influenceScore}%
            </span>
          </div>
          {influence.distanceFromZenith !== undefined && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              {influence.distanceFromZenith}km from zenith point
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {influence.interpretation}
          </p>
          {influence.type === 'aspect' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${influence.isHarmonious ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'}`}>
              {influence.isHarmonious ? 'Harmonious' : 'Challenging'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const AstrologyTab: React.FC<AstrologyTabProps> = ({ analysis, loading = false, onRelocate, onViewRelocationChart }) => {
  const [showAllLines, setShowAllLines] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
        <p className="text-sm text-slate-500">Analyzing planetary influences...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Sparkles className="w-10 h-10 text-purple-300 mb-3" />
        <p className="text-sm text-slate-500 text-center">
          No birth data available to analyze planetary influences.
        </p>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Enter your birth details to see astrocartography analysis for this location.
        </p>
      </div>
    );
  }

  const displayedLines = showAllLines ? analysis.lines : analysis.lines.slice(0, 5);
  const hasMoreLines = analysis.lines.length > 5;

  // Determine overall quality indicator
  const getQualityIndicator = () => {
    if (analysis.aggregateScore >= 80) return { label: 'Exceptional', color: '#E11D48' };
    if (analysis.aggregateScore >= 60) return { label: 'Strong', color: '#FFD700' };
    if (analysis.aggregateScore >= 40) return { label: 'Notable', color: '#22C55E' };
    if (analysis.aggregateScore >= 20) return { label: 'Moderate', color: '#3B82F6' };
    return { label: 'Minimal', color: '#94A3B8' };
  };

  const quality = getQualityIndicator();

  return (
    <div className="p-4 pb-8 space-y-4">
      {/* Aggregate Score */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: quality.color }} />
            <span className="text-sm font-medium">Influence Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: quality.color }}>
              {analysis.aggregateScore}
            </span>
            <span className="text-sm text-slate-500">{quality.label}</span>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${analysis.aggregateScore}%`,
              backgroundColor: quality.color,
            }}
          />
        </div>
      </div>

      {/* Dominant Planets */}
      {analysis.dominantPlanets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Dominant Energies
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {analysis.dominantPlanets.map((planet) => {
              const color = PLANET_COLORS[planet as keyof typeof PLANET_COLORS] || '#888';
              return (
                <span
                  key={planet}
                  className="text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                    border: `1px solid ${color}40`,
                  }}
                >
                  {planet}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Overall Interpretation */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {analysis.overallInterpretation}
        </p>
      </div>

      {/* Line Influences */}
      {analysis.lines.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            Nearby Lines ({analysis.lines.length})
          </h4>
          <div className="space-y-0 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            {displayedLines.map((influence, index) => (
              <LineInfluenceItem
                key={`${influence.planet}-${influence.lineType || influence.aspectType}-${index}`}
                influence={influence}
                index={index}
              />
            ))}
          </div>
          {hasMoreLines && (
            <button
              onClick={() => setShowAllLines(!showAllLines)}
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 py-1"
            >
              {showAllLines ? 'Show less' : `Show ${analysis.lines.length - 5} more lines`}
            </button>
          )}
        </div>
      )}

      {/* No Lines Message */}
      {analysis.lines.length === 0 && (
        <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No significant planetary influences at this location.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            This area is relatively neutral astrologically.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {onViewRelocationChart && (
          <Button
            onClick={onViewRelocationChart}
            variant="outline"
            className="w-full border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30"
          >
            <Globe className="w-4 h-4 mr-2 text-purple-600" />
            View Relocation Chart
          </Button>
        )}
        {onRelocate && (
          <Button
            onClick={() => onRelocate(analysis.latitude, analysis.longitude)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Relocate Here
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
          Influence Levels
        </h4>
        <div className="flex flex-wrap gap-2">
          {(['zenith', 'gold', 'strong', 'moderate'] as InfluenceLevel[]).map((level) => (
            <div key={level} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getInfluenceLevelColor(level) }}
              />
              <span className="text-xs text-slate-500">
                {INFLUENCE_LEVEL_LABELS[level]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AstrologyTab;
