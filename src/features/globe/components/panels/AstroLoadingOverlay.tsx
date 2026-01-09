/**
 * AstroLoadingOverlay - Loading overlay shown during astrocartography calculation
 *
 * Supports two phases:
 * 1. Astro line calculation (planetary lines, aspects, etc.) - BLOCKING modal
 * 2. Scout location analysis - MINIMIZED to corner, non-blocking
 *
 * Auto-minimizes when astro phase completes to allow globe interaction during scouting.
 *
 * Mobile behavior:
 * - During astro phase: Shows blocking modal (same as desktop)
 * - During scout phase: Returns null - progress is shown in Toolbar Scout FAB with circular ring
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Compass, MapPin, ChevronDown, Check } from 'lucide-react';

type Phase = 'astro' | 'scout' | 'complete';

export interface BenchmarkResults {
  wasmParallel: number | null;
  wasmSingle: number | null;
  typescript: number;
  numThreads: number;
  cityCount: number;
  lineCount: number;
}

interface AstroLoadingOverlayProps {
  /** Astro line calculation progress */
  progress?: {
    percent: number;
    message?: string;
  } | null;
  /** Scout analysis progress (optional second phase) */
  scoutProgress?: {
    percent: number;
    detail?: string;
    phase: 'idle' | 'initializing' | 'computing' | 'complete' | 'error';
  } | null;
  /** Benchmark results to display */
  benchmarkResults?: BenchmarkResults | null;
  /** Whether benchmark is running */
  isBenchmarking?: boolean;
  /** Callback when user clicks OK to dismiss */
  onDismiss?: () => void;
  /** Whether to show the overlay (for manual control after benchmark) */
  showResults?: boolean;
}

// Engaging progress messages for astro line calculation
const getAstroMessage = (percent: number): string => {
  if (percent < 10) return 'Awakening the celestial engine...';
  if (percent < 20) return 'Connecting to planetary ephemeris...';
  if (percent < 35) return 'Tracing planetary positions across time...';
  if (percent < 50) return 'Calculating angular relationships...';
  if (percent < 65) return 'Mapping power zones on Earth...';
  if (percent < 80) return 'Weaving your cosmic blueprint...';
  if (percent < 92) return 'Finalizing celestial alignments...';
  return 'Preparing your map...';
};

// Engaging progress messages for scout analysis
const getScoutMessage = (percent: number, detail?: string): string => {
  if (detail) return detail;
  if (percent < 10) return 'Initializing location analysis...';
  if (percent < 25) return 'Scanning cities worldwide...';
  if (percent < 50) return 'Analyzing planetary influences...';
  if (percent < 75) return 'Ranking best locations...';
  if (percent < 90) return 'Finalizing recommendations...';
  return 'Almost there...';
};

export const AstroLoadingOverlay: React.FC<AstroLoadingOverlayProps> = ({
  progress,
  scoutProgress,
  benchmarkResults,
  isBenchmarking,
  onDismiss,
  showResults,
}) => {
  // Track if user has manually toggled minimized state
  const [userMinimized, setUserMinimized] = useState<boolean | null>(null);
  const [hasAutoMinimized, setHasAutoMinimized] = useState(false);

  // Animated display percentage for smooth transitions
  const [displayPercent, setDisplayPercent] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Determine current phase and target percent
  const { currentPhase, targetPercent, totalPercent } = useMemo(() => {
    // If showing benchmark results
    if (benchmarkResults || showResults) {
      return {
        currentPhase: 'complete' as Phase,
        targetPercent: 100,
        totalPercent: 100,
      };
    }

    // If benchmark is running - treat as astro phase
    if (isBenchmarking) {
      return {
        currentPhase: 'astro' as Phase,
        targetPercent: 50,
        totalPercent: 95,
      };
    }

    // If astro is still loading, we're in astro phase
    if (progress && progress.percent < 100) {
      // Astro takes 60% of total, scout takes 40%
      return {
        currentPhase: 'astro' as Phase,
        targetPercent: progress.percent,
        totalPercent: Math.round(progress.percent * 0.6),
      };
    }

    // If scout is loading, we're in scout phase
    if (scoutProgress && scoutProgress.phase !== 'idle' && scoutProgress.phase !== 'complete') {
      // Scout progress (60-100% of total)
      return {
        currentPhase: 'scout' as Phase,
        targetPercent: scoutProgress.percent,
        totalPercent: Math.round(60 + scoutProgress.percent * 0.4),
      };
    }

    // Scout complete
    if (scoutProgress && scoutProgress.phase === 'complete') {
      return {
        currentPhase: 'complete' as Phase,
        targetPercent: 100,
        totalPercent: 100,
      };
    }

    // Default to astro if available
    if (progress) {
      return {
        currentPhase: 'astro' as Phase,
        targetPercent: progress.percent,
        totalPercent: Math.round(progress.percent * 0.6),
      };
    }

    return { currentPhase: 'astro' as Phase, targetPercent: 0, totalPercent: 0 };
  }, [progress, scoutProgress, benchmarkResults, isBenchmarking, showResults]);

  // Auto-minimize when entering scout phase (astro complete)
  useEffect(() => {
    if (currentPhase === 'scout' && !hasAutoMinimized) {
      setHasAutoMinimized(true);
      // Only auto-minimize if user hasn't manually set a preference
      if (userMinimized === null) {
        setUserMinimized(true);
      }
    }
    // Reset auto-minimize flag when going back to astro phase
    if (currentPhase === 'astro') {
      setHasAutoMinimized(false);
    }
  }, [currentPhase, hasAutoMinimized, userMinimized]);

  // Determine if minimized
  const isMinimized = userMinimized === true || (userMinimized === null && currentPhase === 'scout');

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = () => {
      setDisplayPercent(current => {
        const diff = totalPercent - current;

        if (Math.abs(diff) < 0.5) {
          return totalPercent;
        }

        const speed = diff > 0
          ? Math.max(0.5, diff * 0.08)
          : Math.max(0.5, Math.abs(diff) * 0.15);

        const next = current + (diff > 0 ? speed : -speed);

        if (Math.abs(totalPercent - next) > 0.5) {
          animationRef.current = requestAnimationFrame(animate);
        }

        return next;
      });
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [totalPercent]);

  useEffect(() => {
    setDisplayPercent(0);
  }, []);

  const roundedPercent = Math.round(displayPercent);

  // Get message based on current phase
  const message = currentPhase === 'astro'
    ? getAstroMessage(targetPercent)
    : currentPhase === 'scout'
    ? getScoutMessage(targetPercent, scoutProgress?.detail)
    : 'Scout analysis complete!';

  // Get title based on current phase
  const title = currentPhase === 'astro'
    ? 'Charting Your Stars'
    : currentPhase === 'scout'
    ? 'Scouting Locations'
    : 'Results Ready';

  // Don't show anything if complete and no benchmark results
  if (currentPhase === 'complete' && !benchmarkResults && !showResults) {
    return null;
  }

  // Minimized view - progress is now shown in the Toolbar on both mobile and desktop
  // Return null to let the Toolbar handle the scout progress indicator
  if (isMinimized && currentPhase === 'scout') {
    return null;
  }

  // Full overlay view
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none">
      {/* Semi-transparent backdrop - only show for astro phase */}
      {currentPhase === 'astro' && (
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
      )}

      {/* Card */}
      <div className="relative pointer-events-auto mx-4 max-w-md w-full">
        {/* Main card */}
        <div className="relative rounded-2xl p-8 flex flex-col items-center gap-5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0f] shadow-xl">
          {/* Minimize button for scout phase */}
          {currentPhase === 'scout' && (
            <button
              onClick={() => setUserMinimized(true)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Minimize"
            >
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </button>
          )}

          {/* Icon based on phase */}
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
            {currentPhase === 'complete' ? (
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            ) : currentPhase === 'scout' ? (
              <MapPin className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-pulse" />
            ) : (
              <Compass className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          {/* Text content */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 min-h-[20px] leading-relaxed transition-opacity duration-500">
              {message}
            </p>
            {currentPhase === 'scout' && (
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                You can minimize this and explore the globe
              </p>
            )}
          </div>

          {/* Progress bar (only when loading) */}
          {currentPhase !== 'complete' && (
            <div className="w-full space-y-2">
              <div className="h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-none"
                  style={{
                    width: `${displayPercent}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 text-center tabular-nums font-medium">
                {roundedPercent}%
              </p>
            </div>
          )}

          {/* Complete state - show dismiss button */}
          {currentPhase === 'complete' && onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full mt-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
            >
              View Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AstroLoadingOverlay;
