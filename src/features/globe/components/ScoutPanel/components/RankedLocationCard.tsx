/**
 * RankedLocationCard Component
 *
 * Card with rank badge for top locations view.
 * Shows city name, country, rank, score, and expandable planetary influences.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, ChevronDown, Navigation } from 'lucide-react';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import { cn } from '@/lib/utils';
import { getCountryFlag } from '../constants';
import { getPlainLanguageInfluence } from '../../../utils/scout-utils';
import type { RankedLocationCardProps } from '../types';

export const RankedLocationCard: React.FC<RankedLocationCardProps> = ({
  location,
  rank,
  category,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isBeneficial = location.nature === 'beneficial';
  const hasMoreInfluences = location.influences.length > 1;
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
        rank > 3 && (isBeneficial
          ? 'border-green-500/20 hover:border-green-500/40'
          : 'border-amber-500/20 hover:border-amber-500/40'),
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
                {getCountryFlag(location.countryName)} {location.countryName}
              </span>
            </div>
          </div>

          {/* Nature Badge + Score */}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
              isBeneficial
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            )}>
              {isBeneficial ? <ThumbsUp className="h-2.5 w-2.5" /> : <ThumbsDown className="h-2.5 w-2.5" />}
              {isBeneficial ? 'Beneficial' : 'Challenging'}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              {location.distance} km
            </span>
          </div>

          {/* Key Influence Pill */}
          {location.influences.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium',
                'bg-slate-100 dark:bg-white/[0.03] border',
                isBeneficial ? 'border-green-500/20 text-green-700 dark:text-green-300' : 'border-amber-500/20 text-amber-700 dark:text-amber-300'
              )}>
                {location.influences[0].planet} {location.influences[0].lineType}
              </span>
              {hasMoreInfluences && !isExpanded && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  +{location.influences.length - 1} more
                </span>
              )}
            </div>
          )}

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 space-y-2">
                  {location.influences.map((influence, idx) => (
                    <div key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                      <span className={cn(
                        'font-medium',
                        isBeneficial ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                      )}>
                        {influence.planet} {influence.lineType}:
                      </span>{' '}
                      {getPlainLanguageInfluence(influence, category)}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Score Badge */}
        <div className={cn(
          'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border',
          location.overallScore >= 80 && 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
          location.overallScore >= 60 && location.overallScore < 80 && 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
          location.overallScore >= 40 && location.overallScore < 60 && 'bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400',
          location.overallScore < 40 && 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
        )}>
          {location.overallScore}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      {hasMoreInfluences && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-end">
          <button
            className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show less' : 'Show details'}
            <ChevronDown className={cn('h-3 w-3 inline ml-0.5 transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </div>
      )}
    </div>
  );
};

export default RankedLocationCard;
