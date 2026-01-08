/**
 * useModalManager Hook - Zustand-backed modal management
 *
 * This provides backwards compatibility with the existing API
 * while using Zustand's uiStore for state management.
 *
 * Components can either:
 * 1. Use useModalManager() hook (backwards compatible)
 * 2. Use uiStore selectors directly (recommended for new code)
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import type { PersonData } from '@/types/familyTree';
import type { Connection, Edge, Node } from '@stubs/xyflow';

export const useModalManager = () => {
  // Get state from Zustand store
  const isPersonDialogOpen = useUIStore((state) => state.isPersonDialogOpen);
  const editingPerson = useUIStore((state) => state.editingPerson);
  const isRelationshipModalOpen = useUIStore((state) => state.isRelationshipModalOpen);
  const pendingConnection = useUIStore((state) => state.pendingConnection);
  const currentSourceNodeForModal = useUIStore((state) => state.currentSourceNode);
  const currentTargetNodeForModal = useUIStore((state) => state.currentTargetNode);
  const isProjectModalOpen = useUIStore((state) => state.isProjectModalOpen);
  const isClearDataModalOpen = useUIStore((state) => state.isClearDataModalOpen);
  const isAuthModalOpen = useUIStore((state) => state.isAuthModalOpen);
  const isRenameModalOpen = useUIStore((state) => state.isRenameModalOpen);
  const isWelcomeDialogOpen = useUIStore((state) => state.isWelcomeDialogOpen);
  const isPasswordModalOpen = useUIStore((state) => state.isPasswordModalOpen);
  const passwordModalProject = useUIStore((state) => state.passwordModalProject);

  // Get actions from Zustand store
  const storeOpenPersonDialog = useUIStore((state) => state.openPersonDialog);
  const storeClosePersonDialog = useUIStore((state) => state.closePersonDialog);
  const setIsPersonDialogOpen = useUIStore((state) => state.setIsPersonDialogOpen);
  const storeOpenRelationshipModal = useUIStore((state) => state.openRelationshipModal);
  const storeCloseRelationshipModal = useUIStore((state) => state.closeRelationshipModal);
  const setIsProjectModalOpen = useUIStore((state) => state.setIsProjectModalOpen);
  const setIsClearDataModalOpen = useUIStore((state) => state.setIsClearDataModalOpen);
  const setIsAuthModalOpen = useUIStore((state) => state.setIsAuthModalOpen);
  const setIsRenameModalOpen = useUIStore((state) => state.setIsRenameModalOpen);
  const setIsWelcomeDialogOpen = useUIStore((state) => state.setIsWelcomeDialogOpen);
  const storeOpenPasswordModal = useUIStore((state) => state.openPasswordModal);
  const storeClosePasswordModal = useUIStore((state) => state.closePasswordModal);
  const storeSubmitPasswordModal = useUIStore((state) => state.submitPasswordModal);

  // Wrap store actions for backwards compatibility
  const openPersonDialog = useCallback((person: PersonData | null) => {
    storeOpenPersonDialog(person);
  }, [storeOpenPersonDialog]);

  const closePersonDialog = useCallback(() => {
    storeClosePersonDialog();
  }, [storeClosePersonDialog]);

  const openRelationshipModal = useCallback((params: Connection | Edge, sourceNode: Node, targetNode: Node) => {
    storeOpenRelationshipModal(params, sourceNode, targetNode);
  }, [storeOpenRelationshipModal]);

  const closeRelationshipModal = useCallback(() => {
    storeCloseRelationshipModal();
  }, [storeCloseRelationshipModal]);

  const openPasswordModal = useCallback((
    project: { id: string; name: string; is_encrypted: boolean; encryption_salt?: string | null },
    resolve: (key: CryptoKey) => void,
    reject: (reason?: unknown) => void
  ) => {
    storeOpenPasswordModal(project, resolve, reject);
  }, [storeOpenPasswordModal]);

  const closePasswordModal = useCallback(() => {
    storeClosePasswordModal();
  }, [storeClosePasswordModal]);

  const submitPasswordModal = useCallback((key: CryptoKey) => {
    storeSubmitPasswordModal(key);
  }, [storeSubmitPasswordModal]);

  return {
    // Person dialog
    isPersonDialogOpen,
    setIsPersonDialogOpen,
    editingPerson,
    openPersonDialog,
    closePersonDialog,

    // Relationship modal
    isRelationshipModalOpen,
    pendingConnection,
    currentSourceNodeForModal,
    currentTargetNodeForModal,
    openRelationshipModal,
    closeRelationshipModal,

    // Other modals
    isProjectModalOpen,
    setIsProjectModalOpen,
    isClearDataModalOpen,
    setIsClearDataModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isRenameModalOpen,
    setIsRenameModalOpen,
    isWelcomeDialogOpen,
    setIsWelcomeDialogOpen,

    // Password modal
    isPasswordModalOpen,
    passwordModalProject,
    openPasswordModal,
    closePasswordModal,
    submitPasswordModal,
  };
};
