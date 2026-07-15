import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { DEFAULT_ENCLOSURE_PARAMS, planShell } from './plan';
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

  it('上蓋底面（不含唇邊/螺絲柱向下延伸部分）貼齊殼體開口頂端', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const mesh = kernel.toMesh(buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, kernel));
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) maxZ = Math.max(maxZ, mesh.positions[i]);
    expect(maxZ).toBeCloseTo(plan.inner.maxZ + DEFAULT_ENCLOSURE_PARAMS.wallThickness, 0);
  });

  it('薄壁厚 + 小螺絲規格下，screw 上蓋體積仍大於 slide（柱體+通孔不會淨扣體積）', () => {
    // 唇邊覆蓋了整個內腔範圍，若螺絲柱不夠深、或柱體半徑沒有相對通孔的下限保護，
    // 通孔貫穿唇邊+柱體整段厚度所扣除的體積會比柱體本身新增的還多，導致 screw
    // 上蓋淨體積反而比沒有柱體/通孔的 slide 版本小（類似 Task 4 發現的支柱/導孔崩塌問題）。
    const thinWallParams = { ...DEFAULT_ENCLOSURE_PARAMS, wallThickness: 1, screwSize: 'M2' as const };
    const plan = planShell(parts, thinWallParams);
    const screwVolume = kernel.volume(buildLidSolid(plan, thinWallParams, kernel));
    const slideVolume = kernel.volume(
      buildLidSolid(plan, { ...thinWallParams, lidType: 'slide' }, kernel),
    );
    expect(screwVolume).toBeGreaterThan(slideVolume);
  });
});
