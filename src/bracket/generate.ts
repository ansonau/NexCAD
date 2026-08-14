import type { GeometryKernel, Solid } from '../geometry/kernel';
import { getPartDefinition } from '../parts/library';
import type { Transform, BracketNode } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import type { PartInstance } from '../enclosure/plan';
import { pilotDiameter } from '../enclosure/screws';
import { planBracket } from './plan';
import type { BracketPlan } from './plan';

const noRotScale = {
  rotation: [0, 0, 0] as [number, number, number],
  scale: [1, 1, 1] as [number, number, number],
};

// 固定柱壁厚：導孔半徑 + 此值＝柱半徑（與外殼 standoffWallPadding 語意一致）
const POST_WALL_PADDING = 3;
// 定位柱鬆配間隙與插入深度（與 shellGeometry 的 PEG_CLEARANCE / PEG_HEIGHT 同值）
const PEG_CLEARANCE = 0.2;
const PEG_HEIGHT = 4;

function resolveParts(node: BracketNode): PartInstance[] {
  const out: PartInstance[] = [];
  for (const s of node.sourceParts) {
    const def = getPartDefinition(s.partId);
    if (def) out.push({ def, transform: s.transform });
  }
  return out;
}

/**
 * 由 BracketNode 組裝出 Solid；worker-safe（不依賴 store）。找不到來源零件時回傳 null。
 * 每個來源零件各自在「本地座標」生成支架（底座＋固定柱），再套用其 transform 後 union，
 * 因此零件任意旋轉（含繞 X/Y 軸立起）時支架仍正確貼合零件。
 */
export function buildBracketNodeSolid(node: BracketNode, kernel: GeometryKernel): Solid | null {
  const parts = resolveParts(node);
  if (parts.length === 0) return null;
  let result: Solid | null = null;
  for (const part of parts) {
    const solid = buildBracketForPart(part.def, part.transform, node.params, kernel);
    result = result ? kernel.union(result, solid) : solid;
  }
  return result;
}

function buildBracketForPart(
  def: PartDefinition,
  transform: Transform,
  params: BracketNode['params'],
  kernel: GeometryKernel,
): Solid {
  const plan = planBracket(def, params);
  const local = buildBracketSolid(plan, params, kernel);
  return kernel.transform(local, transform);
}

/** 在本地座標建構底座平板 + 擋牆 + 固定柱 + 鎖附孔的 Solid（不含 transform） */
function buildBracketSolid(plan: BracketPlan, params: BracketNode['params'], kernel: GeometryKernel): Solid {
  const { base, floorZ, cornerRadius, standoffs, baseHoles, wall } = plan;
  const thickness = params.baseThickness;

  const width = base.maxX - base.minX;
  const depth = base.maxY - base.minY;
  let solid = kernel.transform(kernel.roundedBox(width, depth, thickness, cornerRadius), {
    position: [(base.minX + base.maxX) / 2, (base.minY + base.maxY) / 2, floorZ],
    ...noRotScale,
  });

  // 零件四周定位擋牆（wallHeight > 0 時）
  if (wall.height > 0) {
    const wallThickness = params.wallThickness ?? 1.5;
    const rOuter = Math.max(0, Math.min(wall.cornerRadius + wallThickness, wall.outerW / 2 - 0.1, wall.outerD / 2 - 0.1));
    const outer = kernel.transform(kernel.roundedBox(wall.outerW, wall.outerD, wall.height, rOuter), {
      position: [0, 0, 0],
      ...noRotScale,
    });
    const rInner = Math.max(0, Math.min(wall.cornerRadius, wall.innerW / 2 - 0.1, wall.innerD / 2 - 0.1));
    const inner = kernel.transform(kernel.roundedBox(wall.innerW, wall.innerD, wall.height, rInner), {
      position: [0, 0, 0],
      ...noRotScale,
    });
    solid = kernel.union(solid, kernel.difference(outer, inner));
  }

  for (const s of standoffs) {
    const style = s.mountingStyle ?? 'screw';
    if (style === 'hole') {
      const holeRadius = pilotDiameter(params.screwSize, 'through') / 2;
      const hole = kernel.transform(kernel.cylinder(holeRadius, thickness + 2), {
        position: [s.x, s.y, floorZ - 1],
        ...noRotScale,
      });
      solid = kernel.difference(solid, hole);
      continue;
    }
    if (style === 'peg') {
      const standoffHeight = s.topZ - floorZ;
      if (standoffHeight <= 0) continue;
      const standoffRadius = s.pilotDiameter / 2 + POST_WALL_PADDING;
      const post = kernel.transform(kernel.cylinder(standoffRadius, standoffHeight), {
        position: [s.x, s.y, floorZ],
        ...noRotScale,
      });
      solid = kernel.union(solid, post);
      const pegDiameter = Math.max((s.holeDiameter ?? 0) - PEG_CLEARANCE, 0.5);
      const peg = kernel.transform(kernel.cylinder(pegDiameter / 2, PEG_HEIGHT), {
        position: [s.x, s.y, s.topZ],
        ...noRotScale,
      });
      solid = kernel.union(solid, peg);
      continue;
    }
    // screw：柱 + 自攻導孔 + 入口
    const standoffHeight = s.topZ - floorZ;
    if (standoffHeight <= 0) continue;
    const standoffRadius = s.pilotDiameter / 2 + POST_WALL_PADDING;
    const post = kernel.transform(kernel.cylinder(standoffRadius, standoffHeight), {
      position: [s.x, s.y, floorZ],
      ...noRotScale,
    });
    solid = kernel.union(solid, post);
    const standoffTop = floorZ + standoffHeight;
    const pilotBottom = Math.max(standoffTop - s.pilotDepth, floorZ);
    const pilot = kernel.transform(kernel.cylinder(s.pilotDiameter / 2, standoffTop - pilotBottom + 1), {
      position: [s.x, s.y, pilotBottom],
      ...noRotScale,
    });
    solid = kernel.difference(solid, pilot);
    const entryRadius = Math.max(s.pilotDiameter, s.holeDiameter ?? 0) / 2;
    const entryDepth = Math.min(1.2, standoffHeight);
    const entry = kernel.transform(kernel.cylinder(entryRadius, entryDepth + 1), {
      position: [s.x, s.y, standoffTop - entryDepth],
      ...noRotScale,
    });
    solid = kernel.difference(solid, entry);
  }

  const throughRadius = pilotDiameter(params.screwSize, 'through') / 2;
  for (const h of baseHoles) {
    const hole = kernel.transform(kernel.cylinder(throughRadius, thickness + 2), {
      position: [h.x, h.y, floorZ - 1],
      ...noRotScale,
    });
    solid = kernel.difference(solid, hole);
  }

  return solid;
}
