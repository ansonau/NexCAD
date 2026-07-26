# Smart Car 兩階段生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split smart car generation into two phases — Phase 1 places electronics + anchor, Phase 2 generates chassis + wheels from adjusted positions.

**Architecture:** Add `CarAnchorNode` type. Refactor `presets.ts` into two builder functions. Add Phase 2 UI in PropertyCard. Render anchor preview in Viewport. All geometry/exports/boolean logic unchanged.

**Tech Stack:** TypeScript, React, Three.js (@react-three/fiber/drei), zustand, zod, vitest

## Global Constraints

- `CarAnchorNode` uses `NodeCommon` fields (role, transform, visible, locked)
- Electronics restricted to Z-axis rotation only (no X/Y rotation enforcement via UI, not model)
- Anchor transforms used for hole-localization — Z rotation only (anchor can also translate)
- All existing 262 tests must pass; new tests added for new functions
- No new npm dependencies
- i18n keys use existing `car.*` prefix

---

### Task 1: Add `CarAnchorNode` type and factory helper

**Files:**
- Modify: `src/types/document.ts:80` (SceneNode union), `src/types/document.ts:110-148` (new factory)
- Test: `src/types/document.test.ts` (new test block)

**Interfaces:**
- Consumes: `CarConfigParams` from `src/parts/presets.ts`
- Produces: `CarAnchorNode` type and `createCarAnchorNode()` factory

- [ ] **Step 1: Add CarAnchorNode interface**

```ts
// src/types/document.ts — after EnclosureNode block (line ~78)
import type { CarConfigParams } from '../parts/presets';

export interface CarAnchorNode extends NodeCommon {
  type: 'car-anchor';
  config: CarConfigParams;
  presetId: 'smart-car-2wd' | 'smart-car-4wd';
  electronicsIds: string[];
  generatedNodeIds?: string[];
}
```

- [ ] **Step 2: Update SceneNode union** (line 80)

```ts
export type SceneNode = PrimitiveNode | GroupNode | PartNode | EnclosureNode | CarAnchorNode;
```

- [ ] **Step 3: Add factory function** after `createPartNode` (line ~130)

```ts
export function createCarAnchorNode(
  config: CarConfigParams,
  presetId: 'smart-car-2wd' | 'smart-car-4wd',
  electronicsIds: string[],
  overrides: Partial<Omit<CarAnchorNode, 'type' | 'config' | 'presetId' | 'electronicsIds'>> = {},
): CarAnchorNode {
  return {
    type: 'car-anchor',
    id: newId(),
    name: '小車錨點',
    role: 'solid',
    transform: identityTransform(),
    visible: true,
    locked: false,
    config,
    presetId,
    electronicsIds,
    ...overrides,
  };
}
```

- [ ] **Step 4: Add test for CarAnchorNode**

```ts
// src/types/document.test.ts — new test block
it('createCarAnchorNode 建立錨點節點', () => {
  const config: CarConfigParams = { shape: 'rounded-rect', length: 270, width: 185, thickness: 3, drive: '2wd', wheelSize: 65, includeCaster: true };
  const anchor = createCarAnchorNode(config, 'smart-car-2wd', ['n1', 'n2']);
  expect(anchor.type).toBe('car-anchor');
  expect(anchor.config.length).toBe(270);
  expect(anchor.presetId).toBe('smart-car-2wd');
  expect(anchor.electronicsIds).toEqual(['n1', 'n2']);
  expect(anchor.role).toBe('solid');
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/types/document.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/document.ts src/types/document.test.ts
git commit -m "feat: add CarAnchorNode type and factory"
```

---

### Task 2: Add car-anchor persistence schema

**Files:**
- Modify: `src/persistence/nexcadFile.ts:74-76` (sceneNodeSchema union)
- Test: `src/persistence/nexcadFile.test.ts` (new test)

**Interfaces:**
- Consumes: `CarAnchorNode` from `document.ts`
- Produces: zod schema for car-anchor node

- [ ] **Step 1: Add car-anchor schema and update sceneNodeSchema union**

```ts
// src/persistence/nexcadFile.ts — add after enclosureNodeSchema (~line 72)
const carConfigSchema = z.object({
  shape: z.enum(['rounded-rect', 'rect', 'ellipse']),
  length: z.number(),
  width: z.number(),
  thickness: z.number(),
  drive: z.enum(['2wd', '4wd']),
  wheelSize: z.number(),
  includeCaster: z.boolean(),
});

const carAnchorNodeSchema = z.object({
  ...nodeCommonShape,
  type: z.literal('car-anchor'),
  config: carConfigSchema,
  presetId: z.enum(['smart-car-2wd', 'smart-car-4wd']),
  electronicsIds: z.array(z.string()),
  generatedNodeIds: z.array(z.string()).optional(),
});
```

- [ ] **Step 2: Update sceneNodeSchema union** (line ~74)

```ts
const sceneNodeSchema: z.ZodType<SceneNode> = z.lazy(() =>
  z.union([primitiveNodeSchema, partNodeSchema, groupNodeSchema, enclosureNodeSchema, carAnchorNodeSchema]),
);
```

- [ ] **Step 3: Add test**

```ts
// src/persistence/nexcadFile.test.ts — new test block
it('序列化後解析回相同文件（含 car-anchor 節點）', () => {
  const doc = emptyDocument('測試錨點');
  const anchor: import('../types/document').CarAnchorNode = {
    type: 'car-anchor',
    id: newId(),
    name: '錨點',
    role: 'solid',
    transform: identityTransform(),
    visible: true,
    locked: false,
    config: { shape: 'rounded-rect', length: 270, width: 185, thickness: 3, drive: '2wd', wheelSize: 65, includeCaster: true },
    presetId: 'smart-car-2wd',
    electronicsIds: ['n1'],
  };
  doc.nodes = [anchor];
  const parsed = parseNexcadFile(serializeNexcadFile(doc));
  expect(parsed).toEqual(doc);
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/persistence/nexcadFile.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/persistence/nexcadFile.ts src/persistence/nexcadFile.test.ts
git commit -m "feat: add car-anchor persistence schema"
```

---

### Task 3: Refactor presets.ts — add Phase 1 builder and Phase 2 builder

**Files:**
- Modify: `src/parts/presets.ts` (add `buildCarAnchorAndElectronics`, `buildCarChassisAndGround`, `applyAnchorTransform`, `inverseAnchorTransform`)
- Modify: `src/parts/presets.test.ts` (update existing tests, add new)
- Test: `src/parts/carChassis.test.ts` (verify chassis still valid)

**Interfaces:**
- Consumes: `CarConfigParams`, `CarPresetSpec`, `CarAnchorNode`, `SceneNode`, `PartNode`
- Produces: `buildCarAnchorAndElectronics(config, lang)` → `{ anchor, electronics, defaultSelection }`
- Produces: `buildCarChassisAndGround(anchor, sceneNodes, lang)` → `{ nodes, defaultSelection, warnings }`

- [ ] **Step 1: Add helper functions** in presets.ts (after line ~243)

```ts
/** 繞 Z 軸旋轉點（2D rotation） */
function rotateZ(p: [number, number, number], rotZ: number): [number, number, number] {
  const rad = rotZ * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

/** 把 world 座標點變換到錨點本體座標系（2D: 只用 Z 旋轉 + 平移） */
function toAnchorLocal(anchor: CarAnchorNode, worldPt: [number, number, number]): [number, number, number] {
  const [px, py, pz] = anchor.transform.position;
  const translated: [number, number, number] = [worldPt[0] - px, worldPt[1] - py, worldPt[2] - pz];
  return rotateZ(translated, -anchor.transform.rotation[2]);
}

/** 把錨點本體座標系點變換到世界座標 */
function toWorld(anchor: CarAnchorNode, localPt: [number, number, number]): [number, number, number] {
  const [px, py, pz] = anchor.transform.position;
  const rotated = rotateZ(localPt, anchor.transform.rotation[2]);
  return [rotated[0] + px, rotated[1] + py, rotated[2] + pz];
}
```

- [ ] **Step 2: Implement `buildCarAnchorAndElectronics`**

```ts
// src/parts/presets.ts — add after buildCarNodes (~line 296)
export function buildCarAnchorAndElectronics(
  config: CarConfigParams,
  lang: string,
): { anchor: CarAnchorNode; electronics: PartNode[]; defaultSelection: string[] } {
  const spec = config.drive === '2wd' ? SMART_CAR_2WD : SMART_CAR_4WD;
  const cx = chassisCenterX(config.length);
  const cy = 0;

  const adaptedElectronics = adaptElectronicsLayout(spec.electronics, config);

  const electronics: PartNode[] = adaptedElectronics.map(({ partId, x, y, z, rotZ }) =>
    createPartNode(partId, partName(partId, lang), {
      transform: { position: [x, y, z], rotation: [0, 0, rotZ], scale: [1, 1, 1] },
    }),
  );

  const chassisZ = CHASSIS_TOP_Z - config.thickness;
  const anchor = createCarAnchorNode(config, spec.id, electronics.map((e) => e.id), {
    transform: { position: [cx, cy, chassisZ], rotation: [0, 0, 0], scale: [1, 1, 1] },
    name: lang === 'zh' ? '小車錨點' : 'Car Anchor',
  });

  return { anchor, electronics, defaultSelection: [anchor.id] };
}
```

- [ ] **Step 3: Implement `buildCarChassisAndGround`**

```ts
// src/parts/presets.ts — add after buildCarAnchorAndElectronics
const CANONICAL_CHASSIS_LENGTH = 270;
const CANONICAL_CHASSIS_CENTER_X = chassisCenterX(CANONICAL_CHASSIS_LENGTH);

export function buildCarChassisAndGround(
  anchor: CarAnchorNode,
  sceneNodes: SceneNode[],
  lang: string,
): { nodes: SceneNode[]; defaultSelection: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const spec = anchor.presetId === 'smart-car-2wd' ? SMART_CAR_2WD : SMART_CAR_4WD;
  const { length, width, thickness, shape, includeCaster } = anchor.config;
  const cornerRadius = computeCornerRadius(shape, length, width);

  // 讀取電子零件實際位置，計算安裝孔
  const electronicsHoles: MountingHole[] = [];
  const idSet = new Set(anchor.electronicsIds);
  for (const n of sceneNodes) {
    if (!idSet.has(n.id) || n.type !== 'part' || !n.visible) continue;
    const def = getPartDefinition(n.partId);
    if (!def) continue;
    for (const hole of def.mountingHoles) {
      // 安裝孔在世界座標
      const worldPt = rotateZ([hole.x, hole.y, 0], n.transform.rotation[2]);
      worldPt[0] += n.transform.position[0];
      worldPt[1] += n.transform.position[1];
      worldPt[2] += n.transform.position[2];
      // 轉到錨點本體
      const local = toAnchorLocal(anchor, worldPt);
      // 檢查是否超出底盤範圍
      const halfL = length / 2;
      const halfW = width / 2;
      if (Math.abs(local[0]) > halfL || Math.abs(local[1]) > halfW) {
        warnings.push(`孔位 (${local[0].toFixed(1)}, ${local[1].toFixed(1)}) 超出底盤範圍`);
      }
      electronicsHoles.push({ x: local[0], y: local[1], diameter: hole.diameter, standoff: false });
    }
  }
  if (warnings.length > 0) {
    return { nodes: [], defaultSelection: [], warnings };
  }

  // 底盤角落孔
  const halfL = length / 2;
  const halfW = width / 2;
  const cornerHoles: MountingHole[] = [
    { x: -(halfL - 10), y: -(halfW - 10), diameter: 3 },
    { x: -(halfL - 10), y: halfW - 10, diameter: 3 },
    { x: halfL - 10, y: -(halfW - 10), diameter: 3 },
    { x: halfL - 10, y: halfW - 10, diameter: 3 },
  ];

  // 產生底盤 PartDefinition
  const chassisDef: PartDefinition = {
    id: CHASSIS_DYNAMIC_PART_ID,
    name: 'Car Chassis',
    nameZh: '小車底盤',
    category: 'component',
    body: { size: [length, width, thickness], cornerRadius, blocks: [] },
    mountingHoles: [...cornerHoles, ...electronicsHoles],
    ports: [],
    clearanceHeight: thickness,
  };
  registerPartDefinition(chassisDef);

  // 底盤節點（transform = 錨點 transform）
  const chassis = createPartNode(CHASSIS_DYNAMIC_PART_ID, partNameDynamicChassis(anchor.config, lang), {
    transform: { ...anchor.transform },
  });

  // 車輪
  const scale = length / CANONICAL_CHASSIS_LENGTH;
  const wheels = (spec.wheels ?? []).map((w) => {
    const localOffsetX = (w.x - CANONICAL_CHASSIS_CENTER_X) * scale;
    const [wx, wy] = toWorld(anchor, [localOffsetX, w.y, 0]);
    return createPartNode(w.partId, partName(w.partId, lang), {
      transform: { position: [wx, wy, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    });
  });

  // 萬向輪（2WD 且 includeCaster）
  const casterNodes: PartNode[] = [];
  if (spec.caster && includeCaster) {
    const localOffsetX = (spec.caster.x - CANONICAL_CHASSIS_CENTER_X) * scale;
    const [cx, cy] = toWorld(anchor, [localOffsetX, spec.caster.y, 0]);
    casterNodes.push(
      createPartNode(spec.caster.partId, partName(spec.caster.partId, lang), {
        transform: { position: [cx, cy, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      }),
    );
  }

  const nodes: SceneNode[] = [chassis, ...wheels, ...casterNodes];
  return {
    nodes,
    defaultSelection: [chassis.id, ...wheels.map((n) => n.id), ...casterNodes.map((n) => n.id)],
    warnings,
  };
}
```

- [ ] **Step 4: Add test for Phase 1 builder**

```ts
// src/parts/presets.test.ts — new test block
describe('buildCarAnchorAndElectronics', () => {
  it('2WD 預設 config：回傳 1 錨點 + 6 電子零件，defaultSelection 只含錨點', () => {
    const { anchor, electronics, defaultSelection } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    expect(anchor.type).toBe('car-anchor');
    expect(anchor.config.length).toBe(270);
    expect(anchor.electronicsIds).toHaveLength(6);
    expect(electronics).toHaveLength(6);
    expect(electronics.filter((n) => n.partId === 'tt-motor')).toHaveLength(2);
    expect(defaultSelection).toEqual([anchor.id]);
  });

  it('4WD 預設 config：4 馬達，無萬向輪', () => {
    const config = { ...DEFAULT_CAR_CONFIG, drive: '4wd' };
    const { anchor, electronics } = buildCarAnchorAndElectronics(config, 'en');
    expect(electronics.filter((n) => n.partId === 'tt-motor')).toHaveLength(4);
    expect(anchor.electronicsIds).toHaveLength(7); // 4 motors + 3 others
  });

  it('custom length 350：錨點位置跟著變', () => {
    const config = { ...DEFAULT_CAR_CONFIG, length: 350 };
    const { anchor } = buildCarAnchorAndElectronics(config, 'en');
    const expectedCx = 105 + 27 - 175;
    expect(anchor.transform.position[0]).toBeCloseTo(expectedCx, 6);
  });
});
```

- [ ] **Step 5: Add test for Phase 2 builder**

```ts
// src/parts/presets.test.ts — new test block
describe('buildCarChassisAndGround', () => {
  it('生成底盤 + 2 輪 + 1 萬向輪 = 4 節點', () => {
    const { anchor, electronics } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    const result = buildCarChassisAndGround(anchor, electronics, 'en');
    expect(result.warnings).toEqual([]);
    expect(result.nodes).toHaveLength(4);
    const chassis = result.nodes.find((n) => n.type === 'part' && n.partId === 'car-chassis-dynamic')!;
    expect(chassis).toBeDefined();
    // chassis transform 應等於 anchor transform
    expect(chassis.transform.position).toEqual(anchor.transform.position);
    expect(chassis.transform.rotation).toEqual(anchor.transform.rotation);
  });

  it('4WD 生成底盤 + 4 輪 = 5 節點', () => {
    const config = { ...DEFAULT_CAR_CONFIG, drive: '4wd' };
    const { anchor, electronics } = buildCarAnchorAndElectronics(config, 'en');
    const result = buildCarChassisAndGround(anchor, electronics, 'en');
    expect(result.warnings).toEqual([]);
    expect(result.nodes).toHaveLength(5);
    expect(result.nodes.filter((n) => n.type === 'part' && n.partId === 'car-wheel')).toHaveLength(4);
  });

  it('孔位超出時回傳 warnings 且 nodes 為空', () => {
    const { anchor } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    // 把錨點縮小，讓原本孔位超出
    const smallConfig = { ...DEFAULT_CAR_CONFIG, length: 100, width: 80 };
    const smallAnchor = { ...anchor, config: smallConfig };
    // 電子零件仍在原始位置
    const { electronics } = buildCarAnchorAndElectronics(DEFAULT_CAR_CONFIG, 'en');
    const result = buildCarChassisAndGround(smallAnchor, electronics, 'en');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.nodes).toEqual([]);
  });
});
```

- [ ] **Step 6: Update existing `buildCarNodes` tests** — they should still pass since `buildCarNodes` is unchanged. But we need to import the new functions.

Add import to presets.test.ts:
```ts
import { ... buildCarAnchorAndElectronics, buildCarChassisAndGround, ... } from '../parts/presets';
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/parts/presets.test.ts`
Expected: PASS

- [ ] **Step 8: Run full test suite**

Run: `npm test`
Expected: all tests pass (262+new)

- [ ] **Step 9: Commit**

```bash
git add src/parts/presets.ts src/parts/presets.test.ts
git commit -m "feat: add Phase 1/2 car builders and mount hole computation"
```

---

### Task 4: Update CarConfigPanel for Phase 1

**Files:**
- Modify: `src/components/CarConfigPanel.tsx` (button label, generator call)
- Modify: `src/i18n/en.json` (car.generate → car.placeElectronics)
- Modify: `src/i18n/zh.json`

**Interfaces:**
- Consumes: `buildCarAnchorAndElectronics` from `presets.ts`, `useDocumentStore`

- [ ] **Step 1: Rewrite the generate handler**

```tsx
// src/components/CarConfigPanel.tsx — replace generate function (line ~27)
const generate = () => {
  const { anchor, electronics, defaultSelection } = buildCarAnchorAndElectronics(config, i18n.language);
  addNodes([anchor, ...electronics]);
  setSelection(defaultSelection);
  onClose();
};
```

- [ ] **Step 2: Update button label**

```tsx
// line 120
<PrimaryButton onClick={generate}>{t('car.placeElectronics')}</PrimaryButton>
```

- [ ] **Step 3: Update i18n files**

```json
// src/i18n/en.json — car section
"placeElectronics": "Place Electronics"

// src/i18n/zh.json — car section
"placeElectronics": "放置電子零件"
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/parts/presets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CarConfigPanel.tsx src/i18n/en.json src/i18n/zh.json
git commit -m "feat: update CarConfigPanel to Phase 1 (electronics only)"
```

---

### Task 5: Add i18n keys for Phase 2

**Files:**
- Modify: `src/i18n/en.json` (car section)
- Modify: `src/i18n/zh.json` (car section)

- [ ] **Step 1: Add i18n keys**

```json
// src/i18n/en.json — car section
"generateChassis": "Generate Chassis",
"regenerateChassis": "Regenerate Chassis",
"holeOutOfBounds": "Some electronics exceed the chassis bounds. Adjust the anchor size or part positions and try again."

// src/i18n/zh.json — car section
"generateChassis": "生成底盤",
"regenerateChassis": "重新生成底盤",
"holeOutOfBounds": "部分電子零件超出底盤範圍，請調整錨點大小或零件位置後再試。"
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/en.json src/i18n/zh.json
git commit -m "feat: add i18n keys for Phase 2 chassis generation"
```

---

### Task 6: Add car-anchor rendering in PropertyCard

**Files:**
- Modify: `src/components/PropertyCard.tsx` (add car-anchor section)
- Modify: `src/components/ToastStack.tsx` (no change needed — toastStore already used)

**Interfaces:**
- Consumes: `CarAnchorNode`, `useDocumentStore`, `useToastStore`, `buildCarChassisAndGround`

- [ ] **Step 1: Import CarAnchorNode and buildCarChassisAndGround**

```tsx
// src/components/PropertyCard.tsx — update imports
import type { CarAnchorNode, EnclosureNode, EnclosureParams, NexcadDocument, PrimitiveNode, SceneNode } from '../types/document';
import { buildCarChassisAndGround } from '../parts/presets';
import { useToastStore } from '../store/toastStore';
```

- [ ] **Step 2: Add car-anchor section after enclosure block** (after line ~63)

```tsx
{node.type === 'car-anchor' && <CarAnchorFields node={node} />}
```

- [ ] **Step 3: Implement CarAnchorFields component** (before the closing `</div>` of PropertyCard or after EnclosureParamFields)

```tsx
function CarAnchorFields({ node }: { node: CarAnchorNode }) {
  const { t, i18n } = useTranslation();
  const updateNode = useDocumentStore((s) => s.updateNode);
  const doc = useDocumentStore((s) => s.doc);
  const [generating, setGenerating] = useState(false);

  const setConfig = <K extends keyof CarConfigParams>(key: K, value: CarConfigParams[K]) => {
    updateNode(node.id, (n) => {
      if (n.type === 'car-anchor') n.config = { ...n.config, [key]: value };
    });
  };

  const handleGenerate = () => {
    setGenerating(true);
    try {
      const result = buildCarChassisAndGround(node, doc.nodes, i18n.language);
      if (result.warnings.length > 0) {
        useToastStore.getState().show(result.warnings.join('; '));
        return;
      }
      // 刪除舊節點（若存在）
      const store = useDocumentStore.getState();
      if (node.generatedNodeIds && node.generatedNodeIds.length > 0) {
        store.mutate('更新底盤', (d) => {
          d.nodes = d.nodes.filter((n) => !node.generatedNodeIds!.includes(n.id));
        });
      }
      // 加入新節點
      store.addNodes(result.nodes);
      // 更新錨點的 generatedNodeIds
      store.updateNode(node.id, (n) => {
        if (n.type === 'car-anchor') n.generatedNodeIds = result.nodes.map((n2) => n2.id);
      });
    } finally {
      setGenerating(false);
    }
  };

  const hasGenerated = node.generatedNodeIds && node.generatedNodeIds.length > 0;

  return (
    <>
      <div className="mb-3">
        <SectionLabel>{t('car.chassisShape')}</SectionLabel>
        <select
          className={fieldClass}
          value={node.config.shape}
          onChange={(e) => setConfig('shape', e.target.value as CarChassisShape)}
        >
          <option value="rounded-rect">{t('car.shapeRoundedRect')}</option>
          <option value="rect">{t('car.shapeRect')}</option>
          <option value="ellipse">{t('car.shapeEllipse')}</option>
        </select>
      </div>
      <div className="mb-3">
        <SectionLabel>{t('car.chassisDimensions')}</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          <StepperField label={t('car.length')} value={node.config.length} min={150} max={400} step={1} onChange={(v) => setConfig('length', v)} />
          <StepperField label={t('car.width')} value={node.config.width} min={120} max={300} step={1} onChange={(v) => setConfig('width', v)} />
          <StepperField label={t('car.thickness')} value={node.config.thickness} min={2} max={6} step={1} onChange={(v) => setConfig('thickness', v)} />
        </div>
      </div>
      <div className="mb-3 text-[11px] text-ink-3">
        {t('car.driveType')}: {node.config.drive === '2wd' ? t('car.drive2wd') : t('car.drive4wd')}
      </div>
      <OutlineButton onClick={handleGenerate} disabled={generating} className="w-full">
        {hasGenerated ? t('car.regenerateChassis') : t('car.generateChassis')}
      </OutlineButton>
    </>
  );
}
```

- [ ] **Step 4: Add missing imports** — `CarConfigParams`, `CarChassisShape` from `../parts/presets`

```tsx
import type { CarConfigParams, CarChassisShape } from '../parts/presets';
import { useState } from 'react';
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/PropertyCard.tsx
git commit -m "feat: add car-anchor property panel with generate chassis button"
```

---

### Task 7: Render car-anchor preview in Viewport

**Files:**
- Modify: `src/components/Viewport.tsx` (add CarAnchorMesh component and rendering)

**Interfaces:**
- Consumes: `CarAnchorNode` from `document.ts`

- [ ] **Step 1: Import CarAnchorNode**

```tsx
// src/components/Viewport.tsx — update imports
import type { CarAnchorNode, PartNode, SceneNode } from '../types/document';
```

- [ ] **Step 2: Add CarAnchorMesh component** (before the closing `</>` of the Viewport return, after `</SelectionGizmo>`)

```tsx
{/* 錨點預覽 — 半透明矩形 */}
{(() => {
  const anchors = doc.nodes.filter((n): n is CarAnchorNode => n.type === 'car-anchor' && n.visible);
  return anchors.map((anchor) => (
    <CarAnchorMesh
      key={anchor.id}
      anchor={anchor}
      selected={selection.includes(anchor.id)}
      onSelect={(shiftKey) => {
        if (shiftKey) {
          const current = useDocumentStore.getState().selection;
          setSelection(
            current.includes(anchor.id)
              ? current.filter((id) => id !== anchor.id)
              : [...current, anchor.id],
          );
        } else {
          setSelection([anchor.id]);
        }
      }}
    />
  ));
})()}
```

- [ ] **Step 3: Implement CarAnchorMesh component** (after HighResPartMesh, before end of file)

```tsx
import * as THREE from 'three';

function CarAnchorMesh({
  anchor,
  selected,
  onSelect,
}: {
  anchor: CarAnchorNode;
  selected: boolean;
  onSelect: (shiftKey: boolean) => void;
}) {
  const { length, width } = anchor.config;
  const [px, py, pz] = anchor.transform.position;
  const rotZ = (anchor.transform.rotation[2] * Math.PI) / 180;

  return (
    <mesh
      position={[px, py, pz + 0.5]}
      rotation={[0, 0, rotZ]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
    >
      <boxGeometry args={[length, width, 1]} />
      <meshStandardMaterial
        color={selected ? '#2563eb' : '#3b82f6'}
        transparent
        opacity={0.2}
        roughness={0.4}
        metalness={0.05}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(length, width, 1)]} />
        <lineBasicMaterial color={selected ? '#2563eb' : '#60a5fa'} opacity={0.6} transparent />
      </lineSegments>
    </mesh>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/Viewport.tsx
git commit -m "feat: render car-anchor preview in Viewport"
```

---

### Task 8: Update SceneTreePanel for car-anchor

**Files:**
- Modify: `src/components/SceneTreePanel.tsx` (typeLabel, children rendering)

- [ ] **Step 1: Add car-anchor type label**

```tsx
// src/components/SceneTreePanel.tsx — typeLabel function (line 8)
case 'car-anchor':
  return 'anchor';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SceneTreePanel.tsx
git commit -m "feat: show car-anchor type label in scene tree"
```

---

### Task 9: Add Z rotation support to SelectionGizmo

**Files:**
- Modify: `src/components/SelectionGizmo.tsx` (add mode toggle)
- Modify: `src/components/ViewToggles.tsx` (add gizmo mode toggle)
- Modify: `src/store/viewStore.ts` (add gizmoMode)

- [ ] **Step 1: Add gizmoMode to viewStore**

```ts
// src/store/viewStore.ts
export type GizmoMode = 'translate' | 'rotate';

interface ViewState {
  shellXray: boolean;
  wireframe: boolean;
  highResModels: boolean;
  gizmoMode: GizmoMode;
  toggleShellXray: () => void;
  toggleWireframe: () => void;
  toggleHighResModels: () => void;
  setGizmoMode: (mode: GizmoMode) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  // ... existing fields
  gizmoMode: 'translate',
  // ... existing toggles
  setGizmoMode: (mode) => set({ gizmoMode: mode }),
}));
```

- [ ] **Step 2: Add gizmo mode toggle button in ViewToggles**

```tsx
// src/components/ViewToggles.tsx
import { Move, Rotate3D } from 'lucide-react';

// ... inside the return div:
<ToggleButton
  active={gizmoMode === 'translate'}
  onClick={() => setGizmoMode('translate')}
  label={t('view.translate')}
  icon={Move}
/>
<ToggleButton
  active={gizmoMode === 'rotate'}
  onClick={() => setGizmoMode('rotate')}
  label={t('view.rotate')}
  icon={Rotate3D}
/>
```

- [ ] **Step 3: Update SelectionGizmo to use gizmoMode**

```tsx
// src/components/SelectionGizmo.tsx
const gizmoMode = useViewStore((s) => s.gizmoMode);

// ... in TransformControls:
<TransformControls
  object={proxyRef}
  mode={gizmoMode}
  // ...
/>
```

- [ ] **Step 4: Add i18n keys**

```json
// i18n/en.json — view section
"translate": "Translate",
"rotate": "Rotate"

// i18n/zh.json — view section
"translate": "移動",
"rotate": "旋轉"
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/SelectionGizmo.tsx src/components/ViewToggles.tsx src/store/viewStore.ts src/i18n/en.json src/i18n/zh.json
git commit -m "feat: add gizmo mode toggle (translate/rotate)"
```

---

### Task 10: Add car-anchor rotation restriction in PropertyCard

**Files:**
- Modify: `src/components/PropertyCard.tsx` (restrict car-anchor to Z rotation only in rotation fields)

- [ ] **Step 1: Update rotation fields** — when node is car-anchor, disable X/Y rotation steppers

```tsx
// src/components/PropertyCard.tsx — rotation section (line ~80)
<div className="mt-3">
  <SectionLabel>{t('property.rotation')}</SectionLabel>
  <div className="grid grid-cols-3 gap-1.5">
    {AXIS_LABELS.map((axis, i) => (
      <StepperField
        key={axis}
        label={axis}
        value={node.transform.rotation[i]}
        step={5}
        disabled={node.type === 'car-anchor' && i < 2} // 只允許 Z 軸
        onChange={(v) =>
          updateNode(node.id, (n) => void (n.transform.rotation[i] = v))
        }
      />
    ))}
  </div>
</div>
```

But `StepperField` doesn't have a `disabled` prop. Let me check — looking at ui.tsx, StepperField doesn't have `disabled`. We need to add it. Or we can just hide X/Y for car-anchor. Simpler: hide X/Y rotation for car-anchor.

```tsx
// src/components/PropertyCard.tsx — rotation section line ~80
<div className="mt-3">
  <SectionLabel>{t('property.rotation')}</SectionLabel>
  <div className="grid grid-cols-3 gap-1.5">
    {AXIS_LABELS.map((axis, i) => {
      if (node.type === 'car-anchor' && i < 2) return null;
      return (
        <StepperField
          key={axis}
          label={axis}
          value={node.transform.rotation[i]}
          step={5}
          onChange={(v) =>
            updateNode(node.id, (n) => void (n.transform.rotation[i] = v))
          }
        />
      );
    })}
  </div>
</div>
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/PropertyCard.tsx
git commit -m "feat: restrict car-anchor rotation to Z axis in property panel"
```

---

### Task 11: Update evaluate.ts to skip car-anchor in export

**Files:**
- Modify: `src/geometry/evaluate.ts` (buildSolid — ensure car-anchor returns null)

- [ ] **Step 1: Add else-if for car-anchor** — currently falls through to `combineScope(node.children)`. Car-anchor has no children, so `combineScope` returns null. But add explicit early return to be safe:

```ts
// src/geometry/evaluate.ts — buildSolid function (line 38)
} else if (node.type === 'enclosure') {
  base = buildEnclosureNodeSolid(node, kernel);
} else if (node.type === 'car-anchor') {
  return null; // anchor 不參與實體運算
} else {
  base = combineScope(node.children, kernel);
}
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/geometry/evaluate.ts
git commit -m "fix: skip car-anchor in geometry evaluation"
```

---

### Task 12: Final verification and cleanup

**Files:**
- Run: full test suite, type check, and manual verification

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Verify no regressions**

Check that existing car preset tests still pass, enclosure tests still pass, chassis geometry tests still pass.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: complete two-phase smart car generation with anchor"
```