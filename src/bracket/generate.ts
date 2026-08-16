import type { GeometryKernel, Solid } from '../geometry/kernel';
import { getPartDefinition } from '../parts/library';
import { buildPartSolid } from '../parts/partGeometry';
import type { Transform, BracketNode } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import type { PartInstance } from '../enclosure/plan';
import { pilotDiameter, SCREW_TABLE } from '../enclosure/screws';
import { planBracket, baseHolePositions } from './plan';
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

/** 底座鎖附孔半徑：使用 baseHoleScrewSize（未設定時沿用 screwSize）的通孔徑。 */
function baseHoleRadius(params: BracketNode['params']): number {
  return pilotDiameter(params.baseHoleScrewSize ?? params.screwSize, 'through') / 2;
}

/** 底座鎖附孔的沉頭尺寸（依 baseHoleScrewSize / screwSize 查表）；未啟用回傳 null。 */
function baseHoleCountersink(params: BracketNode['params']): { radius: number; depth: number } | null {
  if (!params.baseHoleCountersink) return null;
  const spec = SCREW_TABLE[params.baseHoleScrewSize ?? params.screwSize];
  return { radius: spec.countersinkDiameter / 2, depth: spec.countersinkDepth };
}

/**
 * 在底座平板（頂面 baseTopZ、厚度 bt）的 (x, y) 處鑽一個垂直貫穿鎖附孔；
 * 提供 countersink 時，於頂面額外鑽一個錐形沉頭（螺絲頭齊平）。
 */
function drillBaseHole(
  kernel: GeometryKernel,
  solid: Solid,
  x: number,
  y: number,
  baseTopZ: number,
  bt: number,
  throughR: number,
  countersink: { radius: number; depth: number } | null,
): Solid {
  solid = kernel.difference(solid, kernel.transform(kernel.cylinder(throughR, bt + 2), {
    position: [x, y, baseTopZ - bt - 1],
    ...noRotScale,
  }));
  if (countersink) {
    solid = kernel.difference(solid, kernel.transform(kernel.cone(throughR, countersink.radius, countersink.depth), {
      position: [x, y, baseTopZ - countersink.depth],
      ...noRotScale,
    }));
  }
  return solid;
}

/** 立式（standing）座標 → 零件本地座標：繞 Y 軸 -90°。立式座標中零件直立、感測面朝 +X。 */
const STANDING_TO_LOCAL: Transform = { rotation: [0, -90, 0], position: [0, 0, 0], scale: [1, 1, 1] };

interface Bounds3 { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }

/** 零件在本地座標下的真實包覆盒（含突出 block，透過 mesh 頂點求得）。 */
function partLocalBounds(def: PartDefinition, kernel: GeometryKernel): Bounds3 {
  const mesh = kernel.toMesh(buildPartSolid(def, kernel));
  const b: Bounds3 = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < mesh.positions.length; i += 3) {
    b.minX = Math.min(b.minX, mesh.positions[i]);
    b.maxX = Math.max(b.maxX, mesh.positions[i]);
    b.minY = Math.min(b.minY, mesh.positions[i + 1]);
    b.maxY = Math.max(b.maxY, mesh.positions[i + 1]);
    b.minZ = Math.min(b.minZ, mesh.positions[i + 2]);
    b.maxZ = Math.max(b.maxZ, mesh.positions[i + 2]);
  }
  return b;
}

/** 立式座標下的真實包覆盒：本地 X→-Z（垂直）、Y→Y、Z→X（向前）。 */
function standingBounds(def: PartDefinition, kernel: GeometryKernel): Bounds3 {
  const b = partLocalBounds(def, kernel);
  return { minX: b.minZ, maxX: b.maxZ, minY: b.minY, maxY: b.maxY, minZ: -b.maxX, maxZ: -b.minX };
}

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
  if (style === 'l' || style === 'u') {
    const bounds = standingBounds(def, kernel);
    local = kernel.transform(
      style === 'l' ? buildStandingLBracket(def, bounds, params, kernel) : buildStandingUBracket(def, bounds, params, kernel),
      STANDING_TO_LOCAL,
    );
  } else {
    local = buildBracketSolid(def, planBracket(def, params), params, kernel);
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

/** 抬高孔（topZ > 0）時，固定柱會伸入本體高度範圍，需把柱半徑夾到「不與本體重疊」。 */
function postRadiusFor(def: PartDefinition, hx: number, hy: number, topZ: number, baseRadius: number, pilotRadius: number): number {
  if (topZ <= 0) return baseRadius;
  const [W, D] = def.body.size;
  const dx = Math.max(0, Math.abs(hx) - W / 2);
  const dy = Math.max(0, Math.abs(hy) - D / 2);
  const dist = Math.hypot(dx, dy);
  if (dist <= 0) return baseRadius;
  const minRadius = Math.max(pilotRadius + 0.8, 1);
  return Math.max(Math.min(baseRadius, dist - 0.1), minRadius);
}

/** 在本地座標建構底座平板 + 擋牆 + 固定柱 + 鎖附孔的 Solid（不含 transform） */
function buildBracketSolid(def: PartDefinition, plan: BracketPlan, params: BracketNode['params'], kernel: GeometryKernel): Solid {
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
      const standoffRadius = postRadiusFor(
        def, s.x, s.y, s.topZ, s.pilotDiameter / 2 + POST_WALL_PADDING, s.pilotDiameter / 2,
      );
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
    const standoffRadius = postRadiusFor(
      def, s.x, s.y, s.topZ, s.pilotDiameter / 2 + POST_WALL_PADDING, s.pilotDiameter / 2,
    );
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

  const throughR = baseHoleRadius(params);
  const cs = baseHoleCountersink(params);
  for (const h of baseHoles) {
    solid = drillBaseHole(kernel, solid, h.x, h.y, base.maxZ, thickness, throughR, cs);
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
 * 立式座標：零件直立於 Y-Z 平面，感測面朝 +X。以零件真實包覆盒（含突出 block）定尺寸。
 */
function buildStandingLBracket(def: PartDefinition, bounds: Bounds3, params: BracketNode['params'], kernel: GeometryKernel): Solid {
  const vt = params.wallThickness ?? 1.5;
  const bt = params.baseThickness;
  const m = params.baseMargin;
  const r = Math.max(0, Math.min(params.cornerRadius, vt / 2 - 0.1, (bounds.maxY - bounds.minY + 2 * m) / 2 - 0.1));

  const plateW = bounds.maxY - bounds.minY + 2 * m;
  const plateH = bounds.maxZ - bounds.minZ + 2 * m;
  const plateBottomZ = bounds.minZ - m;
  const cy = (bounds.minY + bounds.maxY) / 2;

  // 垂直背板：x ∈ [-vt, 0]，貼在板背
  let solid = kernel.transform(kernel.roundedBox(vt, plateW, plateH, r), {
    position: [-vt / 2, cy, plateBottomZ],
    ...noRotScale,
  });

  // 底座：向後（-X）延伸 baseMargin，x ∈ [-(m + vt), 0]
  const baseDepth = m + vt;
  const base = kernel.transform(kernel.roundedBox(baseDepth, plateW, bt, r), {
    position: [-baseDepth / 2, cy, plateBottomZ - bt],
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
  const throughR = baseHoleRadius(params);
  const cs = baseHoleCountersink(params);
  const inset = params.baseHoleInset ?? m / 2;
  const baseBounds = { minX: -(m + vt), maxX: 0, minY: bounds.minY - m, maxY: bounds.maxY + m };
  for (const h of baseHolePositions(baseBounds, inset, params.baseHoleCount ?? 4, params.baseHoleSpacing, params.baseHoleAxis ?? 'long')) {
    solid = drillBaseHole(kernel, solid, h.x, h.y, plateBottomZ, bt, throughR, cs);
  }

  return solid;
}

/**
 * U 型抱箍（立式座標）：兩片側牆 + 底座，零件直立夾在中間、感測面朝 +X 露出。
 * 以零件真實包覆盒（含突出 block）定尺寸，避免側牆/底座與突出 block 相交。
 */
function buildStandingUBracket(def: PartDefinition, bounds: Bounds3, params: BracketNode['params'], kernel: GeometryKernel): Solid {
  const vt = params.wallThickness ?? 1.5;
  const wc = params.wallClearance ?? 0.5;
  const bt = params.baseThickness;
  const m = params.baseMargin;
  const wallH = (params.wallHeight ?? 0) > 0 ? params.wallHeight! : U_DEFAULT_WALL_HEIGHT;
  const r = Math.max(0, Math.min(params.cornerRadius, vt / 2 - 0.1));

  const fwdDepth = bounds.maxX - bounds.minX;
  const baseW = bounds.maxY - bounds.minY + 2 * (wc + vt) + 2 * m;
  const bottomZ = bounds.minZ;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  // 底座（水平，位在零件真實底緣下方）
  let solid = kernel.transform(kernel.roundedBox(fwdDepth + 2 * m, baseW, bt, r), {
    position: [cx, cy, bottomZ - bt],
    ...noRotScale,
  });

  // 兩片側牆：夾住零件真實左右（Y）邊緣，自底座頂向上長 wallH
  for (const side of [-1, 1]) {
    const wallY = side >= 0 ? bounds.maxY + wc + vt / 2 : bounds.minY - wc - vt / 2;
    const wall = kernel.transform(kernel.roundedBox(fwdDepth, vt, wallH, r), {
      position: [cx, wallY, bottomZ],
      ...noRotScale,
    });
    solid = kernel.union(solid, wall);
  }

  // 底座鎖附孔：底座四角（垂直貫穿，位於零件外側）
  const throughR = baseHoleRadius(params);
  const cs = baseHoleCountersink(params);
  const inset = params.baseHoleInset ?? m / 2;
  const baseBounds = {
    minX: bounds.minX - m,
    maxX: bounds.maxX + m,
    minY: bounds.minY - (wc + vt) - m,
    maxY: bounds.maxY + (wc + vt) + m,
  };
  for (const h of baseHolePositions(baseBounds, inset, params.baseHoleCount ?? 4, params.baseHoleSpacing, params.baseHoleAxis ?? 'long')) {
    solid = drillBaseHole(kernel, solid, h.x, h.y, bottomZ, bt, throughR, cs);
  }

  return solid;
}
