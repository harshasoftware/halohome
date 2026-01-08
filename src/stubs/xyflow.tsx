import React, { useState } from 'react';

// Minimal stand-ins for @stubs/xyflow to remove the dependency while keeping
// existing code paths working.

export type Position = { x: number; y: number };

export interface Node<T = any> {
  id: string;
  type?: string;
  position?: Position;
  data: T;
  selected?: boolean;
}

export interface Edge<T = any> {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: T;
}

export interface Connection {
  source?: string;
  target?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type NodeChange = any;
export type EdgeChange = any;

export function addEdge<T>(connection: Connection | Edge<T>, edges: Edge<T>[]): Edge<T>[] {
  const id = (connection as any).id ?? `e-${Date.now()}-${edges.length}`;
  return [...edges, { ...(connection as any), id }];
}

export function applyNodeChanges<T>(changes: NodeChange[], nodes: Node<T>[]): Node<T>[] {
  // No-op change application; return existing nodes unchanged.
  return nodes;
}

export function applyEdgeChanges<T>(changes: EdgeChange[], edges: Edge<T>[]): Edge<T>[] {
  // No-op change application; return existing edges unchanged.
  return edges;
}

export function useReactFlow() {
  return {
    screenToFlowPosition: ({ x, y }: Position) => ({ x, y }),
    getNodes: () => [] as Node[],
  };
}

export const ReactFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export function useNodesState<T>(initial: Node<T>[]) {
  const [nodes, setNodes] = useState<Node<T>[]>(initial);
  const onNodesChange = (_changes: NodeChange[]) => setNodes((prev) => prev);
  return [nodes, setNodes, onNodesChange] as const;
}

export function useEdgesState<T>(initial: Edge<T>[]) {
  const [edges, setEdges] = useState<Edge<T>[]>(initial);
  const onEdgesChange = (_changes: EdgeChange[]) => setEdges((prev) => prev);
  return [edges, setEdges, onEdgesChange] as const;
}

// UI components that were previously rendered from xyflow; return null stubs.
export const MiniMap: React.FC<any> = () => null;













