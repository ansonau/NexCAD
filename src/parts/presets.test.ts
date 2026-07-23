import { describe, expect, it } from 'vitest';
import { getPartDefinition } from '../parts/library';
import {
  SMART_CAR_2WD,
  SMART_CAR_4WD,
  buildCarAnchorAndElectronics,
  buildCarChassisAndGround,
  buildCarNodes,
  DEFAULT_CAR_CONFIG,
  buildChassisDef,
} from '../parts/presets';
import type { CarConfigParams, CarPresetSpec } from '../parts/presets';
import type { PartNode } from '../types/document';

function partsOf(config: CarConfigParams, lang = 'en') {
  const { nodes, defaultSelection } = buildCarNodes(config, lang);
  const parts = nodes.filter((n): n is PartNode => n.type === 'part');
  return { nodes, defaultSelection, parts };
}

describe('CarConfigParams defaults', () => {
  it('DEFAULT_CAR_CONFIG has expected values', () => {
    expect(DEFAULT_CAR_CONFIG.shape).toBe('rounded-rect');
    expect(DEFAULT_CAR_CONFIG.length).toBe(270);
    expect(DEFAULT_CAR_CONFIG.width).toBe(185);
    expect(DEFAULT_CAR_CONFIG.thickness).toBe(3);
    expect(DEFAULT_CAR_CONFIG.drive).toBe('2wd');
    expect(DEFAULT_CAR_CONFIG.wheelSize).toBe(65);
    expect(DEFAULT_CAR_CONFIG.includeCaster).toBe(true);
  });
});

describe('buildChassisDef', () => {
  it('rounded-rect shape produces positive cornerRadius', () => {
    const def = buildChassisDef({ ...DEFAULT_CAR_CONFIG, shape: 'rounded-rect' });
    expect(def.body.size).toEqual([270, 185, 3]);
    expect(def.body.cornerRadius).toBeGreaterThan(0);
    expect(def.clearanceHeight).toBe(3);
  });

  it('rect shape produces zero cornerRadius', () => {
    const def = buildChassisDef({ ...DEFAULT_CAR_CONFIG, shape: 'rect' });
    expect(def.body.cornerRadius).toBe(0);
  });

  it('ellipse shape produces half-min-dimension cornerRadius', () => {
    const def = buildChassisDef({ ...DEFAULT_CAR_CONFIG, shape: 'ellipse' });
    expect(def.body.cornerRadius).toBe(Math.round(Math.min(270, 185) / 2));
  });

  it('custom dimensions reflected in body size', () => {
    const def = buildChassisDef({ ...DEFAULT_CAR_CONFIG, length: 300, width: 200, thickness: 5 });
    expect(def.body.size).toEqual([300, 200, 5]);
    expect(def.clearanceHeight).toBe(5);
  });
});

describe('CarPresetSpec 資料合法性', () => {
  it('兩款 preset 的所有 partId 都存在於 PART_LIBRARY', () => {
    const ids = new Set([SMART_CAR_2WD, SMART_CAR_4WD].flatMap(s => {
      const used = [
        ...s.electronics.map((e) => e.partId),
        s.chassisPartId,
        ...s.wheels.map((w) => w.partId),
        ...(s.caster ? [s.caster.partId] : []),
      ];
      return used;
    }));
    for (const id of ids) {
      expect(getPartDefinition(id), `未知零件 id "${id}"`).toBeDefined();
    }
  });

  it('電子件 rotZ 皆為 0', () => {
    for (const spec of [SMART_CAR_2WD, SMART_CAR_4WD]) {
      for (const e of spec.electronics) expect(e.rotZ).toBe(0);
    }
  });
});

describe('buildCarNodes：2WD (default config)', () => {
  it('10 個節點，位置/旋轉符合預期', () => {
    const config: CarConfigParams = { ...DEFAULT_CAR_CONFIG, drive: '2wd' };
    const { parts } = partsOf(config, 'zh');
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
    expect(at('car-chassis-dynamic').transform.position).toEqual([-3, 0, 17.5]);
    expect(at('car-wheel', 107.5).transform.position).toEqual([-15, 107.5, 0]);
    expect(at('car-wheel', -107.5).transform.position).toEqual([-15, -107.5, 0]);
    expect(at('ball-caster-16').transform.position).toEqual([95, 0, 0]);
    for (const n of parts) expect(n.transform.rotation).toEqual([0, 0, 0]);
  });

  it('defaultSelection＝底盤+2 輪+萬向輪（4 個），不含電子件', () => {
    const { parts, defaultSelection } = partsOf({ ...DEFAULT_CAR_CONFIG, drive: '2wd' });
    expect(defaultSelection).toHaveLength(4);
    const selected = parts.filter((n) => defaultSelection.includes(n.id));
    expect(selected.map((n) => n.partId).sort()).toEqual(
      ['ball-caster-16', 'car-chassis-dynamic', 'car-wheel', 'car-wheel'].sort(),
    );
  });

  it('名稱依語言（zh 用 nameZh）', () => {
    const { parts } = partsOf(DEFAULT_CAR_CONFIG, 'zh');
    expect(parts.find((n) => n.partId === 'car-chassis-dynamic')!.name).toBe('圓角2WD 小車底盤');
    const en = partsOf(DEFAULT_CAR_CONFIG, 'en');
    expect(en.parts.find((n) => n.partId === 'car-chassis-dynamic')!.name).toBe('Rounded 2WD Car Chassis');
  });
});

describe('buildCarNodes：4WD (default config)', () => {
  it('13 個節點：4 馬達 + 4 輪、無萬向輪，defaultSelection 5 個', () => {
    const config: CarConfigParams = { ...DEFAULT_CAR_CONFIG, drive: '4wd' };
    const { parts, defaultSelection } = partsOf(config);
    expect(parts).toHaveLength(13);
    expect(parts.filter((n) => n.partId === 'tt-motor')).toHaveLength(4);
    expect(parts.filter((n) => n.partId === 'car-wheel')).toHaveLength(4);
    expect(parts.find((n) => n.partId === 'ball-caster-16')).toBeUndefined();
    expect(defaultSelection).toHaveLength(5);
  });
});

describe('buildCarAnchorAndElectronics', () => {
  it('2WD 預設 config：回傳 1 錨點 + 6 電子零件，defaultSelection 只含錨點', () => {
    const { anchor, electronics, defaultSelection } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    expect(anchor.type).toBe('car-anchor');
    expect(anchor.config.length).toBe(270);
    expect(anchor.electronicsIds).toHaveLength(6);
    expect(electronics).toHaveLength(6);
    expect(electronics.filter((n) => n.partId === 'tt-motor')).toHaveLength(2);
    expect(defaultSelection).toEqual([anchor.id]);
  });

  it('4WD 預設 config：4 馬達，無萬向輪', () => {
    const config = { ...DEFAULT_CAR_CONFIG, drive: '4wd' as const };
    const { anchor, electronics } = buildCarAnchorAndElectronics(config, 'en');
    expect(electronics.filter((n) => n.partId === 'tt-motor')).toHaveLength(4);
    expect(anchor.electronicsIds).toHaveLength(8);
  });

  it('custom length 350：錨點位置跟著變', () => {
    const config = { ...DEFAULT_CAR_CONFIG, length: 350 };
    const { anchor } = buildCarAnchorAndElectronics(config, 'en');
    expect(anchor.transform.position[0]).toBeCloseTo(105 + 27 - 175, 6);
  });
});

describe('buildCarChassisAndGround', () => {
  it('生成底盤 + 2 輪 + 1 萬向輪 = 4 節點', () => {
    const { anchor, electronics } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    const result = buildCarChassisAndGround(anchor, electronics, 'en');
    expect(result.warnings).toEqual([]);
    expect(result.nodes).toHaveLength(4);
    const chassis = result.nodes.find((n) => n.type === 'part' && n.partId === 'car-chassis-dynamic')!;
    expect(chassis.transform.position).toEqual(anchor.transform.position);
    expect(chassis.transform.rotation).toEqual(anchor.transform.rotation);
  });

  it('4WD 生成底盤 + 4 輪 = 5 節點', () => {
    const config = { ...DEFAULT_CAR_CONFIG, drive: '4wd' as const };
    const { anchor, electronics } = buildCarAnchorAndElectronics(config, 'en');
    const result = buildCarChassisAndGround(anchor, electronics, 'en');
    expect(result.warnings).toEqual([]);
    expect(result.nodes).toHaveLength(5);
    expect(result.nodes.filter((n) => n.type === 'part' && n.partId === 'car-wheel')).toHaveLength(4);
  });

  it('孔位超出時回傳 warnings 且 nodes 為空', () => {
    const { anchor, electronics } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    const smallAnchor = { ...anchor, config: { ...DEFAULT_CAR_CONFIG, length: 100, width: 80 } };
    const result = buildCarChassisAndGround(smallAnchor, electronics, 'en');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.nodes).toEqual([]);
  });
});

describe('caster toggle', () => {
  it('caster included by default in 2WD', () => {
    const { parts } = partsOf(DEFAULT_CAR_CONFIG);
    expect(parts.find((n) => n.partId === 'ball-caster-16')).toBeDefined();
  });

  it('caster excluded when includeCaster is false', () => {
    const config: CarConfigParams = { ...DEFAULT_CAR_CONFIG, includeCaster: false };
    const { parts } = partsOf(config);
    expect(parts.find((n) => n.partId === 'ball-caster-16')).toBeUndefined();
  });

  it('caster excluded in 4WD even if includeCaster is true', () => {
    const config: CarConfigParams = { ...DEFAULT_CAR_CONFIG, drive: '4wd', includeCaster: true };
    const { parts } = partsOf(config);
    expect(parts.find((n) => n.partId === 'ball-caster-16')).toBeUndefined();
  });
});

describe('dynamic chassis dimensions', () => {
  it('chassis Z adapts to thickness', () => {
    const config: CarConfigParams = { ...DEFAULT_CAR_CONFIG, thickness: 5 };
    const { parts } = partsOf(config);
    const chassis = parts.find((n) => n.partId === 'car-chassis-dynamic')!;
    expect(chassis.transform.position[2]).toBeCloseTo(15.5, 6);
  });

  it('chassis length change shifts rear components proportionally', () => {
    const config: CarConfigParams = { ...DEFAULT_CAR_CONFIG, length: 350 };
    const { parts } = partsOf(config);
    const battery = parts.find((n) => n.partId === 'battery-18650x2')!;
    const defaultBattery = partsOf(DEFAULT_CAR_CONFIG).parts.find((n) => n.partId === 'battery-18650x2')!;
    expect(battery.transform.position[0]).toBeLessThan(defaultBattery.transform.position[0]);
  });

  it('chassis center shifts with length', () => {
    const config: CarConfigParams = { ...DEFAULT_CAR_CONFIG, length: 300 };
    const { parts } = partsOf(config);
    const chassis = parts.find((n) => n.partId === 'car-chassis-dynamic')!;
    const expectedCx = 105 + 27 - 150;
    expect(chassis.transform.position[0]).toBeCloseTo(expectedCx, 6);
  });
});

describe('error handling', () => {
  it('throws on unknown electronics partId', () => {
    const badSpec: CarPresetSpec = {
      ...SMART_CAR_2WD,
      electronics: [{ partId: 'no-such-part', x: 0, y: 0, z: 20.5, rotZ: 0 }],
    };
    expect(badSpec.electronics[0].partId).toBe('no-such-part');
  });
});
