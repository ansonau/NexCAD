import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { DEFAULT_ENCLOSURE_PARAMS, planCornerPosts, planShell, planStandoffs } from './plan';
import type { PartInstance } from './plan';
import { buildShellSolid } from './shellGeometry';
import { counterboreDepth, counterboreRadius } from './counterbore';
import { pilotDiameter } from './screws';

const kernel = new ManifoldKernel();

/** 探測殼體實際外底面（Z 最小值），供加厚/沉孔驗證用（本檔案沒有現成的 bounding-box API，直接掃 mesh 頂點） */
function meshMinZ(solid: ReturnType<typeof buildShellSolid>): number {
  const mesh = kernel.toMesh(solid);
  let minZ = Infinity;
  for (let i = 2; i < mesh.positions.length; i += 3) {
    minZ = Math.min(minZ, mesh.positions[i]);
  }
  return minZ;
}

/** 探測方塊在 solid 內的實心比例（0=完全空、~1=完全實心），沿用本檔案既有 probe-box 手法 */
function probeSolidRatio(solid: ReturnType<typeof buildShellSolid>, x: number, y: number, z: number, size = 0.5): number {
  const probe = kernel.transform(kernel.box(size, size, size), {
    position: [x, y, z],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
  const probeVolume = kernel.volume(probe);
  const intersection = kernel.difference(probe, kernel.difference(probe, solid));
  return kernel.volume(intersection) / probeVolume;
}

beforeAll(async () => {
  await kernel.init();
});

const boardDef: PartDefinition = {
  id: 'test-board',
  name: 'Test',
  nameZh: '測試板',
  category: 'board',
  body: { size: [40, 20, 2], blocks: [] },
  mountingHoles: [{ x: -15, y: -5, diameter: 3 }],
  ports: [],
  clearanceHeight: 10,
};

const parts: PartInstance[] = [{ def: boardDef, transform: identityTransform() }];

describe('buildShellSolid', () => {
  it('殼體體積小於外框方塊、大於內腔挖空後的下限（是中空的殼）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const solid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, [], kernel);
    const v = kernel.volume(solid);
    const outerBoxVolume =
      (plan.outer.maxX - plan.outer.minX) *
      (plan.outer.maxY - plan.outer.minY) *
      (plan.outer.maxZ - plan.outer.minZ);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(outerBoxVolume);
  });

  it('加入支柱後體積增加', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const noStandoff = kernel.volume(buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, [], kernel));
    const standoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize);
    const withStandoff = kernel.volume(
      buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, standoffs, kernel),
    );
    expect(withStandoff).toBeGreaterThan(noStandoff);
  });

  it('殼體是單一封閉 mesh（三角形數為正且可整除 3）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const mesh = kernel.toMesh(buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, [], kernel));
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(mesh.indices.length % 3).toBe(0);
  });

  it('standoffWallPadding 增大時支柱更粗、總體積更大', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const standoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize);
    const thin = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, standoffs, kernel, 1.5);
    const thick = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, standoffs, kernel, 4);
    expect(kernel.volume(thick)).toBeGreaterThan(kernel.volume(thin));
  });

  it('支柱鎖點貼近地板時，導孔不會鑽穿殼體外底面', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const standoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize);
    const solid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, standoffs, kernel);
    // 探測殼體外底面正下方一點點，且對齊支柱鎖點的 x/y（不是殼體中心）：
    // 若導孔鑽穿到這裡，這個點應該是實心（在殼體內）。
    // 用一個薄探測方塊疊在支柱鎖點正下方的外底面，體積差應接近方塊全部體積（沒被挖空）
    const s0 = standoffs[0];
    const probe = kernel.transform(kernel.box(1, 1, 0.5), {
      position: [s0.x, s0.y, plan.floorZ + 0.1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    const probeVolume = kernel.volume(probe);
    const intersection = kernel.difference(probe, kernel.difference(probe, solid));
    expect(kernel.volume(intersection)).toBeGreaterThan(probeVolume * 0.9);
  });

  it('零件貼齊內腔底時，螺絲支柱不會高過零件安裝孔平面', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const standoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize);
    const solid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, standoffs, kernel);
    const s = standoffs[0];
    expect(s.topZ).toBeGreaterThan(plan.inner.minZ);
    expect(probeSolidRatio(solid, s.x + 2.5, s.y, s.topZ - 0.5)).toBeGreaterThan(0.9);
    expect(probeSolidRatio(solid, s.x, s.y, s.topZ - 0.5)).toBeLessThan(0.1);
    expect(probeSolidRatio(solid, s.x + boardDef.mountingHoles[0].diameter / 2 - 0.1, s.y, s.topZ - 0.2, 0.1)).toBeLessThan(0.1);
    expect(probeSolidRatio(solid, s.x, s.y, s.topZ + 0.5)).toBeLessThan(0.1);
  });

  it('支柱根部無倒角環（柱外緊鄰根部應為空）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const standoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize);
    const wall = DEFAULT_ENCLOSURE_PARAMS.wallThickness;
    const solid = buildShellSolid(plan, wall, standoffs, kernel);
    const s = standoffs[0];
    const postRadius = s.pilotDiameter / 2 + wall;
    const rootZ = Math.max(plan.inner.minZ, plan.floorZ);

    const probe = kernel.transform(kernel.box(0.5, 0.5, 0.5), {
      position: [s.x + postRadius + wall * 0.25, s.y, rootZ + wall * 0.25],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    const intersection = kernel.difference(probe, kernel.difference(probe, solid));
    expect(kernel.volume(intersection)).toBe(0);
  });

  it('peg 模式：孔平面柱身無導孔（實心，不像螺絲模式那樣挖空）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const pegStandoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize, undefined, 'peg');
    const pegSolid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, pegStandoffs, kernel);
    const s = pegStandoffs[0];

    // 探測孔平面 topZ 正上方一小段（螺絲模式導孔會挖空的區間）：peg 模式應為實心，
    // 探測方塊完全落在殼體內，體積差應接近方塊全部體積。
    const probe = kernel.transform(kernel.box(0.5, 0.5, 0.5), {
      position: [s.x, s.y, s.topZ],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    const probeVolume = kernel.volume(probe);
    const intersection = kernel.difference(probe, kernel.difference(probe, pegSolid));
    expect(kernel.volume(intersection)).toBeGreaterThan(probeVolume * 0.9);

    // 對照：同一探測位置在螺絲模式下應是導孔挖空（幾乎沒有交集體積），
    // 證明探測點確實落在螺絲模式會鑽孔的地方，peg 模式的差異不是巧合。
    const screwStandoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize, undefined, 'screw');
    const screwSolid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, screwStandoffs, kernel);
    const screwIntersection = kernel.difference(probe, kernel.difference(probe, screwSolid));
    expect(kernel.volume(screwIntersection)).toBeLessThan(probeVolume * 0.1);
  });

  it('peg 模式：孔平面上方存在定位圓柱（探測 topZ 以上的柱體）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const pegStandoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize, undefined, 'peg');
    const solid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, pegStandoffs, kernel);
    const s = pegStandoffs[0];

    const probe = kernel.transform(kernel.box(0.5, 0.5, 1), {
      position: [s.x, s.y, s.topZ + 1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    const probeVolume = kernel.volume(probe);
    const intersection = kernel.difference(probe, kernel.difference(probe, solid));
    expect(kernel.volume(intersection)).toBeGreaterThan(probeVolume * 0.9);
  });

  describe('hole 模式（design.md D2：不長柱，只在地板挖通孔）', () => {
    it('體積不大於無 standoffs 基準（只挖孔，不加材料）', () => {
      const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
      const baseline = kernel.volume(buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, [], kernel));
      const holeStandoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize, undefined, 'hole');
      const holeSolid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, holeStandoffs, kernel);
      expect(kernel.volume(holeSolid)).toBeLessThanOrEqual(baseline);
    });

    it('通孔貫穿地板：外底面與內腔地板之間的中點應為空', () => {
      const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
      const holeStandoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize, undefined, 'hole');
      const solid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, holeStandoffs, kernel);
      const s = holeStandoffs[0];
      const midZ = (plan.floorZ + plan.inner.minZ) / 2;
      expect(probeSolidRatio(solid, s.x, s.y, midZ)).toBeLessThan(0.1);
    });

    it('孔徑等於 pilotDiameter(screwSize, "through")：半徑內為空、半徑外為實心', () => {
      const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
      const holeStandoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize, undefined, 'hole');
      const solid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, holeStandoffs, kernel);
      const s = holeStandoffs[0];
      const holeRadius = pilotDiameter(DEFAULT_ENCLOSURE_PARAMS.screwSize, 'through') / 2;
      const midZ = (plan.floorZ + plan.inner.minZ) / 2;
      // 半徑內：空
      expect(probeSolidRatio(solid, s.x + holeRadius * 0.5, s.y, midZ)).toBeLessThan(0.1);
      // 半徑外一點（radius + 0.3）：實心，證明孔沒有比預期寬
      expect(probeSolidRatio(solid, s.x + holeRadius + 0.3, s.y, midZ)).toBeGreaterThan(0.9);
    });
  });

  describe('screwEntry: fromBase（角柱通孔/沉孔對調到底座，design.md D5）', () => {
    it('flatRecessed：底板加厚量等於 counterboreDepth+wallThickness，角柱沉孔存在但柱身上段仍實心', () => {
      const params = { ...DEFAULT_ENCLOSURE_PARAMS, screwEntry: 'fromBase' as const, screwLidProfile: 'flatRecessed' as const };
      const plan = planShell(parts, params);
      const corners = planCornerPosts(plan, params.screwSize, parts);
      const solid = buildShellSolid(
        plan,
        params.wallThickness,
        corners,
        kernel,
        params.standoffWallPadding,
        params.screwEntry,
        params.screwSize,
        params.screwLidProfile,
      );

      // 底板厚度 = 原本外底面(plan.inner.minZ 往下 wallThickness) 再加上沉孔深度。
      const bottomZ = meshMinZ(solid);
      const expectedThickness = counterboreDepth(params.screwSize) + params.wallThickness;
      expect(plan.inner.minZ - bottomZ).toBeCloseTo(expectedThickness, 2);

      const c = corners[0];
      const boreDepth = counterboreDepth(params.screwSize);
      const throughRadius = pilotDiameter(params.screwSize, 'through') / 2;
      const boreRadius = counterboreRadius(params.screwSize, plan.cornerRadius, throughRadius);
      // 探測「通孔外、沉孔半徑內」的柱體材料環帶（避開通孔中心，中心無論有沒有沉孔都是空的）
      const ringRadius = (throughRadius + boreRadius) / 2;
      // 沉孔深度範圍內：應為空（杯頭沉孔挖空，不只是通孔）
      expect(probeSolidRatio(solid, c.x + ringRadius, c.y, bottomZ + 0.15)).toBeLessThan(0.1);
      // 沉孔結束、柱身還在合模面之前的一段：應為實心（柱體本身，沒有被整條鑽穿）
      expect(probeSolidRatio(solid, c.x + ringRadius, c.y, bottomZ + boreDepth + 1)).toBeGreaterThan(0.9);
    });

    it('flatExposed：底板厚度不變，只有通孔、沒有沉孔', () => {
      const params = { ...DEFAULT_ENCLOSURE_PARAMS, screwEntry: 'fromBase' as const, screwLidProfile: 'flatExposed' as const };
      const plan = planShell(parts, params);
      const corners = planCornerPosts(plan, params.screwSize, parts);
      const solid = buildShellSolid(
        plan,
        params.wallThickness,
        corners,
        kernel,
        params.standoffWallPadding,
        params.screwEntry,
        params.screwSize,
        params.screwLidProfile,
      );

      const bottomZ = meshMinZ(solid);
      expect(plan.inner.minZ - bottomZ).toBeCloseTo(params.wallThickness, 2);

      const c = corners[0];
      const throughRadius = pilotDiameter(params.screwSize, 'through') / 2;
      const boreRadius = counterboreRadius(params.screwSize, plan.cornerRadius, throughRadius);
      // 通孔中心正上方：應為空
      expect(probeSolidRatio(solid, c.x, c.y, bottomZ + 0.15)).toBeLessThan(0.1);
      // 通孔外、沉孔半徑內的位置：flatExposed 沒有沉孔，這裡應為實心（柱體材料）
      const midRadius = (throughRadius + boreRadius) / 2;
      expect(probeSolidRatio(solid, c.x + midRadius, c.y, bottomZ + 0.15)).toBeGreaterThan(0.9);
    });

    it('零件安裝柱（非角柱）不受 screwEntry 影響：fromBase 與 fromLid 體積相同', () => {
      // 用 flatExposed 讓 floorExtra=0（兩邊都不受底板加厚影響），才能單獨驗證
      // 「非角柱 standoff 自身的柱體/導孔幾何」在兩種 screwEntry 下逐位元組相同——
      // 若用 flatRecessed，floorExtra 會讓整個殼體外底面下移，體積本就會不同，
      // 那是 D5 的預期行為（見 design.md Risks），不是這裡要測的東西。
      const params = { ...DEFAULT_ENCLOSURE_PARAMS, screwLidProfile: 'flatExposed' as const };
      const plan = planShell(parts, params);
      const standoffs = planStandoffs(parts, params.screwSize);
      const fromLid = buildShellSolid(
        plan,
        params.wallThickness,
        standoffs,
        kernel,
        params.standoffWallPadding,
        'fromLid',
        params.screwSize,
        params.screwLidProfile,
      );
      const fromBase = buildShellSolid(
        plan,
        params.wallThickness,
        standoffs,
        kernel,
        params.standoffWallPadding,
        'fromBase',
        params.screwSize,
        params.screwLidProfile,
      );
      expect(kernel.volume(fromBase)).toBeCloseTo(kernel.volume(fromLid), 6);
    });
  });
});
