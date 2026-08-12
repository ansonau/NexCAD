import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('tt-motor 幾何（馬達罐 + 齒輪箱 + 雙出軸）', () => {
  const def = getPartDefinition('tt-motor')!;

  function bounds() {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 1; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i - 1];
      const y = mesh.positions[i];
      const z = mesh.positions[i + 1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    return { minX, maxX, minY, maxY, minZ, maxZ };
  }

  it('整體 envelope 符合尺寸圖且 clearanceHeight 一致', () => {
    const b = bounds();
    expect(b.maxX - b.minX).toBeCloseTo(69.9, 0);
    expect(b.maxY - b.minY).toBeCloseTo(37, 0);
    expect(b.maxZ - b.minZ).toBeCloseTo(22.4, 0);
    expect(def.clearanceHeight).toBeGreaterThanOrEqual(22.4);
  });

  it('輸出軸符合圖紙的直徑與 X/Z 軸心', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    const xs: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      if (Math.abs(mesh.positions[i + 1]) > 11.3) {
        xs.push(mesh.positions[i]);
        zs.push(mesh.positions[i + 2]);
      }
    }
    expect(zs.length).toBeGreaterThan(0);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(7.22, 1);
    expect((Math.min(...zs) + Math.max(...zs)) / 2).toBeCloseTo(11.2, 1);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(5.4, 1);
  });

  it('側孔不會冒充底部 mounting holes', () => {
    expect(def.mountingHoles).toEqual([]);
  });
});
