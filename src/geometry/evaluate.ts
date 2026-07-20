import { getPartDefinition } from '../parts/library';
import { buildPartColoredSegments, buildPartSolid } from '../parts/partGeometry';
import type { NodeRole, SceneNode } from '../types/document';
import type { GeometryKernel, MeshData, Solid } from './kernel';
import { buildEnclosureNodeSolid } from '../enclosure/generate';

export interface EvaluatedNode {
  nodeId: string;
  role: NodeRole;
  mesh: MeshData;
  /** 來自 PartBlock.color；缺省＝節點預設色 */
  color?: string;
}

function buildSolid(node: SceneNode, kernel: GeometryKernel): Solid | null {
  let base: Solid | null;
  if (node.type === 'primitive') {
    const p = node.params;
    switch (node.kind) {
      case 'box':
        base = kernel.box(p.width, p.depth, p.height);
        break;
      case 'cylinder':
        base = kernel.cylinder(p.radius, p.height);
        break;
      case 'sphere':
        base = kernel.sphere(p.radius);
        break;
      case 'cone':
        base = kernel.cone(p.radiusBottom, p.radiusTop, p.height);
        break;
    }
  } else if (node.type === 'part') {
    const def = getPartDefinition(node.partId);
    base = def ? buildPartSolid(def, kernel) : null;
  } else if (node.type === 'enclosure') {
    base = buildEnclosureNodeSolid(node, kernel);
  } else {
    base = combineScope(node.children, kernel);
  }
  return base ? kernel.transform(base, node.transform) : null;
}

/** 同一層：所有 solid union 起來，再減去該層所有 hole */
export function combineScope(nodes: SceneNode[], kernel: GeometryKernel): Solid | null {
  const solids: Solid[] = [];
  const holes: Solid[] = [];
  for (const n of nodes) {
    if (!n.visible) continue;
    const s = buildSolid(n, kernel);
    if (!s) continue;
    (n.role === 'hole' ? holes : solids).push(s);
  }
  if (solids.length === 0) return null;
  let result = solids.reduce((a, b) => kernel.union(a, b));
  for (const h of holes) result = kernel.difference(result, h);
  return result;
}

/** 渲染路徑的分段 solid：part 依 block.color 分段；其餘節點恆單段 */
function buildRenderSolids(
  node: SceneNode,
  kernel: GeometryKernel,
): { solid: Solid; color?: string }[] | null {
  if (node.type === 'part') {
    const def = getPartDefinition(node.partId);
    if (!def) return null;
    return buildPartColoredSegments(def, kernel).map((seg) => ({
      solid: kernel.transform(seg.solid, node.transform),
      color: seg.color,
    }));
  }
  const s = buildSolid(node, kernel);
  return s ? [{ solid: s }] : null;
}

/** 渲染用：每個頂層節點一至多個 mesh（part 色段）。solid 段被同層 hole 減料；hole 回傳自身形狀 */
export function evaluateForRender(nodes: SceneNode[], kernel: GeometryKernel): EvaluatedNode[] {
  const out: EvaluatedNode[] = [];
  // 每個 hole 只建一次 Solid（Manifold 布林運算不會消耗輸入，把手可重複使用）
  const holeSolids = new Map<string, Solid>();
  for (const n of nodes) {
    if (n.visible && n.role === 'hole') {
      const s = buildSolid(n, kernel);
      if (s) holeSolids.set(n.id, s);
    }
  }
  for (const node of nodes) {
    if (!node.visible) continue;
    if (node.role === 'hole') {
      const s = holeSolids.get(node.id);
      if (s) out.push({ nodeId: node.id, role: node.role, mesh: kernel.toMesh(s) });
      continue;
    }
    for (const seg of buildRenderSolids(node, kernel) ?? []) {
      let s = seg.solid;
      for (const h of holeSolids.values()) s = kernel.difference(s, h);
      out.push({ nodeId: node.id, role: node.role, mesh: kernel.toMesh(s), color: seg.color });
    }
  }
  return out;
}

/** 匯出用：整份文件結算成單一 Solid（無實體時回傳 null） */
export function evaluateForExport(nodes: SceneNode[], kernel: GeometryKernel): Solid | null {
  return combineScope(nodes, kernel);
}
