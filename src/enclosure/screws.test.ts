import { describe, expect, it } from 'vitest';
import { pilotDiameter, SCREW_TABLE } from './screws';

describe('SCREW_TABLE', () => {
  it('涵蓋 M2/M2.5/M3/M4 四種規格', () => {
    expect(Object.keys(SCREW_TABLE).sort()).toEqual(['M2', 'M2.5', 'M3', 'M4']);
  });

  it('每個規格：自攻孔 < 通孔 < 沉頭孔徑', () => {
    for (const spec of Object.values(SCREW_TABLE)) {
      expect(spec.selfTapDiameter).toBeLessThan(spec.throughDiameter);
      expect(spec.throughDiameter).toBeLessThan(spec.countersinkDiameter);
      expect(spec.countersinkDepth).toBeGreaterThan(0);
    }
  });

  it('尺寸隨規格遞增（M2 < M2.5 < M3 < M4）', () => {
    const order: (keyof typeof SCREW_TABLE)[] = ['M2', 'M2.5', 'M3', 'M4'];
    for (let i = 1; i < order.length; i++) {
      expect(SCREW_TABLE[order[i]].throughDiameter).toBeGreaterThan(
        SCREW_TABLE[order[i - 1]].throughDiameter,
      );
    }
  });
});

describe('pilotDiameter', () => {
  it('through 回傳通孔直徑', () => {
    expect(pilotDiameter('M3', 'through')).toBe(SCREW_TABLE.M3.throughDiameter);
  });

  it('selfTap 與 countersink 都回傳自攻導孔直徑（沉頭錐面另外處理）', () => {
    expect(pilotDiameter('M3', 'selfTap')).toBe(SCREW_TABLE.M3.selfTapDiameter);
    expect(pilotDiameter('M3', 'countersink')).toBe(SCREW_TABLE.M3.selfTapDiameter);
  });
});
