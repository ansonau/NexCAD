import { describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { pilotDiameter } from './screws';
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
  // reserveCornerSpace: false 隔離基本 margin/wall 幾何計算，不受 D1 擴殼影響（擴殼另有專屬測試）。
  const NO_EXPANSION_PARAMS = { ...DEFAULT_ENCLOSURE_PARAMS, reserveCornerSpace: false };

  it('內腔比零件範圍多出 clearanceMargin，外殼比內腔多出 wallThickness', () => {
    const plan = planShell([instance()], NO_EXPANSION_PARAMS);
    const margin = NO_EXPANSION_PARAMS.clearanceMargin;
    const wall = NO_EXPANSION_PARAMS.wallThickness;
    expect(plan.inner.minX).toBeCloseTo(-20 - margin, 6);
    expect(plan.inner.maxX).toBeCloseTo(20 + margin, 6);
    expect(plan.outer.minX).toBeCloseTo(-20 - margin - wall, 6);
    expect(plan.outer.maxX).toBeCloseTo(20 + margin + wall, 6);
  });

  it('外殼底部比零件底部低一個壁厚，頂部開放（等於內腔頂）', () => {
    const plan = planShell([instance()], NO_EXPANSION_PARAMS);
    expect(plan.outer.minZ).toBeCloseTo(-NO_EXPANSION_PARAMS.wallThickness, 6);
    expect(plan.outer.maxZ).toBeCloseTo(plan.inner.maxZ, 6);
    expect(plan.floorZ).toBeCloseTo(plan.outer.minZ, 6);
  });

  it('cornerRadius 被限制在不超過外形寬/深的一半', () => {
    const tiny = planShell([instance()], { ...NO_EXPANSION_PARAMS, cornerRadius: 1000 });
    const width = tiny.outer.maxX - tiny.outer.minX;
    const depth = tiny.outer.maxY - tiny.outer.minY;
    expect(tiny.cornerRadius).toBeLessThan(width / 2);
    expect(tiny.cornerRadius).toBeLessThan(depth / 2);
  });

  // Task 2.1/2.4: D1 擴殼——預設參數下（reserveCornerSpace 開啟），outer 應比未擴殼時大，
  // 且擴量至少讓角柱與零件保持安全距離（見 design.md 預設案例：e ≈ 3.5mm）。
  it('reserveCornerSpace 開啟時（預設）outer 比未擴殼時大，擴量約為 design.md 推導的 3.5mm', () => {
    const expanded = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const unexpanded = planShell([instance()], NO_EXPANSION_PARAMS);
    const widthDelta = (expanded.outer.maxX - expanded.outer.minX) - (unexpanded.outer.maxX - unexpanded.outer.minX);
    expect(widthDelta).toBeCloseTo(7, 6); // e=3.5 兩側各 +3.5 → 寬度 +7
  });

  it('reserveCornerSpace: false 時擴殼邏輯完全不生效，即使零件覆蓋角柱位置', () => {
    const expanded = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const unexpanded = planShell([instance()], NO_EXPANSION_PARAMS);
    expect(unexpanded.outer).not.toEqual(expanded.outer);
    expect(unexpanded.outer.minX).toBeCloseTo(-26, 6);
    expect(unexpanded.outer.maxX).toBeCloseTo(26, 6);
  });

  it('lidType 非 screw 時擴殼邏輯不生效', () => {
    const openLid = planShell([instance()], { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'open' });
    const unexpanded = planShell([instance()], NO_EXPANSION_PARAMS);
    expect(openLid.outer.minX).toBeCloseTo(unexpanded.outer.minX, 6);
    expect(openLid.outer.maxX).toBeCloseTo(unexpanded.outer.maxX, 6);
  });
});

describe('planStandoffs', () => {
  it('每個安裝孔對應一個支柱，座標為世界座標', () => {
    const standoffs = planStandoffs([instance({ position: [10, 0, 5] })], 'M3');
    expect(standoffs).toHaveLength(2);
    expect(standoffs[0].x).toBeCloseTo(10 - 15, 6);
    expect(standoffs[0].topZ).toBeCloseTo(5, 6);
  });

  it('可覆寫導孔深度', () => {
    const standoffs = planStandoffs([instance()], 'M3', 9);
    expect(standoffs.every((s) => s.pilotDepth === 9)).toBe(true);
  });
});

describe('planCornerPosts', () => {
  it('回傳外殼四個角落的支柱，頂部對齊內腔頂', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const posts = planCornerPosts(plan, 'M3', []);
    expect(posts).toHaveLength(4);
    for (const p of posts) {
      expect(p.topZ).toBeCloseTo(plan.inner.maxZ, 6);
      expect(p.x).toBeGreaterThan(plan.outer.minX);
      expect(p.x).toBeLessThan(plan.outer.maxX);
      expect(p.collided).toBeFalsy();
    }
  });

  it('可覆寫導孔深度', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const posts = planCornerPosts(plan, 'M3', [], 9);
    expect(posts.every((p) => p.pilotDepth === 9)).toBe(true);
  });

  it('柱位固定在角落標準位置（inset = cornerRadius+3），不受零件位置影響', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const smallPart = instance({ position: [1000, 1000, 0] });
    const posts = planCornerPosts(plan, 'M3', [smallPart]);
    const naive = planCornerPosts(plan, 'M3', []);
    for (let i = 0; i < posts.length; i++) {
      expect(posts[i].x).toBeCloseTo(naive[i].x, 6);
      expect(posts[i].y).toBeCloseTo(naive[i].y, 6);
      expect(posts[i].collided).toBeFalsy();
    }
  });

  // Task 2.1: 預設參數（reserveCornerSpace 開啟）下，planShell 擴殼後
  // 四支角柱皆在標準角落位置、與零件 bbox 距離 ≥ collisionRadius、collided 皆 falsy。
  it('預設參數：planShell 擴殼後四柱在標準位置且與零件保持安全距離，collided 皆為 falsy', () => {
    const params = DEFAULT_ENCLOSURE_PARAMS; // reserveCornerSpace: true, lidType: 'screw'
    const plan = planShell([instance()], params);
    const posts = planCornerPosts(plan, params.screwSize, [instance()]);
    expect(posts).toHaveLength(4);

    const inset = plan.cornerRadius + 3;
    const expectedXs = [plan.outer.minX + inset, plan.outer.maxX - inset];
    const expectedYs = [plan.outer.minY + inset, plan.outer.maxY - inset];

    const collisionRadius =
      pilotDiameter(params.screwSize, 'through') / 2 +
      Math.max(params.wallThickness, params.standoffWallPadding);
    const b = partWorldBounds(instance());

    for (const p of posts) {
      expect(expectedXs.some((x) => Math.abs(x - p.x) < 1e-6)).toBe(true);
      expect(expectedYs.some((y) => Math.abs(y - p.y) < 1e-6)).toBe(true);
      const clampedX = Math.max(b.minX, Math.min(p.x, b.maxX));
      const clampedY = Math.max(b.minY, Math.min(p.y, b.maxY));
      const dist = Math.hypot(p.x - clampedX, p.y - clampedY);
      expect(dist).toBeGreaterThanOrEqual(collisionRadius - 1e-9);
      expect(p.collided).toBeFalsy();
    }
  });

  // Task 2.2: reserveCornerSpace: false → outer 尺寸與「無擴殼邏輯」時一致（舊版行為），
  // 柱在標準位置；柱心恰在 bbox 角上（邊界相切）不算碰撞。
  it('reserveCornerSpace: false 時 outer 不擴大，柱心恰在零件 bbox 角上（邊界相切）時 collided 為 falsy', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, reserveCornerSpace: false };
    const plan = planShell([instance()], params);
    const margin = params.clearanceMargin;
    const wall = params.wallThickness;
    // 未擴殼：與 clearanceMargin/wallThickness 直接推算的舊版尺寸一致
    expect(plan.outer.minX).toBeCloseTo(-20 - margin - wall, 6);
    expect(plan.outer.maxX).toBeCloseTo(20 + margin + wall, 6);
    expect(plan.outer.minY).toBeCloseTo(-10 - margin - wall, 6);
    expect(plan.outer.maxY).toBeCloseTo(10 + margin + wall, 6);

    // 預設案例下，角柱 (20,10) 恰好落在零件 bbox 的角上（見既有註解推導）
    const part = instance();
    const posts = planCornerPosts(plan, params.screwSize, [part]);
    const inset = plan.cornerRadius + 3;
    expect(inset).toBeCloseTo(6, 6);
    const target = posts.find((p) => p.x > 0 && p.y > 0)!;
    expect(target.x).toBeCloseTo(20, 6);
    expect(target.y).toBeCloseTo(10, 6);
    expect(target.collided).toBeFalsy();
  });

  // Task 2.3a: reserveCornerSpace: false，零件涵蓋角柱位置 → 柱心嚴格落入 bbox 內部 → collided true。
  it('reserveCornerSpace: false 且柱心嚴格落入零件 bbox 內部時，collided 為 true', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, reserveCornerSpace: false };
    const plan = planShell([instance()], params);
    // 巨大零件涵蓋整個殼體範圍，四個角柱中心都嚴格落在零件 bbox 內部
    const hugePart: PartInstance = {
      def: { ...boardDef, body: { size: [1000, 1000, 2], blocks: [] } },
      transform: { ...instance().transform },
    };
    const posts = planCornerPosts(plan, params.screwSize, [hugePart]);
    for (const p of posts) {
      expect(p.collided).toBe(true);
    }
  });

  // Task 2.3b: reserveCornerSpace: true，但擴殼迭代達 12mm 上限仍無法讓角柱脫離零件 → collided 仍為 true（安全網）。
  // 用大 cornerRadius 撐大 inset（inset=cornerRadius+3），讓角柱標準位置本就深陷零件 bbox 內部
  // （margin+wall-inset = 3+3-23 = -17，超出 12mm 擴殼上限也無法脫離），零件夠大以免 cornerRadius 被 clamp。
  it('reserveCornerSpace: true 但角柱標準位置深陷零件內部，擴殼達 12mm 上限仍無解時 collided 為 true', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, cornerRadius: 20 };
    const hugePart: PartInstance = {
      def: { ...boardDef, body: { size: [1000, 1000, 2], blocks: [] } },
      transform: { ...instance().transform },
    };
    const plan = planShell([hugePart], params);
    // 擴殼確實跑到上限，但仍不足以讓角柱脫離零件 bbox
    const unexpanded = planShell([hugePart], { ...params, reserveCornerSpace: false });
    const widthDelta = (plan.outer.maxX - plan.outer.minX) - (unexpanded.outer.maxX - unexpanded.outer.minX);
    expect(widthDelta).toBeCloseTo(24, 6); // e 撐到上限 12mm，兩側各 +12

    const posts = planCornerPosts(plan, params.screwSize, [hugePart]);
    for (const p of posts) {
      expect(p.collided).toBe(true);
    }
  });
});
