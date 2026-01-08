
import { useEffect, useRef } from 'react';
import { Node, Edge } from '@stubs/xyflow';
import { useAuth } from '@/hooks/useAuth-context';
import { supabase } from '@/integrations/supabase/client';
// initialNodes and initialEdges removed - starting with empty data for astrocartography
import { FamilyTree, PersonData } from '@/types/familyTree';
import { getLayoutedElements } from '@/lib/layout';
import { toast } from 'sonner';
import { decryptData } from '@/lib/encryption';
import { v4 as uuidv4 } from 'uuid';
import { getAvatarFromIndexedDB, saveAvatarToIndexedDB } from '@/lib/avatarDB';
import { generateAvatar } from '@/lib/avatar';

type User = ReturnType<typeof useAuth>['user'];

interface UseTreeDataParams {
  user: User;
  accessToken?: string;
  isDataLoaded: boolean;
  projectId: string | null;
  nodes: Node<PersonData>[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  setIsDataLoaded: (isLoaded: boolean) => void;
  setProjectId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setExistingProjects: (projects: any[] | ((prev: any[]) => any[])) => void;
  setEncryptionKey: (key: CryptoKey | null) => void;
  promptForPassword: (project: any) => Promise<CryptoKey>;
}

// Utility to resolve avatar for a person node
export async function resolvePersonAvatar(projectId: string | null, person: PersonData, isPermanent: boolean, encryptionKey: CryptoKey | null) {
  // 1. Try IndexedDB
  const blob = await getAvatarFromIndexedDB(projectId, person.id);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  // 2. If permanent, try Supabase
  if (isPermanent && person.avatar && person.avatar.includes('/')) {
    try {
      const response = await supabase.storage.from('encrypted-avatars').download(person.avatar);
      if (response.data) {
        // TODO: decrypt if needed (if encryptionKey)
        const fileExt = person.avatar.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = `image/${fileExt}`;
        const blob = new Blob([await response.data.arrayBuffer()], { type: mimeType });
        // Save to IndexedDB
        await saveAvatarToIndexedDB(projectId, person.id, blob);
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      // fallback to generate
    }
  }
  // 3. Generate avatar
  const dataUri = await generateAvatar(person.name, person.gender, person.birthDate);
  // Convert dataUri to Blob
  const res = await fetch(dataUri);
  const genBlob = await res.blob();
  await saveAvatarToIndexedDB(projectId, person.id, genBlob);
  return URL.createObjectURL(genBlob);
}

// Centralized function to hydrate all person nodes in a tree
export async function hydrateTreeData(nodes: Node[], projectId: string | null, isPermanent: boolean, encryptionKey: CryptoKey | null) {
  return Promise.all(nodes.map(async (node) => {
    if (node.type === 'person' && node.data && node.data.id) {
      const avatarUrl = await resolvePersonAvatar(projectId, node.data, isPermanent, encryptionKey);
      return {
        ...node,
        data: {
          ...node.data,
          avatar: avatarUrl,
        },
      };
    }
    return node;
  }));
}

async function loadSharedData(params: UseTreeDataParams) {
  const { accessToken, setNodes, setEdges, setProjectName, setIsDataLoaded } = params;
  if (!accessToken) return;

  const { data, error } = await supabase.functions.invoke('get-guest-project', {
    body: { access_token: accessToken },
  });

  if (error || data.error) {
    toast.error(error?.message || data.error || "Could not load shared project.");
    setIsDataLoaded(true);
    return;
  }

  const { project_name, tree_data } = data;
  setProjectName(project_name);
  
  let loadedNodes = tree_data?.nodes || [];
  const loadedEdges = tree_data?.edges || [];
  const hasRememberedLayout = loadedNodes.some((n: Node) => n.position.x !== 0 || n.position.y !== 0);

  if (!hasRememberedLayout && loadedNodes.length > 0) {
      const { nodes: layoutedNodes } = getLayoutedElements(loadedNodes, loadedEdges);
      loadedNodes = layoutedNodes;
  }
  // Inject avatars from IndexedDB
  loadedNodes = await hydrateTreeData(loadedNodes, params.projectId, false, null); // Assuming not encrypted for guest projects
  setNodes(loadedNodes);
  setEdges(loadedEdges);
  setIsDataLoaded(true);
}

async function mergeLocalDataOnSignIn(user: NonNullable<User>): Promise<boolean> {
  // For astrocartography app, skip family_trees syncing
  // Just keep using local storage
  return false;
}

async function loadFromLocalStorage(params: UseTreeDataParams) {
  const { setNodes, setEdges, setProjectName, setProjectId, setExistingProjects, setIsDataLoaded } = params;
  
  const localProjects = Object.keys(localStorage)
    .filter(key => key.startsWith('guest_project_'))
    .map(key => JSON.parse(localStorage.getItem(key)!));

  let currentProjectId = localStorage.getItem('guestFamilyTreeCurrentProjectId');

  if (localProjects.length === 0) {
    const newProjectId = uuidv4();
    const newProject = {
      id: newProjectId,
      name: 'My Birth Chart',
      nodes: [],
      edges: [],
      is_permanent: false,
    };
    localStorage.setItem(`guest_project_${newProjectId}`, JSON.stringify(newProject));
    localStorage.setItem('guestFamilyTreeCurrentProjectId', newProjectId);
    localProjects.push(newProject);
    currentProjectId = newProjectId;
  }

  const projectToLoad = localProjects.find(p => p.id === currentProjectId) || localProjects[0];

  if (projectToLoad) {
    const hasRememberedLayout = projectToLoad.nodes.some((n: Node) => n.position.x !== 0 || n.position.y !== 0);
    let nodesToLoad = projectToLoad.nodes;
    if (!hasRememberedLayout && projectToLoad.nodes.length > 0) {
      const { nodes: layoutedNodes } = getLayoutedElements(projectToLoad.nodes, projectToLoad.edges);
      nodesToLoad = layoutedNodes;
    }
    // Inject avatars from IndexedDB
    nodesToLoad = await hydrateTreeData(nodesToLoad, projectToLoad.id, false, null); // Assuming not encrypted for guest projects
    setNodes(nodesToLoad);
    setEdges(projectToLoad.edges);
    setProjectName(projectToLoad.name);
    setProjectId(projectToLoad.id);
    setExistingProjects(localProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }
  
  setIsDataLoaded(true);
}

async function loadData(params: UseTreeDataParams) {
  // For astrocartography app, skip family_trees and just use local storage
  // family_trees table is not used in this app
  await loadFromLocalStorage(params);
}

export const useTreeData = (params: UseTreeDataParams) => {
  const { user, isDataLoaded, projectId, accessToken } = params;
  const prevUser = useRef(user);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent re-initialization loops - only run once per user/accessToken change
    // Don't include projectId in deps since we set it inside this effect
    const initialize = async () => {
      if (accessToken) {
        await loadSharedData(params);
        hasInitialized.current = true;
        return;
      }

      if (user && !prevUser.current) { // User just signed in
        if (await mergeLocalDataOnSignIn(user)) {
          hasInitialized.current = true;
          return;
        }
      }

      // Only load if not already initialized for this session
      if (!hasInitialized.current || user !== prevUser.current) {
        if (user) {
          await loadData(params);
        } else {
          await loadFromLocalStorage(params);
        }
        hasInitialized.current = true;
      }
    };

    initialize();
    prevUser.current = user;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken]); // Removed projectId - it's set inside this effect
};
