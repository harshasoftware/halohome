/**
 * useZoneValidation - Hook for validating zone constraints
 *
 * Combines property size validation (200,000 sqft max) and
 * scout zone house count validation (50 houses max).
 */

import { useState, useCallback } from 'react';
import {
  calculatePolygonAreaSqFt,
  isAreaWithinLimit,
  formatArea,
  PROPERTY_SIZE_LIMIT_SQFT,
  SCOUT_HOUSE_LIMIT,
} from '@/lib/geo-utils';
import { fetchAddressesInZone, type ZoneAddressResult } from '../services/zoneAddressService';

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
  details?: {
    areaSqFt?: number;
    areaFormatted?: string;
    houseCount?: number;
    isComplete?: boolean;
  };
}

export interface UseZoneValidationReturn {
  // Validation functions
  validatePropertyZone: (points: Array<{ lat: number; lng: number }>) => ValidationResult;
  validateScoutZone: (
    points: Array<{ lat: number; lng: number }>
  ) => Promise<ValidationResult>;

  // Loading state
  isValidating: boolean;
  validationProgress: string | null;

  // Reset
  resetValidation: () => void;
}

/**
 * Hook for validating zone constraints
 */
export function useZoneValidation(): UseZoneValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState<string | null>(null);

  /**
   * Validate property zone size (synchronous)
   * Checks if polygon area is within 200,000 sqft limit
   */
  const validatePropertyZone = useCallback(
    (points: Array<{ lat: number; lng: number }>): ValidationResult => {
      if (points.length < 3) {
        return {
          isValid: false,
          error: 'At least 3 points required to define a property boundary',
        };
      }

      const areaSqFt = calculatePolygonAreaSqFt(points);
      const isValid = isAreaWithinLimit(areaSqFt, PROPERTY_SIZE_LIMIT_SQFT);

      if (!isValid) {
        return {
          isValid: false,
          error: `Property exceeds 200,000 sqft limit. Current size: ${formatArea(areaSqFt)}. Please draw a smaller boundary.`,
          details: {
            areaSqFt,
            areaFormatted: formatArea(areaSqFt),
          },
        };
      }

      return {
        isValid: true,
        error: null,
        details: {
          areaSqFt,
          areaFormatted: formatArea(areaSqFt),
        },
      };
    },
    []
  );

  /**
   * Validate scout zone house count (asynchronous)
   * Checks if zone contains <= 50 addresses via Google Places API
   */
  const validateScoutZone = useCallback(
    async (
      points: Array<{ lat: number; lng: number }>
    ): Promise<ValidationResult> => {
      if (points.length < 3) {
        return {
          isValid: false,
          error: 'At least 3 points required to define a scout zone',
        };
      }

      setIsValidating(true);
      setValidationProgress('Counting addresses in zone...');

      try {
        const result: ZoneAddressResult = await fetchAddressesInZone(
          points,
          (count, phase) => {
            setValidationProgress(`${phase} (${count} found)`);
          }
        );

        setValidationProgress(null);
        setIsValidating(false);

        if (result.exceedsLimit) {
          return {
            isValid: false,
            error: `Zone contains more than ${SCOUT_HOUSE_LIMIT} addresses (found ${result.totalCount}). Please draw a smaller area.`,
            details: {
              houseCount: result.totalCount,
              isComplete: result.isComplete,
            },
          };
        }

        return {
          isValid: true,
          error: null,
          details: {
            houseCount: result.totalCount,
            isComplete: result.isComplete,
          },
        };
      } catch (error) {
        setValidationProgress(null);
        setIsValidating(false);

        console.error('Scout zone validation error:', error);
        return {
          isValid: false,
          error: 'Failed to validate scout zone. Please try again.',
        };
      }
    },
    []
  );

  /**
   * Reset validation state
   */
  const resetValidation = useCallback(() => {
    setIsValidating(false);
    setValidationProgress(null);
  }, []);

  return {
    validatePropertyZone,
    validateScoutZone,
    isValidating,
    validationProgress,
    resetValidation,
  };
}

export default useZoneValidation;
