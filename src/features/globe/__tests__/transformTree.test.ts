import { transformNodesToGlobeData } from '../utils/transformTree';
import type { Node } from '@stubs/xyflow';
import type { PersonData } from '../../../types/familyTree';

describe('transformNodesToGlobeData', () => {
  it('should transform person nodes to globe format', async () => {
    const mockNodes: Node<PersonData>[] = [
      {
        id: 'person-1',
        type: 'person',
        position: { x: 0, y: 0 },
        data: {
          id: 'person-1',
          name: 'John Doe',
          gender: 'male',
          birthDate: '1990-01-15',
          status: 'alive',
          locations: [
            {
              type: 'birth',
              place: 'New York, USA',
              lat: 40.7128,
              lng: -74.006,
              date: '1990-01-15',
            },
            {
              type: 'residence',
              place: 'Los Angeles, USA',
              lat: 34.0522,
              lng: -118.2437,
              date: '2015-06-01',
            },
          ],
        },
      },
      {
        id: 'person-2',
        type: 'person',
        position: { x: 100, y: 0 },
        data: {
          id: 'person-2',
          name: 'Jane Doe',
          gender: 'female',
          birthDate: '1992-05-20',
          status: 'alive',
          locations: [
            {
              type: 'birth',
              place: 'Chicago, USA',
              lat: 41.8781,
              lng: -87.6298,
              date: '1992-05-20',
            },
          ],
        },
      },
    ];

    const globeData = await transformNodesToGlobeData(mockNodes);

    expect(globeData.locations).toBeDefined();
    expect(globeData.migrations).toBeDefined();
    expect(globeData.locations.length).toBe(2);
    expect(globeData.migrations.length).toBe(1); // John has 2 locations = 1 migration
  });

  it('should skip nodes without locations', async () => {
    const mockNodes: Node<PersonData>[] = [
      {
        id: 'person-no-loc',
        type: 'person',
        position: { x: 0, y: 0 },
        data: {
          id: 'person-no-loc',
          name: 'No Location',
          gender: 'male',
          status: 'alive',
          locations: [],
        },
      },
    ];

    const globeData = await transformNodesToGlobeData(mockNodes);

    expect(globeData.locations.length).toBe(0);
    expect(globeData.migrations.length).toBe(0);
  });

  it('should skip non-person nodes', async () => {
    const mockNodes: Node<PersonData>[] = [
      {
        id: 'union-1',
        type: 'union',
        position: { x: 0, y: 0 },
        data: {
          id: 'union-1',
          name: 'Union',
          gender: 'male',
          status: 'alive',
        },
      },
    ];

    const globeData = await transformNodesToGlobeData(mockNodes);

    expect(globeData.locations.length).toBe(0);
    expect(globeData.migrations.length).toBe(0);
  });
});
