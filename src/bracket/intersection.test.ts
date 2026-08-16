import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import type { Solid } from '../geometry/kernel';
import { buildPartSolid } from '../parts/partGeometry';
import { PART_LIBRARY } from '../parts/library';
import { createBracketNode } from '../types/document';
import type { Transform } from '../types/document';
import { DEFAULT_BRACKET_PARAMS } from './plan';
import { buildBracketNodeSolid } from './generate';
import type { BracketStyle } from '../types/document';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

function intersectionVolume(a: Solid, b: Solid): number {
  return kernel.volume(kernel.difference(a, kernel.difference(a, b)));
}

function meshBounds(solid: Solid) {
  const mesh = kernel.toMesh(solid);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    minX = Math.min(minX, mesh.positions[i]);
    maxX = Math.max(maxX, mesh.positions[i]);
    minY = Math.min(minY, mesh.positions[i + 1]);
    maxY = Math.max(maxY, mesh.positions[i + 1]);
    minZ = Math.min(minZ, mesh.positions[i + 2]);
    maxZ = Math.max(maxZ, mesh.positions[i + 2]);
  }
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

describe('bracket 不與零件相交（全零件庫 × 三種樣式）', () => {
  it('任意零件、任意樣式的支架都不與零件本體重疊', () => {
    const problems: string[] = [];
    for (const def of PART_LIBRARY) {
      for (const style of ['base', 'l', 'u'] as BracketStyle[]) {
        const rotation = style === 'base' ? [0, 0, 0] : [0, 90, 0];
        const transform: Transform = { position: [0, 0, 0], rotation: rotation as [number, number, number], scale: [1, 1, 1] };
        const partSolid = kernel.transform(buildPartSolid(def, kernel), transform);
        const node = createBracketNode({ ...DEFAULT_BRACKET_PARAMS, style, wallHeight: style === 'base' ? 3 : 0 }, 'b', {
          sourceParts: [{ nodeId: 'x', partId: def.id, transform }],
        });
        const bracket = buildBracketNodeSolid(node, kernel);
        if (!bracket) continue;

        const inter = intersectionVolume(partSolid, bracket);
        const partVol = kernel.volume(partSolid);
        if (inter / partVol > 0.002) {
          problems.push(`${def.id}/${style}: 相交 ${(inter / partVol * 100).toFixed(2)}%`);
        }
        if (kernel.volume(bracket) <= 0) problems.push(`${def.id}/${style}: 體積為 0`);

        const b = meshBounds(bracket);
        if (Math.max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ) > 600) {
          problems.push(`${def.id}/${style}: 範圍異常`);
        }
      }
    }
    expect(problems).toEqual([]);
  }, 30000);
});
