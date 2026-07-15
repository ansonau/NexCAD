import { describe, expect, it } from 'vitest';
import { createPartNode, createPrimitive, emptyDocument, identityTransform, newId } from '../types/document';
import type { EnclosureNode, GroupNode } from '../types/document';
import { parseNexcadFile, serializeNexcadFile } from './nexcadFile';

describe('nexcadFile', () => {
  it('序列化後解析回相同文件（含 primitive/part/巢狀 group）', () => {
    const doc = emptyDocument('測試');
    const group: GroupNode = {
      type: 'group',
      id: newId(),
      name: 'g',
      role: 'solid',
      transform: identityTransform(),
      visible: true,
      locked: false,
      children: [createPrimitive('cylinder', { role: 'hole' })],
    };
    doc.nodes = [createPrimitive('box'), createPartNode('arduino-uno', 'Uno'), group];
    const parsed = parseNexcadFile(serializeNexcadFile(doc));
    expect(parsed).toEqual(doc);
  });

  it('序列化後解析回相同文件（含 enclosure 節點）', () => {
    const doc = emptyDocument('測試外殼');
    const enclosure: EnclosureNode = {
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
      },
      sourceParts: [{ nodeId: newId(), partId: 'arduino-uno', transform: identityTransform() }],
    };
    doc.nodes = [createPartNode('arduino-uno', 'Uno'), enclosure];
    const parsed = parseNexcadFile(serializeNexcadFile(doc));
    expect(parsed).toEqual(doc);
  });

  it('拒絕非 JSON', () => {
    expect(() => parseNexcadFile('not json')).toThrow();
  });

  it('拒絕錯誤版本', () => {
    const doc = { ...emptyDocument(), version: 2 };
    expect(() => parseNexcadFile(JSON.stringify(doc))).toThrow();
  });

  it('拒絕缺欄位的節點', () => {
    const bad = { version: 1, name: 'x', units: 'mm', nodes: [{ type: 'primitive' }] };
    expect(() => parseNexcadFile(JSON.stringify(bad))).toThrow();
  });
});
