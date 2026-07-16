import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { ShellPlan, StandoffPlan } from './plan';

const noRotScale = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };

/**
 * 殼體本體：外形（圓角）挖去內腔，再加上每個支柱（含螺絲導孔）。
 * 世界絕對座標，呼叫端不需再套用額外 transform。
 */
export function buildShellSolid(
  plan: ShellPlan,
  wallThickness: number,
  standoffs: StandoffPlan[],
  kernel: GeometryKernel,
  standoffWallPadding: number = wallThickness,
): Solid {
  const { outer, inner, cornerRadius } = plan;

  const outerSolid = kernel.transform(
    kernel.roundedBox(outer.maxX - outer.minX, outer.maxY - outer.minY, outer.maxZ - outer.minZ, cornerRadius),
    {
      position: [(outer.minX + outer.maxX) / 2, (outer.minY + outer.maxY) / 2, outer.minZ],
      ...noRotScale,
    },
  );

  // 內腔：從壁厚位置貫穿到外形頂端以上，確保開口貫通
  const cavityHeight = outer.maxZ - inner.minZ + 1;
  const innerCornerRadius = Math.max(0, cornerRadius - wallThickness);
  const cavitySolid = kernel.transform(
    kernel.roundedBox(inner.maxX - inner.minX, inner.maxY - inner.minY, cavityHeight, innerCornerRadius),
    {
      position: [(inner.minX + inner.maxX) / 2, (inner.minY + inner.maxY) / 2, inner.minZ],
      ...noRotScale,
    },
  );

  let shell = kernel.difference(outerSolid, cavitySolid);

  for (const s of standoffs) {
    // 支柱至少要有 pilotDepth 高度，才能容納導孔的螺絲攻牙深度；否則當零件貼齊
    // 內腔底（topZ 等於 inner.minZ）時，支柱會完全埋在原本就存在的底板厚度內，
    // union 不會新增任何體積。
    const standoffHeight = Math.max(s.topZ - plan.floorZ, s.pilotDepth);
    if (standoffHeight <= 0) continue;
    const standoffRadius = s.pilotDiameter / 2 + standoffWallPadding;
    const post = kernel.transform(kernel.cylinder(standoffRadius, standoffHeight), {
      position: [s.x, s.y, plan.floorZ],
      ...noRotScale,
    });
    shell = kernel.union(shell, post);
    // 導孔下緣夾在 inner.minZ（內腔地板）：避免鑽穿殼體外底面的實心外皮，
    // 保留底板的結構完整性（不論支柱鎖點多接近地板）。
    const pilotBottom = Math.max(s.topZ - s.pilotDepth, plan.inner.minZ);
    const pilot = kernel.transform(kernel.cylinder(s.pilotDiameter / 2, s.topZ - pilotBottom + 1), {
      position: [s.x, s.y, pilotBottom],
      ...noRotScale,
    });
    shell = kernel.difference(shell, pilot);
  }

  return shell;
}
