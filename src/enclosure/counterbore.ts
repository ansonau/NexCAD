import type { ScrewSize } from './screws';
import { SCREW_TABLE } from './screws';

// ponytail: 沉孔埋頭餘量, 若要依材質/公差開放調整再加 EnclosureParams 欄位
export const SINK_MARGIN = 0.5;
// ponytail: 杯頭裝配鬆配間隙, 若要依材質/公差開放調整再加 EnclosureParams 欄位
export const HEAD_CLEARANCE = 0.3;
// ponytail: 沉孔側壁最小殘壁, 若要依材質開放調整再加邏輯
export const MIN_SIDE_WALL = 1;

/**
 * 杯頭沉孔半徑：依螺絲規格與角柱 inset（cornerRadius+3）夾制，避免 breach 側壁。
 * 下限不小於通孔半徑（沉孔本應包住通孔，不應比通孔還窄）。
 */
export function counterboreRadius(screwSize: ScrewSize, cornerRadius: number, throughRadius: number): number {
  const spec = SCREW_TABLE[screwSize];
  const inset = cornerRadius + 3;
  return Math.max(throughRadius, Math.min(spec.socketHeadDiameter / 2 + HEAD_CLEARANCE, inset - MIN_SIDE_WALL));
}

/** 沉孔深度：杯頭高度 + 埋入餘量，讓杯頭完全藏入面板內不外露 */
export function counterboreDepth(screwSize: ScrewSize): number {
  return SCREW_TABLE[screwSize].socketHeadDepth + SINK_MARGIN;
}
