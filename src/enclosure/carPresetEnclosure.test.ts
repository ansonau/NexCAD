import { describe, expect, it } from 'vitest';
import { getPartDefinition } from '../parts/library';
import { SMART_CAR_2WD, buildCarNodes } from '../parts/presets';
import type { PartNode } from '../types/document';
import { DEFAULT_ENCLOSURE_PARAMS, planCornerPosts, planShell, planStandoffs } from './plan';
import type { PartInstance } from './plan';

/** 2WD 貼地結構組（defaultSelection）的 PartInstance 列表 */
function groundGroupInstances(): PartInstance[] {
  const { nodes, defaultSelection } = buildCarNodes(SMART_CAR_2WD, 'en');
  return nodes
    .filter((n): n is PartNode => n.type === 'part' && defaultSelection.includes(n.id))
    .map((n) => ({ def: getPartDefinition(n.partId)!, transform: n.transform }));
}

describe('智能小車貼地組的外殼整合（design.md D10）', () => {
  it('地板貼地：outer.minZ＝−wallThickness、inner.minZ＝0', () => {
    const plan = planShell(groundGroupInstances(), DEFAULT_ENCLOSURE_PARAMS);
    expect(plan.outer.minZ).toBeCloseTo(-DEFAULT_ENCLOSURE_PARAMS.wallThickness, 6);
    expect(plan.inner.minZ).toBeCloseTo(0, 6);
  });

  it('支柱恰好 4 根（底盤角孔），頂面對齊底盤底 17.5；standoff:false 孔被跳過', () => {
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