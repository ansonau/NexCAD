import { getPartDefinition } from '../parts/library';
import type { SceneNode, Vec3 } from '../types/document';

const DEG = Math.PI / 180;

function rotatePoint(p: Vec3, rotation: Vec3): Vec3 {
  let [x, y, z] = p;
  const [rx, ry, rz] = rotation.map((v) => v * DEG);
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  // Rx
  let y1 = y * cx - z * sx;
  let z1 = y * sx + z * cx;
  y = y1; z = z1;

  // Ry
  let x2 = x * cy + z * sy;
  let z2 = -x * sy + z * cy;
  x = x2; z = z2;

  // Rz
  let x3 = x * cz - y * sz;
  let y3 = x * sz + y * cz;
  let z3 = z;

  return [x3, y3, z3];
}

/**
 * 收集所有可見零件節點的安裝孔世界座標。
 * 支援完整的 3D 旋轉。
 */
export function collectHoleWorldPositions(nodes: SceneNode[], excludeId?: string): Vec3[] {
  return collectHoleWorldAnnotations(nodes, excludeId).map((hole) => hole.center);
}

export interface HoleWorldAnnotation {
  center: Vec3;
  diameter: number;
  kind: 'through' | 'socketHead' | 'countersink';
}

export function collectHoleWorldAnnotations(nodes: SceneNode[], excludeId?: string): HoleWorldAnnotation[] {
  const annotations: HoleWorldAnnotation[] = [];
  for (const node of nodes) {
    if (node.id === excludeId || !node.visible || node.type !== 'part') continue;
    const def = getPartDefinition(node.partId);
    if (!def) continue;
    const [px, py, pz] = node.transform.position;
    for (const hole of def.mountingHoles) {
      const [wx, wy, wz] = rotatePoint([hole.x, hole.y, hole.z ?? 0], node.transform.rotation);
      annotations.push({ center: [px + wx, py + wy, pz + wz], diameter: hole.diameter, kind: 'through' });
    }
  }
  return annotations;
}

/** 拖曳位置與某孔位的 XY 距離小於 threshold 時吸附（z 保留） */
export function snapToHoles(position: Vec3, holes: Vec3[], threshold = 2): Vec3 {
  let best: Vec3 | null = null;
  let bestDistance = threshold;
  for (const hole of holes) {
    const d = Math.hypot(position[0] - hole[0], position[1] - hole[1]);
    if (d < bestDistance) {
      bestDistance = d;
      best = hole;
    }
  }
  return best ? [best[0], best[1], position[2]] : position;
}
