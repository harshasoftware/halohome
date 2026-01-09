/**
 * NatalChart Component
 * Renders an SVG-based natal/birth chart wheel
 */

import React, { useMemo, useState, useCallback } from 'react';
import type { PlanetaryPosition, Planet, NatalPlanetPosition, HouseSystem, ZodiacType } from '@/lib/astro-types';
import { PLANET_COLORS } from '@/lib/astro-types';
import type { IconType } from 'react-icons';
import {
  GiAries,
  GiTaurus,
  GiGemini,
  GiCancer,
  GiLeo,
  GiVirgo,
  GiLibra,
  GiScorpio,
  GiSagittarius,
  GiCapricorn,
  GiAquarius,
  GiPisces,
} from 'react-icons/gi';

// Zodiac icons: Game Icons (Gi) for consistent zodiac glyph set
const ZODIAC_ICONS: Record<string, IconType> = {
  Aries: GiAries,
  Taurus: GiTaurus,
  Gemini: GiGemini,
  Cancer: GiCancer,
  Leo: GiLeo,
  Virgo: GiVirgo,
  Libra: GiLibra,
  Scorpio: GiScorpio,
  Sagittarius: GiSagittarius,
  Capricorn: GiCapricorn,
  Aquarius: GiAquarius,
  Pisces: GiPisces,
};

// Planet glyphs rendered via the bundled symbol font (Noto Sans Symbols 2)
// These are standard Unicode astrology/astronomy symbols.
const PLANET_GLYPHS: Record<Planet, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Chiron: '⚷',
  NorthNode: '☊',
};

// Zodiac signs data with element info
const ZODIAC_SIGNS = [
  { name: 'Aries', element: 'fire' },
  { name: 'Taurus', element: 'earth' },
  { name: 'Gemini', element: 'air' },
  { name: 'Cancer', element: 'water' },
  { name: 'Leo', element: 'fire' },
  { name: 'Virgo', element: 'earth' },
  { name: 'Libra', element: 'air' },
  { name: 'Scorpio', element: 'water' },
  { name: 'Sagittarius', element: 'fire' },
  { name: 'Capricorn', element: 'earth' },
  { name: 'Aquarius', element: 'air' },
  { name: 'Pisces', element: 'water' },
];

// Zodiac sign abbreviations for compact display
const ZODIAC_ABBREV: Record<string, string> = {
  Aries: 'Ari',
  Taurus: 'Tau',
  Gemini: 'Gem',
  Cancer: 'Can',
  Leo: 'Leo',
  Virgo: 'Vir',
  Libra: 'Lib',
  Scorpio: 'Sco',
  Sagittarius: 'Sag',
  Capricorn: 'Cap',
  Aquarius: 'Aqu',
  Pisces: 'Pis',
};

const PLANET_GLYPH_FONT_FAMILY = "'Noto Sans Symbols 2', 'Segoe UI Symbol', 'Apple Symbols', serif";

// Aspect definitions with angles and orbs
type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

interface AspectDef {
  angle: number;
  orb: number;
  color: { light: string; dark: string };
  symbol: string;
  harmony: 'hard' | 'soft' | 'neutral';
}

const ASPECTS: Record<AspectType, AspectDef> = {
  conjunction: {
    angle: 0,
    orb: 8,
    color: { light: '#8B5CF6', dark: '#A78BFA' }, // Purple
    symbol: '☌',
    harmony: 'neutral',
  },
  sextile: {
    angle: 60,
    orb: 4,
    color: { light: '#10B981', dark: '#34D399' }, // Green
    symbol: '⚹',
    harmony: 'soft',
  },
  square: {
    angle: 90,
    orb: 6,
    color: { light: '#EF4444', dark: '#F87171' }, // Red
    symbol: '□',
    harmony: 'hard',
  },
  trine: {
    angle: 120,
    orb: 6,
    color: { light: '#3B82F6', dark: '#60A5FA' }, // Blue
    symbol: '△',
    harmony: 'soft',
  },
  opposition: {
    angle: 180,
    orb: 8,
    color: { light: '#F59E0B', dark: '#FBBF24' }, // Amber
    symbol: '☍',
    harmony: 'hard',
  },
};

// Calculate the angular difference between two positions (0-180°)
function getAngularDifference(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

// Find aspect between two planets
interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  orb: number; // Actual orb (how close to exact)
  applying: boolean; // Whether aspect is applying or separating
}

function findAspect(
  lon1: number,
  lon2: number,
  planet1: Planet,
  planet2: Planet
): Aspect | null {
  const diff = getAngularDifference(lon1, lon2);

  for (const [type, def] of Object.entries(ASPECTS) as [AspectType, AspectDef][]) {
    const orbFromExact = Math.abs(diff - def.angle);
    if (orbFromExact <= def.orb) {
      return {
        planet1,
        planet2,
        type,
        orb: orbFromExact,
        applying: lon2 > lon1, // Simplified
      };
    }
  }
  return null;
}

// Element colors for zodiac segments (tuned for the Landing page "cosmic glass" vibe)
const ELEMENT_COLORS: Record<string, { light: string; dark: string }> = {
  fire: { light: 'rgba(251, 191, 36, 0.16)', dark: 'rgba(251, 191, 36, 0.10)' },      // amber glow
  earth: { light: 'rgba(34, 197, 94, 0.14)', dark: 'rgba(34, 197, 94, 0.08)' },       // emerald glow
  air: { light: 'rgba(100, 149, 237, 0.14)', dark: 'rgba(100, 149, 237, 0.08)' },     // cornflower glow
  water: { light: 'rgba(147, 112, 219, 0.14)', dark: 'rgba(147, 112, 219, 0.10)' },   // purple glow
};

interface NatalChartProps {
  planetaryPositions: PlanetaryPosition[];
  natalPositions?: NatalPlanetPosition[];  // Enhanced natal data from WASM
  ascendant?: number; // Ecliptic longitude of ASC
  midheaven?: number; // Ecliptic longitude of MC
  houseCusps?: number[];  // Array of 12 house cusp degrees
  houseSystem?: HouseSystem;
  zodiacType?: ZodiacType;
  ayanamsa?: number;  // For sidereal display
  size?: number;
  showHouses?: boolean;
  isDark?: boolean;
  onPlanetClick?: (planet: Planet, position: { sign: string; degree: number; house?: number }) => void;
  onSignClick?: (sign: string, index: number) => void;
}

// Tooltip component for hover info
interface TooltipInfo {
  x: number;
  y: number;
  content: React.ReactNode;
}

// Convert ecliptic longitude to chart angle (ASC at 180°, signs go counter-clockwise)
function toChartAngle(eclipticLongitude: number, ascendant: number): number {
  // In natal charts, ASC is on the left (180°), and zodiac signs go counter-clockwise
  // When ecliptic longitude increases, chart angle should increase (counter-clockwise)
  // Chart angle = 180 + (ecliptic - ASC)
  let angle = 180 + (eclipticLongitude - ascendant);
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

// Get zodiac sign index and degree within sign
function getZodiacPosition(eclipticLongitude: number): { sign: number; degree: number } {
  const normalized = ((eclipticLongitude % 360) + 360) % 360;
  const sign = Math.floor(normalized / 30);
  const degree = normalized % 30;
  return { sign, degree };
}

// Format degree as D°M'
function formatDegree(degree: number): string {
  const d = Math.floor(degree);
  const m = Math.floor((degree - d) * 60);
  return `${d}°${m}'`;
}

function normalize360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function toDisplayLongitudeFromNatal(
  pos: NatalPlanetPosition,
  zodiacType: ZodiacType,
  ayanamsa?: number
): number {
  if (zodiacType === 'sidereal') {
    if (typeof pos.longitudeSidereal === 'number') return normalize360(pos.longitudeSidereal);
    return normalize360(pos.longitude - (ayanamsa ?? 0));
  }
  return normalize360(pos.longitude);
}

function toDisplayLongitudeFromEcliptic(
  eclipticLongitude: number,
  zodiacType: ZodiacType,
  ayanamsa?: number
): number {
  if (zodiacType === 'sidereal') return normalize360(eclipticLongitude - (ayanamsa ?? 0));
  return normalize360(eclipticLongitude);
}

export const NatalChart: React.FC<NatalChartProps> = ({
  planetaryPositions,
  natalPositions,
  ascendant = 0,
  midheaven,
  houseCusps: providedHouseCusps,
  houseSystem = 'equal',
  zodiacType = 'tropical',
  ayanamsa,
  size = 300,
  showHouses = true,
  isDark = false,
  onPlanetClick,
  onSignClick,
}) => {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<Planet | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null); // For mobile tap
  const [hoveredSign, setHoveredSign] = useState<number | null>(null);

  // Active planet for aspect display (hovered on desktop, selected on mobile)
  const activePlanet = hoveredPlanet || selectedPlanet;

  const palette = useMemo(() => {
    if (isDark) {
      return {
        bgOuter: '#0a0a0a',
        bgInner: '#050505',
        border: 'rgba(255, 255, 255, 0.10)',
        borderStrong: 'rgba(255, 255, 255, 0.18)',
        text: 'rgba(255, 255, 255, 0.92)',
        textMuted: 'rgba(161, 161, 170, 0.95)',
        textFaint: 'rgba(161, 161, 170, 0.70)',
        icon: 'rgba(255, 255, 255, 0.78)',
        iconMuted: 'rgba(255, 255, 255, 0.62)',
      } as const;
    }
    return {
      bgOuter: '#FFFFFF',
      bgInner: '#FFFFFF',
      border: 'rgba(15, 23, 42, 0.14)',
      borderStrong: 'rgba(15, 23, 42, 0.22)',
      text: '#0F172A',
      textMuted: 'rgba(71, 85, 105, 0.92)',
      textFaint: 'rgba(71, 85, 105, 0.70)',
      icon: '#0F172A',
      iconMuted: 'rgba(15, 23, 42, 0.65)',
    } as const;
  }, [isDark]);

  const center = size / 2;
  const outerRadius = size / 2 - 5;
  const zodiacOuterRadius = outerRadius;
  const zodiacInnerRadius = outerRadius * 0.85;
  const houseOuterRadius = zodiacInnerRadius;
  const houseInnerRadius = outerRadius * 0.55;
  const planetRadius = outerRadius * 0.7;
  const innerCircleRadius = outerRadius * 0.35;

  // Always anchor the chart rotation to the actual 1st-house cusp (ASC) when cusps are provided.
  // This prevents systematic "one house off" visuals if the ASC value differs slightly from cusp[0].
  const chartAscendant = useMemo(() => {
    if (providedHouseCusps && providedHouseCusps.length === 12) {
      return normalize360(providedHouseCusps[0]);
    }
    return normalize360(ascendant);
  }, [providedHouseCusps, ascendant]);

  // Get planet info for tooltip
  const getPlanetInfo = useCallback((planet: Planet) => {
    // Try natalPositions first for more accurate data
    if (natalPositions) {
      const natalPos = natalPositions.find(p => p.planet === planet);
      if (natalPos) {
        return {
          sign: ZODIAC_SIGNS[natalPos.signIndex]?.name || 'Unknown',
          degree: natalPos.degreeInSign,
          house: natalPos.house,
          retrograde: natalPos.retrograde,
        };
      }
    }
    // Fallback to planetaryPositions
    const pos = planetaryPositions.find(p => p.planet === planet);
    if (pos) {
      const displayLon = toDisplayLongitudeFromEcliptic(pos.eclipticLongitude, zodiacType, ayanamsa);
      const zodiacPos = getZodiacPosition(displayLon);
      return {
        sign: ZODIAC_SIGNS[zodiacPos.sign]?.name || 'Unknown',
        degree: zodiacPos.degree,
        house: undefined,
        retrograde: false,
      };
    }
    return null;
  }, [natalPositions, planetaryPositions]);

  // Handle planet hover
  const handlePlanetHover = useCallback((planet: Planet, x: number, y: number) => {
    setHoveredPlanet(planet);
    const info = getPlanetInfo(planet);
    if (info) {
      setTooltip({
        x,
        y,
        content: (
          <div className="text-xs">
            <div className="font-bold text-slate-800 dark:text-white">{planet}</div>
            <div className="text-slate-600 dark:text-zinc-300">
              {info.sign} {formatDegree(info.degree)}
            </div>
            {info.house && (
              <div className="text-amber-600 dark:text-amber-400">House {info.house}</div>
            )}
            {info.retrograde && (
              <div className="text-red-500">Retrograde</div>
            )}
          </div>
        ),
      });
    }
  }, [getPlanetInfo]);

  // Handle sign hover
  const handleSignHover = useCallback((signIndex: number, x: number, y: number) => {
    setHoveredSign(signIndex);
    const sign = ZODIAC_SIGNS[signIndex];
    if (sign) {
      setTooltip({
        x,
        y,
        content: (
          <div className="text-xs">
            <div className="font-bold text-slate-800 dark:text-white">{sign.name}</div>
            <div className="text-slate-600 dark:text-zinc-300 capitalize">{sign.element} sign</div>
          </div>
        ),
      });
    }
  }, []);

  // Clear hover state
  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredPlanet(null);
    setHoveredSign(null);
  }, []);

  // Use provided house cusps or calculate default (Equal house system)
  const houseCusps = useMemo(() => {
    if (providedHouseCusps && providedHouseCusps.length === 12) {
      return providedHouseCusps.map(normalize360);
    }
    // Fallback: approximate house cusps if we don't have WASM cusps
    // - equal: 30° houses from exact ASC degree
    // - whole_sign: 30° houses from 0° of ASC sign
    return Array.from({ length: 12 }, (_, i) => {
      const baseAsc = houseSystem === 'whole_sign'
        ? Math.floor(chartAscendant / 30) * 30
        : chartAscendant;
      return normalize360(baseAsc + i * 30);
    });
  }, [providedHouseCusps, chartAscendant, houseSystem]);

  const houseCuspAngles = useMemo(() => {
    // Chart angles of each cusp line for overlap avoidance
    return houseCusps.map((cusp) => toChartAngle(cusp, chartAscendant));
  }, [houseCusps, chartAscendant]);

  // Calculate planet positions on chart, handling overlaps by scaling instead of moving
  const planetPositions = useMemo(() => {
    const hasNatal = !!natalPositions && natalPositions.length > 0;
    const hasPlanets = !!planetaryPositions && planetaryPositions.length > 0;
    if (!hasNatal && !hasPlanets) return [];

    // Use the SAME longitude basis as the calculation settings (tropical vs sidereal)
    // so planet placements align with house cusps + house numbers from WASM.
    const base: Array<{ planet: Planet; eclipticLongitude: number }> = hasNatal
      ? natalPositions!.map((p) => ({
          planet: p.planet,
          eclipticLongitude: toDisplayLongitudeFromNatal(p, zodiacType, ayanamsa),
        }))
      : planetaryPositions!.map((p) => ({
          planet: p.planet,
          eclipticLongitude: toDisplayLongitudeFromEcliptic(p.eclipticLongitude, zodiacType, ayanamsa),
        }));

    // Convert to chart positions - keep planets at their TRUE positions
    const positions = base.map((pos) => {
      const chartAngle = toChartAngle(pos.eclipticLongitude, chartAscendant);
      return {
        ...pos,
        chartAngle,
        adjustedAngle: chartAngle, // No adjustment - stay at true position
        scale: 1.0, // Will be adjusted for crowding
        radiusOffset: 0, // For staggered radial positioning
      };
    });

    // Sort by chart angle for proximity detection
    positions.sort((a, b) => a.chartAngle - b.chartAngle);

    // Calculate crowding and assign scales/offsets
    // Group planets that are close together (within 8°)
    const proximityThreshold = 8;
    const groups: typeof positions[] = [];
    let currentGroup: typeof positions = [];

    for (let i = 0; i < positions.length; i++) {
      const curr = positions[i];

      if (currentGroup.length === 0) {
        currentGroup.push(curr);
      } else {
        const lastInGroup = currentGroup[currentGroup.length - 1];
        let diff = curr.chartAngle - lastInGroup.chartAngle;
        if (diff < 0) diff += 360;

        if (diff < proximityThreshold) {
          currentGroup.push(curr);
        } else {
          groups.push(currentGroup);
          currentGroup = [curr];
        }
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    // Check wrap-around: first and last groups might be close
    if (groups.length >= 2) {
      const firstGroup = groups[0];
      const lastGroup = groups[groups.length - 1];
      const firstAngle = firstGroup[0].chartAngle;
      const lastAngle = lastGroup[lastGroup.length - 1].chartAngle;
      const wrapDiff = (360 - lastAngle) + firstAngle;

      if (wrapDiff < proximityThreshold) {
        // Merge first and last groups
        const merged = [...lastGroup, ...firstGroup];
        groups.pop();
        groups.shift();
        groups.push(merged);
      }
    }

    // Apply scaling and radial offset based on group size
    for (const group of groups) {
      const groupSize = group.length;

      if (groupSize === 1) {
        // Single planet - no adjustment needed
        group[0].scale = 1.0;
        group[0].radiusOffset = 0;
      } else if (groupSize === 2) {
        // Two planets close together - slight scale down and stagger radially
        group[0].scale = 0.85;
        group[0].radiusOffset = -8; // Inner
        group[1].scale = 0.85;
        group[1].radiusOffset = 8; // Outer
      } else if (groupSize === 3) {
        // Three planets - more aggressive scaling and triple stagger
        group[0].scale = 0.75;
        group[0].radiusOffset = -12;
        group[1].scale = 0.75;
        group[1].radiusOffset = 0;
        group[2].scale = 0.75;
        group[2].radiusOffset = 12;
      } else {
        // 4+ planets - maximum scaling and alternate radial positions
        const baseScale = Math.max(0.6, 1 - (groupSize - 1) * 0.1);
        group.forEach((planet, idx) => {
          planet.scale = baseScale;
          // Alternate between inner (-12), middle (0), outer (12)
          const offsetPattern = [-12, 0, 12, -6, 6];
          planet.radiusOffset = offsetPattern[idx % offsetPattern.length];
        });
      }
    }

    // --- House boundary safety pass ---
    // When planets are close to a cusp line, their circle/glyph can visually spill into the adjacent house.
    // We keep the angle true, but push them slightly outward (reduces angular footprint) and/or shrink.
    const degDistance = (a: number, b: number) => {
      let d = Math.abs(a - b) % 360;
      if (d > 180) d = 360 - d;
      return d;
    };
    const maxOutward = Math.max(6, outerRadius * 0.08); // px
    const paddingDeg = 1.2;

    for (const p of positions) {
      // Use the intended (possibly crowding-scaled) size
      const baseCircleRadius = size * 0.04;
      const symbolRadiusPx = baseCircleRadius * p.scale;

      // Start with the currently assigned radius
      let effectiveRadius = planetRadius + p.radiusOffset;
      // Cap to stay inside the zodiac ring
      const maxAllowedRadius = zodiacInnerRadius - symbolRadiusPx - 6;
      effectiveRadius = Math.min(effectiveRadius, maxAllowedRadius);

      // Angular half-width of the symbol at this radius
      const halfAngleDeg = (Math.atan2(symbolRadiusPx, Math.max(1, effectiveRadius)) * 180) / Math.PI;

      // Find nearest cusp line distance
      const minCuspDist = houseCuspAngles.reduce((min, cuspAngle) => {
        const d = degDistance(p.chartAngle, cuspAngle);
        return d < min ? d : min;
      }, Number.POSITIVE_INFINITY);

      const needed = halfAngleDeg + paddingDeg;
      if (minCuspDist < needed) {
        // First: push outward to reduce angular footprint, within safe bounds
        const outward = Math.min(maxOutward, (needed - minCuspDist) * 3);
        const boostedRadius = Math.min(planetRadius + p.radiusOffset + outward, maxAllowedRadius);
        p.radiusOffset = boostedRadius - planetRadius;

        // Recompute half-angle after pushing outward; if still tight, shrink scale.
        const newHalfAngleDeg = (Math.atan2(symbolRadiusPx, Math.max(1, boostedRadius)) * 180) / Math.PI;
        const newNeeded = newHalfAngleDeg + paddingDeg;
        if (minCuspDist < newNeeded) {
          const ratio = Math.max(0.55, minCuspDist / newNeeded);
          p.scale = Math.max(0.55, p.scale * ratio);
        }
      }
    }

    return positions;
  }, [
    natalPositions,
    planetaryPositions,
    zodiacType,
    ayanamsa,
    chartAscendant,
    houseCuspAngles,
    outerRadius,
    zodiacInnerRadius,
    planetRadius,
    size,
  ]);

  // Calculate all aspects between planets
  const allAspects = useMemo(() => {
    const aspects: Aspect[] = [];
    const positions = planetPositions;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const p1 = positions[i];
        const p2 = positions[j];
        const aspect = findAspect(
          p1.eclipticLongitude,
          p2.eclipticLongitude,
          p1.planet,
          p2.planet
        );
        if (aspect) {
          aspects.push(aspect);
        }
      }
    }

    return aspects;
  }, [planetPositions]);

  // Get aspects for the active planet (hovered or selected)
  const activeAspects = useMemo(() => {
    if (!activePlanet) return [];
    return allAspects.filter(
      (a) => a.planet1 === activePlanet || a.planet2 === activePlanet
    );
  }, [activePlanet, allAspects]);

  // Convert polar to cartesian
  const polarToCartesian = (angle: number, radius: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center - radius * Math.sin(radians),
    };
  };

  // Generate arc path (handles angle wrapping around 360°)
  const arcPath = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const start1 = polarToCartesian(startAngle, outerR);
    const end1 = polarToCartesian(endAngle, outerR);
    const start2 = polarToCartesian(endAngle, innerR);
    const end2 = polarToCartesian(startAngle, innerR);

    // Calculate arc span, handling wrap-around (e.g., 350° to 20° = 30°, not -330°)
    let arcSpan = endAngle - startAngle;
    if (arcSpan < 0) arcSpan += 360;
    const largeArc = arcSpan > 180 ? 1 : 0;

    return `
      M ${start1.x} ${start1.y}
      A ${outerR} ${outerR} 0 ${largeArc} 0 ${end1.x} ${end1.y}
      L ${start2.x} ${start2.y}
      A ${innerR} ${innerR} 0 ${largeArc} 1 ${end2.x} ${end2.y}
      Z
    `;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="select-none"
    >
      <defs>
        {/* Soft cosmic glow used on hover */}
        <filter id="cosmicGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(147, 112, 219, 0.35)" />
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="rgba(147, 112, 219, 0.18)" />
        </filter>
      </defs>

      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill={palette.bgOuter}
        stroke={palette.border}
        strokeWidth={1.25}
      />

      {/* Zodiac wheel segments */}
      {ZODIAC_SIGNS.map((sign, i) => {
        // Zodiac signs go counter-clockwise from ASC position
        // Sign i starts at ecliptic longitude i*30, convert to chart angle
        const startAngle = toChartAngle(i * 30, chartAscendant);
        const endAngle = (startAngle + 30) % 360;  // Signs span 30° counter-clockwise
        const colors = ELEMENT_COLORS[sign.element];
        const midAngle = startAngle + 15;
        const labelPos = polarToCartesian(midAngle, (zodiacOuterRadius + zodiacInnerRadius) / 2);
        const isHovered = hoveredSign === i;

        return (
          <g
            key={sign.name}
            className="cursor-pointer transition-opacity"
            style={{ opacity: hoveredSign !== null && !isHovered ? 0.6 : 1 }}
            onMouseEnter={(e) => {
              const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
              if (rect) {
                handleSignHover(i, e.clientX - rect.left, e.clientY - rect.top);
              }
            }}
            onMouseLeave={handleMouseLeave}
            onClick={() => onSignClick?.(sign.name, i)}
          >
            <path
              d={arcPath(startAngle, endAngle, zodiacInnerRadius, zodiacOuterRadius)}
              fill={isDark ? colors.dark : colors.light}
              stroke={isHovered ? palette.borderStrong : palette.border}
              strokeWidth={isHovered ? 1.8 : 0.9}
              filter={isHovered ? 'url(#cosmicGlow)' : undefined}
            />
            {/* Zodiac sign SVG icon */}
            {(() => {
              const ZodiacIcon = ZODIAC_ICONS[sign.name];
              // Gi glyphs are visually heavier than FA; render slightly smaller/lighter for consistency
              const iconSize = size * 0.048;
              const iconX = labelPos.x - iconSize / 2;
              const iconY = labelPos.y - iconSize / 2 - (isHovered ? 4 : 0);
              return (
                ZodiacIcon ? (
                  <ZodiacIcon
                    x={iconX}
                    y={iconY}
                    width={iconSize}
                    height={iconSize}
                    className="pointer-events-none"
                    color={isHovered ? palette.icon : palette.iconMuted}
                    style={{ opacity: isHovered ? 1 : 0.82 }}
                  />
                ) : null
              );
            })()}
            {/* Show English name on hover */}
            {isHovered && size >= 200 && (
              <text
                x={labelPos.x}
                y={labelPos.y + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.028}
                fill={palette.textFaint}
                className="pointer-events-none"
              >
                {sign.name}
              </text>
            )}
          </g>
        );
      })}

      {/* House lines */}
      {showHouses && houseCusps.map((cusp, i) => {
        const angle = toChartAngle(cusp, chartAscendant);
        const inner = polarToCartesian(angle, innerCircleRadius);
        const outer = polarToCartesian(angle, houseOuterRadius);
        // Cardinal houses (1, 4, 7, 10) get thicker lines
        const isCardinal = i === 0 || i === 3 || i === 6 || i === 9;

        // House midpoint for label positioning:
        // compute midpoint in *ecliptic longitude space* (robust across 0°/360° wrap),
        // then convert to chart angle.
        const nextCusp = houseCusps[(i + 1) % 12];
        const span = normalize360(nextCusp - cusp); // 0..360
        const midLon = normalize360(cusp + span / 2);
        const labelAngle = toChartAngle(midLon, chartAscendant);
        // Position labels closer to the inner circle to avoid overlap with planets
        const labelRadius = (houseInnerRadius + innerCircleRadius) / 2;
        const labelPos = polarToCartesian(labelAngle, labelRadius);

        return (
          <g key={`house-${i}`}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={isCardinal ? palette.borderStrong : palette.border}
              strokeWidth={isCardinal ? 2.1 : 1.2}
              opacity={1}
              strokeDasharray={isCardinal ? undefined : '2.5,2.5'}
              strokeLinecap="round"
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.035}
              fontWeight={isCardinal ? '700' : '600'}
              fill={isCardinal ? palette.text : palette.textMuted}
              className="pointer-events-none select-none"
            >
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* Inner circle */}
      <circle
        cx={center}
        cy={center}
        r={innerCircleRadius}
        fill={palette.bgInner}
        stroke={palette.border}
        strokeWidth={1.1}
      />

      {/* Aspect lines - shown when a planet is hovered or tapped */}
      {activeAspects.length > 0 && (
        <g className="aspect-lines">
          {activeAspects.map((aspect, idx) => {
            // Find positions of both planets
            const pos1 = planetPositions.find((p) => p.planet === aspect.planet1);
            const pos2 = planetPositions.find((p) => p.planet === aspect.planet2);
            if (!pos1 || !pos2) return null;

            // Calculate line endpoints at inner circle edge (not at planet positions)
            const aspectLineRadius = innerCircleRadius - 4;
            const p1Coords = polarToCartesian(pos1.adjustedAngle, aspectLineRadius);
            const p2Coords = polarToCartesian(pos2.adjustedAngle, aspectLineRadius);

            const aspectDef = ASPECTS[aspect.type];
            const color = isDark ? aspectDef.color.dark : aspectDef.color.light;

            // Line style based on aspect harmony
            const strokeDasharray =
              aspectDef.harmony === 'hard'
                ? '4,3'
                : aspectDef.harmony === 'soft'
                ? undefined
                : '2,2';

            // Tighter orb = more opaque line
            const maxOrb = aspectDef.orb;
            const opacity = Math.max(0.4, 1 - aspect.orb / maxOrb);

            return (
              <g key={`aspect-${idx}`}>
                <line
                  x1={p1Coords.x}
                  y1={p1Coords.y}
                  x2={p2Coords.x}
                  y2={p2Coords.y}
                  stroke={color}
                  strokeWidth={aspect.orb < 2 ? 2.5 : 1.8}
                  strokeDasharray={strokeDasharray}
                  strokeLinecap="round"
                  opacity={opacity}
                  className="transition-opacity duration-200"
                />
                {/* Aspect symbol at midpoint for tight orbs */}
                {aspect.orb < 3 && size >= 250 && (
                  <text
                    x={(p1Coords.x + p2Coords.x) / 2}
                    y={(p1Coords.y + p2Coords.y) / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size * 0.028}
                    fill={color}
                    className="pointer-events-none select-none"
                    style={{ fontFamily: PLANET_GLYPH_FONT_FAMILY }}
                  >
                    {aspectDef.symbol}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* ASC/MC/DSC/IC labels - derived from house cusps for alignment */}
      {(() => {
        // Use house cusps directly for accurate positioning
        // houseCusps[0] = 1st house (ASC), [3] = 4th (IC), [6] = 7th (DSC), [9] = 10th (MC)
        const ascAngle = toChartAngle(houseCusps[0], chartAscendant);   // 1st house cusp
        const icAngle = toChartAngle(houseCusps[3], chartAscendant);    // 4th house cusp
        const dscAngle = toChartAngle(houseCusps[6], chartAscendant);   // 7th house cusp
        const mcAngle = toChartAngle(houseCusps[9], chartAscendant);    // 10th house cusp

        return [
          { angle: ascAngle, label: 'ASC' },
          { angle: mcAngle, label: 'MC' },
          { angle: dscAngle, label: 'DSC' },
          { angle: icAngle, label: 'IC' },
        ].map(({ angle, label }) => {
          const pos = polarToCartesian(angle, zodiacInnerRadius - 8);
          return (
            <text
              key={label}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.03}
              fill={palette.textMuted}
              fontWeight="600"
            >
              {label}
            </text>
          );
        });
      })()}

      {/* Planet symbols */}
      {planetPositions.map((pos) => {
        // Apply radiusOffset to position planets at different radial distances when crowded
        const effectiveRadius = planetRadius + pos.radiusOffset;
        const symbolPos = polarToCartesian(pos.adjustedAngle, effectiveRadius);
        const color = PLANET_COLORS[pos.planet] || '#888888';
        const isHovered = hoveredPlanet === pos.planet;
        const isSelected = selectedPlanet === pos.planet;
        const isActive = isHovered || isSelected;

        // Apply scale to sizes - scaled planets are smaller to fit in crowded areas
        const baseCircleRadius = size * 0.04;
        const scaledCircleRadius = baseCircleRadius * pos.scale;
        const glyph = PLANET_GLYPHS[pos.planet] ?? '?';

        return (
          <g
            key={pos.planet}
            className="cursor-pointer"
            style={{
              transform: isActive ? 'scale(1.15)' : 'scale(1)',
              transformOrigin: `${symbolPos.x}px ${symbolPos.y}px`,
              transition: 'transform 0.15s ease-out',
              filter: isActive ? `drop-shadow(0 0 6px ${color}55)` : undefined,
            }}
            onMouseEnter={(e) => {
              const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
              if (rect) {
                handlePlanetHover(pos.planet, e.clientX - rect.left, e.clientY - rect.top);
              }
            }}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              // Toggle selection for mobile/tablet (tap to show aspects)
              setSelectedPlanet((prev) => (prev === pos.planet ? null : pos.planet));
              const info = getPlanetInfo(pos.planet);
              if (info) {
                onPlanetClick?.(pos.planet, {
                  sign: info.sign,
                  degree: info.degree,
                  house: info.house,
                });
              }
            }}
            onTouchStart={(e) => {
              // Prevent double-handling on touch devices
              e.preventDefault();
              // Toggle selection
              setSelectedPlanet((prev) => (prev === pos.planet ? null : pos.planet));
              // Show tooltip
              const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
              if (rect && e.touches[0]) {
                handlePlanetHover(pos.planet, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
              }
            }}
          >
            {/* Planet symbol background - scaled based on crowding */}
            <circle
              cx={symbolPos.x}
              cy={symbolPos.y}
              r={scaledCircleRadius}
              fill={isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF'}
              stroke={color}
              strokeWidth={isActive ? 2.5 : (pos.scale < 1 ? 1 : 1.5)}
            />
            {/* Planet SVG icon - scaled based on crowding */}
            {(() => {
              // FA glyphs tend to read lighter than Gi; render a touch larger for balance
              const iconSize = scaledCircleRadius * 1.6;
              return (
                <text
                  x={symbolPos.x}
                  y={symbolPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(10, iconSize)}
                  fill={color}
                  className="pointer-events-none select-none"
                  style={{
                    fontFamily: PLANET_GLYPH_FONT_FAMILY,
                    opacity: 0.92,
                  }}
                >
                  {glyph}
                </text>
              );
            })()}
          </g>
        );
      })}

      {/* Aspect lines in center (simplified - major aspects only) */}
      {/* This is a simplified version - full aspect calculation would require more logic */}

      {/* Tooltip overlay */}
      {tooltip && (
        <foreignObject
          x={Math.min(tooltip.x + 10, size - 100)}
          y={Math.max(tooltip.y - 40, 5)}
          width={90}
          height={60}
          className="pointer-events-none"
        >
          <div className="rounded-md shadow-lg px-2 py-1.5" style={{
            background: isDark ? 'rgba(10, 10, 10, 0.92)' : 'rgba(255, 255, 255, 0.96)',
            border: `1px solid ${palette.border}`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}>
            {tooltip.content}
          </div>
        </foreignObject>
      )}
    </svg>
  );
};

// Planet info list component
interface PlanetInfoListProps {
  planetaryPositions: PlanetaryPosition[];
  natalPositions?: NatalPlanetPosition[];  // Enhanced data with house placements
  compact?: boolean;
  isDark?: boolean;
  showHouses?: boolean;
  showEnglishNames?: boolean;
  onPlanetClick?: (planet: Planet) => void;
}

export const PlanetInfoList: React.FC<PlanetInfoListProps> = ({
  planetaryPositions,
  natalPositions,
  compact = false,
  isDark = false,
  showHouses = true,
  showEnglishNames = false,
  onPlanetClick,
}) => {
  // Use natalPositions if available, otherwise fall back to planetaryPositions
  if (natalPositions && natalPositions.length > 0) {
    return (
      <div className={`grid ${compact ? 'grid-cols-3 gap-1' : 'grid-cols-2 gap-2'}`}>
        {natalPositions.map((pos) => {
          const sign = ZODIAC_SIGNS[pos.signIndex];
          const color = PLANET_COLORS[pos.planet] || '#888888';
          const glyph = PLANET_GLYPHS[pos.planet] ?? '?';

          return (
            <div
              key={pos.planet}
              className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'} ${onPlanetClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 rounded px-1 -mx-1' : ''}`}
              onClick={() => onPlanetClick?.(pos.planet)}
              title={`${pos.planet} in ${sign?.name || 'Unknown'} ${formatDegree(pos.degreeInSign)}, House ${pos.house}${pos.retrograde ? ' (Retrograde)' : ''}`}
            >
              <span
                className="flex-shrink-0"
                style={{
                  width: compact ? 12 : 14,
                  textAlign: 'center',
                  color,
                  fontFamily: PLANET_GLYPH_FONT_FAMILY,
                  fontSize: compact ? 12 : 14,
                  lineHeight: 1,
                  opacity: 0.92,
                }}
                aria-hidden="true"
              >
                {glyph}
              </span>
              {showEnglishNames ? (
                <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                  {sign?.name || '?'}
                </span>
              ) : (
                <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                  {ZODIAC_ABBREV[sign?.name || ''] || '?'}
                </span>
              )}
              <span className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} ${compact ? 'text-[10px]' : 'text-xs'}`}>
                {formatDegree(pos.degreeInSign)}
              </span>
              {showHouses && (
                <span className={`${isDark ? 'text-amber-400' : 'text-amber-600'} ${compact ? 'text-[9px]' : 'text-[10px]'} ml-0.5`}>
                  H{pos.house}
                </span>
              )}
              {pos.retrograde && (
                <span className="text-red-500 text-[10px]">R</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to basic display
  if (!planetaryPositions || planetaryPositions.length === 0) {
    return null;
  }

  return (
    <div className={`grid ${compact ? 'grid-cols-3 gap-1' : 'grid-cols-2 gap-2'}`}>
      {planetaryPositions.map((pos) => {
        const zodiacPos = getZodiacPosition(pos.eclipticLongitude);
        const sign = ZODIAC_SIGNS[zodiacPos.sign];
        const color = PLANET_COLORS[pos.planet] || '#888888';
        const glyph = PLANET_GLYPHS[pos.planet] ?? '?';

        return (
          <div
            key={pos.planet}
            className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'} ${onPlanetClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 rounded px-1 -mx-1' : ''}`}
            onClick={() => onPlanetClick?.(pos.planet)}
            title={`${pos.planet} in ${sign.name} ${formatDegree(zodiacPos.degree)}`}
          >
            <span
              className="flex-shrink-0"
              style={{
                width: compact ? 12 : 14,
                textAlign: 'center',
                color,
                fontFamily: PLANET_GLYPH_FONT_FAMILY,
                fontSize: compact ? 12 : 14,
                lineHeight: 1,
                opacity: 0.92,
              }}
              aria-hidden="true"
            >
              {glyph}
            </span>
            {showEnglishNames ? (
              <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                {sign.name}
              </span>
            ) : (
              <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                {ZODIAC_ABBREV[sign.name]}
              </span>
            )}
            <span className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {formatDegree(zodiacPos.degree)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default NatalChart;
