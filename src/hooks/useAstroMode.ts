/**
 * useAstroMode Hook
 * Manages astrocartography mode switching between:
 * - standard: Normal astrocartography lines from birth location
 * - relocated: Lines recalculated for a different location (same birth time)
 * - localSpace: Azimuth-based lines radiating from birth location
 */

import { useState, useCallback, useMemo } from 'react';
import type { AstroMode, RelocationLocation, BirthData } from '@/lib/astro-types';

export interface UseAstroModeResult {
  // Current mode
  mode: AstroMode;
  setMode: (mode: AstroMode) => void;

  // Relocation state
  relocationTarget: RelocationLocation | null;
  setRelocationTarget: (location: RelocationLocation | null) => void;

  // Relocated birth data (same time, different location)
  relocatedBirthData: BirthData | null;

  // Is in relocated mode with valid target
  isRelocated: boolean;

  // Is in local space mode
  isLocalSpace: boolean;

  // Local space origin (can be different from birth location)
  localSpaceOrigin: RelocationLocation | null;

  // Birth data for local space (uses custom origin if set, otherwise birth location)
  localSpaceBirthData: BirthData | null;

  // Clear relocation and return to standard mode
  clearRelocation: () => void;

  // Relocate to a specific location
  relocateTo: (lat: number, lng: number, name?: string) => void;

  // Switch to local space mode
  enableLocalSpace: () => void;

  // Set custom origin for local space lines (e.g., when clicking a city)
  setLocalSpaceOrigin: (lat: number, lng: number, name?: string) => void;

  // Return to standard mode
  returnToStandard: () => void;
}

export function useAstroMode(birthData: BirthData | null): UseAstroModeResult {
  const [mode, setMode] = useState<AstroMode>('standard');
  const [relocationTarget, setRelocationTarget] = useState<RelocationLocation | null>(null);
  const [localSpaceOrigin, setLocalSpaceOriginState] = useState<RelocationLocation | null>(null);

  // Create relocated birth data (same time, different location)
  const relocatedBirthData = useMemo((): BirthData | null => {
    if (!birthData || !relocationTarget || mode !== 'relocated') {
      return null;
    }

    return {
      ...birthData,
      latitude: relocationTarget.lat,
      longitude: relocationTarget.lng,
      lat: relocationTarget.lat,
      lng: relocationTarget.lng,
    };
  }, [birthData, relocationTarget, mode]);

  // Create local space birth data (uses custom origin if set, otherwise birth location)
  const localSpaceBirthData = useMemo((): BirthData | null => {
    if (!birthData || mode !== 'localSpace') {
      return null;
    }

    // If we have a custom origin, use it; otherwise use original birth location
    if (localSpaceOrigin) {
      return {
        ...birthData,
        latitude: localSpaceOrigin.lat,
        longitude: localSpaceOrigin.lng,
        lat: localSpaceOrigin.lat,
        lng: localSpaceOrigin.lng,
      };
    }

    // Use original birth data
    return birthData;
  }, [birthData, localSpaceOrigin, mode]);

  // Derived states
  const isRelocated = mode === 'relocated' && relocationTarget !== null;
  const isLocalSpace = mode === 'localSpace';

  // Clear relocation and return to standard mode
  const clearRelocation = useCallback(() => {
    setRelocationTarget(null);
    setMode('standard');
  }, []);

  // Relocate to a specific location
  const relocateTo = useCallback((lat: number, lng: number, name?: string) => {
    setRelocationTarget({ lat, lng, name });
    setMode('relocated');
  }, []);

  // Switch to local space mode
  const enableLocalSpace = useCallback(() => {
    setMode('localSpace');
  }, []);

  // Set custom origin for local space lines
  const setLocalSpaceOrigin = useCallback((lat: number, lng: number, name?: string) => {
    setLocalSpaceOriginState({ lat, lng, name });
    // Auto-enable local space mode when setting origin
    if (mode !== 'localSpace') {
      setMode('localSpace');
    }
  }, [mode]);

  // Return to standard mode
  const returnToStandard = useCallback(() => {
    setMode('standard');
    setRelocationTarget(null);
    setLocalSpaceOriginState(null); // Clear local space origin too
  }, []);

  return {
    mode,
    setMode,
    relocationTarget,
    setRelocationTarget,
    relocatedBirthData,
    isRelocated,
    isLocalSpace,
    localSpaceOrigin,
    localSpaceBirthData,
    clearRelocation,
    relocateTo,
    enableLocalSpace,
    setLocalSpaceOrigin,
    returnToStandard,
  };
}
