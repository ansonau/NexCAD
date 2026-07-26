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

  it('整體 envelope 約 70×40×22mm 且 clearanceHeight 一致', () => {
    const b = bounds();
    expect(b.maxX - b.minX).toBeCloseTo(70, 0);
    expect(b.maxY - b.minY).toBeCloseTo(40, 0);
    expect(b.maxZ - b.minZ).toBeCloseTo(22, 0);
    expect(def.clearanceHeight).toBeGreaterThanOrEqual(22);
  });

  it('軸徑約 5mm，軸心距本體底面約 11mm', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    const zs: number[] = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      if (Math.abs(mesh.positions[i + 1]) > 11) zs.push(mesh.positions[i + 2]);
    }
    expect(zs.length).toBeGreaterThan(0);
    const avg = zs.reduce((a, b) => a + b, 0) / zs.length;
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(5, 0);
    expect(avg).toBeCloseTo(11, 0);
  });
});
