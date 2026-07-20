import { describe, expect, it } from 'vitest';
import { partWorldBounds } from '../enclosure/plan';
import type { PartInstance } from '../enclosure/plan';
import { PART_LIBRARY, getPartDefinition } from './library';
import { CAR_PRESETS, SMART_CAR_2WD, SMART_CAR_4WD, buildCarNodes } from './presets';
import type { CarPresetSpec } from './presets';
import type { PartNode } from '../types/document';

function partsOf(spec: CarPresetSpec, lang = 'en') {
  const { nodes, defaultSelection } = buildCarNodes(spec, lang);
  const parts = nodes.filter((n): n is PartNode => n.type === 'part');
  return { nodes, defaultSelection, parts };
}

describe('CarPresetSpec 資料合法性', () => {
  it('兩款 preset 的所有 partId 都存在於 PART_LIBRARY', () => {
    const ids = new Set(PART_LIBRARY.map((p) => p.id));
    for (const spec of CAR_PRESETS) {
      const used = [
        ...spec.electronics.map((e) => e.partId),
        spec.chassisPartId,
        ...spec.wheels.map((w) => w.partId),
        ...(spec.caster ? [spec.caster.partId] : []),
      ];
      for (const id of used) expect(ids.has(id), `未知零件 id "${id}"`).toBe(true);
    }
  });

  it('電子件 rotZ 皆為 0（底盤孔位交叉對照與外殼計算的前提）', () => {
    for (const spec of CAR_PRESETS) {
      for (const e of spec.electronics) expect(e.rotZ).toBe(0);
    }
  });
});

describe('buildCarNodes：2WD', () => {
  it('10 個節點，位置/旋轉符合資料表', () => {
    const { parts } = partsOf(SMART_CAR_2WD, 'zh');
    expect(parts).toHaveLength(10);
    const at = (partId: string, y?: number) =>
      parts.find(
        (n) => n.partId === partId && (y === undefined || n.transform.position[1] === y),
      )!;
    expect(at('hc-sr04').transform.position).toEqual([105, 0, 20.5]);
    expect(at('arduino-uno').transform.position).toEqual([40, 0, 20.5]);
    expect(at('l298n').transform.position).toEqual([-25, 0, 20.5]);
    expect(at('battery-18650x2').transform.position).toEqual([-95, 0, 20.5]);
    expect(at('tt-motor', 81.25).transform.position).toEqual([-35, 81.25, 20.5]);
    expect(at('tt-motor', -81.25).transform.position).toEqual([-35, -81.25, 20.5]);
    expect(at('car-chassis-2wd').transform.position).toEqual([-3, 0, 17.5]);
    expect(at('car-wheel', 107.5).transform.position).toEqual([-15, 107.5, 0]);
    expect(at('car-wheel', -107.5).transform.position).toEqual([-15, -107.5, 0]);
    expect(at('ball-caster-16').transform.position).toEqual([95, 0, 0]);
    for (const n of parts) expect(n.transform.rotation).toEqual([0, 0, 0]);
  });

  it('defaultSelection＝底盤+2 輪+萬向輪（4 個），不含電子件', () => {
    const { parts, defaultSelection } = partsOf(SMART_CAR_2WD);
    expect(defaultSelection).toHaveLength(4);
    const selected = parts.filter((n) => defaultSelection.includes(n.id));
    expect(selected.map((n) => n.partId).sort()).toEqual(
      ['ball-caster-16', 'car-chassis-2wd', 'car-wheel', 'car-wheel'].sort(),
    );
  });

  it('名稱依語言（zh 用 nameZh）', () => {
    const { parts } = partsOf(SMART_CAR_2WD, 'zh');
    expect(parts.find((n) => n.partId === 'car-chassis-2wd')!.name).toBe('2WD 小車底盤');
    const en = partsOf(SMART_CAR_2WD, 'en');
    expect(en.parts.find((n) => n.partId === 'car-chassis-2wd')!.name).toBe('2WD Car Chassis');
  });
});

describe('buildCarNodes：4WD', () => {
  it('13 個節點：4 馬達 + 4 輪、無萬向輪，defaultSelection 5 個', () => {
    const { parts, defaultSelection } = partsOf(SMART_CAR_4WD);
    expect(parts).toHaveLength(13);
    expect(parts.filter((n) => n.partId === 'tt-motor')).toHaveLength(4);
    expect(parts.filter((n) => n.partId === 'car-wheel')).toHaveLength(4);
    expect(parts.find((n) => n.partId === 'ball-caster-16')).toBeUndefined();
    expect(defaultSelection).toHaveLength(5);
  });
});

describe('佈局無碰撞', () => {
  for (const spec of CAR_PRESETS) {
    it(`${spec.id}：3D AABB 兩兩不相交（貼面接觸合法）`, () => {
      const { parts } = partsOf(spec);
      const boxes = parts.map((n) =>
        partWorldBounds({ def: getPartDefinition(n.partId)!, transform: n.transform } as PartInstance),
      );
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          const overlapping = !(
            a.maxX <= b.minX ||
            b.maxX <= a.minX ||
            a.maxY <= b.minY ||
            b.maxY <= a.minY ||
            a.maxZ <= b.minZ ||
            b.maxZ <= a.minZ
          );
          expect(overlapping, `零件 #${i} 與 #${j} 的 3D AABB 重疊`).toBe(false);
        }
      }
    });
  }
});

describe('底盤孔位交叉對照', () => {
  it('底盤 standoff:false 孔＝2WD 電子件安裝孔的世界平移（雙向 drift 都抓）', () => {
    const chassisDef = getPartDefinition(SMART_CAR_2WD.chassisPartId)!;
    const [cx, cy] = [SMART_CAR_2WD.chassisPosition[0], SMART_CAR_2WD.chassisPosition[1]];
    const expected: { x: number; y: number; diameter: number }[] = [];
    for (const e of SMART_CAR_2WD.electronics) {
      const def = getPartDefinition(e.partId)!;
      for (const h of def.mountingHoles) {
        expected.push({ x: e.x + h.x - cx, y: e.y + h.y - cy, diameter: h.diameter });
      }
    }
    const actual = chassisDef.mountingHoles.filter((h) => h.standoff === false);
    expect(actual).toHaveLength(expected.length);
    for (const e of expected) {
      const hit = actual.find(
        (a) =>
          Math.abs(a.x - e.x) < 0.01 &&
          Math.abs(a.y - e.y) < 0.01 &&
          Math.abs(a.diameter - e.diameter) < 0.01,
      );
      expect(hit, `底盤缺少對應孔 (${e.x}, ${e.y}) Ø${e.diameter}`).toBeDefined();
    }
  });
});

describe('錯誤處理', () => {
  it('查無零件 id 時 throw', () => {
    const bad: CarPresetSpec = {
      ...SMART_CAR_2WD,
      electronics: [{ partId: 'no-such-part', x: 0, y: 0, z: 20.5, rotZ: 0 }],
    };
    expect(() => buildCarNodes(bad, 'en')).toThrow();
  });
});