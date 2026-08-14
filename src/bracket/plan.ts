import type { Bounds3, StandoffPlan } from '../enclosure/plan';
import { pilotDiameter } from '../enclosure/screws';
import type { PartDefinition } from '../parts/schema';
import type { BracketParams } from '../types/document';

export const DEFAULT_BRACKET_PARAMS: BracketParams = {
  baseThickness: 3,
  baseMargin: 3,
  cornerRadius: 3,
  screwSize: 'M3',
  mountingStyle: 'screw',
  baseHoles: true,
};

const PILOT_DEPTH = 6;

export interface BracketPlan {
  /** 底座平板範圍（零件本地座標）；minZ＝底座底面、maxZ＝0（零件底面） */
  base: Bounds3;
  floorZ: number;
  cornerRadius: number;
  /** 對齊零件安裝孔的固定柱（本地座標） */
  standoffs: StandoffPlan[];
  /** 底座四角鎖附孔位置（XY） */
  baseHoles: { x: number; y: number }[];
}

/** 底座四角鎖附孔：inset = cornerRadius + 3，與外殼角柱同公式 */
function cornerBaseHolePositions(base: Bounds3, cornerRadius: number): { x: number; y: number }[] {
  const inset = cornerRadius + 3;
  const xs = [base.minX + inset, base.maxX - inset];
  const ys = [base.minY + inset, base.maxY - inset];
  return xs.flatMap((x) => ys.map((y) => ({ x, y })));
}

/**
 * 在零件本地座標（底面中心原點、Z 向上）計算支架：
 * 底座＝零件本體俯視尺寸向外擴張 baseMargin；固定柱＝零件安裝孔本地位置。
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

  const baseHoles = params.baseHoles === false ? [] : cornerBaseHolePositions(base, cornerRadius);
  return { base, floorZ: base.minZ, cornerRadius, standoffs, baseHoles };
}
