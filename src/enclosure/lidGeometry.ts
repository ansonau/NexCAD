import type { GeometryKernel, Solid } from '../geometry/kernel';
import { pilotDiameter, SCREW_TABLE } from './screws';
import { planCornerPosts } from './plan';
import type { EnclosureParams, ShellPlan } from './plan';

const noRotScale = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
const LIP_MARGIN = 0.4;
const LIP_HEIGHT = 3;
const POST_HEIGHT = 4;

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
    for (const p of planCornerPosts(plan, params.screwSize)) {
      // 螺絲柱向上凸出於面板頂面（z >= panelZ），刻意與殼體本身的角柱（z <= inner.maxZ = panelZ）
      // 的空間互斥，兩者在合模面對接而不互相佔用，避免上蓋無法真正貼合殼體開口。
      const postRadius = Math.max(pilotDiameter(params.screwSize, 'selfTap') / 2, throughRadius) + params.wallThickness;
      const post = kernel.transform(kernel.cylinder(postRadius, POST_HEIGHT), {
        position: [p.x, p.y, panelZ + panelH],
        ...noRotScale,
      });
      lid = kernel.union(lid, post);
      // 通孔從柱體頂端貫穿到唇邊底端，讓螺絲軸全程無阻，並在合模面與殼體導孔對接
      const throughTop = panelZ + panelH + POST_HEIGHT + 1;
      const throughBottom = panelZ - LIP_HEIGHT - 1;
      const through = kernel.transform(kernel.cylinder(throughRadius, throughTop - throughBottom), {
        position: [p.x, p.y, throughBottom],
        ...noRotScale,
      });
      lid = kernel.difference(lid, through);
      // 杯頭沉孔：從柱頂向下挖，讓螺絲頭嵌入柱內不外露。深度 clamp 在柱高以內，
      // 避免沉孔貫穿柱子進入面板／合模面（M4 的 socketHeadDepth=4.3 已超過柱高 4，
      // clamp 恆常觸發，沉孔深度上限即柱高本身）。
      const spec = SCREW_TABLE[params.screwSize];
      const boreDepth = Math.min(spec.socketHeadDepth, POST_HEIGHT);
      // 沉孔半徑 clamp：薄壁 + 大螺絲規格（如 M4 配 wallThickness < 1.45mm）下，
      // 未夾制的沉孔半徑可能 >= postRadius，導致柱體被整個挖空。保留至少 0.3mm
      // 殘壁，並下限不小於通孔半徑（沉孔本應包住通孔，不應比通孔還窄）。
      const boreRadius = Math.max(throughRadius, Math.min(spec.socketHeadDiameter / 2, postRadius - 0.3));
      const bore = kernel.transform(
        kernel.cylinder(boreRadius, boreDepth + 1),
        {
          position: [p.x, p.y, panelZ + panelH + POST_HEIGHT - boreDepth],
          ...noRotScale,
        },
      );
      lid = kernel.difference(lid, bore);
    }
  }

  return lid;
}
