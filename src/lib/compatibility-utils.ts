/**
 * Compatibility Utilities
 * Find compatible locations for two people based on astrocartography line intersections
 */

import type {
  PlanetaryLine,
  AspectLine,
  ZenithPoint,
  Planet,
  LineType,
  GlobePoint
} from '@/lib/astro-types';
import { PLANET_COLORS } from '@/lib/astro-types';
import { getCityFromCoordinates } from '@/features/globe/services/googlePlacesService';

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

// Distance threshold for "nearby" lines (in km)
const INTERSECTION_THRESHOLD_KM = 300;
const OVERLAP_BONUS_THRESHOLD_KM = 150;

// Compatibility modes
export type CompatibilityMode = 'honeymoon' | 'relocation' | 'travel' | 'business';

// Mode-specific planet weights
const MODE_WEIGHTS: Record<CompatibilityMode, Record<Planet, number>> = {
  honeymoon: {
    Sun: 1.0,
    Moon: 1.5,
    Mercury: 0.8,
    Venus: 2.0,
    Mars: 0.7,
    Jupiter: 1.2,
    Saturn: 0.5,
    Uranus: 0.6,
    Neptune: 1.3,
    Pluto: 0.6,
    Chiron: 0.8,
    NorthNode: 1.0,
  },
  relocation: {
    Sun: 1.3,
    Moon: 1.2,
    Mercury: 1.0,
    Venus: 1.0,
    Mars: 0.8,
    Jupiter: 1.5,
    Saturn: 1.0,
    Uranus: 0.7,
    Neptune: 0.8,
    Pluto: 0.9,
    Chiron: 1.0,
    NorthNode: 1.2,
  },
  travel: {
    Sun: 1.2,
    Moon: 1.0,
    Mercury: 1.3,
    Venus: 1.2,
    Mars: 1.0,
    Jupiter: 1.5,
    Saturn: 0.6,
    Uranus: 1.2,
    Neptune: 1.1,
    Pluto: 0.7,
    Chiron: 0.8,
    NorthNode: 1.0,
  },
  business: {
    Sun: 1.5,
    Moon: 0.7,
    Mercury: 1.3,
    Venus: 0.8,
    Mars: 1.2,
    Jupiter: 1.5,
    Saturn: 1.3,
    Uranus: 1.0,
    Neptune: 0.5,
    Pluto: 1.2,
    Chiron: 0.7,
    NorthNode: 1.0,
  },
};

// Line type weights (MC/IC are career/home, ASC/DSC are personal/relationship)
const LINE_TYPE_WEIGHTS: Record<CompatibilityMode, Record<LineType, number>> = {
  honeymoon: { MC: 0.8, IC: 1.0, ASC: 1.2, DSC: 1.5 },
  relocation: { MC: 1.2, IC: 1.3, ASC: 1.0, DSC: 1.0 },
  travel: { MC: 0.9, IC: 0.8, ASC: 1.2, DSC: 1.1 },
  business: { MC: 1.5, IC: 0.7, ASC: 1.2, DSC: 1.0 },
};

// Intersection point between two lines
export interface LineIntersection {
  lat: number;
  lng: number;
  person1Line: {
    planet: Planet;
    lineType: LineType;
  };
  person2Line: {
    planet: Planet;
    lineType: LineType;
  };
  distance: number; // km between the closest points
  isExact: boolean; // true if lines actually cross
}

// Scored compatible location
export interface CompatibleLocation {
  lat: number;
  lng: number;
  cityName?: string;
  country?: string;
  person1Score: number;
  person2Score: number;
  combinedScore: number;
  overlapBonus: number;
  person1Lines: Array<{ planet: Planet; lineType: LineType; distance: number }>;
  person2Lines: Array<{ planet: Planet; lineType: LineType; distance: number }>;
  interpretation: string;
  themes: string[];
}

// Full compatibility analysis
export interface CompatibilityAnalysis {
  mode: CompatibilityMode;
  person1Name?: string;
  person2Name?: string;
  topLocations: CompatibleLocation[];
  totalIntersections: number;
  bestForRomance: CompatibleLocation | null;
  bestForGrowth: CompatibleLocation | null;
  bestForSuccess: CompatibleLocation | null;
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
 * Find the closest point on a line segment to a given point
 */
function closestPointOnSegment(
  pointLat: number,
  pointLng: number,
  segStartLat: number,
  segStartLng: number,
  segEndLat: number,
  segEndLng: number
): { lat: number; lng: number; distance: number } {
  const segmentLength = haversineDistance(segStartLat, segStartLng, segEndLat, segEndLng);

  if (segmentLength < 0.1) {
    return {
      lat: segStartLat,
      lng: segStartLng,
      distance: haversineDistance(pointLat, pointLng, segStartLat, segStartLng),
    };
  }

  const t = Math.max(0, Math.min(1,
    ((pointLat - segStartLat) * (segEndLat - segStartLat) +
     (pointLng - segStartLng) * (segEndLng - segStartLng)) /
    ((segEndLat - segStartLat) ** 2 + (segEndLng - segStartLng) ** 2)
  ));

  const nearestLat = segStartLat + t * (segEndLat - segStartLat);
  const nearestLng = segStartLng + t * (segEndLng - segStartLng);
  const distance = haversineDistance(pointLat, pointLng, nearestLat, nearestLng);

  return { lat: nearestLat, lng: nearestLng, distance };
}

/**
 * Find intersection/closest approach between two line paths
 */
function findLineIntersection(
  line1Points: GlobePoint[],
  line2Points: GlobePoint[]
): { point: GlobePoint; distance: number } | null {
  if (line1Points.length < 2 || line2Points.length < 2) return null;

  let minDistance = Infinity;
  let closestPoint: GlobePoint | null = null;

  // Sample line1 and find closest point on line2
  for (let i = 0; i < line1Points.length - 1; i++) {
    const [lat1, lng1] = line1Points[i];
    const [lat2, lng2] = line1Points[i + 1];

    // Skip wrap-around segments
    if (Math.abs(lng2 - lng1) > 180) continue;

    // Check midpoint of this segment against line2
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    for (let j = 0; j < line2Points.length - 1; j++) {
      const [lat3, lng3] = line2Points[j];
      const [lat4, lng4] = line2Points[j + 1];

      // Skip wrap-around segments
      if (Math.abs(lng4 - lng3) > 180) continue;

      const closest = closestPointOnSegment(midLat, midLng, lat3, lng3, lat4, lng4);

      if (closest.distance < minDistance) {
        minDistance = closest.distance;
        closestPoint = [(midLat + closest.lat) / 2, (midLng + closest.lng) / 2];
      }
    }
  }

  if (closestPoint && minDistance <= INTERSECTION_THRESHOLD_KM) {
    return { point: closestPoint, distance: minDistance };
  }

  return null;
}

/**
 * Find all intersections between two sets of planetary lines
 */
export function findAllIntersections(
  person1Lines: PlanetaryLine[],
  person2Lines: PlanetaryLine[]
): LineIntersection[] {
  const intersections: LineIntersection[] = [];

  for (const line1 of person1Lines) {
    if (!line1.points || line1.points.length < 2) continue;

    for (const line2 of person2Lines) {
      if (!line2.points || line2.points.length < 2) continue;

      const intersection = findLineIntersection(line1.points, line2.points);

      if (intersection) {
        intersections.push({
          lat: intersection.point[0],
          lng: intersection.point[1],
          person1Line: {
            planet: line1.planet,
            lineType: line1.lineType,
          },
          person2Line: {
            planet: line2.planet,
            lineType: line2.lineType,
          },
          distance: intersection.distance,
          isExact: intersection.distance < 50, // Within 50km = exact crossing
        });
      }
    }
  }

  return intersections;
}

/**
 * Cluster nearby intersections into single locations
 */
function clusterIntersections(
  intersections: LineIntersection[],
  clusterRadius: number = 200
): Map<string, LineIntersection[]> {
  const clusters = new Map<string, LineIntersection[]>();
  const assigned = new Set<number>();

  for (let i = 0; i < intersections.length; i++) {
    if (assigned.has(i)) continue;

    const cluster: LineIntersection[] = [intersections[i]];
    assigned.add(i);

    // Find all intersections within cluster radius
    for (let j = i + 1; j < intersections.length; j++) {
      if (assigned.has(j)) continue;

      const dist = haversineDistance(
        intersections[i].lat, intersections[i].lng,
        intersections[j].lat, intersections[j].lng
      );

      if (dist <= clusterRadius) {
        cluster.push(intersections[j]);
        assigned.add(j);
      }
    }

    // Use centroid as cluster key
    const avgLat = cluster.reduce((sum, c) => sum + c.lat, 0) / cluster.length;
    const avgLng = cluster.reduce((sum, c) => sum + c.lng, 0) / cluster.length;
    const key = `${avgLat.toFixed(2)},${avgLng.toFixed(2)}`;

    clusters.set(key, cluster);
  }

  return clusters;
}

/**
 * Calculate score for a single line influence
 */
function calculateLineScore(
  planet: Planet,
  lineType: LineType,
  distance: number,
  mode: CompatibilityMode
): number {
  const planetWeight = MODE_WEIGHTS[mode][planet] || 1.0;
  const lineWeight = LINE_TYPE_WEIGHTS[mode][lineType] || 1.0;

  // Distance score: closer = higher
  let distanceScore: number;
  if (distance < 50) {
    distanceScore = 100;
  } else if (distance < 100) {
    distanceScore = 90;
  } else if (distance < 200) {
    distanceScore = 75;
  } else if (distance < 300) {
    distanceScore = 60;
  } else {
    distanceScore = 40;
  }

  return distanceScore * planetWeight * lineWeight;
}

/**
 * Generate interpretation for compatible location
 */
function generateInterpretation(
  person1Lines: Array<{ planet: Planet; lineType: LineType }>,
  person2Lines: Array<{ planet: Planet; lineType: LineType }>,
  mode: CompatibilityMode
): { interpretation: string; themes: string[] } {
  const themes: string[] = [];
  const parts: string[] = [];

  // Check for Venus involvement (romance)
  const hasVenus = [...person1Lines, ...person2Lines].some(l => l.planet === 'Venus');
  if (hasVenus) themes.push('Romance');

  // Check for Jupiter (luck/expansion)
  const hasJupiter = [...person1Lines, ...person2Lines].some(l => l.planet === 'Jupiter');
  if (hasJupiter) themes.push('Growth');

  // Check for Sun (success/recognition)
  const hasSun = [...person1Lines, ...person2Lines].some(l => l.planet === 'Sun');
  if (hasSun) themes.push('Success');

  // Check for Moon (emotional connection)
  const hasMoon = [...person1Lines, ...person2Lines].some(l => l.planet === 'Moon');
  if (hasMoon) themes.push('Comfort');

  // Check for Saturn (stability)
  const hasSaturn = [...person1Lines, ...person2Lines].some(l => l.planet === 'Saturn');
  if (hasSaturn) themes.push('Stability');

  // Build interpretation based on mode
  const modeDescriptions: Record<CompatibilityMode, string> = {
    honeymoon: 'romantic connection',
    relocation: 'building a life together',
    travel: 'shared adventures',
    business: 'professional partnership',
  };

  if (person1Lines.length > 0 && person2Lines.length > 0) {
    const p1Planets = [...new Set(person1Lines.map(l => l.planet))].slice(0, 2).join(' & ');
    const p2Planets = [...new Set(person2Lines.map(l => l.planet))].slice(0, 2).join(' & ');

    parts.push(`Your ${p1Planets} lines meet their ${p2Planets} lines here.`);

    if (hasVenus && hasMoon) {
      parts.push(`Strong emotional and romantic resonance for ${modeDescriptions[mode]}.`);
    } else if (hasJupiter && hasSun) {
      parts.push(`Excellent for growth and shared success.`);
    } else if (themes.length > 0) {
      parts.push(`Themes: ${themes.join(', ')}.`);
    }
  }

  return {
    interpretation: parts.join(' ') || 'A place where your energies align.',
    themes,
  };
}

/**
 * Main function: Find compatible locations for two people
 */
export function findCompatibleLocations(
  person1Lines: PlanetaryLine[],
  person2Lines: PlanetaryLine[],
  person1Zeniths: ZenithPoint[],
  person2Zeniths: ZenithPoint[],
  mode: CompatibilityMode = 'honeymoon',
  limit: number = 20
): CompatibilityAnalysis {
  // Find all intersections
  const intersections = findAllIntersections(person1Lines, person2Lines);

  // Cluster nearby intersections
  const clusters = clusterIntersections(intersections);

  // Score each cluster
  const locations: CompatibleLocation[] = [];

  for (const [key, clusterIntersections] of clusters) {
    const [latStr, lngStr] = key.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    // Collect unique lines for each person
    const person1LinesAtLocation = new Map<string, { planet: Planet; lineType: LineType; distance: number }>();
    const person2LinesAtLocation = new Map<string, { planet: Planet; lineType: LineType; distance: number }>();

    for (const intersection of clusterIntersections) {
      const key1 = `${intersection.person1Line.planet}-${intersection.person1Line.lineType}`;
      const key2 = `${intersection.person2Line.planet}-${intersection.person2Line.lineType}`;

      if (!person1LinesAtLocation.has(key1) || person1LinesAtLocation.get(key1)!.distance > intersection.distance) {
        person1LinesAtLocation.set(key1, {
          ...intersection.person1Line,
          distance: intersection.distance,
        });
      }

      if (!person2LinesAtLocation.has(key2) || person2LinesAtLocation.get(key2)!.distance > intersection.distance) {
        person2LinesAtLocation.set(key2, {
          ...intersection.person2Line,
          distance: intersection.distance,
        });
      }
    }

    const p1Lines = Array.from(person1LinesAtLocation.values());
    const p2Lines = Array.from(person2LinesAtLocation.values());

    // Calculate scores
    let person1Score = 0;
    for (const line of p1Lines) {
      person1Score += calculateLineScore(line.planet, line.lineType, line.distance, mode);
    }
    person1Score = Math.min(100, person1Score / Math.max(1, p1Lines.length));

    let person2Score = 0;
    for (const line of p2Lines) {
      person2Score += calculateLineScore(line.planet, line.lineType, line.distance, mode);
    }
    person2Score = Math.min(100, person2Score / Math.max(1, p2Lines.length));

    // Calculate overlap bonus (more intersections = more synergy)
    const exactCrossings = clusterIntersections.filter(i => i.isExact).length;
    const overlapBonus = Math.min(20, exactCrossings * 5 + clusterIntersections.length * 2);

    // Combined score
    const combinedScore = Math.round(
      (person1Score * 0.4 + person2Score * 0.4 + overlapBonus)
    );

    // Generate interpretation
    const { interpretation, themes } = generateInterpretation(p1Lines, p2Lines, mode);

    locations.push({
      lat,
      lng,
      person1Score: Math.round(person1Score),
      person2Score: Math.round(person2Score),
      combinedScore,
      overlapBonus: Math.round(overlapBonus),
      person1Lines: p1Lines,
      person2Lines: p2Lines,
      interpretation,
      themes,
    });
  }

  // Sort by combined score
  locations.sort((a, b) => b.combinedScore - a.combinedScore);

  // Find best for specific purposes
  const bestForRomance = locations.find(l => l.themes.includes('Romance')) || null;
  const bestForGrowth = locations.find(l => l.themes.includes('Growth')) || null;
  const bestForSuccess = locations.find(l => l.themes.includes('Success')) || null;

  return {
    mode,
    topLocations: locations.slice(0, limit),
    totalIntersections: intersections.length,
    bestForRomance,
    bestForGrowth,
    bestForSuccess,
  };
}

/**
 * Enrich locations with city names using reverse geocoding
 * Fetches city names for the top locations in parallel
 */
export async function enrichLocationsWithCityNames(
  locations: CompatibleLocation[],
  maxLocations: number = 20
): Promise<CompatibleLocation[]> {
  // Only enrich top locations to limit API calls
  const locationsToEnrich = locations.slice(0, maxLocations);

  // Fetch city names in parallel with a concurrency limit
  const BATCH_SIZE = 5;
  const enrichedLocations: CompatibleLocation[] = [];

  for (let i = 0; i < locationsToEnrich.length; i += BATCH_SIZE) {
    const batch = locationsToEnrich.slice(i, i + BATCH_SIZE);

    const enrichedBatch = await Promise.all(
      batch.map(async (location) => {
        try {
          const cityInfo = await getCityFromCoordinates(location.lat, location.lng);
          if (cityInfo) {
            return {
              ...location,
              cityName: cityInfo.name,
              country: cityInfo.country,
            };
          }
        } catch (error) {
          console.warn(`Failed to get city for ${location.lat}, ${location.lng}:`, error);
        }
        return location;
      })
    );

    enrichedLocations.push(...enrichedBatch);
  }

  // Add remaining locations without enrichment
  if (locations.length > maxLocations) {
    enrichedLocations.push(...locations.slice(maxLocations));
  }

  return enrichedLocations;
}

/**
 * Find compatible locations with city names (async version)
 * Combines finding intersections + reverse geocoding for city names
 */
export async function findCompatibleLocationsWithCities(
  person1Lines: PlanetaryLine[],
  person2Lines: PlanetaryLine[],
  person1Zeniths: ZenithPoint[],
  person2Zeniths: ZenithPoint[],
  mode: CompatibilityMode = 'honeymoon',
  limit: number = 20
): Promise<CompatibilityAnalysis> {
  // First, find the compatible locations (sync)
  const analysis = findCompatibleLocations(
    person1Lines,
    person2Lines,
    person1Zeniths,
    person2Zeniths,
    mode,
    limit
  );

  // Then enrich with city names (async)
  const enrichedLocations = await enrichLocationsWithCityNames(analysis.topLocations, limit);

  // Update best locations with enriched data
  const findEnriched = (original: CompatibleLocation | null) => {
    if (!original) return null;
    return enrichedLocations.find(
      l => l.lat === original.lat && l.lng === original.lng
    ) || original;
  };

  return {
    ...analysis,
    topLocations: enrichedLocations,
    bestForRomance: findEnriched(analysis.bestForRomance),
    bestForGrowth: findEnriched(analysis.bestForGrowth),
    bestForSuccess: findEnriched(analysis.bestForSuccess),
  };
}

/**
 * Get mode display info
 */
export function getModeInfo(mode: CompatibilityMode): {
  label: string;
  icon: string;
  description: string;
} {
  switch (mode) {
    case 'honeymoon':
      return {
        label: 'Honeymoon',
        icon: '💕',
        description: 'Find destinations where Venus and Moon energies support romantic connection, emotional bonding, and shared pleasure',
      };
    case 'relocation':
      return {
        label: 'Relocation',
        icon: '🏠',
        description: 'Discover cities where Jupiter and Sun lines support building foundations, career success, and long-term stability together',
      };
    case 'travel':
      return {
        label: 'Travel',
        icon: '✈️',
        description: 'Plan adventures where Jupiter, Mercury, and Uranus energies bring expansion, discovery, and shared experiences',
      };
    case 'business':
      return {
        label: 'Business',
        icon: '💼',
        description: 'Find locations where Sun, Jupiter, and Saturn lines support professional success, recognition, and financial growth',
      };
  }
}

/**
 * Get all available modes
 */
export function getAllModes(): CompatibilityMode[] {
  return ['honeymoon', 'relocation', 'travel', 'business'];
}
