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

  it('releaseAll 後可以繼續建立新的 Solid', () => {
    kernel.volume(kernel.box(10, 10, 10));
    kernel.releaseAll();
    expect(kernel.volume(kernel.box(10, 10, 10))).toBeCloseTo(1000, 3);
  });

  it('roundedBox cornerRadius<=0 時體積等同 box', () => {
    const v1 = kernel.volume(kernel.roundedBox(20, 10, 5, 0));
    const v2 = kernel.volume(kernel.box(20, 10, 5));
    expect(v1).toBeCloseTo(v2, 3);
  });

  it('roundedBox 體積小於同尺寸方盒（四角被削掉）', () => {
    const rounded = kernel.volume(kernel.roundedBox(20, 20, 10, 5));
    const sharp = kernel.volume(kernel.box(20, 20, 10));
    // 理論值：(20*20 - (4-π)*5²) * 10
    const expected = (20 * 20 - (4 - Math.PI) * 25) * 10;
    expect(rounded).toBeLessThan(sharp);
    expect(rounded).toBeGreaterThan(expected * 0.9);
    expect(rounded).toBeLessThan(expected * 1.1);
  });

  it('roundedBox 底面中心原點、垂直邊圓角但頂底為平面矩形', () => {
    const mesh = kernel.toMesh(kernel.roundedBox(20, 20, 10, 5));
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) {
      minZ = Math.min(minZ, mesh.positions[i]);
      maxZ = Math.max(maxZ, mesh.positions[i]);
    }
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });
});
