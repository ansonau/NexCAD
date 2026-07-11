import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { createPrimitive } from '../types/document';
import { analyzeMesh, collectThinFeatures } from './analyze';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('analyzeMesh', () => {
  it('回傳正確的 bounding box 與三角形數', () => {
    const mesh = kernel.toMesh(kernel.box(60, 25, 2));
    const stats = analyzeMesh(mesh);
    expect(stats.bbox[0]).toBeCloseTo(60, 3);
    expect(stats.bbox[1]).toBeCloseTo(25, 3);
    expect(stats.bbox[2]).toBeCloseTo(2, 3);
    expect(stats.triangles).toBe(12);
  });

  it('空 mesh 回傳零值', () => {
    expect(analyzeMesh({ positions: new Float32Array(0), indices: new Uint32Array(0) })).toEqual({
      bbox: [0, 0, 0],
      triangles: 0,
    });
  });
});

describe('collectThinFeatures', () => {
  it('偵測 <1mm 的參數', () => {
    const thin = createPrimitive('box', { name: '薄板' });
    thin.params.height = 0.5;
    expect(collectThinFeatures([thin])).toEqual(['薄板']);
  });

  it('孔節點與 radiusTop=0 不觸發警告', () => {
    const hole = createPrimitive('cylinder', { role: 'hole' });
    hole.params.radius = 0.5;
    const cone = createPrimitive('cone');
    expect(collectThinFeatures([hole, cone])).toEqual([]);
  });

  it('遞迴檢查群組內節點', () => {
    const thin = createPrimitive('box', { name: '內層' });
    thin.params.width = 0.8;
    expect(
      collectThinFeatures([
        {
          type: 'group',
          id: 'g',
          name: 'g',
          role: 'solid',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          visible: true,
          locked: false,
          children: [thin],
        },
      ]),
    ).toEqual(['內層']);
  });
});
