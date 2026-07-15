import { describe, expect, it } from 'vitest';
import { createPartNode, createPrimitive } from '../types/document';
import { pilotDiameter } from './screws';
import { primitiveZRange, projectPartHoles } from './holeProjection';

describe('primitiveZRange', () => {
  it('box：底部為 transform.position.z，頂部加上 height', () => {
    const box = createPrimitive('box');
    box.transform.position = [0, 0, 5];
    expect(primitiveZRange(box)).toEqual({ min: 5, max: 25 });
  });

  it('sphere：頂部為底部加兩倍半徑', () => {
    const sphere = createPrimitive('sphere');
    expect(primitiveZRange(sphere)).toEqual({ min: 0, max: 20 });
  });
});

describe('projectPartHoles', () => {
  it('每個安裝孔對應一個投影孔，XY 對齊零件孔位', () => {
    const part = createPartNode('arduino-nano', 'Nano');
    part.transform.position = [10, 0, 0];
    const holes = projectPartHoles(part, { min: -2, max: 0 }, 'M2');
    expect(holes).toHaveLength(4);
    for (const h of holes) {
      expect(h.role).toBe('hole');
      expect(h.params.radius).toBeCloseTo(pilotDiameter('M2', 'selfTap') / 2, 6);
    }
  });

  it('找不到零件定義時回傳空陣列', () => {
    const part = createPartNode('does-not-exist', 'ghost');
    expect(projectPartHoles(part, { min: 0, max: 1 }, 'M3')).toEqual([]);
  });
});
