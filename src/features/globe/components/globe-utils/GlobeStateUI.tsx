/**
 * Globe State UI Components - Loading, fallback, tooltips, and indicators
 */

import React from 'react';
import type { GlobePath } from './types';

interface GlobeLoadingStateProps {
  isRetrying: boolean;
  retryCount: number;
  maxRetries?: number;
}

/**
 * Loading state shown while checking WebGL availability
 * Minimal design to avoid visual disruption
 */
export function GlobeLoadingState({ isRetrying, retryCount, maxRetries = 5 }: GlobeLoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-full w-full bg-white dark:bg-[#050505]">
      <div className="text-center">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3 border-slate-200 dark:border-white/10 border-t-slate-500 dark:border-t-white/50"
        />
        {isRetrying && (
          <p className="text-zinc-500 text-xs">
            Initializing ({retryCount + 1}/{maxRetries})
          </p>
        )}
      </div>
    </div>
  );
}

interface GlobeFallbackStateProps {
  error: string | null;
  onRetry: () => void;
  isMobile?: boolean;
  hasBirthData?: boolean;
  onShowScout?: () => void;
}

/**
 * Fallback UI shown when WebGL is not available
 * On mobile with birth data, directs user to Scout locations as primary experience
 */
export function GlobeFallbackState({
  error,
  onRetry,
  isMobile = false,
  hasBirthData = false,
  onShowScout,
}: GlobeFallbackStateProps) {
  // Mobile fallback - prioritize Scout experience when birth data exists
  if (isMobile && hasBirthData && onShowScout) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#050505] p-6">
        <div className="text-center max-w-sm">
          {/* Icon in glass card style */}
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <svg className="w-8 h-8 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>

          <h3 className="text-lg font-medium text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            3D Globe Not Available
          </h3>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Your device couldn't load the 3D globe, but you can still explore your best locations using Scout.
          </p>

          <div className="space-y-3">
            {/* Primary CTA - white pill button matching landing style */}
            <button
              onClick={onShowScout}
              className="w-full px-6 py-3.5 bg-white text-[#050505] font-semibold rounded-full transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontSize: '0.95rem' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              View Scout Locations
            </button>

            {/* Secondary button - glass card style */}
            <button
              onClick={onRetry}
              className="w-full px-4 py-2.5 text-zinc-400 text-sm font-medium rounded-full transition-all hover:text-white"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              Try Loading Globe Again
            </button>
          </div>

          <p className="text-xs text-zinc-600 mt-5">
            Tip: Close other browser tabs or restart the app
          </p>
        </div>
      </div>
    );
  }

  // Standard desktop fallback
  return (
    <div className="flex items-center justify-center h-full w-full bg-[#050505] rounded-xl">
      <div className="text-center p-6 max-w-xs">
        {/* Icon in glass card style */}
        <div
          className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <svg className="w-7 h-7 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <p className="text-zinc-300 text-sm font-medium">3D Globe unavailable</p>
        <p className="text-zinc-500 text-xs mt-2 mb-4">
          {error || 'Graphics context failed to initialize'}
        </p>
        <div className="space-y-2">
          <button
            onClick={onRetry}
            className="w-full px-5 py-2 bg-white text-[#050505] text-sm font-medium rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Try Again
          </button>
          <p className="text-zinc-600 text-xs mt-3">
            Tip: Close other browser tabs or restart the app
          </p>
        </div>
      </div>
    </div>
  );
}

interface LineHoverTooltipProps {
  line: GlobePath;
  position: { x: number; y: number };
}

/**
 * Get line label for tooltip display
 */
function getLineLabel(line: GlobePath): string {
  if (line.type === 'paran') {
    return `${line.planet1} ${line.angle1} / ${line.planet2} ${line.angle2} Paran`;
  }
  if (line.type === 'aspect') {
    return `${line.planet} ${line.aspectType} ${line.lineType}`;
  }
  // Planetary line or local space line
  return `${line.planet} ${line.lineType || 'Line'}`;
}

/**
 * Tooltip shown when hovering over a planetary line
 */
export function LineHoverTooltip({ line, position }: LineHoverTooltipProps) {
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 12,
        top: position.y - 10,
      }}
    >
      <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg shadow-lg border border-slate-700 text-sm whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: line.color }}
          />
          <span className="font-medium">{getLineLabel(line)}</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          Click to view details
        </div>
      </div>
    </div>
  );
}

interface ZoneDrawingIndicatorProps {
  pointsCount: number;
  minPoints?: number;
}

/**
 * Indicator shown when zone drawing mode is active
 */
export function ZoneDrawingIndicator({ pointsCount, minPoints = 3 }: ZoneDrawingIndicatorProps) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-cyan-600/95 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span>Click to add zone points ({pointsCount}/min {minPoints})</span>
      </div>
    </div>
  );
}

interface ZoneActiveBadgeProps {
  pointsCount: number;
}

/**
 * Badge shown when a zone is active (drawing complete)
 */
export function ZoneActiveBadge({ pointsCount }: ZoneActiveBadgeProps) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-cyan-700/95 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Zone Active - {pointsCount} points</span>
      </div>
    </div>
  );
}
