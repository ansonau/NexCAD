import { describe, expect, it } from 'vitest';
import { getPartDefinition } from '../parts/library';
import { buildCarNodes, DEFAULT_CAR_CONFIG } from '../parts/presets';
import type { PartNode } from '../types/document';
import { DEFAULT_ENCLOSURE_PARAMS, planCornerPosts, planShell, planStandoffs } from './plan';
import type { PartInstance } from './plan';

function groundGroupInstances(): PartInstance[] {
  const { nodes, defaultSelection } = buildCarNodes(DEFAULT_CAR_CONFIG, 'en');
  return nodes
    .filter((n): n is PartNode => n.type === 'part' && defaultSelection.includes(n.id))
    .map((n) => ({ def: getPartDefinition(n.partId)!, transform: n.transform }));
}

describe('智能小車貼地組的外殼整合', () => {
  it('螺絲柱固定時，內腔底部會向下預留支柱高度', () => {
    const plan = planShell(groundGroupInstances(), DEFAULT_ENCLOSURE_PARAMS);
    const standoffClearance = DEFAULT_ENCLOSURE_PARAMS.pilotDepthOverride ?? 6;
    expect(plan.inner.minZ).toBeCloseTo(-standoffClearance, 6);
    expect(plan.outer.minZ).toBeCloseTo(-standoffClearance - DEFAULT_ENCLOSURE_PARAMS.wallThickness, 6);
  });

  it('支柱恰好 4 根（底盤角孔），頂面對齊底盤底 17.5', () => {
    const parts = groundGroupInstances();
    const standoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize);
    expect(standoffs).toHaveLength(4);
    for (const s of standoffs) expect(s.topZ).toBeCloseTo(17.5, 6);
  });

  it('內腔頂高過輪頂（65＋clearanceMargin）且角柱無碰撞旗標', () => {
    const parts = groundGroupInstances();
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    expect(plan.inner.maxZ).toBeCloseTo(65 + DEFAULT_ENCLOSURE_PARAMS.clearanceMargin, 6);
    const posts = planCornerPosts(plan, DEFAULT_ENCLOSURE_PARAMS.screwSize, parts);
    expect(posts.every((p) => !p.collided)).toBe(true);
  });
});
