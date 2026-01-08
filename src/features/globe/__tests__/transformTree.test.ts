import { transformTreeToGlobeData } from '../utils/transformTree';
import { FamilyTree } from '../../../types/familyTree';
import { initialNodes, initialEdges } from '../../../data/familyData';

describe('transformTreeToGlobeData', () => {
  it('should transform family data to globe format', () => {
    const mockTree: FamilyTree = {
      id: 'test-tree',
      name: 'Test Tree',
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_permanent: false,
      tree_data: {
        nodes: initialNodes,
        edges: initialEdges,
      },
    };

    const globeData = transformTreeToGlobeData(mockTree);
    expect(globeData.locations).toBeDefined();
    expect(globeData.migrations).toBeDefined();
    expect(globeData.locations.length).toBeGreaterThan(0);
  });
});
