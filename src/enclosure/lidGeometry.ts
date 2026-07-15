import type { GeometryKernel, Solid } from '../geometry/kernel';
import { pilotDiameter } from './screws';
import { planCornerPosts } from './plan';
import type { EnclosureParams, ShellPlan } from './plan';

const noRotScale = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
const LIP_MARGIN = 0.4;
const LIP_HEIGHT = 3;
// 螺絲柱必須明顯比唇邊深（唇邊已覆蓋整個內腔範圍），柱體才能在唇邊底部以下
// 貢獻真正「新增」的材料；否則通孔會貫穿唇邊+柱體整段厚度，扣除的體積比柱體
// 本身新增的還多，導致 screw 上蓋淨體積反而比 slide 版本小（見下方詳細說明）。
const POST_HEIGHT = 8;

function buildLip(plan: ShellPlan, wallThickness: number, height: number, kernel: GeometryKernel, panelZ: number): Solid {
  const { inner, cornerRadius } = plan;
  const innerCornerRadius = Math.max(0, cornerRadius - wallThickness);
  return kernel.transform(
    kernel.roundedBox(
      inner.maxX - inner.minX - LIP_MARGIN * 2,
      inner.maxY - inner.minY - LIP_MARGIN * 2,
      height,
      Math.max(0, innerCornerRadius - LIP_MARGIN),
    ),
    {
      position: [(inner.minX + inner.maxX) / 2, (inner.minY + inner.maxY) / 2, panelZ - height],
      ...noRotScale,
    },
  );
}

/** 上蓋（screw：面板+唇邊+四角螺絲柱；slide：面板+唇邊）。呼叫端應在 lidType==='open' 時不呼叫本函數 */
export function buildLidSolid(plan: ShellPlan, params: EnclosureParams, kernel: GeometryKernel): Solid {
  const { outer, cornerRadius } = plan;
  const panelH = params.wallThickness;
  const panelZ = plan.inner.maxZ;

  let lid = kernel.transform(
    kernel.roundedBox(outer.maxX - outer.minX, outer.maxY - outer.minY, panelH, cornerRadius),
    {
      position: [(outer.minX + outer.maxX) / 2, (outer.minY + outer.maxY) / 2, panelZ],
      ...noRotScale,
    },
  );

  lid = kernel.union(lid, buildLip(plan, params.wallThickness, LIP_HEIGHT, kernel, panelZ));

  if (params.lidType === 'screw') {
    const throughRadius = pilotDiameter(params.screwSize, 'through') / 2;
    // 柱體不可深到穿出內腔底部（避免在極淺殼體下鑽穿到殼體外），但至少要保留
    // LIP_HEIGHT+1 的深度，讓柱體在唇邊底部以下仍有實質新增材料（見下方說明）。
    const postHeight = Math.min(POST_HEIGHT, Math.max(LIP_HEIGHT + 1, plan.inner.maxZ - plan.inner.minZ));
    for (const p of planCornerPosts(plan, params.screwSize)) {
      // 柱體半徑至少要包住通孔再加上一圈壁厚，否則在薄壁厚（或通孔本身較粗的螺絲規格）
      // 情況下，通孔會比柱體本身還粗：差集運算不只鑽穿柱體，還會往外啃食柱體周圍
      // 原本就存在的面板/唇邊材料，造成淨體積不增反減（與 Task 4 的支柱/導孔崩塌問題同類）。
      const postRadius = Math.max(p.pilotDiameter / 2 + params.wallThickness, throughRadius + params.wallThickness);
      const post = kernel.transform(kernel.cylinder(postRadius, postHeight), {
        position: [p.x, p.y, panelZ - postHeight],
        ...noRotScale,
      });
      lid = kernel.union(lid, post);
      const through = kernel.transform(
        kernel.cylinder(throughRadius, panelH + postHeight + 2),
        { position: [p.x, p.y, panelZ - postHeight - 1], ...noRotScale },
      );
      lid = kernel.difference(lid, through);
    }
  }

  return lid;
}
