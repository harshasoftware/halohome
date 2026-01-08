/**
 * Advanced Scout Adapter
 *
 * Converts results from the new grid-based advanced scout
 * to the format expected by the existing ScoutPanel.
 */

import type { AdvancedScoutResult } from '../hooks/useAdvancedScout';

export interface ScoutMarker {
  lat: number;
  lng: number;
  name: string;
  nature: 'beneficial' | 'challenging';
}

export interface ScoredLocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
  score: number;
  influences: Array<{
    planet: string;
    angle: string;
    distance: number;
    nature: 'beneficial' | 'challenging';
  }>;
}

/**
 * Convert advanced scout results to ScoutMarker format
 */
export function toScoutMarkers(results: AdvancedScoutResult[]): ScoutMarker[] {
  return results
    .filter((r) => r.nearestCity)
    .map((r) => ({
      lat: r.nearestCity!.lat,
      lng: r.nearestCity!.lng,
      name: r.nearestCity!.name,
      nature: r.score >= 50 ? 'beneficial' : 'challenging',
    }));
}

/**
 * Convert advanced scout results to ScoredLocation format
 * for compatibility with existing scout utilities
 */
export function toScoredLocations(results: AdvancedScoutResult[]): ScoredLocation[] {
  return results
    .filter((r) => r.nearestCity)
    .map((r) => ({
      city: r.nearestCity!.name,
      country: r.nearestCity!.country,
      lat: r.nearestCity!.lat,
      lng: r.nearestCity!.lng,
      score: r.score,
      influences: [], // Advanced scout doesn't track individual influences
    }));
}

/**
 * Group advanced scout results by country
 */
export function groupByCountry(results: AdvancedScoutResult[]): Record<string, AdvancedScoutResult[]> {
  const groups: Record<string, AdvancedScoutResult[]> = {};

  for (const result of results) {
    if (!result.nearestCity) continue;
    const country = result.nearestCity.country;
    if (!groups[country]) {
      groups[country] = [];
    }
    groups[country].push(result);
  }

  // Sort each group by score
  for (const country of Object.keys(groups)) {
    groups[country].sort((a, b) => b.score - a.score);
  }

  return groups;
}

/**
 * Get top N cities from advanced scout results
 */
export function getTopCities(
  results: AdvancedScoutResult[],
  limit: number = 20
): Array<{
  rank: number;
  name: string;
  country: string;
  lat: number;
  lng: number;
  score: number;
  zoneDistance: number;
  nearbyCities: string[];
}> {
  return results
    .filter((r) => r.nearestCity)
    .slice(0, limit)
    .map((r, i) => ({
      rank: i + 1,
      name: r.nearestCity!.name,
      country: r.nearestCity!.country,
      lat: r.nearestCity!.lat,
      lng: r.nearestCity!.lng,
      score: r.score,
      zoneDistance: r.distanceToCity,
      nearbyCities: r.citiesNearby.map((c) => c.name),
    }));
}

/**
 * Format score for display (0-100 scale)
 */
export function formatScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Get score category
 */
export function getScoreCategory(score: number): 'excellent' | 'good' | 'neutral' | 'challenging' {
  if (score >= 70) return 'excellent';
  if (score >= 55) return 'good';
  if (score >= 45) return 'neutral';
  return 'challenging';
}
