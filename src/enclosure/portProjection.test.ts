import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import type { PartInstance } from './plan';
import { cutPorts, planPortCutouts } from './portProjection';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

const boardDef: PartDefinition = {
  id: 'usb-board',
  name: 'Test',
  nameZh: '測試板',
  category: 'board',
  body: { size: [40, 20, 2], blocks: [] },
  mountingHoles: [],
  ports: [
    { face: 'west', shape: 'rect', x: 5, z: 0, w: 10, h: 5, label: 'USB' },
    { face: 'top', shape: 'circle', x: 0, z: 0, w: 6, h: 6, label: '燈孔' },
  ],
  clearanceHeight: 10,
};

describe('planPortCutouts', () => {
  it('west 面接口投影到 west 牆，含 0.4mm 公差', () => {
    const part: PartInstance = { def: boardDef, transform: identityTransform() };
    const cutouts = planPortCutouts([part]);
    expect(cutouts).toHaveLength(1);
    expect(cutouts[0].wall).toBe('west');
    expect(cutouts[0].w).toBeCloseTo(10.8, 6);
    expect(cutouts[0].h).toBeCloseTo(5.8, 6);
  });

  it('旋轉 90° 後 west 面變成投影到 south 牆', () => {
    const part: PartInstance = {
      def: boardDef,
      transform: { ...identityTransform(), rotation: [0, 0, 90] },
    };
    const cutouts = planPortCutouts([part]);
    expect(cutouts[0].wall).toBe('south');
  });

  it('非 90 倍數旋轉時該零件的接口被略過', () => {
    const part: PartInstance = {
      def: boardDef,
      transform: { ...identityTransform(), rotation: [0, 0, 45] },
    };
    expect(planPortCutouts([part])).toHaveLength(0);
  });

  it('top 面接口不投影到牆面', () => {
    const onlyTop: PartDefinition = {
      ...boardDef,
      ports: [{ face: 'top', shape: 'circle', x: 0, z: 0, w: 6, h: 6 }],
    };
    const part: PartInstance = { def: onlyTop, transform: identityTransform() };
    expect(planPortCutouts([part])).toHaveLength(0);
  });

  it('開孔中心 = 零件頂面 + port.z + port.h/2（port.z 為接口底邊）', () => {
    const part: PartInstance = {
      def: {
        id: 'test-part',
        name: 'Test',
        nameZh: '測試',
        category: 'board',
        body: { size: [40, 20, 1.6], blocks: [] },
        mountingHoles: [],
        ports: [{ face: 'west', shape: 'rect', x: 0, z: 2, w: 8, h: 6 }],
        clearanceHeight: 10,
      },
      transform: { position: [0, 0, 5], rotation: [0, 0, 0], scale: [1, 1, 1] },
    };
    const cutouts = planPortCutouts([part]);
    expect(cutouts).toHaveLength(1);
    // 頂面 = 5 + 1.6 = 6.6；底邊 = 6.6 + 2 = 8.6；中心 = 8.6 + 3 = 11.6
    expect(cutouts[0].v).toBeCloseTo(11.6);
  });
});

describe('cutPorts', () => {
  it('挖孔後殼體體積變小', () => {
    const shell = kernel.box(50, 30, 20);
    const outer = { minX: -25, maxX: 25, minY: -15, maxY: 15, minZ: 0, maxZ: 20 };
    const before = kernel.volume(shell);
    const after = kernel.volume(
      cutPorts(
        shell,
        outer,
        [{ wall: 'west', u: 0, v: 10, w: 10, h: 5, shape: 'rect' }],
        kernel,
      ),
    );
    expect(after).toBeLessThan(before);
    expect(before - after).toBeGreaterThan(10 * 5 * 2 * 0.5); // 至少挖穿部分壁厚
  });
});
