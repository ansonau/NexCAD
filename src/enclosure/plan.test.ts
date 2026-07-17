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

  it('無碰撞的小零件不受角柱避讓影響（既有行為不變）', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    // 零件遠離所有角落（放在殼體中心附近的小零件不會與四角重疊）
    const smallPart = instance({ position: [1000, 1000, 0] });
    const posts = planCornerPosts(plan, 'M3', [smallPart]);
    const naive = planCornerPosts(plan, 'M3', []);
    for (let i = 0; i < posts.length; i++) {
      expect(posts[i].x).toBeCloseTo(naive[i].x, 6);
      expect(posts[i].y).toBeCloseTo(naive[i].y, 6);
      expect(posts[i].collided).toBeFalsy();
    }
  });

  it('零件覆蓋一個角落時，該角柱沿邊搜尋移到無碰撞位置', () => {
    // DEFAULT_ENCLOSURE_PARAMS: wallThickness=3, clearanceMargin=3, standoffWallPadding=3, screwSize M3
    // boardDef size [40,20,2] at origin → partWorldBounds: X[-20,20] Y[-10,10] Z[0,10]
    // planShell: inner X[-23,23] Y[-13,13], outer X[-26,26] Y[-16,16]
    // cornerRadius = min(3, 26-0.1, 16-0.1) = 3 → inset = 3+3 = 6
    // 角柱原始位置：(±20, ±10)，其中 (20,10) 落在零件邊界內 (X<=20,Y<=10) → 必碰撞
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const part = instance();
    const naive = planCornerPosts(plan, 'M3', []);
    const target = naive.find((p) => p.x > 0 && p.y > 0)!;

    const posts = planCornerPosts(plan, 'M3', [part]);
    const moved = posts.find((p) => p.x > 0 && p.y > 0)!;

    expect(moved.collided).toBeFalsy();
    const moved2D = moved.x !== target.x || moved.y !== target.y;
    expect(moved2D).toBe(true);

    // collisionRadius = pilotDiameter(M3, 'through')/2 + max(wallThickness, standoffWallPadding)
    const collisionRadius =
      pilotDiameter('M3', 'through') / 2 + Math.max(DEFAULT_ENCLOSURE_PARAMS.wallThickness, DEFAULT_ENCLOSURE_PARAMS.standoffWallPadding);
    const b = partWorldBounds(part);
    const clampedX = Math.max(b.minX, Math.min(moved.x, b.maxX));
    const clampedY = Math.max(b.minY, Math.min(moved.y, b.maxY));
    const dist = Math.hypot(moved.x - clampedX, moved.y - clampedY);
    expect(dist).toBeGreaterThanOrEqual(collisionRadius);
  });

  it('零件塞滿整條邊緣，搜尋範圍內找不到解時維持原位置並標記 collided', () => {
    // 用一個涵蓋整個殼體 X 範圍、且 Y 涵蓋角柱所屬水平邊與大半垂直邊的巨大零件，
    // 讓水平/垂直兩個搜尋方向在 limit 內都無法脫離碰撞範圍。
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const hugePart: PartInstance = {
      def: {
        ...boardDef,
        body: { size: [1000, 1000, 2], blocks: [] },
      },
      transform: { ...instance().transform },
    };
    const naive = planCornerPosts(plan, 'M3', []);
    const posts = planCornerPosts(plan, 'M3', [hugePart]);
    for (let i = 0; i < posts.length; i++) {
      expect(posts[i].collided).toBe(true);
      expect(posts[i].x).toBeCloseTo(naive[i].x, 6);
      expect(posts[i].y).toBeCloseTo(naive[i].y, 6);
    }
  });

  it('搜尋上限不可讓角柱中心超出殼體 outer 邊界（code review 發現的迴歸測試）', () => {
    // DEFAULT_ENCLOSURE_PARAMS 下 outer X=[-26,26] Y=[-16,16]，角柱 (20,10)。
    // inset = cornerRadius(3)+3 = 6 → 該角柱到 outer.maxX/maxY 的實際餘裕僅 6，
    // 但舊版 limit = floor(min(width,depth)/4) = 8，與餘裕完全脫鉤。
    // 建構一個零件，使其 bounding box 恰好需要 offset=7 才能脫離碰撞（見審查發現的反例）：
    // X=[-100,22] Y=[5,15] → 角柱在 x 方向的舊版搜尋會停在 offsetX=7（post.x=27），超出 outer.maxX=26。
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const collidingPart: PartInstance = {
      def: { ...boardDef, body: { size: [122, 10, 2], blocks: [] } },
      transform: { ...identityTransform(), position: [-39, 10, 0] },
    };
    const posts = planCornerPosts(plan, 'M3', [collidingPart]);

    for (const p of posts) {
      expect(p.x).toBeGreaterThanOrEqual(plan.outer.minX);
      expect(p.x).toBeLessThanOrEqual(plan.outer.maxX);
      expect(p.y).toBeGreaterThanOrEqual(plan.outer.minY);
      expect(p.y).toBeLessThanOrEqual(plan.outer.maxY);
    }

    // 該角落（20,10）在修正後的搜尋範圍內無解（水平/垂直方向皆被 outer 邊界限制在 6mm 內，
    // 不足以脫離此零件），必須誠實回報 collided，而非把支柱悄悄推到殼體外。
    const targetCorner = posts.find((p) => p.x > 0 && p.y > 0)!;
    expect(targetCorner.collided).toBe(true);
  });
});
