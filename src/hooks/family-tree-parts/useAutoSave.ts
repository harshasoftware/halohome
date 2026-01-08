import { useEffect, useRef } from 'react';
import type { Node, Edge } from '@stubs/xyflow';
import type { PersonData, FamilyEdgeData } from '@/types/familyTree';

interface UseAutoSaveParams {
  nodes: Node<PersonData>[];
  edges: Edge<FamilyEdgeData>[];
  isProjectPermanent: boolean;
  isDataLoaded: boolean;
  user: { id: string; email?: string } | null;
  handleSaveToCloud: (encryptionKey: CryptoKey | null) => void;
  encryptionKey: CryptoKey | null;
}

/**
 * Handles debounced auto-save for permanent projects.
 *
 * @param {object} params - Auto-save parameters (nodes, edges, isProjectPermanent, etc.).
 */
export function useAutoSave({
  nodes,
  edges,
  isProjectPermanent,
  isDataLoaded,
  user,
  handleSaveToCloud,
  encryptionKey,
}: UseAutoSaveParams) {
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isDataLoaded || !isProjectPermanent || !user) return;

    if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);

    autoSaveTimeout.current = setTimeout(() => {
      handleSaveToCloud(encryptionKey);
    }, 2000);

    return () => {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
    };
  }, [nodes, edges, isProjectPermanent, isDataLoaded, handleSaveToCloud, encryptionKey, user]);
} 