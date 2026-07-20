import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('ball-caster-16 幾何', () => {
  const def = getPartDefinition('ball-caster-16')!;

  it('總高 17.5mm（填滿地面到底盤底）且最低點觸地', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) {
      minZ = Math.min(minZ, mesh.positions[i]);
      maxZ = Math.max(maxZ, mesh.positions[i]);
    }
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxZ).toBeCloseTo(17.5, 1);
  });

  it('clearanceHeight = 17.5', () => {
    expect(def.clearanceHeight).toBe(17.5);
  });
});