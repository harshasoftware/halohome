
import { Node, Edge } from '@stubs/xyflow';

export const isCircularConnection = (
  sourceId: string, targetId: string, currentNodes: Node[], currentEdges: Edge[]
): boolean => {
  const getParentIds = (nodeId: string, edgesToSearch: Edge[]): string[] => 
    edgesToSearch.reduce<string[]>((acc, edge) => {
      if (edge.target === nodeId) {
        const sourceNode = currentNodes.find(n => n.id === edge.source);
        if (sourceNode?.type === 'union') {
          return acc.concat(getParentIds(sourceNode.id, edgesToSearch));
        }
        acc.push(edge.source);
      }
      return acc;
    }, []);

  const queue = getParentIds(targetId, currentEdges);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentParentId = queue.shift()!;
    if (currentParentId === sourceId) return true;
    if (visited.has(currentParentId)) continue;
    visited.add(currentParentId);
    queue.push(...getParentIds(currentParentId, currentEdges));
  }
  return false;
};
