import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('tt-motor 幾何（馬達罐 + 雙出軸）', () => {
  const def = getPartDefinition('tt-motor')!;

  it('罐頂 ≈29mm 且 clearanceHeight 一致', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) maxZ = Math.max(maxZ, mesh.positions[i]);
    expect(maxZ).toBeCloseTo(29, 0);
    expect(def.clearanceHeight).toBeGreaterThanOrEqual(29);
  });

  it('雙出軸自 ±Y 面伸出（軸端 y≈±19.25）', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let maxY = -Infinity;
    let minY = Infinity;
    for (let i = 1; i < mesh.positions.length; i += 3) {
      maxY = Math.max(maxY, mesh.positions[i]);
      minY = Math.min(minY, mesh.positions[i]);
    }
    expect(maxY).toBeCloseTo(19.25, 1);
    expect(minY).toBeCloseTo(-19.25, 1);
  });

  it('軸心距本體底面 12mm', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    const zs: number[] = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      if (Math.abs(mesh.positions[i + 1]) > 12) zs.push(mesh.positions[i + 2]);
    }
    expect(zs.length).toBeGreaterThan(0);
    const avg = zs.reduce((a, b) => a + b, 0) / zs.length;
    expect(avg).toBeCloseTo(12, 0);
  });
});