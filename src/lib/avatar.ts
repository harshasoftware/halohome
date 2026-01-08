import { createAvatar } from '@dicebear/core';
import { bigSmile } from '@dicebear/collection';
import { PersonData } from '../types/familyTree';

function getAge(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function generateAvatar(
  seed: string,
  gender?: PersonData['gender'],
  birthDate?: string
) {
  const age = getAge(birthDate);

  let hair: (
    | 'shortHair'
    | 'mohawk'
    | 'wavyBob'
    | 'bowlCutHair'
    | 'curlyShortHair'
    | 'froBun'
    | 'straightHair'
    | 'braids'
    | 'shavedHead'
    | 'bunHair'
    | 'bangs'
  )[] = [
    'shortHair',
    'mohawk',
    'wavyBob',
    'bowlCutHair',
    'curlyShortHair',
    'froBun',
    'straightHair',
    'braids',
    'shavedHead',
    'bunHair',
    'bangs',
  ];

  if (age !== undefined) {
    if (age < 2) {
      hair = ['shavedHead'];
    } else if (age < 18) {
      hair = ['shortHair', 'bowlCutHair', 'bangs'];
    } else if (age < 40) {
      hair = ['wavyBob', 'curlyShortHair', 'straightHair', 'mohawk'];
    } else {
      hair = ['froBun', 'bunHair', 'braids'];
    }
  }

  const avatar = createAvatar(bigSmile, {
    seed,
    hair,
  });

  const dataUri = await avatar.toDataUri();
  return dataUri;
}

/**
 * Generate a random avatar with a random seed.
 * Used for shuffling/selecting different avatar variations.
 */
export async function generateRandomAvatar(
  gender?: PersonData['gender'],
  birthDate?: string
): Promise<string> {
  // Generate a random seed
  const randomSeed = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  return generateAvatar(randomSeed, gender, birthDate);
}
