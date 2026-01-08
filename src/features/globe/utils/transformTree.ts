import { FamilyTree, PersonData } from '../../../types/familyTree';
import { PersonLocation, Migration } from '../types/migration';
import { generateAvatar } from '../../../lib/avatar';

export const transformTreeToGlobeData = async (tree: FamilyTree): Promise<{ locations: PersonLocation[], migrations: Migration[] }> => {
  const locations: PersonLocation[] = [];
  const migrations: Migration[] = [];

  if (tree.tree_data && tree.tree_data.nodes) {
    for (const node of tree.tree_data.nodes) {
      if (node.type === 'person') {
        const person = node.data as PersonData;
        if (person.locations && person.locations.length > 0) {
          const validLocations = person.locations.filter(l => l.lat && l.lng);
          if (validLocations.length > 0) {
            const firstLocation = validLocations[0];
            let avatarUrl = person.avatar;
            if (!avatarUrl || avatarUrl.includes('pravatar')) {
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
  }

  return { locations, migrations };
};
