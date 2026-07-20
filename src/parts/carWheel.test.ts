import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartColoredSegments, buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

/** 掃 mesh 頂點找 Z 最小值，沿用 shellGeometry.test.ts 的 meshMinZ 手法 */
function meshBounds(solid: ReturnType<typeof buildPartSolid>) {
  const mesh = kernel.toMesh(solid);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    minX = Math.min(minX, mesh.positions[i]);
    maxX = Math.max(maxX, mesh.positions[i]);
    minY = Math.min(minY, mesh.positions[i + 1]);
    maxY = Math.max(maxY, mesh.positions[i + 1]);
    minZ = Math.min(minZ, mesh.positions[i + 2]);
  }
  return { minX, maxX, minY, maxY, minZ };
}

describe('car-wheel 幾何', () => {
  const def = getPartDefinition('car-wheel')!;

  it('輪子最低點觸地（z≈0，容許 0.5mm）', () => {
    const { minZ } = meshBounds(buildPartSolid(def, kernel));
    expect(Math.abs(minZ)).toBeLessThan(0.5);
  });

  it('XZ 剖面直徑≈65mm（半徑≈32.5mm）', () => {
    const { minX, maxX } = meshBounds(buildPartSolid(def, kernel));
    expect(maxX - minX).toBeCloseTo(65, 0);
  });

  it('Y 方向寬度（輪胎寬）≈27mm', () => {
    const tire = buildPartColoredSegments(def, kernel).find((s) => s.color === '#2b2d30')!;
    const { minY, maxY } = meshBounds(tire.solid);
    expect(maxY - minY).toBeCloseTo(27, 0);
  });

  it('sanity check：故意用錯的 block.position 偏移必須讓上述斷言失敗', () => {
    const wrongDef = {
      ...def,
      body: {
        ...def.body,
        blocks: [{ ...def.body.blocks[0], position: [0, 0, 20] as [number, number, number] }],
      },
    };
    const { minZ, minY, maxY } = meshBounds(buildPartSolid(wrongDef, kernel));
    // 錯誤 offset：最低點不觸地、Y 方向不置中
    expect(Math.abs(minZ)).toBeGreaterThan(0.5);
    expect(Math.abs((minY + maxY) / 2)).toBeGreaterThan(1);
  });
});

describe('car-wheel 雙色分段', () => {
  const def = getPartDefinition('car-wheel')!;

  it('3 段：本體無色、輪胎 #2b2d30、輪轂 #c8ccd2', () => {
    const segs = buildPartColoredSegments(def, kernel);
    expect(segs).toHaveLength(3);
    const colors = segs.map((s) => s.color);
    expect(colors[0]).toBeUndefined();
    expect(colors).toContain('#2b2d30');
    expect(colors).toContain('#c8ccd2');
  });

  it('輪轂寬 29mm（兩側各凸出輪胎 1mm）、與輪胎同軸', () => {
    const hub = buildPartColoredSegments(def, kernel).find((s) => s.color === '#c8ccd2')!;
    const mesh = kernel.toMesh(hub.solid);
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      minY = Math.min(minY, mesh.positions[i + 1]);
      maxY = Math.max(maxY, mesh.positions[i + 1]);
      minZ = Math.min(minZ, mesh.positions[i + 2]);
      maxZ = Math.max(maxZ, mesh.positions[i + 2]);
    }
    expect(maxY - minY).toBeCloseTo(29, 0);
    expect((minZ + maxZ) / 2).toBeCloseTo(32.5, 1);
  });
});
