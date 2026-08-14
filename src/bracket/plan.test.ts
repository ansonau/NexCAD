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
    expect(plan.base.minX).toBeCloseTo(-20 - 3, 6);
    expect(plan.base.maxX).toBeCloseTo(20 + 3, 6);
    expect(plan.base.minY).toBeCloseTo(-10 - 3, 6);
    expect(plan.base.maxY).toBeCloseTo(10 + 3, 6);
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

  it('預設生成四角鎖附孔，baseHoles=false 時不生成', () => {
    const plan = planBracket(boardDef, DEFAULT_BRACKET_PARAMS);
    expect(plan.baseHoles).toHaveLength(4);
    const noHoles = planBracket(boardDef, { ...DEFAULT_BRACKET_PARAMS, baseHoles: false });
    expect(noHoles.baseHoles).toHaveLength(0);
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
});
