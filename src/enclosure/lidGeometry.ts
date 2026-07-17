import type { GeometryKernel, Solid } from '../geometry/kernel';
import { pilotDiameter, SCREW_TABLE } from './screws';
import { planCornerPosts } from './plan';
import type { EnclosureParams, PartInstance, ShellPlan } from './plan';

const noRotScale = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
const LIP_MARGIN = 0.4;
const LIP_HEIGHT = 3;
// ponytail: 沉孔埋頭餘量, 若要依材質/公差開放調整再加 EnclosureParams 欄位
const SINK_MARGIN = 0.5;
// ponytail: 杯頭裝配鬆配間隙, 若要依材質/公差開放調整再加 EnclosureParams 欄位
const HEAD_CLEARANCE = 0.3;
// ponytail: 沉孔側壁最小殘壁, 若要依材質開放調整再加邏輯
const MIN_SIDE_WALL = 1;

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

/** 上蓋（screw：平面蓋+唇邊+四角螺絲孔；slide：面板+唇邊）。呼叫端應在 lidType==='open' 時不呼叫本函數 */
export function buildLidSolid(plan: ShellPlan, params: EnclosureParams, parts: PartInstance[], kernel: GeometryKernel): Solid {
  const { outer, cornerRadius } = plan;
  const panelZ = plan.inner.maxZ;
  const isFlatRecessed = params.lidType === 'screw' && (params.screwLidProfile ?? 'flatRecessed') === 'flatRecessed';
  const spec = SCREW_TABLE[params.screwSize];
  const panelH =
    params.lidType === 'screw' && isFlatRecessed
      ? spec.socketHeadDepth + SINK_MARGIN + params.wallThickness
      : params.wallThickness;

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
    // 通孔從面板頂上方 1mm 貫穿到唇邊底下 1mm，讓螺絲軸全程無阻，並在合模面與殼體導孔對接
    const throughTop = panelZ + panelH + 1;
    const throughBottom = panelZ - LIP_HEIGHT - 1;
    for (const p of planCornerPosts(plan, params.screwSize, parts)) {
      const through = kernel.transform(kernel.cylinder(throughRadius, throughTop - throughBottom), {
        position: [p.x, p.y, throughBottom],
        ...noRotScale,
      });
      lid = kernel.difference(lid, through);

      if (isFlatRecessed) {
        // 杯頭沉孔：從蓋頂面向下挖，深度埋入 SINK_MARGIN，讓杯頭完全藏入面板內不外露。
        const boreDepth = spec.socketHeadDepth + SINK_MARGIN;
        // 沉孔半徑 clamp：小 cornerRadius + 大螺絲規格下，未夾制的沉孔可能 breach 蓋子側邊。
        // inset 複刻 planCornerPosts 的角柱 XY 公式，保留至少 MIN_SIDE_WALL 側壁；
        // 下限不小於通孔半徑（沉孔本應包住通孔，不應比通孔還窄）。
        const inset = plan.cornerRadius + 3;
        const boreRadius = Math.max(
          throughRadius,
          Math.min(spec.socketHeadDiameter / 2 + HEAD_CLEARANCE, inset - MIN_SIDE_WALL),
        );
        const bore = kernel.transform(kernel.cylinder(boreRadius, boreDepth + 1), {
          position: [p.x, p.y, panelZ + panelH - boreDepth],
          ...noRotScale,
        });
        lid = kernel.difference(lid, bore);
      }
    }
  }

  return lid;
}
