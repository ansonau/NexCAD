import { beforeAll, describe, expect, it } from 'vitest';
import { createBracketNode, createPartNode } from '../types/document';
import type { Transform } from '../types/document';
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

const ledDef: PartDefinition = {
  id: 'test-led',
  name: 'Test LED',
  nameZh: '測試 LED',
  category: 'component',
  body: { size: [5.8, 5.8, 1], blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [5, 5, 7.6] }] },
  mountingHoles: [],
  ports: [],
  clearanceHeight: 8.6,
};

beforeAll(async () => {
  await kernel.init();
  registerPartDefinition(boardDef);
  registerPartDefinition(ledDef);
});

function bracketFor(partId: string, params = DEFAULT_BRACKET_PARAMS, rotation: [number, number, number] = [0, 0, 0]) {
  const part = createPartNode(partId, 'Board');
  part.transform.rotation = rotation;
  const node = createBracketNode(params, '支架', {
    sourceParts: [{ nodeId: part.id, partId: part.partId, transform: part.transform }],
  });
  return node;
}

function volumeOf(node: ReturnType<typeof bracketFor>): number {
  const solid = buildBracketNodeSolid(node, kernel);
  expect(solid).not.toBeNull();
  return kernel.volume(solid!);
}

describe('buildBracketNodeSolid', () => {
  it('無來源零件時回傳 null', () => {
    const node = createBracketNode(DEFAULT_BRACKET_PARAMS, '支架');
    expect(buildBracketNodeSolid(node, kernel)).toBeNull();
  });

  it('screw 模式產生實體且體積大於 0', () => {
    expect(volumeOf(bracketFor('test-board'))).toBeGreaterThan(0);
  });

  it('peg 模式產生實體且體積大於 0', () => {
    expect(
      volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, mountingStyle: 'peg' })),
    ).toBeGreaterThan(0);
  });

  it('hole 模式產生實體且體積大於 0', () => {
    expect(
      volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, mountingStyle: 'hole' })),
    ).toBeGreaterThan(0);
  });

  it('peg 模式體積大於 hole 模式（peg 長實心柱，hole 只貫穿孔）', () => {
    const peg = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, mountingStyle: 'peg' }));
    const hole = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, mountingStyle: 'hole' }));
    expect(peg).toBeGreaterThan(hole);
  });

  it('繞 Z 軸旋轉 90° 後支架體積不變（底座隨零件旋轉）', () => {
    const flat = volumeOf(bracketFor('test-board'));
    const rotated = volumeOf(bracketFor('test-board', DEFAULT_BRACKET_PARAMS, [0, 0, 90]));
    expect(Math.abs(rotated - flat) / flat).toBeLessThan(1e-6);
  });

  it('繞 X 軸旋轉 90°（零件立起）後支架體積不變', () => {
    const flat = volumeOf(bracketFor('test-board'));
    const tilted = volumeOf(bracketFor('test-board', DEFAULT_BRACKET_PARAMS, [90, 0, 0]));
    expect(Math.abs(tilted - flat) / flat).toBeLessThan(1e-6);
  });

  it('多個來源零件各自生成支架並 union', () => {
    const a = createPartNode('test-board', 'A');
    const b = createPartNode('test-board', 'B');
    b.transform.position = [100, 0, 0];
    const node = createBracketNode(DEFAULT_BRACKET_PARAMS, '支架', {
      sourceParts: [
        { nodeId: a.id, partId: a.partId, transform: a.transform },
        { nodeId: b.id, partId: b.partId, transform: b.transform },
      ],
    });
    const solid = buildBracketNodeSolid(node, kernel);
    expect(solid).not.toBeNull();
    expect(kernel.volume(solid!)).toBeGreaterThan(volumeOf(bracketFor('test-board')));
  });

  it('擋牆增加支架體積', () => {
    const noWall = volumeOf(bracketFor('test-board'));
    const withWall = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, wallHeight: 5 }));
    expect(withWall).toBeGreaterThan(noWall);
  });

  it('無安裝孔的零件 + 擋牆可產生固定實體（體積大於純底座）', () => {
    const bareBase = volumeOf(bracketFor('test-led'));
    const withWall = volumeOf(bracketFor('test-led', { ...DEFAULT_BRACKET_PARAMS, wallHeight: 5 }));
    expect(bareBase).toBeGreaterThan(0);
    expect(withWall).toBeGreaterThan(bareBase);
  });

  it('L 型支架產生實體且體積大於 0', () => {
    expect(volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'l' }))).toBeGreaterThan(0);
  });

  it('U 型支架產生實體且體積大於 0', () => {
    expect(volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'u' }))).toBeGreaterThan(0);
  });

  it('L 型支架繞 Z 軸旋轉 90° 後體積不變', () => {
    const flat = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'l' }));
    const rotated = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'l' }, [0, 0, 90]));
    expect(Math.abs(rotated - flat) / flat).toBeLessThan(1e-6);
  });

  it('U 型支架繞 Z 軸旋轉 90° 後體積不變', () => {
    const flat = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'u' }));
    const rotated = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'u' }, [0, 0, 90]));
    expect(Math.abs(rotated - flat) / flat).toBeLessThan(1e-6);
  });

  it('L 型支架繞 X 軸旋轉 90°（零件立起）後體積不變', () => {
    const flat = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'l' }));
    const tilted = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'l' }, [90, 0, 0]));
    expect(Math.abs(tilted - flat) / flat).toBeLessThan(1e-6);
  });

  it('沉頭鎖附孔會移除頂面材料（體積略小於非沉頭）', () => {
    const plain = volumeOf(bracketFor('test-board'));
    const cs = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, baseHoleCountersink: true }));
    expect(cs).toBeLessThan(plain);
  });

  it('wallDepth 收窄 U 型側牆後體積變小', () => {
    const full = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'u' }));
    const narrow = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'u', wallDepth: 1 }));
    expect(narrow).toBeLessThan(full);
  });

  it('L 型底座雙向延伸比單向體積大', () => {
    const back = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'l', baseDirection: 'back' }));
    const both = volumeOf(bracketFor('test-board', { ...DEFAULT_BRACKET_PARAMS, style: 'l', baseDirection: 'both' }));
    expect(both).toBeGreaterThan(back);
  });

  it('liveParts 讓支架跟隨零件即時位置', () => {
    const part = createPartNode('test-board', 'Board');
    const node = createBracketNode(DEFAULT_BRACKET_PARAMS, 'b', {
      sourceParts: [{ nodeId: part.id, partId: part.partId, transform: part.transform }],
    });
    const liveParts = new Map([[part.id, { position: [100, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } as Transform]]);
    const solid = buildBracketNodeSolid(node, kernel, liveParts)!;
    const mesh = kernel.toMesh(solid);
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      minX = Math.min(minX, mesh.positions[i]);
      maxX = Math.max(maxX, mesh.positions[i]);
    }
    // 支架應位於 x≈100（寬約 52），而非原點附近
    expect(minX).toBeGreaterThan(60);
    expect(maxX).toBeLessThan(140);
  });
});
