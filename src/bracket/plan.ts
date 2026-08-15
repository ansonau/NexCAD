import type { Bounds3, StandoffPlan } from '../enclosure/plan';
import { pilotDiameter } from '../enclosure/screws';
import type { PartDefinition } from '../parts/schema';
import type { BracketParams } from '../types/document';

export const DEFAULT_BRACKET_PARAMS: BracketParams = {
  style: 'base',
  baseThickness: 3,
  baseMargin: 6,
  cornerRadius: 3,
  screwSize: 'M3',
  mountingStyle: 'screw',
  baseHoles: true,
  wallHeight: 0,
  wallThickness: 1.5,
  wallClearance: 0.5,
};

const PILOT_DEPTH = 6;

export interface BracketPlan {
  /** 底座平板範圍（零件本地座標）；minZ＝底座底面、maxZ＝0（零件底面） */
  base: Bounds3;
  floorZ: number;
  cornerRadius: number;
  /** 對齊零件安裝孔的固定柱（本地座標） */
  standoffs: StandoffPlan[];
  /** 底座四角鎖附孔位置（XY，落在零件外側的鎖附帶） */
  baseHoles: { x: number; y: number }[];
  /** 零件四周定位擋牆；height<=0 表示不生成 */
  wall: { outerW: number; outerD: number; innerW: number; innerD: number; height: number; cornerRadius: number };
}

/**
 * 底座四角鎖附孔：落在「零件外側的鎖附帶」中央，確保螺絲孔不被零件本體遮住。
 * 位置＝零件半寬 + baseMargin/2；孔徑由呼叫端依 screwSize 決定。
 */
function cornerBaseHolePositions(def: PartDefinition, params: BracketParams): { x: number; y: number }[] {
  const [w, d] = def.body.size;
  const hx = w / 2 + params.baseMargin / 2;
  const hy = d / 2 + params.baseMargin / 2;
  return [
    { x: -hx, y: -hy },
    { x: -hx, y: hy },
    { x: hx, y: -hy },
    { x: hx, y: hy },
  ];
}

/**
 * 在零件本地座標（底面中心原點、Z 向上）計算支架：
 * 底座＝零件本體俯視尺寸向外擴張 baseMargin；固定柱＝零件安裝孔本地位置；
 * 擋牆＝零件四周定位牆（wallHeight > 0 時）。
 * 此函式不考慮零件在世界座標的旋轉，呼叫端負責套用 transform。
 */
export function planBracket(def: PartDefinition, params: BracketParams): BracketPlan {
  const [w, d] = def.body.size;
  const m = params.baseMargin;
  const base: Bounds3 = {
    minX: -w / 2 - m,
    maxX: w / 2 + m,
    minY: -d / 2 - m,
    maxY: d / 2 + m,
    minZ: -params.baseThickness,
    maxZ: 0,
  };
  const width = base.maxX - base.minX;
  const depth = base.maxY - base.minY;
  const cornerRadius = Math.max(0, Math.min(params.cornerRadius, width / 2 - 0.1, depth / 2 - 0.1));

  const mountingStyle = params.mountingStyle ?? 'screw';
  const standoffs: StandoffPlan[] = def.mountingHoles
    .filter((hole) => hole.standoff !== false)
    .map((hole) => ({
      x: hole.x,
      y: hole.y,
      topZ: hole.z ?? 0,
      pilotDiameter: pilotDiameter(params.screwSize, 'selfTap'),
      pilotDepth: PILOT_DEPTH,
      mountingStyle,
      holeDiameter: hole.diameter,
    }));

  const baseHoles = params.baseHoles === false ? [] : cornerBaseHolePositions(def, params);

  const wallHeight = params.wallHeight ?? 0;
  const wallThickness = params.wallThickness ?? 1.5;
  const wallClearance = params.wallClearance ?? 0.5;
  const wall: BracketPlan['wall'] = {
    outerW: w + 2 * wallClearance + 2 * wallThickness,
    outerD: d + 2 * wallClearance + 2 * wallThickness,
    innerW: w + 2 * wallClearance,
    innerD: d + 2 * wallClearance,
    height: wallHeight,
    cornerRadius: Math.max(0, cornerRadius - wallThickness),
  };

  return { base, floorZ: base.minZ, cornerRadius, standoffs, baseHoles, wall };
}
