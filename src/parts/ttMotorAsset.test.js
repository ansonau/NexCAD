import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stlPath = new URL('../../public/parts/tt-motor/tt-motor.stl', import.meta.url);

describe('TT Motor high-res STL', () => {
  it('是尺寸符合圖紙的 binary STL', () => {
    const data = readFileSync(stlPath);
    const triangles = data.readUInt32LE(80);
    expect(data.length).toBe(84 + triangles * 50);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let triangle = 0; triangle < triangles; triangle += 1) {
      const vertices = 84 + triangle * 50 + 12;
      for (let vertex = 0; vertex < 3; vertex += 1) {
        for (let axis = 0; axis < 3; axis += 1) {
          const value = data.readFloatLE(vertices + vertex * 12 + axis * 4);
          min[axis] = Math.min(min[axis], value);
          max[axis] = Math.max(max[axis], value);
        }
      }
    }

    expect(max[0] - min[0]).toBeCloseTo(69.9, 1);
    expect(max[1] - min[1]).toBeCloseTo(37, 1);
    expect(max[2] - min[2]).toBeCloseTo(22.4, 1);
  });
});
