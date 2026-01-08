/**
 * Test Data Generators for Virtual List Performance Testing
 *
 * Provides utilities to generate large datasets (200+ items) for testing
 * virtualization performance in ScoutPanel and PlacesTab components.
 *
 * Usage:
 * 1. Import the generators in development
 * 2. Use them to populate components with test data
 * 3. Measure performance with usePerformanceMetrics hook
 */

// ============================================================================
// Types - Matching actual component types
// ============================================================================

export interface MockRankedLocation {
  coordinates: { lat: number; lng: number };
  name: string;
  country: string;
  countryCode: string;
  type: 'city';
  rank: number;
  score: number;
  bestInfluence: {
    name: string;
    planet: string;
    score: number;
    angle?: string;
    crossingLat?: number;
  };
  allInfluences: Array<{
    name: string;
    planet: string;
    score: number;
    angle?: string;
    crossingLat?: number;
  }>;
}

export interface MockOverallLocation {
  coordinates: { lat: number; lng: number };
  name: string;
  country: string;
  countryCode: string;
  type: 'city';
  rank: number;
  overallScore: number;
  categoryScores: Record<string, number>;
}

export interface MockPlace {
  place_id: string;
  name: string;
  types: string[];
  geometry: {
    location: { lat: () => number; lng: () => number };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{ getUrl: () => string }>;
  vicinity?: string;
  opening_hours?: { isOpen: () => boolean };
}

export interface MockCountryGroup {
  country: string;
  countryCode: string;
  locations: MockRankedLocation[];
}

// ============================================================================
// Sample Data
// ============================================================================

const CITY_NAMES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
  'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
  'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington',
  'Boston', 'El Paso', 'Detroit', 'Nashville', 'Portland',
  'Memphis', 'Oklahoma City', 'Las Vegas', 'Louisville', 'Baltimore',
  'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento',
  'Kansas City', 'Long Beach', 'Mesa', 'Atlanta', 'Colorado Springs',
  'Virginia Beach', 'Raleigh', 'Omaha', 'Miami', 'Oakland',
  'Minneapolis', 'Tulsa', 'Wichita', 'New Orleans', 'Arlington',
];

const COUNTRIES = [
  { name: 'United States', code: 'US' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Germany', code: 'DE' },
  { name: 'France', code: 'FR' },
  { name: 'Italy', code: 'IT' },
  { name: 'Spain', code: 'ES' },
  { name: 'Canada', code: 'CA' },
  { name: 'Australia', code: 'AU' },
  { name: 'Japan', code: 'JP' },
  { name: 'Brazil', code: 'BR' },
  { name: 'Mexico', code: 'MX' },
  { name: 'India', code: 'IN' },
  { name: 'China', code: 'CN' },
  { name: 'Russia', code: 'RU' },
  { name: 'South Korea', code: 'KR' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'Sweden', code: 'SE' },
  { name: 'Norway', code: 'NO' },
  { name: 'Denmark', code: 'DK' },
  { name: 'Poland', code: 'PL' },
];

const PLANET_NAMES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

const INFLUENCE_NAMES = [
  'Career', 'Love', 'Health', 'Wealth', 'Creativity',
  'Communication', 'Travel', 'Family', 'Education', 'Spirituality',
];

const CATEGORY_NAMES = [
  'Career', 'Love', 'Health', 'Finance', 'Family',
  'Travel', 'Education', 'Creativity', 'Spirituality', 'Social',
];

const PLACE_TYPES = [
  'restaurant', 'cafe', 'bar', 'museum', 'park',
  'gym', 'spa', 'shopping_mall', 'movie_theater', 'library',
  'art_gallery', 'night_club', 'bakery', 'book_store', 'pharmacy',
];

const PLACE_NAMES = [
  'The Grand', 'Blue Haven', 'Golden Gate', 'Silver Moon', 'Red Dragon',
  'Green Garden', 'Ocean View', 'Mountain Peak', 'River Side', 'Star Light',
  'Cloud Nine', 'Sunset Boulevard', 'Midnight Express', 'Morning Glory', 'Evening Star',
  'Royal Palace', 'Diamond Plaza', 'Crystal Tower', 'Pearl Harbor', 'Ruby Tuesday',
];

// ============================================================================
// Utility Functions
// ============================================================================

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateCoordinates(): { lat: number; lng: number } {
  return {
    lat: randomNumber(-60, 70),
    lng: randomNumber(-170, 170),
  };
}

// ============================================================================
// Generator Functions
// ============================================================================

/**
 * Generate mock ranked locations for Category Top Locations view
 */
export function generateMockRankedLocations(count: number): MockRankedLocation[] {
  const locations: MockRankedLocation[] = [];

  for (let i = 0; i < count; i++) {
    const country = randomElement(COUNTRIES);
    const numInfluences = Math.floor(randomNumber(1, 5));
    const influences = Array.from({ length: numInfluences }, () => ({
      name: randomElement(INFLUENCE_NAMES),
      planet: randomElement(PLANET_NAMES),
      score: randomNumber(50, 100),
      angle: Math.random() > 0.5 ? 'Conjunct' : 'Trine',
    }));

    locations.push({
      coordinates: generateCoordinates(),
      name: `${randomElement(CITY_NAMES)} ${i + 1}`,
      country: country.name,
      countryCode: country.code,
      type: 'city',
      rank: i + 1,
      score: randomNumber(50, 100),
      bestInfluence: influences[0],
      allInfluences: influences,
    });
  }

  return locations;
}

/**
 * Generate mock overall locations for Overall Top Locations view
 */
export function generateMockOverallLocations(count: number): MockOverallLocation[] {
  const locations: MockOverallLocation[] = [];

  for (let i = 0; i < count; i++) {
    const country = randomElement(COUNTRIES);
    const numCategories = Math.floor(randomNumber(3, 8));
    const categoryScores: Record<string, number> = {};

    for (let j = 0; j < numCategories; j++) {
      const category = CATEGORY_NAMES[j % CATEGORY_NAMES.length];
      categoryScores[category] = randomNumber(50, 100);
    }

    locations.push({
      coordinates: generateCoordinates(),
      name: `${randomElement(CITY_NAMES)} ${i + 1}`,
      country: country.name,
      countryCode: country.code,
      type: 'city',
      rank: i + 1,
      overallScore: randomNumber(60, 100),
      categoryScores,
    });
  }

  return locations;
}

/**
 * Generate mock country groups for Countries view
 */
export function generateMockCountryGroups(
  numCountries: number,
  locationsPerCountry: number
): MockCountryGroup[] {
  const groups: MockCountryGroup[] = [];

  for (let i = 0; i < numCountries; i++) {
    const country = COUNTRIES[i % COUNTRIES.length];

    const locations: MockRankedLocation[] = [];
    for (let j = 0; j < locationsPerCountry; j++) {
      const numInfluences = Math.floor(randomNumber(1, 5));
      const influences = Array.from({ length: numInfluences }, () => ({
        name: randomElement(INFLUENCE_NAMES),
        planet: randomElement(PLANET_NAMES),
        score: randomNumber(50, 100),
      }));

      locations.push({
        coordinates: generateCoordinates(),
        name: `${randomElement(CITY_NAMES)} ${j + 1}`,
        country: country.name,
        countryCode: country.code,
        type: 'city',
        rank: j + 1,
        score: randomNumber(50, 100),
        bestInfluence: influences[0],
        allInfluences: influences,
      });
    }

    groups.push({
      country: country.name,
      countryCode: country.code,
      locations,
    });
  }

  return groups;
}

/**
 * Generate mock places for PlacesTab
 */
export function generateMockPlaces(count: number): MockPlace[] {
  const places: MockPlace[] = [];

  for (let i = 0; i < count; i++) {
    const coords = generateCoordinates();

    places.push({
      place_id: `place_${i}_${Date.now()}`,
      name: `${randomElement(PLACE_NAMES)} ${i + 1}`,
      types: [randomElement(PLACE_TYPES), randomElement(PLACE_TYPES)],
      geometry: {
        location: {
          lat: () => coords.lat,
          lng: () => coords.lng,
        },
      },
      rating: Math.round(randomNumber(30, 50)) / 10,
      user_ratings_total: Math.floor(randomNumber(10, 5000)),
      price_level: Math.floor(randomNumber(1, 5)),
      photos: Math.random() > 0.2
        ? [{ getUrl: () => 'https://via.placeholder.com/80' }]
        : undefined,
      vicinity: `${Math.floor(randomNumber(1, 999))} ${randomElement(CITY_NAMES)} Street`,
      opening_hours: Math.random() > 0.3
        ? { isOpen: () => Math.random() > 0.3 }
        : undefined,
    });
  }

  return places;
}

// ============================================================================
// Test Scenarios
// ============================================================================

export interface TestScenario {
  name: string;
  description: string;
  itemCount: number;
  expectedDOMReduction: string;
}

/**
 * Predefined test scenarios for performance testing
 */
export const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Standard Load',
    description: 'Typical user scenario with moderate data',
    itemCount: 50,
    expectedDOMReduction: '60-70%',
  },
  {
    name: 'Heavy Load',
    description: 'Power user with lots of results',
    itemCount: 200,
    expectedDOMReduction: '80-90%',
  },
  {
    name: 'Stress Test',
    description: 'Maximum reasonable dataset',
    itemCount: 500,
    expectedDOMReduction: '90-95%',
  },
  {
    name: 'Extreme Test',
    description: 'Edge case with very large dataset',
    itemCount: 1000,
    expectedDOMReduction: '95-98%',
  },
];

/**
 * Generate test data for a specific scenario
 */
export function generateTestDataForScenario(
  scenario: TestScenario
): {
  rankedLocations: MockRankedLocation[];
  overallLocations: MockOverallLocation[];
  countryGroups: MockCountryGroup[];
  places: MockPlace[];
} {
  return {
    rankedLocations: generateMockRankedLocations(scenario.itemCount),
    overallLocations: generateMockOverallLocations(scenario.itemCount),
    countryGroups: generateMockCountryGroups(
      Math.min(20, Math.ceil(scenario.itemCount / 10)),
      10
    ),
    places: generateMockPlaces(scenario.itemCount),
  };
}

// ============================================================================
// Performance Expectations
// ============================================================================

export const PERFORMANCE_EXPECTATIONS = {
  /**
   * Target frame rate during scroll (FPS)
   * 60 FPS is ideal, 30+ is acceptable
   */
  targetFrameRate: 60,
  acceptableFrameRate: 30,

  /**
   * Maximum acceptable render time (ms)
   * Initial render should be under 100ms
   */
  maxInitialRenderTime: 100,

  /**
   * Maximum DOM nodes rendered at once
   * With virtualization, this should be roughly:
   * (containerHeight / itemHeight) + (2 * overscan)
   */
  maxDOMNodesVisible: 50,

  /**
   * Expected DOM reduction percentage with 200+ items
   */
  minDOMReductionPercent: 80,

  /**
   * Memory usage should not grow significantly during scroll
   * Maximum acceptable growth in MB
   */
  maxMemoryGrowthMB: 10,
};

// ============================================================================
// Console Helpers for Manual Testing
// ============================================================================

/**
 * Log test data generation info to console
 */
export function logTestDataInfo(): void {
  console.group('🧪 Virtual List Test Data Generators');
  console.log('Available generators:');
  console.log('  - generateMockRankedLocations(count)');
  console.log('  - generateMockOverallLocations(count)');
  console.log('  - generateMockCountryGroups(numCountries, locationsPerCountry)');
  console.log('  - generateMockPlaces(count)');
  console.log('');
  console.log('Test scenarios:', TEST_SCENARIOS);
  console.log('');
  console.log('Performance expectations:', PERFORMANCE_EXPECTATIONS);
  console.groupEnd();
}
