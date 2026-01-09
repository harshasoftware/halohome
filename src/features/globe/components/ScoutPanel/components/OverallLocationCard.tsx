/**
 * OverallLocationCard Component
 *
 * Card for cross-category ranking in the overall view.
 * Shows city name, country, rank, beneficial/challenging summary,
 * category pills, and expandable category details.
 */

import React, { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Navigation, ChevronDown } from 'lucide-react';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import { cn } from '@/lib/utils';
import { getCountryFlag, CATEGORY_ICONS } from '../constants';
import { CATEGORY_INFO } from '../../../utils/scout-utils';
import type { OverallLocationCardProps } from '../types';

export const OverallLocationCard: React.FC<OverallLocationCardProps> = ({
  location,
  rank,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMostlyBeneficial = location.beneficialCategories > location.challengingCategories;
  const hasMoreCategories = location.categoryScores.length > 3;
  const setHighlightedScoutCity = useGlobeInteractionStore((s) => s.setHighlightedScoutCity);

  const handleMouseEnter = useCallback(() => {
    setHighlightedScoutCity({
      lat: location.city.lat,
      lng: location.city.lng,
      name: location.city.name,
    });
  }, [location.city, setHighlightedScoutCity]);

  const handleMouseLeave = useCallback(() => {
    setHighlightedScoutCity(null);
  }, [setHighlightedScoutCity]);

  // Rank styling - top 3 get special treatment (flat colors, no gradients)
  const getRankStyle = () => {
    if (rank === 1) return 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400';
    if (rank === 2) return 'bg-slate-500/10 border border-slate-400/40 text-slate-600 dark:text-slate-400';
    if (rank === 3) return 'bg-amber-600/10 border border-amber-600/30 text-amber-700 dark:text-amber-500';
    return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  };

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl cursor-pointer',
        'bg-white dark:bg-white/[0.02] backdrop-blur-sm',
        'border transition-all duration-300',
        // Top 3 get subtle border accent
        rank === 1 && 'border-amber-500/30',
        rank === 2 && 'border-slate-400/30',
        rank === 3 && 'border-amber-600/30',
        rank > 3 && 'border-amber-500/20 hover:border-amber-500/40',
        'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm',
          getRankStyle()
        )}>
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* City Name & Country */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate block">{location.city.name}</span>
              <span className="text-xs text-slate-500">
                {getCountryFlag(location.city.country)} {location.city.country}
              </span>
            </div>
          </div>

          {/* Category Summary Badges */}
          <div className="flex items-center gap-2 mt-2">
            {location.beneficialCategories > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <ThumbsUp className="h-2.5 w-2.5" />
                {location.beneficialCategories} good
              </span>
            )}
            {location.challengingCategories > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <ThumbsDown className="h-2.5 w-2.5" />
                {location.challengingCategories} challenging
              </span>
            )}
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              {location.distance} km
            </span>
          </div>

          {/* Category Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {location.categoryScores.slice(0, isExpanded ? undefined : 3).map((cs) => {
              const IconComponent = CATEGORY_ICONS[cs.category];
              return (
                <span
                  key={cs.category}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium',
                    'bg-slate-100 dark:bg-white/[0.03] border',
                    cs.nature === 'beneficial'
                      ? 'border-green-500/20 text-green-700 dark:text-green-300'
                      : 'border-amber-500/20 text-amber-700 dark:text-amber-300'
                  )}
                >
                  <IconComponent className="h-3 w-3" />
                  {CATEGORY_INFO[cs.category].label}
                </span>
              );
            })}
            {hasMoreCategories && !isExpanded && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                +{location.categoryScores.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Score Badge */}
        <div className={cn(
          'flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full text-sm font-bold border',
          isMostlyBeneficial
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            : 'bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400'
        )}>
          {location.totalScore}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      {hasMoreCategories && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-end">
          <button
            className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show less' : 'Show all categories'}
            <ChevronDown className={cn('h-3 w-3 inline ml-0.5 transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </div>
      )}
    </div>
  );
};

export default OverallLocationCard;
