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
// U 型抱箍的預設側牆高度（當使用者未指定 wallHeight 時）
const U_DEFAULT_WALL_HEIGHT = 8;

/** 立式（standing）座標 → 零件本地座標：繞 Y 軸 -90°。立式座標中零件直立、感測面朝 +X。 */
const STANDING_TO_LOCAL: Transform = { rotation: [0, -90, 0], position: [0, 0, 0], scale: [1, 1, 1] };

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
 * 每個來源零件各自在「本地座標」生成支架，再套用其 transform 後 union，
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
  const style = params.style ?? 'base';
  let local: Solid;
  if (style === 'l') {
    local = kernel.transform(buildStandingLBracket(def, params, kernel), STANDING_TO_LOCAL);
  } else if (style === 'u') {
    local = kernel.transform(buildStandingUBracket(def, params, kernel), STANDING_TO_LOCAL);
  } else {
    local = buildBracketSolid(planBracket(def, params), params, kernel);
  }
  return kernel.transform(local, transform);
}

/** 沿 X 軸的圓柱（供立式座標下鑽水平孔／長水平定位柱用） */
function xCylinder(kernel: GeometryKernel, radius: number, height: number, x: number, y: number, z: number): Solid {
  return kernel.transform(kernel.cylinder(radius, height), {
    rotation: [0, 90, 0],
    position: [x, y, z],
    scale: [1, 1, 1],
  });
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

/** 零件安裝孔（本地座標）→ 立式座標 */
function standingHolePositions(def: PartDefinition): { x: number; y: number; z: number; diameter: number }[] {
  return def.mountingHoles
    .filter((h) => h.standoff !== false)
    .map((h) => ({ x: h.z ?? 0, y: h.y, z: -h.x, diameter: h.diameter }));
}

/**
 * L 型立式支架（立式座標）：垂直背板（零件直立鎖上）+ 水平底座。
 * 立式座標：零件直立於 Y-Z 平面，板長 L 沿 Z、板寬 W 沿 Y，感測面朝 +X。
 */
function buildStandingLBracket(def: PartDefinition, params: BracketNode['params'], kernel: GeometryKernel): Solid {
  const [L, W] = def.body.size;
  const vt = params.wallThickness ?? 1.5;
  const bt = params.baseThickness;
  const m = params.baseMargin;
  const r = Math.max(0, Math.min(params.cornerRadius, vt / 2 - 0.1, (W + 2 * m) / 2 - 0.1));

  const plateW = W + 2 * m;
  const plateH = L + 2 * m;

  // 垂直背板：x ∈ [-vt, 0]，貼在板背
  let solid = kernel.transform(kernel.roundedBox(vt, plateW, plateH, r), {
    position: [-vt / 2, 0, -(L / 2 + m)],
    ...noRotScale,
  });

  // 底座：向後（-X）延伸 baseMargin，x ∈ [-(m + vt), 0]
  const baseDepth = m + vt;
  const base = kernel.transform(kernel.roundedBox(baseDepth, plateW, bt, r), {
    position: [-baseDepth / 2, 0, -(L / 2 + m) - bt],
    ...noRotScale,
  });
  solid = kernel.union(solid, base);

  // 零件安裝孔：在背板鑽水平孔（沿 X，自前方穿入背板）
  const screwSize = params.screwSize;
  const mountingStyle = params.mountingStyle ?? 'screw';
  for (const h of standingHolePositions(def)) {
    const pilotR = pilotDiameter(screwSize, 'selfTap') / 2;
    const throughR = pilotDiameter(screwSize, 'through') / 2;
    if (mountingStyle === 'peg') {
      const pegD = Math.max(h.diameter - PEG_CLEARANCE, 0.5);
      const peg = xCylinder(kernel, pegD / 2, PEG_HEIGHT, 0, h.y, h.z);
      solid = kernel.union(solid, peg);
      continue;
    }
    const holeR = mountingStyle === 'hole' ? throughR : pilotR;
    const hole = xCylinder(kernel, holeR, vt + 2, -vt - 1, h.y, h.z);
    solid = kernel.difference(solid, hole);
  }

  // 底座鎖附孔：底座四角（垂直貫穿）
  const throughR = pilotDiameter(screwSize, 'through') / 2;
  const holeXs = [-(m + vt) + m / 2, -m / 2];
  const holeYs = [-(W / 2 + m) + m / 2, W / 2 + m - m / 2];
  for (const hx of holeXs) {
    for (const hy of holeYs) {
      const hole = kernel.transform(kernel.cylinder(throughR, bt + 2), {
        position: [hx, hy, -(L / 2 + m) - bt - 1],
        ...noRotScale,
      });
      solid = kernel.difference(solid, hole);
    }
  }

  return solid;
}

/**
 * U 型抱箍（立式座標）：兩片側牆 + 底座，零件直立夾在中間、感測面朝 +X 露出。
 */
function buildStandingUBracket(def: PartDefinition, params: BracketNode['params'], kernel: GeometryKernel): Solid {
  const [L, W, T] = def.body.size;
  const vt = params.wallThickness ?? 1.5;
  const wc = params.wallClearance ?? 0.5;
  const bt = params.baseThickness;
  const m = params.baseMargin;
  const wallH = (params.wallHeight ?? 0) > 0 ? params.wallHeight! : U_DEFAULT_WALL_HEIGHT;
  const r = Math.max(0, Math.min(params.cornerRadius, vt / 2 - 0.1));

  const baseDepth = T + 2 * m;
  const baseW = W + 2 * (wc + vt) + 2 * m;

  // 底座（水平，位在板底下方；中心對齊板中心 x=T/2）
  let solid = kernel.transform(kernel.roundedBox(baseDepth, baseW, bt, r), {
    position: [T / 2, 0, -L / 2 - bt],
    ...noRotScale,
  });

  // 兩片側牆：x ∈ [0, T]，夾住板左右兩側（Y 邊），自底座頂向上長 wallH
  for (const side of [-1, 1]) {
    const wallY = side * (W / 2 + wc + vt / 2);
    const wall = kernel.transform(kernel.roundedBox(T, vt, wallH, r), {
      position: [T / 2, wallY, -L / 2],
      ...noRotScale,
    });
    solid = kernel.union(solid, wall);
  }

  // 底座鎖附孔：底座四角（垂直貫穿，位於板外側）
  const screwSize = params.screwSize;
  const throughR = pilotDiameter(screwSize, 'through') / 2;
  const holeXs = [-m + m / 2, T + m - m / 2];
  const holeYs = [-baseW / 2 + m / 2, baseW / 2 - m / 2];
  for (const hx of holeXs) {
    for (const hy of holeYs) {
      const hole = kernel.transform(kernel.cylinder(throughR, bt + 2), {
        position: [hx, hy, -L / 2 - bt - 1],
        ...noRotScale,
      });
      solid = kernel.difference(solid, hole);
    }
  }

  return solid;
}
