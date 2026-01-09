/**
 * Tutorial Store - Zustand store for onboarding tutorial state
 *
 * Manages tutorial flow state including active status, current step,
 * completion/skip status, and welcome modal visibility.
 * Persistence to Supabase/localStorage is handled by useTutorialPersistence hook.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface TutorialState {
  // State
  isTutorialActive: boolean;
  currentTutorialStep: number;
  tutorialCompleted: boolean;
  tutorialSkipped: boolean;
  showWelcomeModal: boolean;
  isLoading: boolean;

  // Actions
  startTutorial: () => void;
  setTutorialStep: (step: number) => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  setShowWelcomeModal: (show: boolean) => void;
  setIsLoading: (loading: boolean) => void;

  // Hydration action for loading persisted state
  hydrate: (state: {
    tutorialCompleted: boolean;
    tutorialSkipped: boolean;
    currentTutorialStep?: number;
  }) => void;
}

const initialState = {
  isTutorialActive: false,
  currentTutorialStep: 0,
  tutorialCompleted: false,
  tutorialSkipped: false,
  showWelcomeModal: false,
  isLoading: true,
};

export const useTutorialStore = create<TutorialState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      startTutorial: () => set((state) => {
        state.isTutorialActive = true;
        state.currentTutorialStep = 0;
        state.showWelcomeModal = false;
      }),

      setTutorialStep: (step) => set((state) => {
        state.currentTutorialStep = step;
      }),

      skipTutorial: () => set((state) => {
        state.tutorialSkipped = true;
        state.isTutorialActive = false;
        state.showWelcomeModal = false;
      }),

      completeTutorial: () => set((state) => {
        state.tutorialCompleted = true;
        state.isTutorialActive = false;
      }),

      resetTutorial: () => set((state) => {
        state.isTutorialActive = false;
        state.currentTutorialStep = 0;
        state.tutorialCompleted = false;
        state.tutorialSkipped = false;
        state.showWelcomeModal = false;
      }),

      setShowWelcomeModal: (show) => set((state) => {
        state.showWelcomeModal = show;
      }),

      setIsLoading: (loading) => set((state) => {
        state.isLoading = loading;
      }),

      hydrate: (persistedState) => set((state) => {
        state.tutorialCompleted = persistedState.tutorialCompleted;
        state.tutorialSkipped = persistedState.tutorialSkipped;
        if (persistedState.currentTutorialStep !== undefined) {
          state.currentTutorialStep = persistedState.currentTutorialStep;
        }
        state.isLoading = false;
        // Show welcome modal only if user hasn't completed or skipped the tutorial
        state.showWelcomeModal = !persistedState.tutorialCompleted && !persistedState.tutorialSkipped;
      }),
    })),
    { name: 'tutorial-store' }
  )
);

// Selectors for fine-grained subscriptions
export const useIsTutorialActive = () => useTutorialStore((state) => state.isTutorialActive);
export const useCurrentTutorialStep = () => useTutorialStore((state) => state.currentTutorialStep);
export const useTutorialCompleted = () => useTutorialStore((state) => state.tutorialCompleted);
export const useTutorialSkipped = () => useTutorialStore((state) => state.tutorialSkipped);
export const useShowWelcomeModal = () => useTutorialStore((state) => state.showWelcomeModal);
export const useTutorialLoading = () => useTutorialStore((state) => state.isLoading);
export const useShouldShowTutorial = () => useTutorialStore((state) =>
  !state.tutorialCompleted && !state.tutorialSkipped && !state.isLoading
);
