/**
 * Population Tier Filtering for Scout
 *
 * Defines city population tiers for filtering scout results.
 * Larger cities = fewer results but more relevant for many users.
 */

export type PopulationTier =
  | 'all'           // All cities (15k+, ~33k cities)
  | 'small'         // 50k+ (~6k cities)
  | 'medium'        // 100k+ (~4k cities)
  | 'large'         // 250k+ (~2k cities)
  | 'major'         // 500k+ (~1k cities)
  | 'mega';         // 1M+ (~500 cities)

export interface PopulationTierInfo {
  tier: PopulationTier;
  label: string;
  minPopulation: number;
  description: string;
  approximateCities: string;
}

export const POPULATION_TIERS: Record<PopulationTier, PopulationTierInfo> = {
  all: {
    tier: 'all',
    label: 'All Cities',
    minPopulation: 15000,
    description: 'All cities 15k+',
    approximateCities: '~33,000',
  },
  small: {
    tier: 'small',
    label: 'Small+',
    minPopulation: 50000,
    description: 'Cities 50k+',
    approximateCities: '~6,000',
  },
  medium: {
    tier: 'medium',
    label: 'Medium+',
    minPopulation: 100000,
    description: 'Cities 100k+',
    approximateCities: '~4,000',
  },
  large: {
    tier: 'large',
    label: 'Large+',
    minPopulation: 250000,
    description: 'Cities 250k+',
    approximateCities: '~2,000',
  },
  major: {
    tier: 'major',
    label: 'Major+',
    minPopulation: 500000,
    description: 'Cities 500k+',
    approximateCities: '~1,000',
  },
  mega: {
    tier: 'mega',
    label: 'Mega Cities',
    minPopulation: 1000000,
    description: 'Cities 1M+',
    approximateCities: '~500',
  },
};

/**
 * Get minimum population for a tier
 */
export function getMinPopulation(tier: PopulationTier): number {
  return POPULATION_TIERS[tier].minPopulation;
}

/**
 * Get tier info
 */
export function getTierInfo(tier: PopulationTier): PopulationTierInfo {
  return POPULATION_TIERS[tier];
}

/**
 * All tiers in order from smallest to largest
 */
export const POPULATION_TIER_ORDER: PopulationTier[] = [
  'all',
  'small',
  'medium',
  'large',
  'major',
  'mega',
];

/**
 * Default tier for new users (balanced between speed and coverage)
 */
export const DEFAULT_POPULATION_TIER: PopulationTier = 'medium';
