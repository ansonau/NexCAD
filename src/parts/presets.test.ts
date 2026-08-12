import { describe, expect, it } from 'vitest';
import { partWorldBounds } from '../enclosure/plan';
import type { PartInstance } from '../enclosure/plan';
import { PART_LIBRARY, getPartDefinition } from './library';
import {
  CAR_PRESETS,
  DEFAULT_CAR_CONFIG,
  SMART_CAR_2WD,
  SMART_CAR_4WD,
  buildCarAnchorAndElectronics,
  buildCarChassisAndGround,
  buildCarNodes,
  buildChassisDef,
  chassisPartIdForAnchor,
} from './presets';
import type { CarConfigParams, CarPresetSpec } from './presets';
import type { PartNode } from '../types/document';

function partsOf(spec: CarPresetSpec, lang = 'en') {
  const { nodes, defaultSelection } = buildCarNodes(spec, lang);
  const parts = nodes.filter((n): n is PartNode => n.type === 'part');
  return { nodes, defaultSelection, parts };
}

function rotateZ([x, y, z]: [number, number, number], degrees: number): [number, number, number] {
  const radians = degrees * Math.PI / 180;
  return [x * Math.cos(radians) - y * Math.sin(radians), x * Math.sin(radians) + y * Math.cos(radians), z];
}

describe('CarPresetSpec 資料合法性', () => {
  it('兩款 preset 的所有 partId 都存在於 PART_LIBRARY', () => {
    const ids = new Set(PART_LIBRARY.map((part) => part.id));
    for (const spec of CAR_PRESETS) {
      for (const id of [...spec.electronics.map((part) => part.partId), spec.chassisPartId, ...spec.wheels.map((part) => part.partId), ...(spec.caster ? [spec.caster.partId] : [])]) {
        expect(ids.has(id), `未知零件 id "${id}"`).toBe(true);
      }
    }
  });

  it('電子件 rotZ 皆為 0（底盤孔位交叉對照與外殼計算的前提）', () => {
    for (const spec of CAR_PRESETS) for (const electronics of spec.electronics) expect(electronics.rotZ).toBe(0);
  });
});

describe('buildCarNodes：legacy presets', () => {
  it.each([SMART_CAR_2WD, SMART_CAR_4WD])('$id 的馬達軸心與車輪中心對齊', (spec) => {
    const { parts } = partsOf(spec);
    const key = (x: number, y: number, z: number) => `${x.toFixed(2)}:${Math.sign(y)}:${z.toFixed(2)}`;
    const motorAxes = parts
      .filter((part) => part.partId === 'tt-motor')
      .map((part) => key(part.transform.position[0] + 7.22, part.transform.position[1], part.transform.position[2] + 11.2))
      .sort();
    const wheelAxes = parts
      .filter((part) => part.partId === 'car-wheel')
      .map((part) => key(part.transform.position[0], part.transform.position[1], 32.5))
      .sort();
    expect(motorAxes).toEqual(wheelAxes);
  });

  it('2WD 的 10 個節點位置符合資料表', () => {
    const { parts } = partsOf(SMART_CAR_2WD, 'zh');
    expect(parts).toHaveLength(10);
    const at = (partId: string, y?: number) => parts.find((node) => node.partId === partId && (y === undefined || node.transform.position[1] === y))!;
    expect(at('hc-sr04').transform.position).toEqual([105, 0, 21.3]);
    expect(at('tt-motor', 81.25).transform.position).toEqual([-22.22, 81.25, 21.3]);
    expect(at('car-chassis-2wd').transform.position).toEqual([-3, 0, 18.3]);
    expect(at('ball-caster-16').transform.position).toEqual([95, 0, 0]);
    for (const part of parts) expect(part.transform.rotation).toEqual([0, 0, 0]);
  });

  it('2WD defaultSelection 是底盤加貼地組，名稱依語言', () => {
    const { parts, defaultSelection } = partsOf(SMART_CAR_2WD, 'zh');
    expect(defaultSelection).toHaveLength(4);
    expect(parts.filter((part) => defaultSelection.includes(part.id)).map((part) => part.partId).sort()).toEqual(['ball-caster-16', 'car-chassis-2wd', 'car-wheel', 'car-wheel'].sort());
    expect(parts.find((part) => part.partId === 'car-chassis-2wd')!.name).toBe('2WD 小車底盤');
  });

  it('4WD 有四馬達、四輪，沒有萬向輪', () => {
    const { parts, defaultSelection } = partsOf(SMART_CAR_4WD);
    expect(parts).toHaveLength(13);
    expect(parts.filter((part) => part.partId === 'tt-motor')).toHaveLength(4);
    expect(parts.filter((part) => part.partId === 'car-wheel')).toHaveLength(4);
    expect(parts.find((part) => part.partId === 'ball-caster-16')).toBeUndefined();
    expect(defaultSelection).toHaveLength(5);
  });

  it('also supports current config callers', () => {
    const { nodes } = buildCarNodes(DEFAULT_CAR_CONFIG, 'en');
    expect(nodes.filter((node): node is PartNode => node.type === 'part' && node.partId.startsWith('car-chassis-'))).toHaveLength(1);
  });
});

describe('佈局無碰撞', () => {
  for (const spec of CAR_PRESETS) {
    it(`${spec.id}：3D AABB 兩兩不相交（貼面接觸合法）`, () => {
      const boxes = partsOf(spec).parts.map((node) => partWorldBounds({ def: getPartDefinition(node.partId)!, transform: node.transform } as PartInstance));
      for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        expect(!(a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY || a.maxZ <= b.minZ || b.maxZ <= a.minZ), `零件 #${i} 與 #${j} 的 3D AABB 重疊`).toBe(false);
      }
    });
  }
});

describe('底盤孔位交叉對照', () => {
  it('legacy 2WD chassis holes match supported electronics mounting holes', () => {
    const [cx, cy] = SMART_CAR_2WD.chassisPosition;
    const expected = SMART_CAR_2WD.electronics.filter((electronics) => electronics.partId !== 'tt-motor').flatMap((electronics) =>
      getPartDefinition(electronics.partId)!.mountingHoles.map((hole) => ({ x: electronics.x + hole.x - cx, y: electronics.y + hole.y - cy, diameter: hole.diameter })),
    );
    const actual = getPartDefinition(SMART_CAR_2WD.chassisPartId)!.mountingHoles.filter((hole) => hole.standoff === false);
    expect(actual).toHaveLength(expected.length);
    for (const hole of expected) expect(actual.some((candidate) => Math.abs(candidate.x - hole.x) < 0.01 && Math.abs(candidate.y - hole.y) < 0.01 && Math.abs(candidate.diameter - hole.diameter) < 0.01), `底盤缺少對應孔 (${hole.x}, ${hole.y}) Ø${hole.diameter}`).toBe(true);
  });
});

describe('Phase 1/2 builders', () => {
  it('creates the expected 2WD and 4WD anchors', () => {
    const two = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    const four = buildCarAnchorAndElectronics({ ...DEFAULT_CAR_CONFIG, drive: '4wd' }, 'en');
    expect(two.anchor.electronicsIds).toHaveLength(6);
    expect(two.defaultSelection).toEqual([two.anchor.id]);
    expect(four.electronics.filter((node) => node.partId === 'tt-motor')).toHaveLength(4);
    expect(four.anchor.electronicsIds).toHaveLength(8);
  });

  it('builds a 2WD chassis, two wheels, and caster', () => {
    const { anchor, electronics } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    const result = buildCarChassisAndGround(anchor, electronics, 'en');
    expect(result.warnings).toEqual([]);
    expect(result.nodes).toHaveLength(4);
    expect(result.nodes.find((node) => node.type === 'part' && node.partId === chassisPartIdForAnchor(anchor.id))!.transform).toEqual(anchor.transform);
  });

  it('builds a 4WD chassis and four wheels', () => {
    const { anchor, electronics } = buildCarAnchorAndElectronics({ ...DEFAULT_CAR_CONFIG, drive: '4wd' }, 'en');
    const result = buildCarChassisAndGround(anchor, electronics, 'en');
    expect(result.warnings).toEqual([]);
    expect(result.nodes.filter((node) => node.type === 'part' && node.partId === 'car-wheel')).toHaveLength(4);
  });

  it('returns warnings instead of nodes when holes are out of bounds', () => {
    const { anchor, electronics } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    const result = buildCarChassisAndGround({ ...anchor, config: { ...anchor.config, length: 100, width: 80 } }, electronics, 'en');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.nodes).toEqual([]);
  });

  it('registers electronics holes after translating and rotating the anchor layout', () => {
    const initial = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    const rotation = 37;
    const position: [number, number, number] = [80, -45, 30];
    const anchor = { ...initial.anchor, transform: { ...initial.anchor.transform, position, rotation: [0, 0, rotation] as [number, number, number] } };
    const electronics = initial.electronics.map((node) => {
      const local = [node.transform.position[0] - initial.anchor.transform.position[0], node.transform.position[1] - initial.anchor.transform.position[1], node.transform.position[2] - initial.anchor.transform.position[2]] as [number, number, number];
      const rotated = rotateZ(local, rotation);
      return { ...node, transform: { ...node.transform, position: [position[0] + rotated[0], position[1] + rotated[1], position[2] + rotated[2]] as [number, number, number], rotation: [0, 0, rotation] as [number, number, number] } };
    });
    const result = buildCarChassisAndGround(anchor, electronics, 'en');
    expect(result.warnings).toEqual([]);
    const expected = initial.electronics.flatMap((node) => getPartDefinition(node.partId)!.mountingHoles.map((hole) => ({ x: node.transform.position[0] + hole.x - initial.anchor.transform.position[0], y: node.transform.position[1] + hole.y - initial.anchor.transform.position[1], diameter: hole.diameter })));
    const actual = getPartDefinition(chassisPartIdForAnchor(anchor.id))!.mountingHoles;
    for (const hole of expected) expect(actual.some((candidate) => Math.abs(candidate.x - hole.x) < 0.01 && Math.abs(candidate.y - hole.y) < 0.01 && Math.abs(candidate.diameter - hole.diameter) < 0.01), `dynamic chassis missing transformed hole (${hole.x}, ${hole.y})`).toBe(true);
  });
});

describe('buildChassisDef', () => {
  it('honors custom dimensions and shape', () => {
    const config: CarConfigParams = { ...DEFAULT_CAR_CONFIG, shape: 'ellipse', length: 300, width: 200, thickness: 5 };
    const definition = buildChassisDef(config);
    expect(definition.body.size).toEqual([300, 200, 5]);
    expect(definition.body.cornerRadius).toBe(100);
  });
});

describe('錯誤處理', () => {
  it('查無零件 id 時 throw', () => {
    const bad: CarPresetSpec = { ...SMART_CAR_2WD, electronics: [{ partId: 'no-such-part', x: 0, y: 0, z: 20.5, rotZ: 0 }] };
    expect(() => buildCarNodes(bad, 'en')).toThrow();
  });
});
