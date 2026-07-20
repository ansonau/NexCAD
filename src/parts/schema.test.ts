import { describe, expect, it } from 'vitest';
import { partDefinitionSchema } from './schema';

const validPart = {
  id: 'test-part',
  name: 'Test Part',
  nameZh: '測試零件',
  category: 'board',
  body: { size: [20, 10, 1.6] },
  clearanceHeight: 5,
};

describe('partDefinitionSchema', () => {
  it('合法定義通過並套用預設值', () => {
    const parsed = partDefinitionSchema.parse(validPart);
    expect(parsed.body.blocks).toEqual([]);
    expect(parsed.mountingHoles).toEqual([]);
    expect(parsed.ports).toEqual([]);
  });

  it('拒絕大寫或含空白的 id', () => {
    expect(partDefinitionSchema.safeParse({ ...validPart, id: 'Bad ID' }).success).toBe(false);
  });

  it('拒絕未知分類', () => {
    expect(partDefinitionSchema.safeParse({ ...validPart, category: 'misc' }).success).toBe(false);
  });

  it('拒絕非正的孔徑與淨空高度', () => {
    expect(
      partDefinitionSchema.safeParse({
        ...validPart,
        mountingHoles: [{ x: 0, y: 0, diameter: 0 }],
      }).success,
    ).toBe(false);
    expect(partDefinitionSchema.safeParse({ ...validPart, clearanceHeight: -1 }).success).toBe(false);
  });

  it('接受完整的 blocks/holes/ports', () => {
    const parsed = partDefinitionSchema.parse({
      ...validPart,
      body: {
        size: [20, 10, 1.6],
        blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [5, 5, 8], label: '燈體' }],
      },
      mountingHoles: [{ x: 5, y: 3, diameter: 3.2 }, { x: -5, y: -3, diameter: 3.2, z: 10 }],
      ports: [{ face: 'west', shape: 'rect', x: 0, z: 0, w: 12, h: 11, label: 'USB' }],
    });
    expect(parsed.mountingHoles).toHaveLength(2);
    expect(parsed.ports[0].face).toBe('west');
  });

  it('block color：接受 #RRGGBB、拒絕非法格式', () => {
    const withColor = (color: string) => ({
      ...validPart,
      body: {
        size: [20, 10, 1.6],
        blocks: [{ shape: 'box', position: [0, 0, 0], size: [1, 1, 1], color }],
      },
    });
    expect(partDefinitionSchema.safeParse(withColor('#2b2d30')).success).toBe(true);
    for (const bad of ['red', '#fff', '#12345g', '2b2d30']) {
      expect(partDefinitionSchema.safeParse(withColor(bad)).success, `應拒絕 ${bad}`).toBe(false);
    }
  });

  it('mountingHole standoff：缺省 undefined、接受 false', () => {
    const parsed = partDefinitionSchema.parse({
      ...validPart,
      mountingHoles: [{ x: 0, y: 0, diameter: 3 }, { x: 1, y: 0, diameter: 3, standoff: false }],
    });
    expect(parsed.mountingHoles[0].standoff).toBeUndefined();
    expect(parsed.mountingHoles[1].standoff).toBe(false);
  });

  it('body.cornerRadius：接受非負、拒絕負值、缺省 undefined', () => {
    expect(
      partDefinitionSchema.parse({ ...validPart, body: { size: [20, 10, 1.6], cornerRadius: 10 } })
        .body.cornerRadius,
    ).toBe(10);
    expect(
      partDefinitionSchema.safeParse({ ...validPart, body: { size: [20, 10, 1.6], cornerRadius: -1 } })
        .success,
    ).toBe(false);
    expect(partDefinitionSchema.parse(validPart).body.cornerRadius).toBeUndefined();
  });
});
