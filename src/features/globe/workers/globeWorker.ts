import { transformTreeToGlobeData } from '../utils/transformTree';
import type { FamilyTree } from '@/types/familyTree';
import type { PersonLocation, Migration as BaseMigration } from '../types/migration.d';

// Types for messages
interface WorkerRequest {
  tree: FamilyTree;
  filters: { gender: string; status: string };
  selectedYear: number | null;
}

// Extend Migration type to allow gender/status for filtering
interface Migration extends BaseMigration {
  gender?: string;
  status?: string;
}

let lastTreeId: string | null = null;
let lastGlobeData: { locations: PersonLocation[]; migrations: Migration[] } | null = null;

function hasGender(obj: unknown): obj is { gender: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'gender' in obj &&
    typeof (obj as Record<string, unknown>).gender === 'string'
  );
}
function hasStatus(obj: unknown): obj is { status: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    typeof (obj as Record<string, unknown>).status === 'string'
  );
}

function filterGlobeData(
  globeData: { locations: PersonLocation[]; migrations: Migration[] },
  filters: { gender: string; status: string },
  selectedYear: number | null
): { locations: PersonLocation[]; migrations: Migration[] } {
  const filteredLocations = globeData.locations.filter(location => {
    if (filters.gender && filters.gender !== 'all' && hasGender(location)) {
      if (location.gender !== filters.gender) return false;
    }
    if (filters.status && filters.status !== 'all' && hasStatus(location)) {
      if (location.status !== filters.status) return false;
    }
    if (selectedYear !== null && typeof location.year === 'number') {
      if (location.year > selectedYear) return false;
    }
    return true;
  });
  const filteredMigrations = globeData.migrations.filter(migration => {
    if (filters.gender && filters.gender !== 'all' && hasGender(migration)) {
      if (migration.gender !== filters.gender) return false;
    }
    if (filters.status && filters.status !== 'all' && hasStatus(migration)) {
      if (migration.status !== filters.status) return false;
    }
    if (selectedYear !== null && typeof migration.year === 'number') {
      if (migration.year > selectedYear) return false;
    }
    return true;
  });
  return { locations: filteredLocations, migrations: filteredMigrations };
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { tree, filters, selectedYear } = event.data;
  // Include node data in the cache key so location updates are detected
  const treeId = JSON.stringify(
    tree.tree_data?.nodes?.map(n => ({
      id: n.id,
      // Include location data to detect coordinate changes
      locations: (n.data as { locations?: unknown[] })?.locations,
    }))
  ) + JSON.stringify(tree.tree_data?.edges?.map(e => e.id));

  if (treeId !== lastTreeId) {
    lastGlobeData = await transformTreeToGlobeData(tree);
    lastTreeId = treeId;
  }
  if (!lastGlobeData) {
    self.postMessage({ locations: [], migrations: [] });
    return;
  }
  const filtered = filterGlobeData(lastGlobeData, filters, selectedYear);
  self.postMessage(filtered);
}; 