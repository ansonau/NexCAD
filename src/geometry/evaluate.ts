import type { NodeRole, SceneNode } from '../types/document';
import type { GeometryKernel, MeshData, Solid } from './kernel';

export interface EvaluatedNode {
  nodeId: string;
  role: NodeRole;
  mesh: MeshData;
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

/** 渲染用：每個頂層節點一個 mesh。solid 被同層 hole 減料；hole 回傳自身形狀 */
export function evaluateForRender(nodes: SceneNode[], kernel: GeometryKernel): EvaluatedNode[] {
  const out: EvaluatedNode[] = [];
  const holeNodes = nodes.filter((n) => n.visible && n.role === 'hole');
  for (const node of nodes) {
    if (!node.visible) continue;
    let s = buildSolid(node, kernel);
    if (!s) continue;
    if (node.role === 'solid') {
      for (const h of holeNodes) {
        const hs = buildSolid(h, kernel);
        if (hs) s = kernel.difference(s, hs);
      }
    }
    out.push({ nodeId: node.id, role: node.role, mesh: kernel.toMesh(s) });
  }
  return out;
}

/** 匯出用：整份文件結算成單一 Solid（無實體時回傳 null） */
export function evaluateForExport(nodes: SceneNode[], kernel: GeometryKernel): Solid | null {
  return combineScope(nodes, kernel);
}
