import { describe, expect, it } from 'vitest';
import { createBracketNode, createCarAnchorNode, createPartNode, createPrimitive, emptyDocument, identityTransform, newId } from '../types/document';
import type { CarConfigParams } from '../parts/presets';
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

  it('序列化後解析回相同文件（含 car-anchor 節點）', () => {
    const config: CarConfigParams = {
      shape: 'rounded-rect',
      length: 270,
      width: 185,
      thickness: 3,
      drive: '2wd',
      wheelSize: 65,
      includeCaster: true,
    };
    const doc = emptyDocument('測試小車錨點');
    doc.nodes = [createCarAnchorNode(config, 'smart-car-2wd', ['n1'], { generatedNodeIds: ['n2'] })];
    expect(parseNexcadFile(serializeNexcadFile(doc))).toEqual(doc);
  });

  it('序列化後解析回相同文件（含 bracket 節點）', () => {
    const doc = emptyDocument('測試支架');
    doc.nodes = [
      createPartNode('arduino-uno', 'Uno'),
      createBracketNode(
        { baseThickness: 3, baseMargin: 4, cornerRadius: 2, screwSize: 'M3', mountingStyle: 'peg', baseHoles: false },
        '支架',
        { sourceParts: [{ nodeId: 'n1', partId: 'arduino-uno', transform: identityTransform() }] },
      ),
    ];
    const parsed = parseNexcadFile(serializeNexcadFile(doc));
    expect(parsed).toEqual(doc);
  });

  it('舊版 bracket params 無選填欄位時仍可正常解析', () => {
    const doc = emptyDocument('舊檔');
    doc.nodes = [
      createBracketNode({ baseThickness: 3, baseMargin: 3, cornerRadius: 3, screwSize: 'M3' }, '支架', {
        sourceParts: [],
      }),
    ];
    const json = JSON.parse(serializeNexcadFile(doc));
    delete json.nodes[0].params.mountingStyle;
    delete json.nodes[0].params.baseHoles;
    const parsed = parseNexcadFile(JSON.stringify(json));
    const node = parsed.nodes[0];
    expect(node.type === 'bracket' ? node.params.mountingStyle : 'not-bracket').toBeUndefined();
    expect(node.type === 'bracket' ? node.params.baseHoles : 'not-bracket').toBeUndefined();
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

  it('舊版 enclosure params 無 screwEntry 時仍可正常解析', () => {
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
    delete json.nodes[0].params.screwEntry; // 模擬舊檔（本來就沒有此欄位）
    expect(() => parseNexcadFile(JSON.stringify(json))).not.toThrow();
    const parsed = parseNexcadFile(JSON.stringify(json));
    const node = parsed.nodes[0];
    expect(node.type === 'enclosure' ? node.params.screwEntry : 'not-enclosure').toBeUndefined();
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

  it('mountingStyle: "hole" 可正常序列化/解析（zod enum 擴充後的回歸）', () => {
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
        mountingStyle: 'hole',
      },
      sourceParts: [],
    };
    doc.nodes = [enclosure];
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
