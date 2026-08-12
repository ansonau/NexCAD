import { createCarAnchorNode, createPartNode } from '../types/document';
import { getPartDefinition, registerPartDefinition } from './library';
import type { CarAnchorNode, PartNode, SceneNode } from '../types/document';
import type { MountingHole, PartDefinition } from './schema';

export type CarChassisShape = 'rounded-rect' | 'rect' | 'ellipse';

export type CarDrive = '2wd' | '4wd';

export interface CarConfigParams {
  shape: CarChassisShape;
  length: number;
  width: number;
  thickness: number;
  drive: CarDrive;
  wheelSize: number;
  includeCaster: boolean;
}

export const DEFAULT_CAR_CONFIG: CarConfigParams = {
  shape: 'rounded-rect',
  length: 270,
  width: 185,
  thickness: 3,
  drive: '2wd',
  wheelSize: 65,
  includeCaster: true,
};

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

// tt-motor 出力軸在零件本地座標的位置（src/parts/library.ts 'tt-motor' body.blocks
// 的「輸出軸」block：軸心距圓頭端 11.28mm，故 X=18.5-11.28=7.22；
// 馬達罐 Ø22.4，故軸心距底面 Z=11.2。
const TT_MOTOR_SHAFT_LOCAL_X = 7.22;
const TT_MOTOR_SHAFT_LOCAL_Z = 11.2;

// car-wheel 轉軸世界高度（src/parts/library.ts 'car-wheel' body.blocks 的輪胎
// block：position=[0,13.5,31.5]，rotation=[90,0,0]，bodyT=1；繞 X 轉 90° 後
// z 範圍變成 [-32.5,32.5]，平移 bodyT+31.5=32.5 後變 [0,65]，故轉軸＝32.5，
// 且此值與零件節點 z=0（貼地）無關，即為輪心離地高度）。
const WHEEL_AXIS_Z = 32.5;

/**
 * 底盤頂面＝馬達底面＝電子件底面。馬達軸心世界高度需與輪心 32.5 對齊。
 */
const CHASSIS_TOP_Z = WHEEL_AXIS_Z - TT_MOTOR_SHAFT_LOCAL_Z;

/** 馬達節點 X ＝ 目標軸心世界 X − 軸心本地 X 偏移，讓馬達軸與輪心同一條線（否則轉起來歪的） */
function motorXForWheel(wheelX: number): number {
  return wheelX - TT_MOTOR_SHAFT_LOCAL_X;
}

export const SMART_CAR_2WD: CarPresetSpec = {
  id: 'smart-car-2wd',
  i18nKey: 'toolbar.smartCar2wd',
  electronics: [
    { partId: 'hc-sr04', x: 105, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'arduino-uno', x: 40, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'l298n', x: -25, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'battery-18650x2', x: -95, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: motorXForWheel(-15), y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: motorXForWheel(-15), y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
  ],
  chassisPartId: 'car-chassis-2wd',
  chassisPosition: [-3, 0, CHASSIS_TOP_Z - 3],
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
    { partId: 'tt-motor', x: motorXForWheel(65), y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: motorXForWheel(65), y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: motorXForWheel(-80), y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: motorXForWheel(-80), y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 },
  ],
  chassisPartId: 'car-chassis-2wd',
  chassisPosition: [-3, 0, CHASSIS_TOP_Z - 3],
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

const DEFAULT_CHASSIS_LENGTH = 270;
const FRONT_SENSOR_X = 105;
const FRONT_MARGIN = 27;

function chassisCenterX(length: number): number {
  return FRONT_SENSOR_X + FRONT_MARGIN - length / 2;
}

const CHASSIS_DYNAMIC_PART_ID = 'car-chassis-dynamic';

function computeCornerRadius(shape: CarChassisShape, length: number, width: number): number {
  switch (shape) {
    case 'rounded-rect':
      return Math.round(Math.min(length, width) * 0.037);
    case 'rect':
      return 0;
    case 'ellipse':
      return Math.round(Math.min(length, width) / 2);
  }
}

export function buildChassisDef(config: CarConfigParams): PartDefinition {
  const { shape, length, width, thickness } = config;
  const cornerRadius = computeCornerRadius(shape, length, width);

  return {
    id: CHASSIS_DYNAMIC_PART_ID,
    name: 'Car Chassis',
    nameZh: '小車底盤',
    category: 'component',
    body: { size: [length, width, thickness], cornerRadius, blocks: [] },
    mountingHoles: [],
    ports: [],
    clearanceHeight: thickness,
  };
}

function adaptElectronicsLayout(
  electronics: CarPresetElectronics[],
  config: CarConfigParams,
): CarPresetElectronics[] {
  const scale = config.length / DEFAULT_CHASSIS_LENGTH;
  const defaultCx = chassisCenterX(DEFAULT_CHASSIS_LENGTH);
  const newCx = chassisCenterX(config.length);

  return electronics.map((e) => ({
    ...e,
    x: newCx + (e.x - defaultCx) * scale,
  }));
}

/**
 * 由 preset 組整車節點。defaultSelection＝貼地結構組（底盤+輪+萬向輪）：
 * 外殼地板跟隨最低被選件底面，選貼地組才能讓「產生外殼」得到落地展示盒（design.md D10）。
 */
export function buildCarNodes(spec: CarPresetSpec, lang: string): { nodes: SceneNode[]; defaultSelection: string[] };
export function buildCarNodes(config: CarConfigParams, lang: string): { nodes: SceneNode[]; defaultSelection: string[] };
export function buildCarNodes(
  specOrConfig: CarPresetSpec | CarConfigParams,
  lang: string,
): { nodes: SceneNode[]; defaultSelection: string[] } {
  if ('drive' in specOrConfig) {
    const { anchor, electronics } = buildCarAnchorAndElectronics(specOrConfig, lang);
    const ground = buildCarChassisAndGround(anchor, electronics, lang);
    if (ground.warnings.length > 0) throw new Error(ground.warnings.join('\n'));
    return { nodes: [...electronics, ...ground.nodes], defaultSelection: ground.defaultSelection };
  }

  const spec = specOrConfig;
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

function rotateZ(p: [number, number, number], rotZ: number): [number, number, number] {
  const rad = rotZ * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

function toAnchorLocal(anchor: CarAnchorNode, worldPt: [number, number, number]): [number, number, number] {
  const [px, py, pz] = anchor.transform.position;
  return rotateZ([worldPt[0] - px, worldPt[1] - py, worldPt[2] - pz], -anchor.transform.rotation[2]);
}

function toWorld(anchor: CarAnchorNode, localPt: [number, number, number]): [number, number, number] {
  const [px, py, pz] = anchor.transform.position;
  const rotated = rotateZ(localPt, anchor.transform.rotation[2]);
  return [rotated[0] + px, rotated[1] + py, rotated[2] + pz];
}

export function buildCarAnchorAndElectronics(
  config: CarConfigParams,
  lang: string,
): { anchor: CarAnchorNode; electronics: PartNode[]; defaultSelection: string[] } {
  const spec = config.drive === '2wd' ? SMART_CAR_2WD : SMART_CAR_4WD;
  const cx = chassisCenterX(config.length);
  const electronics = adaptElectronicsLayout(spec.electronics, config).map(({ partId, x, y, z, rotZ }) =>
    createPartNode(partId, partName(partId, lang), {
      transform: { position: [x, y, z], rotation: [0, 0, rotZ], scale: [1, 1, 1] },
    }),
  );
  const anchor = createCarAnchorNode(config, spec.id as CarAnchorNode['presetId'], electronics.map((e) => e.id), {
    transform: { position: [cx, 0, CHASSIS_TOP_Z - config.thickness], rotation: [0, 0, 0], scale: [1, 1, 1] },
    name: lang === 'zh' ? '小車錨點' : 'Car Anchor',
  });

  return { anchor, electronics, defaultSelection: [anchor.id] };
}

const CANONICAL_CHASSIS_LENGTH = 270;
const CANONICAL_CHASSIS_CENTER_X = chassisCenterX(CANONICAL_CHASSIS_LENGTH);

/** 每個錨點各自一個底盤 partId，避免同文件多台車互相覆蓋彼此的底盤定義（見 rehydrateCarChassisDefs） */
export function chassisPartIdForAnchor(anchorId: string): string {
  return `car-chassis-${anchorId}`;
}

/**
 * 純函式：由錨點設定 + 目前場景（電子件即時位置）算出底盤零件定義。
 * `buildCarChassisAndGround`（互動生成，孔位超界要擋）與 `rehydrateCarChassisDefs`
 * （文件載入後補註冊，best-effort 不擋）共用同一份計算，避免兩邊算法 drift。
 */
function computeChassisDefinition(
  anchor: CarAnchorNode,
  sceneNodes: SceneNode[],
): { definition: PartDefinition; warnings: string[] } {
  const warnings: string[] = [];
  const { length, width, thickness, shape } = anchor.config;
  const electronicsHoles: MountingHole[] = [];
  const idSet = new Set(anchor.electronicsIds);
  const halfL = length / 2;
  const halfW = width / 2;

  for (const node of sceneNodes) {
    if (!idSet.has(node.id) || node.type !== 'part' || !node.visible) continue;
    const def = getPartDefinition(node.partId);
    if (!def) continue;
    for (const hole of def.mountingHoles) {
      const worldPt = rotateZ([hole.x, hole.y, 0], node.transform.rotation[2]);
      worldPt[0] += node.transform.position[0];
      worldPt[1] += node.transform.position[1];
      worldPt[2] += node.transform.position[2];
      const local = toAnchorLocal(anchor, worldPt);
      if (Math.abs(local[0]) > halfL || Math.abs(local[1]) > halfW) {
        warnings.push(`孔位 (${local[0].toFixed(1)}, ${local[1].toFixed(1)}) 超出底盤範圍`);
      }
      electronicsHoles.push({ x: local[0], y: local[1], diameter: hole.diameter, standoff: false });
    }
  }

  const cornerHoles: MountingHole[] = [
    { x: -(halfL - 10), y: -(halfW - 10), diameter: 3 },
    { x: -(halfL - 10), y: halfW - 10, diameter: 3 },
    { x: halfL - 10, y: -(halfW - 10), diameter: 3 },
    { x: halfL - 10, y: halfW - 10, diameter: 3 },
  ];

  const definition: PartDefinition = {
    id: chassisPartIdForAnchor(anchor.id),
    name: 'Car Chassis',
    nameZh: '小車底盤',
    category: 'component',
    body: { size: [length, width, thickness], cornerRadius: computeCornerRadius(shape, length, width), blocks: [] },
    mountingHoles: [...cornerHoles, ...electronicsHoles],
    ports: [],
    clearanceHeight: thickness,
  };
  return { definition, warnings };
}

/**
 * 底盤零件定義只存在記憶體 registry（不隨 .nexcad / IndexedDB 存檔，因為孔位是由
 * 「當下」電子件位置算出的衍生資料，不是需要持久化的來源）。文件重新載入後
 * registry 是空的，若不補註冊，底盤節點會找不到定義而消失（mesh 為 null）。
 * 呼叫端：任何把 doc 設回 store 的地方（開專案、匯入、初次啟動還原）之後、
 * 送出幾何求值之前，先呼叫這個函式。best-effort：孔位超界也照樣註冊，不擋——
 * 擋超界是互動生成流程（buildCarChassisAndGround）的責任，這裡只求「至少畫得出來」。
 */
export function rehydrateCarChassisDefs(nodes: SceneNode[]): void {
  for (const node of nodes) {
    if (node.type !== 'car-anchor') continue;
    const { definition } = computeChassisDefinition(node, nodes);
    registerPartDefinition(definition);
  }
}

export function buildCarChassisAndGround(
  anchor: CarAnchorNode,
  sceneNodes: SceneNode[],
  lang: string,
): { nodes: SceneNode[]; defaultSelection: string[]; warnings: string[] } {
  const spec = anchor.presetId === 'smart-car-2wd' ? SMART_CAR_2WD : SMART_CAR_4WD;
  const { length, includeCaster } = anchor.config;
  const { definition, warnings } = computeChassisDefinition(anchor, sceneNodes);
  if (warnings.length > 0) return { nodes: [], defaultSelection: [], warnings };

  registerPartDefinition(definition);

  const chassis = createPartNode(definition.id, partNameDynamicChassis(anchor.config, lang), {
    transform: { ...anchor.transform },
  });
  const scale = length / CANONICAL_CHASSIS_LENGTH;
  const wheels = (spec.wheels ?? []).map((wheel) => {
    const [x, y] = toWorld(anchor, [(wheel.x - CANONICAL_CHASSIS_CENTER_X) * scale, wheel.y, 0]);
    return createPartNode(wheel.partId, partName(wheel.partId, lang), {
      transform: { position: [x, y, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    });
  });
  const casterNodes: PartNode[] = [];
  if (spec.caster && includeCaster) {
    const [x, y] = toWorld(anchor, [(spec.caster.x - CANONICAL_CHASSIS_CENTER_X) * scale, spec.caster.y, 0]);
    casterNodes.push(createPartNode(spec.caster.partId, partName(spec.caster.partId, lang), {
      transform: { position: [x, y, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    }));
  }

  const nodes: SceneNode[] = [chassis, ...wheels, ...casterNodes];
  return { nodes, defaultSelection: nodes.map((node) => node.id), warnings };
}

function partNameDynamicChassis(config: CarConfigParams, lang: string): string {
  const shapeLabel =
    config.shape === 'rounded-rect'
      ? lang === 'zh'
        ? '圓角'
        : 'Rounded'
      : config.shape === 'ellipse'
        ? lang === 'zh'
          ? '橢圓'
          : 'Ellipse'
        : lang === 'zh'
          ? '直角'
          : 'Rect';
  const driveLabel = config.drive === '2wd' ? '2WD' : '4WD';
  return lang === 'zh'
    ? `${shapeLabel}${driveLabel} 小車底盤`
    : `${shapeLabel} ${driveLabel} Car Chassis`;
}
