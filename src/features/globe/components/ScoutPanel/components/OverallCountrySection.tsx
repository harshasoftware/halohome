/**
 * OverallCountrySection Component
 *
 * Country section for overall view with collapsible location list.
 * Shows country header with beneficial/challenging counts and expandable city list
 * using OverallLocationCard for cross-category ranking display.
 */

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountryFlag } from '../constants';
import { OverallLocationCard } from './OverallLocationCard';
import type { OverallCountrySectionProps, ScoutMarker } from '../types';

export const OverallCountrySection: React.FC<OverallCountrySectionProps> = ({
  country,
  isExpanded,
  onToggle,
  onCityClick,
  onShowMarkers,
}) => {
  // Convert country locations to markers for globe display
  const handleShowOnGlobe = useCallback(() => {
    if (!onShowMarkers) return;
    const markers: ScoutMarker[] = country.locations.map(loc => ({
      lat: loc.city.lat,
      lng: loc.city.lng,
      name: loc.city.name,
      nature: loc.beneficialCategories > loc.challengingCategories ? 'beneficial' : 'challenging',
    }));
    onShowMarkers(markers);
  }, [country.locations, onShowMarkers]);

  return (
    <div className="border-b border-slate-200 dark:border-white/5 last:border-b-0">
      {/* Country Header */}
      <button
        className={cn(
          'w-full px-4 py-3.5 flex items-center justify-between',
          'transition-all duration-300',
          'hover:bg-slate-100 dark:hover:bg-white/[0.03]',
          isExpanded && 'bg-slate-50 dark:bg-white/[0.02]'
        )}
        onClick={() => {
          onToggle();
          handleShowOnGlobe();
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{getCountryFlag(country.country) || '🌍'}</span>
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{country.country}</span>
          <div className="flex items-center gap-1.5">
            {/* Beneficial/Challenging counts */}
            {country.beneficialCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                <ThumbsUp className="h-2 w-2" />
                {country.beneficialCount}
              </span>
            )}
            {country.challengingCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ThumbsDown className="h-2 w-2" />
                {country.challengingCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{country.locations.length} cities</span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </motion.div>
        </div>
      </button>

      {/* Expanded Locations - sorted by totalScore (highest first) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2">
              {country.locations.map((location, idx) => (
                <OverallLocationCard
                  key={`${location.city.name}-${location.city.country}-${idx}`}
                  location={location}
                  rank={idx + 1}
                  onClick={() => onCityClick(location)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OverallCountrySection;
