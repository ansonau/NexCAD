import type { Transform } from '../types/document';

export interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
}

/** 幾何核心的不透明 Solid 把手 */
export interface Solid {
  readonly __solid: true;
}

/**
 * 幾何核心抽象。第一版由 ManifoldKernel 實作；
 * 日後可加 OpenCascade 實作以支援 STEP 匯出（見規格 §4）。
 */
export interface GeometryKernel {
  init(): Promise<void>;
  box(width: number, depth: number, height: number): Solid;
  cylinder(radius: number, height: number): Solid;
  sphere(radius: number): Solid;
  cone(radiusBottom: number, radiusTop: number, height: number): Solid;
  union(a: Solid, b: Solid): Solid;
  difference(a: Solid, b: Solid): Solid;
  transform(s: Solid, t: Transform): Solid;
  toMesh(s: Solid): MeshData;
  volume(s: Solid): number;
}
