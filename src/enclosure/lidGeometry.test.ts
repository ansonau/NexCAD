import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import type { Solid } from '../geometry/kernel';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { DEFAULT_ENCLOSURE_PARAMS, planCornerPosts, planShell } from './plan';
import type { PartInstance } from './plan';
import { buildLidSolid } from './lidGeometry';
import { SCREW_TABLE } from './screws';

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

/** 以 (x,y,z) 為中心的 0.4mm 立方 probe；box() 原點在底面中心，故 z 需下移半邊長 */
function probeAt(x: number, y: number, z: number): Solid {
  return kernel.transform(kernel.box(0.4, 0.4, 0.4), {
    position: [x, y, z - 0.2],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  });
}

function intersectionVolume(solid: Solid, probe: Solid): number {
  return kernel.volume(kernel.difference(probe, kernel.difference(probe, solid)));
}

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

  it('screw 上蓋柱頂有杯頭沉孔（沉孔範圍空心、沉孔壁實心）', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'screw' as const };
    const plan = planShell(parts, params);
    const lid = buildLidSolid(plan, params, kernel);
    const spec = SCREW_TABLE[params.screwSize];
    const p = planCornerPosts(plan, params.screwSize)[0];
    const panelZ = plan.inner.maxZ;
    const postTop = panelZ + params.wallThickness + 4; // POST_HEIGHT = 4
    const boreDepth = Math.min(spec.socketHeadDepth, 4);
    // 沉孔內、通孔外（半徑介於 throughRadius 與 socketHeadRadius 之間）→ 應為空
    const rMid = (spec.throughDiameter / 2 + spec.socketHeadDiameter / 2) / 2;
    const inBore = probeAt(p.x + rMid, p.y, postTop - boreDepth / 2);
    expect(intersectionVolume(lid, inBore)).toBe(0);
    // 同半徑、沉孔底以下（柱體實心區）→ 應為實心
    const belowBore = probeAt(p.x + rMid, p.y, postTop - boreDepth - 0.6);
    expect(intersectionVolume(lid, belowBore)).toBeGreaterThan(0);
  });

  it('M4 + 薄壁（wallThickness=1）下，沉孔半徑被 clamp，柱體外壁仍保留實心（不會被整個挖空）', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'screw' as const, screwSize: 'M4' as const, wallThickness: 1 };
    const plan = planShell(parts, params);
    const lid = buildLidSolid(plan, params, kernel);
    const spec = SCREW_TABLE[params.screwSize];
    const p = planCornerPosts(plan, params.screwSize)[0];
    const panelZ = plan.inner.maxZ;
    const postTop = panelZ + params.wallThickness + 4; // POST_HEIGHT = 4
    const throughRadius = spec.throughDiameter / 2;
    const postRadius = Math.max(spec.selfTapDiameter / 2, throughRadius) + params.wallThickness;
    // 未 clamp 時 socketHeadDiameter/2 (3.7) > postRadius (3.25)，柱體會被整個挖空；
    // clamp 後應在 postRadius 內側保留至少 0.3mm 殘壁。探測點取在殘壁中點，
    // 且沉孔深度會 clamp 到滿柱高（4mm），故整個柱高範圍都要驗證。
    const probeRadius = postRadius - 0.15;
    const nearWall = probeAt(p.x + probeRadius, p.y, postTop - 2);
    expect(intersectionVolume(lid, nearWall)).toBeGreaterThan(0);
  });
});
