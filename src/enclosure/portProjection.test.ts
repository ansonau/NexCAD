import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import type { PartInstance } from './plan';
import { cutPorts, planPortCutouts, planTopWindowCutouts } from './portProjection';
import { getPartDefinition } from '../parts/library';

const TOLERANCE_MM = 0.4;

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

describe('planTopWindowCutouts', () => {
  const topPortDef: PartDefinition = {
    id: 'test-top-part',
    name: 'Test',
    nameZh: '測試',
    category: 'sensor',
    body: { size: [20, 10, 2], blocks: [] },
    mountingHoles: [],
    ports: [{ face: 'top', shape: 'rect', x: 5, z: -3, w: 8, h: 4 }],
    clearanceHeight: 5,
  };

  it('0° 旋轉：世界中心 = 零件位置 + port 偏移，尺寸 = port 尺寸 + 公差', () => {
    const part: PartInstance = {
      def: topPortDef,
      transform: { position: [10, 20, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    };
    const [cut] = planTopWindowCutouts([part]);
    expect(cut.x).toBeCloseTo(15); // 10 + 5
    expect(cut.y).toBeCloseTo(17); // 20 + (-3)
    expect(cut.w).toBeCloseTo(8 + TOLERANCE_MM * 2);
    expect(cut.h).toBeCloseTo(4 + TOLERANCE_MM * 2);
  });

  it('90° 旋轉：偏移隨零件位置旋轉，寬高對調', () => {
    const part: PartInstance = {
      def: topPortDef,
      transform: { position: [10, 20, 0], rotation: [0, 0, 90], scale: [1, 1, 1] },
    };
    const [cut] = planTopWindowCutouts([part]);
    // cos=0, sin=1: worldX = px - port.z = 10 - (-3) = 13; worldY = py + port.x = 20 + 5 = 25
    expect(cut.x).toBeCloseTo(13);
    expect(cut.y).toBeCloseTo(25);
    expect(cut.w).toBeCloseTo(4 + TOLERANCE_MM * 2); // 對調自 h
    expect(cut.h).toBeCloseTo(8 + TOLERANCE_MM * 2); // 對調自 w
  });

  it('非 90 倍數旋轉時仍以世界 XY 包圍盒產生開孔', () => {
    const part: PartInstance = {
      def: topPortDef,
      transform: { ...identityTransform(), rotation: [0, 0, 45] },
    };
    const [cut] = planTopWindowCutouts([part]);
    expect(cut).toBeDefined();
    // 8x4 矩形繞 Z 45° 後 XY 包圍盒寬高 = (8+4)/√2
    const bb = (8 + 4) / Math.sqrt(2);
    expect(cut.w).toBeCloseTo(bb + TOLERANCE_MM * 2, 10);
    expect(cut.h).toBeCloseTo(bb + TOLERANCE_MM * 2, 10);
    // port 中心 (5, -3) 繞 Z 45° -> (5.657, 1.414)
    expect(cut.x).toBeCloseTo(4 * Math.sqrt(2), 10);
    expect(cut.y).toBeCloseTo(Math.sqrt(2), 10);
  });

  it('無 top face 接口的零件回傳空陣列', () => {
    const noTop: PartDefinition = {
      ...topPortDef,
      ports: [],
    };
    const part: PartInstance = { def: noTop, transform: identityTransform() };
    expect(planTopWindowCutouts([part])).toEqual([]);
  });

  it('僅側面接口的零件不產生任何視窗（不與 planPortCutouts 的職責重疊）', () => {
    const sideOnly: PartDefinition = {
      ...topPortDef,
      ports: [
        { face: 'north', shape: 'rect', x: 0, z: 0, w: 9, h: 4 },
        { face: 'west', shape: 'rect', x: 0, z: 0, w: 9, h: 4 },
      ],
    };
    const part: PartInstance = { def: sideOnly, transform: identityTransform() };
    expect(planTopWindowCutouts([part])).toEqual([]);
  });

  it('繞 X 軸傾斜時仍依世界 XY 投影產生開孔', () => {
    const part: PartInstance = {
      def: topPortDef,
      transform: { ...identityTransform(), rotation: [30, 0, 0] },
    };
    const [cut] = planTopWindowCutouts([part]);
    expect(cut).toBeDefined();
    // port 中心 (5, -3, 0) 繞 X 30° -> (5, -3*cos30, -3*sin30)
    expect(cut.x).toBeCloseTo(5, 10);
    expect(cut.y).toBeCloseTo(-3 * Math.cos(30 * Math.PI / 180), 10);
    // 寬維持 8，高因傾斜變為 4*cos30
    expect(cut.w).toBeCloseTo(8 + TOLERANCE_MM * 2, 10);
    expect(cut.h).toBeCloseTo(4 * Math.cos(30 * Math.PI / 180) + TOLERANCE_MM * 2, 10);
  });

  it('繞 X 軸 90° 時視窗朝側面，不產生上蓋開孔', () => {
    const part: PartInstance = {
      def: topPortDef,
      transform: { ...identityTransform(), rotation: [90, 0, 0] },
    };
    expect(planTopWindowCutouts([part])).toEqual([]);
  });

  it('實際 oled-096 零件：產生一個對應其螢幕視窗的開孔', () => {
    const def = getPartDefinition('oled-096');
    expect(def).toBeDefined();
    const part: PartInstance = {
      def: def!,
      transform: { position: [50, 60, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    };
    const cuts = planTopWindowCutouts([part]);
    expect(cuts).toHaveLength(1);
    const port = def!.ports.find((p) => p.face === 'top')!;
    expect(cuts[0].x).toBeCloseTo(50 + port.x);
    expect(cuts[0].y).toBeCloseTo(60 + port.z);
    expect(cuts[0].w).toBeCloseTo(port.w + TOLERANCE_MM * 2);
    expect(cuts[0].h).toBeCloseTo(port.h + TOLERANCE_MM * 2);
  });

  it('實際 lcd1602 零件旋轉 90°：寬高對調', () => {
    const def = getPartDefinition('lcd1602');
    expect(def).toBeDefined();
    const part: PartInstance = {
      def: def!,
      transform: { position: [0, 0, 0], rotation: [0, 0, 90], scale: [1, 1, 1] },
    };
    const cuts = planTopWindowCutouts([part]);
    expect(cuts).toHaveLength(1);
    const port = def!.ports.find((p) => p.face === 'top')!;
    expect(cuts[0].w).toBeCloseTo(port.h + TOLERANCE_MM * 2);
    expect(cuts[0].h).toBeCloseTo(port.w + TOLERANCE_MM * 2);
  });
});
