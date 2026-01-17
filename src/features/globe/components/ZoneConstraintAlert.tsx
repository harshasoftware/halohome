/**
 * ZoneConstraintAlert - UI component for zone constraint feedback
 *
 * Displays real-time validation status during zone drawing:
 * - Property mode: Shows current area vs 200,000 sqft limit
 * - Scout mode: Shows address count vs 50 house limit
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, CheckCircle, MapPin, Ruler } from 'lucide-react';
import {
  formatAreaCompact,
  PROPERTY_SIZE_LIMIT_SQFT,
  SCOUT_HOUSE_LIMIT,
} from '@/lib/geo-utils';

export type ZoneMode = 'property' | 'search' | null;

export interface ZoneConstraintAlertProps {
  mode: ZoneMode;
  // Property mode props
  currentAreaSqFt?: number | null;
  // Scout mode props
  addressCount?: number | null;
  isCountingAddresses?: boolean;
  countingProgress?: string | null;
  // General
  className?: string;
}

/**
 * Get status for property zone
 */
function getPropertyStatus(areaSqFt: number): {
  isOverLimit: boolean;
  percentUsed: number;
  statusColor: string;
  statusText: string;
} {
  const percentUsed = (areaSqFt / PROPERTY_SIZE_LIMIT_SQFT) * 100;
  const isOverLimit = areaSqFt > PROPERTY_SIZE_LIMIT_SQFT;

  let statusColor = 'text-emerald-400';
  let statusText = 'Within limit';

  if (isOverLimit) {
    statusColor = 'text-red-400';
    statusText = 'Exceeds limit';
  } else if (percentUsed > 80) {
    statusColor = 'text-amber-400';
    statusText = 'Approaching limit';
  }

  return { isOverLimit, percentUsed, statusColor, statusText };
}

/**
 * Get status for scout zone
 */
function getScoutStatus(count: number): {
  isOverLimit: boolean;
  percentUsed: number;
  statusColor: string;
  statusText: string;
} {
  const percentUsed = (count / SCOUT_HOUSE_LIMIT) * 100;
  const isOverLimit = count > SCOUT_HOUSE_LIMIT;

  let statusColor = 'text-emerald-400';
  let statusText = 'Within limit';

  if (isOverLimit) {
    statusColor = 'text-red-400';
    statusText = 'Exceeds limit';
  } else if (percentUsed > 80) {
    statusColor = 'text-amber-400';
    statusText = 'Approaching limit';
  }

  return { isOverLimit, percentUsed, statusColor, statusText };
}

export function ZoneConstraintAlert({
  mode,
  currentAreaSqFt,
  addressCount,
  isCountingAddresses,
  countingProgress,
  className,
}: ZoneConstraintAlertProps) {
  // Don't render if no mode is active
  if (!mode) return null;

  // Property mode: Show area constraints
  if (mode === 'property') {
    if (currentAreaSqFt === null || currentAreaSqFt === undefined) {
      return (
        <Alert
          className={cn(
            'bg-slate-900/90 border-slate-700 backdrop-blur-sm',
            className
          )}
        >
          <Ruler className="h-4 w-4 text-slate-400" />
          <AlertDescription className="text-slate-300 ml-2">
            Draw at least 3 points to measure property area
          </AlertDescription>
        </Alert>
      );
    }

    const { isOverLimit, percentUsed, statusColor, statusText } =
      getPropertyStatus(currentAreaSqFt);

    return (
      <Alert
        className={cn(
          'backdrop-blur-sm',
          isOverLimit
            ? 'bg-red-950/90 border-red-800'
            : 'bg-slate-900/90 border-slate-700',
          className
        )}
      >
        <div className="flex items-center gap-3">
          {isOverLimit ? (
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          ) : (
            <Ruler className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-200 font-medium">
                Property Area
              </span>
              <span className={cn('text-xs font-medium', statusColor)}>
                {statusText}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isOverLimit
                      ? 'bg-red-500'
                      : percentUsed > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {formatAreaCompact(currentAreaSqFt)} / 200k sqft
              </span>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  // Scout mode: Show address count constraints
  if (mode === 'search') {
    // Loading state
    if (isCountingAddresses) {
      return (
        <Alert
          className={cn(
            'bg-slate-900/90 border-slate-700 backdrop-blur-sm',
            className
          )}
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-200">
                {countingProgress || 'Counting addresses...'}
              </span>
            </div>
          </div>
        </Alert>
      );
    }

    // No count yet
    if (addressCount === null || addressCount === undefined) {
      return (
        <Alert
          className={cn(
            'bg-slate-900/90 border-slate-700 backdrop-blur-sm',
            className
          )}
        >
          <MapPin className="h-4 w-4 text-slate-400" />
          <AlertDescription className="text-slate-300 ml-2">
            Draw a zone to count addresses (max {SCOUT_HOUSE_LIMIT})
          </AlertDescription>
        </Alert>
      );
    }

    const { isOverLimit, percentUsed, statusColor, statusText } =
      getScoutStatus(addressCount);

    return (
      <Alert
        className={cn(
          'backdrop-blur-sm',
          isOverLimit
            ? 'bg-red-950/90 border-red-800'
            : 'bg-slate-900/90 border-slate-700',
          className
        )}
      >
        <div className="flex items-center gap-3">
          {isOverLimit ? (
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-200 font-medium">
                Addresses Found
              </span>
              <span className={cn('text-xs font-medium', statusColor)}>
                {statusText}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isOverLimit
                      ? 'bg-red-500'
                      : percentUsed > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {addressCount} / {SCOUT_HOUSE_LIMIT} max
              </span>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
}

export default ZoneConstraintAlert;
