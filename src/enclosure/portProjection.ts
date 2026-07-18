import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { Bounds3, PartInstance } from './plan';

const DEG = Math.PI / 180;
const TOLERANCE_MM = 0.4;

export interface PortCutoutPlan {
  wall: 'north' | 'south' | 'east' | 'west';
  /** 沿牆面水平方向的世界座標（east/west 牆為 Y，north/south 牆為 X） */
  u: number;
  /** 世界 Z 高度（開孔中心） */
  v: number;
  w: number;
  h: number;
  shape: 'rect' | 'circle';
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function worldNormalToWall(nx: number, ny: number): 'north' | 'south' | 'east' | 'west' {
  if (Math.abs(nx) > Math.abs(ny)) return nx > 0 ? 'east' : 'west';
  return ny > 0 ? 'north' : 'south';
}

/**
 * 把零件側面（非 top）接口投影到對應的外殼牆面。只支援 Z 軸 90° 倍數旋轉，
 * 其餘角度的零件其接口會被略過（見計畫全域限制）。
 */
export function planPortCutouts(parts: PartInstance[]): PortCutoutPlan[] {
  const out: PortCutoutPlan[] = [];
  for (const part of parts) {
    const angle = normalizeAngle(part.transform.rotation[2]);
    if (angle % 90 !== 0) continue;
    const [bodyL, bodyW, bodyT] = part.def.body.size;
    const [px, py, pz] = part.transform.position;
    const rad = angle * DEG;
    const cos = Math.round(Math.cos(rad));
    const sin = Math.round(Math.sin(rad));
    for (const port of part.def.ports) {
      if (port.face === 'top') continue;
      let localX: number;
      let localY: number;
      let normal: [number, number];
      switch (port.face) {
        case 'west':
          localX = -bodyL / 2;
          localY = port.x;
          normal = [-1, 0];
          break;
        case 'east':
          localX = bodyL / 2;
          localY = port.x;
          normal = [1, 0];
          break;
        case 'south':
          localX = port.x;
          localY = -bodyW / 2;
          normal = [0, -1];
          break;
        case 'north':
        default:
          localX = port.x;
          localY = bodyW / 2;
          normal = [0, 1];
          break;
      }
      const worldX = px + localX * cos - localY * sin;
      const worldY = py + localX * sin + localY * cos;
      const worldNX = normal[0] * cos - normal[1] * sin;
      const worldNY = normal[0] * sin + normal[1] * cos;
      const wall = worldNormalToWall(worldNX, worldNY);
      const horizontal = wall === 'east' || wall === 'west' ? worldY : worldX;
      out.push({
        wall,
        u: horizontal,
        v: pz + bodyT + port.z + port.h / 2,
        w: port.w + TOLERANCE_MM * 2,
        h: port.h + TOLERANCE_MM * 2,
        shape: port.shape,
      });
    }
  }
  return out;
}

export interface TopWindowCutout {
  /** 世界座標窗中心 X */
  x: number;
  /** 世界座標窗中心 Y */
  y: number;
  w: number;
  h: number;
}

/**
 * 把零件 top face 接口（螢幕視窗）投影為上蓋開窗計畫。只支援 Z 軸 90° 倍數旋轉，
 * 其餘角度的零件其視窗會被略過（見計畫全域限制，同 planPortCutouts）。
 */
export function planTopWindowCutouts(parts: PartInstance[]): TopWindowCutout[] {
  const out: TopWindowCutout[] = [];
  for (const part of parts) {
    const angle = normalizeAngle(part.transform.rotation[2]);
    if (angle % 90 !== 0) continue;
    const [px, py] = part.transform.position;
    const rad = angle * DEG;
    const cos = Math.round(Math.cos(rad));
    const sin = Math.round(Math.sin(rad));
    for (const port of part.def.ports) {
      if (port.face !== 'top') continue;
      const worldX = px + port.x * cos - port.z * sin;
      const worldY = py + port.x * sin + port.z * cos;
      const worldW = Math.abs(port.w * cos) + Math.abs(port.h * sin);
      const worldH = Math.abs(port.w * sin) + Math.abs(port.h * cos);
      out.push({
        x: worldX,
        y: worldY,
        w: worldW + TOLERANCE_MM * 2,
        h: worldH + TOLERANCE_MM * 2,
      });
    }
  }
  return out;
}

/** 在殼體對應牆面挖出矩形開孔（見全域限制：一律以外接矩形挖孔） */
export function cutPorts(
  shell: Solid,
  outer: Bounds3,
  cutouts: PortCutoutPlan[],
  kernel: GeometryKernel,
): Solid {
  let result = shell;
  const cutDepth = 20;
  for (const c of cutouts) {
    const isEastWest = c.wall === 'east' || c.wall === 'west';
    const box = isEastWest ? kernel.box(cutDepth, c.w, c.h) : kernel.box(c.w, cutDepth, c.h);
    let position: [number, number, number];
    if (c.wall === 'east') position = [outer.maxX, c.u, c.v - c.h / 2];
    else if (c.wall === 'west') position = [outer.minX, c.u, c.v - c.h / 2];
    else if (c.wall === 'north') position = [c.u, outer.maxY, c.v - c.h / 2];
    else position = [c.u, outer.minY, c.v - c.h / 2];
    const cut = kernel.transform(box, { position, rotation: [0, 0, 0], scale: [1, 1, 1] });
    result = kernel.difference(result, cut);
  }
  return result;
}
