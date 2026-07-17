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
  it('screw 上蓋（flatRecessed）體積大於面板本身（含唇邊，扣除通孔／沉孔仍為正）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const solid = buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, parts, kernel);
    const panelOnly =
      (plan.outer.maxX - plan.outer.minX) *
      (plan.outer.maxY - plan.outer.minY) *
      DEFAULT_ENCLOSURE_PARAMS.wallThickness;
    expect(kernel.volume(solid)).toBeGreaterThan(panelOnly * 0.8);
  });

  it('slide 上蓋比 screw 上蓋（flatRecessed，較厚面板）體積小', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const screwLid = kernel.volume(buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, parts, kernel));
    const slideLid = kernel.volume(
      buildLidSolid(plan, { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'slide' }, parts, kernel),
    );
    expect(slideLid).toBeLessThan(screwLid);
  });

  it('上蓋唇邊（向下伸入內腔的對位特徵）底部不低於殼體開口頂端減唇邊高度', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const mesh = kernel.toMesh(buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, parts, kernel));
    let minZ = Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) minZ = Math.min(minZ, mesh.positions[i]);
    expect(minZ).toBeCloseTo(plan.inner.maxZ - 3, 0);
  });

  it('薄壁厚 + 小螺絲規格下，screw 上蓋體積仍大於 slide', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, wallThickness: 1, screwSize: 'M2' as const };
    const plan = planShell(parts, params);
    const screwLid = kernel.volume(buildLidSolid(plan, params, parts, kernel));
    const slideLid = kernel.volume(buildLidSolid(plan, { ...params, lidType: 'slide' }, parts, kernel));
    expect(slideLid).toBeLessThan(screwLid);
  });

  describe('flatExposed（薄平面蓋，杯頭外露）', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'screw' as const, screwLidProfile: 'flatExposed' as const };

    it('蓋頂面平整無凸出（面板頂面上方應為空，探測點偏離孔心避開通孔本身、確認不是舊版凸柱殘留）', () => {
      const plan = planShell(parts, params);
      const lid = buildLidSolid(plan, params, parts, kernel);
      const panelZ = plan.inner.maxZ;
      const panelTop = panelZ + params.wallThickness;
      const p = planCornerPosts(plan, params.screwSize, parts)[0];
      // 偏離孔心 3.5mm：舊版凸柱（半徑約 3.7mm）在此處會是實心，平面蓋應為空
      const aboveTop = probeAt(p.x + 3.5, p.y, panelTop + 0.3);
      expect(intersectionVolume(lid, aboveTop)).toBe(0);
    });

    it('四角只挖通孔，孔位貫穿面板', () => {
      const plan = planShell(parts, params);
      const lid = buildLidSolid(plan, params, parts, kernel);
      const panelZ = plan.inner.maxZ;
      const panelTop = panelZ + params.wallThickness;
      const p = planCornerPosts(plan, params.screwSize, parts)[0];
      const inHole = probeAt(p.x, p.y, panelTop - params.wallThickness / 2);
      expect(intersectionVolume(lid, inHole)).toBe(0);
    });

    it('面板厚度等於 wallThickness（比 flatRecessed 薄）', () => {
      const plan = planShell(parts, params);
      const mesh = kernel.toMesh(buildLidSolid(plan, params, parts, kernel));
      let maxZ = -Infinity;
      for (let i = 2; i < mesh.positions.length; i += 3) maxZ = Math.max(maxZ, mesh.positions[i]);
      expect(maxZ).toBeCloseTo(plan.inner.maxZ + params.wallThickness, 1);
    });
  });

  describe('flatRecessed（厚平面蓋，杯頭藏入）— 預設值', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'screw' as const, screwLidProfile: 'flatRecessed' as const };

    it('蓋頂面平整無凸出（面板頂面上方應為空，與 flatExposed 相同的「無凸柱」不變式；探測點偏離孔心確認不是舊版凸柱殘留）', () => {
      const plan = planShell(parts, params);
      const lid = buildLidSolid(plan, params, parts, kernel);
      const spec = SCREW_TABLE[params.screwSize];
      const panelH = spec.socketHeadDepth + 0.5 + params.wallThickness; // SINK_MARGIN = 0.5
      const panelTop = plan.inner.maxZ + panelH;
      const p = planCornerPosts(plan, params.screwSize, parts)[0];
      // 偏離孔心 3.5mm：舊版凸柱（半徑約 3.7mm）在此處會是實心，平面蓋應為空
      const aboveTop = probeAt(p.x + 3.5, p.y, panelTop + 0.3);
      expect(intersectionVolume(lid, aboveTop)).toBe(0);
    });

    it('沉孔埋頭：蓋頂面正下方（杯頭容納區）為空，沉孔壁外圍（面板本體）實心', () => {
      const plan = planShell(parts, params);
      const lid = buildLidSolid(plan, params, parts, kernel);
      const spec = SCREW_TABLE[params.screwSize];
      const panelH = spec.socketHeadDepth + 0.5 + params.wallThickness;
      const panelZ = plan.inner.maxZ;
      const p = planCornerPosts(plan, params.screwSize, parts)[0];
      // 沉孔內、通孔外的中間半徑，蓋頂面下方一點 → 應為空（沉孔容納杯頭）
      const rMid = (spec.throughDiameter / 2 + spec.socketHeadDiameter / 2) / 2;
      const inBore = probeAt(p.x + rMid, p.y, panelZ + panelH - 0.5);
      expect(intersectionVolume(lid, inBore)).toBe(0);
      // 面板側邊（遠離孔位，仍在面板範圍內）→ 應為實心，確認面板本體未被整個掏空
      const solidSide = probeAt(p.x + 3.5, p.y, panelZ + panelH - 1);
      expect(intersectionVolume(lid, solidSide)).toBeGreaterThan(0);
    });

    it('通孔貫穿到底（面板底部附近孔位為空）', () => {
      const plan = planShell(parts, params);
      const lid = buildLidSolid(plan, params, parts, kernel);
      const panelZ = plan.inner.maxZ;
      const p = planCornerPosts(plan, params.screwSize, parts)[0];
      const nearBottom = probeAt(p.x, p.y, panelZ + 0.5);
      expect(intersectionVolume(lid, nearBottom)).toBe(0);
    });

    it('面板厚度 = socketHeadDepth + SINK_MARGIN + wallThickness，比 flatExposed 厚', () => {
      const exposedParams = { ...params, screwLidProfile: 'flatExposed' as const };
      const plan = planShell(parts, params);
      const recessedVol = kernel.volume(buildLidSolid(plan, params, parts, kernel));
      const exposedVol = kernel.volume(buildLidSolid(plan, exposedParams, parts, kernel));
      expect(recessedVol).toBeGreaterThan(exposedVol);

      const mesh = kernel.toMesh(buildLidSolid(plan, params, parts, kernel));
      let maxZ = -Infinity;
      for (let i = 2; i < mesh.positions.length; i += 3) maxZ = Math.max(maxZ, mesh.positions[i]);
      const spec = SCREW_TABLE[params.screwSize];
      const expectedPanelH = spec.socketHeadDepth + 0.5 + params.wallThickness;
      expect(maxZ).toBeCloseTo(plan.inner.maxZ + expectedPanelH, 1);
    });
  });

  it('未設定 screwLidProfile 時行為等同 flatRecessed（backward-compat）', () => {
    const withUndefined = { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'screw' as const, screwLidProfile: undefined };
    const withExplicit = { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'screw' as const, screwLidProfile: 'flatRecessed' as const };
    const plan = planShell(parts, withExplicit);
    const volA = kernel.volume(buildLidSolid(plan, withUndefined, parts, kernel));
    const volB = kernel.volume(buildLidSolid(plan, withExplicit, parts, kernel));
    expect(volA).toBeCloseTo(volB, 3);
  });
});
