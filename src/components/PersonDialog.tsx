import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PersonData } from '@/types/familyTree';
import { toast } from 'sonner';
import { Node } from '@stubs/xyflow';
import { Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersonForm } from './PersonDialogParts/usePersonForm';
import { PersonAvatar } from './PersonDialogParts/PersonAvatar';
import { ProfileTab } from './PersonDialogParts/ProfileTab';
import { LocationsTab } from './PersonDialogParts/LocationsTab';
import { FamilyTab } from './PersonDialogParts/FamilyTab';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: PersonData | null;
  onSave: (personData: Partial<PersonData>) => void;
  onDelete?: (personId: string) => void;
  allNodes: Node<PersonData>[];
  encryptionKey: CryptoKey | null;
  projectId: string | null;
  isPermanent: boolean;
}

export const PersonDialog: React.FC<PersonDialogProps> = ({
  open,
  onOpenChange,
  person,
  onSave,
  onDelete,
  allNodes,
  encryptionKey,
  projectId,
  isPermanent,
}) => {
  const {
    formData,
    setFormData,
    isUploading,
    handleAvatarUpload,
    newLocation,
    setNewLocation,
    editingLocationIndex,
    handleAddOrUpdateLocation,
    handleEditLocation,
    handleRemoveLocation,
    cancelEditLocation,
    newSpouseId,
    setNewSpouseId,
    newMarriageDate,
    setNewMarriageDate,
    handleAddMarriage,
    handleRemoveMarriage,
    potentialSpouses,
  } = usePersonForm(person, allNodes, projectId, isPermanent, encryptionKey);

  const isMobile = useIsMobile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.birthDate && formData.deathDate && new Date(formData.deathDate) < new Date(formData.birthDate)) {
      toast.error('Death date cannot be earlier than birth date.');
      return;
    }
    
    // If avatar is a blob, it means we decrypted it for display or it's a new upload preview.
    // The actual path to the stored file is on the original `person` object or will be set by handleAvatarUpload.
    // We must save the path, not the temporary blob URL.
    if (formData.avatar && formData.avatar.startsWith('blob:')) {
        // If the form data has a blob, but the original person object has an avatar path,
        // it means we've just displayed a decrypted avatar. We should save the original path back.
        // If it's a new person, the path will be updated on upload.
        const dataToSave = { ...formData, avatar: person?.avatar || formData.avatar };
        onSave(dataToSave);
    } else {
        onSave(formData);
    }
  };

  const handleDelete = () => {
    if (person && onDelete) {
      onDelete(person.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isMobile
            ? 'flex-1 flex flex-col h-full'
            : 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full flex flex-col h-[calc(100vh-6rem)]'
        }
        style={isMobile ? { padding: 0 } : {}}
        mobileFullScreen={isMobile}
        showCloseButton={false}
      >
        {/* Top bar: delete button (if present), title, close button */}
        <div className="flex items-center justify-between px-4 pt-2 pb-2 relative">
          {/* Delete button (left) or empty space */}
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {person && onDelete ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 z-20"
                    aria-label="Delete Person"
                    style={{ width: 40, height: 40, margin: 0, padding: 0 }}
                    tabIndex={-1}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete Person</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {/* Title (center) */}
          <DialogTitle className="flex-1 text-center select-none">
            {person ? 'Edit Person' : 'Add New Person'}
          </DialogTitle>
          {/* Close button (right) always present */}
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DialogPrimitive.Close asChild>
              <button
                className="dialog-close-btn-outline border border-slate-300 dark:border-slate-700 bg-transparent rounded-full p-2 flex items-center justify-center shadow-none hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                aria-label="Close"
                style={{ width: 40, height: 40, margin: 0, padding: 0 }}
                type="button"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l8 8M6 14L14 6" /></svg>
              </button>
            </DialogPrimitive.Close>
          </div>
        </div>
        {/* Remove old DialogHeader and useEffect for close button styling */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={handleSubmit} className={isMobile ? 'flex flex-col flex-1 min-h-0' : ''} id="person-form">
            <div className={isMobile ? 'px-4 pt-2 pb-0' : ''}>
              <PersonAvatar
                formData={formData}
                isUploading={isUploading}
                onAvatarUpload={handleAvatarUpload}
              />
            </div>
            <Tabs defaultValue="profile" className="w-full flex-1 flex flex-col min-h-0">
              <TabsList
                className={
                  isMobile
                    ? 'grid grid-cols-3 sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'
                    : 'grid w-full grid-cols-3'
                }
                style={isMobile ? { minHeight: 48 } : {}}
              >
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
                <TabsTrigger value="family" disabled={!person}>Family</TabsTrigger>
              </TabsList>
              <TabsContent
                value="profile"
                className={
                  isMobile
                    ? 'py-4 px-4 flex-1 overflow-y-auto max-h-none min-h-0'
                    : 'py-4 max-h-[60vh] overflow-y-auto pr-2'
                }
              >
                <ProfileTab formData={formData} setFormData={setFormData} />
              </TabsContent>
              <TabsContent
                value="locations"
                className={
                  isMobile
                    ? 'py-4 px-4 flex-1 overflow-y-auto max-h-none min-h-0'
                    : 'py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2'
                }
              >
                <LocationsTab
                  formData={formData}
                  newLocation={newLocation}
                  setNewLocation={setNewLocation}
                  editingLocationIndex={editingLocationIndex}
                  onAddOrUpdate={handleAddOrUpdateLocation}
                  onEdit={(location, index) => handleEditLocation(index)}
                  onRemove={handleRemoveLocation}
                  onCancelEdit={cancelEditLocation}
                />
              </TabsContent>
              <TabsContent
                value="family"
                className={
                  isMobile
                    ? 'py-4 px-4 flex-1 overflow-y-auto max-h-none min-h-0'
                    : 'py-4 max-h-[60vh] overflow-y-auto pr-2'
                }
              >
                {person && (
                  <FamilyTab
                    formData={formData}
                    allNodes={allNodes}
                    potentialSpouses={potentialSpouses}
                    newSpouseId={newSpouseId}
                    setNewSpouseId={setNewSpouseId}
                    newMarriageDate={newMarriageDate}
                    setNewMarriageDate={setNewMarriageDate}
                    onAddMarriage={handleAddMarriage}
                    onRemoveMarriage={handleRemoveMarriage}
                  />
                )}
              </TabsContent>
            </Tabs>
          </form>
        </div>
        <div className="w-full z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-row gap-2 px-4 py-3 mt-auto">
          <div className="flex gap-2 w-full">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" form="person-form" className="flex-1 ml-auto">
              {person ? 'Update' : 'Add'} Person
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
