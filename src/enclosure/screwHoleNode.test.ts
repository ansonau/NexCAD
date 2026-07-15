import { describe, expect, it } from 'vitest';
import { SCREW_TABLE } from './screws';
import { createScrewHoleNode } from './screwHoleNode';

describe('createScrewHoleNode', () => {
  it('through 樣式產生單一圓柱孔節點，半徑符合通孔尺寸', () => {
    const node = createScrewHoleNode('M3', 'through');
    expect(node.type).toBe('primitive');
    expect(node.role).toBe('hole');
    expect(node.type === 'primitive' && node.params.radius).toBeCloseTo(SCREW_TABLE.M3.throughDiameter / 2, 6);
  });

  it('selfTap 樣式半徑符合自攻導孔尺寸', () => {
    const node = createScrewHoleNode('M3', 'selfTap');
    expect(node.type === 'primitive' && node.params.radius).toBeCloseTo(SCREW_TABLE.M3.selfTapDiameter / 2, 6);
  });

  it('countersink 樣式產生含導孔與錐面兩個子節點的群組，role 為 hole', () => {
    const node = createScrewHoleNode('M3', 'countersink');
    expect(node.type).toBe('group');
    expect(node.role).toBe('hole');
    expect(node.type === 'group' && node.children).toHaveLength(2);
    expect(node.type === 'group' && node.children.map((c) => c.type === 'primitive' && c.kind)).toEqual([
      'cylinder',
      'cone',
    ]);
  });
});
