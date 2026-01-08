import type { Node } from '@stubs/xyflow';
import type { PersonData } from '@/types/familyTree';
import { PersonLocation, Migration } from '../types/migration';
import { generateAvatar } from '../../../lib/avatar';

/**
 * Check if a URL is a valid avatar URL that will pass sanitization.
 * Valid URLs are: https://, data:image/*, or valid relative paths.
 */
function isValidAvatarUrl(url: string | undefined): boolean {
  if (!url || url.trim() === '') return false;
  const normalized = url.trim().toLowerCase();
  // Allow https URLs
  if (normalized.startsWith('https://')) return true;
  // Allow safe data image URIs (DiceBear generates these)
  if (normalized.startsWith('data:image/')) return true;
  // Reject anything else (http, blob, javascript, etc.) - will be regenerated
  return false;
}

/**
 * Transform person nodes into globe-compatible location and migration data.
 * Extracts locations from each person and creates migration arcs between them.
 */
export const transformNodesToGlobeData = async (
  nodes: Node<PersonData>[]
): Promise<{ locations: PersonLocation[]; migrations: Migration[] }> => {
  const locations: PersonLocation[] = [];
  const migrations: Migration[] = [];

  for (const node of nodes) {
    if (node.type === 'person') {
      const person = node.data as PersonData;
      if (person.locations && person.locations.length > 0) {
        const validLocations = person.locations.filter(l => l.lat && l.lng);
        if (validLocations.length > 0) {
          const firstLocation = validLocations[0];
          let avatarUrl = person.avatar;
          // Regenerate avatar if missing, invalid, or using old pravatar service
          if (!isValidAvatarUrl(avatarUrl) || avatarUrl?.includes('pravatar')) {
            avatarUrl = await generateAvatar(
              person.name,
              person.gender,
              person.birthDate
            );
          }
          locations.push({
            ...person,
            lat: firstLocation.lat!,
            lng: firstLocation.lng!,
            label: person.name,
            avatarUrl,
            placeName: firstLocation.place,
          });

          for (let i = 0; i < validLocations.length - 1; i++) {
            const fromLocation = validLocations[i];
            const toLocation = validLocations[i + 1];
            migrations.push({
              id: `${person.id}-${fromLocation.place}-${toLocation.place}`,
              from: { lat: fromLocation.lat!, lng: fromLocation.lng! },
              to: { lat: toLocation.lat!, lng: toLocation.lng! },
              year: new Date(toLocation.date).getFullYear(),
              personId: person.id,
            });
          }
        }
      }
    }
  }

  return { locations, migrations };
};
