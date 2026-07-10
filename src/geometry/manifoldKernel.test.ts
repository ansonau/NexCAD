import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import { ManifoldKernel } from './manifoldKernel';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('ManifoldKernel', () => {
  it('box 體積正確', () => {
    expect(kernel.volume(kernel.box(60, 25, 2))).toBeCloseTo(3000, 3);
  });

  it('cylinder 體積接近 πr²h（多邊形近似略小）', () => {
    const v = kernel.volume(kernel.cylinder(5, 10));
    expect(v).toBeGreaterThan(770);
    expect(v).toBeLessThan(Math.PI * 25 * 10);
  });

  it('difference 在板上鑽孔', () => {
    const plate = kernel.box(20, 20, 2);
    const drill = kernel.transform(kernel.cylinder(1.6, 10), {
      ...identityTransform(),
      position: [0, 0, -1],
    });
    const v = kernel.volume(kernel.difference(plate, drill));
    expect(v).toBeGreaterThan(780);
    expect(v).toBeLessThan(800);
  });

  it('union 合併兩個重疊方塊', () => {
    const a = kernel.box(10, 10, 10);
    const b = kernel.transform(kernel.box(10, 10, 10), {
      ...identityTransform(),
      position: [5, 0, 0],
    });
    expect(kernel.volume(kernel.union(a, b))).toBeCloseTo(1500, 3);
  });

  it('transform 依序套用 scale、rotation、position', () => {
    const s = kernel.transform(kernel.box(10, 10, 10), {
      position: [100, 0, 0],
      rotation: [0, 0, 45],
      scale: [2, 1, 1],
    });
    expect(kernel.volume(s)).toBeCloseTo(2000, 3);
  });

  it('toMesh 回傳三角形索引 mesh', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    expect(mesh.indices.length % 3).toBe(0);
    expect(mesh.indices.length / 3).toBe(12);
    expect(mesh.positions.length % 3).toBe(0);
  });
});
