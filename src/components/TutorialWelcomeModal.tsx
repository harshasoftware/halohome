/**
 * TutorialWelcomeModal - Welcome modal for new users offering to start the tutorial
 *
 * Displays on first visit for users who haven't completed or skipped the tutorial.
 * Offers options to "Start Tutorial" or "Skip" with Framer Motion animations.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Globe, MessageSquare, MapPin } from 'lucide-react';
import { useTutorialStore, useShowWelcomeModal, useTutorialLoading } from '@/stores/tutorialStore';
import { analytics, AnalyticsEvent } from '@/lib/utils/eventConstants';

interface TutorialWelcomeModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const features = [
  {
    icon: <MapPin className="w-5 h-5 text-rose-500" />,
    title: 'Enter Your Birth Data',
    description: 'Start by entering your birth date, time, and location to generate your personalized map.',
  },
  {
    icon: <Globe className="w-5 h-5 text-blue-500" />,
    title: 'Explore the 3D Globe',
    description: 'Navigate the interactive globe to discover planetary influences at different locations.',
  },
  {
    icon: <Sparkles className="w-5 h-5 text-purple-500" />,
    title: 'Understand Planetary Lines',
    description: 'Learn what the colored lines mean and how they affect different areas of your life.',
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-green-500" />,
    title: 'Chat with AI Assistant',
    description: 'Ask questions about your astrocartography map and get personalized interpretations.',
  },
];

// Animation variants for modal content
const contentVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

// Animation variants for feature items (staggered)
const featureVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.2,
      ease: 'easeOut',
    },
  }),
};

export const TutorialWelcomeModal: React.FC<TutorialWelcomeModalProps> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  const showWelcomeModal = useShowWelcomeModal();
  const isLoading = useTutorialLoading();
  const { startTutorial, skipTutorial, setShowWelcomeModal } = useTutorialStore();

  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : showWelcomeModal;
  const handleOpenChange = controlledOnOpenChange ?? setShowWelcomeModal;

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleStartTutorial = () => {
    analytics.capture(AnalyticsEvent.TUTORIAL_STARTED, {
      source: 'welcome_modal',
      timestamp: new Date().toISOString(),
    });
    startTutorial();
    handleOpenChange(false);
  };

  const handleSkipTutorial = () => {
    analytics.capture(AnalyticsEvent.TUTORIAL_SKIPPED, {
      source: 'welcome_modal',
      skipped_at_step: 0,
      steps_viewed: 0,
      timestamp: new Date().toISOString(),
    });
    skipTutorial();
    handleOpenChange(false);
  };

  // Don't render while loading initial state
  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg z-[100]" showCloseButton={false}>
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              variants={prefersReducedMotion ? undefined : contentVariants}
              initial={prefersReducedMotion ? false : 'hidden'}
              animate="visible"
              exit="exit"
            >
              <DialogHeader className="text-center pb-4">
                <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  Welcome to Astrocarto!
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Would you like a quick tour to learn how to use the app?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  In just a few steps, you'll learn how to:
                </p>
                <div className="grid gap-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      custom={index}
                      variants={prefersReducedMotion ? undefined : featureVariants}
                      initial={prefersReducedMotion ? false : 'hidden'}
                      animate="visible"
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-shrink-0 mt-0.5">{feature.icon}</div>
                      <div>
                        <h4 className="font-medium text-sm">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  onClick={handleStartTutorial}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Tutorial
                </Button>
                <Button
                  onClick={handleSkipTutorial}
                  variant="ghost"
                  className="w-full"
                  size="sm"
                >
                  Skip for now
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default TutorialWelcomeModal;
