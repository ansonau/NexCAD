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

  it('HC-SR04 follows the sensor drawing', () => {
    const part = getPartDefinition('hc-sr04')!;
    expect(part.body.size).toEqual([45, 20, 1.5]);
    expect(part.mountingHoles).toEqual([
      { x: -21, y: -8.25, diameter: 2 },
      { x: 21, y: 8.25, diameter: 2 },
    ]);
    const cans = part.body.blocks.filter((block) => block.label?.includes('換能器'));
    expect(cans.map((block) => block.position[0])).toEqual([-13, 13]);
    expect(cans.every((block) => block.size[0] === 16 && block.size[2] === 12)).toBe(true);
    expect(part.clearanceHeight).toBeGreaterThanOrEqual(13.5);
  });

  it('OLED 0.96 follows the module drawing', () => {
    const part = getPartDefinition('oled-096')!;
    expect(part.body.size).toEqual([27.3, 27.3, 1.2]);
    expect(part.mountingHoles).toEqual([
      { x: -10.35, y: -11.65, diameter: 2 },
      { x: -10.35, y: 11.65, diameter: 2 },
      { x: 10.35, y: -11.65, diameter: 2 },
      { x: 10.35, y: 11.65, diameter: 2 },
    ]);
    expect(part.ports).toEqual([
      { face: 'top', shape: 'rect', x: 0, z: -1.5, w: 23.3, h: 19, label: '螢幕視窗' },
    ]);
    expect(part.clearanceHeight).toBeGreaterThanOrEqual(11);
  });

  it('OLED 1.3 follows the module drawing', () => {
    const part = getPartDefinition('oled-13')!;
    expect(part.category).toBe('sensor');
    expect(part.body.size).toEqual([35.4, 33.5, 1.2]);
    expect(part.mountingHoles).toHaveLength(4);
    expect(part.mountingHoles.every((hole) => hole.diameter === 3)).toBe(true);
    const xs = part.mountingHoles.map((hole) => hole.x);
    const ys = part.mountingHoles.map((hole) => hole.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(29.42, 2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(28.5, 2);
    expect(part.clearanceHeight).toBeGreaterThanOrEqual(11.3);
  });
});
