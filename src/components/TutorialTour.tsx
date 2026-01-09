/**
 * TutorialTour - React Joyride integration for the interactive onboarding tutorial
 *
 * This component wraps react-joyride and connects it to the tutorialStore
 * for state management. It handles tutorial flow, step navigation, and
 * completion/skip callbacks with automatic persistence.
 */

import React, { useCallback, useMemo } from 'react';
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
 * Check if user prefers reduced motion
 */
const getPrefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
 */
const getJoyrideStyles = (
  isDarkMode: boolean,
  reducedMotion: boolean
): Partial<Styles> => {
  const colors = isDarkMode ? DARK_THEME_COLORS : THEME_COLORS;

  return {
    options: {
      arrowColor: colors.background,
      backgroundColor: colors.background,
      overlayColor: colors.overlay,
      primaryColor: colors.primary,
      spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
      textColor: colors.text,
      width: 380,
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 12,
      padding: 20,
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
      transition: reducedMotion ? 'none' : 'background-color 0.2s ease',
    },
    buttonBack: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: 500,
      marginRight: 8,
    },
    buttonSkip: {
      color: colors.textMuted,
      fontSize: 13,
    },
    buttonClose: {
      display: 'none', // Hide close button, use skip instead
    },
    spotlight: {
      borderRadius: 8,
    },
    overlay: {
      transition: reducedMotion ? 'none' : 'opacity 0.3s ease',
    },
    beacon: {
      display: 'none', // Beacons are disabled via disableBeacon in steps
    },
    beaconInner: {
      backgroundColor: colors.beacon,
    },
    beaconOuter: {
      backgroundColor: colors.beacon,
      borderColor: colors.beacon,
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
 * - Supports dark mode and prefers-reduced-motion
 * - Custom styling to match Radix UI design system
 * - Handles completion, skip, and step change events
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

  // Memoize styles based on current theme and motion preferences
  const styles = useMemo(() => {
    const isDarkMode = getIsDarkMode();
    const reducedMotion = getPrefersReducedMotion();
    return getJoyrideStyles(isDarkMode, reducedMotion);
  }, []);

  // Get reduced motion preference for Joyride props
  const reducedMotion = useMemo(() => getPrefersReducedMotion(), []);

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
      floaterProps={{
        disableAnimation: reducedMotion,
        styles: {
          floater: {
            transition: reducedMotion ? 'none' : 'opacity 0.3s ease',
          },
        },
      }}
    />
  );
};

export default TutorialTour;
