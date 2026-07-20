import { createPartNode } from '../types/document';
import { getPartDefinition } from './library';
import type { PartNode, SceneNode } from '../types/document';

export interface CarPresetElectronics {
  partId: string;
  x: number;
  y: number;
  z: number;
  rotZ: number;
}

export interface CarPresetGroundPart {
  partId: string;
  x: number;
  y: number;
}

/** 智能小車 preset 資料結構（design.md D9）。車頭朝 +X；輪/萬向輪貼地 z=0、電子件站底盤頂 */
export interface CarPresetSpec {
  id: string;
  i18nKey: string;
  /** 電子零件與馬達（站上底盤頂） */
  electronics: CarPresetElectronics[];
  chassisPartId: string;
  /** 底盤節點世界位置（底面中心） */
  chassisPosition: [number, number, number];
  /** 貼地車輪（z=0） */
  wheels: CarPresetGroundPart[];
  /** 貼地萬向輪（z=0）；4WD 無 */
  caster?: CarPresetGroundPart;
}

/** 底盤頂面＝馬達底面＝電子件底面；軸心 20.5+12=32.5＝輪心（design.md D1） */
const CHASSIS_TOP_Z = 20.5;

export const SMART_CAR_2WD: CarPresetSpec = {
  id: 'smart-car-2wd',
  i18nKey: 'toolbar.smartCar2wd',
  electronics: [
    { partId: 'hc-sr04', x: 105, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'arduino-uno', x: 40, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'l298n', x: -25, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'battery-18650x2', x: -95, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: -35, y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: -35, y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
  ],
  chassisPartId: 'car-chassis-2wd',
  chassisPosition: [-3, 0, 17.5],
  wheels: [
    { partId: 'car-wheel', x: -15, y: 107.5 },
    { partId: 'car-wheel', x: -15, y: -107.5 },
  ],
  caster: { partId: 'ball-caster-16', x: 95, y: 0 },
};

export const SMART_CAR_4WD: CarPresetSpec = {
  id: 'smart-car-4wd',
  i18nKey: 'toolbar.smartCar4wd',
  electronics: [
    { partId: 'hc-sr04', x: 105, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'arduino-uno', x: 40, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'l298n', x: -25, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'battery-18650x2', x: -95, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: 45, y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: 45, y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: -100, y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: -100, y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
  ],
  chassisPartId: 'car-chassis-2wd',
  chassisPosition: [-3, 0, 17.5],
  wheels: [
    { partId: 'car-wheel', x: 65, y: 107.5 },
    { partId: 'car-wheel', x: 65, y: -107.5 },
    { partId: 'car-wheel', x: -80, y: 107.5 },
    { partId: 'car-wheel', x: -80, y: -107.5 },
  ],
};

export const CAR_PRESETS: CarPresetSpec[] = [SMART_CAR_2WD, SMART_CAR_4WD];

function partName(partId: string, lang: string): string {
  const def = getPartDefinition(partId);
  if (!def) throw new Error(`car-preset: unknown part id "${partId}"`);
  return lang === 'zh' ? def.nameZh : def.name;
}

/**
 * 由 preset 組整車節點。defaultSelection＝貼地結構組（底盤+輪+萬向輪）：
 * 外殼地板跟隨最低被選件底面，選貼地組才能讓「產生外殼」得到落地展示盒（design.md D10）。
 */
export function buildCarNodes(
  spec: CarPresetSpec,
  lang: string,
): { nodes: SceneNode[]; defaultSelection: string[] } {
  const electronics: PartNode[] = spec.electronics.map(({ partId, x, y, z, rotZ }) =>
    createPartNode(partId, partName(partId, lang), {
      transform: { position: [x, y, z], rotation: [0, 0, rotZ], scale: [1, 1, 1] },
    }),
  );

  const chassis = createPartNode(spec.chassisPartId, partName(spec.chassisPartId, lang), {
    transform: { position: spec.chassisPosition, rotation: [0, 0, 0], scale: [1, 1, 1] },
  });

  const ground: PartNode[] = spec.wheels.map(({ partId, x, y }) =>
    createPartNode(partId, partName(partId, lang), {
      transform: { position: [x, y, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    }),
  );
  if (spec.caster) {
    ground.push(
      createPartNode(spec.caster.partId, partName(spec.caster.partId, lang), {
        transform: {
          position: [spec.caster.x, spec.caster.y, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      }),
    );
  }

  return {
    nodes: [...electronics, chassis, ...ground],
    defaultSelection: [chassis.id, ...ground.map((n) => n.id)],
  };
}