import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('car-chassis-2wd 幾何', () => {
  const def = getPartDefinition('car-chassis-2wd')!;

  it('AABB＝270×185×3，落在 z∈[0,3]', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      minX = Math.min(minX, mesh.positions[i]);
      maxX = Math.max(maxX, mesh.positions[i]);
      minY = Math.min(minY, mesh.positions[i + 1]);
      maxY = Math.max(maxY, mesh.positions[i + 1]);
      minZ = Math.min(minZ, mesh.positions[i + 2]);
      maxZ = Math.max(maxZ, mesh.positions[i + 2]);
    }
    expect(maxX - minX).toBeCloseTo(270, 1);
    expect(maxY - minY).toBeCloseTo(185, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxZ).toBeCloseTo(3, 1);
  });

  it('垂直邊圓角 r=10：無頂點同時 |x|>134 且 |y|>91.5（直角版會有角落頂點）', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let cornerVerts = 0;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      if (Math.abs(mesh.positions[i]) > 134 && Math.abs(mesh.positions[i + 1]) > 91.5) cornerVerts += 1;
    }
    expect(cornerVerts).toBe(0);
  });

  it('18 個安裝孔：4 角孔 standoff 缺省、14 電子件孔 standoff:false，且全部鑽穿', () => {
    expect(def.mountingHoles).toHaveLength(18);
    expect(def.mountingHoles.filter((h) => h.standoff === undefined)).toHaveLength(4);
    expect(def.mountingHoles.filter((h) => h.standoff === false)).toHaveLength(14);
    const v = kernel.volume(buildPartSolid(def, kernel));
    const vNoHoles = kernel.volume(buildPartSolid({ ...def, mountingHoles: [] }, kernel));
    expect(vNoHoles - v).toBeGreaterThan(200);
  });
});