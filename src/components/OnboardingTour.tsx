/**
 * OnboardingTour - Two-phase desktop joyride tutorial
 *
 * Phase 1 (Getting Started): For new users
 *   - Welcome, property search, map, account menu
 *
 * Phase 2 (Explore Features): Auto-triggers after property search
 *   - Left toolbar, scout, AI chat, filters, Vastu analysis
 *
 * Stores completion state per phase in localStorage.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useTheme } from 'next-themes';

const TOUR_STORAGE_KEY_PHASE1 = 'halohome_tour_phase1';
const TOUR_STORAGE_KEY_PHASE2 = 'halohome_tour_phase2';
const TOUR_VERSION = '3'; // Increment to show tour again after major updates

export type TourPhase = 'phase1' | 'phase2' | 'all';

interface OnboardingTourProps {
  /** Whether the user has searched for a property */
  hasPropertySearch?: boolean;
  /** Force show a specific phase (for tutorial button) */
  forceShow?: boolean;
  /** Which phase to force show */
  forcePhase?: TourPhase;
  /** Callback when tour is dismissed or completed */
  onComplete?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  hasPropertySearch = false,
  forceShow = false,
  forcePhase = 'all',
  onComplete,
}) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<TourPhase>('phase1');
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const prevHasPropertySearch = useRef(hasPropertySearch);

  // Phase 1 steps - Getting Started (visible for new users)
  // Note: isFixed: true is required for elements in fixed-position containers (header, sidebars)
  const phase1Steps: Step[] = [
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Welcome to Halo Home</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Discover property harmony using ancient Vastu Shastra principles.
            Analyze any property or ZIP code to find your perfect home.
            Let's take a quick tour of the basics.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="property-search"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Search Properties</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Enter a property address or ZIP code to begin analysis. Search for a specific
            address to analyze a single property, or enter a ZIP code to scout all properties
            in that area.
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
          <h3 className="text-lg font-semibold">Interactive Map</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This is your property analysis map. Drag to pan, scroll to zoom,
            and click on any property to view its Vastu harmony score and detailed analysis.
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
            Sign in to save your property analyses, sync your favorites across devices,
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
            Search for a property address or ZIP code to see Vastu analysis.
            Once you've searched, we'll show you all the powerful features available!
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];

  // Phase 2 steps - Explore Features (visible after property search)
  // Note: isFixed: true is required for elements inside fixed-position containers
  const phase2Steps: Step[] = [
    {
      target: '[data-tour="welcome"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Analysis Complete!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Now that you have your property analysis, let's explore the powerful
            features available to help you find your perfect home.
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
            Access key features from this toolbar: Vastu analysis, AI insights,
            export options, drawing tools, and more.
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
          <h3 className="text-lg font-semibold">Scout Properties</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            When searching by ZIP code, use Scout to analyze all properties in the area.
            Our AI analyzes each property's Vastu harmony score, orientation, and zone alignment
            to help you find the best homes.
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
            Ask questions about Vastu principles, get personalized insights about properties,
            or learn more about how different zones and orientations affect harmony scores.
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
          <h3 className="text-lg font-semibold">Filter Properties</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Filter properties by harmony score, zone alignment, or other Vastu criteria.
            Focus on properties that meet your specific requirements.
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
            Click on any property to view its detailed Vastu analysis, or use Scout to discover
            the best properties in any ZIP code. Enjoy finding your perfect home!
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
        ? (hasPropertySearch ? 'phase2' : 'phase1')
        : forcePhase;
      setCurrentPhase(phase);
      setStepIndex(0);
      setRun(true);
      return;
    }

    // Auto-show phase 1 for new users
    if (!hasCompletedPhase1() && !hasPropertySearch) {
      const timer = setTimeout(() => {
        setCurrentPhase('phase1');
        setStepIndex(0);
        setRun(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [forceShow, forcePhase, hasPropertySearch]);

  // Auto-trigger phase 2 when property search is first performed
  useEffect(() => {
    if (!prevHasPropertySearch.current && hasPropertySearch && !hasCompletedPhase2()) {
      // Property search was just performed, trigger phase 2
      const timer = setTimeout(() => {
        setCurrentPhase('phase2');
        setStepIndex(0);
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    prevHasPropertySearch.current = hasPropertySearch;
  }, [hasPropertySearch]);

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

  // Custom styles matching app theme - orange accent (matching landing page)
  const joyrideStyles = {
    options: {
      arrowColor: isDark ? '#1e1e2e' : '#ffffff',
      backgroundColor: isDark ? '#1e1e2e' : '#ffffff',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      primaryColor: '#D97706', // Orange accent matching landing page
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
      backgroundColor: '#D97706', // Orange accent
      color: '#ffffff',
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
