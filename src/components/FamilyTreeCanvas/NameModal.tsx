import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

/**
 * NameModal renders a dialog for entering the user's display name.
 */
interface NameModalProps {
  open: boolean;
  name: string;
  setName: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const NameModal: React.FC<NameModalProps> = ({ open, name, setName, onSubmit }) => (
  <Dialog open={open}>
    <DialogContent>
      <VisuallyHidden>
        <DialogTitle>Enter your display name</DialogTitle>
      </VisuallyHidden>
      <DialogHeader>
        <DialogTitle>Enter your display name</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          maxLength={32}
        />
        <Button type="submit" disabled={!name.trim()}>
          Join
        </Button>
      </form>
    </DialogContent>
  </Dialog>
); 