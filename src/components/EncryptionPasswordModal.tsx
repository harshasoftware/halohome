
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface EncryptionPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  projectName: string;
}

export const EncryptionPasswordModal: React.FC<EncryptionPasswordModalProps> = ({
  open,
  onClose,
  onSubmit,
  projectName,
}) => {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(password);
      // Success, parent component will close the modal
    } catch (err) {
      setError('Incorrect password or corrupt data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <VisuallyHidden>
          <DialogTitle>Encryption Password</DialogTitle>
        </VisuallyHidden>
        <DialogHeader>
          <DialogTitle>Project Locked</DialogTitle>
          <DialogDescription>
            The project "{projectName}" is encrypted. Please enter the password to unlock it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Input
              id="password"
              type="password"
              placeholder="Encryption Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!password || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

