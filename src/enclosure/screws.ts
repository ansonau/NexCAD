export type ScrewSize = 'M2' | 'M2.5' | 'M3' | 'M4';
export type HoleStyle = 'through' | 'selfTap' | 'countersink';

export interface ScrewHoleSpec {
  /** 通孔直徑：螺絲可自由穿過 */
  throughDiameter: number;
  /** 自攻導孔直徑：螺絲自行攻牙，較緊配合 */
  selfTapDiameter: number;
  /** 沉頭窩口直徑（螺絲頭卡住的位置） */
  countersinkDiameter: number;
  /** 沉頭窩深度 */
  countersinkDepth: number;
}

export const SCREW_TABLE: Record<ScrewSize, ScrewHoleSpec> = {
  M2: { throughDiameter: 2.4, selfTapDiameter: 1.6, countersinkDiameter: 4.0, countersinkDepth: 1.2 },
  'M2.5': { throughDiameter: 2.9, selfTapDiameter: 2.0, countersinkDiameter: 5.0, countersinkDepth: 1.5 },
  M3: { throughDiameter: 3.4, selfTapDiameter: 2.5, countersinkDiameter: 6.0, countersinkDepth: 1.8 },
  M4: { throughDiameter: 4.5, selfTapDiameter: 3.3, countersinkDiameter: 8.0, countersinkDepth: 2.4 },
};

/** 依螺絲規格與孔型回傳「導孔本體」直徑（countersink 的錐面另外處理，見 lidGeometry/screwHoleNode） */
export function pilotDiameter(size: ScrewSize, style: HoleStyle): number {
  const spec = SCREW_TABLE[size];
  return style === 'through' ? spec.throughDiameter : spec.selfTapDiameter;
}
