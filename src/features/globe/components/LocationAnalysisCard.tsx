/**
 * LocationAnalysisCard Component
 * Displays Vastu analysis of energy influences at a specific coordinate
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, MapPin, ChevronDown, ChevronUp, Sparkles, TrendingUp } from 'lucide-react';
import { PLANET_COLORS } from '@/lib/astro-types';
import type { LocationAnalysis, LineInfluence, InfluenceLevel } from '@/lib/location-line-utils';
import { getInfluenceLevelColor } from '@/lib/location-line-utils';

interface LocationAnalysisCardProps {
  analysis: LocationAnalysis;
  onClose: () => void;
  isMobile?: boolean;
}

const INFLUENCE_LEVEL_LABELS: Record<InfluenceLevel, string> = {
  zenith: 'Zenith',
  gold: 'Power Zone',
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
};

const INFLUENCE_LEVEL_DESCRIPTION: Record<InfluenceLevel, string> = {
  zenith: 'Directly under planetary zenith - planet at maximum overhead power, most intense expression',
  gold: 'Within 200km of line - exceptional planetary activation, strongly felt in daily life',
  strong: 'Within 350km - notable influence, planet themes clearly present in experiences',
  moderate: 'Within 500km - detectable influence, subtle but observable planetary effects',
  weak: 'Beyond 500km - minimal influence, faint planetary coloring of experiences',
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
  const [expanded, setExpanded] = useState(index < 3); // Auto-expand top 3
  const planetColor = PLANET_COLORS[influence.planet as keyof typeof PLANET_COLORS] || '#888';

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0 py-2">
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
              ✨ {influence.distanceFromZenith}km from zenith point
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

export const LocationAnalysisCard: React.FC<LocationAnalysisCardProps> = ({
  analysis,
  onClose,
  isMobile = false,
}) => {
  const [showAllLines, setShowAllLines] = useState(false);
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

  if (isMobile) {
    return (
      <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div style={{ width: 44 }} />
          <h2 className="flex-1 text-center text-xl font-semibold flex items-center justify-center gap-2">
            <MapPin className="w-5 h-5 text-slate-500" />
            Location Analysis
          </h2>
          <button
            onClick={onClose}
            className="border border-slate-300 dark:border-slate-700 bg-transparent rounded-full p-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ width: 44, height: 44 }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {/* Coordinates */}
          <div className="text-center text-base text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
            {analysis.latitude.toFixed(4)}°, {analysis.longitude.toFixed(4)}°
          </div>

          {/* Aggregate Score - Large display */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6" style={{ color: quality.color }} />
              <span className="text-lg font-medium">Influence Score</span>
            </div>
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  className="dark:stroke-slate-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={quality.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${analysis.aggregateScore * 2.83} 283`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: quality.color }}>
                  {analysis.aggregateScore}
                </span>
                <span className="text-sm text-slate-500">{quality.label}</span>
              </div>
            </div>
          </div>

          {/* Dominant Planets */}
          {analysis.dominantPlanets.length > 0 && (
            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-base font-medium text-slate-600 dark:text-slate-300">
                  Dominant Energies
                </span>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {analysis.dominantPlanets.map((planet) => {
                  const color = PLANET_COLORS[planet as keyof typeof PLANET_COLORS] || '#888';
                  return (
                    <span
                      key={planet}
                      className="text-base px-4 py-2 rounded-full font-medium"
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
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <p className="text-base text-slate-700 dark:text-slate-200 leading-relaxed">
              {analysis.overallInterpretation}
            </p>
          </div>

          {/* Line Influences */}
          {analysis.lines.length > 0 && (
            <div>
              <h4 className="text-base font-medium text-slate-600 dark:text-slate-300 mb-3">
                Nearby Lines ({analysis.lines.length})
              </h4>
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                {displayedLines.map((influence, index) => (
                  <LineInfluenceItem key={`${influence.planet}-${influence.lineType || influence.aspectType}-${index}`} influence={influence} index={index} />
                ))}
              </div>
              {hasMoreLines && (
                <button
                  onClick={() => setShowAllLines(!showAllLines)}
                  className="w-full text-base text-blue-600 dark:text-blue-400 hover:underline mt-3 py-2"
                >
                  {showAllLines ? 'Show less' : `Show ${analysis.lines.length - 5} more lines`}
                </button>
              )}
            </div>
          )}

          {/* No Lines Message */}
          {analysis.lines.length === 0 && (
            <div className="text-center py-8">
              <p className="text-base text-slate-500 dark:text-slate-400">
                No significant energy influences at this location.
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                Try analyzing a different location on the map.
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
              Influence Levels
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {(['zenith', 'gold', 'strong', 'moderate'] as InfluenceLevel[]).map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getInfluenceLevelColor(level) }}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {INFLUENCE_LEVEL_LABELS[level]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 pb-8 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose} variant="outline" className="w-full h-14 text-lg">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg max-h-[80vh] flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500" />
          Location Analysis
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 overflow-y-auto flex-1">
        {/* Coordinates */}
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded px-2 py-1">
          {analysis.latitude.toFixed(4)}°, {analysis.longitude.toFixed(4)}°
        </div>

        {/* Aggregate Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: quality.color }} />
            <span className="text-sm font-medium">Influence Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${analysis.aggregateScore}%`,
                  backgroundColor: quality.color,
                }}
              />
            </div>
            <span className="text-sm font-bold" style={{ color: quality.color }}>
              {analysis.aggregateScore}
            </span>
          </div>
        </div>

        {/* Dominant Planets */}
        {analysis.dominantPlanets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Dominant Energies
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {analysis.dominantPlanets.map((planet) => {
                const color = PLANET_COLORS[planet as keyof typeof PLANET_COLORS] || '#888';
                return (
                  <span
                    key={planet}
                    className="text-xs px-2 py-1 rounded-full font-medium"
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
            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Nearby Lines ({analysis.lines.length})
            </h4>
            <div className="space-y-0">
              {displayedLines.map((influence, index) => (
                <LineInfluenceItem key={`${influence.planet}-${influence.lineType || influence.aspectType}-${index}`} influence={influence} index={index} />
              ))}
            </div>
            {hasMoreLines && (
              <button
                onClick={() => setShowAllLines(!showAllLines)}
                className="w-full text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 py-1"
              >
                {showAllLines ? 'Show less' : `Show ${analysis.lines.length - 5} more lines`}
              </button>
            )}
          </div>
        )}

        {/* No Lines Message */}
        {analysis.lines.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No significant energy influences at this location.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Try analyzing a different location on the map.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">
            Influence Levels
          </h4>
          <div className="flex flex-wrap gap-1">
            {(['zenith', 'gold', 'strong', 'moderate'] as InfluenceLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getInfluenceLevelColor(level) }}
                />
                <span className="text-[10px] text-slate-500">
                  {INFLUENCE_LEVEL_LABELS[level]}
                </span>
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default LocationAnalysisCard;
