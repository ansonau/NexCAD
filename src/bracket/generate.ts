import type { GeometryKernel, Solid } from '../geometry/kernel';
import { getPartDefinition } from '../parts/library';
import type { BracketNode } from '../types/document';
import type { PartInstance } from '../enclosure/plan';
import { pilotDiameter } from '../enclosure/screws';
import { planBracket } from './plan';

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

/** 由 BracketNode 組裝出 Solid；worker-safe（不依賴 store）。找不到來源零件時回傳 null。 */
export function buildBracketNodeSolid(node: BracketNode, kernel: GeometryKernel): Solid | null {
  const parts = resolveParts(node);
  if (parts.length === 0) return null;
  const { base, floorZ, cornerRadius, standoffs, baseHoles } = planBracket(parts, node.params);
  const thickness = node.params.baseThickness;

  const width = base.maxX - base.minX;
  const depth = base.maxY - base.minY;
  let solid = kernel.transform(kernel.roundedBox(width, depth, thickness, cornerRadius), {
    position: [(base.minX + base.maxX) / 2, (base.minY + base.maxY) / 2, floorZ],
    ...noRotScale,
  });

  for (const s of standoffs) {
    const style = s.mountingStyle ?? 'screw';
    if (style === 'hole') {
      const holeRadius = pilotDiameter(node.params.screwSize, 'through') / 2;
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

  const throughRadius = pilotDiameter(node.params.screwSize, 'through') / 2;
  for (const h of baseHoles) {
    const hole = kernel.transform(kernel.cylinder(throughRadius, thickness + 2), {
      position: [h.x, h.y, floorZ - 1],
      ...noRotScale,
    });
    solid = kernel.difference(solid, hole);
  }

  return solid;
}
