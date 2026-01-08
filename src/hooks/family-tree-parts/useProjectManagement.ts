import { useCallback } from 'react';
import { Node, Edge } from '@stubs/xyflow';
import { useAuth } from '@/hooks/useAuth-context';
import { FamilyTree } from '@/types/familyTree';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSalt, encryptData, deriveKeyFromPassword } from '@/lib/encryption';
import { v4 as uuidv4 } from 'uuid';
import { hydrateTreeData } from './useTreeData';
import { deleteAvatarFromIndexedDB } from '@/lib/avatarDB';

interface UseProjectManagementParams {
  user: ReturnType<typeof useAuth>['user'];
  projectId: string | null;
  projectName: string;
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  setProjectId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setExistingProjects: (projects: any[] | ((prev: any[]) => any[])) => void;
  setEncryptionKey: (key: CryptoKey | null) => void;
  encryptionKey: CryptoKey | null;
  project?: { is_permanent?: boolean };
}

/**
 * Handles project management: create, select, rename, clear, replace, and save to cloud.
 *
 * @param {object} params - Project management parameters (user, projectId, nodes, etc.).
 * @returns {{
 *   createNewProject: Function,
 *   selectProject: Function,
 *   renameProject: Function,
 *   clearProjectData: Function,
 *   replaceTreeData: Function,
 *   handleSaveToCloud: Function
 * }}
 */
export const useProjectManagement = ({
  user, projectId, projectName, nodes, edges,
  setNodes, setEdges, setProjectId, setProjectName, setExistingProjects, setEncryptionKey, encryptionKey, project
}: UseProjectManagementParams) => {
  const handleSaveToCloud = useCallback(async (currentEncryptionKey: CryptoKey | null, successMessage?: string) => {
    // For astrocartography app, save to localStorage instead of family_trees
    if (!projectId) {
      toast.error("No active project found to save.");
      return;
    }

    const existingProject = localStorage.getItem(`guest_project_${projectId}`);
    if (existingProject) {
      const project = JSON.parse(existingProject);
      project.nodes = nodes;
      project.edges = edges;
      project.name = projectName;
      localStorage.setItem(`guest_project_${projectId}`, JSON.stringify(project));
      toast.success(successMessage || "Saved!", { duration: 2000 });
    }
  }, [nodes, edges, projectName, projectId]);

  const batchSetState = useCallback((updates: () => void) => {
    updates();
  }, []);

  const createNewProject = useCallback(async (newName: string, encryptionPassword?: string, encryptionKeyToSet?: CryptoKey) => {
    
    const toastId = toast.loading(`Creating project "${newName}"...`);
    let salt: string | undefined = undefined;
    let is_encrypted = false;
    let tree_data: { nodes: Node[]; edges: Edge[] } | string = { nodes: [], edges: [] };
    let finalEncryptionKey = encryptionKeyToSet || null;

    if (encryptionPassword) {
        try {
            salt = generateSalt();
            finalEncryptionKey = await deriveKeyFromPassword(encryptionPassword, salt);
        } catch (e) {
            toast.error("Failed to create encryption key.", { id: toastId });
            console.error(e);
            return;
        }
    }

    if (finalEncryptionKey) {
        is_encrypted = true;
        try {
            tree_data = await encryptData(finalEncryptionKey, tree_data);
        } catch (e) {
            toast.error("Failed to encrypt new project.", { id: toastId });
            console.error(e);
            return;
        }
    }

    // For astrocartography app, always use localStorage
    const newProjectId = uuidv4();
    const newProject = {
      id: newProjectId,
      name: newName,
      nodes: [],
      edges: [],
      is_permanent: false,
    };
    localStorage.setItem(`guest_project_${newProjectId}`, JSON.stringify(newProject));
    localStorage.setItem('guestFamilyTreeCurrentProjectId', newProjectId);
    batchSetState(() => {
      setNodes([]);
      setEdges([]);
      setProjectName(newName);
      setProjectId(newProjectId);
      setExistingProjects(prev => [...prev, { id: newProjectId, name: newName, is_permanent: false }]);
    });
    toast.success(`Project "${newName}" created.`, { id: toastId });
  }, [setNodes, setEdges, setProjectName, setProjectId, setExistingProjects, batchSetState]);

  const selectProject = useCallback((selectedProjectId: string) => {
    if (selectedProjectId === projectId) {
      toast.info("This project is already open.");
      return;
    }

    if (user) {
      localStorage.setItem('familyTreeCurrentProjectId', selectedProjectId);
      window.location.href = `/${selectedProjectId}`;
    } else {
      const localProject = JSON.parse(localStorage.getItem(`guest_project_${selectedProjectId}`)!);
      if (localProject) {
        batchSetState(() => {
          setNodes(localProject.nodes);
          setEdges(localProject.edges);
          setProjectName(localProject.name);
          setProjectId(localProject.id);
        });
        localStorage.setItem('guestFamilyTreeCurrentProjectId', selectedProjectId);
      } else {
        toast.error("Could not find local project.");
      }
    }
  }, [user, projectId, setNodes, setEdges, setProjectName, setProjectId, batchSetState]);

  const renameProject = useCallback(async (newName: string) => {
    // For astrocartography app, use localStorage
    if (projectId) {
      const existingProject = localStorage.getItem(`guest_project_${projectId}`);
      if (existingProject) {
        const project = JSON.parse(existingProject);
        project.name = newName;
        localStorage.setItem(`guest_project_${projectId}`, JSON.stringify(project));
      }
    }
    batchSetState(() => {
      setProjectName(newName);
      setExistingProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName } : p));
    });
    toast.success(`Project renamed to: ${newName}`);
  }, [projectId, setProjectName, setExistingProjects, batchSetState]);

  const clearProjectData = useCallback(async () => {
    // For astrocartography app, use localStorage
    if (projectId) {
      const existingProject = localStorage.getItem(`guest_project_${projectId}`);
      if (existingProject) {
        const project = JSON.parse(existingProject);
        project.nodes = [];
        project.edges = [];
        localStorage.setItem(`guest_project_${projectId}`, JSON.stringify(project));
      }
    }
    batchSetState(() => {
      setNodes([]); setEdges([]);
    });
    localStorage.removeItem('familyTreeRememberedNodes');
    localStorage.removeItem('familyTreeRememberedEdges');
    toast.success("Project data cleared.");
  }, [projectId, setNodes, setEdges, batchSetState]);

  const replaceTreeData = useCallback(async (newNodes: Node[], newEdges: Edge[]) => {
    // Retrieve is_permanent from the current project (assume you have a 'project' object in scope)
    const isPermanent = !!project?.is_permanent;
    // Hydrate avatars for all person nodes
    const hydratedNodes = await hydrateTreeData(newNodes, projectId, isPermanent, encryptionKey);
    batchSetState(() => {
      setNodes(hydratedNodes);
      setEdges(newEdges);
    });
  }, [setNodes, setEdges, batchSetState, projectId, encryptionKey, project]);
  
  return { createNewProject, selectProject, renameProject, clearProjectData, handleSaveToCloud, replaceTreeData };
};
