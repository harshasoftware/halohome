/**
 * TutorialTour - React Joyride integration for the interactive onboarding tutorial
 *
 * This component wraps react-joyride and connects it to the tutorialStore
 * for state management. It handles tutorial flow, step navigation, and
 * completion/skip callbacks with automatic persistence.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import Joyride, {
  CallBackProps,
  STATUS,
  EVENTS,
  ACTIONS,
  type Styles,
} from 'react-joyride';
import { TUTORIAL_STEPS } from '@/config/tutorialSteps';
import {
  useTutorialStore,
  useIsTutorialActive,
  useCurrentTutorialStep,
} from '@/stores/tutorialStore';
import { useTutorialAutoPersist } from '@/hooks/useTutorialPersistence';

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

  // Memoize styles based on current theme and motion preferences
  const styles = useMemo(() => {
    const isDarkMode = getIsDarkMode();
    return getJoyrideStyles(isDarkMode, reducedMotion);
  }, [reducedMotion]);

  /**
   * Handle Joyride callback events
   */
  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      // Handle step changes
      if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
        const nextStep = index + 1;
        setTutorialStep(nextStep);
        onStepChange?.(nextStep);
      }

      if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
        const prevStep = index - 1;
        setTutorialStep(prevStep);
        onStepChange?.(prevStep);
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
    [completeTutorial, skipTutorial, setTutorialStep, onComplete, onSkip, onStepChange]
  );

  // Don't render if tutorial is not active
  if (!isTutorialActive) {
    return null;
  }

  return (
    <Joyride
      steps={TUTORIAL_STEPS}
      run={isTutorialActive}
      stepIndex={currentStep}
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
