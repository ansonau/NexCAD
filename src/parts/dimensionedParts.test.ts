import { describe, expect, it } from 'vitest';
import { getPartDefinition } from './library';

describe('dimension-drawing parts', () => {
  it('Arduino Mega 2560 follows the board drawing', () => {
    const part = getPartDefinition('arduino-mega-2560')!;
    expect(part.category).toBe('board');
    expect(part.body.size).toEqual([101.6, 53.35, 1.6]);
    expect(part.mountingHoles).toHaveLength(6);
    expect(part.mountingHoles.every((hole) => hole.diameter === 3.2)).toBe(true);
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
});
