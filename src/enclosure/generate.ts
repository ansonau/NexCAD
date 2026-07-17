import { getPartDefinition } from '../parts/library';
import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { EnclosureNode } from '../types/document';
import { planCornerPosts, planShell, planStandoffs } from './plan';
import type { PartInstance } from './plan';
import { cutPorts, planPortCutouts } from './portProjection';
import { buildShellSolid } from './shellGeometry';
import { buildLidSolid } from './lidGeometry';

function resolveParts(node: EnclosureNode): PartInstance[] {
  const out: PartInstance[] = [];
  for (const s of node.sourceParts) {
    const def = getPartDefinition(s.partId);
    if (def) out.push({ def, transform: s.transform });
  }
  return out;
}

/** 由 EnclosureNode 組裝出 Solid；worker-safe（不依賴 store）。找不到任何來源零件時回傳 null */
export function buildEnclosureNodeSolid(node: EnclosureNode, kernel: GeometryKernel): Solid | null {
  const parts = resolveParts(node);
  if (parts.length === 0) return null;
  const plan = planShell(parts, node.params);

  if (node.part === 'lid') {
    if (node.params.lidType === 'open') return null;
    return buildLidSolid(plan, node.params, parts, kernel);
  }

  const pilotDepth = node.params.pilotDepthOverride;
  const standoffs = [
    ...planStandoffs(parts, node.params.screwSize, pilotDepth, node.params.mountingStyle),
    ...(node.params.lidType === 'screw'
      ? planCornerPosts(plan, node.params.screwSize, parts, pilotDepth)
      : []),
  ];
  let shell = buildShellSolid(
    plan,
    node.params.wallThickness,
    standoffs,
    kernel,
    node.params.standoffWallPadding,
  );
  shell = cutPorts(shell, plan.outer, planPortCutouts(parts), kernel);
  return shell;
}
