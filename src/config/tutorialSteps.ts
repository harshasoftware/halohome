/**
 * Tutorial Steps Configuration
 *
 * Defines the sequential steps for the interactive onboarding tutorial.
 * Uses react-joyride Step format with data-tour attribute selectors
 * for stable DOM targeting.
 */

import type { Step } from 'react-joyride';

/**
 * Tutorial step targets using data-tour attributes
 * These selectors match attributes added to UI components
 */
export const TUTORIAL_TARGETS = {
  birthDataForm: '[data-tour="birth-data-form"]',
  globeContainer: '[data-tour="globe-container"]',
  planetaryLines: '[data-tour="planetary-lines"]',
  aiChatToggle: '[data-tour="ai-chat-toggle"]',
} as const;

/**
 * Tutorial steps configuration for react-joyride
 *
 * Steps guide users through:
 * 1. Entering birth data
 * 2. Navigating the 3D globe
 * 3. Understanding planetary lines
 * 4. Using the AI chat assistant
 */
export const TUTORIAL_STEPS: Step[] = [
  {
    target: TUTORIAL_TARGETS.birthDataForm,
    title: 'Step 1: Enter Your Birth Data',
    content:
      'Start by entering your birth date, time, and location. This data is used to calculate your personalized astrocartography map showing planetary lines around the world.',
    placement: 'bottom',
    disableBeacon: true,
    spotlightClicks: true,
  },
  {
    target: TUTORIAL_TARGETS.globeContainer,
    title: 'Step 2: Navigate the Globe',
    content:
      'Explore the 3D globe by clicking and dragging to rotate, and scrolling to zoom. Your planetary lines are displayed across the world based on your birth data.',
    placement: 'right',
    disableBeacon: true,
    spotlightClicks: true,
  },
  {
    target: TUTORIAL_TARGETS.planetaryLines,
    title: 'Step 3: Understanding Planetary Lines',
    content:
      'These colored lines represent different planetary energies at various locations. Each planet has unique influences - tap or hover on lines to learn more about their meanings.',
    placement: 'top',
    disableBeacon: true,
    spotlightClicks: true,
  },
  {
    target: TUTORIAL_TARGETS.aiChatToggle,
    title: 'Step 4: AI Chat Assistant',
    content:
      'Use the AI chat to ask questions about your astrocartography map, get personalized interpretations, or explore what specific locations might mean for you.',
    placement: 'left',
    disableBeacon: true,
    spotlightClicks: true,
  },
];

/**
 * Total number of tutorial steps
 * Used for progress tracking and UI display
 */
export const TOTAL_TUTORIAL_STEPS = TUTORIAL_STEPS.length;

/**
 * Get a specific tutorial step by index
 * @param index - Zero-based step index
 * @returns The tutorial step or undefined if out of bounds
 */
export const getTutorialStep = (index: number): Step | undefined => {
  return TUTORIAL_STEPS[index];
};

/**
 * Check if a tutorial step target element exists in the DOM
 * @param stepIndex - Zero-based step index
 * @returns true if the target element exists
 */
export const isTutorialStepTargetAvailable = (stepIndex: number): boolean => {
  const step = TUTORIAL_STEPS[stepIndex];
  if (!step || typeof step.target !== 'string') return false;
  return document.querySelector(step.target) !== null;
};

/**
 * Get indices of tutorial steps with missing DOM targets
 * Useful for checking element availability before starting tutorial
 * @returns Array of step indices with missing targets
 */
export const getMissingTutorialTargets = (): number[] => {
  return TUTORIAL_STEPS.reduce<number[]>((missing, step, index) => {
    if (typeof step.target === 'string' && !document.querySelector(step.target)) {
      missing.push(index);
    }
    return missing;
  }, []);
};
