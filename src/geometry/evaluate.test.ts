import { beforeAll, describe, expect, it } from 'vitest';
import { createPartNode, createPrimitive, identityTransform, newId } from '../types/document';
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

  it('只有 hole 的文件：export 回傳 null，render 仍顯示 hole 形狀', () => {
    const out = evaluateForRender([drillHole()], kernel);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('hole');
    expect(evaluateForExport([drillHole()], kernel)).toBeNull();
  });

  it('空文件回傳 null', () => {
    expect(evaluateForExport([], kernel)).toBeNull();
  });

  it('part 節點可求值（體積 > 0）', () => {
    const node = createPartNode('breadboard-half', 'bb');
    const solid = evaluateForExport([node], kernel);
    expect(solid).not.toBeNull();
    expect(kernel.volume(solid!)).toBeGreaterThan(30000);
  });

  it('未知 partId 的節點被略過而非拋錯', () => {
    const ghost = createPartNode('does-not-exist', 'ghost');
    expect(evaluateForExport([ghost], kernel)).toBeNull();
    const withPlate = evaluateForExport([plate(), ghost], kernel);
    expect(kernel.volume(withPlate!)).toBeCloseTo(800, 3);
  });
});
