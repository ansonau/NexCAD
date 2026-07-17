import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { DEFAULT_ENCLOSURE_PARAMS, planShell, planStandoffs } from './plan';
import type { PartInstance } from './plan';
import { buildShellSolid } from './shellGeometry';

const kernel = new ManifoldKernel();

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
});
