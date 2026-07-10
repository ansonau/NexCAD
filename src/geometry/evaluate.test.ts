import { beforeAll, describe, expect, it } from 'vitest';
import { createPrimitive, identityTransform, newId } from '../types/document';
import type { GroupNode } from '../types/document';
import { evaluateForExport, evaluateForRender } from './evaluate';
import { ManifoldKernel } from './manifoldKernel';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

function plate() {
  return createPrimitive('box', { params: { width: 20, depth: 20, height: 2 } });
}

function drillHole() {
  const h = createPrimitive('cylinder', {
    role: 'hole',
    params: { radius: 5, height: 10 },
  });
  h.transform.position = [0, 0, -1];
  return h;
}

describe('evaluate', () => {
  it('hole 從同層 solid 減料（export 路徑）', () => {
    const solid = evaluateForExport([plate(), drillHole()], kernel);
    expect(solid).not.toBeNull();
    const v = kernel.volume(solid!);
    expect(v).toBeGreaterThan(642);
    expect(v).toBeLessThan(648);
  });

  it('render 路徑：solid 被減料，hole 顯示自身形狀', () => {
    const nodes = [plate(), drillHole()];
    const out = evaluateForRender(nodes, kernel);
    expect(out).toHaveLength(2);
    const roles = out.map((e) => e.role).sort();
    expect(roles).toEqual(['hole', 'solid']);
    for (const e of out) expect(e.mesh.indices.length).toBeGreaterThan(0);
  });

  it('隱藏節點不參與求值', () => {
    const hidden = drillHole();
    hidden.visible = false;
    const solid = evaluateForExport([plate(), hidden], kernel);
    expect(kernel.volume(solid!)).toBeCloseTo(800, 3);
  });

  it('群組內部先結算，群組 transform 再套用', () => {
    const group: GroupNode = {
      type: 'group',
      id: newId(),
      name: 'g',
      role: 'solid',
      transform: { ...identityTransform(), position: [10, 0, 0] },
      visible: true,
      locked: false,
      children: [plate(), drillHole()],
    };
    const solid = evaluateForExport([group], kernel);
    const v = kernel.volume(solid!);
    expect(v).toBeGreaterThan(642);
    expect(v).toBeLessThan(648);
  });

  it('空文件回傳 null', () => {
    expect(evaluateForExport([], kernel)).toBeNull();
  });
});
