/**
 * Manages project state (ID, name, existing projects) using useState.
 * Syncs projectId with the URL if provided.
 */
import { useState, useEffect, useCallback } from 'react';
import { FamilyTree } from '@/types/familyTree';

type ProjectInfo = Pick<FamilyTree, 'id' | 'name' | 'is_encrypted' | 'is_permanent'>;

export function useProjectState(projectIdFromUrl?: string | null) {
  const [projectId, setProjectId] = useState<string | null>(projectIdFromUrl || null);
  const [projectName, setProjectName] = useState('My Home');
  const [existingProjects, setExistingProjects] = useState<ProjectInfo[]>([]);

  // Keep projectId in sync with URL
  useEffect(() => {
    if (projectIdFromUrl) {
      setProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl]);

  return {
    projectId,
    setProjectId,
    projectName,
    setProjectName,
    existingProjects,
    setExistingProjects,
  };
} 