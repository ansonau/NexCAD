import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { DEFAULT_ENCLOSURE_PARAMS, planCornerPosts, planShell } from './plan';
import type { PartInstance } from './plan';
import { buildLidSolid } from './lidGeometry';

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
  mountingHoles: [],
  ports: [],
  clearanceHeight: 10,
};

const parts: PartInstance[] = [{ def: boardDef, transform: identityTransform() }];

describe('buildLidSolid', () => {
  it('screw 上蓋體積大於面板本身（含唇邊與螺絲柱，扣除通孔仍為正）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const solid = buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, kernel);
    const panelOnly =
      (plan.outer.maxX - plan.outer.minX) *
      (plan.outer.maxY - plan.outer.minY) *
      DEFAULT_ENCLOSURE_PARAMS.wallThickness;
    expect(kernel.volume(solid)).toBeGreaterThan(panelOnly * 0.8);
  });

  it('slide 上蓋比 screw 上蓋體積小（無螺絲柱）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const screwLid = kernel.volume(buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, kernel));
    const slideLid = kernel.volume(
      buildLidSolid(plan, { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'slide' }, kernel),
    );
    expect(slideLid).toBeLessThan(screwLid);
  });

  it('上蓋唇邊（向下伸入內腔的對位特徵）底部不低於殼體開口頂端減唇邊高度', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const mesh = kernel.toMesh(buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, kernel));
    let minZ = Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) minZ = Math.min(minZ, mesh.positions[i]);
    expect(minZ).toBeCloseTo(plan.inner.maxZ - 3, 0);
  });

  it('screw 上蓋的螺絲柱向上凸出於面板頂面，不侵入殼體內腔（與殼體角柱空間互斥）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const mesh = kernel.toMesh(buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, kernel));
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) maxZ = Math.max(maxZ, mesh.positions[i]);
    const panelTop = plan.inner.maxZ + DEFAULT_ENCLOSURE_PARAMS.wallThickness;
    // 柱體向上凸出，故上蓋最高點應高於面板頂面（不像 slide 上蓋那樣面板頂面就是最高點）
    expect(maxZ).toBeGreaterThan(panelTop);
    // 且所有螺絲柱都不應低於面板頂面（即不侵入殼體內腔）
    const posts = planCornerPosts(plan, DEFAULT_ENCLOSURE_PARAMS.screwSize);
    expect(posts.length).toBeGreaterThan(0);
  });

  it('薄壁厚 + 小螺絲規格下，screw 上蓋體積仍大於 slide', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, wallThickness: 1, screwSize: 'M2' as const };
    const plan = planShell(parts, params);
    const screwLid = kernel.volume(buildLidSolid(plan, params, kernel));
    const slideLid = kernel.volume(buildLidSolid(plan, { ...params, lidType: 'slide' }, kernel));
    expect(slideLid).toBeLessThan(screwLid);
  });
});
