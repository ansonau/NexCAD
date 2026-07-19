import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

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
    const { minY, maxY } = meshBounds(buildPartSolid(def, kernel));
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
