import React, { useState, useEffect, useRef, useImperativeHandle, useCallback, useMemo } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import type { PersonLocation, Migration } from '../types/migration.d';
import type { PlanetaryLine, AspectLine, ParanLine, ZenithPoint } from '@/lib/astro-types';
import {
  startGlobeRenderTrace,
  stopGlobeRenderTrace,
  trackGlobeRenderError,
} from '@/lib/webgl-diagnostics';

// Globe utilities and sub-components
import {
  // Marker cache and factory
  globeMarkerCache,
  getPersonMarkerKey,
  getParanMarkerKey,
  getPendingBirthMarkerKey,
  getPartnerMarkerKey,
  getAnalysisMarkerKey,
  getCityMarkerKey,
  getRelocationMarkerKey,
  getLineLabelMarkerKey,
  getScoutMarkerKey,
  getScoutClusterBeneficialKey,
  getScoutClusterChallengingKey,
  getScoutClusterMixedKey,
  zenithRingPool,
  createPendingBirthMarker,
  createPartnerMarker,
  createParanMarker,
  createAnalysisMarker,
  createCityMarker,
  createRelocationMarker,
  createPersonMarker,
  createEmptyMarker,
  createLineLabelMarker,
  createScoutBeneficialMarker,
  createScoutChallengingMarker,
  createScoutHighlightMarker,
  createScoutClusterBeneficialMarker,
  createScoutClusterChallengingMarker,
  createScoutClusterMixedMarker,
  // Clustering
  zoomAwareClusterScoutMarkers,
  getCellSizeForAltitude,
  type ClusteredMarker,
  // Types
  type GlobePath,
  type ZenithMarker,
  type ParanCrossingMarker,
  type LineLabelMarker,
  PLANET_COLORS_MAP,
  generateLatitudeCircleCoords,
  generateCircleAroundPoint,
  // WebGL utilities
  useWebGLAvailability,
  // UI components
  GlobeErrorBoundary,
  GlobeLoadingState,
  GlobeFallbackState,
  LineHoverTooltip,
  ZoneDrawingIndicator,
  ZoneActiveBadge,
} from './globe-utils';
import { useHighlightedLine, useHighlightedScoutCity } from '@/stores/globeInteractionStore';

// Re-export GlobePath for external use
export type { GlobePath };

interface MigrationGlobeProps {
  locations: PersonLocation[];
  migrations: Migration[];
  onPersonClick: (person: PersonLocation) => void;
  // Astrocartography lines
  astroLines?: PlanetaryLine[];
  // Aspect lines (planet-to-planet)
  aspectLines?: AspectLine[];
  // Paran lines (latitude circles)
  paranLines?: ParanLine[];
  // Zenith points (where planet is directly overhead on MC line)
  zenithPoints?: ZenithPoint[];
  // Callback for coordinate selection (double-tap when no birth data)
  onCoordinateSelect?: (lat: number, lng: number) => void;
  // Callback for location analysis (double-tap when birth data exists)
  onLocationAnalyze?: (lat: number, lng: number) => void;
  // Stable key for globe remounting (only changes when birth data changes, not on visibility toggles)
  birthDataKey?: string;
  // Callback when a planetary line is clicked
  onLineClick?: (line: GlobePath) => void;
  // Callback when hovering over a planetary line
  onLineHover?: (line: GlobePath | null) => void;
  // Whether we're on mobile (for larger touch targets)
  isMobile?: boolean;
  // Location being analyzed (shows a pin marker)
  analysisLocation?: { lat: number; lng: number } | null;
  // City location being viewed (shows a pin marker)
  cityLocation?: { lat: number; lng: number; name: string } | null;
  // Relocation target (shows where chart is relocated to)
  relocationLocation?: { lat: number; lng: number; name?: string } | null;
  // Whether birth data exists (affects double-tap behavior)
  hasBirthData?: boolean;
  // Pending birth location (shows avatar marker before modal appears)
  pendingBirthLocation?: { lat: number; lng: number } | null;
  // Partner location in duo mode (shows partner avatar marker)
  partnerLocation?: { lat: number; lng: number; name: string; avatarUrl?: string } | null;
  // Selected paran line to render as a latitude circle
  selectedParanLine?: GlobePath | null;
  // Zone drawing props
  isDrawingZone?: boolean;
  zoneDrawingPoints?: Array<{ lat: number; lng: number }>;
  drawnZone?: { points: Array<{ lat: number; lng: number }> } | null;
  onZonePointAdd?: (lat: number, lng: number) => void;
  onZoneComplete?: (points: Array<{ lat: number; lng: number }>) => void;
  // Local space mode - disables path transitions to prevent drift
  isLocalSpaceMode?: boolean;
  // Local space origin point (for rendering 150-mile orb circle)
  localSpaceOrigin?: { lat: number; lng: number } | null;
  // Show line labels on planetary lines
  showLineLabels?: boolean;
  // Context menu callbacks (right-click on desktop, long-press on mobile)
  onContextMenu?: (lat: number, lng: number, x: number, y: number) => void;
  // Single click/tap callback for tooltip
  onSingleClick?: (lat: number, lng: number, x: number, y: number) => void;
  // Scout location markers (from ScoutPanel country clicks)
  scoutMarkers?: Array<{ lat: number; lng: number; name: string; nature: 'beneficial' | 'challenging' }>;
  // Callback when a scout marker is clicked (to show city info)
  onScoutMarkerClick?: (lat: number, lng: number, name: string) => void;
  // Callback to show Scout panel when globe fails on mobile
  onGlobeFallbackShowScout?: () => void;
}

const MigrationGlobeComponent = React.forwardRef<GlobeMethods, MigrationGlobeProps>(({
  locations,
  migrations,
  onPersonClick,
  astroLines = [],
  aspectLines = [],
  paranLines = [],
  zenithPoints = [],
  onCoordinateSelect,
  onLocationAnalyze,
  birthDataKey = 'default',
  onLineClick,
  onLineHover,
  isMobile = false,
  analysisLocation = null,
  cityLocation = null,
  relocationLocation = null,
  hasBirthData = false,
  pendingBirthLocation = null,
  partnerLocation = null,
  selectedParanLine = null,
  // Zone drawing
  isDrawingZone = false,
  zoneDrawingPoints = [],
  drawnZone = null,
  onZonePointAdd,
  onZoneComplete,
  // Local space mode
  isLocalSpaceMode = false,
  localSpaceOrigin = null,
  // Line labels
  showLineLabels = false,
  // Context menu and single click
  onContextMenu,
  onSingleClick,
  // Scout markers
  scoutMarkers = [],
  onScoutMarkerClick,
  // Fallback callback
  onGlobeFallbackShowScout,
}, ref) => {
  // Check WebGL availability with retries (handles PWA reload race conditions)
  // iOS gets 5 retries with longer delays due to slower context recycling
  const { available: webglAvailable, retry: retryWebGL, isRetrying, error: webglError, retryCount } = useWebGLAvailability(5, 300);

  // Key to force re-mount of Globe component on retry
  const [globeKey, setGlobeKey] = useState(0);

  // Track when globe is ready for useImperativeHandle
  const [isGlobeReady, setIsGlobeReady] = useState(false);

  // Track globe altitude for zoom-aware clustering
  const [globeAltitude, setGlobeAltitude] = useState(2.5); // Default zoomed out

  // Debounced altitude update to avoid excessive re-clustering
  const altitudeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleZoom = useCallback((pov: { lat: number; lng: number; altitude: number }) => {
    // Only update if altitude changed significantly (avoids unnecessary re-renders)
    const newCellSize = getCellSizeForAltitude(pov.altitude);
    const currentCellSize = getCellSizeForAltitude(globeAltitude);

    // Only re-cluster if the cell size bracket changed
    if (newCellSize !== currentCellSize) {
      // Debounce the update to avoid too many re-clusters during smooth zooming
      if (altitudeUpdateTimeoutRef.current) {
        clearTimeout(altitudeUpdateTimeoutRef.current);
      }
      altitudeUpdateTimeoutRef.current = setTimeout(() => {
        setGlobeAltitude(pov.altitude);
      }, 150); // 150ms debounce
    }
  }, [globeAltitude]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (altitudeUpdateTimeoutRef.current) {
        clearTimeout(altitudeUpdateTimeoutRef.current);
      }
    };
  }, []);

  const handleRetry = useCallback(() => {
    setIsGlobeReady(false); // Reset ready state before remounting
    retryWebGL();
    setGlobeKey(prev => prev + 1);
  }, [retryWebGL]);

  // Stroke multiplier for mobile to make lines easier to tap
  const strokeMultiplier = isMobile ? 3 : 1;
  const globeEl = useRef<GlobeMethods | undefined>(undefined);

  // Hovered line state for tooltip
  const [hoveredLine, setHoveredLine] = useState<GlobePath | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Get highlighted line from store (when hovering in city info panel)
  const highlightedLine = useHighlightedLine();
  // Get highlighted scout city from store (when hovering in scout panel)
  const highlightedScoutCity = useHighlightedScoutCity();

  // Check if a path matches the highlighted line
  const isPathHighlighted = useCallback((path: GlobePath | null): boolean => {
    if (!path || !highlightedLine) return false;

    // Match by planet and line type
    const planetMatch = path.planet === highlightedLine.planet;

    // For aspect lines, match aspect type; for planetary lines, match line type
    const typeMatch = path.aspectType
      ? path.aspectType === highlightedLine.lineType
      : path.lineType === highlightedLine.lineType;

    return planetMatch && typeMatch;
  }, [highlightedLine]);

  // Get path color with highlighting effect
  const getPathColor = useCallback((path: GlobePath | null): string => {
    if (!path) return '#ffffff';
    const baseColor = path.color || '#ffffff';

    // If no line is highlighted, use default color
    if (!highlightedLine) return baseColor;

    // If this path is highlighted, return full bright color
    if (isPathHighlighted(path)) return baseColor;

    // Otherwise, dim the color by reducing opacity
    // Convert hex to rgba with lower opacity
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  }, [highlightedLine, isPathHighlighted]);

  // Get path stroke with highlighting effect
  const getPathStroke = useCallback((path: GlobePath | null): number => {
    if (!path) return 1;
    const baseStroke = path.stroke || 1;

    // If no line is highlighted, use default stroke
    if (!highlightedLine) return baseStroke;

    // If this path is highlighted, make it thicker
    if (isPathHighlighted(path)) return baseStroke * 3;

    // Otherwise, use thinner stroke
    return baseStroke * 0.5;
  }, [highlightedLine, isPathHighlighted]);

  // Handle line hover
  const handlePathHover = useCallback((path: GlobePath | null, event?: MouseEvent) => {
    setHoveredLine(path);
    if (path && event) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    } else {
      setTooltipPosition(null);
    }
    onLineHover?.(path);
  }, [onLineHover]);

  // Analysis location pin marker data
  const analysisMarkerData = useMemo(() => {
    if (!analysisLocation) return [];
    return [{
      lat: analysisLocation.lat,
      lng: analysisLocation.lng,
      type: 'analysis' as const
    }];
  }, [analysisLocation]);

  // Multi-click detection state
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const doubleClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const singleClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const MULTI_CLICK_DELAY = 250; // ms between clicks (reduced from 350 for snappier response)
  const DOUBLE_CLICK_CONFIRM_DELAY = 50; // ms to wait after double-click before firing (reduced from 150)
  const SINGLE_CLICK_DELAY = 280; // ms to wait before triggering single-click tooltip

  // Long-press detection for context menu (mobile/tablet)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressCoordsRef = useRef<{ lat: number; lng: number; x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);
  const LONG_PRESS_DELAY = 500; // ms to trigger context menu

  // Globe container ref for attaching event listeners
  const globeContainerRef = useRef<HTMLDivElement | null>(null);

  // Track pointer position for single-click tooltip
  // Capture on both move AND down events to ensure position is correct on click
  useEffect(() => {
    const updatePointerPos = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        lastPointerPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if ('clientX' in e) {
        lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener('mousemove', updatePointerPos);
    window.addEventListener('mousedown', updatePointerPos);
    window.addEventListener('touchmove', updatePointerPos);
    window.addEventListener('touchstart', updatePointerPos);
    return () => {
      window.removeEventListener('mousemove', updatePointerPos);
      window.removeEventListener('mousedown', updatePointerPos);
      window.removeEventListener('touchmove', updatePointerPos);
      window.removeEventListener('touchstart', updatePointerPos);
    };
  }, []);

  // Right-click handler for desktop context menu
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (!globeEl.current || !onContextMenu) return;

    // Get globe coordinates from screen position
    const coords = globeEl.current.toGlobeCoords(e.clientX, e.clientY);
    if (coords && coords.lat != null && coords.lng != null) {
      onContextMenu(coords.lat, coords.lng, e.clientX, e.clientY);
    }
  }, [onContextMenu]);

  // Long-press handlers for mobile/tablet context menu
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    longPressCoordsRef.current = { lat: 0, lng: 0, x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      if (!globeEl.current || !onContextMenu || !longPressCoordsRef.current) return;

      // Get globe coordinates from touch position
      const coords = globeEl.current.toGlobeCoords(touch.clientX, touch.clientY);
      if (coords && coords.lat != null && coords.lng != null) {
        isLongPressRef.current = true;
        onContextMenu(coords.lat, coords.lng, touch.clientX, touch.clientY);
      }
    }, LONG_PRESS_DELAY);
  }, [onContextMenu]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressCoordsRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Cancel long-press if finger moves significantly
    if (longPressCoordsRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - longPressCoordsRef.current.x;
      const dy = touch.clientY - longPressCoordsRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  }, []);

  // Attach context menu listener to document level (to catch events on markers that are
  // rendered in globe.gl's overlay container, which may not be inside our globeContainerRef)
  useEffect(() => {
    const handleDocumentContextMenu = (e: MouseEvent) => {
      const container = globeContainerRef.current;
      if (!container) return;

      // Check if the click is within the globe bounds
      const rect = container.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return; // Outside the globe area, let default context menu show
      }

      // Inside globe area - handle as globe context menu
      handleContextMenu(e);
    };

    document.addEventListener('contextmenu', handleDocumentContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleDocumentContextMenu);
    };
  }, [handleContextMenu]);

  // Attach long-press listeners to globe container for mobile/tablet context menu
  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, handleTouchMove]);

  // birthDataKey is passed from parent - only changes when birth location changes
  // This ensures visibility toggles don't remount the entire globe

  useEffect(() => {
    console.log('MigrationGlobe update - birthDataKey:', birthDataKey);
    console.log('Locations count:', locations.length);
    console.log('Astro lines count:', astroLines.length);
  }, [locations, astroLines, birthDataKey]);

  // Handle globe click for coordinate selection and location analysis
  // - When zone drawing: single-click = add point to zone polygon
  // - Single-click/tap: show location tooltip
  // - When no birth data: double-tap = birth data entry
  // - When birth data exists: double-tap = location analysis
  const handleGlobeClick = useCallback((coords: { lat: number; lng: number }) => {
    // Ignore if this was a long-press (context menu was shown)
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    // Zone drawing mode - single click adds a point
    if (isDrawingZone) {
      onZonePointAdd?.(coords.lat, coords.lng);
      return;
    }

    clickCountRef.current += 1;
    pendingCoordsRef.current = coords;

    // Clear existing timers
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    if (doubleClickTimerRef.current) {
      clearTimeout(doubleClickTimerRef.current);
    }
    if (singleClickTimerRef.current) {
      clearTimeout(singleClickTimerRef.current);
    }

    if (clickCountRef.current === 1) {
      // First click - schedule single-click tooltip after delay
      // This will be cancelled if second click comes
      // Capture coords and screen position in closure since refs may be cleared
      const capturedCoords = { ...coords };
      const capturedScreenPos = { ...lastPointerPosRef.current };
      singleClickTimerRef.current = setTimeout(() => {
        // Timer fired = no second click came, this is a true single-click
        if (onSingleClick) {
          onSingleClick(
            capturedCoords.lat,
            capturedCoords.lng,
            capturedScreenPos.x,
            capturedScreenPos.y
          );
        }
        singleClickTimerRef.current = null;
      }, SINGLE_CLICK_DELAY);
    }

    if (clickCountRef.current === 2) {
      // Double click detected - cancel single-click tooltip
      if (singleClickTimerRef.current) {
        clearTimeout(singleClickTimerRef.current);
        singleClickTimerRef.current = null;
      }

      // Double click behavior depends on whether birth data exists
      doubleClickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 2 && pendingCoordsRef.current) {
          if (!hasBirthData && onCoordinateSelect) {
            // No birth data: double-tap triggers birth data entry
            onCoordinateSelect(pendingCoordsRef.current.lat, pendingCoordsRef.current.lng);
          } else if (hasBirthData && onLocationAnalyze) {
            // Has birth data: double-tap triggers location analysis
            onLocationAnalyze(pendingCoordsRef.current.lat, pendingCoordsRef.current.lng);
          }
        }
        clickCountRef.current = 0;
        pendingCoordsRef.current = null;
      }, DOUBLE_CLICK_CONFIRM_DELAY);
    }

    // Reset click count after delay if no action taken
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
      pendingCoordsRef.current = null;
    }, MULTI_CLICK_DELAY);
  }, [onCoordinateSelect, onLocationAnalyze, onSingleClick, hasBirthData, isDrawingZone, onZonePointAdd]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      if (doubleClickTimerRef.current) {
        clearTimeout(doubleClickTimerRef.current);
      }
      if (singleClickTimerRef.current) {
        clearTimeout(singleClickTimerRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Cleanup caches on unmount to free memory
  useEffect(() => {
    return () => {
      globeMarkerCache.clear();
      zenithRingPool.clear();
    };
  }, []);

  // Convert planetary lines to globe path data
  const pathsData = useMemo(() => {
    const paths: GlobePath[] = [];

    // Helper function to split a path at large latitude jumps
    // This prevents spurious diagonal lines across the globe for ASC/DSC curves
    const splitPathAtDiscontinuities = (
      points: [number, number][],
      latThreshold: number = 60  // Increased from 30° to handle sharp curves better
    ): [number, number][][] => {
      if (points.length < 2) return [points];

      const segments: [number, number][][] = [];
      let currentSegment: [number, number][] = [points[0]];

      for (let i = 1; i < points.length; i++) {
        const prevLat = points[i - 1][0];
        const currLat = points[i][0];
        const latDiff = Math.abs(currLat - prevLat);

        if (latDiff > latThreshold) {
          // Large latitude jump detected - start a new segment
          if (currentSegment.length >= 2) {
            segments.push(currentSegment);
          }
          currentSegment = [points[i]];
        } else {
          currentSegment.push(points[i]);
        }
      }

      // Add the last segment
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }

      return segments;
    };

    // Add planetary lines
    if (astroLines && astroLines.length > 0) {
      for (const line of astroLines) {
        if (!line.points || line.points.length < 2) continue;

        // Filter out any invalid points
        const validPoints = line.points.filter(
          point => point &&
            typeof point[0] === 'number' && !isNaN(point[0]) &&
            typeof point[1] === 'number' && !isNaN(point[1])
        );

        if (validPoints.length < 2) continue;

        const coords = validPoints.map((point): [number, number] => [point[0], point[1]]);

        // Determine stroke style based on line type
        let dash: number[] | undefined;
        let stroke = 1;

        switch (line.lineType) {
          case 'MC':
            stroke = 2;
            break;
          case 'IC':
            stroke = 1.5;
            dash = [4, 2];
            break;
          case 'ASC':
            stroke = 2;
            break;
          case 'DSC':
            stroke = 1.5;
            dash = [2, 2];
            break;
        }

        // For ASC/DSC lines, split at large latitude jumps to prevent spurious diagonal lines
        const isHorizonLine = line.lineType === 'ASC' || line.lineType === 'DSC';
        const segments = isHorizonLine ? splitPathAtDiscontinuities(coords) : [coords];

        for (const segmentCoords of segments) {
          paths.push({
            coords: segmentCoords,
            color: line.color,
            stroke: stroke * strokeMultiplier,
            dash: line.isLocalSpace ? [8, 4] : dash, // Local space lines use distinct dash pattern
            type: line.isLocalSpace ? 'localSpace' : 'planetary',
            planet: line.planet,
            lineType: line.lineType,
            // Local Space line fields
            isLocalSpace: line.isLocalSpace,
            azimuth: line.azimuth,
            direction: line.direction,
          });
        }
      }
    }

    // Add aspect lines
    if (aspectLines && aspectLines.length > 0) {
      for (const line of aspectLines) {
        if (!line.points || line.points.length < 2) continue;

        const validPoints = line.points.filter(
          point => point &&
            typeof point[0] === 'number' && !isNaN(point[0]) &&
            typeof point[1] === 'number' && !isNaN(point[1])
        );

        if (validPoints.length < 2) continue;

        const coords = validPoints.map((point): [number, number] => [point[0], point[1]]);

        // Aspect lines are dashed and semi-transparent
        paths.push({
          coords,
          color: line.color,
          stroke: 1 * strokeMultiplier,
          dash: [3, 3],
          type: 'aspect',
          planet: line.planet,
          lineType: line.angle,
          aspectType: line.aspectType,
          isHarmonious: line.isHarmonious,
        });
      }
    }

    // Paran lines are now rendered as crossing point markers only (not latitude circles)
    // The paran crossing points are handled in paranCrossingsData memo below
    // However, when a paran is selected/clicked, we render its latitude circle

    // Add selected paran line (latitude circle) if present
    if (selectedParanLine && selectedParanLine.type === 'paran' && selectedParanLine.latitude !== undefined) {
      const latitudeCircleCoords = generateLatitudeCircleCoords(selectedParanLine.latitude);

      // Create a gradient-like effect using both planet colors
      const color1 = selectedParanLine.planet1
        ? (PLANET_COLORS_MAP[selectedParanLine.planet1] || '#888888')
        : '#888888';
      const color2 = selectedParanLine.planet2
        ? (PLANET_COLORS_MAP[selectedParanLine.planet2] || '#888888')
        : '#888888';

      // Use the first planet's color for the line, with a thicker stroke to highlight selection
      paths.push({
        coords: latitudeCircleCoords,
        color: color1,
        stroke: 2.5 * strokeMultiplier,
        dash: [6, 3], // Dashed line to distinguish from regular planetary lines
        type: 'paran',
        planet1: selectedParanLine.planet1,
        planet2: selectedParanLine.planet2,
        angle1: selectedParanLine.angle1,
        angle2: selectedParanLine.angle2,
        latitude: selectedParanLine.latitude,
      });

      // Add a second line with the other planet's color, slightly offset in dash pattern
      paths.push({
        coords: latitudeCircleCoords,
        color: color2,
        stroke: 2 * strokeMultiplier,
        dash: [3, 6], // Offset dash pattern to create alternating color effect
        type: 'paran',
        planet1: selectedParanLine.planet1,
        planet2: selectedParanLine.planet2,
        angle1: selectedParanLine.angle1,
        angle2: selectedParanLine.angle2,
        latitude: selectedParanLine.latitude,
      });
    }

    // Add local space orb circle (150 miles = 240km) when in local space mode
    if (isLocalSpaceMode && localSpaceOrigin) {
      const LOCAL_SPACE_ORB_KM = 240; // 150 miles
      const orbCircleCoords = generateCircleAroundPoint(
        localSpaceOrigin.lat,
        localSpaceOrigin.lng,
        LOCAL_SPACE_ORB_KM,
        72 // 72 segments for smooth circle
      );

      paths.push({
        coords: orbCircleCoords,
        color: '#8b5cf6', // Purple to match local space theme
        stroke: 2 * strokeMultiplier,
        dash: [8, 4], // Dashed line for orb boundary
        type: 'localSpace',
        isLocalSpace: true,
      });
    }

    return paths;
  }, [astroLines, aspectLines, strokeMultiplier, selectedParanLine, isLocalSpaceMode, localSpaceOrigin]);

  // Memoize zone path separately to prevent full paths recalculation on zone changes
  const zonePath = useMemo(() => {
    // Prefer completed zone over drawing points
    const zonePoints = drawnZone?.points || (zoneDrawingPoints.length > 0 ? zoneDrawingPoints : null);
    if (!zonePoints || zonePoints.length < 2) return null;

    // Create closed polygon (repeat first point at end for polygons with 3+ points)
    const zoneCoords: [number, number][] = zonePoints.map(p => [p.lat, p.lng] as [number, number]);
    if (zonePoints.length > 2) {
      zoneCoords.push([zonePoints[0].lat, zonePoints[0].lng]);
    }

    return {
      coords: zoneCoords,
      color: drawnZone ? '#06b6d4' : '#22d3ee', // Darker when complete, lighter when drawing
      stroke: 2.5 * strokeMultiplier,
      dash: drawnZone ? undefined : [4, 4], // Dashed when drawing, solid when complete
      type: 'planetary' as const,
      planet: 'Zone',
      lineType: drawnZone ? 'Analysis' : 'Drawing',
    };
  }, [drawnZone, zoneDrawingPoints, strokeMultiplier]);

  // Combine main paths with zone path
  const allPaths = useMemo(() => {
    if (zonePath) {
      return [...pathsData, zonePath];
    }
    return pathsData;
  }, [pathsData, zonePath]);

  // Convert zenith points to rings data for visualization
  const zenithMarkersData = useMemo(() => {
    if (!zenithPoints || zenithPoints.length === 0) {
      console.log('No zenith points to render');
      return [];
    }

    console.log('Zenith points received:', zenithPoints.length);
    console.log('First zenith point:', zenithPoints[0]);

    return zenithPoints.map((point): ZenithMarker => ({
      lat: point.latitude,
      lng: point.longitude,
      color: PLANET_COLORS_MAP[point.planet] || '#FFFFFF',
      planet: point.planet,
    }));
  }, [zenithPoints]);

  // Convert paran lines to crossing point markers
  // Longitude is now calculated in WASM for accurate crossing points
  const paranCrossingsData = useMemo(() => {
    if (!paranLines || paranLines.length === 0) {
      return [];
    }

    const crossings: ParanCrossingMarker[] = [];
    const processedKeys = new Set<string>();

    for (const paran of paranLines) {
      // Skip parans without longitude (shouldn't happen now, but safety check)
      if (paran.longitude === undefined) {
        continue;
      }

      // Dedupe by location (rounded to avoid near-duplicates)
      const key = `${paran.latitude.toFixed(0)}-${paran.longitude.toFixed(0)}`;
      if (!processedKeys.has(key)) {
        processedKeys.add(key);
        crossings.push({
          lat: paran.latitude,
          lng: paran.longitude,
          planet1: paran.planet1,
          planet2: paran.planet2,
          angle1: paran.angle1,
          angle2: paran.angle2,
          color1: PLANET_COLORS_MAP[paran.planet1] || '#888888',
          color2: PLANET_COLORS_MAP[paran.planet2] || '#888888',
        });
      }
    }

    return crossings;
  }, [paranLines]);

  // Create line label markers at midpoints of planetary lines
  const lineLabelData = useMemo(() => {
    if (!astroLines || astroLines.length === 0) {
      return [];
    }

    const labels: LineLabelMarker[] = [];

    for (const line of astroLines) {
      // Only label main planetary lines (MC, IC, ASC, DSC)
      if (!line.lineType || !['MC', 'IC', 'ASC', 'DSC'].includes(line.lineType)) {
        continue;
      }

      // Skip if no valid points
      if (!line.points || line.points.length < 2) {
        continue;
      }

      // Find a point near the middle of the line
      const midIndex = Math.floor(line.points.length / 2);
      const midPoint = line.points[midIndex];

      if (midPoint && typeof midPoint[0] === 'number' && typeof midPoint[1] === 'number') {
        labels.push({
          lat: midPoint[0],
          lng: midPoint[1],
          planet: line.planet,
          lineType: line.lineType,
          color: line.color,
        });
      }
    }

    return labels;
  }, [astroLines]);

  // Track when globe render starts
  const renderStartTime = useRef<number>(0);
  const hasTrackedRender = useRef(false);

  useEffect(() => {
    // Start render tracking on mount
    if (!hasTrackedRender.current) {
      renderStartTime.current = Date.now();
      startGlobeRenderTrace();
    }

    if (globeEl.current) {
      const globe = globeEl.current;

      // Track successful render
      if (!hasTrackedRender.current) {
        hasTrackedRender.current = true;
        const renderTime = Date.now() - renderStartTime.current;
        stopGlobeRenderTrace(true, pathsData.length);
        console.log('[WebGL] Globe rendered successfully', {
          renderTimeMs: renderTime,
          lineCount: pathsData.length,
        });
      }

      // Auto-rotate - add null check for controls (may be null if WebGL context failed on mobile)
      try {
        const controls = globe.controls?.();
        if (controls) {
          controls.autoRotate = false;
          controls.autoRotateSpeed = 0.2;
        }
      } catch (e) {
        console.warn('[WebGL] Failed to access globe controls:', e);
        trackGlobeRenderError(e, 'GlobeControls');
      }
    }
  }, [pathsData.length]);

  // Expose globe methods to parent via a proxy object that always reads current ref
  // This ensures the parent always gets the current globe instance, even after remounts
  useImperativeHandle(ref, () => {
    // Return a proxy that forwards all method calls to globeEl.current
    // Using Proxy ensures new methods added to GlobeMethods work automatically
    return new Proxy({} as NonNullable<typeof globeEl.current>, {
      get: (_target, prop: string) => {
        const globe = globeEl.current;
        if (!globe) return undefined;
        const value = (globe as unknown as Record<string, unknown>)[prop];
        // If it's a function, bind it to the globe instance
        if (typeof value === 'function') {
          return value.bind(globe);
        }
        return value;
      },
    });
  }, [isGlobeReady, globeKey, birthDataKey]);

  // Cluster scout markers for performance (zoom-aware with memoization)
  const clusteredScoutMarkers = useMemo(() => {
    if (scoutMarkers.length === 0) return [];
    return zoomAwareClusterScoutMarkers(scoutMarkers, globeAltitude);
  }, [scoutMarkers, globeAltitude]);

  // Combine locations with analysis marker, city marker, pending birth marker, partner marker, paran crossings, line labels, and scout markers for HTML elements
  const combinedHtmlData = useMemo(() => {
    const data: Array<
      PersonLocation |
      { lat: number; lng: number; type: 'analysis' | 'city' | 'paran' | 'pending-birth' | 'relocation' | 'partner' | 'line-label' | 'scout-beneficial' | 'scout-challenging' | 'scout-cluster-beneficial' | 'scout-cluster-challenging' | 'scout-cluster-mixed'; name?: string; avatarUrl?: string; count?: number; beneficialCount?: number; challengingCount?: number } |
      ParanCrossingMarker & { type: 'paran' } |
      LineLabelMarker & { type: 'line-label' }
    > = [...locations];
    if (analysisLocation) {
      data.push({ lat: analysisLocation.lat, lng: analysisLocation.lng, type: 'analysis' as const });
    }
    if (cityLocation) {
      data.push({ lat: cityLocation.lat, lng: cityLocation.lng, type: 'city' as const, name: cityLocation.name });
    }
    if (relocationLocation) {
      data.push({ lat: relocationLocation.lat, lng: relocationLocation.lng, type: 'relocation' as const, name: relocationLocation.name });
    }
    if (pendingBirthLocation) {
      data.push({ lat: pendingBirthLocation.lat, lng: pendingBirthLocation.lng, type: 'pending-birth' as const });
    }
    if (partnerLocation) {
      data.push({ lat: partnerLocation.lat, lng: partnerLocation.lng, type: 'partner' as const, name: partnerLocation.name, avatarUrl: partnerLocation.avatarUrl });
    }
    // Add paran crossing markers
    for (const crossing of paranCrossingsData) {
      data.push({ ...crossing, type: 'paran' as const });
    }
    // Add line label markers (only when enabled)
    if (showLineLabels) {
      for (const label of lineLabelData) {
        data.push({ ...label, type: 'line-label' as const });
      }
    }
    // Add clustered scout location markers (individual or clustered with counts)
    for (const cluster of clusteredScoutMarkers) {
      data.push({
        lat: cluster.lat,
        lng: cluster.lng,
        type: cluster.type,
        count: cluster.count,
        names: cluster.names,
        beneficialCount: cluster.beneficialCount,
        challengingCount: cluster.challengingCount,
      });
    }
    // Add highlighted scout city marker (pulsing ring when hovering in scout panel)
    if (highlightedScoutCity) {
      data.push({
        lat: highlightedScoutCity.lat,
        lng: highlightedScoutCity.lng,
        name: highlightedScoutCity.name,
        type: 'scout-highlight' as const,
      });
    }
    return data;
  }, [locations, analysisLocation, cityLocation, relocationLocation, pendingBirthLocation, partnerLocation, paranCrossingsData, lineLabelData, showLineLabels, clusteredScoutMarkers, highlightedScoutCity]);

  const htmlElementCallback = useCallback((item: PersonLocation | { lat: number; lng: number; type: 'analysis' | 'city' | 'paran' | 'pending-birth' | 'relocation' | 'partner' | 'line-label' | 'scout-beneficial' | 'scout-challenging' | 'scout-highlight' | 'scout-cluster-beneficial' | 'scout-cluster-challenging' | 'scout-cluster-mixed'; name?: string; names?: string[]; avatarUrl?: string; count?: number; beneficialCount?: number; challengingCount?: number } | ParanCrossingMarker & { type: 'paran' } | LineLabelMarker & { type: 'line-label' }) => {
    // Safety check for null/undefined data
    if (!item || typeof item.lat !== 'number' || typeof item.lng !== 'number') {
      return createEmptyMarker();
    }

    // Check if this is a pending birth location marker (avatar)
    if ('type' in item && item.type === 'pending-birth') {
      const cacheKey = getPendingBirthMarkerKey(item.lat, item.lng);
      return globeMarkerCache.getOrCreate(cacheKey, createPendingBirthMarker);
    }

    // Check if this is a partner location marker (duo mode)
    if ('type' in item && item.type === 'partner') {
      const partnerItem = item as { lat: number; lng: number; type: 'partner'; name?: string; avatarUrl?: string };
      const cacheKey = getPartnerMarkerKey(item.lat, item.lng);
      return globeMarkerCache.getOrCreate(cacheKey, () => createPartnerMarker(partnerItem.avatarUrl));
    }

    // Check if this is a paran crossing marker
    if ('type' in item && item.type === 'paran') {
      const paranItem = item as ParanCrossingMarker & { type: 'paran' };
      const cacheKey = getParanMarkerKey(item.lat, item.lng, paranItem.planet1, paranItem.planet2);
      return globeMarkerCache.getOrCreate(cacheKey, () => {
        const el = createParanMarker(paranItem.color1, paranItem.color2);
        // Add click handler to trigger line click
        el.onclick = () => {
          if (onLineClick) {
            onLineClick({
              coords: [[paranItem.lat, paranItem.lng]],
              color: paranItem.color1,
              type: 'paran',
              planet1: paranItem.planet1,
              planet2: paranItem.planet2,
              angle1: paranItem.angle1,
              angle2: paranItem.angle2,
              latitude: paranItem.lat,
            });
          }
        };
        return el;
      });
    }

    // Check if this is a line label marker
    if ('type' in item && item.type === 'line-label') {
      const labelItem = item as LineLabelMarker & { type: 'line-label' };
      const cacheKey = getLineLabelMarkerKey(labelItem.planet, labelItem.lineType);
      return globeMarkerCache.getOrCreate(cacheKey, () =>
        createLineLabelMarker(labelItem.planet, labelItem.lineType, labelItem.color)
      );
    }

    // Check if this is an analysis marker
    if ('type' in item && item.type === 'analysis') {
      const cacheKey = getAnalysisMarkerKey(item.lat, item.lng);
      return globeMarkerCache.getOrCreate(cacheKey, createAnalysisMarker);
    }

    // Check if this is a city marker
    if ('type' in item && item.type === 'city') {
      const cacheKey = getCityMarkerKey(item.lat, item.lng);
      return globeMarkerCache.getOrCreate(cacheKey, createCityMarker);
    }

    // Check if this is a relocation marker
    if ('type' in item && item.type === 'relocation') {
      const cacheKey = getRelocationMarkerKey(item.lat, item.lng);
      return globeMarkerCache.getOrCreate(cacheKey, createRelocationMarker);
    }

    // Check if this is a scout beneficial marker
    // Note: NOT cached because they need click handlers to show city info
    if ('type' in item && item.type === 'scout-beneficial') {
      const scoutItem = item as { lat: number; lng: number; type: 'scout-beneficial'; names?: string[] };
      const cityName = scoutItem.names?.[0] || 'Unknown';
      const handleMarkerClick = onScoutMarkerClick
        ? () => onScoutMarkerClick(scoutItem.lat, scoutItem.lng, cityName)
        : undefined;
      return createScoutBeneficialMarker(handleMarkerClick);
    }

    // Check if this is a scout challenging marker
    // Note: NOT cached because they need click handlers to show city info
    if ('type' in item && item.type === 'scout-challenging') {
      const scoutItem = item as { lat: number; lng: number; type: 'scout-challenging'; names?: string[] };
      const cityName = scoutItem.names?.[0] || 'Unknown';
      const handleMarkerClick = onScoutMarkerClick
        ? () => onScoutMarkerClick(scoutItem.lat, scoutItem.lng, cityName)
        : undefined;
      return createScoutChallengingMarker(handleMarkerClick);
    }

    // Check if this is a scout cluster beneficial marker
    // Note: Clusters are NOT cached because they need click handlers for zoom-to-expand
    if ('type' in item && item.type === 'scout-cluster-beneficial') {
      const clusterItem = item as { lat: number; lng: number; type: 'scout-cluster-beneficial'; count: number };
      const handleClusterClick = () => {
        // Zoom into the cluster location
        globeEl.current?.pointOfView({ lat: clusterItem.lat, lng: clusterItem.lng, altitude: 0.3 }, 800);
      };
      return createScoutClusterBeneficialMarker(clusterItem.count, handleClusterClick);
    }

    // Check if this is a scout cluster challenging marker
    if ('type' in item && item.type === 'scout-cluster-challenging') {
      const clusterItem = item as { lat: number; lng: number; type: 'scout-cluster-challenging'; count: number };
      const handleClusterClick = () => {
        globeEl.current?.pointOfView({ lat: clusterItem.lat, lng: clusterItem.lng, altitude: 0.3 }, 800);
      };
      return createScoutClusterChallengingMarker(clusterItem.count, handleClusterClick);
    }

    // Check if this is a scout cluster mixed marker
    if ('type' in item && item.type === 'scout-cluster-mixed') {
      const clusterItem = item as { lat: number; lng: number; type: 'scout-cluster-mixed'; beneficialCount: number; challengingCount: number };
      const handleClusterClick = () => {
        globeEl.current?.pointOfView({ lat: clusterItem.lat, lng: clusterItem.lng, altitude: 0.3 }, 800);
      };
      return createScoutClusterMixedMarker(clusterItem.beneficialCount, clusterItem.challengingCount, handleClusterClick);
    }

    // Check if this is a scout highlight marker (pulsing ring)
    if ('type' in item && item.type === 'scout-highlight') {
      // Create a fresh pulsing ring marker (not cached since it's temporary)
      return createScoutHighlightMarker();
    }

    // Regular person location
    const personLocation = item as PersonLocation;
    const cacheKey = getPersonMarkerKey(personLocation.id, personLocation.count, personLocation.gender, personLocation.avatarUrl);
    return globeMarkerCache.getOrCreate(cacheKey, () =>
      createPersonMarker(
        personLocation.name,
        personLocation.avatarUrl,
        personLocation.gender,
        personLocation.count,
        () => onPersonClick(personLocation)
      )
    );
  }, [onPersonClick, onLineClick, onScoutMarkerClick]);

  const tileUrl = (x: number, y: number, z: number) =>
    `https://api.maptiler.com/maps/streets/${z}/${x}/${y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`;

  // Show loading state while checking WebGL (with retry indicator)
  if (webglAvailable === null) {
    return <GlobeLoadingState isRetrying={isRetrying} retryCount={retryCount} />;
  }

  // Show fallback if WebGL is not available after retries
  if (webglAvailable === false) {
    return (
      <GlobeFallbackState
        error={webglError}
        onRetry={handleRetry}
        isMobile={isMobile}
        hasBirthData={hasBirthData}
        onShowScout={onGlobeFallbackShowScout}
      />
    );
  }

  return (
    <>
    <GlobeErrorBoundary key={`boundary-${globeKey}`} onRetry={handleRetry}>
      <div ref={globeContainerRef} style={{ width: '100%', height: '100%' }}>
      <Globe
        key={`${birthDataKey}-${globeKey}`}
        ref={globeEl}
        onGlobeReady={() => setIsGlobeReady(true)}
        globeTileEngineUrl={tileUrl}
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere={true}
      atmosphereColor="lightblue"
      atmosphereAltitude={0.25}
      arcsData={migrations || []}
      arcStartLat={(d: Migration) => d?.from?.lat ?? 0}
      arcStartLng={(d: Migration) => d?.from?.lng ?? 0}
      arcEndLat={(d: Migration) => d?.to?.lat ?? 0}
      arcEndLng={(d: Migration) => d?.to?.lng ?? 0}
      arcColor={() => '#fd6a02'}
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={2000}
      htmlElementsData={combinedHtmlData || []}
      htmlLat={(d: { lat: number }) => d?.lat ?? 0}
      htmlLng={(d: { lng: number }) => d?.lng ?? 0}
      htmlAltitude={0}
      htmlElement={htmlElementCallback}
      // Astrocartography paths (includes zone polygon when drawn)
      pathsData={allPaths || []}
      pathPoints={(d: GlobePath) => d?.coords || []}
      pathPointLat={(p: [number, number] | undefined) => p?.[0] ?? 0}
      pathPointLng={(p: [number, number] | undefined) => p?.[1] ?? 0}
      pathPointAlt={0.002} // Lift paths slightly above surface to prevent z-fighting/clipping
      pathColor={(d: GlobePath) => getPathColor(d)}
      pathStroke={(d: GlobePath) => getPathStroke(d)}
      pathDashLength={(d: GlobePath) => d?.dash ? d.dash[0] : 1}
      pathDashGap={(d: GlobePath) => d?.dash ? d.dash[1] : 0}
      pathTransitionDuration={isLocalSpaceMode ? 0 : 500}
      onPathClick={onLineClick ? (path: GlobePath) => onLineClick(path) : undefined}
      // @ts-expect-error - react-globe.gl passes event as third param but types don't reflect it
      onPathHover={(path: GlobePath | null, _prevPath: GlobePath | null, event: MouseEvent) => handlePathHover(path, event)}
      // Zenith point markers (where planet is directly overhead - static 200km radius circles)
      customLayerData={zenithMarkersData || []}
      customThreeObject={(d: ZenithMarker) => {
        // Safety check for null/undefined data
        if (!d || typeof d.lat !== 'number' || typeof d.lng !== 'number') {
          return null;
        }
        // Use object pool for THREE.js objects to reduce GC pressure
        return zenithRingPool.createZenithRing(d.color || '#FFFFFF', 200);
      }}
      customThreeObjectUpdate={(obj: THREE.Object3D, d: ZenithMarker) => {
        // Safety check for null/undefined data
        if (!obj || !d || typeof d.lat !== 'number' || typeof d.lng !== 'number') return;
        try {
          // Position the ring at zenith point coordinates
          const coords = globeEl.current?.getCoords(d.lat, d.lng, 0.001);
          if (coords) {
            Object.assign(obj.position, coords);
            // Orient ring to face outward from globe center (perpendicular to surface)
            const normal = new THREE.Vector3(coords.x, coords.y, coords.z).normalize();
            obj.lookAt(normal.multiplyScalar(2).add(obj.position));
          }
        } catch (e) {
          console.warn('Failed to update zenith marker:', e);
        }
      }}
      // Handle clicks for coordinate selection and single-click tooltip
      onGlobeClick={handleGlobeClick}
      // Track zoom level for marker clustering
      onZoom={handleZoom}
    />
      </div>
    </GlobeErrorBoundary>

      {/* Line hover tooltip */}
      {hoveredLine && tooltipPosition && (
        <LineHoverTooltip line={hoveredLine} position={tooltipPosition} />
      )}

      {/* Zone drawing mode indicator */}
      {isDrawingZone && (
        <ZoneDrawingIndicator pointsCount={zoneDrawingPoints.length} />
      )}

      {/* Zone analysis result badge */}
      {drawnZone && !isDrawingZone && (
        <ZoneActiveBadge pointsCount={drawnZone.points.length} />
      )}
    </>
  );
});

export default React.memo(MigrationGlobeComponent);
