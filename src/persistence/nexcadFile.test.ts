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
        standoffWallPadding: 2,
      },
      sourceParts: [{ nodeId: newId(), partId: 'arduino-uno', transform: identityTransform() }],
    };
    doc.nodes = [createPartNode('arduino-uno', 'Uno'), enclosure];
    const parsed = parseNexcadFile(serializeNexcadFile(doc));
    expect(parsed).toEqual(doc);
  });

  it('舊版 enclosure params 無 standoffWallPadding 時以 wallThickness 補上', () => {
    const doc = emptyDocument('舊檔');
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
        wallThickness: 2.5,
        clearanceMargin: 3,
        cornerRadius: 3,
        lidType: 'screw',
        screwSize: 'M3',
        standoffWallPadding: 2.5,
      },
      sourceParts: [],
    };
    doc.nodes = [enclosure];
    const json = JSON.parse(serializeNexcadFile(doc));
    delete json.nodes[0].params.standoffWallPadding; // 模擬舊檔
    const parsed = parseNexcadFile(JSON.stringify(json));
    const node = parsed.nodes[0];
    expect(node.type === 'enclosure' ? node.params.standoffWallPadding : NaN).toBe(2.5);
  });

  it('舊版 enclosure params 無 reserveCornerSpace 時仍可正常解析', () => {
    const doc = emptyDocument('舊檔');
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
        wallThickness: 2.5,
        clearanceMargin: 3,
        cornerRadius: 3,
        lidType: 'screw',
        screwSize: 'M3',
        standoffWallPadding: 2.5,
      },
      sourceParts: [],
    };
    doc.nodes = [enclosure];
    const json = JSON.parse(serializeNexcadFile(doc));
    delete json.nodes[0].params.reserveCornerSpace; // 模擬舊檔（本來就沒有此欄位）
    expect(() => parseNexcadFile(JSON.stringify(json))).not.toThrow();
    const parsed = parseNexcadFile(JSON.stringify(json));
    const node = parsed.nodes[0];
    expect(node.type === 'enclosure' ? node.params.reserveCornerSpace : 'not-enclosure').toBeUndefined();
  });

  it('舊版 enclosure params 無 mountingStyle 時仍可正常解析', () => {
    const doc = emptyDocument('舊檔');
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
        wallThickness: 2.5,
        clearanceMargin: 3,
        cornerRadius: 3,
        lidType: 'screw',
        screwSize: 'M3',
        standoffWallPadding: 2.5,
      },
      sourceParts: [],
    };
    doc.nodes = [enclosure];
    const json = JSON.parse(serializeNexcadFile(doc));
    delete json.nodes[0].params.mountingStyle; // 模擬舊檔（本來就沒有此欄位）
    expect(() => parseNexcadFile(JSON.stringify(json))).not.toThrow();
    const parsed = parseNexcadFile(JSON.stringify(json));
    const node = parsed.nodes[0];
    expect(node.type === 'enclosure' ? node.params.mountingStyle : 'not-enclosure').toBeUndefined();
  });

  it('舊版 enclosure params 無 screwLidProfile 時仍可正常解析', () => {
    const doc = emptyDocument('舊檔');
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
        wallThickness: 2.5,
        clearanceMargin: 3,
        cornerRadius: 3,
        lidType: 'screw',
        screwSize: 'M3',
        standoffWallPadding: 2.5,
      },
      sourceParts: [],
    };
    doc.nodes = [enclosure];
    const json = JSON.parse(serializeNexcadFile(doc));
    delete json.nodes[0].params.screwLidProfile; // 模擬舊檔（本來就沒有此欄位）
    expect(() => parseNexcadFile(JSON.stringify(json))).not.toThrow();
    const parsed = parseNexcadFile(JSON.stringify(json));
    const node = parsed.nodes[0];
    expect(node.type === 'enclosure' ? node.params.screwLidProfile : 'not-enclosure').toBeUndefined();
  });

  it('舊版 enclosure params 無 lidDisplayCutout 時仍可正常解析', () => {
    const doc = emptyDocument('舊檔');
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
        wallThickness: 2.5,
        clearanceMargin: 3,
        cornerRadius: 3,
        lidType: 'screw',
        screwSize: 'M3',
        standoffWallPadding: 2.5,
      },
      sourceParts: [],
    };
    doc.nodes = [enclosure];
    const json = JSON.parse(serializeNexcadFile(doc));
    delete json.nodes[0].params.lidDisplayCutout; // 模擬舊檔（本來就沒有此欄位）
    expect(() => parseNexcadFile(JSON.stringify(json))).not.toThrow();
    const parsed = parseNexcadFile(JSON.stringify(json));
    const node = parsed.nodes[0];
    expect(node.type === 'enclosure' ? node.params.lidDisplayCutout : 'not-enclosure').toBeUndefined();
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
