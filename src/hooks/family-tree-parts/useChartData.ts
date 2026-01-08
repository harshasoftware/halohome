/**
 * Manages chart nodes, edges, and data loaded state.
 * Uses @stubs/xyflow state hooks for nodes and edges.
 */
import { useState, useCallback } from 'react';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange } from '@stubs/xyflow';

export function useChartData() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return {
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    isDataLoaded, setIsDataLoaded,
  };
} 