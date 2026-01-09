/**
 * OnboardingTour - Two-phase desktop joyride tutorial
 *
 * Phase 1 (Getting Started): For new users without birth data
 *   - Welcome, search bar, globe, account menu
 *
 * Phase 2 (Explore Features): Auto-triggers after birth data is entered
 *   - Left toolbar, scout, AI chat, duo mode, filters
 *
 * Stores completion state per phase in localStorage.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useTheme } from 'next-themes';

const TOUR_STORAGE_KEY_PHASE1 = 'astrocarto_tour_phase1';
const TOUR_STORAGE_KEY_PHASE2 = 'astrocarto_tour_phase2';
const TOUR_VERSION = '2'; // Increment to show tour again after major updates

export type TourPhase = 'phase1' | 'phase2' | 'all';

interface OnboardingTourProps {
  /** Whether the user has birth data set */
  hasBirthData: boolean;
  /** Force show a specific phase (for tutorial button) */
  forceShow?: boolean;
  /** Which phase to force show */
  forcePhase?: TourPhase;
  /** Callback when tour is dismissed or completed */
  onComplete?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  hasBirthData,
  forceShow = false,
  forcePhase = 'all',
  onComplete,
}) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<TourPhase>('phase1');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const prevHasBirthData = useRef(hasBirthData);

  // Phase 1 steps - Getting Started (visible without birth data)
  // Note: isFixed: true is required for elements in fixed-position containers (header, sidebars)
  const phase1Steps: Step[] = [
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Welcome to Astrocartography</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Discover how planetary energies influence different locations around the world.
            Let's take a quick tour of the basics.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="search-bar"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Enter Your Birth Data</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Start by searching for your birthplace. Click here and type your birth city,
            then enter your birth date and time to generate your personal astrocartography map.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
      isFixed: true,
    },
    {
      target: '[data-tour="globe"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Interactive Globe</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This is your personal astrocartography map. Drag to rotate, scroll to zoom,
            and click on any location to explore its planetary influences.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="account-menu"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Your Account</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sign in to save multiple birth charts, sync your favorites across devices,
            and unlock premium features.
          </p>
        </div>
      ),
      placement: 'bottom-end',
      disableBeacon: true,
      isFixed: true,
    },
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Ready to Begin!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Enter your birthplace in the search bar to see your planetary lines.
            Once your chart is generated, we'll show you all the powerful features available!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  // Phase 2 steps - Explore Features (visible after birth data is entered)
  // Note: isFixed: true is required for elements inside fixed-position containers
  const phase2Steps: Step[] = [
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Your Chart is Ready!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Now that you have your astrocartography map, let's explore the powerful
            features available to help you find your best locations.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="left-toolbar"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Access key features from this toolbar: AI insights, compatibility analysis,
            zone drawing, export options, and more.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      isFixed: true,
    },
    {
      target: '[data-tour="scout-button"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Scout Best Locations</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Our AI-powered Scout analyzes thousands of cities to find the best locations
            for your goals - whether it's career, love, creativity, or personal growth.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      isFixed: true,
    },
    {
      target: '[data-tour="ai-chat"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ask questions about your chart, get personalized insights about locations,
            or learn more about how planetary lines affect different areas of life.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      isFixed: true,
    },
    {
      target: '[data-tour="duo-mode"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Duo Mode</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Compare your chart with a partner's to find locations where your energies
            harmonize. Great for couples, business partners, or friends planning to travel together.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      isFixed: true,
    },
    {
      target: '[data-tour="filters"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Customize Your View</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Toggle which planetary lines and aspects are visible. Focus on specific
            planets or line types to declutter your map.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      isFixed: true,
    },
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">You're All Set!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Click on any planetary line to learn its meaning, or use Scout to discover
            your optimal locations. Enjoy exploring your cosmic map!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  // Get steps based on current phase
  const getStepsForPhase = (phase: TourPhase): Step[] => {
    if (phase === 'phase1') return phase1Steps;
    if (phase === 'phase2') return phase2Steps;
    // 'all' - combine both, skipping duplicate welcome/ending
    return [...phase1Steps.slice(0, -1), ...phase2Steps];
  };

  // Check completion status
  const hasCompletedPhase1 = () => localStorage.getItem(TOUR_STORAGE_KEY_PHASE1) === TOUR_VERSION;
  const hasCompletedPhase2 = () => localStorage.getItem(TOUR_STORAGE_KEY_PHASE2) === TOUR_VERSION;

  // Start tour logic
  useEffect(() => {
    // Force show from button
    if (forceShow) {
      const phase = forcePhase === 'all'
        ? (hasBirthData ? 'phase2' : 'phase1')
        : forcePhase;
      setCurrentPhase(phase);
      setStepIndex(0);
      setRun(true);
      return;
    }

    // Auto-show phase 1 for new users
    if (!hasCompletedPhase1() && !hasBirthData) {
      const timer = setTimeout(() => {
        setCurrentPhase('phase1');
        setStepIndex(0);
        setRun(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [forceShow, forcePhase, hasBirthData]);

  // Auto-trigger phase 2 when birth data is first added
  useEffect(() => {
    if (!prevHasBirthData.current && hasBirthData && !hasCompletedPhase2()) {
      // Birth data was just added, trigger phase 2
      const timer = setTimeout(() => {
        setCurrentPhase('phase2');
        setStepIndex(0);
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    prevHasBirthData.current = hasBirthData;
  }, [hasBirthData]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle step changes
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    // Handle tour completion or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      // Mark the appropriate phase as completed
      if (currentPhase === 'phase1' || currentPhase === 'all') {
        localStorage.setItem(TOUR_STORAGE_KEY_PHASE1, TOUR_VERSION);
      }
      if (currentPhase === 'phase2' || currentPhase === 'all') {
        localStorage.setItem(TOUR_STORAGE_KEY_PHASE2, TOUR_VERSION);
      }
      onComplete?.();
    }
  }, [currentPhase, onComplete]);

  const activeSteps = getStepsForPhase(currentPhase);

  // Custom styles matching app theme
  const joyrideStyles = {
    options: {
      arrowColor: isDark ? '#1e1e2e' : '#ffffff',
      backgroundColor: isDark ? '#1e1e2e' : '#ffffff',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      primaryColor: '#f59e0b', // amber-500
      textColor: isDark ? '#e2e8f0' : '#334155',
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 12,
      padding: 20,
      boxShadow: isDark
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    tooltipContainer: {
      textAlign: 'left' as const,
    },
    tooltipTitle: {
      fontSize: 18,
      fontWeight: 600,
    },
    tooltipContent: {
      fontSize: 14,
      lineHeight: 1.6,
    },
    buttonNext: {
      backgroundColor: '#f59e0b',
      color: '#000000',
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 14,
      fontWeight: 600,
    },
    buttonBack: {
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: 14,
      marginRight: 8,
    },
    buttonSkip: {
      color: isDark ? '#64748b' : '#94a3b8',
      fontSize: 14,
    },
    buttonClose: {
      display: 'none',
    },
    spotlight: {
      borderRadius: 8,
    },
  };

  return (
    <Joyride
      steps={activeSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      hideCloseButton
      scrollToFirstStep
      disableScrolling
      spotlightPadding={4}
      callback={handleJoyrideCallback}
      styles={joyrideStyles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
      }}
    />
  );
};

/**
 * Hook to control the onboarding tour programmatically
 */
export const useOnboardingTour = () => {
  const resetTour = useCallback((phase?: TourPhase) => {
    if (!phase || phase === 'all') {
      localStorage.removeItem(TOUR_STORAGE_KEY_PHASE1);
      localStorage.removeItem(TOUR_STORAGE_KEY_PHASE2);
    } else if (phase === 'phase1') {
      localStorage.removeItem(TOUR_STORAGE_KEY_PHASE1);
    } else if (phase === 'phase2') {
      localStorage.removeItem(TOUR_STORAGE_KEY_PHASE2);
    }
  }, []);

  const hasCompletedPhase1 = useCallback(() => {
    return localStorage.getItem(TOUR_STORAGE_KEY_PHASE1) === TOUR_VERSION;
  }, []);

  const hasCompletedPhase2 = useCallback(() => {
    return localStorage.getItem(TOUR_STORAGE_KEY_PHASE2) === TOUR_VERSION;
  }, []);

  const hasCompletedAllPhases = useCallback(() => {
    return hasCompletedPhase1() && hasCompletedPhase2();
  }, [hasCompletedPhase1, hasCompletedPhase2]);

  return { resetTour, hasCompletedPhase1, hasCompletedPhase2, hasCompletedAllPhases };
};

export default OnboardingTour;
