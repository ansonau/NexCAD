import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { ShellPlan, StandoffPlan } from './plan';
import type { ScrewEntry, ScrewLidProfile } from '../types/document';
import type { ScrewSize } from './screws';
import { pilotDiameter } from './screws';
import { counterboreDepth, counterboreRadius } from './counterbore';

const noRotScale = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };

// ponytail: 固定鬆配間隙, 若要依材質/公差開放調整再加 EnclosureParams 欄位
const PEG_CLEARANCE = 0.2;
// ponytail: 定位柱固定插入深度, 若要依零件厚度自動調整再加邏輯
const PEG_HEIGHT = 4;

/**
 * 殼體本體：外形（圓角）挖去內腔，再加上每個支柱（含螺絲導孔）。
 * 世界絕對座標，呼叫端不需再套用額外 transform。
 *
 * `screwEntry`/`screwSize`/`screwLidProfile` 只影響 `isCornerPost` 支柱（上蓋鎖點角柱）；
 * 零件安裝柱維持現行 `mountingStyle` 分支不變（design.md D5）。
 */
export function buildShellSolid(
  plan: ShellPlan,
  wallThickness: number,
  standoffs: StandoffPlan[],
  kernel: GeometryKernel,
  standoffWallPadding: number = wallThickness,
  screwEntry: ScrewEntry = 'fromLid',
  screwSize: ScrewSize = 'M3',
  screwLidProfile: ScrewLidProfile = 'flatRecessed',
): Solid {
  const { outer, inner, cornerRadius } = plan;

  // fromBase + flatRecessed：底板整體加厚以容納杯頭沉孔（design.md D5）。
  // cavitySolid／inner 完全不動，只把外底面往下延伸；非 fromBase 或 flatExposed 時 floorExtra=0，行為不變。
  const isFlatRecessed = (screwLidProfile ?? 'flatRecessed') === 'flatRecessed';
  const floorExtra = screwEntry === 'fromBase' && isFlatRecessed ? counterboreDepth(screwSize) : 0;
  const adjustedFloorZ = plan.floorZ - floorExtra;

  const outerSolid = kernel.transform(
    kernel.roundedBox(outer.maxX - outer.minX, outer.maxY - outer.minY, outer.maxZ - adjustedFloorZ, cornerRadius),
    {
      position: [(outer.minX + outer.maxX) / 2, (outer.minY + outer.maxY) / 2, adjustedFloorZ],
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
    if (s.isCornerPost && screwEntry === 'fromBase') {
      // fromBase：螺絲頭在底座，角柱改提供通孔淨空（柱體半徑=通孔半徑，非自攻半徑），
      // 從新的外底面（adjustedFloorZ）長到合模面（topZ）（design.md D5）。
      const throughRadius = pilotDiameter(screwSize, 'through') / 2;
      const postRadius = throughRadius + standoffWallPadding;
      const postHeight = s.topZ - adjustedFloorZ;
      if (postHeight > 0) {
        const post = kernel.transform(kernel.cylinder(postRadius, postHeight), {
          position: [s.x, s.y, adjustedFloorZ],
          ...noRotScale,
        });
        shell = kernel.union(shell, post);
      }

      // 通孔：從外底面下方 1mm 貫穿到合模面上方 1mm，確保乾淨貫穿。
      const throughBottom = adjustedFloorZ - 1;
      const throughTop = s.topZ + 1;
      const through = kernel.transform(kernel.cylinder(throughRadius, throughTop - throughBottom), {
        position: [s.x, s.y, throughBottom],
        ...noRotScale,
      });
      shell = kernel.difference(shell, through);

      if (isFlatRecessed) {
        // 杯頭沉孔：從新的外底面向上挖，讓杯頭完全埋入加厚的底板內，外底面維持平整。
        const boreDepth = counterboreDepth(screwSize);
        const boreRadius = counterboreRadius(screwSize, plan.cornerRadius, throughRadius);
        const bore = kernel.transform(kernel.cylinder(boreRadius, boreDepth + 1), {
          position: [s.x, s.y, adjustedFloorZ - 1],
          ...noRotScale,
        });
        shell = kernel.difference(shell, bore);
      }
      continue;
    }
    if (s.mountingStyle === 'peg') {
      // peg 模式：實心柱長到孔平面 topZ，不鑽導孔（沒有螺絲要攻牙，柱身不需要深度餘量）。
      const standoffHeight = s.topZ - plan.floorZ;
      if (standoffHeight <= 0) continue;
      const standoffRadius = s.pilotDiameter / 2 + standoffWallPadding;
      const post = kernel.transform(kernel.cylinder(standoffRadius, standoffHeight), {
        position: [s.x, s.y, plan.floorZ],
        ...noRotScale,
      });
      shell = kernel.union(shell, post);
      // 柱頂向上長一段定位圓柱，插入零件安裝孔取代螺絲。
      const pegDiameter = Math.max((s.holeDiameter ?? 0) - PEG_CLEARANCE, 0.5);
      const peg = kernel.transform(kernel.cylinder(pegDiameter / 2, PEG_HEIGHT), {
        position: [s.x, s.y, s.topZ],
        ...noRotScale,
      });
      shell = kernel.union(shell, peg);
    } else {
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
      // 導孔必須以支柱「實際頂面」（floorZ+standoffHeight）為基準往下鑽，而非 s.topZ：
      // 當零件貼齊內腔底（topZ 等於 inner.minZ）觸發上面的 pilotDepth 高度下限時，支柱實際
      // 頂面會高於 topZ；若仍以 topZ 為鑽孔基準，導孔會幾乎鑽不到深度（柱頂留下實心無孔的
      // 錯誤外觀）。下緣依然夾在 inner.minZ，避免鑽穿殼體外底面的實心外皮。
      const standoffTop = plan.floorZ + standoffHeight;
      const pilotBottom = Math.max(standoffTop - s.pilotDepth, plan.inner.minZ);
      const pilot = kernel.transform(kernel.cylinder(s.pilotDiameter / 2, standoffTop - pilotBottom + 1), {
        position: [s.x, s.y, pilotBottom],
        ...noRotScale,
      });
      shell = kernel.difference(shell, pilot);
    }
  }

  return shell;
}
