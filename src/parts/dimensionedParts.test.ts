import { describe, expect, it } from 'vitest';
import { getPartDefinition } from './library';

describe('dimension-drawing parts', () => {
  it('Arduino Mega 2560 follows the board drawing', () => {
    const part = getPartDefinition('arduino-mega-2560')!;
    expect(part.category).toBe('board');
    expect(part.body.size).toEqual([101.6, 53.35, 1.6]);
    expect(part.mountingHoles).toHaveLength(6);
    expect(part.mountingHoles).toEqual([
      { x: -36.8, y: -24.18, diameter: 3.2 },
      { x: -36.8, y: 24.13, diameter: 3.2 },
      { x: 15.2, y: -19.08, diameter: 3.2 },
      { x: 15.2, y: 8.93, diameter: 3.2 },
      { x: 45.7, y: -24.18, diameter: 3.2 },
      { x: 39.4, y: 24.13, diameter: 3.2 },
    ]);
    expect(part.clearanceHeight).toBeGreaterThanOrEqual(12.6);
  });

  it('Arduino Nano follows the 3.0 drawing', () => {
    const part = getPartDefinition('arduino-nano')!;
    expect(part.body.size).toEqual([43.18, 17.77, 1.6]);
    expect(part.mountingHoles).toHaveLength(4);
    expect(part.mountingHoles.every((hole) => hole.diameter === 1.65)).toBe(true);
    const xs = part.mountingHoles.map((hole) => hole.x);
    const ys = part.mountingHoles.map((hole) => hole.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(40.64, 2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(15.24, 2);
    expect(part.clearanceHeight).toBeGreaterThanOrEqual(10.1);
  });

  it('OLED 0.96 follows the module drawing', () => {
    const part = getPartDefinition('oled-096')!;
    expect(part.body.size).toEqual([27.3, 27.3, 1.2]);
    expect(part.mountingHoles).toHaveLength(4);
    const xs = part.mountingHoles.map((hole) => hole.x);
    const ys = part.mountingHoles.map((hole) => hole.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(20.7, 2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(23.3, 2);
    expect(part.mountingHoles.every((hole) => hole.diameter === 2)).toBe(true);
    expect(part.ports).toEqual([
      { face: 'top', shape: 'rect', x: 0, z: -1.5, w: 23.3, h: 19, label: '螢幕視窗' },
    ]);
    expect(part.clearanceHeight).toBeGreaterThanOrEqual(11);
  });
});
