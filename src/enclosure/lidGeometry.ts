import type { GeometryKernel, Solid } from '../geometry/kernel';
import { pilotDiameter, SCREW_TABLE } from './screws';
import { planCornerPosts } from './plan';
import type { EnclosureParams, PartInstance, ShellPlan } from './plan';
import { planTopWindowCutouts } from './portProjection';
import { counterboreDepth, counterboreRadius, SINK_MARGIN } from './counterbore';

const noRotScale = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
const LIP_MARGIN = 0.4;
const LIP_HEIGHT = 3;

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
  const isFlatRecessed =
    params.lidType === 'screw' &&
    (params.screwLidProfile ?? 'flatRecessed') === 'flatRecessed' &&
    params.screwEntry !== 'fromBase';
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
      if (params.screwEntry === 'fromBase') {
        // fromBase：螺絲頭在底座，上蓋角柱只需自攻盲孔供螺牙咬合（design.md D4），
        // 從唇邊底面（合模面）向上鑽，深度 clamp 在面板+唇邊實際厚度內，避免鑽穿頂面外皮。
        const pilotRadius = pilotDiameter(params.screwSize, 'selfTap') / 2;
        const pilotDepth = Math.min(p.pilotDepth, panelH + LIP_HEIGHT - 1);
        const pilot = kernel.transform(kernel.cylinder(pilotRadius, pilotDepth), {
          position: [p.x, p.y, panelZ - LIP_HEIGHT],
          ...noRotScale,
        });
        lid = kernel.difference(lid, pilot);
      } else {
        const through = kernel.transform(kernel.cylinder(throughRadius, throughTop - throughBottom), {
          position: [p.x, p.y, throughBottom],
          ...noRotScale,
        });
        lid = kernel.difference(lid, through);

        if (isFlatRecessed) {
          // 杯頭沉孔：從蓋頂面向下挖，深度埋入 SINK_MARGIN，讓杯頭完全藏入面板內不外露。
          const boreDepth = counterboreDepth(params.screwSize);
          const boreRadius = counterboreRadius(params.screwSize, plan.cornerRadius, throughRadius);
          const bore = kernel.transform(kernel.cylinder(boreRadius, boreDepth + 1), {
            position: [p.x, p.y, panelZ + panelH - boreDepth],
            ...noRotScale,
          });
          lid = kernel.difference(lid, bore);
        }
      }
    }
  }

  if (params.lidDisplayCutout !== false) {
    for (const w of planTopWindowCutouts(parts)) {
      const cutH = panelH + LIP_HEIGHT + 2;
      const cut = kernel.transform(kernel.box(w.w, w.h, cutH), {
        position: [w.x, w.y, panelZ - LIP_HEIGHT - 1],
        ...noRotScale,
      });
      lid = kernel.difference(lid, cut);
    }
  }

  return lid;
}
