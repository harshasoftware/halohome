/**
 * TutorialTour - React Joyride integration for the interactive onboarding tutorial
 *
 * This component wraps react-joyride and connects it to the tutorialStore
 * for state management. It handles tutorial flow, step navigation, and
 * completion/skip callbacks with automatic persistence.
 */

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import Joyride, {
  CallBackProps,
  STATUS,
  EVENTS,
  ACTIONS,
  type Styles,
  type Step,
} from 'react-joyride';
import {
  TUTORIAL_STEPS,
  getMissingTutorialTargets,
  isTutorialStepTargetAvailable,
} from '@/config/tutorialSteps';
import {
  useTutorialStore,
  useIsTutorialActive,
  useCurrentTutorialStep,
} from '@/stores/tutorialStore';
import { useTutorialAutoPersist } from '@/hooks/useTutorialPersistence';

// Configuration for element availability checks
const ELEMENT_CHECK_INTERVAL = 100; // ms between checks
const ELEMENT_CHECK_TIMEOUT = 5000; // max time to wait for elements
const MIN_REQUIRED_ELEMENTS = 1; // minimum elements needed to start tutorial

// Theme colors matching the Radix UI / Tailwind design system
const THEME_COLORS = {
  primary: 'hsl(262.1, 83.3%, 57.8%)', // Primary purple from Tailwind config
  primaryHover: 'hsl(262.1, 83.3%, 52%)',
  background: 'hsl(0, 0%, 100%)',
  text: 'hsl(222.2, 84%, 4.9%)',
  textMuted: 'hsl(215.4, 16.3%, 46.9%)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  spotlight: 'transparent',
  beacon: 'hsl(262.1, 83.3%, 57.8%)',
};

// Dark mode theme colors (can be expanded for dark mode support)
const DARK_THEME_COLORS = {
  primary: 'hsl(263.4, 70%, 50.4%)',
  primaryHover: 'hsl(263.4, 70%, 55%)',
  background: 'hsl(222.2, 84%, 4.9%)',
  text: 'hsl(210, 40%, 98%)',
  textMuted: 'hsl(215, 20.2%, 65.1%)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  spotlight: 'transparent',
  beacon: 'hsl(263.4, 70%, 50.4%)',
};

/**
 * Hook to reactively track user's reduced motion preference
 * Listens for changes to the prefers-reduced-motion media query
 * and updates the state accordingly.
 */
const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Handler for media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add event listener for preference changes
    // Use addEventListener if available (modern browsers), otherwise use deprecated addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup listener on unmount
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
};

/**
 * Hook to wait for tutorial step target elements to become available
 *
 * This hook checks for the existence of DOM elements targeted by tutorial steps.
 * It waits until at least MIN_REQUIRED_ELEMENTS are available before returning
 * ready=true. If elements aren't available within ELEMENT_CHECK_TIMEOUT, it
 * returns with whatever elements are available and filters steps accordingly.
 *
 * @param isActive - Whether the tutorial is currently active
 * @returns Object with ready state and available steps
 */
const useElementAvailability = (
  isActive: boolean
): {
  isReady: boolean;
  availableSteps: Step[];
  unavailableIndices: number[];
} => {
  const [isReady, setIsReady] = useState(false);
  const [availableSteps, setAvailableSteps] = useState<Step[]>([]);
  const [unavailableIndices, setUnavailableIndices] = useState<number[]>([]);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset state when tutorial becomes inactive
    if (!isActive) {
      setIsReady(false);
      setAvailableSteps([]);
      setUnavailableIndices([]);

      // Clear any pending intervals/timeouts
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    /**
     * Check element availability and update state
     * Returns true if we should stop checking (enough elements available)
     */
    const checkElements = (): boolean => {
      const missingIndices = getMissingTutorialTargets();
      const availableCount = TUTORIAL_STEPS.length - missingIndices.length;

      // If all elements are available, we're ready
      if (missingIndices.length === 0) {
        setAvailableSteps(TUTORIAL_STEPS);
        setUnavailableIndices([]);
        setIsReady(true);
        return true;
      }

      // If we have enough elements, filter and proceed
      if (availableCount >= MIN_REQUIRED_ELEMENTS) {
        // Filter out steps with unavailable targets
        const filteredSteps = TUTORIAL_STEPS.filter(
          (_, index) => !missingIndices.includes(index)
        );
        setAvailableSteps(filteredSteps);
        setUnavailableIndices(missingIndices);
        setIsReady(true);
        return true;
      }

      return false;
    };

    // Do an immediate check first
    if (checkElements()) {
      return;
    }

    // Set up polling interval for element availability
    checkIntervalRef.current = setInterval(() => {
      if (checkElements()) {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    }, ELEMENT_CHECK_INTERVAL);

    // Set up timeout - if elements aren't available after timeout, proceed with what we have
    timeoutRef.current = setTimeout(() => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }

      // Final check - proceed with whatever is available
      const missingIndices = getMissingTutorialTargets();
      const filteredSteps = TUTORIAL_STEPS.filter(
        (_, index) => !missingIndices.includes(index)
      );

      setUnavailableIndices(missingIndices);

      // If no elements are available at all, set empty array (will cause skip)
      if (filteredSteps.length === 0) {
        setAvailableSteps([]);
      } else {
        setAvailableSteps(filteredSteps);
      }
      setIsReady(true);
    }, ELEMENT_CHECK_TIMEOUT);

    // Cleanup on unmount or when isActive changes
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isActive]);

  return { isReady, availableSteps, unavailableIndices };
};

/**
 * Hook to dynamically check if the current step's target is available
 * Allows the tutorial to skip to the next available step if target disappears
 */
const useCurrentStepAvailability = (
  currentStep: number,
  isActive: boolean
): boolean => {
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!isActive) {
      setIsAvailable(true);
      return;
    }

    // Check immediately
    setIsAvailable(isTutorialStepTargetAvailable(currentStep));

    // Set up a periodic check for the current step's element
    const checkInterval = setInterval(() => {
      setIsAvailable(isTutorialStepTargetAvailable(currentStep));
    }, ELEMENT_CHECK_INTERVAL * 5); // Less frequent than initial check

    return () => clearInterval(checkInterval);
  }, [currentStep, isActive]);

  return isAvailable;
};

/**
 * Check if dark mode is enabled
 */
const getIsDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
};

/**
 * Generate Joyride styles based on theme and motion preferences
 * When reducedMotion is true, all transitions and animations are disabled
 */
const getJoyrideStyles = (
  isDarkMode: boolean,
  reducedMotion: boolean
): Partial<Styles> => {
  const colors = isDarkMode ? DARK_THEME_COLORS : THEME_COLORS;

  // Disable all transitions when reduced motion is preferred
  const noTransition = 'none';
  const standardTransition = 'all 0.2s ease';

  return {
    options: {
      arrowColor: colors.background,
      backgroundColor: colors.background,
      overlayColor: colors.overlay,
      primaryColor: colors.primary,
      spotlightShadow: reducedMotion ? 'none' : '0 0 15px rgba(0, 0, 0, 0.5)',
      textColor: colors.text,
      width: 380,
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 12,
      padding: 20,
      // Disable tooltip animations when reduced motion is preferred
      transition: reducedMotion ? noTransition : standardTransition,
      animation: reducedMotion ? 'none' : undefined,
    },
    tooltipContainer: {
      textAlign: 'left' as const,
    },
    tooltipTitle: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 8,
    },
    tooltipContent: {
      fontSize: 14,
      lineHeight: 1.5,
      color: colors.textMuted,
    },
    buttonNext: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      padding: '10px 20px',
      transition: reducedMotion ? noTransition : 'background-color 0.2s ease',
    },
    buttonBack: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: 500,
      marginRight: 8,
      transition: reducedMotion ? noTransition : 'color 0.2s ease',
    },
    buttonSkip: {
      color: colors.textMuted,
      fontSize: 13,
      transition: reducedMotion ? noTransition : 'color 0.2s ease',
    },
    buttonClose: {
      display: 'none', // Hide close button, use skip instead
    },
    spotlight: {
      borderRadius: 8,
      // Disable spotlight animations when reduced motion is preferred
      transition: reducedMotion ? noTransition : 'opacity 0.3s ease, transform 0.3s ease',
      animation: reducedMotion ? 'none' : undefined,
    },
    overlay: {
      transition: reducedMotion ? noTransition : 'opacity 0.3s ease',
    },
    beacon: {
      display: 'none', // Beacons are disabled via disableBeacon in steps
      // Disable beacon animations when reduced motion is preferred
      animation: reducedMotion ? 'none' : undefined,
    },
    beaconInner: {
      backgroundColor: colors.beacon,
      animation: reducedMotion ? 'none' : undefined,
    },
    beaconOuter: {
      backgroundColor: colors.beacon,
      borderColor: colors.beacon,
      animation: reducedMotion ? 'none' : undefined,
    },
  };
};

/**
 * Custom locale strings for Joyride buttons
 */
const JOYRIDE_LOCALE = {
  back: 'Back',
  close: 'Close',
  last: 'Finish',
  next: 'Next',
  open: 'Open',
  skip: 'Skip Tutorial',
};

export interface TutorialTourProps {
  /** Callback when tutorial is completed */
  onComplete?: () => void;
  /** Callback when tutorial is skipped */
  onSkip?: () => void;
  /** Callback when step changes */
  onStepChange?: (stepIndex: number) => void;
}

/**
 * TutorialTour component - Wraps react-joyride with tutorialStore integration
 *
 * Features:
 * - Connects to tutorialStore for state management
 * - Auto-persists progress via useTutorialAutoPersist hook
 * - Supports dark mode theming
 * - Custom styling to match Radix UI design system
 * - Handles completion, skip, and step change events
 *
 * Element Availability Handling:
 * - Waits for target elements to appear in DOM before starting tutorial
 * - Polls for elements at ELEMENT_CHECK_INTERVAL (100ms)
 * - Times out after ELEMENT_CHECK_TIMEOUT (5s) and proceeds with available steps
 * - Filters out steps with missing target elements
 * - Automatically skips to next available step if current target disappears
 * - Gracefully completes/skips tutorial if no steps are available
 * - Maintains correct step indices when steps are filtered
 *
 * Accessibility - prefers-reduced-motion support:
 * - Reactively tracks user's motion preference via usePrefersReducedMotion hook
 * - Disables all CSS transitions and animations when reduced motion is preferred
 * - Disables floater (tooltip positioning) animations
 * - Removes spotlight shadow effects for cleaner appearance
 * - Ensures instant state changes without visual motion
 */
export const TutorialTour: React.FC<TutorialTourProps> = ({
  onComplete,
  onSkip,
  onStepChange,
}) => {
  const isTutorialActive = useIsTutorialActive();
  const currentStep = useCurrentTutorialStep();
  const { completeTutorial, skipTutorial, setTutorialStep } = useTutorialStore();

  // Auto-persist tutorial state changes
  useTutorialAutoPersist();

  // Track reduced motion preference reactively
  const reducedMotion = usePrefersReducedMotion();

  // Wait for tutorial step target elements to become available
  const { isReady, availableSteps, unavailableIndices } = useElementAvailability(isTutorialActive);

  // Track if current step's target is available (for dynamic element changes)
  const isCurrentStepAvailable = useCurrentStepAvailability(currentStep, isTutorialActive && isReady);

  // Memoize styles based on current theme and motion preferences
  const styles = useMemo(() => {
    const isDarkMode = getIsDarkMode();
    return getJoyrideStyles(isDarkMode, reducedMotion);
  }, [reducedMotion]);

  // Create a mapping from original step indices to filtered step indices
  // This is needed because when steps are filtered out, the stepIndex needs to be adjusted
  const stepIndexMapping = useMemo(() => {
    if (availableSteps.length === TUTORIAL_STEPS.length) {
      // All steps available - no mapping needed
      return null;
    }

    // Map original index to filtered index
    const mapping: Map<number, number> = new Map();
    let filteredIndex = 0;
    TUTORIAL_STEPS.forEach((_, originalIndex) => {
      if (!unavailableIndices.includes(originalIndex)) {
        mapping.set(originalIndex, filteredIndex);
        filteredIndex++;
      }
    });
    return mapping;
  }, [availableSteps.length, unavailableIndices]);

  // Adjust currentStep for filtered steps
  const adjustedStepIndex = useMemo(() => {
    if (!stepIndexMapping) {
      return currentStep;
    }

    // Try to get mapped index for current step
    const mappedIndex = stepIndexMapping.get(currentStep);
    if (mappedIndex !== undefined) {
      return mappedIndex;
    }

    // Current step was filtered out - find next available
    for (let i = currentStep + 1; i < TUTORIAL_STEPS.length; i++) {
      const nextMapped = stepIndexMapping.get(i);
      if (nextMapped !== undefined) {
        return nextMapped;
      }
    }

    // Fall back to first step or 0
    return 0;
  }, [currentStep, stepIndexMapping]);

  // Create reverse mapping from filtered index to original index
  const reverseStepMapping = useMemo(() => {
    if (!stepIndexMapping) {
      return null;
    }

    const reverseMapping: Map<number, number> = new Map();
    stepIndexMapping.forEach((filteredIndex, originalIndex) => {
      reverseMapping.set(filteredIndex, originalIndex);
    });
    return reverseMapping;
  }, [stepIndexMapping]);

  /**
   * Map filtered step index back to original step index
   */
  const mapFilteredToOriginalIndex = useCallback(
    (filteredIndex: number): number => {
      if (!reverseStepMapping) {
        return filteredIndex;
      }
      return reverseStepMapping.get(filteredIndex) ?? filteredIndex;
    },
    [reverseStepMapping]
  );

  // Effect to skip tutorial if no elements are available after timeout
  useEffect(() => {
    if (isTutorialActive && isReady && availableSteps.length === 0) {
      // No elements available - gracefully skip the tutorial
      skipTutorial();
      onSkip?.();
    }
  }, [isTutorialActive, isReady, availableSteps.length, skipTutorial, onSkip]);

  // Effect to skip to next available step if current step's target disappears
  useEffect(() => {
    if (!isTutorialActive || !isReady || isCurrentStepAvailable) {
      return;
    }

    // Current step target is unavailable - try to find next available step
    const nextAvailableIndex = TUTORIAL_STEPS.findIndex(
      (_, index) => index > currentStep && isTutorialStepTargetAvailable(index)
    );

    if (nextAvailableIndex !== -1) {
      // Skip to next available step
      setTutorialStep(nextAvailableIndex);
      onStepChange?.(nextAvailableIndex);
    } else {
      // No more available steps - complete or skip the tutorial
      const hasCompletedAnySteps = currentStep > 0;
      if (hasCompletedAnySteps) {
        completeTutorial();
        onComplete?.();
      } else {
        skipTutorial();
        onSkip?.();
      }
    }
  }, [
    isTutorialActive,
    isReady,
    isCurrentStepAvailable,
    currentStep,
    setTutorialStep,
    completeTutorial,
    skipTutorial,
    onStepChange,
    onComplete,
    onSkip,
  ]);

  /**
   * Handle Joyride callback events
   *
   * Note: When steps are filtered, the index received is relative to the filtered steps array.
   * We use mapFilteredToOriginalIndex to convert back to the original TUTORIAL_STEPS indices.
   */
  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      // Handle step changes
      // Note: index is relative to availableSteps, so we map back to original indices
      if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
        const nextFilteredIndex = index + 1;
        const nextOriginalStep = mapFilteredToOriginalIndex(nextFilteredIndex);
        setTutorialStep(nextOriginalStep);
        onStepChange?.(nextOriginalStep);
      }

      if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
        const prevFilteredIndex = index - 1;
        const prevOriginalStep = mapFilteredToOriginalIndex(prevFilteredIndex);
        setTutorialStep(prevOriginalStep);
        onStepChange?.(prevOriginalStep);
      }

      // Handle tour completion
      if (status === STATUS.FINISHED) {
        completeTutorial();
        onComplete?.();
      }

      // Handle tour skip
      if (status === STATUS.SKIPPED) {
        skipTutorial();
        onSkip?.();
      }
    },
    [completeTutorial, skipTutorial, setTutorialStep, onComplete, onSkip, onStepChange, mapFilteredToOriginalIndex]
  );

  // Don't render if tutorial is not active or elements aren't ready
  if (!isTutorialActive || !isReady) {
    return null;
  }

  // Don't render if no steps are available
  if (availableSteps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={availableSteps}
      run={isTutorialActive && isReady && availableSteps.length > 0}
      stepIndex={adjustedStepIndex}
      continuous
      showProgress
      showSkipButton
      hideCloseButton
      disableOverlayClose
      disableCloseOnEsc={false}
      scrollToFirstStep
      spotlightPadding={8}
      callback={handleJoyrideCallback}
      styles={styles}
      locale={JOYRIDE_LOCALE}
      // Control scroll behavior based on reduced motion preference
      // When reduced motion is preferred, use instant scroll behavior
      scrollOffset={100}
      floaterProps={{
        // Disable floater animations when reduced motion is preferred
        disableAnimation: reducedMotion,
        styles: {
          floater: {
            transition: reducedMotion ? 'none' : 'opacity 0.3s ease',
          },
          arrow: {
            // Disable arrow animations when reduced motion is preferred
            transition: reducedMotion ? 'none' : 'transform 0.2s ease',
          },
        },
      }}
    />
  );
};

export default TutorialTour;
