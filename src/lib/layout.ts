import { Node, Edge } from '@stubs/xyflow';
import dagre from 'dagre';
import { FamilyEdgeData } from '@/types/familyTree';

const nodeWidth = 220;
const nodeHeight = 300; 
const unionNodeWidth = 20;
const unionNodeHeight = 4;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 75, ranksep: 120 });

  const layoutNodes = [...nodes];
  
  // Use the new hierarchical edges for layouting the tree structure
  const hierarchicalEdgeTypes = ['parent-child', 'parent-to-union', 'union-to-child'];
  const layoutEdges = edges.filter(edge => {
      const edgeData = edge.data as FamilyEdgeData;
      return hierarchicalEdgeTypes.includes(edgeData?.type);
  });

  layoutNodes.forEach((node) => {
    const width = node.type === 'union' 
      ? unionNodeWidth
      : (node.width || nodeWidth);
    const height = node.type === 'union' 
      ? unionNodeHeight
      : (node.height || nodeHeight);
    dagreGraph.setNode(node.id, { width, height });
  });

  layoutEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const n = { ...node };
    if (nodeWithPosition) {
        const width = node.type === 'union' ? unionNodeWidth : (node.width || nodeWidth);
        const height = node.type === 'union' ? unionNodeHeight : (node.height || nodeHeight);
        
        n.position = {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
        };
    }
    return n;
  });

  return { nodes: layoutedNodes, edges };
}; 