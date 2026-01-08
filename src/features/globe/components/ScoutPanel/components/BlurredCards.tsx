/**
 * BlurredCards Components
 *
 * Blurred placeholder cards shown to non-authenticated users.
 * These display fake city data to preview what the top locations look like
 * without revealing actual user-specific data (hack-proof).
 *
 * - BlurredOverallCard: For the overall cross-category view
 * - BlurredRankedCard: For the category-specific ranked view
 */

import React from 'react';
import { ThumbsUp, Navigation, Briefcase, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlurredOverallCardProps, BlurredRankedCardProps } from '../types';

/**
 * Blurred fake card for overall view (hack-proof placeholder)
 * Shows a blurred preview of what overall location cards look like
 */
export const BlurredOverallCard: React.FC<BlurredOverallCardProps> = ({ fakeCity, rank }) => {
  const getRankStyle = () => {
    if (rank <= 3) return 'bg-slate-500/10 border border-slate-400/40 text-slate-600 dark:text-slate-400';
    return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  };

  return (
    <div className="relative p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 select-none pointer-events-none">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[6px] bg-white/50 dark:bg-black/30 rounded-xl z-10" />

      <div className="flex items-start gap-3 blur-[2px]">
        {/* Rank Badge */}
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm',
          getRankStyle()
        )}>
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 block">{fakeCity.name}</span>
          <span className="text-xs text-slate-500">{'\ud83c\udf0d'} {fakeCity.country}</span>

          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <ThumbsUp className="h-2.5 w-2.5" />
              3 good
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              847 km
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/[0.03] border border-green-500/20 text-green-700 dark:text-green-300">
              <Briefcase className="h-3 w-3" />
              Career
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/[0.03] border border-green-500/20 text-green-700 dark:text-green-300">
              <Heart className="h-3 w-3" />
              Love
            </span>
          </div>
        </div>

        {/* Score Badge - deterministic based on rank */}
        <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full text-sm font-bold border bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
          {95 - (rank * 3)}
        </div>
      </div>
    </div>
  );
};

/**
 * Blurred fake card for category view (hack-proof placeholder)
 * Shows a blurred preview of what ranked location cards look like
 */
export const BlurredRankedCard: React.FC<BlurredRankedCardProps> = ({ fakeCity, rank }) => {
  const getRankStyle = () => {
    if (rank <= 3) return 'bg-slate-500/10 border border-slate-400/40 text-slate-600 dark:text-slate-400';
    return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  };

  return (
    <div className="relative p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 select-none pointer-events-none">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[6px] bg-white/50 dark:bg-black/30 rounded-xl z-10" />

      <div className="flex items-start gap-3 blur-[2px]">
        {/* Rank Badge */}
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm',
          getRankStyle()
        )}>
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 block">{fakeCity.name}</span>
          <span className="text-xs text-slate-500">{'\ud83c\udf0d'} {fakeCity.country}</span>

          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <ThumbsUp className="h-2.5 w-2.5" />
              Beneficial
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />
              623 km
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/[0.03] border border-green-500/20 text-green-700 dark:text-green-300">
              Sun MC
            </span>
          </div>
        </div>

        {/* Score Badge - deterministic based on rank */}
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400">
          {92 - (rank * 4)}
        </div>
      </div>
    </div>
  );
};

export default { BlurredOverallCard, BlurredRankedCard };
