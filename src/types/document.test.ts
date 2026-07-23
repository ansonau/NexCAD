import { describe, expect, it } from 'vitest';
import { createCarAnchorNode, createPartNode, createPrimitive, emptyDocument, identityTransform, newId } from './document';
import type { CarConfigParams } from '../parts/presets';

describe('document model', () => {
  it('createPrimitive 套用該形狀的預設參數', () => {
    const box = createPrimitive('box');
    expect(box.type).toBe('primitive');
    expect(box.kind).toBe('box');
    expect(box.role).toBe('solid');
    expect(box.params).toEqual({ width: 20, depth: 20, height: 20 });
    expect(box.transform).toEqual(identityTransform());
    expect(box.visible).toBe(true);
  });

  it('每個節點有唯一 id', () => {
    const a = createPrimitive('box');
    const b = createPrimitive('box');
    expect(a.id).not.toBe(b.id);
  });

  it('createPrimitive 可覆寫欄位', () => {
    const hole = createPrimitive('cylinder', { role: 'hole', name: '螺絲孔' });
    expect(hole.role).toBe('hole');
    expect(hole.name).toBe('螺絲孔');
    expect(hole.params).toEqual({ radius: 10, height: 20 });
  });

  it('emptyDocument 是 mm 單位的空文件', () => {
    const doc = emptyDocument();
    expect(doc).toEqual({ version: 1, name: '未命名專案', units: 'mm', nodes: [] });
  });

  it('newId 使用 UUID 格式且大量生成不重複', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
    expect(newId()).toMatch(/^n_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('createPartNode 建立零件節點', () => {
    const node = createPartNode('arduino-uno', 'Arduino Uno R3');
    expect(node.type).toBe('part');
    expect(node.partId).toBe('arduino-uno');
    expect(node.role).toBe('solid');
    expect(node.transform).toEqual(identityTransform());
  });

  it('createCarAnchorNode 建立錨點節點', () => {
    const config: CarConfigParams = { shape: 'rounded-rect', length: 270, width: 185, thickness: 3, drive: '2wd', wheelSize: 65, includeCaster: true };
    const anchor = createCarAnchorNode(config, 'smart-car-2wd', ['n1', 'n2']);
    expect(anchor.type).toBe('car-anchor');
    expect(anchor.config.length).toBe(270);
    expect(anchor.presetId).toBe('smart-car-2wd');
    expect(anchor.electronicsIds).toEqual(['n1', 'n2']);
    expect(anchor.role).toBe('solid');
    expect(anchor.transform).toEqual(identityTransform());
    expect(anchor.visible).toBe(true);
    expect(anchor.locked).toBe(false);
  });

  it('EnclosureNode 是合法的 SceneNode', () => {
    const node: import('./document').EnclosureNode = {
      type: 'enclosure',
      id: newId(),
      name: '外殼底座',
      role: 'solid',
      transform: identityTransform(),
      visible: true,
      locked: false,
      part: 'base',
      params: {
        wallThickness: 2,
        clearanceMargin: 3,
        cornerRadius: 3,
        lidType: 'screw',
        screwSize: 'M3',
        standoffWallPadding: 2,
      },
      sourceParts: [],
    };
    expect(node.type).toBe('enclosure');
  });
});
