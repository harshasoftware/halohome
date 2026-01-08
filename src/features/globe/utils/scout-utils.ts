/**
 * Scout Utilities
 * Functions for finding optimal and challenging locations by life category
 * Based on classical astrocartography principles
 */

import type { Planet, LineType, PlanetaryLine, AspectLine } from '@/lib/astro-types';
import { LINE_INTERPRETATIONS, getBestLinesForCategory } from '../ai/line-interpretations';
import { loadCities, expandCity, type GeoCity as GeoNamesCity } from '@/data/geonames-cities';

// Expand GeoNames cities to the format expected by scout-utils
export type City = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  population?: number; // Optional for backwards compatibility with cached data
};

// Cities loaded dynamically
let CITIES: City[] = [];
let citiesLoaded = false;

/**
 * Ensure cities are loaded before use
 */
export async function ensureScoutCitiesLoaded(): Promise<void> {
  if (citiesLoaded) return;

  const geoCities = await loadCities();
  CITIES = geoCities.map(c => {
    const expanded = expandCity(c);
    return {
      name: expanded.name,
      country: expanded.countryCode,
      lat: expanded.lat,
      lng: expanded.lng,
      population: expanded.population,
    };
  });
  citiesLoaded = true;
  console.log(`[ScoutUtils] Cities loaded: ${CITIES.length}`);
}

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

// Maximum distance for a city to be considered influenced by a line (in km)
const MAX_INFLUENCE_DISTANCE_KM = 500;

// Life categories for scouting
export type ScoutCategory = 'career' | 'love' | 'health' | 'home' | 'wellbeing' | 'wealth';

export const SCOUT_CATEGORIES: ScoutCategory[] = ['career', 'love', 'health', 'home', 'wellbeing', 'wealth'];

// Category display info
export const CATEGORY_INFO: Record<ScoutCategory, { label: string; icon: string; description: string }> = {
  career: {
    label: 'Career',
    icon: '💼',
    description: 'Professional success, recognition, and career advancement',
  },
  love: {
    label: 'Love',
    icon: '❤️',
    description: 'Romance, relationships, and finding a partner',
  },
  health: {
    label: 'Health',
    icon: '🏃',
    description: 'Physical vitality, wellness, and healing',
  },
  home: {
    label: 'Home',
    icon: '🏠',
    description: 'Settling down, family, and building foundations',
  },
  wellbeing: {
    label: 'Wellbeing',
    icon: '✨',
    description: 'Inner peace, happiness, and spiritual growth',
  },
  wealth: {
    label: 'Wealth',
    icon: '💰',
    description: 'Financial success, abundance, and prosperity',
  },
};

// Nature of location influence
export type LocationNature = 'beneficial' | 'challenging';

// A line influence on a location
export interface LineInfluence {
  planet: Planet;
  lineType: LineType;
  rating: number; // 1-5 from LINE_INTERPRETATIONS
  isAspect: boolean;
  aspectType?: 'trine' | 'sextile' | 'square';
  title: string;
  description: string;
}

// A scouted location
export interface ScoutLocation {
  city: City;
  category: ScoutCategory;
  nature: LocationNature;
  overallScore: number; // Combined score from all influences
  influences: LineInfluence[];
  distance: number; // km from nearest line
}

// Locations grouped by country
export interface CountryGroup {
  country: string;
  locations: ScoutLocation[];
  beneficialCount: number;
  challengingCount: number;
}

// Country group sorted by top city score (for category views)
export interface RankedCountryGroup extends CountryGroup {
  // Countries are ordered by the score of their top city
  // No ranking score displayed - just ordered for display
}

// Full scout analysis result
export interface ScoutAnalysis {
  category: ScoutCategory;
  countries: CountryGroup[];
  totalBeneficial: number;
  totalChallenging: number;
}

/**
 * Haversine distance between two points
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate distance from a city to a line
 */
function distanceToLine(city: City, linePoints: [number, number][]): number {
  if (linePoints.length === 0) return Infinity;
  if (linePoints.length === 1) {
    return haversineDistance(city.lat, city.lng, linePoints[0][0], linePoints[0][1]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < linePoints.length - 1; i++) {
    const [lat1, lng1] = linePoints[i];
    const [lat2, lng2] = linePoints[i + 1];
    // Skip dateline wraps
    if (Math.abs(lng2 - lng1) > 180) continue;

    // Distance to line segment (simplified)
    const t = Math.max(0, Math.min(1,
      ((city.lat - lat1) * (lat2 - lat1) + (city.lng - lng1) * (lng2 - lng1)) /
      ((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2 || 1)
    ));
    const nearestLat = lat1 + t * (lat2 - lat1);
    const nearestLng = lng1 + t * (lng2 - lng1);
    const dist = haversineDistance(city.lat, city.lng, nearestLat, nearestLng);
    minDistance = Math.min(minDistance, dist);
  }
  return minDistance;
}

/**
 * Get all lines relevant to a category (both beneficial and challenging)
 * Beneficial: rating >= 4
 * Challenging: rating <= 2
 */
export function getLinesForCategory(category: ScoutCategory): {
  beneficial: Array<{ planet: Planet; lineType: LineType }>;
  challenging: Array<{ planet: Planet; lineType: LineType }>;
} {
  const beneficial: Array<{ planet: Planet; lineType: LineType }> = [];
  const challenging: Array<{ planet: Planet; lineType: LineType }> = [];

  // Get the primary lines for this category
  const primaryLines = getBestLinesForCategory(category);

  // Add primary lines as beneficial
  for (const line of primaryLines) {
    const interp = LINE_INTERPRETATIONS[line.planet]?.[line.lineType];
    if (interp && interp.rating >= 4) {
      beneficial.push(line);
    }
  }

  // Scan all interpretations for category-relevant challenging lines
  const planets: Planet[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'NorthNode'];
  const lineTypes: LineType[] = ['MC', 'IC', 'ASC', 'DSC'];

  for (const planet of planets) {
    for (const lineType of lineTypes) {
      const interp = LINE_INTERPRETATIONS[planet]?.[lineType];
      if (!interp) continue;

      // Check if this line is relevant to the category based on themes/bestFor
      const categoryKeywords = getCategoryKeywords(category);
      const isRelevant = interp.bestFor.some(bf =>
        categoryKeywords.some(kw => bf.toLowerCase().includes(kw))
      ) || interp.themes.some(t =>
        categoryKeywords.some(kw => t.toLowerCase().includes(kw))
      );

      if (isRelevant && interp.rating <= 2) {
        // Check if not already in beneficial
        if (!beneficial.some(b => b.planet === planet && b.lineType === lineType)) {
          challenging.push({ planet, lineType });
        }
      }
    }
  }

  // Also add inherently challenging lines for each category
  const challengingLines = getChallengingLinesForCategory(category);
  for (const line of challengingLines) {
    if (!challenging.some(c => c.planet === line.planet && c.lineType === line.lineType)) {
      challenging.push(line);
    }
  }

  return { beneficial, challenging };
}

/**
 * Get keywords for matching category to line themes
 */
function getCategoryKeywords(category: ScoutCategory): string[] {
  switch (category) {
    case 'career':
      return ['career', 'work', 'professional', 'business', 'success', 'recognition', 'authority', 'leadership'];
    case 'love':
      return ['love', 'romance', 'partner', 'marriage', 'relationship', 'dating', 'soulmate'];
    case 'health':
      return ['health', 'vitality', 'healing', 'wellness', 'physical', 'energy', 'strength'];
    case 'home':
      return ['home', 'family', 'roots', 'foundation', 'settling', 'property', 'real estate'];
    case 'wellbeing':
      return ['wellbeing', 'peace', 'spiritual', 'happiness', 'contentment', 'inner', 'harmony'];
    case 'wealth':
      return ['wealth', 'money', 'financial', 'abundance', 'prosperity', 'earning', 'investment'];
    default:
      return [];
  }
}

/**
 * Get inherently challenging lines for a category
 */
function getChallengingLinesForCategory(category: ScoutCategory): Array<{ planet: Planet; lineType: LineType }> {
  switch (category) {
    case 'career':
      return [
        { planet: 'Neptune', lineType: 'MC' }, // Career confusion
        { planet: 'Uranus', lineType: 'MC' },  // Career instability (can be challenging)
      ];
    case 'love':
      return [
        { planet: 'Saturn', lineType: 'DSC' },  // Heavy relationships
        { planet: 'Pluto', lineType: 'DSC' },   // Power struggles
        { planet: 'Mars', lineType: 'DSC' },    // Conflict
        { planet: 'Uranus', lineType: 'DSC' },  // Instability
      ];
    case 'health':
      return [
        { planet: 'Saturn', lineType: 'ASC' },  // Low energy, chronic issues
        { planet: 'Neptune', lineType: 'ASC' }, // Confusion, unclear health
        { planet: 'Pluto', lineType: 'ASC' },   // Intensity, transformation (challenging)
      ];
    case 'home':
      return [
        { planet: 'Uranus', lineType: 'IC' },   // Frequent moves
        { planet: 'Mars', lineType: 'IC' },     // Family conflicts
        { planet: 'Pluto', lineType: 'IC' },    // Power struggles at home
      ];
    case 'wellbeing':
      return [
        { planet: 'Saturn', lineType: 'ASC' },  // Depression, heaviness
        { planet: 'Pluto', lineType: 'ASC' },   // Intensity
        { planet: 'Mars', lineType: 'ASC' },    // Burnout risk
      ];
    case 'wealth':
      return [
        { planet: 'Neptune', lineType: 'MC' },  // Financial confusion
        { planet: 'Uranus', lineType: 'MC' },   // Financial instability
      ];
    default:
      return [];
  }
}

/**
 * Find cities influenced by a set of lines
 */
function findCitiesForLines(
  lines: Array<{ planet: Planet; lineType: LineType }>,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  category: ScoutCategory,
  nature: LocationNature
): ScoutLocation[] {
  const cityMap = new Map<string, ScoutLocation>();

  for (const lineSpec of lines) {
    // Find matching planetary line
    const planetaryLine = planetaryLines.find(
      l => l.planet === lineSpec.planet && l.lineType === lineSpec.lineType
    );

    if (planetaryLine && planetaryLine.points.length > 0) {
      // Find cities along this line
      for (const city of CITIES) {
        const distance = distanceToLine(city, planetaryLine.points);
        if (distance <= MAX_INFLUENCE_DISTANCE_KM) {
          const key = `${city.name}-${city.country}`;
          const interp = LINE_INTERPRETATIONS[lineSpec.planet]?.[lineSpec.lineType];

          const influence: LineInfluence = {
            planet: lineSpec.planet,
            lineType: lineSpec.lineType,
            rating: interp?.rating || 3,
            isAspect: false,
            title: interp?.title || `${lineSpec.planet} ${lineSpec.lineType}`,
            description: interp?.shortDescription || '',
          };

          if (cityMap.has(key)) {
            const existing = cityMap.get(key)!;
            existing.influences.push(influence);
            existing.overallScore = calculateOverallScore(existing.influences);
            existing.distance = Math.min(existing.distance, distance);
          } else {
            cityMap.set(key, {
              city,
              category,
              nature,
              overallScore: influence.rating * 20,
              influences: [influence],
              distance: Math.round(distance),
            });
          }
        }
      }
    }

    // Also check aspect lines for this planet
    const relevantAspects = aspectLines.filter(al => al.planet === lineSpec.planet);
    for (const aspectLine of relevantAspects) {
      if (aspectLine.points.length === 0) continue;

      for (const city of CITIES) {
        const distance = distanceToLine(city, aspectLine.points);
        if (distance <= MAX_INFLUENCE_DISTANCE_KM) {
          const key = `${city.name}-${city.country}`;
          const baseInterp = LINE_INTERPRETATIONS[lineSpec.planet]?.[aspectLine.angle];

          // Aspect modifies the rating
          const aspectModifier = aspectLine.isHarmonious ? 0.8 : 0.6;
          const aspectRating = Math.round((baseInterp?.rating || 3) * aspectModifier);

          const influence: LineInfluence = {
            planet: lineSpec.planet,
            lineType: aspectLine.angle,
            rating: aspectRating,
            isAspect: true,
            aspectType: aspectLine.aspectType as 'trine' | 'sextile' | 'square',
            title: `${lineSpec.planet} ${aspectLine.aspectType} ${aspectLine.angle}`,
            description: aspectLine.isHarmonious
              ? `Harmonious ${aspectLine.aspectType} aspect bringing gentle support`
              : `Challenging ${aspectLine.aspectType} aspect requiring attention`,
          };

          if (cityMap.has(key)) {
            const existing = cityMap.get(key)!;
            existing.influences.push(influence);
            existing.overallScore = calculateOverallScore(existing.influences);
            existing.distance = Math.min(existing.distance, distance);
          } else {
            cityMap.set(key, {
              city,
              category,
              nature,
              overallScore: influence.rating * 20,
              influences: [influence],
              distance: Math.round(distance),
            });
          }
        }
      }
    }
  }

  return Array.from(cityMap.values());
}

/**
 * Calculate overall score from multiple influences
 */
function calculateOverallScore(influences: LineInfluence[]): number {
  if (influences.length === 0) return 0;

  // Weight by rating and number of influences
  const totalRating = influences.reduce((sum, inf) => sum + inf.rating, 0);
  const avgRating = totalRating / influences.length;

  // Bonus for multiple influences
  const multiInfluenceBonus = Math.min(influences.length - 1, 3) * 10;

  return Math.round(avgRating * 20 + multiInfluenceBonus);
}

/**
 * Group locations by country
 */
function groupByCountry(locations: ScoutLocation[]): CountryGroup[] {
  const countryMap = new Map<string, ScoutLocation[]>();

  for (const loc of locations) {
    const country = loc.city.country;
    if (!countryMap.has(country)) {
      countryMap.set(country, []);
    }
    countryMap.get(country)!.push(loc);
  }

  return Array.from(countryMap.entries())
    .map(([country, locs]) => ({
      country,
      locations: locs.sort((a, b) => b.overallScore - a.overallScore),
      beneficialCount: locs.filter(l => l.nature === 'beneficial').length,
      challengingCount: locs.filter(l => l.nature === 'challenging').length,
    }))
    .sort((a, b) => (b.beneficialCount + b.challengingCount) - (a.beneficialCount + a.challengingCount));
}

/**
 * Main scout function - analyze locations for a category
 */
export function scoutLocationsForCategory(
  category: ScoutCategory,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[]
): ScoutAnalysis {
  const { beneficial, challenging } = getLinesForCategory(category);

  const beneficialLocations = findCitiesForLines(beneficial, planetaryLines, aspectLines, category, 'beneficial');
  const challengingLocations = findCitiesForLines(challenging, planetaryLines, aspectLines, category, 'challenging');

  // Combine and deduplicate (if a city appears in both, keep the one with higher score)
  const allLocations = [...beneficialLocations];
  for (const challLoc of challengingLocations) {
    const key = `${challLoc.city.name}-${challLoc.city.country}`;
    const existingIdx = allLocations.findIndex(
      l => `${l.city.name}-${l.city.country}` === key
    );
    if (existingIdx === -1) {
      allLocations.push(challLoc);
    }
    // If exists in beneficial, don't add challenging version
  }

  const countries = groupByCountry(allLocations);

  return {
    category,
    countries,
    totalBeneficial: beneficialLocations.length,
    totalChallenging: challengingLocations.length,
  };
}

/**
 * Get all unique countries from scout analysis
 */
export function getCountriesFromAnalysis(analysis: ScoutAnalysis): string[] {
  return analysis.countries.map(c => c.country).sort();
}

/**
 * Filter analysis by country
 */
export function filterAnalysisByCountry(analysis: ScoutAnalysis, country: string): ScoutAnalysis {
  const filteredCountries = analysis.countries.filter(c => c.country === country);
  return {
    ...analysis,
    countries: filteredCountries,
    totalBeneficial: filteredCountries.reduce((sum, c) => sum + c.beneficialCount, 0),
    totalChallenging: filteredCountries.reduce((sum, c) => sum + c.challengingCount, 0),
  };
}

/**
 * Sort countries by their top city's score for a specific category
 *
 * Countries are ordered by the highest scoring city in each country.
 * Cities within each country are sorted by overallScore (highest first).
 * No ranking score is displayed - countries are just ordered for display.
 */
export function rankCountriesByScore(countries: CountryGroup[]): RankedCountryGroup[] {
  if (countries.length === 0) return [];

  return countries
    .map(country => {
      // Sort locations by score (highest first)
      const sortedLocations = [...country.locations].sort((a, b) => b.overallScore - a.overallScore);

      return {
        ...country,
        locations: sortedLocations,
      };
    })
    // Sort countries by their top city's score
    .sort((a, b) => {
      const aTopScore = a.locations[0]?.overallScore ?? 0;
      const bTopScore = b.locations[0]?.overallScore ?? 0;
      return bTopScore - aTopScore;
    });
}

/**
 * Get plain language description for a line influence
 */
// Overall location with scores across all categories
export interface OverallScoutLocation {
  city: City;
  totalScore: number;
  averageScore: number;
  categoryScores: Array<{
    category: ScoutCategory;
    score: number;
    nature: LocationNature;
    topInfluence: LineInfluence | null;
  }>;
  beneficialCategories: number;
  challengingCategories: number;
  distance: number;
}

/**
 * Scout locations across ALL categories and aggregate scores
 * Returns cities ranked by their combined performance across all life areas
 */
export function scoutOverallLocations(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[]
): OverallScoutLocation[] {
  const cityScoresMap = new Map<string, {
    city: City;
    scores: Map<ScoutCategory, { score: number; nature: LocationNature; topInfluence: LineInfluence | null }>;
    minDistance: number;
  }>();

  // Run scout analysis for each category
  for (const category of SCOUT_CATEGORIES) {
    const analysis = scoutLocationsForCategory(category, planetaryLines, aspectLines);

    for (const countryGroup of analysis.countries) {
      for (const location of countryGroup.locations) {
        const key = `${location.city.name}-${location.city.country}`;

        if (!cityScoresMap.has(key)) {
          cityScoresMap.set(key, {
            city: location.city,
            scores: new Map(),
            minDistance: location.distance,
          });
        }

        const cityData = cityScoresMap.get(key)!;
        cityData.scores.set(category, {
          score: location.overallScore,
          nature: location.nature,
          topInfluence: location.influences[0] || null,
        });
        cityData.minDistance = Math.min(cityData.minDistance, location.distance);
      }
    }
  }

  // Convert to array and calculate totals
  const overallLocations: OverallScoutLocation[] = [];

  for (const [, cityData] of cityScoresMap) {
    const categoryScores: OverallScoutLocation['categoryScores'] = [];
    let totalScore = 0;
    let beneficialCount = 0;
    let challengingCount = 0;

    for (const category of SCOUT_CATEGORIES) {
      const scoreData = cityData.scores.get(category);
      if (scoreData) {
        categoryScores.push({
          category,
          score: scoreData.score,
          nature: scoreData.nature,
          topInfluence: scoreData.topInfluence,
        });
        // Beneficial scores add, challenging scores subtract
        if (scoreData.nature === 'beneficial') {
          totalScore += scoreData.score;
          beneficialCount++;
        } else {
          totalScore -= scoreData.score * 0.5; // Challenging reduces but not as much
          challengingCount++;
        }
      }
    }

    // Sort category scores by score descending
    categoryScores.sort((a, b) => b.score - a.score);

    const numCategories = categoryScores.length;
    if (numCategories > 0) {
      overallLocations.push({
        city: cityData.city,
        totalScore: Math.round(totalScore),
        averageScore: Math.round(totalScore / numCategories),
        categoryScores,
        beneficialCategories: beneficialCount,
        challengingCategories: challengingCount,
        distance: cityData.minDistance,
      });
    }
  }

  // Sort by total score descending
  return overallLocations.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Overall country group for the Countries view in Overall tab
 * Countries are ordered by their top city's score - no ranking displayed
 */
export interface OverallCountryGroup {
  country: string;
  locations: OverallScoutLocation[];
  /** Number of cities where beneficial > challenging */
  beneficialCount: number;
  /** Number of cities where challenging > beneficial */
  challengingCount: number;
}

/**
 * Group overall locations by country, sorted by top city's score
 *
 * Countries are ordered by the highest scoring city in each country.
 * Cities within each country are sorted by totalScore (highest first).
 * No ranking score is displayed - countries are just ordered for display.
 */
export function groupOverallByCountry(locations: OverallScoutLocation[]): OverallCountryGroup[] {
  const countryMap = new Map<string, OverallScoutLocation[]>();

  for (const loc of locations) {
    const country = loc.city.country;
    if (!countryMap.has(country)) {
      countryMap.set(country, []);
    }
    countryMap.get(country)!.push(loc);
  }

  return Array.from(countryMap.entries())
    .map(([country, locs]) => {
      // Sort cities by score (highest first)
      const sortedLocs = locs.sort((a, b) => b.totalScore - a.totalScore);

      // Count beneficial vs challenging cities
      const beneficialCount = locs.filter(l => l.beneficialCategories > l.challengingCategories).length;
      const challengingCount = locs.filter(l => l.challengingCategories > l.beneficialCategories).length;

      return {
        country,
        locations: sortedLocs,
        beneficialCount,
        challengingCount,
      };
    })
    // Sort countries by their top city's score
    .sort((a, b) => {
      const aTopScore = a.locations[0]?.totalScore ?? 0;
      const bTopScore = b.locations[0]?.totalScore ?? 0;
      return bTopScore - aTopScore;
    });
}

export function getPlainLanguageInfluence(influence: LineInfluence, category: ScoutCategory): string {
  const planetDescriptions: Record<Planet, Record<ScoutCategory, string>> = {
    Sun: {
      career: 'Leadership and recognition',
      love: 'Confident, successful partners',
      health: 'Strong vitality and energy',
      home: 'Warm, proud family environment',
      wellbeing: 'Confidence and self-expression',
      wealth: 'Personal success brings rewards',
    },
    Moon: {
      career: 'Public appeal and popularity',
      love: 'Emotional bonding and nurturing',
      health: 'Emotional wellbeing affects physical',
      home: 'Nurturing, family-centered sanctuary',
      wellbeing: 'Emotional comfort and belonging',
      wealth: 'Success through public connection',
    },
    Mercury: {
      career: 'Communication and commerce',
      love: 'Intellectual connection',
      health: 'Mental clarity and learning',
      home: 'Active, communicative household',
      wellbeing: 'Mental stimulation',
      wealth: 'Business acumen and trading',
    },
    Venus: {
      career: 'Creative and diplomatic success',
      love: 'Romance and attraction',
      health: 'Physical beauty and pleasure',
      home: 'Beautiful, harmonious living',
      wellbeing: 'Joy, comfort, and pleasure',
      wealth: 'Money through charm and art',
    },
    Mars: {
      career: 'Ambitious competition and drive',
      love: 'Passion and sexual attraction',
      health: 'Athletic strength and stamina',
      home: 'Active, sometimes tense environment',
      wellbeing: 'Energy and motivation',
      wealth: 'Aggressive earning potential',
    },
    Jupiter: {
      career: 'Expansion and opportunities',
      love: 'Generous, supportive partnerships',
      health: 'Overall luck and wellness',
      home: 'Spacious, lucky property',
      wellbeing: 'Optimism and growth',
      wealth: 'Abundance and financial luck',
    },
    Saturn: {
      career: 'Long-term authority building',
      love: 'Serious, committed relationships',
      health: 'Discipline but potential limits',
      home: 'Structured, traditional foundations',
      wellbeing: 'Maturity through challenges',
      wealth: 'Slow but steady wealth building',
    },
    Uranus: {
      career: 'Innovation and sudden changes',
      love: 'Unconventional relationships',
      health: 'Erratic but liberating energy',
      home: 'Frequent moves, unique living',
      wellbeing: 'Freedom and authenticity',
      wealth: 'Sudden gains or losses',
    },
    Neptune: {
      career: 'Creative/spiritual but unclear',
      love: 'Spiritual connection or illusion',
      health: 'Sensitivity, healing needed',
      home: 'Dreamy, near water',
      wellbeing: 'Spiritual peace',
      wealth: 'Creative income, watch finances',
    },
    Pluto: {
      career: 'Power and transformation',
      love: 'Intense, transformative bonds',
      health: 'Deep healing or challenges',
      home: 'Family transformation',
      wellbeing: 'Empowerment through change',
      wealth: 'Control over resources',
    },
    Chiron: {
      career: 'Teaching and healing profession',
      love: 'Healing through relationships',
      health: 'Finding the right healers',
      home: 'Family healing work',
      wellbeing: 'Wisdom through wounds',
      wealth: 'Healing others brings abundance',
    },
    NorthNode: {
      career: 'Destiny and life purpose',
      love: 'Karmic partnerships',
      health: 'Growth and evolution',
      home: 'Building meaningful roots',
      wellbeing: 'Living your purpose',
      wealth: 'Following your calling',
    },
  };

  return planetDescriptions[influence.planet]?.[category] || influence.description;
}
