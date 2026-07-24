/**
 * 高清模型對照表（視覺專用，不影響外殼規劃/碰撞/匯出，那些一律用零件庫的
 * 程序化幾何）。缺項的零件在「高清模型」開啟時 fallback 回程序化幾何。
 */
export const HIGH_RES_MODELS: Record<string, string> = {
  'tt-motor': '/models/tt-motor.stl',
};
