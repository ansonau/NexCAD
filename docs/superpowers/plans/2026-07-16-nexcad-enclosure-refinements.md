# NexCAD 外殼生成器精修（Plan 4/6）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正接口開孔垂直位置、支援多選零件指定外殼範圍、支柱參數可調、外殼參數事後可改、螺絲柱根部補強倒角。

**Architecture:** 純數學規劃（`src/enclosure/plan.ts`）→ kernel 幾何（`shellGeometry.ts`/`portProjection.ts`）→ worker-safe 組裝（`generate.ts`）→ store 層（`actions.ts`）→ UI（`EnclosurePanel.tsx`/`PropertyCard.tsx`）。本計畫沿此分層由內而外修改。

**Tech Stack:** React 19 + TypeScript (strict) + Vite、manifold-3d WASM（Web Worker）、Zustand、Vitest、zod、i18next。

## Global Constraints

- `src/enclosure/` 除 `actions.ts` 外不得 import store/zustand/react（worker-safe，`generate.ts` 的 import 鏈全域適用）。
- i18n zh/en key 必須對等（`src/i18n/resources.test.ts` 強制）；任何新 key 兩邊都要加。
- `EnclosureParams`（`src/types/document.ts`）任何欄位變動必須同步 `src/persistence/nexcadFile.ts` 的 zod schema 並加 round-trip 回歸測試。
- 新參數一律向後相容（zod default / optional），不做資料遷移。
- 測試模式：kernel 幾何用體積與 probe box 交集斷言（參考 `src/enclosure/shellGeometry.test.ts` 的 `intersectionVolume` 寫法）；store 邏輯用 `useDocumentStore.getState()` 直測。
- 每個 kernel 測試檔開頭 `const kernel = new ManifoldKernel(); beforeAll(async () => { await kernel.init(); });`（既有慣例）。

---

### Task 1: 接口開孔垂直位置修正

**Files:**
- Modify: `src/enclosure/portProjection.ts:78`（`v` 公式）
- Modify: `src/parts/schema.ts:32`（`port.z` 註解）
- Test: `src/enclosure/portProjection.test.ts`（新增一測試；既有測試若 pin 舊 `v` 值需同步更新）

**Interfaces:**
- Consumes: `PartInstance`（`./plan`）、`partPortSchema`（`../parts/schema`）
- Produces: `PortCutoutPlan.v` 語意改為「開孔中心 = 零件頂面 + port.z + port.h/2」；`port.z` 語意定案為「接口底邊距主體頂面的高度」。下游 `cutPorts` 介面不變。

**背景。** `src/parts/schema.ts` 註解稱 `port.z` 為「自主體頂面起算的垂直偏移」，庫資料（Arduino USB `z: 0, h: 5`）符合「z = 接口底邊」直覺。但 `planPortCutouts` 算出 `v = pz + bodyT + port.z` 後，`cutPorts` 把 `v` 當開孔中心（`position z = v - h/2`），開孔實際下移半個接口高。

- [ ] **Step 1: 寫失敗測試（加入 `src/enclosure/portProjection.test.ts` 的 describe 內）**

先讀該測試檔既有 fixture 寫法（自建 `PartDefinition` 物件），沿用同一 helper。新增：

```ts
it('開孔中心 = 零件頂面 + port.z + port.h/2（port.z 為接口底邊）', () => {
  const part: PartInstance = {
    def: makeDef({
      body: { size: [40, 20, 1.6], blocks: [] },
      ports: [{ face: 'west', shape: 'rect', x: 0, z: 2, w: 8, h: 6 }],
    }),
    transform: { position: [0, 0, 5], rotation: [0, 0, 0], scale: [1, 1, 1] },
  };
  const cutouts = planPortCutouts([part]);
  expect(cutouts).toHaveLength(1);
  // 頂面 = 5 + 1.6 = 6.6；底邊 = 6.6 + 2 = 8.6；中心 = 8.6 + 3 = 11.6
  expect(cutouts[0].v).toBeCloseTo(11.6);
});
```

（`makeDef` 若不存在，比照檔內既有 fixture 建構方式內聯完整物件——`PartDefinition` 必填欄位見 `src/parts/schema.ts`，不足欄位補 `id/name/nameZh/category/mountingHoles/clearanceHeight` 的合法假值。）

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/portProjection.test.ts`
Expected: FAIL — 新測試收到 `v = 8.6`（舊公式），期望 `11.6`。

- [ ] **Step 3: 修正 `planPortCutouts`**

`src/enclosure/portProjection.ts` 第 78 行：

```ts
        v: pz + bodyT + port.z + port.h / 2,
```

同檔 `PortCutoutPlan.v` 的 JSDoc 已寫「開孔中心」，不用改。

- [ ] **Step 4: 修正 schema 註解**

`src/parts/schema.ts` 第 32 行註解改為：

```ts
  /** 接口底邊距主體頂面的高度（top 面時為板面 y 偏移） */
```

- [ ] **Step 5: 檢查既有測試對 `v` 的斷言**

Run: `npx vitest run src/enclosure/portProjection.test.ts`

若既有測試因 pin 舊 `v` 值而失敗：逐一改為新語意的期望值（頂面 + z + h/2），不得放寬斷言。全數通過後續行。

- [ ] **Step 6: 全套件驗證**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 全綠。

- [ ] **Step 7: Commit**

```bash
git add src/enclosure/portProjection.ts src/enclosure/portProjection.test.ts src/parts/schema.ts
git commit -m "fix: center port cutouts on connector height (port.z = bottom edge)"
```

---

### Task 2: 多選零件指定外殼範圍（store 層）

**Files:**
- Modify: `src/enclosure/actions.ts:38-46`（`generateEnclosure`）
- Test: `src/enclosure/actions.test.ts`（追加）

**Interfaces:**
- Consumes: `useDocumentStore.getState().selection: string[]`、既有 `collectPartSnapshots(nodes)`
- Produces: `generateEnclosure(params)` 行為改為——selection 內含 ≥1 個 part 節點時只包含那些 part；否則包含全部可見零件。簽名不變。

- [ ] **Step 1: 寫失敗測試（加入 `src/enclosure/actions.test.ts` 的 describe 內，沿用檔內既有 store 重置與零件節點建構寫法）**

```ts
it('選取中含 part 節點時，外殼只包含選取的零件', () => {
  const store = useDocumentStore.getState();
  const a = createPartNode('arduino-uno', 'A');
  const b = createPartNode('arduino-nano', 'B');
  store.addNode(a);
  store.addNode(b);
  store.setSelection([a.id]);
  generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
  const enclosures = useDocumentStore
    .getState()
    .doc.nodes.filter((n) => n.type === 'enclosure');
  expect(enclosures.length).toBeGreaterThan(0);
  for (const e of enclosures) {
    if (e.type !== 'enclosure') continue;
    expect(e.sourceParts.map((s) => s.nodeId)).toEqual([a.id]);
  }
});

it('選取中無 part 節點時，外殼包含全部可見零件', () => {
  const store = useDocumentStore.getState();
  const a = createPartNode('arduino-uno', 'A');
  const b = createPartNode('arduino-nano', 'B');
  store.addNode(a);
  store.addNode(b);
  store.setSelection([]);
  generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
  const base = useDocumentStore
    .getState()
    .doc.nodes.find((n) => n.type === 'enclosure');
  expect(base && base.type === 'enclosure' ? base.sourceParts : []).toHaveLength(2);
});
```

（import 依檔內既有：`createPartNode` 來自 `../types/document`、`DEFAULT_ENCLOSURE_PARAMS` 來自 `./plan`。注意 `addNode` 會把 selection 設為新節點，所以第二個測試要在加完後明確 `setSelection([])`。）

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/actions.test.ts`
Expected: 第一個新測試 FAIL（sourceParts 含兩個零件）。

- [ ] **Step 3: 修改 `generateEnclosure`**

```ts
/**
 * 產生外殼（base，以及非 open 時的 lid）。
 * selection 內含 part 節點時只包含選取的零件；否則包含全部可見零件。無零件時不動作。
 */
export function generateEnclosure(params: EnclosureParams): void {
  const store = useDocumentStore.getState();
  const all = collectPartSnapshots(store.doc.nodes);
  const selectedIds = new Set(store.selection);
  const selected = all.filter((s) => selectedIds.has(s.nodeId));
  const sourceParts = selected.length > 0 ? selected : all;
  if (sourceParts.length === 0) return;
  store.addNode(makeEnclosureNode('base', params, sourceParts));
  if (params.lidType !== 'open') {
    store.addNode(makeEnclosureNode('lid', params, sourceParts));
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/actions.test.ts`
Expected: PASS（既有 + 新增 2）。

- [ ] **Step 5: Commit**

```bash
git add src/enclosure/actions.ts src/enclosure/actions.test.ts
git commit -m "feat: scope enclosure to selected parts when selection contains parts"
```

---

### Task 3: EnclosurePanel 顯示包含範圍

**Files:**
- Modify: `src/components/EnclosurePanel.tsx`
- Modify: `src/i18n/zh.json`、`src/i18n/en.json`（`enclosure` 區塊）

**Interfaces:**
- Consumes: `useDocumentStore((s) => s.selection)`、`useDocumentStore((s) => s.doc)`、Task 2 的範圍規則
- Produces: 純 UI，無程式介面。

- [ ] **Step 1: i18n key**

`src/i18n/zh.json` 的 `"enclosure"` 區塊內加：

```json
    "scopeSelected": "將包含選取的 {{count}} 個零件",
    "scopeAll": "將包含全部 {{count}} 個可見零件",
```

`src/i18n/en.json` 對應：

```json
    "scopeSelected": "Will include {{count}} selected part(s)",
    "scopeAll": "Will include all {{count}} visible part(s)",
```

- [ ] **Step 2: 執行 i18n 對等測試**

Run: `npx vitest run src/i18n/resources.test.ts`
Expected: PASS。

- [ ] **Step 3: 修改 `EnclosurePanel.tsx`**

component 頂部（`const [params, setParams] = ...` 之後）加：

```tsx
  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const allParts = collectVisibleParts(doc.nodes);
  const selectedParts = allParts.filter((id) => selection.includes(id));
  const scopeCount = selectedParts.length > 0 ? selectedParts.length : allParts.length;
  const scopeKey = selectedParts.length > 0 ? 'enclosure.scopeSelected' : 'enclosure.scopeAll';
```

檔案底部加 helper（與 `actions.ts` 的 `collectPartSnapshots` 同邏輯但只回傳 id；不 import actions 私有函數）：

```tsx
function collectVisibleParts(nodes: SceneNode[]): string[] {
  const out: string[] = [];
  const visit = (list: SceneNode[]) => {
    for (const n of list) {
      if (!n.visible) continue;
      if (n.type === 'part') out.push(n.id);
      else if (n.type === 'group') visit(n.children);
    }
  };
  visit(nodes);
  return out;
}
```

（頂部補 `import type { SceneNode } from '../types/document';`）

按鈕列（`<div className="flex justify-end gap-2">`）**上方**插入：

```tsx
        <p className="mb-3 text-xs text-slate-500">{t(scopeKey, { count: scopeCount })}</p>
```

同時 `generate` 函數內的 `hasParts` 檢查改用新 helper（順帶修掉 Plan 3 遺留的「不遞迴群組」缺口）：

```tsx
  const generate = () => {
    if (allParts.length === 0) {
      useToastStore.getState().show(t('enclosure.noParts'));
      return;
    }
    generateEnclosure(params);
    onClose();
  };
```

- [ ] **Step 4: 全套件 + 建置**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠。

- [ ] **Step 5: Commit**

```bash
git add src/components/EnclosurePanel.tsx src/i18n
git commit -m "feat: show enclosure part scope in panel and fix group recursion in noParts check"
```

---

### Task 4: EnclosureParams 擴充（支柱參數）

**Files:**
- Modify: `src/types/document.ts`（`EnclosureParams`）
- Modify: `src/enclosure/plan.ts`（`DEFAULT_ENCLOSURE_PARAMS`、`planStandoffs`、`planCornerPosts`）
- Modify: `src/enclosure/shellGeometry.ts`（`buildShellSolid` 簽名）
- Modify: `src/enclosure/generate.ts`（傳遞新參數）
- Modify: `src/persistence/nexcadFile.ts`（zod schema）
- Test: `src/enclosure/plan.test.ts`、`src/enclosure/shellGeometry.test.ts`、`src/persistence/nexcadFile.test.ts`（各追加）

**Interfaces:**
- Consumes: 既有 `EnclosureParams`、`SCREW_TABLE`
- Produces:
  - `EnclosureParams` 新增 `standoffWallPadding: number`（支柱半徑 = 導孔半徑 + 此值）與 `pilotDepthOverride?: number`（空 = 查表預設 6mm）。
  - `planStandoffs(parts: PartInstance[], screwSize: ScrewSize, pilotDepth?: number): StandoffPlan[]`（省略 = 6）。
  - `planCornerPosts(plan: ShellPlan, screwSize: ScrewSize, pilotDepth?: number): StandoffPlan[]`（省略 = 6）。
  - `buildShellSolid(plan: ShellPlan, wallThickness: number, standoffs: StandoffPlan[], kernel: GeometryKernel, standoffWallPadding?: number): Solid`（省略 = wallThickness）。

- [ ] **Step 1: 型別與預設值**

`src/types/document.ts` 的 `EnclosureParams`（第 41-47 行）改為：

```ts
export interface EnclosureParams {
  wallThickness: number;
  clearanceMargin: number;
  cornerRadius: number;
  lidType: 'screw' | 'slide' | 'open';
  screwSize: ScrewSizeLiteral;
  /** 支柱半徑 = 導孔半徑 + 此值 */
  standoffWallPadding: number;
  /** 自攻導孔深度；未設定時用查表預設（6mm） */
  pilotDepthOverride?: number;
}
```

`src/enclosure/plan.ts` 的 `DEFAULT_ENCLOSURE_PARAMS` 加 `standoffWallPadding: 2,`（= 預設壁厚）。

- [ ] **Step 2: 寫失敗測試（`src/enclosure/plan.test.ts` 追加）**

```ts
it('planStandoffs 可覆寫導孔深度', () => {
  const parts = [fixturePart()]; // 沿用檔內既有 fixture helper 名稱
  const standoffs = planStandoffs(parts, 'M3', 9);
  expect(standoffs.every((s) => s.pilotDepth === 9)).toBe(true);
});

it('planCornerPosts 可覆寫導孔深度', () => {
  const plan = planShell([fixturePart()], DEFAULT_ENCLOSURE_PARAMS);
  const posts = planCornerPosts(plan, 'M3', 9);
  expect(posts.every((p) => p.pilotDepth === 9)).toBe(true);
});
```

（`fixturePart` 為佔位名——用該測試檔實際既有的零件 fixture 建構方式。）

Run: `npx vitest run src/enclosure/plan.test.ts`
Expected: FAIL — 函數不接受第三參數（tsc 或 runtime）。

- [ ] **Step 3: 修改 `plan.ts`**

```ts
export function planStandoffs(
  parts: PartInstance[],
  screwSize: ScrewSize,
  pilotDepth: number = PILOT_DEPTH,
): StandoffPlan[] {
```

迴圈內 `pilotDepth: PILOT_DEPTH,` 改 `pilotDepth,`。`planCornerPosts` 同樣加第三參數並使用之。

- [ ] **Step 4: 寫失敗測試（`src/enclosure/shellGeometry.test.ts` 追加）**

```ts
it('standoffWallPadding 增大時支柱更粗、總體積更大', () => {
  const plan = planShell([fixturePart()], DEFAULT_ENCLOSURE_PARAMS);
  const standoffs = planStandoffs([fixturePart()], 'M3');
  const thin = buildShellSolid(plan, 2, standoffs, kernel, 1.5);
  const thick = buildShellSolid(plan, 2, standoffs, kernel, 4);
  expect(kernel.volume(thick)).toBeGreaterThan(kernel.volume(thin));
});
```

Run: `npx vitest run src/enclosure/shellGeometry.test.ts`
Expected: FAIL — 第五參數不存在，兩者體積相等。

- [ ] **Step 5: 修改 `shellGeometry.ts`**

```ts
export function buildShellSolid(
  plan: ShellPlan,
  wallThickness: number,
  standoffs: StandoffPlan[],
  kernel: GeometryKernel,
  standoffWallPadding: number = wallThickness,
): Solid {
```

第 45 行 `const standoffRadius = s.pilotDiameter / 2 + wallThickness;` 改：

```ts
    const standoffRadius = s.pilotDiameter / 2 + standoffWallPadding;
```

- [ ] **Step 6: 串接 `generate.ts`**

`buildEnclosureNodeSolid` 內：

```ts
  const pilotDepth = node.params.pilotDepthOverride;
  const standoffs = [
    ...planStandoffs(parts, node.params.screwSize, pilotDepth),
    ...(node.params.lidType === 'screw'
      ? planCornerPosts(plan, node.params.screwSize, pilotDepth)
      : []),
  ];
  let shell = buildShellSolid(
    plan,
    node.params.wallThickness,
    standoffs,
    kernel,
    node.params.standoffWallPadding,
  );
```

（`pilotDepthOverride` 為 undefined 時交由預設參數處理——`planStandoffs(parts, size, undefined)` 會落到 `PILOT_DEPTH`。）

- [ ] **Step 7: zod schema + round-trip 測試**

`src/persistence/nexcadFile.ts` 的 `enclosureNodeSchema.params` 物件加兩欄，並用 transform 補舊檔預設（舊檔無 `standoffWallPadding` 時 = 該檔的 `wallThickness`）：

```ts
  params: z
    .object({
      wallThickness: z.number(),
      clearanceMargin: z.number(),
      cornerRadius: z.number(),
      lidType: z.enum(['screw', 'slide', 'open']),
      screwSize: z.enum(['M2', 'M2.5', 'M3', 'M4']),
      standoffWallPadding: z.number().optional(),
      pilotDepthOverride: z.number().positive().optional(),
    })
    .transform((p) => ({ ...p, standoffWallPadding: p.standoffWallPadding ?? p.wallThickness })),
```

`src/persistence/nexcadFile.test.ts` 追加：

```ts
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
```

既有的「含 enclosure 節點 round-trip」測試 fixture 也要補 `standoffWallPadding`（tsc 會直接指出）。

- [ ] **Step 8: 全套件驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠。tsc 若指出其他 `EnclosureParams` 字面值缺欄位（如 `EnclosurePanel` 的 DEFAULT 已含、測試 fixture 未含），逐一補 `standoffWallPadding`。

- [ ] **Step 9: Commit**

```bash
git add src/types/document.ts src/enclosure src/persistence
git commit -m "feat: add adjustable standoff wall padding and pilot depth override"
```

---

### Task 5: EnclosurePanel 進階區塊 UI

**Files:**
- Modify: `src/components/EnclosurePanel.tsx`
- Modify: `src/i18n/zh.json`、`src/i18n/en.json`

**Interfaces:**
- Consumes: Task 4 的 `EnclosureParams` 新欄位
- Produces: 純 UI。

- [ ] **Step 1: i18n key**

zh `enclosure` 區塊加：

```json
    "advanced": "進階",
    "standoffWallPadding": "支柱壁厚 (mm)",
    "pilotDepthOverride": "導孔深度 (mm，空=自動)",
```

en 對應：

```json
    "advanced": "Advanced",
    "standoffWallPadding": "Standoff wall padding (mm)",
    "pilotDepthOverride": "Pilot depth (mm, blank = auto)",
```

- [ ] **Step 2: 修改 `EnclosurePanel.tsx`**

`useState` 區加壁厚連動旗標（使用者沒動過支柱壁厚時，跟著壁厚走）：

```tsx
  const [paddingTouched, setPaddingTouched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
```

`set('wallThickness', v)` 的呼叫處（NumberField onChange）改為：

```tsx
            onChange={(v) =>
              setParams((p) => ({
                ...p,
                wallThickness: v,
                standoffWallPadding: paddingTouched ? p.standoffWallPadding : v,
              }))
            }
```

螺絲規格 select 之後、按鈕列之前插入進階區塊：

```tsx
        <button
          onClick={() => setAdvancedOpen((o) => !o)}
          className="mb-2 text-xs text-slate-500 underline"
        >
          {t('enclosure.advanced')}
        </button>
        {advancedOpen && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <NumberField
              label={t('enclosure.standoffWallPadding')}
              value={params.standoffWallPadding}
              onChange={(v) => {
                setPaddingTouched(true);
                set('standoffWallPadding', v);
              }}
            />
            <OptionalNumberField
              label={t('enclosure.pilotDepthOverride')}
              value={params.pilotDepthOverride}
              onChange={(v) => set('pilotDepthOverride', v)}
            />
          </div>
        )}
```

檔案底部加 `OptionalNumberField`（空字串 = undefined）：

```tsx
function OptionalNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="number"
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
        value={draft ?? (value === undefined ? '' : value)}
        min={0.5}
        step={0.5}
        onFocus={() => setDraft(value === undefined ? '' : String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          if (e.target.value === '') {
            onChange(undefined);
            return;
          }
          const v = Number.parseFloat(e.target.value);
          if (!Number.isNaN(v) && v > 0) onChange(v);
        }}
      />
    </label>
  );
}
```

- [ ] **Step 3: 驗證 + 手動確認**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠。

瀏覽器（dev server port 5174）：開產生外殼面板 → 點「進階」→ 兩欄出現；改壁厚 → 支柱壁厚跟著變；手動改支柱壁厚後再改壁厚 → 支柱壁厚不再連動。

- [ ] **Step 4: Commit**

```bash
git add src/components/EnclosurePanel.tsx src/i18n
git commit -m "feat: advanced standoff options in enclosure panel"
```

---

### Task 6: PropertyCard 外殼參數事後可改

**Files:**
- Modify: `src/components/PropertyCard.tsx`
- Modify: `src/i18n/zh.json`、`src/i18n/en.json`

**Interfaces:**
- Consumes: `regenerateEnclosure(nodeId)`（`../enclosure/actions`）、`updateNode`、Task 4 的 `EnclosureParams`
- Produces: 純 UI。變更任一參數 = `updateNode` 寫入 params + `regenerateEnclosure` 重算幾何。

- [ ] **Step 1: i18n key**

zh `enclosure` 區塊加：

```json
    "params": "外殼參數",
```

en：

```json
    "params": "Enclosure parameters",
```

- [ ] **Step 2: 修改 `PropertyCard.tsx`**

`node.type === 'enclosure'` 的區塊（現只有重新產生按鈕）改為按鈕 + 參數表單：

```tsx
      {node.type === 'enclosure' && (
        <>
          <button
            onClick={() => regenerateEnclosure(node.id)}
            className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw size={16} />
            {t('enclosure.regenerate')}
          </button>
          <EnclosureParamFields node={node} />
        </>
      )}
```

檔案內新增 component（放在 `ParamFields` 之後）：

```tsx
function EnclosureParamFields({ node }: { node: EnclosureNode }) {
  const { t } = useTranslation();
  const updateNode = useDocumentStore((s) => s.updateNode);

  const setParam = <K extends keyof EnclosureParams>(key: K, value: EnclosureParams[K]) => {
    updateNode(node.id, (n) => {
      if (n.type === 'enclosure') n.params = { ...n.params, [key]: value };
    });
    regenerateEnclosure(node.id);
  };

  const p = node.params;
  return (
    <>
      <p className="mb-1 mt-3 text-xs text-slate-400">{t('enclosure.params')}</p>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={t('enclosure.wallThickness')}
          value={p.wallThickness}
          min={0.5}
          onChange={(v) => setParam('wallThickness', v)}
        />
        <NumberField
          label={t('enclosure.clearanceMargin')}
          value={p.clearanceMargin}
          min={0}
          onChange={(v) => setParam('clearanceMargin', v)}
        />
        <NumberField
          label={t('enclosure.cornerRadius')}
          value={p.cornerRadius}
          min={0}
          onChange={(v) => setParam('cornerRadius', v)}
        />
        <NumberField
          label={t('enclosure.standoffWallPadding')}
          value={p.standoffWallPadding}
          min={0.5}
          onChange={(v) => setParam('standoffWallPadding', v)}
        />
      </div>
      <label className="mt-2 block">
        <span className="text-xs text-slate-400">{t('enclosure.lidType')}</span>
        <select
          className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
          value={p.lidType}
          onChange={(e) => setParam('lidType', e.target.value as EnclosureParams['lidType'])}
        >
          <option value="screw">{t('enclosure.lidScrew')}</option>
          <option value="slide">{t('enclosure.lidSlide')}</option>
          <option value="open">{t('enclosure.lidOpen')}</option>
        </select>
      </label>
      <label className="mt-2 block">
        <span className="text-xs text-slate-400">{t('enclosure.screwSize')}</span>
        <select
          className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
          value={p.screwSize}
          onChange={(e) => setParam('screwSize', e.target.value as EnclosureParams['screwSize'])}
        >
          {(['M2', 'M2.5', 'M3', 'M4'] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
```

頂部 import 補：`import type { EnclosureNode, EnclosureParams, PrimitiveNode, SceneNode } from '../types/document';`。

（`pilotDepthOverride` 不放 PropertyCard——進階參數留在生成面板即可，事後要改可重新生成；避免卡片過長。`updateNode` 每次變更為一步 undo，`regenerateEnclosure` 內的 `updateNode` 會再一步——與屬性欄逐鍵 undo 的既有取捨一致，可接受。）

- [ ] **Step 3: 驗證 + 手動確認**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠。

瀏覽器：產生外殼 → 選取底座 → 卡片出現參數表單 → 改壁厚 3 → 幾何即時變厚；改 lidType 為 open（在 base 上）→ 四角螺絲柱消失；選取上蓋改參數 → 只影響上蓋。無 console 錯誤。

- [ ] **Step 4: Commit**

```bash
git add src/components/PropertyCard.tsx src/i18n
git commit -m "feat: edit enclosure params in property card with live regeneration"
```

---

### Task 7: 螺絲柱根部補強倒角

**Files:**
- Modify: `src/enclosure/shellGeometry.ts`（standoff 迴圈）
- Test: `src/enclosure/shellGeometry.test.ts`（追加）

**Interfaces:**
- Consumes: `kernel.cone(radiusBottom, radiusTop, height)`（底面中心原點，見 `manifoldKernel.ts`）
- Produces: `buildShellSolid` 內部行為——每支柱根部多一圈 45° 倒角環。簽名不變。

- [ ] **Step 1: 寫失敗測試（`src/enclosure/shellGeometry.test.ts` 追加，沿用檔內 `intersectionVolume` probe 寫法）**

```ts
it('支柱根部有 45° 倒角環（斜面內側實心、上方外側空心）', () => {
  const plan = planShell([fixturePart()], DEFAULT_ENCLOSURE_PARAMS);
  const standoffs = planStandoffs([fixturePart()], 'M3');
  const wall = 2;
  const solid = buildShellSolid(plan, wall, standoffs, kernel);
  const s = standoffs[0];
  const postRadius = s.pilotDiameter / 2 + wall;
  const rootZ = Math.max(plan.inner.minZ, plan.floorZ);
  // 倒角環斜面中點：半徑 postRadius + wall*0.5、高 rootZ + wall*0.25 → 應為實心
  const inside = probeAt(s.x + postRadius + wall * 0.25, s.y, rootZ + wall * 0.25);
  expect(intersectionVolume(solid, inside)).toBeGreaterThan(0);
  // 同半徑、高於倒角環頂（rootZ + wall*1.5）→ 柱外應為空
  const above = probeAt(s.x + postRadius + wall * 0.25, s.y, rootZ + wall * 1.5);
  expect(intersectionVolume(solid, above)).toBe(0);
});
```

（`probeAt(x, y, z)` = 以該點為中心的 0.5mm 立方 probe；照檔內既有寫法建構，若無現成 helper 就內聯 `kernel.transform(kernel.box(0.5, 0.5, 0.5), { position: [x - 0.25, y - 0.25, z], ... })`——注意 `kernel.box` 原點在底面中心，x/y 已是中心、z 是底面。）

Run: `npx vitest run src/enclosure/shellGeometry.test.ts`
Expected: FAIL — 第一個 probe 交集體積 0（無倒角）。

- [ ] **Step 2: 實作倒角環**

`buildShellSolid` 的 standoff 迴圈內，`shell = kernel.union(shell, post);` 之後、pilot 段之前插入：

```ts
    // 3D 列印支柱根部為層間剝離高風險點：加 45° 倒角環（圓錐台）分散應力。
    // 貼在內腔地板（低於地板的部分本來就是實心底板，放 floorZ 只會被吸收）。
    const chamferBase = Math.max(plan.inner.minZ, plan.floorZ);
    const chamfer = kernel.transform(
      kernel.cone(standoffRadius + wallThickness, standoffRadius, wallThickness),
      { position: [s.x, s.y, chamferBase], ...noRotScale },
    );
    shell = kernel.union(shell, chamfer);
```

（pilot difference 在倒角之後執行，導孔若與倒角重疊仍會正確貫穿。）

- [ ] **Step 3: 執行測試確認通過**

Run: `npx vitest run src/enclosure/shellGeometry.test.ts`
Expected: PASS（既有 + 新增）。若既有體積斷言（如「加支柱後體積增加」）數值仍成立則不動；若有 pin 精確體積的測試需按新幾何更新，不得放寬為模糊斷言。

- [ ] **Step 4: 全套件驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠。

- [ ] **Step 5: Commit**

```bash
git add src/enclosure/shellGeometry.ts src/enclosure/shellGeometry.test.ts
git commit -m "feat: add 45-degree chamfer ring at standoff roots for print strength"
```

---

### Task 8: 最終整合驗證

**Files:** 無新檔案（只驗證與修復）。

- [ ] **Step 1: 全套驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run test:e2e`
Expected: 全部通過（約 150+ vitest + 1 Playwright），無型別錯誤，建置成功。

- [ ] **Step 2: 瀏覽器驗證清單**（dev server port 5174）

1. 放 Arduino Uno + HC-SR04（有側面接口）→ 產生外殼 → 接口開孔高度對準連接器（開孔下緣 ≈ PCB 頂面，非板側）。
2. 放兩個零件 → 只選其一 → 面板顯示「將包含選取的 1 個零件」→ 產生 → 外殼只包住選取零件。
3. 清空選取 → 面板顯示「將包含全部 N 個可見零件」。
4. 進階區塊：改壁厚 → 支柱壁厚連動；手動改支柱壁厚後改壁厚 → 不再連動；填導孔深度 9 → 產生 → 支柱幾何反映（目測導孔更深或以剖面確認可略過，記錄由單元測試覆蓋）。
5. 選取外殼底座 → PropertyCard 有完整參數表單 → 改壁厚 → 幾何即時更新；改 lidType → 四角柱增減。
6. 支柱根部可見倒角環（放大檢視）。
7. 語言切換 zh/en：新增字串全部跟著切換。
8. Console 無錯誤。

- [ ] **Step 3: 修復發現的問題並 commit**

發現問題：讀原始碼診斷 → 修復 → 重跑驗證 → 以 `fix:` commit。

---

## 完成驗證

- [ ] `npx vitest run`、`tsc --noEmit`、`npm run build`、`npm run test:e2e` 全綠
- [ ] Task 8 瀏覽器清單全部通過（或明確記錄無法瀏覽器級驗證的項目與其單元測試覆蓋依據）
- [ ] Spec 覆蓋：§1 接口開孔位置 ✓（Task 1）、§2 多選範圍 ✓（Task 2/3）、§3 支柱參數 ✓（Task 4/5）、§4 參數事後可改 ✓（Task 6）、§5 根部補強 ✓（Task 7）
- [ ] 明確記錄的取捨：PropertyCard 不含 `pilotDepthOverride`（留在生成面板進階區塊）；base/lid params 各自獨立、不跨節點同步；params 變更的 undo 為兩步（updateNode + regenerate 的 sourceParts 刷新）——與既有逐鍵 undo 取捨一致

完成後使用 superpowers:finishing-a-development-branch skill 決定合併方式。
