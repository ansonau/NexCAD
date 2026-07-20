import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { PartDefinition } from './schema';

const noTransform = {
  rotation: [0, 0, 0] as [number, number, number],
  scale: [1, 1, 1] as [number, number, number],
};

/** 帶色 block 的獨立段；color 缺省＝主體段（無色 blocks 併入） */
export interface PartSegment {
  solid: Solid;
  color?: string;
}

/**
 * 由零件定義生成分段 Solid：主體＋無色 blocks union 為主體段；每個帶 color 的 block 獨立成段
 * （不併入 union，避免共面 z-fight）。安裝孔對每段照鑽（孔穿透一切的語義不變）。
 * 原點＝主體底面中心。純函數，把手由呼叫端 releaseAll 管理。
 */
export function buildPartColoredSegments(def: PartDefinition, kernel: GeometryKernel): PartSegment[] {
  const [bodyL, bodyW, bodyT] = def.body.size;
  let body = kernel.roundedBox(bodyL, bodyW, bodyT, def.body.cornerRadius ?? 0);
  const colored: PartSegment[] = [];

  for (const block of def.body.blocks) {
    const [a, b, h] = block.size;
    const base = block.shape === 'cylinder' ? kernel.cylinder(a / 2, h) : kernel.box(a, b, h);
    const [x, y, z] = block.position;
    // blocks 的 z 從主體頂面起算
    const placed = kernel.transform(base, {
      position: [x, y, bodyT + z],
      rotation: block.rotation ?? noTransform.rotation,
      scale: noTransform.scale,
    });
    if (block.color) colored.push({ solid: placed, color: block.color });
    else body = kernel.union(body, placed);
  }

  const drill = (s: Solid): Solid => {
    for (const hole of def.mountingHoles) {
      const planeZ = hole.z ?? 0;
      // 鑽孔高度 = 主體厚 + 2mm 餘量，自孔平面下方 1mm 起，確保穿透
      const d = kernel.transform(kernel.cylinder(hole.diameter / 2, bodyT + 2), {
        position: [hole.x, hole.y, planeZ - 1],
        ...noTransform,
      });
      s = kernel.difference(s, d);
    }
    return s;
  };

  return [{ solid: drill(body) }, ...colored.map((seg) => ({ ...seg, solid: drill(seg.solid) }))];
}

/**
 * 由零件定義生成單一 Solid＝全段 union（供測試/bounds/匯出）。
 * 行為與分段前一致：(A∪B)−H ≡ (A−H)∪(B−H)。
 */
export function buildPartSolid(def: PartDefinition, kernel: GeometryKernel): Solid {
  const [first, ...rest] = buildPartColoredSegments(def, kernel);
  return rest.reduce((acc, seg) => kernel.union(acc, seg.solid), first.solid);
}