import { PersonLocation } from '../types/migration';

const R = 6371; // Earth's radius in km

// Haversine formula to calculate distance between two lat/lng points
const getDistance = (p1: PersonLocation, p2: PersonLocation) => {
  const c = Math.PI / 180;
  const a = 0.5 - Math.cos((p2.lat - p1.lat) * c)/2 + 
          Math.cos(p1.lat * c) * Math.cos(p2.lat * c) * 
          (1 - Math.cos((p2.lng - p1.lng) * c))/2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

export const clusterLocations = (locations: PersonLocation[], zoom: number): (PersonLocation & { count?: number })[] => {
  const distanceThreshold = 0; // Adjust threshold based on zoom
  const clusters: (PersonLocation & { count: number, members: PersonLocation[] })[] = [];

  locations.forEach(location => {
    let foundCluster = false;
    for (const cluster of clusters) {
      if (getDistance(location, cluster) < distanceThreshold) {
        cluster.members.push(location);
        cluster.count++;
        // Recalculate cluster center (simple average)
        cluster.lat = (cluster.lat * (cluster.count - 1) + location.lat) / cluster.count;
        cluster.lng = (cluster.lng * (cluster.count - 1) + location.lng) / cluster.count;
        foundCluster = true;
        break;
      }
    }
    if (!foundCluster) {
      clusters.push({ ...location, count: 1, members: [location] });
    }
  });

  return clusters.map(({ members, ...cluster }) => cluster);
};
