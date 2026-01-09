/**
 * LocationComparisonCard - Generative UI component for CopilotKit
 *
 * Renders inline in chat to display location comparisons with scores
 * and planetary line information.
 * Follows landing page aesthetic - clean, minimal, no gradients.
 */

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Location {
  name: string;
  lat: number;
  lng: number;
  score?: number;
  lines: string[];
}

interface LocationComparisonCardProps {
  locations: Location[];
  isStreaming?: boolean;
  title?: string;
  onLocationClick?: (lat: number, lng: number, name: string) => void;
}

export function LocationComparisonCard({
  locations,
  isStreaming = false,
  title,
  onLocationClick,
}: LocationComparisonCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-slate-400 dark:text-slate-500';
  };

  return (
    <motion.div
      className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {title && (
        <div className="px-3 py-2 border-b border-slate-200 dark:border-white/5">
          <h4 className="font-medium text-xs text-slate-600 dark:text-slate-300">{title}</h4>
        </div>
      )}

      <div className="divide-y divide-slate-200/50 dark:divide-white/5">
        {locations.map((loc, i) => (
          <motion.div
            key={`${loc.name}-${i}`}
            className={`flex items-center justify-between p-2.5 ${
              onLocationClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.02] transition-colors' : ''
            }`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.15 }}
            onClick={() => onLocationClick?.(loc.lat, loc.lng, loc.name)}
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-sm text-slate-800 dark:text-white block truncate">{loc.name}</span>
                {loc.lines.length > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {loc.lines.slice(0, 3).join(', ')}
                    {loc.lines.length > 3 && ` +${loc.lines.length - 3} more`}
                  </div>
                )}
              </div>
            </div>

            {loc.score !== undefined && (
              <span className={`ml-2 shrink-0 text-xs font-semibold ${getScoreColor(loc.score)}`}>
                {loc.score}%
              </span>
            )}
          </motion.div>
        ))}

        {isStreaming && (
          <div className="p-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24 bg-slate-200 dark:bg-white/10" />
                <Skeleton className="h-3 w-32 bg-slate-200 dark:bg-white/10" />
              </div>
              <Skeleton className="h-4 w-8 bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
