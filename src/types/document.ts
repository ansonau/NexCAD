export type Vec3 = [number, number, number];

export interface Transform {
  position: Vec3;
  /** 旋轉角度（degrees），依 X→Y→Z 順序套用 */
  rotation: Vec3;
  scale: Vec3;
}

export type NodeRole = 'solid' | 'hole';

export type PrimitiveKind = 'box' | 'cylinder' | 'sphere' | 'cone';

interface NodeCommon {
  id: string;
  name: string;
  role: NodeRole;
  transform: Transform;
  visible: boolean;
  locked: boolean;
}

export interface PrimitiveNode extends NodeCommon {
  type: 'primitive';
  kind: PrimitiveKind;
  params: Record<string, number>;
}

export interface GroupNode extends NodeCommon {
  type: 'group';
  children: SceneNode[];
}

export interface PartNode extends NodeCommon {
  type: 'part';
  partId: string;
}

export type ScrewSizeLiteral = 'M2' | 'M2.5' | 'M3' | 'M4';

export interface EnclosureParams {
  wallThickness: number;
  clearanceMargin: number;
  cornerRadius: number;
  lidType: 'screw' | 'slide' | 'open';
  screwSize: ScrewSizeLiteral;
  /** 支柱半徑 = 導孔半徑 + 此值 */
  standoffWallPadding: number;
  /** 自攻導孔深度；未設定時用查表預設（6mm） */
  pilotDepthOverride?: number;
  /** 上蓋角柱是否自動保留殼體空間避免與零件碰撞；未設定時視為 true */
  reserveCornerSpace?: boolean;
}

export interface EnclosureSourcePart {
  nodeId: string;
  partId: string;
  transform: Transform;
}

export interface EnclosureNode extends NodeCommon {
  type: 'enclosure';
  part: 'base' | 'lid';
  params: EnclosureParams;
  sourceParts: EnclosureSourcePart[];
}

export type SceneNode = PrimitiveNode | GroupNode | PartNode | EnclosureNode;

export interface NexcadDocument {
  version: 1;
  name: string;
  units: 'mm';
  nodes: SceneNode[];
}

export function identityTransform(): Transform {
  return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
}

export const PRIMITIVE_DEFAULTS: Record<PrimitiveKind, Record<string, number>> = {
  box: { width: 20, depth: 20, height: 20 },
  cylinder: { radius: 10, height: 20 },
  sphere: { radius: 10 },
  cone: { radiusBottom: 10, radiusTop: 0, height: 20 },
};

let idCounter = 0;

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `n_${crypto.randomUUID()}`;
  }
  idCounter += 1;
  return `n_${Date.now().toString(36)}_${idCounter}`;
}

export function createPrimitive(
  kind: PrimitiveKind,
  overrides: Partial<Omit<PrimitiveNode, 'type' | 'kind'>> = {},
): PrimitiveNode {
  return {
    type: 'primitive',
    id: newId(),
    name: kind,
    role: 'solid',
    transform: identityTransform(),
    visible: true,
    locked: false,
    kind,
    params: { ...PRIMITIVE_DEFAULTS[kind] },
    ...overrides,
  };
}

export function createPartNode(
  partId: string,
  name: string,
  overrides: Partial<Omit<PartNode, 'type' | 'partId'>> = {},
): PartNode {
  return {
    type: 'part',
    id: newId(),
    name,
    role: 'solid',
    transform: identityTransform(),
    visible: true,
    locked: false,
    partId,
    ...overrides,
  };
}

export function emptyDocument(name = '未命名專案'): NexcadDocument {
  return { version: 1, name, units: 'mm', nodes: [] };
}
