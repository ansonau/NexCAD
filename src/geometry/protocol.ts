import type { NodeRole, SceneNode } from '../types/document';

export type GeometryRequest =
  | { id: number; type: 'evaluate'; nodes: SceneNode[] }
  | { id: number; type: 'export'; nodes: SceneNode[] };

export interface NodeMeshPayload {
  nodeId: string;
  role: NodeRole;
  /** 來自 PartBlock.color；缺省＝節點預設色 */
  color?: string;
  positions: Float32Array;
  indices: Uint32Array;
}

export type GeometryResponse =
  | { id: number; ok: true; type: 'evaluate'; meshes: NodeMeshPayload[] }
  | { id: number; ok: true; type: 'export'; positions: Float32Array; indices: Uint32Array }
  | { id: number; ok: false; error: string };
