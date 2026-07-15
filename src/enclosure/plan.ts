import { pilotDiameter } from './screws';
import type { ScrewSize } from './screws';
import type { PartDefinition } from '../parts/schema';
import type { Transform } from '../types/document';

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

export interface EnclosureParams {
  wallThickness: number;
  clearanceMargin: number;
  cornerRadius: number;
  lidType: 'screw' | 'slide' | 'open';
  screwSize: ScrewSize;
}

export const DEFAULT_ENCLOSURE_PARAMS: EnclosureParams = {
  wallThickness: 2,
  clearanceMargin: 3,
  cornerRadius: 3,
  lidType: 'screw',
  screwSize: 'M3',
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
  return { inner, outer, cornerRadius, floorZ: outer.minZ };
}

export interface StandoffPlan {
  x: number;
  y: number;
  /** 支柱頂面（螺絲導孔開口）絕對高度 */
  topZ: number;
  pilotDiameter: number;
  pilotDepth: number;
}

const PILOT_DEPTH = 6;

/** 每個零件的每個安裝孔 → 世界座標支柱規劃 */
export function planStandoffs(parts: PartInstance[], screwSize: ScrewSize): StandoffPlan[] {
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
        pilotDepth: PILOT_DEPTH,
      });
    }
  }
  return out;
}

/** 外殼四個角落的上蓋鎖點支柱，頂部對齊殼體開口（內腔頂） */
export function planCornerPosts(plan: ShellPlan, screwSize: ScrewSize): StandoffPlan[] {
  const inset = plan.cornerRadius + 3;
  const xs = [plan.outer.minX + inset, plan.outer.maxX - inset];
  const ys = [plan.outer.minY + inset, plan.outer.maxY - inset];
  const out: StandoffPlan[] = [];
  for (const x of xs) {
    for (const y of ys) {
      out.push({
        x,
        y,
        topZ: plan.inner.maxZ,
        pilotDiameter: pilotDiameter(screwSize, 'selfTap'),
        pilotDepth: PILOT_DEPTH,
      });
    }
  }
  return out;
}
