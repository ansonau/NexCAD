import { describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import type { PartInstance } from '../enclosure/plan';
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

function instance(overrides: Partial<PartInstance['transform']> = {}): PartInstance {
  return { def: boardDef, transform: { ...identityTransform(), ...overrides } };
}

describe('planBracket', () => {
  it('底座依零件包覆盒向外擴張 baseMargin，底部在零件底面下方 baseThickness', () => {
    const plan = planBracket([instance()], DEFAULT_BRACKET_PARAMS);
    expect(plan.base.minX).toBeCloseTo(-20 - 3, 6);
    expect(plan.base.maxX).toBeCloseTo(20 + 3, 6);
    expect(plan.base.minY).toBeCloseTo(-10 - 3, 6);
    expect(plan.base.maxY).toBeCloseTo(10 + 3, 6);
    expect(plan.base.maxZ).toBeCloseTo(0, 6);
    expect(plan.floorZ).toBeCloseTo(-DEFAULT_BRACKET_PARAMS.baseThickness, 6);
  });

  it('固定柱對齊零件安裝孔', () => {
    const plan = planBracket([instance()], DEFAULT_BRACKET_PARAMS);
    expect(plan.standoffs).toHaveLength(2);
    expect(plan.standoffs[0].x).toBeCloseTo(-15, 6);
    expect(plan.standoffs[0].y).toBeCloseTo(-5, 6);
    expect(plan.standoffs[1].x).toBeCloseTo(15, 6);
    expect(plan.standoffs[1].y).toBeCloseTo(5, 6);
  });

  it('預設生成四角鎖附孔，baseHoles=false 時不生成', () => {
    const plan = planBracket([instance()], DEFAULT_BRACKET_PARAMS);
    expect(plan.baseHoles).toHaveLength(4);
    const noHoles = planBracket([instance()], { ...DEFAULT_BRACKET_PARAMS, baseHoles: false });
    expect(noHoles.baseHoles).toHaveLength(0);
  });

  it('旋轉零件後固定柱位置隨之旋轉', () => {
    const plan = planBracket([instance({ rotation: [0, 0, 90] })], DEFAULT_BRACKET_PARAMS);
    // 孔 (-15,-5) 繞 Z 轉 90° → (5,-15)
    expect(plan.standoffs[0].x).toBeCloseTo(5, 6);
    expect(plan.standoffs[0].y).toBeCloseTo(-15, 6);
  });

  it('standoff=false 的安裝孔不長固定柱', () => {
    const def: PartDefinition = {
      ...boardDef,
      mountingHoles: [
        { x: -15, y: -5, diameter: 3 },
        { x: 15, y: 5, diameter: 3, standoff: false },
      ],
    };
    const plan = planBracket([{ def, transform: identityTransform() }], DEFAULT_BRACKET_PARAMS);
    expect(plan.standoffs).toHaveLength(1);
    expect(plan.standoffs[0].x).toBeCloseTo(-15, 6);
  });
});
