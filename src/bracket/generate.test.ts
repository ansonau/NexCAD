import { beforeAll, describe, expect, it } from 'vitest';
import { createBracketNode, createPartNode } from '../types/document';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { registerPartDefinition } from '../parts/library';
import type { PartDefinition } from '../parts/schema';
import { DEFAULT_BRACKET_PARAMS } from './plan';
import { buildBracketNodeSolid } from './generate';

const kernel = new ManifoldKernel();

const boardDef: PartDefinition = {
  id: 'test-board',
  name: 'Test',
  nameZh: '測試板',
  category: 'board',
  body: { size: [40, 20, 2], blocks: [] },
  mountingHoles: [
    { x: -15, y: -5, diameter: 3 },
    { x: 15, y: 5, diameter: 3 },
  ],
  ports: [],
  clearanceHeight: 10,
};

beforeAll(async () => {
  await kernel.init();
  registerPartDefinition(boardDef);
});

function bracketFor(partId: string, params = DEFAULT_BRACKET_PARAMS) {
  const part = createPartNode(partId, 'Board');
  const node = createBracketNode(params, '支架', {
    sourceParts: [{ nodeId: part.id, partId: part.partId, transform: part.transform }],
  });
  return node;
}

describe('buildBracketNodeSolid', () => {
  it('無來源零件時回傳 null', () => {
    const node = createBracketNode(DEFAULT_BRACKET_PARAMS, '支架');
    expect(buildBracketNodeSolid(node, kernel)).toBeNull();
  });

  it('screw 模式產生實體且體積大於 0', () => {
    const solid = buildBracketNodeSolid(bracketFor('test-board'), kernel);
    expect(solid).not.toBeNull();
    expect(kernel.volume(solid!)).toBeGreaterThan(0);
  });

  it('peg 模式產生實體且體積大於 0', () => {
    const solid = buildBracketNodeSolid(
      bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, mountingStyle: 'peg' }),
      kernel,
    );
    expect(solid).not.toBeNull();
    expect(kernel.volume(solid!)).toBeGreaterThan(0);
  });

  it('hole 模式產生實體且體積大於 0', () => {
    const solid = buildBracketNodeSolid(
      bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, mountingStyle: 'hole' }),
      kernel,
    );
    expect(solid).not.toBeNull();
    expect(kernel.volume(solid!)).toBeGreaterThan(0);
  });

  it('peg 模式體積大於 hole 模式（peg 長實心柱，hole 只貫穿孔）', () => {
    const peg = buildBracketNodeSolid(
      bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, mountingStyle: 'peg' }),
      kernel,
    );
    const hole = buildBracketNodeSolid(
      bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, mountingStyle: 'hole' }),
      kernel,
    );
    expect(kernel.volume(peg!)).toBeGreaterThan(kernel.volume(hole!));
  });
});
