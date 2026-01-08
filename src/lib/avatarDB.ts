import Dexie, { Table } from 'dexie';

export interface AvatarEntry {
  projectId: string;
  personId: string;
  avatarBlob: Blob;
  updatedAt: number;
}

class AvatarDB extends Dexie {
  avatars!: Table<AvatarEntry, [string, string]>; // [projectId, personId] as compound key

  constructor() {
    super('AvatarDB');
    this.version(1).stores({
      avatars: '[projectId+personId], projectId, personId, updatedAt',
    });
  }
}

export const avatarDB = new AvatarDB();

// Save avatar blob to IndexedDB
export async function saveAvatarToIndexedDB(projectId: string, personId: string, avatarBlob: Blob) {
  await avatarDB.avatars.put({
    projectId,
    personId,
    avatarBlob,
    updatedAt: Date.now(),
  });
}

// Get avatar blob from IndexedDB
export async function getAvatarFromIndexedDB(projectId: string, personId: string): Promise<Blob | undefined> {
  const entry = await avatarDB.avatars.get([projectId, personId]);
  return entry?.avatarBlob;
}

// Delete avatar from IndexedDB
export async function deleteAvatarFromIndexedDB(projectId: string, personId: string) {
  await avatarDB.avatars.delete([projectId, personId]);
} 