import type { Bounds3, PartInstance, StandoffPlan } from '../enclosure/plan';
import { combinedBounds, planStandoffs } from '../enclosure/plan';
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
  /** 底座平板範圍；minZ＝底座底面（floorZ）、maxZ＝底座頂面（零件底面） */
  base: Bounds3;
  floorZ: number;
  cornerRadius: number;
  /** 對齊零件安裝孔的固定柱 */
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

/** 由來源零件計算支架：底座＝零件世界包覆盒向外擴張 baseMargin，固定柱＝零件安裝孔。 */
export function planBracket(parts: PartInstance[], params: BracketParams): BracketPlan {
  const bounds = combinedBounds(parts);
  const m = params.baseMargin;
  const base: Bounds3 = {
    minX: bounds.minX - m,
    maxX: bounds.maxX + m,
    minY: bounds.minY - m,
    maxY: bounds.maxY + m,
    minZ: bounds.minZ - params.baseThickness,
    maxZ: bounds.minZ,
  };
  const width = base.maxX - base.minX;
  const depth = base.maxY - base.minY;
  const cornerRadius = Math.max(0, Math.min(params.cornerRadius, width / 2 - 0.1, depth / 2 - 0.1));
  const standoffs = planStandoffs(parts, params.screwSize, PILOT_DEPTH, params.mountingStyle ?? 'screw');
  const baseHoles = params.baseHoles === false ? [] : cornerBaseHolePositions(base, cornerRadius);
  return { base, floorZ: base.minZ, cornerRadius, standoffs, baseHoles };
}
