/**
 * OnboardingTour - Desktop joyride tutorial for new users
 *
 * Guides users through the key features of the astrocartography app.
 * Stores completion state in localStorage to avoid showing again.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useTheme } from 'next-themes';

const TOUR_STORAGE_KEY = 'astrocarto_onboarding_completed';
const TOUR_VERSION = '1'; // Increment to show tour again after major updates

interface OnboardingTourProps {
  /** Whether the user has birth data set (affects which steps to show) */
  hasBirthData: boolean;
  /** Force show the tour (for settings/help menu) */
  forceShow?: boolean;
  /** Callback when tour is dismissed or completed */
  onComplete?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  hasBirthData,
  forceShow = false,
  onComplete,
}) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Check if tour should run
  useEffect(() => {
    if (forceShow) {
      setRun(true);
      setStepIndex(0);
      return;
    }

    const stored = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!stored || stored !== TOUR_VERSION) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        setRun(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle step changes
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    // Handle tour completion or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem(TOUR_STORAGE_KEY, TOUR_VERSION);
      onComplete?.();
    }
  }, [onComplete]);

  // Define tour steps - these target elements by data-tour attribute
  const steps: Step[] = [
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Welcome to Astrocartography</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Discover how planetary energies influence different locations around the world.
            Let's take a quick tour of the key features.
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
    },
    {
      target: '[data-tour="globe"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Interactive Globe</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This is your personal astrocartography map. Drag to rotate, scroll to zoom,
            and click on any line or city to explore its planetary influences.
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
            Access key features from here: AI insights, Duo mode for relationship compatibility,
            zone analysis, export options, and more.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
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
    },
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">You're All Set!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Start by entering your birthplace in the search bar. Click on any line
            on the globe to learn about its meaning. Enjoy exploring your cosmic map!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  // Filter steps based on whether birth data exists
  const activeSteps = hasBirthData
    ? steps.filter((_, i) => i !== 1) // Skip search bar step if they already have data
    : steps;

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
      disableScrollParentFix
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
      }}
    />
  );
};

/**
 * Hook to control the onboarding tour programmatically
 */
export const useOnboardingTour = () => {
  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }, []);

  const hasCompletedTour = useCallback(() => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === TOUR_VERSION;
  }, []);

  return { resetTour, hasCompletedTour };
};

export default OnboardingTour;
