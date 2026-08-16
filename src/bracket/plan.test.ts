import { describe, expect, it } from 'vitest';
import type { PartDefinition } from '../parts/schema';
import { DEFAULT_BRACKET_PARAMS, planBracket } from './plan';

const boardDef: PartDefinition = {
  id: 'test-board',
  name: 'Test',
  nameZh: '測試板',
  category: 'board',
  body: { size: [40, 20, 2], blocks: [] },
  mountingHoles: [
    { x: -15, y: -5, diameter: 3 },
    { x: 15, y: 5, diameter: 3 },
  ],
  ports: [],
  clearanceHeight: 10,
};

describe('planBracket', () => {
  it('底座依零件本體向外擴張 baseMargin，底面在零件底面下方 baseThickness', () => {
    const plan = planBracket(boardDef, DEFAULT_BRACKET_PARAMS);
    expect(plan.base.minX).toBeCloseTo(-20 - 6, 6);
    expect(plan.base.maxX).toBeCloseTo(20 + 6, 6);
    expect(plan.base.minY).toBeCloseTo(-10 - 6, 6);
    expect(plan.base.maxY).toBeCloseTo(10 + 6, 6);
    expect(plan.base.maxZ).toBeCloseTo(0, 6);
    expect(plan.floorZ).toBeCloseTo(-DEFAULT_BRACKET_PARAMS.baseThickness, 6);
  });

  it('固定柱對齊零件安裝孔（本地座標）', () => {
    const plan = planBracket(boardDef, DEFAULT_BRACKET_PARAMS);
    expect(plan.standoffs).toHaveLength(2);
    expect(plan.standoffs[0].x).toBeCloseTo(-15, 6);
    expect(plan.standoffs[0].y).toBeCloseTo(-5, 6);
    expect(plan.standoffs[1].x).toBeCloseTo(15, 6);
    expect(plan.standoffs[1].y).toBeCloseTo(5, 6);
  });

  it('底座四角鎖附孔落在零件外側的鎖附帶（不被零件遮住）', () => {
    const plan = planBracket(boardDef, DEFAULT_BRACKET_PARAMS);
    expect(plan.baseHoles).toHaveLength(4);
    // 孔心 = 零件半寬 + baseMargin/2 = 20+3、10+3，落在零件（±20、±10）外側
    expect(plan.baseHoles[0].x).toBeCloseTo(-23, 6);
    expect(plan.baseHoles[0].y).toBeCloseTo(-13, 6);
    expect(Math.abs(plan.baseHoles[0].x)).toBeGreaterThan(20);
    expect(Math.abs(plan.baseHoles[0].y)).toBeGreaterThan(10);
  });

  it('baseHoles=false 時不生成鎖附孔', () => {
    const plan = planBracket(boardDef, { ...DEFAULT_BRACKET_PARAMS, baseHoles: false });
    expect(plan.baseHoles).toHaveLength(0);
  });

  it('baseHoleInset 控制鎖附孔距底座邊緣的內縮量', () => {
    const plan = planBracket(boardDef, { ...DEFAULT_BRACKET_PARAMS, baseHoleInset: 2 });
    // 孔心 = 零件半寬 + baseMargin - inset = 20 + 6 - 2 = 24
    expect(plan.baseHoles[0].x).toBeCloseTo(-24, 6);
    expect(plan.baseHoles[0].y).toBeCloseTo(-14, 6);
  });

  it('baseHoleCount=2 時鎖附孔沿較長軸兩端置中', () => {
    const plan = planBracket(boardDef, { ...DEFAULT_BRACKET_PARAMS, baseHoleCount: 2 });
    expect(plan.baseHoles).toHaveLength(2);
    // 底座 X 較長（52 vs 32），2 孔沿 X 軸置中於 Y=0
    expect(plan.baseHoles[0].x).toBeCloseTo(-23, 6);
    expect(plan.baseHoles[0].y).toBeCloseTo(0, 6);
    expect(plan.baseHoles[1].x).toBeCloseTo(23, 6);
    expect(plan.baseHoles[1].y).toBeCloseTo(0, 6);
  });

  it('standoff=false 的安裝孔不長固定柱', () => {
    const def: PartDefinition = {
      ...boardDef,
      mountingHoles: [
        { x: -15, y: -5, diameter: 3 },
        { x: 15, y: 5, diameter: 3, standoff: false },
      ],
    };
    const plan = planBracket(def, DEFAULT_BRACKET_PARAMS);
    expect(plan.standoffs).toHaveLength(1);
    expect(plan.standoffs[0].x).toBeCloseTo(-15, 6);
  });

  it('安裝孔帶 z 時固定柱頂面抬高至該高度', () => {
    const def: PartDefinition = {
      ...boardDef,
      mountingHoles: [{ x: -15, y: -5, diameter: 3, z: 12 }],
    };
    const plan = planBracket(def, DEFAULT_BRACKET_PARAMS);
    expect(plan.standoffs[0].topZ).toBeCloseTo(12, 6);
  });

  it('擋牆尺寸依零件本體、間隙與壁厚計算', () => {
    const plan = planBracket(boardDef, { ...DEFAULT_BRACKET_PARAMS, wallHeight: 5 });
    expect(plan.wall.height).toBeCloseTo(5, 6);
    // outer = body + 2*clearance + 2*thickness = 40 + 1 + 3 = 44
    expect(plan.wall.outerW).toBeCloseTo(44, 6);
    expect(plan.wall.outerD).toBeCloseTo(24, 6);
    // inner = body + 2*clearance = 41 / 21
    expect(plan.wall.innerW).toBeCloseTo(41, 6);
    expect(plan.wall.innerD).toBeCloseTo(21, 6);
  });

  it('擋牆在底座範圍內（外緣不超出鎖附帶）', () => {
    const plan = planBracket(boardDef, { ...DEFAULT_BRACKET_PARAMS, wallHeight: 5 });
    expect(plan.wall.outerW / 2).toBeLessThan(plan.base.maxX);
    expect(plan.wall.outerD / 2).toBeLessThan(plan.base.maxY);
  });
});
