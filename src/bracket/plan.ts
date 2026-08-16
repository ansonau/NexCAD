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
  baseHoleCount: 4,
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
  wall: { outerW: number; outerD: number; innerW: number; innerD: number; height: number; cornerRadius: number; cx: number; cy: number };
}

/**
 * 依底座平板範圍計算鎖附孔位置。
 * - `spacing` > 0：鎖附孔置中於底座、以該中心距排列（2 孔沿指定軸、4 孔成方形）。
 * - 否則：4 孔＝四角內縮；2 孔＝沿指定軸兩端、置中於另一軸。
 * `axis` 只影響 2 孔：'long' 沿較長軸、'short' 沿較短軸。
 */
export function baseHolePositions(
  bounds: Pick<Bounds3, 'minX' | 'maxX' | 'minY' | 'maxY'>,
  inset: number,
  count: 2 | 4,
  spacing?: number,
  axis: 'long' | 'short' = 'long',
): { x: number; y: number }[] {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxY - bounds.minY;
  const longIsX = w >= d;
  const alongX = axis === 'long' ? longIsX : !longIsX;

  if (spacing && spacing > 0) {
    const half = spacing / 2;
    if (count === 2) {
      if (alongX) return [{ x: cx - half, y: cy }, { x: cx + half, y: cy }];
      return [{ x: cx, y: cy - half }, { x: cx, y: cy + half }];
    }
    return [
      { x: cx - half, y: cy - half },
      { x: cx - half, y: cy + half },
      { x: cx + half, y: cy - half },
      { x: cx + half, y: cy + half },
    ];
  }

  if (count === 2) {
    if (alongX) {
      return [{ x: bounds.minX + inset, y: cy }, { x: bounds.maxX - inset, y: cy }];
    }
    return [{ x: cx, y: bounds.minY + inset }, { x: cx, y: bounds.maxY - inset }];
  }
  return [
    { x: bounds.minX + inset, y: bounds.minY + inset },
    { x: bounds.minX + inset, y: bounds.maxY - inset },
    { x: bounds.maxX - inset, y: bounds.minY + inset },
    { x: bounds.maxX - inset, y: bounds.maxY - inset },
  ];
}

/**
 * 在零件本地座標（Z 向上）計算底座型支架：
 * 底座＝零件俯視範圍向外擴張 baseExpand；固定柱＝零件安裝孔本地位置；
 * 擋牆＝零件四周定位牆（wallHeight > 0 時）。
 * `footprint` 為零件真實俯視包覆盒（含突出 block）；未提供時用本體尺寸（供純函式測試）。
 * 此函式不考慮零件在世界座標的旋轉，呼叫端負責套用 transform。
 */
export function planBracket(
  def: PartDefinition,
  params: BracketParams,
  footprint?: Pick<Bounds3, 'minX' | 'maxX' | 'minY' | 'maxY'>,
): BracketPlan {
  const [w, d] = def.body.size;
  const fx = footprint ?? { minX: -w / 2, maxX: w / 2, minY: -d / 2, maxY: d / 2 };
  const fcx = (fx.minX + fx.maxX) / 2;
  const fcy = (fx.minY + fx.maxY) / 2;
  const expand = params.baseExpand ?? params.baseMargin;
  const base: Bounds3 = {
    minX: fx.minX - expand,
    maxX: fx.maxX + expand,
    minY: fx.minY - expand,
    maxY: fx.maxY + expand,
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

  const baseHoles = params.baseHoles === false
    ? []
    : baseHolePositions(base, params.baseHoleInset ?? params.baseMargin / 2, params.baseHoleCount ?? 4, params.baseHoleSpacing, params.baseHoleAxis ?? 'long');

  const wallHeight = params.wallHeight ?? 0;
  const wallThickness = params.wallThickness ?? 1.5;
  const wallClearance = params.wallClearance ?? 0.5;
  const fw = fx.maxX - fx.minX;
  const fd = fx.maxY - fx.minY;
  const wall: BracketPlan['wall'] = {
    outerW: fw + 2 * wallClearance + 2 * wallThickness,
    outerD: fd + 2 * wallClearance + 2 * wallThickness,
    innerW: fw + 2 * wallClearance,
    innerD: fd + 2 * wallClearance,
    height: wallHeight,
    cornerRadius: Math.max(0, cornerRadius - wallThickness),
    cx: fcx,
    cy: fcy,
  };

  return { base, floorZ: base.minZ, cornerRadius, standoffs, baseHoles, wall };
}
