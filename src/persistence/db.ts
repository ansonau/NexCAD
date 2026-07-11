import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { NexcadDocument } from '../types/document';

export interface ProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  doc: NexcadDocument;
}

interface NexcadDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectRecord;
    indexes: { 'by-updated': number };
  };
}

let dbPromise: Promise<IDBPDatabase<NexcadDB>> | null = null;

function getDb(): Promise<IDBPDatabase<NexcadDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NexcadDB>('nexcad', 1, {
      upgrade(db) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

export async function saveProject(record: ProjectRecord): Promise<void> {
  await (await getDb()).put('projects', record);
}

export async function loadProject(id: string): Promise<ProjectRecord | undefined> {
  return (await getDb()).get('projects', id);
}

/** 依 updatedAt 新→舊 */
export async function listProjects(): Promise<ProjectRecord[]> {
  const all = await (await getDb()).getAllFromIndex('projects', 'by-updated');
  return all.reverse();
}

export async function deleteProject(id: string): Promise<void> {
  await (await getDb()).delete('projects', id);
}
