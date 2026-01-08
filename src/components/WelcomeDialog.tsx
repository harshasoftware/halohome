
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, GitBranch, Map, Cloud, Lock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  {
    icon: <Users className="w-5 h-5 text-blue-500" />,
    title: 'Build Your Family Tree',
    description: 'Easily add people and connect them to build a visual representation of your family history.',
  },
  {
    icon: <GitBranch className="w-5 h-5 text-purple-500" />,
    title: 'Define Relationships',
    description: 'Create marriages, partnerships, and parent-child relationships with specific dates and details.',
  },
  {
    icon: <Map className="w-5 h-5 text-green-500" />,
    title: 'Multiple Views',
    description: 'Explore your family history in a traditional tree view, a chronological timeline, or on a world map.',
  },
  {
    icon: <Cloud className="w-5 h-5 text-sky-500" />,
    title: 'Cloud Sync',
    description: 'Sign in to save your family tree securely in the cloud and access it from any device.',
  },
  {
    icon: <Lock className="w-5 h-5 text-yellow-500" />,
    title: 'Anonymous Mode',
    description: 'Work on a temporary project without an account. Your work is saved for the session.',
  },
];

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ open, onOpenChange }) => {
  const handleClose = () => {
    localStorage.setItem('hasSeenWelcomeDialog', 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[100]">
        <VisuallyHidden>
          <DialogTitle>Welcome to The Modern Family!</DialogTitle>
        </VisuallyHidden>
        <DialogHeader>
          <DialogDescription className="text-center">
            Here are some of the key features to get you started.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 pr-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full sm:w-auto">Let's Get Started</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
