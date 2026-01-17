/**
 * GlobeLocationTooltip - Quick tooltip shown on single-click/tap
 *
 * Shows location coordinates and a hint for further actions.
 * Auto-dismisses after a short delay or when user interacts elsewhere.
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, MousePointer2, Smartphone } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface GlobeLocationTooltipProps {
  x: number;
  y: number;
  lat: number;
  lng: number;
  cityName?: string;
  isVisible: boolean;
  onDismiss: () => void;
}

export const GlobeLocationTooltip: React.FC<GlobeLocationTooltipProps> = ({
  x,
  y,
  lat,
  lng,
  cityName,
  isVisible,
  onDismiss,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(!cityName);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);

    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  // Adjust position to keep tooltip in viewport
  useEffect(() => {
    if (!isVisible || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Center horizontally relative to click point
    let adjustedX = x - rect.width / 2;

    // Keep within horizontal bounds
    if (adjustedX < 8) adjustedX = 8;
    if (adjustedX + rect.width > viewportWidth - 8) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    // Position above the click point, or below if not enough space
    let adjustedY = y - rect.height - 16;
    if (adjustedY < 8) {
      adjustedY = y + 16;
    }

    tooltip.style.left = `${adjustedX}px`;
    tooltip.style.top = `${adjustedY}px`;
  }, [isVisible, x, y, cityName]);

  // Update loading state when cityName changes
  useEffect(() => {
    if (cityName) {
      setIsLoading(false);
    }
  }, [cityName]);

  if (!isVisible) return null;

  const hintText = isMobile
    ? 'Double-tap to analyze Vastu'
    : 'Double-click to analyze Vastu';

  const contextHint = isMobile
    ? 'Long-press for more options'
    : 'Right-click for more options';

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ left: x, top: y }}
    >
      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-sm text-white rounded-lg shadow-xl px-3 py-2 min-w-[140px] max-w-[220px]">
        {/* Location name or coordinates */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          {isLoading ? (
            <span className="text-slate-300 animate-pulse">Loading...</span>
          ) : (
            <span className="truncate">
              {cityName || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`}
            </span>
          )}
        </div>

        {/* Coordinates (if city name is shown) */}
        {cityName && (
          <div className="text-xs text-slate-400 font-mono mt-0.5 pl-5">
            {lat.toFixed(4)}°, {lng.toFixed(4)}°
          </div>
        )}

        {/* Hint */}
        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-700/50 text-xs text-slate-400">
          {isMobile ? (
            <Smartphone className="w-3 h-3" />
          ) : (
            <MousePointer2 className="w-3 h-3" />
          )}
          <span>{hintText}</span>
        </div>

        {/* Context menu hint */}
        <div className="text-xs text-slate-500 pl-4">
          {contextHint}
        </div>
      </div>
    </div>
  );
};

export default GlobeLocationTooltip;
