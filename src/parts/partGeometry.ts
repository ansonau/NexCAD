import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { PartDefinition } from './schema';

const noTransform = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };

/**
 * 由零件定義生成 Solid：主體 + 元件方塊 union，再鑽安裝孔。
 * 原點 = 主體底面中心（與 primitive 慣例一致）。純函數，把手由呼叫端 releaseAll 管理。
 */
export function buildPartSolid(def: PartDefinition, kernel: GeometryKernel): Solid {
  const [bodyL, bodyW, bodyT] = def.body.size;
  let solid = kernel.box(bodyL, bodyW, bodyT);

  for (const block of def.body.blocks) {
    const [a, b, h] = block.size;
    const base = block.shape === 'cylinder' ? kernel.cylinder(a / 2, h) : kernel.box(a, b, h);
    const [x, y, z] = block.position;
    // blocks 的 z 從主體頂面起算
    solid = kernel.union(
      solid,
      kernel.transform(base, { position: [x, y, bodyT + z], ...noTransform }),
    );
  }

  for (const hole of def.mountingHoles) {
    const planeZ = hole.z ?? 0;
    // 鑽孔高度 = 主體厚 + 2mm 餘量，自孔平面下方 1mm 起，確保穿透
    const drill = kernel.transform(kernel.cylinder(hole.diameter / 2, bodyT + 2), {
      position: [hole.x, hole.y, planeZ - 1],
      ...noTransform,
    });
    solid = kernel.difference(solid, drill);
  }

  return solid;
}
