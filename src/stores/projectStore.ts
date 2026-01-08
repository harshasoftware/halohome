/**
 * Project Store - Zustand store for project and tree data
 *
 * Manages project metadata, tree nodes/edges, filters, and encryption.
 * Compatible with @stubs/xyflow through applyNodeChanges/applyEdgeChanges.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  addEdge,
} from '@stubs/xyflow';
import type { PersonData, UnionNodeData, FamilyTree } from '@/types/familyTree';

type ProjectInfo = Pick<FamilyTree, 'id' | 'name' | 'is_encrypted' | 'is_permanent'>;

interface Filters {
  gender: string;
  status: string;
}

interface ProjectState {
  // === Project Metadata ===
  projectId: string | null;
  projectName: string;
  existingProjects: ProjectInfo[];

  // === Tree Data ===
  nodes: Node<PersonData | UnionNodeData>[];
  edges: Edge[];
  isDataLoaded: boolean;

  // === Encryption ===
  encryptionKey: CryptoKey | null;

  // === Filters ===
  filters: Filters;

  // === Project Metadata Actions ===
  setProjectId: (id: string | null) => void;
  setProjectName: (name: string) => void;
  setExistingProjects: (projects: ProjectInfo[] | ((prev: ProjectInfo[]) => ProjectInfo[])) => void;

  // === Tree Data Actions ===
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addEdgeToTree: (connection: Connection | Edge) => void;
  setIsDataLoaded: (loaded: boolean) => void;

  // === Person/Node Actions ===
  updatePerson: (personId: string, data: Partial<PersonData>) => void;
  addPerson: (node: Node<PersonData>) => void;
  removePerson: (personId: string) => void;

  // === Encryption Actions ===
  setEncryptionKey: (key: CryptoKey | null) => void;

  // === Filter Actions ===
  setFilters: (filters: Filters) => void;
  updateFilter: (key: keyof Filters, value: string) => void;

  // === Batch Actions ===
  clearTreeData: () => void;
  replaceTreeData: (nodes: Node[], edges: Edge[]) => void;
  reset: () => void;
}

const initialState = {
  projectId: null,
  projectName: 'My Birth Chart',
  existingProjects: [] as ProjectInfo[],
  nodes: [] as Node[],
  edges: [] as Edge[],
  isDataLoaded: false,
  encryptionKey: null,
  filters: { gender: 'all', status: 'all' },
};

export const useProjectStore = create<ProjectState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // === Project Metadata Actions ===
      setProjectId: (id) => set((state) => {
        state.projectId = id;
      }),
      setProjectName: (name) => set((state) => {
        state.projectName = name;
      }),
      setExistingProjects: (projects) => set((state) => {
        if (typeof projects === 'function') {
          state.existingProjects = projects(state.existingProjects);
        } else {
          state.existingProjects = projects;
        }
      }),

      // === Tree Data Actions ===
      setNodes: (nodes) => set((state) => {
        if (typeof nodes === 'function') {
          state.nodes = nodes(state.nodes);
        } else {
          state.nodes = nodes;
        }
      }),
      setEdges: (edges) => set((state) => {
        if (typeof edges === 'function') {
          state.edges = edges(state.edges);
        } else {
          state.edges = edges;
        }
      }),
      onNodesChange: (changes) => set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes);
      }),
      onEdgesChange: (changes) => set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges);
      }),
      addEdgeToTree: (connection) => set((state) => {
        state.edges = addEdge(connection, state.edges);
      }),
      setIsDataLoaded: (loaded) => set((state) => {
        state.isDataLoaded = loaded;
      }),

      // === Person/Node Actions ===
      updatePerson: (personId, data) => set((state) => {
        const nodeIndex = state.nodes.findIndex((n) => n.id === personId);
        if (nodeIndex !== -1) {
          state.nodes[nodeIndex].data = {
            ...state.nodes[nodeIndex].data,
            ...data,
          };
        }
      }),
      addPerson: (node) => set((state) => {
        state.nodes.push(node);
      }),
      removePerson: (personId) => set((state) => {
        // Find union nodes connected to this person
        const unionIdsToDelete = new Set<string>();
        state.edges.forEach((edge) => {
          if (edge.source === personId) {
            const targetNode = state.nodes.find((n) => n.id === edge.target);
            if (targetNode && targetNode.type === 'union') {
              unionIdsToDelete.add(targetNode.id);
            }
          }
        });

        // Remove person and connected unions
        const nodeIdsToDelete = new Set<string>([personId, ...unionIdsToDelete]);
        state.nodes = state.nodes.filter((n) => !nodeIdsToDelete.has(n.id));

        // Remove edges connected to deleted nodes
        state.edges = state.edges.filter(
          (e) => !nodeIdsToDelete.has(e.source) && !nodeIdsToDelete.has(e.target)
        );
      }),

      // === Encryption Actions ===
      setEncryptionKey: (key) => set((state) => {
        state.encryptionKey = key;
      }),

      // === Filter Actions ===
      setFilters: (filters) => set((state) => {
        state.filters = filters;
      }),
      updateFilter: (key, value) => set((state) => {
        state.filters[key] = value;
      }),

      // === Batch Actions ===
      clearTreeData: () => set((state) => {
        state.nodes = [];
        state.edges = [];
      }),
      replaceTreeData: (nodes, edges) => set((state) => {
        state.nodes = nodes;
        state.edges = edges;
      }),
      reset: () => set(initialState),
    })),
    { name: 'project-store' }
  )
);

// === Selectors ===

// Project metadata selectors
export const useProjectId = () => useProjectStore((state) => state.projectId);
export const useProjectName = () => useProjectStore((state) => state.projectName);
export const useExistingProjects = () => useProjectStore((state) => state.existingProjects);

// Tree data selectors
export const useNodes = () => useProjectStore((state) => state.nodes);
export const useEdges = () => useProjectStore((state) => state.edges);
export const useIsDataLoaded = () => useProjectStore((state) => state.isDataLoaded);

// Filter selectors
export const useFilters = () => useProjectStore((state) => state.filters);

// Encryption selector
export const useEncryptionKey = () => useProjectStore((state) => state.encryptionKey);

// Derived selectors
export const useIsProjectPermanent = () =>
  useProjectStore((state) => {
    const { projectId, existingProjects } = state;
    if (!projectId) return false;
    const project = existingProjects.find((p) => p.id === projectId);
    return project?.is_permanent ?? false;
  });

export const usePersonNodes = () =>
  useProjectStore((state) =>
    state.nodes.filter((n): n is Node<PersonData> => n.type === 'person')
  );

export const useUnionNodes = () =>
  useProjectStore((state) =>
    state.nodes.filter((n): n is Node<UnionNodeData> => n.type === 'union')
  );

// Get person by ID
export const usePersonById = (personId: string | null) =>
  useProjectStore((state) => {
    if (!personId) return null;
    const node = state.nodes.find((n) => n.id === personId);
    return node?.type === 'person' ? (node.data as PersonData) : null;
  });

// ReactFlow integration selector - returns nodes, edges, and change handlers
export const useReactFlowState = () =>
  useProjectStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
  }));

// Project actions selector
export const useProjectActions = () =>
  useProjectStore((state) => ({
    setProjectId: state.setProjectId,
    setProjectName: state.setProjectName,
    setExistingProjects: state.setExistingProjects,
    clearTreeData: state.clearTreeData,
    replaceTreeData: state.replaceTreeData,
  }));

// Tree mutation actions selector
export const useTreeActions = () =>
  useProjectStore((state) => ({
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    addEdgeToTree: state.addEdgeToTree,
    updatePerson: state.updatePerson,
    addPerson: state.addPerson,
    removePerson: state.removePerson,
  }));
