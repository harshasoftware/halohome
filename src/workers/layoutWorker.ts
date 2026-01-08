// src/workers/layoutWorker.ts
// Web Worker for running Dagre layout on family tree nodes/edges off the main thread.
// Receives: { type: 'layout', nodes, edges } and returns: { type: 'layout', nodes, edges }

import dagre from 'dagre';

// Minimal Node/Edge types for worker context
export interface WorkerNode {
  id: string;
  type?: string;
  width?: number;
  height?: number;
  position?: { x: number; y: number };
  [key: string]: unknown;
}
export interface WorkerEdge {
  id: string;
  source: string;
  target: string;
  data?: unknown;
  [key: string]: unknown;
}

interface LayoutRequest {
  type: 'layout';
  nodes: WorkerNode[];
  edges: WorkerEdge[];
}

interface LayoutResponse {
  type: 'layout';
  nodes: WorkerNode[];
  edges: WorkerEdge[];
}

const nodeWidth = 220;
const nodeHeight = 300;
const unionNodeWidth = 20;
const unionNodeHeight = 4;

self.onmessage = function (event: MessageEvent<LayoutRequest>) {
  const { type, nodes, edges } = event.data;
  if (type !== 'layout') return;
  try {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 75, ranksep: 120 });

    const layoutNodes = [...nodes];
    const hierarchicalEdgeTypes = ['parent-child', 'parent-to-union', 'union-to-child'];
    const layoutEdges = edges.filter(edge => {
      const edgeData = (edge.data as { type?: string })?.type;
      return hierarchicalEdgeTypes.includes(edgeData);
    });

    layoutNodes.forEach((node) => {
      const width = (node.type === 'union' ? unionNodeWidth : (node.width || nodeWidth));
      const height = (node.type === 'union' ? unionNodeHeight : (node.height || nodeHeight));
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
        const width = (node.type === 'union' ? unionNodeWidth : (node.width || nodeWidth));
        const height = (node.type === 'union' ? unionNodeHeight : (node.height || nodeHeight));
        n.position = {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        };
      }
      return n;
    });

    const response: LayoutResponse = {
      type: 'layout',
      nodes: layoutedNodes,
      edges,
    };
    self.postMessage(response);
  } catch (error: unknown) {
    if (error instanceof Error) {
      self.postMessage({ type: 'error', error: error.message });
    } else {
      self.postMessage({ type: 'error', error: String(error) });
    }
  }
}; 