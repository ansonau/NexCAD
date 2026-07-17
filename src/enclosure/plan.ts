import { pilotDiameter } from './screws';
import type { ScrewSize } from './screws';
import type { PartDefinition } from '../parts/schema';
import type { Transform } from '../types/document';

export type { EnclosureParams } from '../types/document';
import type { EnclosureParams } from '../types/document';

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
  const outer: Bounds3 = {
    minX: inner.minX - t,
    maxX: inner.maxX + t,
    minY: inner.minY - t,
    maxY: inner.maxY + t,
    minZ: inner.minZ - t,
    maxZ: inner.maxZ,
  };
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
  /** 僅角柱使用：搜尋範圍內找不到無碰撞位置時為 true，維持原位置（見 design.md D2） */
  collided?: boolean;
}

const PILOT_DEPTH = 6;

/** 每個零件的每個安裝孔 → 世界座標支柱規劃 */
export function planStandoffs(
  parts: PartInstance[],
  screwSize: ScrewSize,
  pilotDepth: number = PILOT_DEPTH,
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

function collidesWithAnyPart(x: number, y: number, radius: number, boxes: Bounds3[]): boolean {
  return boxes.some((b) => circleOverlapsBounds(x, y, radius, b));
}

/** 沿單一方向以 1mm 步進搜尋無碰撞偏移量；找不到回傳 null（見 design.md D2） */
function searchOffset(
  test: (offset: number) => boolean,
  direction: number,
  limit: number,
): number | null {
  if (direction === 0) return null;
  for (let step = 1; step <= limit; step++) {
    const offset = step * direction;
    if (!test(offset)) return offset;
  }
  return null;
}

/** 外殼四個角落的上蓋鎖點支柱，頂部對齊殼體開口（內腔頂）。
 * 每個角柱若與零件 bounding box 重疊，沿其所屬的水平/垂直邊向外搜尋鄰近無碰撞位置（design.md D2）。 */
export function planCornerPosts(
  plan: ShellPlan,
  screwSize: ScrewSize,
  parts: PartInstance[],
  pilotDepth: number = PILOT_DEPTH,
): StandoffPlan[] {
  const inset = plan.cornerRadius + 3;
  const xs = [plan.outer.minX + inset, plan.outer.maxX - inset];
  const ys = [plan.outer.minY + inset, plan.outer.maxY - inset];
  const centerX = (plan.outer.minX + plan.outer.maxX) / 2;
  const centerY = (plan.outer.minY + plan.outer.maxY) / 2;
  const width = plan.outer.maxX - plan.outer.minX;
  const depth = plan.outer.maxY - plan.outer.minY;
  const limit = Math.floor(Math.min(width, depth) / 4);
  // D1：保守碰撞緩衝半徑，恆 ≥ shellGeometry.ts/lidGeometry.ts 實際使用的兩個角柱半徑公式
  const collisionRadius =
    pilotDiameter(screwSize, 'through') / 2 + Math.max(plan.wallThickness, plan.standoffWallPadding);
  const boxes = parts.map((part) => partWorldBounds(part));

  const out: StandoffPlan[] = [];
  for (const x0 of xs) {
    for (const y0 of ys) {
      let x = x0;
      let y = y0;
      let collided: boolean | undefined;
      if (collidesWithAnyPart(x0, y0, collisionRadius, boxes)) {
        const dirX = Math.sign(x0 - centerX);
        const dirY = Math.sign(y0 - centerY);
        // 搜尋上限不可讓支柱中心超出殼體自身的 outer 邊界（見 code review 發現）
        const headroomX = dirX > 0 ? plan.outer.maxX - x0 : dirX < 0 ? x0 - plan.outer.minX : 0;
        const headroomY = dirY > 0 ? plan.outer.maxY - y0 : dirY < 0 ? y0 - plan.outer.minY : 0;
        const limitX = Math.min(limit, Math.max(0, Math.floor(headroomX)));
        const limitY = Math.min(limit, Math.max(0, Math.floor(headroomY)));
        const offsetX = searchOffset(
          (offset) => collidesWithAnyPart(x0 + offset, y0, collisionRadius, boxes),
          dirX,
          limitX,
        );
        const offsetY = searchOffset(
          (offset) => collidesWithAnyPart(x0, y0 + offset, collisionRadius, boxes),
          dirY,
          limitY,
        );
        if (offsetX !== null && (offsetY === null || Math.abs(offsetX) <= Math.abs(offsetY))) {
          x = x0 + offsetX;
        } else if (offsetY !== null) {
          y = y0 + offsetY;
        } else {
          collided = true;
        }
      }
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
