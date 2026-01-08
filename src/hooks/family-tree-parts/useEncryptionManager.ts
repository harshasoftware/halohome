/**
 * Manages encryption key and password modal logic.
 * Uses modalManager to prompt for password and handle submission.
 *
 * @param {ReturnType<typeof useModalManager>} modalManager - The modal manager instance.
 * @returns {{
 *   encryptionKey: CryptoKey | null,
 *   setEncryptionKey: (key: CryptoKey | null) => void,
 *   promptForPassword: (project: Pick<FamilyTree, 'id' | 'name' | 'is_encrypted' | 'encryption_salt'>) => Promise<CryptoKey>,
 *   submitPasswordModal: (password: string) => Promise<void>
 * }}
 */
import { useState, useCallback } from 'react';
import { deriveKeyFromPassword } from '@/lib/encryption';
import { FamilyTree } from '@/types/familyTree';
import { useModalManager } from '@/hooks/useModalManager';

export function useEncryptionManager(modalManager: ReturnType<typeof useModalManager>) {
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  // Prompt for password using modalManager
  const promptForPassword = useCallback((project: Pick<FamilyTree, 'id' | 'name' | 'is_encrypted' | 'encryption_salt'>): Promise<CryptoKey> => {
    return new Promise((resolve, reject) => {
      modalManager.openPasswordModal(project, resolve, reject);
    });
  }, [modalManager]);

  // Handler for password modal submission
  const submitPasswordModal = useCallback(async (password: string) => {
    if (!modalManager.passwordModalProject || !modalManager.passwordModalProject.encryption_salt) {
      throw new Error('Modal state is invalid');
    }
    const key = await deriveKeyFromPassword(password, modalManager.passwordModalProject.encryption_salt);
    modalManager.submitPasswordModal(key);
    setEncryptionKey(key);
  }, [modalManager]);

  return {
    encryptionKey,
    setEncryptionKey,
    promptForPassword,
    submitPasswordModal,
  };
} 