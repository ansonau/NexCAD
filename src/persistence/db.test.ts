import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDocument } from '../types/document';
import { deleteProject, listProjects, loadProject, saveProject } from './db';

const record = (id: string, updatedAt: number) => ({
  id,
  name: `專案 ${id}`,
  updatedAt,
  doc: emptyDocument(`專案 ${id}`),
});

beforeEach(async () => {
  for (const p of await listProjects()) await deleteProject(p.id);
});

describe('persistence/db', () => {
  it('save 後可 load 回相同內容', async () => {
    await saveProject(record('a', 100));
    const loaded = await loadProject('a');
    expect(loaded?.name).toBe('專案 a');
    expect(loaded?.doc.units).toBe('mm');
  });

  it('list 依 updatedAt 新到舊排序', async () => {
    await saveProject(record('old', 100));
    await saveProject(record('new', 200));
    const all = await listProjects();
    expect(all.map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('save 相同 id 為覆寫', async () => {
    await saveProject(record('a', 100));
    await saveProject({ ...record('a', 300), name: '改名' });
    expect(await listProjects()).toHaveLength(1);
    expect((await loadProject('a'))?.name).toBe('改名');
  });

  it('delete 移除專案', async () => {
    await saveProject(record('a', 100));
    await deleteProject('a');
    expect(await loadProject('a')).toBeUndefined();
  });
});
