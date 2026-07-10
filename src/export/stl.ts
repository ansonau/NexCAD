import type { MeshData } from '../geometry/kernel';

/** 產生 binary STL（little-endian）。格式：80B 標頭 + uint32 三角形數 + 每三角形 50B */
export function writeBinaryStl(mesh: MeshData): ArrayBuffer {
  const triCount = mesh.indices.length / 3;
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triCount, true);
  const p = mesh.positions;
  let offset = 84;
  for (let t = 0; t < triCount; t++) {
    const a = mesh.indices[t * 3] * 3;
    const b = mesh.indices[t * 3 + 1] * 3;
    const c = mesh.indices[t * 3 + 2] * 3;
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }
    const values = [nx, ny, nz, p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2]];
    for (const v of values) {
      view.setFloat32(offset, v, true);
      offset += 4;
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  return buffer;
}
