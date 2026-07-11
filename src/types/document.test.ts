import { describe, expect, it } from 'vitest';
import { createPrimitive, emptyDocument, identityTransform, newId } from './document';

describe('document model', () => {
  it('createPrimitive 套用該形狀的預設參數', () => {
    const box = createPrimitive('box');
    expect(box.type).toBe('primitive');
    expect(box.kind).toBe('box');
    expect(box.role).toBe('solid');
    expect(box.params).toEqual({ width: 20, depth: 20, height: 20 });
    expect(box.transform).toEqual(identityTransform());
    expect(box.visible).toBe(true);
  });

  it('每個節點有唯一 id', () => {
    const a = createPrimitive('box');
    const b = createPrimitive('box');
    expect(a.id).not.toBe(b.id);
  });

  it('createPrimitive 可覆寫欄位', () => {
    const hole = createPrimitive('cylinder', { role: 'hole', name: '螺絲孔' });
    expect(hole.role).toBe('hole');
    expect(hole.name).toBe('螺絲孔');
    expect(hole.params).toEqual({ radius: 10, height: 20 });
  });

  it('emptyDocument 是 mm 單位的空文件', () => {
    const doc = emptyDocument();
    expect(doc).toEqual({ version: 1, name: '未命名專案', units: 'mm', nodes: [] });
  });

  it('newId 使用 UUID 格式且大量生成不重複', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
    expect(newId()).toMatch(/^n_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
