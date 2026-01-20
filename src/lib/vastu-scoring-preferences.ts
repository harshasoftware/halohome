import type { VastuScoringPreferences } from '@/stores/vastuPreferencesStore';

export type SoilGrade = 'A' | 'B' | 'C' | 'D' | 'F' | number;

export interface EnvironmentalSignals {
  /**
   * Count of nearby cemeteries within the search radius used by the data pipeline.
   * If undefined, the score is not adjusted.
   */
  nearbyCemeteryCount?: number;
  /**
   * Crime index, normalized 0-100 where higher = more crime.
   * If undefined, the score is not adjusted.
   */
  crimeIndex?: number;
  /**
   * Soil grade (A best → F worst) or a numeric grade 0-100 (higher = better).
   * If undefined, the score is not adjusted.
   */
  soilGrade?: SoilGrade;
  /**
   * Count of nearby factories / heavy industrial sites within the search radius used by the data pipeline.
   * If undefined, the score is not adjusted.
   */
  nearbyFactoryCount?: number;
  /**
   * Noise pollution index, normalized 0-100 where higher = noisier.
   * If undefined, the score is not adjusted.
   */
  noiseIndex?: number;
  /**
   * Air Quality Index (AQI), typically 0-500 where higher = worse air quality.
   * If undefined, the score is not adjusted.
   */
  aqi?: number;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function soilPenalty(soilGrade: SoilGrade): number {
  if (typeof soilGrade === 'number' && Number.isFinite(soilGrade)) {
    // 100 is best (0 penalty), 0 is worst (~12 penalty)
    return clamp((100 - soilGrade) / 8.5, 0, 12);
  }

  switch (soilGrade) {
    case 'A':
      return 0;
    case 'B':
      return 2;
    case 'C':
      return 5;
    case 'D':
      return 8;
    case 'F':
      return 12;
    default:
      return 0;
  }
}

/**
 * Applies user scoring preferences to a base Vastu score.
 *
 * Note: adjustments only apply when the corresponding signal is present.
 */
export function applyVastuScoringPreferences(
  baseScore: number,
  prefs: VastuScoringPreferences,
  signals?: EnvironmentalSignals
): number {
  let score = baseScore;
  if (!signals) return clamp(Math.round(score), 0, 100);

  if (prefs.considerNearbyCemeteries && typeof signals.nearbyCemeteryCount === 'number') {
    const count = Math.max(0, signals.nearbyCemeteryCount);
    // Up to -12 points
    score -= clamp(count * 4, 0, 12);
  }

  if (prefs.considerCrimeRate && typeof signals.crimeIndex === 'number') {
    const idx = clamp(signals.crimeIndex, 0, 100);
    // Penalize above 50; up to -10 points at 100
    score -= clamp((idx - 50) / 5, 0, 10);
  }

  if (prefs.considerSoilType && signals.soilGrade !== undefined) {
    score -= soilPenalty(signals.soilGrade);
  }

  if (prefs.considerNearbyFactories && typeof signals.nearbyFactoryCount === 'number') {
    const count = Math.max(0, signals.nearbyFactoryCount);
    // Up to -10 points
    score -= clamp(count * 2.5, 0, 10);
  }

  if (prefs.considerNoisePollution && typeof signals.noiseIndex === 'number') {
    const idx = clamp(signals.noiseIndex, 0, 100);
    // Penalize above 50; up to -10 points at 100
    score -= clamp((idx - 50) / 5, 0, 10);
  }

  if (prefs.considerAirQuality && typeof signals.aqi === 'number') {
    const aqi = clamp(signals.aqi, 0, 500);
    // Penalize above "good" (50); up to -12 points at very high AQI
    score -= clamp((aqi - 50) / 25, 0, 12);
  }

  return clamp(Math.round(score), 0, 100);
}

