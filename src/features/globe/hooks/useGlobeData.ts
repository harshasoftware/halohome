import { useState, useEffect, useRef } from 'react';
import type { Node, Edge } from '@stubs/xyflow';
import type { PersonData } from '@/types/familyTree';
import type { PersonLocation, Migration } from '../types/migration.d';
import type { FamilyTree } from '@/types/familyTree';

interface UseGlobeDataOptions {
  filters: { gender: string; status: string };
  selectedYear: number | null;
}

interface WorkerRequest {
  tree: FamilyTree;
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
  const lastTreeRef = useRef<FamilyTree | null>(null);

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

  // Only re-transform tree if nodes/edges change
  useEffect(() => {
    if (!nodes.length) {
      setData({ locations: [], migrations: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const tree: FamilyTree = {
      id: 'tree',
      name: 'Tree',
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_permanent: false,
      tree_data: { nodes, edges },
    };
    lastTreeRef.current = tree;
    if (workerRef.current) {
      workerRef.current.postMessage({ tree, filters, selectedYear } as WorkerRequest);
    }
  }, [nodes, edges, filters, selectedYear]);

  // Only re-filter if filters/year change
  useEffect(() => {
    if (!lastTreeRef.current) return;
    setLoading(true);
    if (workerRef.current) {
      workerRef.current.postMessage({ tree: lastTreeRef.current, filters, selectedYear } as WorkerRequest);
    }
  }, [filters, selectedYear]);

  return { data, loading };
};

export default useGlobeData;
