import type { MeshData } from '../geometry/kernel';
import type { SceneNode } from '../types/document';

export interface MeshStats {
  bbox: [number, number, number];
  triangles: number;
}

export const MIN_FEATURE_MM = 1;
export const MAX_PRINT_MM = 250;

export function analyzeMesh(mesh: MeshData): MeshStats {
  const p = mesh.positions;
  if (p.length === 0) return { bbox: [0, 0, 0], triangles: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    minX = Math.min(minX, p[i]);
    maxX = Math.max(maxX, p[i]);
    minY = Math.min(minY, p[i + 1]);
    maxY = Math.max(maxY, p[i + 1]);
    minZ = Math.min(minZ, p[i + 2]);
    maxZ = Math.max(maxZ, p[i + 2]);
  }
  return {
    bbox: [maxX - minX, maxY - minY, maxZ - minZ],
    triangles: mesh.indices.length / 3,
  };
}

/**
 * 參數層級的薄件檢查（規格 §11）：實體 primitive 有 <1mm 參數即列出節點名。
 * radiusTop 允許 0（圓錐尖）。真正的 mesh 壁厚分析屬未來工作。
 */
export function collectThinFeatures(nodes: SceneNode[]): string[] {
  const out: string[] = [];
  const visit = (list: SceneNode[]) => {
    for (const node of list) {
      if (!node.visible) continue;
      if (node.type === 'group') {
        visit(node.children);
        continue;
      }
      if (node.type !== 'primitive' || node.role === 'hole') continue;
      for (const [key, value] of Object.entries(node.params)) {
        if (key !== 'radiusTop' && value < MIN_FEATURE_MM) {
          out.push(node.name);
          break;
        }
      }
    }
  };
  visit(nodes);
  return out;
}
