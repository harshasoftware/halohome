import { useState, useEffect, useRef } from 'react';
import type { Node, Edge } from '@stubs/xyflow';
import type { PersonData } from '@/types/familyTree';
import type { PersonLocation, Migration } from '../types/migration.d';

interface UseGlobeDataOptions {
  filters: { gender: string; status: string };
  selectedYear: number | null;
}

interface WorkerRequest {
  nodes: Node<PersonData>[];
  filters: { gender: string; status: string };
  selectedYear: number | null;
}

const useGlobeData = (
  nodes: Node<PersonData>[],
  edges: Edge[],
  { filters, selectedYear }: UseGlobeDataOptions
) => {
  const [data, setData] = useState<{ locations: PersonLocation[]; migrations: Migration[] }>({ locations: [], migrations: [] });
  const [loading, setLoading] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const lastNodesRef = useRef<Node<PersonData>[] | null>(null);

  // Initialize worker only once
  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/globeWorker.ts', import.meta.url), { type: 'module' });
    }
    const worker = workerRef.current;
    worker.onmessage = (event: MessageEvent<{ locations: PersonLocation[]; migrations: Migration[] }>) => {
      setData(event.data);
      setLoading(false);
    };
    worker.onerror = () => {
      setLoading(false);
    };
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Only re-transform when nodes/edges change
  useEffect(() => {
    if (!nodes.length) {
      setData({ locations: [], migrations: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    lastNodesRef.current = nodes;
    if (workerRef.current) {
      workerRef.current.postMessage({ nodes, filters, selectedYear } as WorkerRequest);
    }
  }, [nodes, edges, filters, selectedYear]);

  // Only re-filter if filters/year change
  useEffect(() => {
    if (!lastNodesRef.current) return;
    setLoading(true);
    if (workerRef.current) {
      workerRef.current.postMessage({ nodes: lastNodesRef.current, filters, selectedYear } as WorkerRequest);
    }
  }, [filters, selectedYear]);

  return { data, loading };
};

export default useGlobeData;
