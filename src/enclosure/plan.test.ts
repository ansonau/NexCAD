import { describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import {
  combinedBounds,
  planCornerPosts,
  planShell,
  planStandoffs,
  DEFAULT_ENCLOSURE_PARAMS,
  partWorldBounds,
} from './plan';
import type { PartInstance } from './plan';

const boardDef: PartDefinition = {
  id: 'test-board',
  name: 'Test',
  nameZh: '測試板',
  category: 'board',
  body: { size: [40, 20, 2], blocks: [] },
  mountingHoles: [
    { x: -15, y: -5, diameter: 3 },
    { x: 15, y: 5, diameter: 3 },
  ],
  ports: [],
  clearanceHeight: 10,
};

function instance(overrides: Partial<PartInstance['transform']> = {}): PartInstance {
  return { def: boardDef, transform: { ...identityTransform(), ...overrides } };
}

describe('partWorldBounds', () => {
  it('無旋轉時直接以零件尺寸與位置計算', () => {
    const b = partWorldBounds(instance());
    expect(b.minX).toBeCloseTo(-20, 6);
    expect(b.maxX).toBeCloseTo(20, 6);
    expect(b.minY).toBeCloseTo(-10, 6);
    expect(b.maxY).toBeCloseTo(10, 6);
    expect(b.minZ).toBeCloseTo(0, 6);
    expect(b.maxZ).toBeCloseTo(10, 6);
  });

  it('旋轉 90° 後長寬互換', () => {
    const b = partWorldBounds(instance({ rotation: [0, 0, 90] }));
    expect(b.maxX - b.minX).toBeCloseTo(20, 6);
    expect(b.maxY - b.minY).toBeCloseTo(40, 6);
  });

  it('位移正確反映在範圍上', () => {
    const b = partWorldBounds(instance({ position: [100, 50, 5] }));
    expect(b.minX).toBeCloseTo(80, 6);
    expect(b.maxZ).toBeCloseTo(15, 6);
  });
});

describe('combinedBounds', () => {
  it('合併多個零件的外框', () => {
    const parts = [instance({ position: [0, 0, 0] }), instance({ position: [100, 0, 0] })];
    const b = combinedBounds(parts);
    expect(b.minX).toBeCloseTo(-20, 6);
    expect(b.maxX).toBeCloseTo(120, 6);
  });

  it('空陣列時拋出明確錯誤，而非回傳 Infinity 邊界', () => {
    expect(() => combinedBounds([])).toThrow();
  });
});

describe('planShell', () => {
  it('內腔比零件範圍多出 clearanceMargin，外殼比內腔多出 wallThickness', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const margin = DEFAULT_ENCLOSURE_PARAMS.clearanceMargin;
    const wall = DEFAULT_ENCLOSURE_PARAMS.wallThickness;
    expect(plan.inner.minX).toBeCloseTo(-20 - margin, 6);
    expect(plan.inner.maxX).toBeCloseTo(20 + margin, 6);
    expect(plan.outer.minX).toBeCloseTo(-20 - margin - wall, 6);
    expect(plan.outer.maxX).toBeCloseTo(20 + margin + wall, 6);
  });

  it('外殼底部比零件底部低一個壁厚，頂部開放（等於內腔頂）', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    expect(plan.outer.minZ).toBeCloseTo(-DEFAULT_ENCLOSURE_PARAMS.wallThickness, 6);
    expect(plan.outer.maxZ).toBeCloseTo(plan.inner.maxZ, 6);
    expect(plan.floorZ).toBeCloseTo(plan.outer.minZ, 6);
  });

  it('cornerRadius 被限制在不超過外形寬/深的一半', () => {
    const tiny = planShell([instance()], { ...DEFAULT_ENCLOSURE_PARAMS, cornerRadius: 1000 });
    const width = tiny.outer.maxX - tiny.outer.minX;
    const depth = tiny.outer.maxY - tiny.outer.minY;
    expect(tiny.cornerRadius).toBeLessThan(width / 2);
    expect(tiny.cornerRadius).toBeLessThan(depth / 2);
  });
});

describe('planStandoffs', () => {
  it('每個安裝孔對應一個支柱，座標為世界座標', () => {
    const standoffs = planStandoffs([instance({ position: [10, 0, 5] })], 'M3');
    expect(standoffs).toHaveLength(2);
    expect(standoffs[0].x).toBeCloseTo(10 - 15, 6);
    expect(standoffs[0].topZ).toBeCloseTo(5, 6);
  });
});

describe('planCornerPosts', () => {
  it('回傳外殼四個角落的支柱，頂部對齊內腔頂', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const posts = planCornerPosts(plan, 'M3');
    expect(posts).toHaveLength(4);
    for (const p of posts) {
      expect(p.topZ).toBeCloseTo(plan.inner.maxZ, 6);
      expect(p.x).toBeGreaterThan(plan.outer.minX);
      expect(p.x).toBeLessThan(plan.outer.maxX);
    }
  });
});
