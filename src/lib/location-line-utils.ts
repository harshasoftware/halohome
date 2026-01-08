/**
 * Location Line Utilities
 * Functions to find astrocartography lines near a coordinate and calculate influence scores
 */

import type { PlanetaryLine, AspectLine, ZenithPoint, Planet, LineType, AspectType } from '@/lib/astro-types';
import { PLANET_COLORS } from '@/lib/astro-types';

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

// Maximum distance for influence (in km)
const MAX_INFLUENCE_DISTANCE_KM = 500;

// Distance thresholds
const ZENITH_DISTANCE_KM = 200;
const GOLD_DISTANCE_KM = 200;
const STRONG_DISTANCE_KM = 350;

export type InfluenceLevel = 'zenith' | 'gold' | 'strong' | 'moderate' | 'weak';

export interface LineInfluence {
  type: 'planetary' | 'aspect';
  planet: Planet;
  lineType?: LineType;
  aspectType?: AspectType;
  aspectPlanet?: Planet; // For aspect lines, the other planet involved
  isHarmonious?: boolean;
  distance: number; // km from line
  distanceFromZenith?: number; // km from zenith point (if applicable)
  influenceScore: number; // 0-100
  influenceLevel: InfluenceLevel;
  color: string;
  interpretation: string;
}

export interface LocationAnalysis {
  latitude: number;
  longitude: number;
  nearestCity?: string;
  lines: LineInfluence[];
  aggregateScore: number;
  dominantPlanets: Planet[];
  overallInterpretation: string;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the Haversine distance between two points on Earth
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate the minimum distance from a point to a line segment
 */
function distanceToLineSegment(
  pointLat: number,
  pointLng: number,
  segStartLat: number,
  segStartLng: number,
  segEndLat: number,
  segEndLng: number
): number {
  const distToStart = haversineDistance(pointLat, pointLng, segStartLat, segStartLng);
  const distToEnd = haversineDistance(pointLat, pointLng, segEndLat, segEndLng);
  const segmentLength = haversineDistance(segStartLat, segStartLng, segEndLat, segEndLng);

  if (segmentLength < 0.1) {
    return distToStart;
  }

  const t = Math.max(0, Math.min(1,
    ((pointLat - segStartLat) * (segEndLat - segStartLat) +
     (pointLng - segStartLng) * (segEndLng - segStartLng)) /
    ((segEndLat - segStartLat) ** 2 + (segEndLng - segStartLng) ** 2)
  ));

  const nearestLat = segStartLat + t * (segEndLat - segStartLat);
  const nearestLng = segStartLng + t * (segEndLng - segStartLng);
  const distToNearest = haversineDistance(pointLat, pointLng, nearestLat, nearestLng);

  return Math.min(distToStart, distToEnd, distToNearest);
}

/**
 * Calculate distance from a point to a line path
 */
function distanceToLinePath(
  lat: number,
  lng: number,
  lineCoords: [number, number][]
): number {
  if (lineCoords.length === 0) return Infinity;
  if (lineCoords.length === 1) {
    return haversineDistance(lat, lng, lineCoords[0][0], lineCoords[0][1]);
  }

  let minDistance = Infinity;

  for (let i = 0; i < lineCoords.length - 1; i++) {
    const [lat1, lng1] = lineCoords[i];
    const [lat2, lng2] = lineCoords[i + 1];

    // Skip segments that wrap around the world
    if (Math.abs(lng2 - lng1) > 180) continue;

    const distance = distanceToLineSegment(lat, lng, lat1, lng1, lat2, lng2);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

/**
 * Calculate influence score based on distance
 */
function calculateInfluenceScore(distance: number, distanceFromZenith?: number): number {
  if (distanceFromZenith !== undefined && distanceFromZenith <= ZENITH_DISTANCE_KM) {
    return 100 - (distanceFromZenith / ZENITH_DISTANCE_KM) * 10; // 90-100 for zenith
  }

  if (distance <= GOLD_DISTANCE_KM) {
    return 90 - (distance / GOLD_DISTANCE_KM) * 20; // 70-90
  } else if (distance <= MAX_INFLUENCE_DISTANCE_KM) {
    const normalizedDist = (distance - GOLD_DISTANCE_KM) / (MAX_INFLUENCE_DISTANCE_KM - GOLD_DISTANCE_KM);
    return 70 * (1 - normalizedDist); // 0-70
  }
  return 0;
}

/**
 * Determine influence level
 */
function getInfluenceLevel(distance: number, distanceFromZenith?: number): InfluenceLevel {
  if (distanceFromZenith !== undefined && distanceFromZenith <= ZENITH_DISTANCE_KM) {
    return 'zenith';
  }
  if (distance <= GOLD_DISTANCE_KM) {
    return 'gold';
  }
  if (distance <= STRONG_DISTANCE_KM) {
    return 'strong';
  }
  if (distance <= MAX_INFLUENCE_DISTANCE_KM) {
    return 'moderate';
  }
  return 'weak';
}

// Planet interpretations for line types
const PLANET_LINE_INTERPRETATIONS: Record<Planet, Record<LineType, string>> = {
  Sun: {
    MC: 'Strong career recognition and public visibility. Leadership opportunities flourish here.',
    IC: 'Deep sense of belonging and family connection. A place to establish roots.',
    ASC: 'Enhanced vitality and self-expression. Your authentic self shines brightly.',
    DSC: 'Attracts significant partnerships. Others see your radiance clearly.',
  },
  Moon: {
    MC: 'Emotional fulfillment through career. Public nurturing roles favored.',
    IC: 'Profound emotional security and comfort. Ideal for home and family.',
    ASC: 'Heightened intuition and emotional sensitivity. Feeling deeply connected.',
    DSC: 'Attracts nurturing relationships. Emotional bonds form easily.',
  },
  Mercury: {
    MC: 'Success in communication and intellectual pursuits. Writing, teaching, commerce thrive.',
    IC: 'Mental stimulation at home. Learning and communication with family.',
    ASC: 'Quick thinking and articulate expression. Great for networking.',
    DSC: 'Attracts intellectual partners. Stimulating conversations and exchanges.',
  },
  Venus: {
    MC: 'Artistic success and social popularity. Beauty and harmony in career.',
    IC: 'Aesthetic home environment. Love and comfort in domestic life.',
    ASC: 'Enhanced charm and attractiveness. Social grace comes naturally.',
    DSC: 'Magnetic attraction for romantic relationships. Love and harmony flourish.',
  },
  Mars: {
    MC: 'Drive for career achievement. Competitive success and leadership.',
    IC: 'Active home life. Energy for domestic projects and family protection.',
    ASC: 'Increased courage and initiative. Physical vitality enhanced.',
    DSC: 'Attracts passionate relationships. Dynamic partnerships form.',
  },
  Jupiter: {
    MC: 'Expansion and luck in career. Recognition, travel, and opportunities abound.',
    IC: 'Abundance in home life. Generous family connections and growth.',
    ASC: 'Optimism and personal growth. Opportunities seem to find you.',
    DSC: 'Attracts beneficial partnerships. Luck through relationships.',
  },
  Saturn: {
    MC: 'Serious career achievements through hard work. Authority and lasting success.',
    IC: 'Building solid foundations. Responsibility toward family and home.',
    ASC: 'Discipline and maturity enhanced. Taking yourself seriously.',
    DSC: 'Committed, long-lasting relationships. Learning through partnerships.',
  },
  Uranus: {
    MC: 'Unconventional career path. Innovation and sudden changes in status.',
    IC: 'Unusual home life. Freedom and independence in domestic matters.',
    ASC: 'Unique self-expression. Embracing your individuality fully.',
    DSC: 'Attracts unusual relationships. Excitement and unpredictability in partnerships.',
  },
  Neptune: {
    MC: 'Creative and spiritual career pursuits. Artistic recognition possible.',
    IC: 'Spiritual home environment. Idealistic family connections.',
    ASC: 'Enhanced intuition and creativity. Spiritual sensitivity heightened.',
    DSC: 'Soulmate connections possible. Idealistic and spiritual relationships.',
  },
  Pluto: {
    MC: 'Transformative career experiences. Power and influence in public life.',
    IC: 'Deep psychological roots. Transformation through family matters.',
    ASC: 'Personal transformation and power. Intense self-discovery.',
    DSC: 'Intense, transformative relationships. Deep psychological connections.',
  },
  Chiron: {
    MC: 'Healing through career. Teaching and mentoring others from experience.',
    IC: 'Healing family wounds. Finding wholeness through roots.',
    ASC: 'Embracing your wounds as gifts. Becoming a wounded healer.',
    DSC: 'Healing through relationships. Attracting those who need your wisdom.',
  },
  NorthNode: {
    MC: 'Career aligned with life purpose. Destiny calling in public sphere.',
    IC: 'Soul growth through family and home. Karmic roots.',
    ASC: 'Stepping into your destined self. Life path activation.',
    DSC: 'Karmic relationships. Meeting destined partners.',
  },
};

// Aspect interpretations
const ASPECT_INTERPRETATIONS: Record<AspectType, { harmonious: string; challenging: string }> = {
  trine: {
    harmonious: 'Easy flow of energy. Natural talents and opportunities manifest effortlessly.',
    challenging: '', // Trines are always harmonious
  },
  sextile: {
    harmonious: 'Supportive opportunities through effort. Good for learning and growth.',
    challenging: '', // Sextiles are always harmonious
  },
  square: {
    harmonious: '',
    challenging: 'Dynamic tension that drives growth. Challenges lead to breakthroughs and strength.',
  },
  opposition: {
    harmonious: '',
    challenging: 'Awareness through polarity. Balancing opposing forces brings integration.',
  },
};

/**
 * Generate interpretation for a planetary line
 */
function getPlanetaryInterpretation(planet: Planet, lineType: LineType): string {
  return PLANET_LINE_INTERPRETATIONS[planet]?.[lineType] ||
    `${planet} ${lineType} influence active at this location.`;
}

/**
 * Generate interpretation for an aspect line
 */
function getAspectInterpretation(
  planet: Planet,
  aspectType: AspectType,
  isHarmonious: boolean
): string {
  const aspectInfo = ASPECT_INTERPRETATIONS[aspectType];
  const baseInterpretation = isHarmonious ? aspectInfo.harmonious : aspectInfo.challenging;
  return `${planet} ${aspectType}: ${baseInterpretation}`;
}

/**
 * Find all lines influencing a specific location
 */
export function findLinesAtLocation(
  lat: number,
  lng: number,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  zenithPoints: ZenithPoint[],
  maxResults: number = 20
): LineInfluence[] {
  const influences: LineInfluence[] = [];

  // Check planetary lines
  for (const line of planetaryLines) {
    if (!line.points || line.points.length < 2) continue;

    const lineCoords = line.points as [number, number][];
    const distance = distanceToLinePath(lat, lng, lineCoords);

    if (distance <= MAX_INFLUENCE_DISTANCE_KM) {
      // Check for zenith proximity (only for MC lines)
      let distanceFromZenith: number | undefined;
      if (line.lineType === 'MC') {
        const zenith = zenithPoints.find(z => z.planet === line.planet);
        if (zenith) {
          distanceFromZenith = haversineDistance(lat, lng, zenith.latitude, zenith.longitude);
        }
      }

      const influenceScore = calculateInfluenceScore(distance, distanceFromZenith);
      const influenceLevel = getInfluenceLevel(distance, distanceFromZenith);

      influences.push({
        type: 'planetary',
        planet: line.planet,
        lineType: line.lineType,
        distance: Math.round(distance),
        distanceFromZenith: distanceFromZenith !== undefined ? Math.round(distanceFromZenith) : undefined,
        influenceScore: Math.round(influenceScore),
        influenceLevel,
        color: PLANET_COLORS[line.planet],
        interpretation: getPlanetaryInterpretation(line.planet, line.lineType),
      });
    }
  }

  // Check aspect lines
  for (const line of aspectLines) {
    if (!line.points || line.points.length < 2) continue;

    const lineCoords = line.points as [number, number][];
    const distance = distanceToLinePath(lat, lng, lineCoords);

    if (distance <= MAX_INFLUENCE_DISTANCE_KM) {
      const influenceScore = calculateInfluenceScore(distance);
      const influenceLevel = getInfluenceLevel(distance);

      // Aspect score modifier - harmonious aspects are beneficial, challenging provide growth
      const aspectModifier = line.isHarmonious ? 1.0 : 0.85;

      influences.push({
        type: 'aspect',
        planet: line.planet,
        aspectType: line.aspectType,
        isHarmonious: line.isHarmonious,
        distance: Math.round(distance),
        influenceScore: Math.round(influenceScore * aspectModifier),
        influenceLevel,
        color: PLANET_COLORS[line.planet],
        interpretation: getAspectInterpretation(line.planet, line.aspectType, line.isHarmonious),
      });
    }
  }

  // Sort by influence score (highest first)
  influences.sort((a, b) => b.influenceScore - a.influenceScore);

  return influences.slice(0, maxResults);
}

/**
 * Analyze a location and generate aggregate interpretation
 */
export function analyzeLocation(
  lat: number,
  lng: number,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  zenithPoints: ZenithPoint[]
): LocationAnalysis {
  const lines = findLinesAtLocation(lat, lng, planetaryLines, aspectLines, zenithPoints);

  // Calculate aggregate score (weighted average)
  const totalWeight = lines.reduce((sum, l) => sum + l.influenceScore, 0);
  const aggregateScore = lines.length > 0
    ? Math.round(totalWeight / lines.length)
    : 0;

  // Find dominant planets (those with highest scores)
  const planetScores: Record<string, number> = {};
  for (const line of lines) {
    planetScores[line.planet] = (planetScores[line.planet] || 0) + line.influenceScore;
  }

  const dominantPlanets = Object.entries(planetScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([planet]) => planet as Planet);

  // Generate overall interpretation
  let overallInterpretation = '';

  if (lines.length === 0) {
    overallInterpretation = 'This location has minimal astrological influence based on your birth chart. It is a neutral zone without strong planetary energies.';
  } else {
    const zenithLines = lines.filter(l => l.influenceLevel === 'zenith');
    const goldLines = lines.filter(l => l.influenceLevel === 'gold');
    const strongLines = lines.filter(l => l.influenceLevel === 'strong');

    if (zenithLines.length > 0) {
      const zenithPlanets = zenithLines.map(l => l.planet).join(', ');
      overallInterpretation = `EXCEPTIONAL POWER ZONE: ${zenithPlanets} at zenith. This is one of the most powerful locations in your astrocartography map. `;
    } else if (goldLines.length > 0) {
      const goldPlanets = goldLines.map(l => l.planet).join(', ');
      overallInterpretation = `POWER ZONE: Strong ${goldPlanets} influence. This location is highly favorable for related activities. `;
    } else if (strongLines.length > 0) {
      overallInterpretation = `NOTABLE INFLUENCE: Several planetary lines affect this area. `;
    } else {
      overallInterpretation = `MODERATE INFLUENCE: Some planetary energies present. `;
    }

    // Add dominant planet themes
    if (dominantPlanets.length > 0) {
      const themes = dominantPlanets.map(p => {
        switch (p) {
          case 'Sun': return 'identity and recognition';
          case 'Moon': return 'emotions and comfort';
          case 'Mercury': return 'communication and learning';
          case 'Venus': return 'love and beauty';
          case 'Mars': return 'action and energy';
          case 'Jupiter': return 'expansion and luck';
          case 'Saturn': return 'discipline and structure';
          case 'Uranus': return 'innovation and change';
          case 'Neptune': return 'spirituality and creativity';
          case 'Pluto': return 'transformation and power';
          case 'Chiron': return 'healing and wisdom';
          case 'NorthNode': return 'destiny and purpose';
          default: return '';
        }
      }).filter(Boolean);

      overallInterpretation += `Dominant themes: ${themes.join(', ')}.`;
    }
  }

  return {
    latitude: lat,
    longitude: lng,
    lines,
    aggregateScore,
    dominantPlanets,
    overallInterpretation,
  };
}

/**
 * Get color for influence level
 */
export function getInfluenceLevelColor(level: InfluenceLevel): string {
  switch (level) {
    case 'zenith': return '#E11D48';
    case 'gold': return '#FFD700';
    case 'strong': return '#22C55E';
    case 'moderate': return '#3B82F6';
    case 'weak': return '#94A3B8';
  }
}
