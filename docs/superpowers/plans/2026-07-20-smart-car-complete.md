# Smart Car Complete (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將智能小車重排為物理自洽佈局（輪貼地、軸對齊、底盤抬升、加萬向輪），輪子雙色化、底盤零件化並接入外殼流程，preset 架構泛化並新增 4WD 車型與工具列選單。

**Architecture:** 依規格 `docs/superpowers/specs/2026-07-20-smart-car-complete-design.md`（D1–D11）。schema 加三個向後相容欄位（block `color`、hole `standoff`、body `cornerRadius`）→ partGeometry 支援 per-block 色段 → 渲染管線（protocol/evaluate/worker/Viewport）攜帶段色 → 零件庫更新（tt-motor 細節化、car-wheel 雙色、新 ball-caster-16、新 car-chassis-2wd）→ presets 資料驅動重寫（2WD/4WD + 貼地組預設選取）→ 工具列 preset 選單 → 外殼整合測試。

**Tech Stack:** TypeScript、React 19、react-three-fiber、manifold-3d（WASM 幾何核心）、zustand、react-i18next、zod、vitest、Vite。

## Global Constraints

- 單位 mm、旋轉為度（degrees）、Z 軸向上；block 的 `position[2]` 自主體頂面起算（可為負）
- `kernel.transform` 語義：scale → rotate(X→Y→Z) → translate；Rx(90°) 把圓柱 +Z 軸轉向 −Y，Ry(90°) 把 +Z 轉向 +X；block `position` 是旋轉後平移到的最終位置
- 既有行為不變：`buildPartSolid`（整體 union）與 `evaluateForExport` 結果與分段前一致；無色零件渲染顏色不變
- i18n 所有新 UI 字串須同時加 `src/i18n/zh.json` 與 `src/i18n/en.json`
- 測試：`npm test`（全部）或 `npx vitest run <file>`（單檔）；型別檢查 `npm run build`
- commit 訊息用英文 conventional commits（參考 `git log` 既有風格），每個 Task 結尾各 commit 一次
- 除各 Task 明列的測試修改外，不更動既有測試邏輯

---

### Task 1: Schema 擴充（block.color / hole.standoff / body.cornerRadius）+ planStandoffs 過濾

**Files:**
- Modify: `src/parts/schema.ts`
- Modify: `src/parts/schema.test.ts`
- Modify: `src/enclosure/plan.ts`（`planStandoffs`，約 212 行迴圈開頭）
- Modify: `src/enclosure/plan.test.ts`（附加一個 describe；imports 視情況合併）

**Interfaces:**
- Consumes: 無（地基任務）
- Produces: `PartBlock.color?: string`（`#RRGGBB`）、`MountingHole.standoff?: boolean`、`body.cornerRadius?: number`；`planStandoffs` 跳過 `standoff === false` 的孔

- [ ] **Step 1: 寫失敗測試（schema）**

在 `src/parts/schema.test.ts` 的 `describe('partDefinitionSchema')` 內附加：

```ts
  it('block color：接受 #RRGGBB、拒絕非法格式', () => {
    const withColor = (color: string) => ({
      ...validPart,
      body: {
        size: [20, 10, 1.6],
        blocks: [{ shape: 'box', position: [0, 0, 0], size: [1, 1, 1], color }],
      },
    });
    expect(partDefinitionSchema.safeParse(withColor('#2b2d30')).success).toBe(true);
    for (const bad of ['red', '#fff', '#12345g', '2b2d30']) {
      expect(partDefinitionSchema.safeParse(withColor(bad)).success, `應拒絕 ${bad}`).toBe(false);
    }
  });

  it('mountingHole standoff：缺省 undefined、接受 false', () => {
    const parsed = partDefinitionSchema.parse({
      ...validPart,
      mountingHoles: [{ x: 0, y: 0, diameter: 3 }, { x: 1, y: 0, diameter: 3, standoff: false }],
    });
    expect(parsed.mountingHoles[0].standoff).toBeUndefined();
    expect(parsed.mountingHoles[1].standoff).toBe(false);
  });

  it('body.cornerRadius：接受非負、拒絕負值、缺省 undefined', () => {
    expect(
      partDefinitionSchema.parse({ ...validPart, body: { size: [20, 10, 1.6], cornerRadius: 10 } })
        .body.cornerRadius,
    ).toBe(10);
    expect(
      partDefinitionSchema.safeParse({ ...validPart, body: { size: [20, 10, 1.6], cornerRadius: -1 } })
        .success,
    ).toBe(false);
    expect(partDefinitionSchema.parse(validPart).body.cornerRadius).toBeUndefined();
  });
```

- [ ] **Step 2: 寫失敗測試（planStandoffs 過濾）**

在 `src/enclosure/plan.test.ts` 末尾附加（`identityTransform`、`PartDefinition`、`planStandoffs` 皆已在該檔案既有 import 中，無需改 import）：

```ts
describe('planStandoffs：standoff 旗標', () => {
  it('standoff:false 的孔不產生支柱', () => {
    const def: PartDefinition = {
      id: 'standoff-test',
      name: 'T',
      nameZh: 'T',
      category: 'board',
      body: { size: [20, 20, 2], blocks: [] },
      mountingHoles: [
        { x: 5, y: 0, diameter: 3 },
        { x: -5, y: 0, diameter: 3, standoff: false },
      ],
      ports: [],
      clearanceHeight: 5,
    };
    const plans = planStandoffs([{ def, transform: identityTransform() }], 'M3');
    expect(plans).toHaveLength(1);
    expect(plans[0].x).toBeCloseTo(5, 6);
  });
});
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `npx vitest run src/parts/schema.test.ts src/enclosure/plan.test.ts`
Expected: FAIL（`color`/`standoff`/`cornerRadius` 被 zod 剝離或拒絕方式與預期不符；planStandoffs 回傳 2 根）

- [ ] **Step 4: 實作 schema 三欄位**

`src/parts/schema.ts` 三處修改：

```ts
export const partBlockSchema = z.object({
  shape: z.enum(['box', 'cylinder']),
  /** box: 中心 xy + 底面 z；cylinder: 底面中心。z 自主體頂面起算（可為負） */
  position: vec3Schema,
  /** box: [寬x, 深y, 高z]；cylinder: [直徑, 直徑, 高] */
  size: vec3Schema,
  /** 選填，度；預設 [0,0,0]（現行行為不變）。水平軸圓柱用（輪胎/輪轂/馬達罐/軸）。 */
  rotation: vec3Schema.optional(),
  /** 選填 #RRGGBB；設定後此 block 獨立成色段渲染（不併入主體 union） */
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  label: z.string().optional(),
});
```

```ts
export const mountingHoleSchema = z.object({
  x: z.number(),
  y: z.number(),
  diameter: z.number().positive(),
  /** 孔平面絕對高度；預設 0 = 主體底面 */
  z: z.number().optional(),
  /** 預設 true；false＝孔照鑽穿零件幾何，但 planStandoffs 不為它長支柱（底盤電子件鎖附孔用） */
  standoff: z.boolean().optional(),
});
```

`partDefinitionSchema` 的 `body`：

```ts
  body: z.object({
    /** 主體尺寸 [長x, 寬y, 厚z]，原點在底面中心 */
    size: vec3Schema,
    /** 垂直邊圓角半徑；缺省/0＝直角長方體（kernel.roundedBox，<=0 時等同 box） */
    cornerRadius: z.number().nonnegative().optional(),
    blocks: z.array(partBlockSchema).default([]),
  }),
```

- [ ] **Step 5: 實作 planStandoffs 過濾**

`src/enclosure/plan.ts` 的 `planStandoffs`，在 `for (const hole of part.def.mountingHoles) {` 迴圈開頭加一行：

```ts
    for (const hole of part.def.mountingHoles) {
      if (hole.standoff === false) continue; // 底盤電子件鎖附孔：照鑽但不長支柱（design.md D3）
      out.push({
```

- [ ] **Step 6: 跑測試確認通過**

Run: `npx vitest run src/parts/schema.test.ts src/enclosure/plan.test.ts`
Expected: PASS（含既有測試全綠）

- [ ] **Step 7: Commit**

```bash
git add src/parts/schema.ts src/parts/schema.test.ts src/enclosure/plan.ts src/enclosure/plan.test.ts
git commit -m "feat: add block color, hole standoff flag and body cornerRadius to part schema"
```

---

### Task 2: partGeometry 分段（buildPartColoredSegments + roundedBox + buildPartSolid 重構）

**Files:**
- Modify: `src/parts/partGeometry.ts`（整檔重寫）
- Modify: `src/parts/partGeometry.test.ts`（附加 describe）

**Interfaces:**
- Consumes: Task 1 的 `PartBlock.color`、`body.cornerRadius`
- Produces:
  - `export interface PartSegment { solid: Solid; color?: string }`
  - `export function buildPartColoredSegments(def: PartDefinition, kernel: GeometryKernel): PartSegment[]`（段序：主體段在前，有色段依 blocks 順序）
  - `buildPartSolid(def, kernel): Solid` 簽名不變＝全段 union

- [ ] **Step 1: 寫失敗測試**

在 `src/parts/partGeometry.test.ts` 附加（imports 加 `buildPartColoredSegments` 與 `PartDefinition` 型別）：

```ts
describe('buildPartColoredSegments', () => {
  const wheelLike: PartDefinition = {
    id: 'test-wheel',
    name: 'T',
    nameZh: 'T',
    category: 'component',
    body: {
      size: [10, 10, 1],
      blocks: [
        { shape: 'box', position: [0, 0, 0], size: [5, 5, 2] }, // 無色 → 併入主體段
        { shape: 'box', position: [3, 0, 0], size: [2, 2, 2], color: '#a1b2c3' }, // 有色 → 獨立段
      ],
    },
    mountingHoles: [],
    ports: [],
    clearanceHeight: 5,
  };

  it('無色 block 併入主體段；有色 block 獨立成段並帶色', () => {
    const segs = buildPartColoredSegments(wheelLike, kernel);
    expect(segs).toHaveLength(2);
    expect(segs[0].color).toBeUndefined();
    expect(segs[1].color).toBe('#a1b2c3');
    expect(kernel.volume(segs[0].solid)).toBeCloseTo(10 * 10 * 1 + 5 * 5 * 2, 1);
    expect(kernel.volume(segs[1].solid)).toBeCloseTo(2 * 2 * 2, 3);
  });

  it('安裝孔對主體段與有色段都鑽', () => {
    const drilled: PartDefinition = { ...wheelLike, mountingHoles: [{ x: 3, y: 0, diameter: 2 }] };
    const segs = buildPartColoredSegments(drilled, kernel);
    // 有色段（2×2×2=8）被 Ø2 孔鑽穿 → 體積變小
    expect(kernel.volume(segs[1].solid)).toBeLessThan(8);
  });

  it('buildPartSolid＝全段 union（幾何與分段前一致）', () => {
    const v = kernel.volume(buildPartSolid(wheelLike, kernel));
    expect(v).toBeCloseTo(10 * 10 * 1 + 5 * 5 * 2 + 2 * 2 * 2, 1);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/parts/partGeometry.test.ts`
Expected: FAIL（`buildPartColoredSegments is not a function` / export 不存在）

- [ ] **Step 3: 整檔重寫 `src/parts/partGeometry.ts`**

```ts
import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { PartDefinition } from './schema';

const noTransform = {
  rotation: [0, 0, 0] as [number, number, number],
  scale: [1, 1, 1] as [number, number, number],
};

/** 帶色 block 的獨立段；color 缺省＝主體段（無色 blocks 併入） */
export interface PartSegment {
  solid: Solid;
  color?: string;
}

/**
 * 由零件定義生成分段 Solid：主體＋無色 blocks union 為主體段；每個帶 color 的 block 獨立成段
 * （不併入 union，避免共面 z-fight）。安裝孔對每段照鑽（孔穿透一切的語義不變）。
 * 原點＝主體底面中心。純函數，把手由呼叫端 releaseAll 管理。
 */
export function buildPartColoredSegments(def: PartDefinition, kernel: GeometryKernel): PartSegment[] {
  const [bodyL, bodyW, bodyT] = def.body.size;
  let body = kernel.roundedBox(bodyL, bodyW, bodyT, def.body.cornerRadius ?? 0);
  const colored: PartSegment[] = [];

  for (const block of def.body.blocks) {
    const [a, b, h] = block.size;
    const base = block.shape === 'cylinder' ? kernel.cylinder(a / 2, h) : kernel.box(a, b, h);
    const [x, y, z] = block.position;
    // blocks 的 z 從主體頂面起算
    const placed = kernel.transform(base, {
      position: [x, y, bodyT + z],
      rotation: block.rotation ?? noTransform.rotation,
      scale: noTransform.scale,
    });
    if (block.color) colored.push({ solid: placed, color: block.color });
    else body = kernel.union(body, placed);
  }

  const drill = (s: Solid): Solid => {
    for (const hole of def.mountingHoles) {
      const planeZ = hole.z ?? 0;
      // 鑽孔高度 = 主體厚 + 2mm 餘量，自孔平面下方 1mm 起，確保穿透
      const d = kernel.transform(kernel.cylinder(hole.diameter / 2, bodyT + 2), {
        position: [hole.x, hole.y, planeZ - 1],
        ...noTransform,
      });
      s = kernel.difference(s, d);
    }
    return s;
  };

  return [{ solid: drill(body) }, ...colored.map((seg) => ({ ...seg, solid: drill(seg.solid) }))];
}

/**
 * 由零件定義生成單一 Solid＝全段 union（供測試/bounds/匯出）。
 * 行為與分段前一致：(A∪B)−H ≡ (A−H)∪(B−H)。
 */
export function buildPartSolid(def: PartDefinition, kernel: GeometryKernel): Solid {
  const [first, ...rest] = buildPartColoredSegments(def, kernel);
  return rest.reduce((acc, seg) => kernel.union(acc, seg.solid), first.solid);
}
```

- [ ] **Step 4: 跑測試確認通過（含既有測試不回歸）**

Run: `npx vitest run src/parts/`
Expected: PASS（`partGeometry.test.ts` 新舊測試全綠；`buildPartSolid` 重構後既有體積斷言不變）

- [ ] **Step 5: Commit**

```bash
git add src/parts/partGeometry.ts src/parts/partGeometry.test.ts
git commit -m "feat: split part solids into per-block color segments"
```

---

### Task 3: tt-motor 細節化（馬達罐 + 雙出軸）

**Files:**
- Modify: `src/parts/library.ts`（`tt-motor` 定義，約 288–295 行）
- Create: `src/parts/ttMotor.test.ts`

**Interfaces:**
- Consumes: Task 1 的 rotation-aware clearanceHeight 檢查（見 Step 4，同 commit 修改 `library.test.ts`）
- Produces: `tt-motor` 定義含馬達罐與雙軸；軸心距本體底面 12mm、軸端 y≈±19.25、罐頂 ≈29（Task 8 preset 佈局依賴這些數值）

- [ ] **Step 1: 寫失敗測試**

Create `src/parts/ttMotor.test.ts`：

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('tt-motor 幾何（馬達罐 + 雙出軸）', () => {
  const def = getPartDefinition('tt-motor')!;

  it('罐頂 ≈29mm 且 clearanceHeight 一致', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) maxZ = Math.max(maxZ, mesh.positions[i]);
    expect(maxZ).toBeCloseTo(29, 0);
    expect(def.clearanceHeight).toBeGreaterThanOrEqual(29);
  });

  it('雙出軸自 ±Y 面伸出（軸端 y≈±19.25）', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let maxY = -Infinity;
    let minY = Infinity;
    for (let i = 1; i < mesh.positions.length; i += 3) {
      maxY = Math.max(maxY, mesh.positions[i]);
      minY = Math.min(minY, mesh.positions[i]);
    }
    expect(maxY).toBeCloseTo(19.25, 1);
    expect(minY).toBeCloseTo(-19.25, 1);
  });

  it('軸心距本體底面 12mm', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    // 軸身頂點：|y| 超出本體面 11.25 者即軸圓柱表面，z 對稱分佈於軸心兩側
    const zs: number[] = [];
    for (let i = 0; i < mesh.positions.length; i += 3) {
      if (Math.abs(mesh.positions[i + 1]) > 12) zs.push(mesh.positions[i + 2]);
    }
    expect(zs.length).toBeGreaterThan(0);
    const avg = zs.reduce((a, b) => a + b, 0) / zs.length;
    expect(avg).toBeCloseTo(12, 0);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/parts/ttMotor.test.ts`
Expected: FAIL（現行 def 無罐無軸：maxZ≈18.5、maxY≈11.25）

- [ ] **Step 3: 更新 `library.ts` 的 tt-motor 定義**

取代現行 `tt-motor` 整段定義：

```ts
  {
    id: 'tt-motor',
    name: 'TT Motor',
    nameZh: 'TT 減速馬達',
    category: 'power',
    // 縱向安裝（長軸沿 X、雙軸朝 ±Y 兩側），軸心距本體底面 12mm；v1 不支援自動支柱，僅供排位
    body: {
      size: [65, 22.5, 18.5],
      blocks: [
        // 馬達罐：Ø20×25 橫軸（rotY 90° → 軸沿 +X），罐心 z=19（罐頂 ≈29）
        { shape: 'cylinder', position: [-30.5, 0, 0.5], size: [20, 20, 25], rotation: [0, 90, 0], label: '馬達罐' },
        // 雙出軸：Ø5.4×8，軸心 x=+20、z=12，自 ±Y 面各伸出 8mm（rotX ±90° → 軸沿 ∓Y）
        { shape: 'cylinder', position: [20, 19.25, -6.5], size: [5.4, 5.4, 8], rotation: [90, 0, 0], label: '輸出軸' },
        { shape: 'cylinder', position: [20, -19.25, -6.5], size: [5.4, 5.4, 8], rotation: [-90, 0, 0], label: '輸出軸' },
      ],
    },
    clearanceHeight: 29,
  },
```

- [ ] **Step 4: 同 commit 修改 `library.test.ts` 的 clearanceHeight 檢查為 rotation-aware**

將 `src/parts/library.test.ts` 的「clearanceHeight 不低於實際幾何最高點」測試整段改為：

```ts
  it('clearanceHeight 不低於實際幾何最高點', () => {
    for (const part of PART_LIBRARY) {
      const bodyTop = part.body.size[2];
      const highest = part.body.blocks.reduce((max, block) => {
        // 水平軸圓柱（繞 X 或 Y 轉 90°）：軸心位於 position[2]，垂直延伸為半徑而非柱長
        const rot = block.rotation ?? [0, 0, 0];
        const horizontal =
          block.shape === 'cylinder' &&
          (Math.abs(rot[0] % 180) === 90 || Math.abs(rot[1] % 180) === 90);
        const extent = horizontal
          ? block.position[2] + block.size[0] / 2
          : block.position[2] + block.size[2];
        return Math.max(max, bodyTop + extent);
      }, bodyTop);
      expect(
        part.clearanceHeight,
        `${part.id} 的 clearanceHeight ${part.clearanceHeight} 低於幾何最高點 ${highest}`,
      ).toBeGreaterThanOrEqual(highest - 1e-9);
    }
  });
```

（原因：舊天真公式 `position[2] + size[2]` 會把馬達罐誤算成 44mm 高；新公式下車輪輪胎恰為 65mm 不變。保護意圖不變。）

- [ ] **Step 5: 跑測試確認通過**

Run: `npx vitest run src/parts/`
Expected: PASS（ttMotor 三項 probe + library.test 全綠）

- [ ] **Step 6: Commit**

```bash
git add src/parts/library.ts src/parts/ttMotor.test.ts src/parts/library.test.ts
git commit -m "feat: detail tt-motor with motor can and dual output shafts"
```

---

### Task 4: car-wheel 雙色輪轂

**Files:**
- Modify: `src/parts/library.ts`（`car-wheel` 定義，約 411–425 行）
- Modify: `src/parts/carWheel.test.ts`（附加 describe；imports 加 `buildPartColoredSegments`）

**Interfaces:**
- Consumes: Task 2 的 `buildPartColoredSegments`
- Produces: `car-wheel` 段序＝[本體（無色）, 輪胎（#2b2d30), 輪轂（#c8ccd2)]；貼地/Ø65/胎寬 27 斷言不變

- [ ] **Step 1: 寫失敗測試**

在 `src/parts/carWheel.test.ts` 附加（import 區塊加 `buildPartColoredSegments`）：

```ts
describe('car-wheel 雙色分段', () => {
  const def = getPartDefinition('car-wheel')!;

  it('3 段：本體無色、輪胎 #2b2d30、輪轂 #c8ccd2', () => {
    const segs = buildPartColoredSegments(def, kernel);
    expect(segs).toHaveLength(3);
    const colors = segs.map((s) => s.color);
    expect(colors[0]).toBeUndefined();
    expect(colors).toContain('#2b2d30');
    expect(colors).toContain('#c8ccd2');
  });

  it('輪轂寬 29mm（兩側各凸出輪胎 1mm）、與輪胎同軸', () => {
    const hub = buildPartColoredSegments(def, kernel).find((s) => s.color === '#c8ccd2')!;
    const mesh = kernel.toMesh(hub.solid);
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      minY = Math.min(minY, mesh.positions[i + 1]);
      maxY = Math.max(maxY, mesh.positions[i + 1]);
      minZ = Math.min(minZ, mesh.positions[i + 2]);
      maxZ = Math.max(maxZ, mesh.positions[i + 2]);
    }
    expect(maxY - minY).toBeCloseTo(29, 0);
    // 輪轂軸心 z＝32.5＝輪心
    expect((minZ + maxZ) / 2).toBeCloseTo(32.5, 1);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/parts/carWheel.test.ts`
Expected: FAIL（現行 def 只有 1 個無色 block → 只有 1 段）

- [ ] **Step 3: 更新 `library.ts` 的 car-wheel 定義**

```ts
  {
    id: 'car-wheel',
    name: 'Wheel 65mm',
    nameZh: '65mm 車輪',
    category: 'component',
    body: {
      size: [10, 27, 1],
      // 輪胎/輪轂皆水平軸圓柱（rotX 90°）；position 為實測值，見 carWheel.test.ts probe
      blocks: [
        { shape: 'cylinder', position: [0, 13.5, 31.5], size: [65, 65, 27], rotation: [90, 0, 0], color: '#2b2d30', label: '輪胎' },
        { shape: 'cylinder', position: [0, 14.5, 31.5], size: [30, 30, 29], rotation: [90, 0, 0], color: '#c8ccd2', label: '輪轂' },
      ],
    },
    mountingHoles: [],
    ports: [],
    clearanceHeight: 65,
  },
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/parts/`
Expected: PASS（既有貼地/Ø65/胎寬斷言不變＋新分段測試）

- [ ] **Step 5: Commit**

```bash
git add src/parts/library.ts src/parts/carWheel.test.ts
git commit -m "feat: add two-tone hub to car-wheel"
```

---

### Task 5: 新零件 ball-caster-16

**Files:**
- Modify: `src/parts/library.ts`（`car-wheel` 之後追加）
- Create: `src/parts/ballCaster.test.ts`
- Modify: `src/parts/library.test.ts`（零件計數 24→25、component 7→8）

**Interfaces:**
- Consumes: 無（Task 1 schema 已就位）
- Produces: `ball-caster-16` 定義；總高 17.5mm（Task 8 的 2WD preset 依賴）

- [ ] **Step 1: 寫失敗測試**

Create `src/parts/ballCaster.test.ts`：

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('ball-caster-16 幾何', () => {
  const def = getPartDefinition('ball-caster-16')!;

  it('總高 17.5mm（填滿地面到底盤底）且最低點觸地', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) {
      minZ = Math.min(minZ, mesh.positions[i]);
      maxZ = Math.max(maxZ, mesh.positions[i]);
    }
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxZ).toBeCloseTo(17.5, 1);
  });

  it('clearanceHeight = 17.5', () => {
    expect(def.clearanceHeight).toBe(17.5);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/parts/ballCaster.test.ts`
Expected: FAIL（`getPartDefinition('ball-caster-16')` 回 undefined → `!` 後續出錯）

- [ ] **Step 3: 新增定義 + 更新計數測試**

`src/parts/library.ts`，在 `car-wheel` 定義之後追加：

```ts
  {
    id: 'ball-caster-16',
    name: 'Ball Caster 16mm',
    nameZh: '16mm 萬向滾珠',
    category: 'component',
    // 珠（主體直立圓柱近似）+ 珠座 + 安裝板；總高 17.5＝地面到 2WD 底盤底面
    body: {
      size: [14, 14, 9],
      blocks: [
        { shape: 'cylinder', position: [0, 0, 0], size: [18, 18, 5], label: '珠座' },
        { shape: 'box', position: [0, 0, 5], size: [26, 26, 3.5], label: '安裝板' },
      ],
    },
    mountingHoles: [],
    ports: [],
    clearanceHeight: 17.5,
  },
```

`src/parts/library.test.ts` 兩處計數修改：

```ts
  it('共 25 個零件', () => {
    expect(PART_LIBRARY).toHaveLength(25);
  });
```

```ts
  it('id 不重複', () => {
    const ids = new Set(PART_LIBRARY.map((p) => p.id));
    expect(ids.size).toBe(25);
  });
```

分類計數測試中的 component 斷言：

```ts
    expect(count('component')).toBe(8);
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/parts/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/parts/library.ts src/parts/ballCaster.test.ts src/parts/library.test.ts
git commit -m "feat: add ball-caster-16 part"
```

---

### Task 6: 新零件 car-chassis-2wd（圓角底盤 + 18 孔）

**Files:**
- Modify: `src/parts/library.ts`（`ball-caster-16` 之後追加）
- Create: `src/parts/carChassis.test.ts`
- Modify: `src/parts/library.test.ts`（零件計數 25→26、component 8→9）

**Interfaces:**
- Consumes: Task 1 `body.cornerRadius` + Task 2 `buildPartSolid` 的 roundedBox 路徑
- Produces: `car-chassis-2wd` 定義：270×185×3 r10 圓角板；4 角孔（standoff 缺省）+ 14 電子件孔（`standoff: false`）。孔位常數＝Task 8 的 2WD 佈局平移（交叉對照測試在 Task 8）

- [ ] **Step 1: 寫失敗測試**

Create `src/parts/carChassis.test.ts`：

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('car-chassis-2wd 幾何', () => {
  const def = getPartDefinition('car-chassis-2wd')!;

  it('AABB＝270×185×3，落在 z∈[0,3]', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      minX = Math.min(minX, mesh.positions[i]);
      maxX = Math.max(maxX, mesh.positions[i]);
      minY = Math.min(minY, mesh.positions[i + 1]);
      maxY = Math.max(maxY, mesh.positions[i + 1]);
      minZ = Math.min(minZ, mesh.positions[i + 2]);
      maxZ = Math.max(maxZ, mesh.positions[i + 2]);
    }
    expect(maxX - minX).toBeCloseTo(270, 1);
    expect(maxY - minY).toBeCloseTo(185, 1);
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxZ).toBeCloseTo(3, 1);
  });

  it('垂直邊圓角 r=10：無頂點同時 |x|>134 且 |y|>91.5（直角版會有角落頂點）', () => {
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    let cornerVerts = 0;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      if (Math.abs(mesh.positions[i]) > 134 && Math.abs(mesh.positions[i + 1]) > 91.5) cornerVerts += 1;
    }
    expect(cornerVerts).toBe(0);
  });

  it('18 個安裝孔：4 角孔 standoff 缺省、14 電子件孔 standoff:false，且全部鑽穿', () => {
    expect(def.mountingHoles).toHaveLength(18);
    expect(def.mountingHoles.filter((h) => h.standoff === undefined)).toHaveLength(4);
    expect(def.mountingHoles.filter((h) => h.standoff === false)).toHaveLength(14);
    const v = kernel.volume(buildPartSolid(def, kernel));
    const vNoHoles = kernel.volume(buildPartSolid({ ...def, mountingHoles: [] }, kernel));
    expect(vNoHoles - v).toBeGreaterThan(200); // 18 孔合計約 400mm³
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/parts/carChassis.test.ts`
Expected: FAIL（`getPartDefinition('car-chassis-2wd')` 回 undefined）

- [ ] **Step 3: 新增定義 + 更新計數測試**

`src/parts/library.ts`，在 `ball-caster-16` 之後追加（孔位＝2WD 佈局世界座標 − 底盤節點 x=−3，見 Task 8 交叉對照測試）：

```ts
  {
    id: 'car-chassis-2wd',
    name: '2WD Car Chassis',
    nameZh: '2WD 小車底盤',
    category: 'component',
    // 270×185×3 圓角壓克力板；4 角孔鎖進外殼支柱，14 個電子件孔自備螺絲鎖附（不長支柱）
    body: { size: [270, 185, 3], cornerRadius: 10 },
    mountingHoles: [
      // 角落孔（外殼支柱鎖點，standoff 缺省=true）
      { x: -125, y: -82.5, diameter: 3 },
      { x: -125, y: 82.5, diameter: 3 },
      { x: 125, y: -82.5, diameter: 3 },
      { x: 125, y: 82.5, diameter: 3 },
      // hc-sr04 @ world x=105 → local +3；def 孔 (±20.5,±7.5) Ø1.8
      { x: 87.5, y: -7.5, diameter: 1.8, standoff: false },
      { x: 87.5, y: 7.5, diameter: 1.8, standoff: false },
      { x: 128.5, y: -7.5, diameter: 1.8, standoff: false },
      { x: 128.5, y: 7.5, diameter: 1.8, standoff: false },
      // arduino-uno @ world x=40 → local 43±def 孔，Ø3.2
      { x: 22.7, y: -24.2, diameter: 3.2, standoff: false },
      { x: 24, y: 24, diameter: 3.2, standoff: false },
      { x: 74.8, y: 8.8, diameter: 3.2, standoff: false },
      { x: 74.8, y: -19.1, diameter: 3.2, standoff: false },
      // l298n @ world x=-25 → local -22±18.5，Ø3.2
      { x: -40.5, y: -18.4, diameter: 3.2, standoff: false },
      { x: -40.5, y: 18.4, diameter: 3.2, standoff: false },
      { x: -3.5, y: -18.4, diameter: 3.2, standoff: false },
      { x: -3.5, y: 18.4, diameter: 3.2, standoff: false },
      // battery-18650x2 @ world x=-95 → local -92±29，Ø3
      { x: -121, y: 0, diameter: 3, standoff: false },
      { x: -63, y: 0, diameter: 3, standoff: false },
    ],
    ports: [],
    clearanceHeight: 3,
  },
```

`src/parts/library.test.ts` 計數修改：

```ts
  it('共 26 個零件', () => {
    expect(PART_LIBRARY).toHaveLength(26);
  });
```

```ts
    expect(ids.size).toBe(26);
```

```ts
    expect(count('component')).toBe(9);
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/parts/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/parts/library.ts src/parts/carChassis.test.ts src/parts/library.test.ts
git commit -m "feat: add car-chassis-2wd part with mounting holes"
```

---

### Task 7: 渲染管線分段（protocol / evaluate / worker / Viewport）

**Files:**
- Modify: `src/geometry/protocol.ts`（`NodeMeshPayload` 加 `color?: string`）
- Modify: `src/geometry/evaluate.ts`（render 路徑分段）
- Modify: `src/geometry/evaluate.test.ts`（附加測試）
- Modify: `src/geometry/worker.ts`（payload 帶 color）
- Modify: `src/components/Viewport.tsx`（段色材質 + React key）

**Interfaces:**
- Consumes: Task 2 `buildPartColoredSegments`、Task 4 的雙色 `car-wheel`
- Produces: `EvaluatedNode { nodeId, role, mesh, color? }`；`NodeMeshPayload.color?: string`

- [ ] **Step 1: 寫失敗測試**

在 `src/geometry/evaluate.test.ts` 附加：

```ts
  it('含色零件在 render 路徑回多段（段帶 color）', () => {
    const node = createPartNode('car-wheel', 'wheel');
    const out = evaluateForRender([node], kernel).filter((e) => e.nodeId === node.id);
    expect(out.length).toBeGreaterThanOrEqual(3); // 本體 + 輪胎 + 輪轂
    const colors = out.map((e) => e.color);
    expect(colors).toContain('#2b2d30');
    expect(colors).toContain('#c8ccd2');
    expect(colors).toContain(undefined);
    for (const e of out) expect(e.mesh.indices.length).toBeGreaterThan(0);
  });

  it('hole 對含色零件的每一段都減料', () => {
    const wheel = createPartNode('car-wheel', 'wheel');
    const punch = createPrimitive('cylinder', {
      role: 'hole',
      params: { radius: 4, height: 100 },
    });
    punch.transform.position = [0, 0, -10]; // 貫穿輪胎與輪轂中心及本體
    const drilled = evaluateForRender([wheel, punch], kernel).filter((e) => e.nodeId === wheel.id);
    const baseline = evaluateForRender([wheel], kernel).filter((e) => e.nodeId === wheel.id);
    expect(drilled).toHaveLength(baseline.length);
    // 段序固定（主體段在前、有色段依 blocks 順序），逐段比較 mesh 因鑽孔改變
    for (let i = 0; i < drilled.length; i += 1) {
      expect(drilled[i].mesh.positions.length).not.toBe(baseline[i].mesh.positions.length);
    }
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/geometry/evaluate.test.ts`
Expected: FAIL（現行一節點只回 1 段，`out.length` 為 1）

- [ ] **Step 3: 修改 `src/geometry/evaluate.ts`**

`EvaluatedNode` 加 `color?`，render 路徑改分段（export 路徑完全不動）：

```ts
import { getPartDefinition } from '../parts/library';
import { buildPartColoredSegments, buildPartSolid } from '../parts/partGeometry';
import type { NodeRole, SceneNode } from '../types/document';
import type { GeometryKernel, MeshData, Solid } from './kernel';
import { buildEnclosureNodeSolid } from '../enclosure/generate';

export interface EvaluatedNode {
  nodeId: string;
  role: NodeRole;
  mesh: MeshData;
  /** 來自 PartBlock.color；缺省＝節點預設色 */
  color?: string;
}
```

`buildSolid` 與 `combineScope` 保持不變。`evaluateForRender` 改為：

```ts
/** 渲染路徑的分段 solid：part 依 block.color 分段；其餘節點恆單段 */
function buildRenderSolids(
  node: SceneNode,
  kernel: GeometryKernel,
): { solid: Solid; color?: string }[] | null {
  if (node.type === 'part') {
    const def = getPartDefinition(node.partId);
    if (!def) return null;
    return buildPartColoredSegments(def, kernel).map((seg) => ({
      solid: kernel.transform(seg.solid, node.transform),
      color: seg.color,
    }));
  }
  const s = buildSolid(node, kernel);
  return s ? [{ solid: s }] : null;
}

/** 渲染用：每個頂層節點一至多個 mesh（part 色段）。solid 段被同層 hole 減料；hole 回傳自身形狀 */
export function evaluateForRender(nodes: SceneNode[], kernel: GeometryKernel): EvaluatedNode[] {
  const out: EvaluatedNode[] = [];
  // 每個 hole 只建一次 Solid（Manifold 布林運算不會消耗輸入，把手可重複使用）
  const holeSolids = new Map<string, Solid>();
  for (const n of nodes) {
    if (n.visible && n.role === 'hole') {
      const s = buildSolid(n, kernel);
      if (s) holeSolids.set(n.id, s);
    }
  }
  for (const node of nodes) {
    if (!node.visible) continue;
    if (node.role === 'hole') {
      const s = holeSolids.get(node.id);
      if (s) out.push({ nodeId: node.id, role: node.role, mesh: kernel.toMesh(s) });
      continue;
    }
    for (const seg of buildRenderSolids(node, kernel) ?? []) {
      let s = seg.solid;
      for (const h of holeSolids.values()) s = kernel.difference(s, h);
      out.push({ nodeId: node.id, role: node.role, mesh: kernel.toMesh(s), color: seg.color });
    }
  }
  return out;
}
```

- [ ] **Step 4: 修改 protocol / worker / Viewport**

`src/geometry/protocol.ts`：

```ts
export interface NodeMeshPayload {
  nodeId: string;
  role: NodeRole;
  /** 來自 PartBlock.color；缺省＝節點預設色 */
  color?: string;
  positions: Float32Array;
  indices: Uint32Array;
}
```

`src/geometry/worker.ts` 的 evaluate 分支 map 加 `color`：

```ts
      const meshes = evaluateForRender(req.nodes, kernel).map((entry) => ({
        nodeId: entry.nodeId,
        role: entry.role,
        color: entry.color,
        positions: entry.mesh.positions,
        indices: entry.mesh.indices,
      }));
```

`src/components/Viewport.tsx` 兩處：

```tsx
        {meshes.map((m, i) => (
          <SceneMesh
            key={`${m.nodeId}:${i}`}
```

```tsx
        color={
          isHole
            ? '#ef4444'
            : selected
              ? '#2563eb'
              : (payload.color ?? (isPart ? '#2e7d5b' : '#9db4d0'))
        }
```

- [ ] **Step 5: 跑測試確認通過（含全 geometry 測試）**

Run: `npx vitest run src/geometry/`
Expected: PASS（新分段測試＋既有 hole/group/enclosure 測試全綠；若 `workerClient.test.ts` 對 payload 有形狀假設則一併修正）

- [ ] **Step 6: Commit**

```bash
git add src/geometry/protocol.ts src/geometry/evaluate.ts src/geometry/evaluate.test.ts src/geometry/worker.ts src/components/Viewport.tsx
git commit -m "feat: render per-block color segments in viewport pipeline"
```

---

### Task 8: presets 資料驅動重寫 + 工具列 preset 選單 + i18n

**Files:**
- Modify: `src/parts/presets.ts`（整檔重寫）
- Modify: `src/parts/presets.test.ts`（整檔重寫）
- Create: `src/components/CarPresetMenu.tsx`
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/i18n/zh.json`、`src/i18n/en.json`

**Interfaces:**
- Consumes: Tasks 3–6 的新零件定義（tt-motor 軸高 12、car-wheel、ball-caster-16、car-chassis-2wd 孔位）
- Produces:
  - `export interface CarPresetSpec { id: string; i18nKey: string; electronics: { partId: string; x: number; y: number; z: number; rotZ: number }[]; chassisPartId: string; chassisPosition: [number, number, number]; wheels: { partId: string; x: number; y: number }[]; caster?: { partId: string; x: number; y: number } }`
  - `export const SMART_CAR_2WD / SMART_CAR_4WD / CAR_PRESETS`
  - `export function buildCarNodes(spec: CarPresetSpec, lang: string): { nodes: SceneNode[]; defaultSelection: string[] }`
  - 舊匯出 `SMART_CAR_PRESET`/`buildSmartCarNodes`/`buildChassisAndWheels` 移除

- [ ] **Step 1: 整檔重寫 `src/parts/presets.test.ts`（失敗測試先行）**

```ts
import { describe, expect, it } from 'vitest';
import { partWorldBounds } from '../enclosure/plan';
import type { PartInstance } from '../enclosure/plan';
import { PART_LIBRARY, getPartDefinition } from './library';
import { CAR_PRESETS, SMART_CAR_2WD, SMART_CAR_4WD, buildCarNodes } from './presets';
import type { CarPresetSpec } from './presets';
import type { PartNode } from '../types/document';

function partsOf(spec: CarPresetSpec, lang = 'en') {
  const { nodes, defaultSelection } = buildCarNodes(spec, lang);
  const parts = nodes.filter((n): n is PartNode => n.type === 'part');
  return { nodes, defaultSelection, parts };
}

describe('CarPresetSpec 資料合法性', () => {
  it('兩款 preset 的所有 partId 都存在於 PART_LIBRARY', () => {
    const ids = new Set(PART_LIBRARY.map((p) => p.id));
    for (const spec of CAR_PRESETS) {
      const used = [
        ...spec.electronics.map((e) => e.partId),
        spec.chassisPartId,
        ...spec.wheels.map((w) => w.partId),
        ...(spec.caster ? [spec.caster.partId] : []),
      ];
      for (const id of used) expect(ids.has(id), `未知零件 id "${id}"`).toBe(true);
    }
  });

  it('電子件 rotZ 皆為 0（底盤孔位交叉對照與外殼計算的前提）', () => {
    for (const spec of CAR_PRESETS) {
      for (const e of spec.electronics) expect(e.rotZ).toBe(0);
    }
  });
});

describe('buildCarNodes：2WD', () => {
  it('10 個節點，位置/旋轉符合資料表', () => {
    const { parts } = partsOf(SMART_CAR_2WD, 'zh');
    expect(parts).toHaveLength(10);
    const at = (partId: string, y?: number) =>
      parts.find(
        (n) => n.partId === partId && (y === undefined || n.transform.position[1] === y),
      )!;
    expect(at('hc-sr04').transform.position).toEqual([105, 0, 20.5]);
    expect(at('arduino-uno').transform.position).toEqual([40, 0, 20.5]);
    expect(at('l298n').transform.position).toEqual([-25, 0, 20.5]);
    expect(at('battery-18650x2').transform.position).toEqual([-95, 0, 20.5]);
    expect(at('tt-motor', 81.25).transform.position).toEqual([-35, 81.25, 20.5]);
    expect(at('tt-motor', -81.25).transform.position).toEqual([-35, -81.25, 20.5]);
    expect(at('car-chassis-2wd').transform.position).toEqual([-3, 0, 17.5]);
    expect(at('car-wheel', 107.5).transform.position).toEqual([-15, 107.5, 0]);
    expect(at('car-wheel', -107.5).transform.position).toEqual([-15, -107.5, 0]);
    expect(at('ball-caster-16').transform.position).toEqual([95, 0, 0]);
    for (const n of parts) expect(n.transform.rotation).toEqual([0, 0, 0]);
  });

  it('defaultSelection＝底盤+2 輪+萬向輪（4 個），不含電子件', () => {
    const { parts, defaultSelection } = partsOf(SMART_CAR_2WD);
    expect(defaultSelection).toHaveLength(4);
    const selected = parts.filter((n) => defaultSelection.includes(n.id));
    expect(selected.map((n) => n.partId).sort()).toEqual(
      ['ball-caster-16', 'car-chassis-2wd', 'car-wheel', 'car-wheel'].sort(),
    );
  });

  it('名稱依語言（zh 用 nameZh）', () => {
    const { parts } = partsOf(SMART_CAR_2WD, 'zh');
    expect(parts.find((n) => n.partId === 'car-chassis-2wd')!.name).toBe('2WD 小車底盤');
    const en = partsOf(SMART_CAR_2WD, 'en');
    expect(en.parts.find((n) => n.partId === 'car-chassis-2wd')!.name).toBe('2WD Car Chassis');
  });
});

describe('buildCarNodes：4WD', () => {
  it('13 個節點：4 馬達 + 4 輪、無萬向輪，defaultSelection 5 個', () => {
    const { parts, defaultSelection } = partsOf(SMART_CAR_4WD);
    expect(parts).toHaveLength(13);
    expect(parts.filter((n) => n.partId === 'tt-motor')).toHaveLength(4);
    expect(parts.filter((n) => n.partId === 'car-wheel')).toHaveLength(4);
    expect(parts.find((n) => n.partId === 'ball-caster-16')).toBeUndefined();
    expect(defaultSelection).toHaveLength(5);
  });
});

describe('佈局無碰撞', () => {
  for (const spec of CAR_PRESETS) {
    it(`${spec.id}：3D AABB 兩兩不相交（貼面接觸合法）`, () => {
      const { parts } = partsOf(spec);
      const boxes = parts.map((n) =>
        partWorldBounds({ def: getPartDefinition(n.partId)!, transform: n.transform } as PartInstance),
      );
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          const overlapping = !(
            a.maxX <= b.minX ||
            b.maxX <= a.minX ||
            a.maxY <= b.minY ||
            b.maxY <= a.minY ||
            a.maxZ <= b.minZ ||
            b.maxZ <= a.minZ
          );
          expect(overlapping, `零件 #${i} 與 #${j} 的 3D AABB 重疊`).toBe(false);
        }
      }
    });
  }
});

describe('底盤孔位交叉對照', () => {
  it('底盤 standoff:false 孔＝2WD 電子件安裝孔的世界平移（雙向 drift 都抓）', () => {
    const chassisDef = getPartDefinition(SMART_CAR_2WD.chassisPartId)!;
    const [cx, cy] = [SMART_CAR_2WD.chassisPosition[0], SMART_CAR_2WD.chassisPosition[1]];
    const expected: { x: number; y: number; diameter: number }[] = [];
    for (const e of SMART_CAR_2WD.electronics) {
      const def = getPartDefinition(e.partId)!;
      for (const h of def.mountingHoles) {
        expected.push({ x: e.x + h.x - cx, y: e.y + h.y - cy, diameter: h.diameter });
      }
    }
    const actual = chassisDef.mountingHoles.filter((h) => h.standoff === false);
    expect(actual).toHaveLength(expected.length);
    for (const e of expected) {
      const hit = actual.find(
        (a) =>
          Math.abs(a.x - e.x) < 0.01 &&
          Math.abs(a.y - e.y) < 0.01 &&
          Math.abs(a.diameter - e.diameter) < 0.01,
      );
      expect(hit, `底盤缺少對應孔 (${e.x}, ${e.y}) Ø${e.diameter}`).toBeDefined();
    }
  });
});

describe('錯誤處理', () => {
  it('查無零件 id 時 throw', () => {
    const bad: CarPresetSpec = {
      ...SMART_CAR_2WD,
      electronics: [{ partId: 'no-such-part', x: 0, y: 0, z: 20.5, rotZ: 0 }],
    };
    expect(() => buildCarNodes(bad, 'en')).toThrow();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/parts/presets.test.ts`
Expected: FAIL（`CAR_PRESETS`/`buildCarNodes` 不存在）

- [ ] **Step 3: 整檔重寫 `src/parts/presets.ts`**

```ts
import { createPartNode } from '../types/document';
import { getPartDefinition } from './library';
import type { PartNode, SceneNode } from '../types/document';

export interface CarPresetElectronics {
  partId: string;
  x: number;
  y: number;
  z: number;
  rotZ: number;
}

export interface CarPresetGroundPart {
  partId: string;
  x: number;
  y: number;
}

/** 智能小車 preset 資料結構（design.md D9）。車頭朝 +X；輪/萬向輪貼地 z=0、電子件站底盤頂 */
export interface CarPresetSpec {
  id: string;
  i18nKey: string;
  /** 電子零件與馬達（站上底盤頂） */
  electronics: CarPresetElectronics[];
  chassisPartId: string;
  /** 底盤節點世界位置（底面中心） */
  chassisPosition: [number, number, number];
  /** 貼地車輪（z=0） */
  wheels: CarPresetGroundPart[];
  /** 貼地萬向輪（z=0）；4WD 無 */
  caster?: CarPresetGroundPart;
}

/** 底盤頂面＝馬達底面＝電子件底面；軸心 20.5+12=32.5＝輪心（design.md D1） */
const CHASSIS_TOP_Z = 20.5;

export const SMART_CAR_2WD: CarPresetSpec = {
  id: 'smart-car-2wd',
  i18nKey: 'toolbar.smartCar2wd',
  electronics: [
    { partId: 'hc-sr04', x: 105, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 }, // 車頭感測器
    { partId: 'arduino-uno', x: 40, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 }, // 中前控制板
    { partId: 'l298n', x: -25, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 }, // 中後驅動板
    { partId: 'battery-18650x2', x: -95, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 }, // 車尾電池
    { partId: 'tt-motor', x: -35, y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 }, // 左馬達（縱置，軸朝 +Y）
    { partId: 'tt-motor', x: -35, y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 }, // 右馬達（縱置，軸朝 -Y）
  ],
  chassisPartId: 'car-chassis-2wd',
  chassisPosition: [-3, 0, 17.5],
  wheels: [
    { partId: 'car-wheel', x: -15, y: 107.5 }, // 左輪（軸心對齊馬達軸 x=-35+20=-15）
    { partId: 'car-wheel', x: -15, y: -107.5 }, // 右輪
  ],
  caster: { partId: 'ball-caster-16', x: 95, y: 0 }, // 車頭萬向輪
};

export const SMART_CAR_4WD: CarPresetSpec = {
  id: 'smart-car-4wd',
  i18nKey: 'toolbar.smartCar4wd',
  // 電子件 XY 與 2WD 完全相同 → 共用同一底盤孔位（design.md D7）
  electronics: [
    { partId: 'hc-sr04', x: 105, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'arduino-uno', x: 40, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'l298n', x: -25, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'battery-18650x2', x: -95, y: 0, z: CHASSIS_TOP_Z, rotZ: 0 },
    { partId: 'tt-motor', x: 45, y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 }, // 前左
    { partId: 'tt-motor', x: 45, y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 }, // 前右
    { partId: 'tt-motor', x: -100, y: 81.25, z: CHASSIS_TOP_Z, rotZ: 0 }, // 後左
    { partId: 'tt-motor', x: -100, y: -81.25, z: CHASSIS_TOP_Z, rotZ: 0 }, // 後右
  ],
  chassisPartId: 'car-chassis-2wd',
  chassisPosition: [-3, 0, 17.5],
  wheels: [
    { partId: 'car-wheel', x: 65, y: 107.5 }, // 前輪軸 x=45+20
    { partId: 'car-wheel', x: 65, y: -107.5 },
    { partId: 'car-wheel', x: -80, y: 107.5 }, // 後輪軸 x=-100+20
    { partId: 'car-wheel', x: -80, y: -107.5 },
  ],
};

export const CAR_PRESETS: CarPresetSpec[] = [SMART_CAR_2WD, SMART_CAR_4WD];

function partName(partId: string, lang: string): string {
  const def = getPartDefinition(partId);
  if (!def) throw new Error(`car-preset: unknown part id "${partId}"`);
  return lang === 'zh' ? def.nameZh : def.name;
}

/**
 * 由 preset 組整車節點。defaultSelection＝貼地結構組（底盤+輪+萬向輪）：
 * 外殼地板跟隨最低被選件底面，選貼地組才能讓「產生外殼」得到落地展示盒（design.md D10）。
 */
export function buildCarNodes(
  spec: CarPresetSpec,
  lang: string,
): { nodes: SceneNode[]; defaultSelection: string[] } {
  const electronics: PartNode[] = spec.electronics.map(({ partId, x, y, z, rotZ }) =>
    createPartNode(partId, partName(partId, lang), {
      transform: { position: [x, y, z], rotation: [0, 0, rotZ], scale: [1, 1, 1] },
    }),
  );

  const chassis = createPartNode(spec.chassisPartId, partName(spec.chassisPartId, lang), {
    transform: { position: spec.chassisPosition, rotation: [0, 0, 0], scale: [1, 1, 1] },
  });

  const ground: PartNode[] = spec.wheels.map(({ partId, x, y }) =>
    createPartNode(partId, partName(partId, lang), {
      transform: { position: [x, y, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    }),
  );
  if (spec.caster) {
    ground.push(
      createPartNode(spec.caster.partId, partName(spec.caster.partId, lang), {
        transform: {
          position: [spec.caster.x, spec.caster.y, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      }),
    );
  }

  return {
    nodes: [...electronics, chassis, ...ground],
    defaultSelection: [chassis.id, ...ground.map((n) => n.id)],
  };
}
```

- [ ] **Step 4: 建立 `src/components/CarPresetMenu.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { CAR_PRESETS, buildCarNodes } from '../parts/presets';
import { useDocumentStore } from '../store/documentStore';
import { Dialog, OutlineButton } from './ui';

export function CarPresetMenu({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const addNodes = useDocumentStore((s) => s.addNodes);
  const setSelection = useDocumentStore((s) => s.setSelection);

  return (
    <Dialog title={t('toolbar.smartCar')} onClose={onClose} width="w-72">
      <div className="flex flex-col gap-1.5">
        {CAR_PRESETS.map((spec) => (
          <OutlineButton
            key={spec.id}
            className="w-full"
            onClick={() => {
              const { nodes, defaultSelection } = buildCarNodes(spec, i18n.language);
              addNodes(nodes);
              setSelection(defaultSelection);
              onClose();
            }}
          >
            {t(spec.i18nKey)}
          </OutlineButton>
        ))}
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 5: 修改 `src/components/Toolbar.tsx`**

- import 區塊：移除 `import { buildChassisAndWheels, buildSmartCarNodes } from '../parts/presets';`，加入 `import { CarPresetMenu } from './CarPresetMenu';`
- state 區塊加：`const [showCarMenu, setShowCarMenu] = useState(false);`
- Car 按鈕整段改為：

```tsx
        <IconButton title={t('toolbar.smartCar')} onClick={() => setShowCarMenu(true)}>
          <Car size={18} strokeWidth={1.8} />
        </IconButton>
```

- 底部 dialog 區塊加一行（與 showTools 並列）：

```tsx
      {showCarMenu && <CarPresetMenu onClose={() => setShowCarMenu(false)} />}
```

- [ ] **Step 6: i18n 新鍵**

`src/i18n/zh.json` 的 `toolbar` 區塊，`"smartCar"` 之後加：

```json
    "smartCar": "智能小車",
    "smartCar2wd": "智能小車 2WD",
    "smartCar4wd": "智能小車 4WD"
```

`src/i18n/en.json` 對應：

```json
    "smartCar": "Smart Car",
    "smartCar2wd": "Smart Car 2WD",
    "smartCar4wd": "Smart Car 4WD"
```

- [ ] **Step 7: 確認舊 API 無殘留引用 + 跑測試**

Run: `rg "buildSmartCarNodes|buildChassisAndWheels|SMART_CAR_PRESET" src` — Expected: 無輸出（僅允許出現在 git 歷史）
Run: `npx vitest run src/parts/presets.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/parts/presets.ts src/parts/presets.test.ts src/components/CarPresetMenu.tsx src/components/Toolbar.tsx src/i18n/zh.json src/i18n/en.json
git commit -m "feat: rewrite smart-car presets with physical layout, 4WD variant and picker menu"
```

---

### Task 9: 外殼整合測試（貼地組 → 落地展示盒）

**Files:**
- Create: `src/enclosure/carPresetEnclosure.test.ts`

**Interfaces:**
- Consumes: Task 8 `buildCarNodes`/`SMART_CAR_2WD`、Task 1 `planStandoffs` 過濾、Task 6 底盤（4 角孔 topZ=17.5）
- Produces: 無新程式碼（純整合測試）

- [ ] **Step 1: 寫整合測試**

Create `src/enclosure/carPresetEnclosure.test.ts`：

```ts
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
```

- [ ] **Step 2: 跑測試確認通過**

Run: `npx vitest run src/enclosure/carPresetEnclosure.test.ts`
Expected: PASS（若失敗：檢查 Task 8 佈局常數或 Task 1 過濾邏輯，勿放寬斷言）

- [ ] **Step 3: Commit**

```bash
git add src/enclosure/carPresetEnclosure.test.ts
git commit -m "test: verify ground-group selection yields floor-grounded car enclosure"
```

---

### Task 10: 全量驗證

**Files:** 無（純驗證）

- [ ] **Step 1: 全量單元測試**

Run: `npm test`
Expected: 全部 PASS（含既有全部測試；若 `workerClient.test.ts`、`capabilities.test.ts` 等因 payload/schema 變動失敗，修正對接處而非放寬斷言）

- [ ] **Step 2: 型別檢查 + 建置**

Run: `npm run build`
Expected: `tsc --noEmit` 無錯誤、vite build 成功

- [ ] **Step 3: e2e（如本機已裝 Playwright 瀏覽器）**

Run: `npm run test:e2e`
Expected: `e2e/smoke.spec.ts` PASS（該測試不觸及小車選單，用於確認無回歸；若環境缺瀏覽器則記錄略過）

- [ ] **Step 4: 手動 smoke（dev server）視覺確認**

`npm run dev` 開啟後：工具列 Car 按鈕 → 選單出現 2WD/4WD → 生成 2WD：輪子貼地、雙色（深胎/淺轂）、馬達軸插入輪轂、底盤圓角板、車頭萬向輪；預設選取 4 個貼地件 → 直接「產生外殼」得到落地展示盒（地板 z=-3、4 根支柱頂住底盤）。此步驟為人工確認，無自動化斷言。

---

## Self-Review 結果（撰寫時已完成）

- **Spec coverage**：D1 Z 軸→Task 3/8；D2 color→Task 1/2/7；D3 standoff→Task 1/6/9；D4 tt-motor→Task 3；D5 car-wheel→Task 4；D6 caster→Task 5；D7 chassis+cornerRadius→Task 1/2/6；D8 色段管線→Task 2/7；D9 preset 架構→Task 8；D10 預設選取→Task 8/9；D11 選單+i18n→Task 8。測試策略 1–11 全數對應（3D AABB→Task 8、交叉對照→Task 8、rotation-aware clearanceHeight→Task 3、e2e→Task 10）。
- **Type consistency**：`PartSegment`、`buildPartColoredSegments`、`CarPresetSpec`、`buildCarNodes`、`EvaluatedNode.color`、`NodeMeshPayload.color` 各 Task 引用一致。
