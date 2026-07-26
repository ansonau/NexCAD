/**
 * 高清模型對照表（視覺專用，不影響外殼規劃/碰撞/匯出，那些一律用零件庫的
 * 程序化幾何）。缺項的零件在「高清模型」開啟時 fallback 回程序化幾何。
 */
export interface HighResModel {
  url: string;
  /** Offset a model whose STL origin differs from the part's bottom-center origin. */
  originOffset?: [number, number, number];
}

export const HIGH_RES_MODELS: Record<string, HighResModel> = {
  // The STL gearbox is already centered on the part origin; keep visual and procedural models aligned.
  'tt-motor': { url: '/parts/tt-motor/tt-motor.stl', originOffset: [0, 0, 0] },
};
