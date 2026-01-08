/**
 * LocationCard Component
 *
 * Basic location card with expandable influences for category view.
 * Shows city name, distance, score, and planetary influences.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Navigation } from 'lucide-react';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import { cn } from '@/lib/utils';
import { getPlainLanguageInfluence } from '../../../utils/scout-utils';
import type { LocationCardProps } from '../types';

export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  category,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isBeneficial = location.nature === 'beneficial';
  const hasMoreInfluences = location.influences.length > 2;
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

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl cursor-pointer',
        'bg-white dark:bg-white/[0.02] backdrop-blur-sm',
        'border transition-all duration-300',
        isBeneficial
          ? 'border-green-500/20 hover:border-green-500/40 hover:bg-green-50 dark:hover:bg-green-500/[0.05]'
          : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/[0.05]'
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              isBeneficial ? 'bg-green-500/10' : 'bg-amber-500/10'
            )}>
              <MapPin className={cn(
                'h-4 w-4',
                isBeneficial ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              )} />
            </div>
            <div className="min-w-0">
              <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate block">{location.city.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Navigation className="h-2.5 w-2.5" />
                  {location.distance} km
                </span>
              </div>
            </div>
          </div>
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

      {/* Influence Pills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {location.influences.slice(0, isExpanded ? undefined : 2).map((influence, idx) => (
          <span
            key={idx}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium',
              'bg-slate-100 dark:bg-white/[0.03] border',
              isBeneficial ? 'border-green-500/20 text-green-700 dark:text-green-300' : 'border-amber-500/20 text-amber-700 dark:text-amber-300'
            )}
          >
            {influence.planet} {influence.lineType}
            {influence.isAspect && ` · ${influence.aspectType}`}
          </span>
        ))}
        {hasMoreInfluences && !isExpanded && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            +{location.influences.length - 2} more
          </span>
        )}
      </div>

      {/* Expanded Influence Details */}
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

export default LocationCard;
