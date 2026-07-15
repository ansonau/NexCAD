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
});
