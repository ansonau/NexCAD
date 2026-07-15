import { createPrimitive, identityTransform, newId } from '../types/document';
import type { GroupNode, SceneNode } from '../types/document';
import { SCREW_TABLE } from './screws';
import type { HoleStyle, ScrewSize } from './screws';

const PILOT_HALF_HEIGHT = 10;

/** 建立標準螺絲孔節點（role='hole'），置於原點，供使用者以 gizmo 拖曳到定位 */
export function createScrewHoleNode(size: ScrewSize, style: HoleStyle): SceneNode {
  const spec = SCREW_TABLE[size];

  if (style === 'through') {
    return createPrimitive('cylinder', {
      name: `${size} 通孔`,
      role: 'hole',
      params: { radius: spec.throughDiameter / 2, height: PILOT_HALF_HEIGHT * 2 },
    });
  }

  if (style === 'selfTap') {
    return createPrimitive('cylinder', {
      name: `${size} 自攻導孔`,
      role: 'hole',
      params: { radius: spec.selfTapDiameter / 2, height: PILOT_HALF_HEIGHT * 2 },
    });
  }

  const pilot = createPrimitive('cylinder', {
    params: { radius: spec.selfTapDiameter / 2, height: PILOT_HALF_HEIGHT * 2 },
  });
  pilot.transform.position = [0, 0, -PILOT_HALF_HEIGHT];
  const sink = createPrimitive('cone', {
    params: {
      radiusBottom: spec.selfTapDiameter / 2,
      radiusTop: spec.countersinkDiameter / 2,
      height: spec.countersinkDepth,
    },
  });
  sink.transform.position = [0, 0, PILOT_HALF_HEIGHT];
  const group: GroupNode = {
    type: 'group',
    id: newId(),
    name: `${size} 沉頭孔`,
    role: 'hole',
    transform: identityTransform(),
    visible: true,
    locked: false,
    children: [pilot, sink],
  };
  return group;
}
