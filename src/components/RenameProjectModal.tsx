
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface RenameProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onRename: (newName: string) => void;
}

export const RenameProjectModal: React.FC<RenameProjectModalProps> = ({ isOpen, onClose, currentName, onRename }) => {
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
    }
  }, [isOpen, currentName]);

  const handleRename = () => {
    if (!newName.trim()) {
      toast.error("Project name cannot be empty.");
      return;
    }
    if (newName.trim() !== currentName) {
      onRename(newName.trim());
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <VisuallyHidden>
          <DialogTitle>Rename Project</DialogTitle>
        </VisuallyHidden>
        <div className="py-4">
          <Label htmlFor="projectName" className="sr-only">
            Project Name
          </Label>
          <Input
            id="projectName"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter new project name"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleRename}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
