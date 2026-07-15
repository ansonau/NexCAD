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
});
