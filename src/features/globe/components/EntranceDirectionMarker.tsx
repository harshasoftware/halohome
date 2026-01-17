/**
 * EntranceDirectionMarker - Draggable arrow marker for setting entrance direction
 *
 * Shows at the centroid of a drawn property boundary.
 * User can rotate the arrow to indicate entrance direction.
 * The rotation is converted to a cardinal direction (N, NE, E, etc.)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { OverlayView } from '@react-google-maps/api';
import { cn } from '@/lib/utils';

export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

interface EntranceDirectionMarkerProps {
  /** Position (centroid) where the marker should appear */
  position: { lat: number; lng: number };
  /** Current direction (optional, for controlled mode) */
  direction?: CardinalDirection;
  /** Callback when direction changes */
  onDirectionChange: (direction: CardinalDirection, rotation: number) => void;
  /** Whether the marker is interactive */
  disabled?: boolean;
  /** Size of the marker in pixels */
  size?: number;
  /** Source of the detected direction (e.g., 'google_api', 'road_access', 'estimate') */
  detectionSource?: string | null;
  /** Confidence level of the detection (0-1) */
  detectionConfidence?: number;
}

// Convert rotation angle to cardinal direction
export function rotationToDirection(rotation: number): CardinalDirection {
  // Normalize rotation to 0-360
  const normalized = ((rotation % 360) + 360) % 360;

  // Each direction covers 45 degrees
  // N = 337.5 - 22.5, NE = 22.5 - 67.5, etc.
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}

// Convert cardinal direction to rotation angle
export function directionToRotation(direction: CardinalDirection): number {
  const rotations: Record<CardinalDirection, number> = {
    'N': 0,
    'NE': 45,
    'E': 90,
    'SE': 135,
    'S': 180,
    'SW': 225,
    'W': 270,
    'NW': 315,
  };
  return rotations[direction];
}

// Direction colors for Vastu (auspicious = green, neutral = yellow, inauspicious = red)
const directionColors: Record<CardinalDirection, { bg: string; text: string; label: string }> = {
  'N': { bg: 'bg-green-500', text: 'text-white', label: 'Auspicious' },
  'NE': { bg: 'bg-emerald-500', text: 'text-white', label: 'Most Auspicious' },
  'E': { bg: 'bg-green-500', text: 'text-white', label: 'Auspicious' },
  'SE': { bg: 'bg-yellow-500', text: 'text-black', label: 'Neutral' },
  'S': { bg: 'bg-orange-500', text: 'text-white', label: 'Challenging' },
  'SW': { bg: 'bg-red-500', text: 'text-white', label: 'Inauspicious' },
  'W': { bg: 'bg-yellow-500', text: 'text-black', label: 'Neutral' },
  'NW': { bg: 'bg-yellow-500', text: 'text-black', label: 'Neutral' },
};

// Format detection source for display
function formatDetectionSource(source: string | null | undefined): string {
  if (!source) return '';
  switch (source) {
    case 'google_api':
      return 'Detected via Google API';
    case 'street_view':
      return 'Detected via Street View';
    case 'road_access':
      return 'Detected from road access';
    case 'estimate':
      return 'Estimated from location';
    default:
      return 'Auto-detected';
  }
}

// Get confidence icon/color based on confidence level
function getConfidenceInfo(confidence: number): { icon: string; color: string } {
  if (confidence >= 0.8) return { icon: '✓✓', color: 'text-green-400' };
  if (confidence >= 0.5) return { icon: '✓', color: 'text-yellow-400' };
  return { icon: '~', color: 'text-orange-400' };
}

export const EntranceDirectionMarker: React.FC<EntranceDirectionMarkerProps> = ({
  position,
  direction: controlledDirection,
  onDirectionChange,
  disabled = false,
  size = 80,
  detectionSource,
  detectionConfidence = 0,
}) => {
  const [rotation, setRotation] = useState(() =>
    controlledDirection ? directionToRotation(controlledDirection) : 180 // Default to South
  );
  const [isDragging, setIsDragging] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update rotation when controlled direction changes
  useEffect(() => {
    if (controlledDirection) {
      setRotation(directionToRotation(controlledDirection));
    }
  }, [controlledDirection]);

  const currentDirection = rotationToDirection(rotation);
  const colorConfig = directionColors[currentDirection];

  // Calculate angle from center to mouse position
  const calculateAngle = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - centerRef.current.x;
    const dy = clientY - centerRef.current.y;
    // atan2 gives angle from positive x-axis, we want from north (negative y)
    // So we rotate by 90 degrees
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    return angle;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    // Get center of the marker
    if (markerRef.current) {
      const rect = markerRef.current.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    setIsDragging(true);
  }, [disabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newRotation = calculateAngle(e.clientX, e.clientY);
    setRotation(newRotation);
  }, [isDragging, calculateAngle]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      const finalDirection = rotationToDirection(rotation);
      // Snap to cardinal direction
      const snappedRotation = directionToRotation(finalDirection);
      setRotation(snappedRotation);
      onDirectionChange(finalDirection, snappedRotation);
    }
  }, [isDragging, rotation, onDirectionChange]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    if (markerRef.current) {
      const rect = markerRef.current.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    setIsDragging(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;

    const touch = e.touches[0];
    const newRotation = calculateAngle(touch.clientX, touch.clientY);
    setRotation(newRotation);
  }, [isDragging, calculateAngle]);

  // Add global mouse/touch listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        ref={markerRef}
        className="relative select-none"
        style={{
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        }}
      >
        {/* Outer ring with direction labels */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-4 transition-colors",
            isDragging ? "border-amber-400" : "border-white/80",
            "shadow-lg"
          )}
          style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
        >
          {/* Cardinal direction indicators */}
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600">N</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600">S</span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">W</span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">E</span>
        </div>

        {/* Rotatable arrow */}
        <div
          className={cn(
            "absolute inset-2 cursor-grab transition-transform",
            isDragging && "cursor-grabbing"
          )}
          style={{ transform: `rotate(${rotation}deg)` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Arrow pointing up (which becomes the entrance direction when rotated) */}
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          >
            {/* Arrow body */}
            <path
              d="M12 2 L12 18"
              stroke={isDragging ? '#f59e0b' : '#d4a5a5'}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Arrow head */}
            <path
              d="M12 2 L7 9 L12 7 L17 9 Z"
              fill={isDragging ? '#f59e0b' : '#d4a5a5'}
            />
            {/* Center dot */}
            <circle cx="12" cy="14" r="3" fill={isDragging ? '#f59e0b' : '#b8888a'} />
          </svg>
        </div>

        {/* Direction label below */}
        <div
          className={cn(
            "absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
            colorConfig.bg,
            colorConfig.text
          )}
        >
          {currentDirection} - {colorConfig.label}
        </div>

        {/* Instruction tooltip / Detection info */}
        {!isDragging && !disabled && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            {detectionSource ? (
              <>
                {/* Detection source badge */}
                <div className="px-2 py-1 bg-slate-800/90 text-white text-xs rounded whitespace-nowrap flex items-center gap-1">
                  <span className={cn("font-medium", getConfidenceInfo(detectionConfidence).color)}>
                    {getConfidenceInfo(detectionConfidence).icon}
                  </span>
                  <span>{formatDetectionSource(detectionSource)}</span>
                </div>
                {/* Override hint */}
                <div className="px-2 py-0.5 bg-amber-500/80 text-white text-[10px] rounded whitespace-nowrap">
                  Drag to adjust
                </div>
              </>
            ) : (
              <div className="px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-80">
                Drag to set entrance
              </div>
            )}
          </div>
        )}
      </div>
    </OverlayView>
  );
};

export default EntranceDirectionMarker;
