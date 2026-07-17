import { pilotDiameter } from './screws';
import type { ScrewSize } from './screws';
import type { PartDefinition } from '../parts/schema';
import type { Transform } from '../types/document';

export type { EnclosureParams, MountingStyle } from '../types/document';
import type { EnclosureParams, MountingStyle } from '../types/document';

const DEG = Math.PI / 180;

export interface PartInstance {
  def: PartDefinition;
  /** 只使用 position 與 rotation.z（與 holeSnap.ts 慣例一致） */
  transform: Transform;
}

export interface Bounds3 {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export const DEFAULT_ENCLOSURE_PARAMS: EnclosureParams = {
  wallThickness: 3,
  clearanceMargin: 3,
  cornerRadius: 3,
  lidType: 'screw',
  screwSize: 'M3',
  standoffWallPadding: 3,
  reserveCornerSpace: true,
  mountingStyle: 'screw',
  screwLidProfile: 'flatRecessed',
};

/** 零件在世界座標下的包覆範圍（只考慮 Z 軸旋轉） */
export function partWorldBounds(part: PartInstance): Bounds3 {
  const [w, d, t] = part.def.body.size;
  const angle = part.transform.rotation[2] * DEG;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfW = (w * cos + d * sin) / 2;
  const halfD = (w * sin + d * cos) / 2;
  const [px, py, pz] = part.transform.position;
  return {
    minX: px - halfW,
    maxX: px + halfW,
    minY: py - halfD,
    maxY: py + halfD,
    minZ: pz,
    maxZ: pz + Math.max(t, part.def.clearanceHeight),
  };
}

export function combinedBounds(parts: PartInstance[]): Bounds3 {
  if (parts.length === 0) throw new Error('combinedBounds: parts 不可為空');
  const boxes = parts.map(partWorldBounds);
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
    minZ: Math.min(...boxes.map((b) => b.minZ)),
    maxZ: Math.max(...boxes.map((b) => b.maxZ)),
  };
}

export interface ShellPlan {
  /** 淨空腔體（含 clearanceMargin），頂部即殼體開口 */
  inner: Bounds3;
  /** 含壁厚的外形；頂部與 inner 相同（開放，上蓋另外生成） */
  outer: Bounds3;
  cornerRadius: number;
  /** 殼體外底面高度，等同 outer.minZ */
  floorZ: number;
  /** 壁厚，供 planCornerPosts 計算碰撞緩衝半徑用（見 design.md D1） */
  wallThickness: number;
  standoffWallPadding: number;
}

const EXPANSION_STEP = 0.5;
const EXPANSION_CAP = 12;

/** 以 outer 邊界與 cornerRadius 算出四個角柱的標準位置（inset = cornerRadius+3，見 design.md D1/D2） */
function cornerPostPositions(outer: Bounds3, cornerRadius: number): Array<{ x: number; y: number }> {
  const inset = cornerRadius + 3;
  const xs = [outer.minX + inset, outer.maxX - inset];
  const ys = [outer.minY + inset, outer.maxY - inset];
  return xs.flatMap((x) => ys.map((y) => ({ x, y })));
}

/** 給定擴量 e，算出擴大後的 outer 與重新 clamp 的 cornerRadius */
function expandedOuter(outer: Bounds3, params: EnclosureParams, e: number): { outer: Bounds3; cornerRadius: number } {
  const expanded: Bounds3 = {
    minX: outer.minX - e,
    maxX: outer.maxX + e,
    minY: outer.minY - e,
    maxY: outer.maxY + e,
    minZ: outer.minZ,
    maxZ: outer.maxZ,
  };
  const width = expanded.maxX - expanded.minX;
  const depth = expanded.maxY - expanded.minY;
  const cornerRadius = Math.max(0, Math.min(params.cornerRadius, width / 2 - 0.1, depth / 2 - 0.1));
  return { outer: expanded, cornerRadius };
}

/** design.md D1：找最小擴量 e（0.5mm 步進，上限 12mm），使四個角柱標準位置皆與所有零件 bbox 保持
 * ≥ collisionRadius 的距離；找不到則回傳上限值（安全網交給 planCornerPosts 的 collided 標記）。 */
function findExpansion(outer: Bounds3, params: EnclosureParams, boxes: Bounds3[]): number {
  if (boxes.length === 0) return 0;
  const collisionRadius =
    pilotDiameter(params.screwSize, 'through') / 2 +
    Math.max(params.wallThickness, params.standoffWallPadding);
  for (let e = 0; e <= EXPANSION_CAP; e += EXPANSION_STEP) {
    const { outer: candidateOuter, cornerRadius } = expandedOuter(outer, params, e);
    const posts = cornerPostPositions(candidateOuter, cornerRadius);
    const safe = posts.every((post) => !boxes.some((b) => circleOverlapsBounds(post.x, post.y, collisionRadius, b)));
    if (safe) return e;
  }
  return EXPANSION_CAP;
}

export function planShell(parts: PartInstance[], params: EnclosureParams): ShellPlan {
  const p = combinedBounds(parts);
  const m = params.clearanceMargin;
  const inner: Bounds3 = {
    minX: p.minX - m,
    maxX: p.maxX + m,
    minY: p.minY - m,
    maxY: p.maxY + m,
    minZ: p.minZ,
    maxZ: p.maxZ + m,
  };
  const t = params.wallThickness;
  let outer: Bounds3 = {
    minX: inner.minX - t,
    maxX: inner.maxX + t,
    minY: inner.minY - t,
    maxY: inner.maxY + t,
    minZ: inner.minZ - t,
    maxZ: inner.maxZ,
  };

  if (params.lidType === 'screw' && params.reserveCornerSpace !== false) {
    const boxes = parts.map((part) => partWorldBounds(part));
    const e = findExpansion(outer, params, boxes);
    if (e > 0) {
      outer = {
        ...outer,
        minX: outer.minX - e,
        maxX: outer.maxX + e,
        minY: outer.minY - e,
        maxY: outer.maxY + e,
      };
      inner.minX -= e;
      inner.maxX += e;
      inner.minY -= e;
      inner.maxY += e;
    }
  }

  const width = outer.maxX - outer.minX;
  const depth = outer.maxY - outer.minY;
  const cornerRadius = Math.max(0, Math.min(params.cornerRadius, width / 2 - 0.1, depth / 2 - 0.1));
  return {
    inner,
    outer,
    cornerRadius,
    floorZ: outer.minZ,
    wallThickness: params.wallThickness,
    standoffWallPadding: params.standoffWallPadding,
  };
}

export interface StandoffPlan {
  x: number;
  y: number;
  /** 支柱頂面（螺絲導孔開口）絕對高度 */
  topZ: number;
  pilotDiameter: number;
  pilotDepth: number;
  /** 僅角柱使用：柱心嚴格落入零件 bbox 內部（嚴重重疊）時為 true（見 design.md D2） */
  collided?: boolean;
  /** 零件安裝柱的固定方式，'peg' 時 buildShellSolid 改長實心定位柱（design.md D2/D3） */
  mountingStyle?: MountingStyle;
  /** 零件安裝孔的實際孔徑（來自 PartDefinition.mountingHoles），peg 幾何用它算定位柱直徑 */
  holeDiameter?: number;
}

const PILOT_DEPTH = 6;

/** 每個零件的每個安裝孔 → 世界座標支柱規劃 */
export function planStandoffs(
  parts: PartInstance[],
  screwSize: ScrewSize,
  pilotDepth: number = PILOT_DEPTH,
  mountingStyle: MountingStyle = 'screw',
): StandoffPlan[] {
  const out: StandoffPlan[] = [];
  for (const part of parts) {
    const angle = part.transform.rotation[2] * DEG;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [px, py, pz] = part.transform.position;
    for (const hole of part.def.mountingHoles) {
      out.push({
        x: px + hole.x * cos - hole.y * sin,
        y: py + hole.x * sin + hole.y * cos,
        topZ: pz + (hole.z ?? 0),
        pilotDiameter: pilotDiameter(screwSize, 'selfTap'),
        pilotDepth,
        mountingStyle,
        holeDiameter: hole.diameter,
      });
    }
  }
  return out;
}

/** 圓心到零件 2D (XY) bounding box 的最短距離是否小於碰撞半徑（circle-vs-AABB） */
function circleOverlapsBounds(x: number, y: number, radius: number, b: Bounds3): boolean {
  const clampedX = Math.max(b.minX, Math.min(x, b.maxX));
  const clampedY = Math.max(b.minY, Math.min(y, b.maxY));
  const dx = x - clampedX;
  const dy = y - clampedY;
  return dx * dx + dy * dy < radius * radius;
}

/** 柱心（點）是否嚴格落入零件 XY bbox 內部（邊界相切不算，見 design.md D2） */
function pointStrictlyInsideBounds(x: number, y: number, b: Bounds3): boolean {
  return x > b.minX && x < b.maxX && y > b.minY && y < b.maxY;
}

/** 外殼四個角落的上蓋鎖點支柱，固定在標準角落位置（inset = cornerRadius+3），頂部對齊殼體開口（內腔頂）。
 * 空間保留（reserveCornerSpace）由 planShell 的擴殼負責；此處不再位移，
 * collided 僅在柱心嚴重重疊（嚴格落入零件 bbox 內部）時標記，作為安全網（design.md D2）。 */
export function planCornerPosts(
  plan: ShellPlan,
  screwSize: ScrewSize,
  parts: PartInstance[],
  pilotDepth: number = PILOT_DEPTH,
): StandoffPlan[] {
  const inset = plan.cornerRadius + 3;
  const xs = [plan.outer.minX + inset, plan.outer.maxX - inset];
  const ys = [plan.outer.minY + inset, plan.outer.maxY - inset];
  const boxes = parts.map((part) => partWorldBounds(part));

  const out: StandoffPlan[] = [];
  for (const x of xs) {
    for (const y of ys) {
      const collided = boxes.some((b) => pointStrictlyInsideBounds(x, y, b)) || undefined;
      out.push({
        x,
        y,
        topZ: plan.inner.maxZ,
        pilotDiameter: pilotDiameter(screwSize, 'selfTap'),
        pilotDepth,
        collided,
      });
    }
  }
  return out;
}
