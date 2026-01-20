/**
 * Vastu Preferences Store
 *
 * Stores user preferences that affect Vastu scoring/filters.
 * Persisted locally so preferences survive refreshes.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';

export interface VastuScoringPreferences {
  considerNearbyCemeteries: boolean;
  considerCrimeRate: boolean;
  considerSoilType: boolean;
  considerNoisePollution: boolean;
  considerAirQuality: boolean;
  considerNearbyFactories: boolean;
}

interface VastuPreferencesState {
  scoring: VastuScoringPreferences;
  setConsiderNearbyCemeteries: (value: boolean) => void;
  setConsiderCrimeRate: (value: boolean) => void;
  setConsiderSoilType: (value: boolean) => void;
  setConsiderNoisePollution: (value: boolean) => void;
  setConsiderAirQuality: (value: boolean) => void;
  setConsiderNearbyFactories: (value: boolean) => void;
  resetScoring: () => void;
}

const initialScoring: VastuScoringPreferences = {
  considerNearbyCemeteries: true,
  considerCrimeRate: true,
  considerSoilType: false,
  considerNoisePollution: true,
  considerAirQuality: true,
  considerNearbyFactories: true,
};

export const useVastuPreferencesStore = create<VastuPreferencesState>()(
  devtools(
    persist(
      immer((set) => ({
        scoring: initialScoring,
        setConsiderNearbyCemeteries: (value) =>
          set((state) => {
            state.scoring.considerNearbyCemeteries = value;
          }),
        setConsiderCrimeRate: (value) =>
          set((state) => {
            state.scoring.considerCrimeRate = value;
          }),
        setConsiderSoilType: (value) =>
          set((state) => {
            state.scoring.considerSoilType = value;
          }),
        setConsiderNoisePollution: (value) =>
          set((state) => {
            state.scoring.considerNoisePollution = value;
          }),
        setConsiderAirQuality: (value) =>
          set((state) => {
            state.scoring.considerAirQuality = value;
          }),
        setConsiderNearbyFactories: (value) =>
          set((state) => {
            state.scoring.considerNearbyFactories = value;
          }),
        resetScoring: () =>
          set((state) => {
            state.scoring = initialScoring;
          }),
      })),
      {
        name: 'vastu-preferences-v1',
        version: 2,
        migrate: (persisted: unknown) => {
          const p = persisted as { scoring?: Partial<VastuScoringPreferences> } | undefined;
          const scoring = {
            ...initialScoring,
            ...(p?.scoring ?? {}),
          } satisfies VastuScoringPreferences;
          return { scoring };
        },
        partialize: (state) => ({ scoring: state.scoring }),
      }
    )
  )
);

export const useVastuScoringPreferences = () =>
  useVastuPreferencesStore(useShallow((s) => s.scoring));

