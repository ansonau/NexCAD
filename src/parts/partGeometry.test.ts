import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

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
