import { describe, expect, it } from 'vitest';
import { PART_LIBRARY, getPartDefinition } from './library';
import { SMART_CAR_PRESET, buildSmartCarNodes } from './presets';

describe('SMART_CAR_PRESET', () => {
  it('每個 partId 都存在於 PART_LIBRARY', () => {
    const ids = new Set(PART_LIBRARY.map((p) => p.id));
    for (const { partId } of SMART_CAR_PRESET) {
      expect(ids.has(partId), `未知零件 id "${partId}"`).toBe(true);
    }
  });

  it('俯視 AABB（含 90° 旋轉）兩兩不相交', () => {
    type Box = { minX: number; maxX: number; minY: number; maxY: number };
    const boxes: Box[] = SMART_CAR_PRESET.map(({ partId, x, y, rotZ }) => {
      const def = getPartDefinition(partId)!;
      const [width, depth] = def.body.size;
      const rotated = ((rotZ % 180) + 180) % 180 === 90;
      const halfX = (rotated ? depth : width) / 2;
      const halfY = (rotated ? width : depth) / 2;
      return { minX: x - halfX, maxX: x + halfX, minY: y - halfY, maxY: y + halfY };
    });

    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapping = !(
          a.maxX <= b.minX ||
          b.maxX <= a.minX ||
          a.maxY <= b.minY ||
          b.maxY <= a.minY
        );
        expect(
          overlapping,
          `零件 #${i} (${SMART_CAR_PRESET[i].partId}) 與 #${j} (${SMART_CAR_PRESET[j].partId}) 的俯視 AABB 重疊`,
        ).toBe(false);
      }
    }
  });
});

describe('buildSmartCarNodes', () => {
  for (const lang of ['zh', 'en']) {
    it(`lang="${lang}"：回傳 6 個 part 節點，位置/旋轉/名稱正確`, () => {
      const nodes = buildSmartCarNodes(lang);
      expect(nodes).toHaveLength(6);
      nodes.forEach((node, i) => {
        const preset = SMART_CAR_PRESET[i];
        const def = getPartDefinition(preset.partId)!;
        expect(node.type).toBe('part');
        expect(node.partId).toBe(preset.partId);
        expect(node.transform.position).toEqual([preset.x, preset.y, 0]);
        expect(node.transform.rotation).toEqual([0, 0, preset.rotZ]);
        expect(node.name).toBe(lang === 'zh' ? def.nameZh : def.name);
      });
    });
  }

  it('查無零件 id 時 throw', () => {
    const entry = SMART_CAR_PRESET[0] as { partId: string };
    const original = entry.partId;
    entry.partId = 'no-such-part';
    try {
      expect(() => buildSmartCarNodes('en')).toThrow();
    } finally {
      entry.partId = original;
    }
  });
});
