import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { writeBinaryStl } from './stl';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('writeBinaryStl', () => {
  it('立方體輸出 12 個三角形、正確位元組數', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    const buf = writeBinaryStl(mesh);
    expect(buf.byteLength).toBe(84 + 12 * 50);
    const view = new DataView(buf);
    expect(view.getUint32(80, true)).toBe(12);
  });

  it('每個三角形的法向量為單位長度', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    const view = new DataView(writeBinaryStl(mesh));
    for (let t = 0; t < 12; t++) {
      const off = 84 + t * 50;
      const nx = view.getFloat32(off, true);
      const ny = view.getFloat32(off + 4, true);
      const nz = view.getFloat32(off + 8, true);
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 5);
    }
  });
});
