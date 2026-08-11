import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const assets = [
  ['tt-motor', [-46, -18.5, 0], [23.9, 18.5, 22.4]],
  ['arduino-nano', [-21.59, -8.885, 0], [21.59, 8.885, 10.1]],
  ['arduino-mega-2560', [-51.3, -26.675, 0], [50.8, 26.675, 12.6]],
  ['hc-sr04', [-22.5, -10, 0], [22.5, 10, 13.5]],
  ['oled-096', [-13.65, -13.65, 0], [13.65, 13.65, 11]],
  ['oled-13', [-17.7, -16.75, 0], [17.7, 16.75, 11.3]],
];

function readBinaryStlBounds(partId) {
  const stlPath = new URL(`../../public/parts/${partId}/${partId}.stl`, import.meta.url);
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
        expect(Number.isFinite(value), `${partId} triangle ${triangle} vertex ${vertex}`).toBe(true);
        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
      }
    }
  }

  return { min, max };
}

function hasVertex(partId, target) {
  const stlPath = new URL(`../../public/parts/${partId}/${partId}.stl`, import.meta.url);
  const data = readFileSync(stlPath);
  const triangles = data.readUInt32LE(80);
  for (let triangle = 0; triangle < triangles; triangle += 1) {
    const vertices = 84 + triangle * 50 + 12;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const point = [0, 1, 2].map((axis) => data.readFloatLE(vertices + vertex * 12 + axis * 4));
      if (point.every((value, axis) => Math.abs(value - target[axis]) < 1e-4)) return true;
    }
  }
  return false;
}

describe('high-res STL assets', () => {
  it.each(assets)('%s is a dimensionally correct binary STL', (partId, expectedMin, expectedMax) => {
    const bounds = readBinaryStlBounds(partId);
    for (let axis = 0; axis < 3; axis += 1) {
      expect(bounds.min[axis]).toBeCloseTo(expectedMin[axis], 1);
      expect(bounds.max[axis]).toBeCloseTo(expectedMax[axis], 1);
    }
  });

  it('Arduino Mega 2560 keeps the clipped right board corners', () => {
    expect(hasVertex('arduino-mega-2560', [50.8, 26.675, 1.6])).toBe(false);
    expect(hasVertex('arduino-mega-2560', [50.8, -26.675, 1.6])).toBe(false);
  });
});
