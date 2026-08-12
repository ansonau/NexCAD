import { describe, expect, it } from 'vitest';
import { createPartNode } from '../types/document';
import { collectHoleWorldAnnotations, collectHoleWorldPositions, snapToHoles } from './holeSnap';

describe('collectHoleWorldPositions', () => {
  it('回傳零件安裝孔的世界座標（含節點位移）', () => {
    const uno = createPartNode('arduino-uno', 'uno');
    uno.transform.position = [100, 50, 0];
    const holes = collectHoleWorldPositions([uno]);
    expect(holes).toHaveLength(4);
    expect(holes).toContainEqual([100 - 20.3, 50 - 24.2, 0]);
  });

  it('Z 軸旋轉 90° 時孔位跟著旋轉', () => {
    const uno = createPartNode('arduino-uno', 'uno');
    uno.transform.rotation = [0, 0, 90];
    const holes = collectHoleWorldPositions([uno]);
    // (x, y) 旋轉 90° → (−y, x)
    const target = holes.find((h) => Math.abs(h[0] - 24.2) < 1e-6 && Math.abs(h[1] + 20.3) < 1e-6);
    expect(target).toBeDefined();
  });

  it('排除指定節點與隱藏節點', () => {
    const a = createPartNode('arduino-uno', 'a');
    const b = createPartNode('arduino-uno', 'b');
    b.visible = false;
    expect(collectHoleWorldPositions([a, b], a.id)).toHaveLength(0);
  });

  it('X 軸旋轉 90° 時孔位 Z 座標跟著更新', () => {
    const uno = createPartNode('arduino-uno', 'uno');
    uno.transform.rotation = [90, 0, 0];
    const holes = collectHoleWorldPositions([uno]);
    // arduino-uno 有一孔在 (-20.3, -24.2, 0)，繞 X 90° 後 (x,y,z) -> (x, -z, y)
    const target = holes.find((h) => Math.abs(h[0] + 20.3) < 1e-6 && Math.abs(h[2] + 24.2) < 1e-6);
    expect(target).toBeDefined();
  });

  it('未知 partId 與非零件節點被略過', () => {
    const ghost = createPartNode('nope', 'ghost');
    expect(collectHoleWorldPositions([ghost])).toHaveLength(0);
  });
});

describe('collectHoleWorldAnnotations', () => {
  it('回傳零件安裝孔的標註資料', () => {
    const nano = createPartNode('arduino-nano', 'nano');
    nano.transform.position = [10, 20, 0];

    const annotations = collectHoleWorldAnnotations([nano]);

    expect(annotations[0]).toMatchObject({
      center: [10 - 20.32, 20 - 7.62, 0],
      diameter: 1.65,
      kind: 'through',
    });
  });
});

describe('snapToHoles', () => {
  it('XY 距離小於閾值時吸附到孔位（保留原 z）', () => {
    const snapped = snapToHoles([10.8, 20.5, 5], [[10, 20, 0]], 2);
    expect(snapped).toEqual([10, 20, 5]);
  });

  it('超出閾值不吸附', () => {
    expect(snapToHoles([15, 20, 0], [[10, 20, 0]], 2)).toEqual([15, 20, 0]);
  });

  it('多個孔位時吸附最近的', () => {
    const snapped = snapToHoles([10.9, 0, 0], [[10, 0, 0], [12, 0, 0]], 2);
    expect(snapped[0]).toBe(10);
  });
});
