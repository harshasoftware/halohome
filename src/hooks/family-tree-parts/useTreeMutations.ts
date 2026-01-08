
import { useCallback } from 'react';
import { Node, Edge, Connection, addEdge, useReactFlow } from '@stubs/xyflow';
import { PersonData, UnionNodeData } from '@/types/familyTree';
import { isCircularConnection } from '@/lib/treeUtils';
import { toast } from 'sonner';
import { deleteAvatarFromIndexedDB } from '@/lib/avatarDB';

export type ScreenToFlowPosition = ReturnType<typeof useReactFlow>['screenToFlowPosition'];

interface UseTreeMutationsParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  screenToFlowPosition?: ScreenToFlowPosition;
}

/**
 * Handles tree mutations: save person, save relationship, delete person.
 *
 * @param {object} params - Tree mutation parameters (nodes, edges, setters, etc.).
 * @returns {{
 *   savePerson: Function,
 *   saveRelationship: Function,
 *   deletePerson: Function
 * }}
 */
export const useTreeMutations = ({ nodes, edges, setNodes, setEdges, screenToFlowPosition, projectId }: UseTreeMutationsParams & { projectId: string | null }) => {
  const saveRelationship = useCallback((
    connectionParams: Connection | Edge, type: string, date?: string, customLabel?: string, endDate?: string
  ) => {
    const { source, target, sourceHandle, targetHandle } = connectionParams as Connection;
    if (!source || !target) { toast.error("Connection failed."); return; }
    const localSourceNode = nodes.find((n) => n.id === source);
    const localTargetNode = nodes.find((n) => n.id === target);
    if (!localSourceNode || !localTargetNode) { toast.error("Node not found."); return; }

    const romanticRelationshipTypes = ['marriage', 'divorce', 'separated', 'common-law', 'engaged', 'dating', 'ex-partner'];

    if (romanticRelationshipTypes.includes(type)) {
      if (localSourceNode.type !== 'person' || localTargetNode.type !== 'person') {
        toast.error("Romantic relationships must be between two people.");
        return;
      }
      if (source === target) { toast.error("Cannot have a relationship with oneself."); return; }

      // Check for an existing union between these two people
      const existingUnion = edges.find(edge => {
        const node = nodes.find(n => n.id === edge.target);
        if (!node || node.type !== 'union') return false;
        
        const hasSource = edges.some(e => e.source === source && e.target === edge.target);
        const hasTarget = edges.some(e => e.source === target && e.target === edge.target);
        return hasSource && hasTarget;
      });

      let unionId: string;
      if (existingUnion) {
        unionId = existingUnion.target!;
      } else {
        unionId = `union_${source}_${target}_${Date.now()}`;
        const sourcePersonData = localSourceNode.data as PersonData;
        const targetPersonData = localTargetNode.data as PersonData;
        const unionNodeData: UnionNodeData = { type: 'union', label: 'Union', parent1Gender: sourcePersonData.gender, parent2Gender: targetPersonData.gender };
        const unionNode: Node<UnionNodeData> = { id: unionId, type: 'union', position: { x: (localSourceNode.position.x + localTargetNode.position.x) / 2, y: Math.max(localSourceNode.position.y, localTargetNode.position.y) + 120 }, data: unionNodeData };
        
        const edgeToUnion1: Edge = { id: `e-${source}-to-${unionId}`, source, target: unionId, type: 'family', data: { type: 'parent-to-union' }, sourceHandle: 'child', targetHandle: 'parent' };
        const edgeToUnion2: Edge = { id: `e-${target}-to-${unionId}`, source: target, target: unionId, type: 'family', data: { type: 'parent-to-union' }, sourceHandle: 'child', targetHandle: 'parent' };

        setNodes((nds) => [...nds, unionNode]);
        setEdges((eds) => addEdge(edgeToUnion1, addEdge(edgeToUnion2, eds)));
      }

      // Add the direct relationship edge (e.g., marriage, dating)
      const directRelationshipEdge: Edge = { id: `${type}-${[source, target].sort().join('-')}`, source, target, type: 'family', sourceHandle, targetHandle, data: { type, label: customLabel || type.charAt(0).toUpperCase() + type.slice(1), date, endDate }};
      setEdges((eds) => addEdge(directRelationshipEdge, eds));
      toast.success(`Created ${type} relationship for ${localSourceNode.data.name} and ${localTargetNode.data.name}.`);

    } else if (type === 'parent-child') {
        if (isCircularConnection(source, target, nodes, edges)) { toast.error('Circular relationship.'); return; }
        
        if (localSourceNode.type === 'union' && localTargetNode.type === 'person') {
            let edgeLabel = customLabel || 'Child';
            const parentsOfUnion = edges.filter(e => e.target === source && nodes.find(n => n.id === e.source)?.type === 'person').map(e => e.source);
            if (parentsOfUnion.length === 2) {
                const [p1Id, p2Id] = parentsOfUnion;
                const childId = localTargetNode.id;
                // Check if the child already has a direct parent-child link to either parent of the union.
                const isBioToP1 = edges.some(e => e.data?.type === 'parent-child' && ((e.source === p1Id && e.target === childId) || (e.source === childId && e.target === p1Id)));
                const isBioToP2 = edges.some(e => e.data?.type === 'parent-child' && ((e.source === p2Id && e.target === childId) || (e.source === childId && e.target === p2Id)));
                
                if ((isBioToP1 && !isBioToP2) || (!isBioToP1 && isBioToP2)) {
                  edgeLabel = customLabel || 'Step-child';
                }
            }
            // Define newChildEdge before setEdges
            const newChildEdge: Edge = { id: `edge-${source}-${target}-${Date.now()}`, source, target, type: 'family', sourceHandle, targetHandle, data: { type: 'union-to-child', label: edgeLabel, date } };
            setEdges(eds => {
                const updatedEdges = eds.map(edge => {
                    if (edge.target === source && edge.data?.type === 'parent-to-union') {
                        return { ...edge, data: { ...edge.data, label: 'Parent' } };
                    }
                    return edge;
                });
                return addEdge(newChildEdge, updatedEdges);
            });
            toast.success(`Parent-child relationship added.`);
        } else { // Direct parent-child or other cases
            const newEdge: Edge = { id: `edge-${source}-${target}-${Date.now()}`, source, target, type: 'family', sourceHandle, targetHandle, data: { type: 'parent-child', label: customLabel || 'Child', date } };
            setEdges((eds) => addEdge(newEdge, eds));
            toast.success(`Parent-child relationship added.`);
        }
    } else { // Handles other relationships like godparent, guardian
        const newEdge: Edge = { id: `edge-${type}-${source}-${target}-${Date.now()}`, source, target, type: 'family', sourceHandle, targetHandle, data: { type, label: customLabel || type.charAt(0).toUpperCase() + type.slice(1), date }};
        setEdges((eds) => addEdge(newEdge, eds));
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} relationship added.`);
    }
  }, [nodes, edges, setNodes, setEdges]);

  const savePerson = useCallback((personData: Partial<PersonData>, editingPerson: PersonData | null) => {
    if (editingPerson) {
      setNodes((nds) => nds.map((node) => {
        if (node.id === editingPerson.id) {
          return { ...node, data: { ...node.data, ...personData } };
        }
        return node;
      }));
      const oldMarriages = editingPerson.marriages || []; const newMarriages = personData.marriages || [];
      const added = newMarriages.filter(nm => !oldMarriages.some(om => om.spouseId === nm.spouseId));
      const removed = oldMarriages.filter(om => !newMarriages.some(nm => nm.spouseId === om.spouseId));
      const newMarriageEdges: Edge[] = added.map(marriage => {
        const sourceId = editingPerson.id; const targetId = marriage.spouseId;
        const unionExists = nodes.some(n => n.type === 'union' && edges.some(e => e.target === n.id && e.source === sourceId) && edges.some(e => e.target === n.id && e.source === targetId));
        if (!unionExists) return { id: `mar-${[sourceId, targetId].sort().join('-')}`, source: sourceId, target: targetId, type: 'family', data: { type: 'marriage', label: 'Married', date: marriage.marriageDate }};
        return null;
      }).filter(Boolean) as Edge[];
      if (newMarriageEdges.length > 0) setEdges(eds => [...eds, ...newMarriageEdges]);
      const removedEdgeIds = new Set(removed.map(marriage => `mar-${[editingPerson.id, marriage.spouseId].sort().join('-')}`));
      if (removedEdgeIds.size > 0) setEdges(eds => eds.filter(edge => !removedEdgeIds.has(edge.id)));
    } else {
      let position = { x: Math.random() * 400, y: Math.random() * 400 };
      if (screenToFlowPosition) {
        position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      }
      const newId = `person_${Date.now()}`;
      const newNode: Node<PersonData> = { id: newId, type: 'person', position, data: { ...personData, id: newId, locations: personData.locations || [] } as PersonData };
      setNodes((nds) => [...nds, newNode]);
      toast.success(`Added ${personData.name} to the tree.`);
    }
  }, [setNodes, setEdges, nodes, edges, screenToFlowPosition]);

  const deletePerson = useCallback(async (personId: string) => {
    const personNode = nodes.find(n => n.id === personId);
    if (!personNode) {
      toast.error("Person not found.");
      return;
    }
    const unionIdsToDelete = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === personId) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode && targetNode.type === 'union') {
          unionIdsToDelete.add(targetNode.id);
        }
      }
    });
    const nodeIdsToDelete = new Set<string>([personId, ...unionIdsToDelete]);
    setNodes(nds => nds.filter(n => !nodeIdsToDelete.has(n.id)));
    // Avatar cleanup
    if (projectId) {
      await deleteAvatarFromIndexedDB(projectId, personId);
    }
    toast.success(`Deleted ${personNode.data.name} and related connections.`);
  }, [nodes, edges, setNodes, projectId]);

  return { saveRelationship, savePerson, deletePerson };
};
