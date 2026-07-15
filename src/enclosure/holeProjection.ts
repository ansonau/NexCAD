import { getPartDefinition } from '../parts/library';
import { createPrimitive } from '../types/document';
import type { PartNode, PrimitiveNode } from '../types/document';
import { pilotDiameter } from './screws';
import type { ScrewSize } from './screws';

const DEG = Math.PI / 180;

export function primitiveZRange(node: PrimitiveNode): { min: number; max: number } {
  const z = node.transform.position[2];
  const height = node.kind === 'sphere' ? node.params.radius * 2 : node.params.height;
  return { min: z, max: z + height };
}

/**
 * 把零件安裝孔投影成對齊的螺絲孔（role='hole' 圓柱），XY 對齊孔位，
 * 高度貫穿目標板件的整個垂直範圍（+2mm 餘量）。
 */
export function projectPartHoles(
  part: PartNode,
  targetZRange: { min: number; max: number },
  screwSize: ScrewSize,
): PrimitiveNode[] {
  const def = getPartDefinition(part.partId);
  if (!def) return [];
  const angle = part.transform.rotation[2] * DEG;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [px, py] = part.transform.position;
  const height = targetZRange.max - targetZRange.min + 2;
  return def.mountingHoles.map((hole) => {
    const node = createPrimitive('cylinder', {
      name: '投影螺絲孔',
      role: 'hole',
      params: { radius: pilotDiameter(screwSize, 'selfTap') / 2, height },
    });
    node.transform.position = [
      px + hole.x * cos - hole.y * sin,
      py + hole.x * sin + hole.y * cos,
      targetZRange.min - 1,
    ];
    return node;
  });
}
