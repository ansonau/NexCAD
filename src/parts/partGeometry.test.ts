import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartColoredSegments, buildPartSolid } from './partGeometry';
import type { PartDefinition } from './schema';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('buildPartSolid', () => {
  it('麵包板（純主體）體積 ≈ 長×寬×厚', () => {
    const def = getPartDefinition('breadboard-half')!;
    const v = kernel.volume(buildPartSolid(def, kernel));
    expect(v).toBeCloseTo(82.5 * 54.5 * 8.5, 1);
  });

  it('Arduino Uno 含元件方塊且鑽了安裝孔', () => {
    const def = getPartDefinition('arduino-uno')!;
    const v = kernel.volume(buildPartSolid(def, kernel));
    const boardOnly = 68.6 * 53.4 * 1.6;
    // 元件方塊使體積大於裸板
    expect(v).toBeGreaterThan(boardOnly);
    // 對照：無孔版本應更大（孔確實被鑽掉）
    const noHoles = { ...def, mountingHoles: [] };
    const vNoHoles = kernel.volume(buildPartSolid(noHoles, kernel));
    expect(vNoHoles - v).toBeGreaterThan(4 * Math.PI * 1.6 * 1.6 * 1.6 * 0.9);
  });

  it('cylinder block 正常生成（LED）', () => {
    const def = getPartDefinition('led-5mm')!;
    const v = kernel.volume(buildPartSolid(def, kernel));
    const flange = 5.8 * 5.8 * 1;
    const dome = Math.PI * 2.5 * 2.5 * 7.6;
    expect(v).toBeGreaterThan(flange);
    expect(v).toBeLessThan(flange + dome);
  });

  it('非零 z 的安裝孔鑽在固定翼上（SG90）', () => {
    const def = getPartDefinition('sg90')!;
    const v = kernel.volume(buildPartSolid(def, kernel));
    const noHoles = { ...def, mountingHoles: [] };
    const vNoHoles = kernel.volume(buildPartSolid(noHoles, kernel));
    expect(vNoHoles).toBeGreaterThan(v);
  });

  it('mesh 可輸出且非空', () => {
    const def = getPartDefinition('raspberry-pi-4')!;
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    expect(mesh.indices.length).toBeGreaterThan(0);
  });
});

describe('buildPartColoredSegments', () => {
  const wheelLike: PartDefinition = {
    id: 'test-wheel',
    name: 'T',
    nameZh: 'T',
    category: 'component',
    body: {
      size: [10, 10, 1],
      blocks: [
        { shape: 'box', position: [0, 0, 0], size: [5, 5, 2] }, // 無色 → 併入主體段
        { shape: 'box', position: [3, 0, 0], size: [2, 2, 2], color: '#a1b2c3' }, // 有色 → 獨立段
      ],
    },
    mountingHoles: [],
    ports: [],
    clearanceHeight: 5,
  };

  it('無色 block 併入主體段；有色 block 獨立成段並帶色', () => {
    const segs = buildPartColoredSegments(wheelLike, kernel);
    expect(segs).toHaveLength(2);
    expect(segs[0].color).toBeUndefined();
    expect(segs[1].color).toBe('#a1b2c3');
    expect(kernel.volume(segs[0].solid)).toBeCloseTo(10 * 10 * 1 + 5 * 5 * 2, 1);
    expect(kernel.volume(segs[1].solid)).toBeCloseTo(2 * 2 * 2, 3);
  });

  it('安裝孔對主體段與有色段都鑽', () => {
    const drilled: PartDefinition = { ...wheelLike, mountingHoles: [{ x: 3, y: 0, diameter: 2 }] };
    const segs = buildPartColoredSegments(drilled, kernel);
    // 有色段（2×2×2=8）被 Ø2 孔鑽穿 → 體積變小
    expect(kernel.volume(segs[1].solid)).toBeLessThan(8);
  });

  it('buildPartSolid＝全段 union（幾何與分段前一致）', () => {
    const v = kernel.volume(buildPartSolid(wheelLike, kernel));
    // 無色 block (5×5×2) 與有色 block (2×2×2 at [3,0]) 局部重疊 0.5×2×2=2
    expect(v).toBeCloseTo(10 * 10 * 1 + 5 * 5 * 2 + 2 * 2 * 2 - 2, 1);
  });
});
