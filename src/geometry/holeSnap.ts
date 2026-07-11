import { getPartDefinition } from '../parts/library';
import type { SceneNode, Vec3 } from '../types/document';

const DEG = Math.PI / 180;

/**
 * 收集所有可見零件節點的安裝孔世界座標。
 * 只考慮 Z 軸旋轉（板件通常平放）；X/Y 旋轉的零件孔位不參與磁吸。
 */
export function collectHoleWorldPositions(nodes: SceneNode[], excludeId?: string): Vec3[] {
  const out: Vec3[] = [];
  for (const node of nodes) {
    if (node.id === excludeId || !node.visible || node.type !== 'part') continue;
    if (node.transform.rotation[0] !== 0 || node.transform.rotation[1] !== 0) continue;
    const def = getPartDefinition(node.partId);
    if (!def) continue;
    const angle = node.transform.rotation[2] * DEG;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const hole of def.mountingHoles) {
      out.push([
        node.transform.position[0] + hole.x * cos - hole.y * sin,
        node.transform.position[1] + hole.x * sin + hole.y * cos,
        node.transform.position[2],
      ]);
    }
  }
  return out;
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
