import { describe, expect, it } from 'vitest';
import { partDefinitionSchema } from './schema';
import { PART_LIBRARY, getPartDefinition } from './library';

describe('PART_LIBRARY', () => {
  it('共 23 個零件', () => {
    expect(PART_LIBRARY).toHaveLength(23);
  });

  it('每個定義都通過 schema 驗證', () => {
    for (const part of PART_LIBRARY) {
      const result = partDefinitionSchema.safeParse(part);
      expect(result.success, `零件 ${part.id} 未通過驗證`).toBe(true);
    }
  });

  it('id 不重複', () => {
    const ids = new Set(PART_LIBRARY.map((p) => p.id));
    expect(ids.size).toBe(23);
  });

  it('分類數量符合規格 §7', () => {
    const count = (c: string) => PART_LIBRARY.filter((p) => p.category === c).length;
    expect(count('board')).toBe(6);
    expect(count('sensor')).toBe(5);
    expect(count('power')).toBe(6);
    expect(count('component')).toBe(6);
  });

  it('getPartDefinition 依 id 查詢', () => {
    expect(getPartDefinition('arduino-uno')?.nameZh).toBe('Arduino Uno R3');
    expect(getPartDefinition('nope')).toBeUndefined();
  });

  it('安裝孔都落在主體範圍內（z=0 的孔）', () => {
    for (const part of PART_LIBRARY) {
      const [l, w] = part.body.size;
      for (const hole of part.mountingHoles.filter((h) => (h.z ?? 0) === 0)) {
        expect(Math.abs(hole.x), `${part.id} 孔 x 超界`).toBeLessThanOrEqual(l / 2);
        expect(Math.abs(hole.y), `${part.id} 孔 y 超界`).toBeLessThanOrEqual(w / 2);
      }
    }
  });
});
