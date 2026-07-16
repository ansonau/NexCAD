# 杯頭螺絲支援 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增杯頭螺絲（ISO 4762）孔型並設為螺絲工具預設、螺絲上蓋柱子頂端改挖杯頭沉孔、外殼壁厚預設改 3mm。

**Architecture:** 規格資料進 `SCREW_TABLE`（`src/enclosure/screws.ts`）單一來源；螺絲工具的孔節點（`screwHoleNode.ts`）與上蓋幾何（`lidGeometry.ts`）各自從表取值；UI（`ScrewToolsMenu.tsx`）只改選項與預設。

**Tech Stack:** React 19 + TypeScript (strict) + Vite、manifold-3d WASM（Web Worker）、Zustand、Vitest、i18next。

## Global Constraints

- `src/enclosure/`（除 `actions.ts`）不得 import store/zustand/react（worker-safe）。
- i18n zh/en key 對等（`src/i18n/resources.test.ts` 強制）。
- 杯頭沉孔尺寸（spec 定案，含裝配公差：直徑 +0.4mm、深度 +0.3mm）：M2 → 4.2/2.3、M2.5 → 4.9/2.8、M3 → 5.9/3.3、M4 → 7.4/4.3。
- 幾何測試沿用既有模式：`ManifoldKernel` + `beforeAll(async () => { await kernel.init(); })`、體積與 probe box 交集斷言。
- 既有測試若 pin 舊值需更新為正確新值，不得放寬斷言精度。

---

### Task 1: SCREW_TABLE 杯頭規格

**Files:**
- Modify: `src/enclosure/screws.ts`
- Test: `src/enclosure/screws.test.ts`（追加）

**Interfaces:**
- Produces: `HoleStyle` 增為 `'through' | 'selfTap' | 'countersink' | 'socketHead'`；`ScrewHoleSpec` 新增 `socketHeadDiameter: number`、`socketHeadDepth: number`；`pilotDiameter(size, 'socketHead')` 回傳 `throughDiameter`（杯頭螺絲的螺桿穿過通孔）。

- [ ] **Step 1: 寫失敗測試（追加到 `src/enclosure/screws.test.ts`）**

`describe('SCREW_TABLE', ...)` 內加：

```ts
  it('杯頭沉孔直徑大於通孔、深度為正且隨規格遞增', () => {
    for (const spec of Object.values(SCREW_TABLE)) {
      expect(spec.socketHeadDiameter).toBeGreaterThan(spec.throughDiameter);
      expect(spec.socketHeadDepth).toBeGreaterThan(0);
    }
    const order: (keyof typeof SCREW_TABLE)[] = ['M2', 'M2.5', 'M3', 'M4'];
    for (let i = 1; i < order.length; i++) {
      expect(SCREW_TABLE[order[i]].socketHeadDiameter).toBeGreaterThan(
        SCREW_TABLE[order[i - 1]].socketHeadDiameter,
      );
    }
  });
```

`describe('pilotDiameter', ...)` 內加：

```ts
  it('socketHead 回傳通孔直徑（螺桿穿過、頭部沉孔另外處理）', () => {
    expect(pilotDiameter('M3', 'socketHead')).toBe(SCREW_TABLE.M3.throughDiameter);
  });
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/screws.test.ts`
Expected: FAIL — `socketHeadDiameter` undefined（tsc 亦會報 `'socketHead'` 不在 `HoleStyle`）。

- [ ] **Step 3: 修改 `src/enclosure/screws.ts`**

```ts
export type ScrewSize = 'M2' | 'M2.5' | 'M3' | 'M4';
export type HoleStyle = 'through' | 'selfTap' | 'countersink' | 'socketHead';

export interface ScrewHoleSpec {
  /** 通孔直徑：螺絲可自由穿過 */
  throughDiameter: number;
  /** 自攻導孔直徑：螺絲自行攻牙，較緊配合 */
  selfTapDiameter: number;
  /** 沉頭窩口直徑（螺絲頭卡住的位置） */
  countersinkDiameter: number;
  /** 沉頭窩深度 */
  countersinkDepth: number;
  /** 杯頭（ISO 4762）沉孔直徑，含 +0.4mm 裝配公差 */
  socketHeadDiameter: number;
  /** 杯頭沉孔深度，含 +0.3mm 裝配公差 */
  socketHeadDepth: number;
}

export const SCREW_TABLE: Record<ScrewSize, ScrewHoleSpec> = {
  M2: { throughDiameter: 2.4, selfTapDiameter: 1.6, countersinkDiameter: 4.0, countersinkDepth: 1.2, socketHeadDiameter: 4.2, socketHeadDepth: 2.3 },
  'M2.5': { throughDiameter: 2.9, selfTapDiameter: 2.0, countersinkDiameter: 5.0, countersinkDepth: 1.5, socketHeadDiameter: 4.9, socketHeadDepth: 2.8 },
  M3: { throughDiameter: 3.4, selfTapDiameter: 2.5, countersinkDiameter: 6.0, countersinkDepth: 1.8, socketHeadDiameter: 5.9, socketHeadDepth: 3.3 },
  M4: { throughDiameter: 4.5, selfTapDiameter: 3.3, countersinkDiameter: 8.0, countersinkDepth: 2.4, socketHeadDiameter: 7.4, socketHeadDepth: 4.3 },
};

/** 依螺絲規格與孔型回傳「導孔本體」直徑（countersink 錐面與 socketHead 沉孔另外處理） */
export function pilotDiameter(size: ScrewSize, style: HoleStyle): number {
  const spec = SCREW_TABLE[size];
  return style === 'through' || style === 'socketHead'
    ? spec.throughDiameter
    : spec.selfTapDiameter;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/screws.test.ts && npx tsc --noEmit`
Expected: PASS（既有 5 + 新增 2），tsc clean。

- [ ] **Step 5: Commit**

```bash
git add src/enclosure/screws.ts src/enclosure/screws.test.ts
git commit -m "feat: add ISO 4762 socket head cap screw dimensions to screw table"
```

---

### Task 2: 螺絲工具杯頭孔節點

**Files:**
- Modify: `src/enclosure/screwHoleNode.ts`
- Test: `src/enclosure/screwHoleNode.test.ts`（追加）

**Interfaces:**
- Consumes: Task 1 的 `SCREW_TABLE`（`socketHeadDiameter`/`socketHeadDepth`）、`HoleStyle` 含 `'socketHead'`
- Produces: `createScrewHoleNode(size, 'socketHead')` 回傳 `GroupNode`（role='hole'）：下方通孔圓柱 + 上方杯頭沉孔圓柱。簽名不變。

- [ ] **Step 1: 寫失敗測試（追加到 `src/enclosure/screwHoleNode.test.ts`）**

```ts
  it('socketHead 樣式產生含通孔與圓柱沉孔兩個子節點的群組，role 為 hole', () => {
    const node = createScrewHoleNode('M3', 'socketHead');
    expect(node.type).toBe('group');
    expect(node.role).toBe('hole');
    if (node.type !== 'group') return;
    expect(node.children).toHaveLength(2);
    expect(node.children.map((c) => c.type === 'primitive' && c.kind)).toEqual([
      'cylinder',
      'cylinder',
    ]);
    const [pilot, head] = node.children;
    expect(pilot.type === 'primitive' && pilot.params.radius).toBeCloseTo(
      SCREW_TABLE.M3.throughDiameter / 2,
      6,
    );
    expect(head.type === 'primitive' && head.params.radius).toBeCloseTo(
      SCREW_TABLE.M3.socketHeadDiameter / 2,
      6,
    );
    expect(head.type === 'primitive' && head.params.height).toBeCloseTo(
      SCREW_TABLE.M3.socketHeadDepth,
      6,
    );
  });
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/screwHoleNode.test.ts`
Expected: FAIL — socketHead 落入 countersink 分支（children 為 cylinder+cone，非 cylinder+cylinder）。

- [ ] **Step 3: 修改 `src/enclosure/screwHoleNode.ts`**

在 `if (style === 'selfTap') {...}` 之後、countersink 段之前插入：

```ts
  if (style === 'socketHead') {
    const pilot = createPrimitive('cylinder', {
      params: { radius: spec.throughDiameter / 2, height: PILOT_HALF_HEIGHT * 2 },
    });
    pilot.transform.position = [0, 0, -PILOT_HALF_HEIGHT];
    const head = createPrimitive('cylinder', {
      params: { radius: spec.socketHeadDiameter / 2, height: spec.socketHeadDepth },
    });
    head.transform.position = [0, 0, PILOT_HALF_HEIGHT];
    const group: GroupNode = {
      type: 'group',
      id: newId(),
      name: `${size} 杯頭沉孔`,
      role: 'hole',
      transform: identityTransform(),
      visible: true,
      locked: false,
      children: [pilot, head],
    };
    return group;
  }
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/screwHoleNode.test.ts && npx tsc --noEmit`
Expected: PASS（既有 3 + 新增 1），tsc clean。

- [ ] **Step 5: Commit**

```bash
git add src/enclosure/screwHoleNode.ts src/enclosure/screwHoleNode.test.ts
git commit -m "feat: add socket head counterbore hole node to screw tools"
```

---

### Task 3: ScrewToolsMenu 選項與預設 + i18n

**Files:**
- Modify: `src/components/ScrewToolsMenu.tsx`
- Modify: `src/i18n/zh.json`、`src/i18n/en.json`（`tools` 區塊）

**Interfaces:**
- Consumes: Task 1 的 `HoleStyle` 含 `'socketHead'`、Task 2 的 `createScrewHoleNode`
- Produces: 純 UI。孔型下拉多一項「杯頭沉孔」且為預設。

- [ ] **Step 1: i18n key**

`src/i18n/zh.json` 的 `"tools"` 區塊（`"countersinkStyle"` 之後）加：

```json
    "socketHeadStyle": "杯頭沉孔",
```

`src/i18n/en.json` 對應位置加：

```json
    "socketHeadStyle": "Socket head counterbore",
```

- [ ] **Step 2: 執行 i18n 對等測試**

Run: `npx vitest run src/i18n/resources.test.ts`
Expected: PASS。

- [ ] **Step 3: 修改 `src/components/ScrewToolsMenu.tsx`**

`STYLES` 陣列改為（socketHead 放第一位，下拉順序即預設優先直覺）：

```tsx
const STYLES: { value: HoleStyle; key: string }[] = [
  { value: 'socketHead', key: 'tools.socketHeadStyle' },
  { value: 'through', key: 'tools.throughStyle' },
  { value: 'selfTap', key: 'tools.selfTapStyle' },
  { value: 'countersink', key: 'tools.countersinkStyle' },
];
```

`style` 初始值改為：

```tsx
  const [style, setStyle] = useState<HoleStyle>('socketHead');
```

- [ ] **Step 4: 驗證 + 手動確認**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠。

瀏覽器（dev server nexcad-dev，port 5174）：開螺絲工具 → 孔型預設顯示「杯頭沉孔」→ 點「放置螺絲孔：加入」→ 場景出現群組孔節點（下細上粗兩段圓柱、半透明紅色 hole 顯示）。

- [ ] **Step 5: Commit**

```bash
git add src/components/ScrewToolsMenu.tsx src/i18n
git commit -m "feat: add socket head style option and make it the screw tools default"
```

---

### Task 4: 螺絲上蓋杯頭沉孔

**Files:**
- Modify: `src/enclosure/lidGeometry.ts`
- Test: `src/enclosure/lidGeometry.test.ts`（追加）

**Interfaces:**
- Consumes: Task 1 的 `SCREW_TABLE`（`socketHeadDiameter`/`socketHeadDepth`）
- Produces: `buildLidSolid` 內部行為——screw 上蓋每根角柱頂端多一個杯頭沉孔。簽名不變。

- [ ] **Step 1: 寫失敗測試（追加到 `src/enclosure/lidGeometry.test.ts` 的 describe 內）**

先讀該測試檔既有 fixture 寫法（如何建 `PartInstance`、`planShell`、probe box 交集 helper——若無現成 helper 就照 `shellGeometry.test.ts` 的 `kernel.difference(probe, kernel.difference(probe, solid))` 交集慣例內聯）。新增（`fixturePart()` 為佔位名，用檔內實際 fixture）：

```ts
  it('screw 上蓋柱頂有杯頭沉孔（沉孔範圍空心、沉孔壁實心）', () => {
    const params = { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'screw' as const };
    const plan = planShell([fixturePart()], params);
    const lid = buildLidSolid(plan, params, kernel);
    const spec = SCREW_TABLE[params.screwSize];
    const p = planCornerPosts(plan, params.screwSize)[0];
    const panelZ = plan.inner.maxZ;
    const postTop = panelZ + params.wallThickness + 4; // POST_HEIGHT = 4
    const boreDepth = Math.min(spec.socketHeadDepth, 4);
    // 沉孔內、通孔外（半徑介於 throughRadius 與 socketHeadRadius 之間）→ 應為空
    const rMid = (spec.throughDiameter / 2 + spec.socketHeadDiameter / 2) / 2;
    const inBore = probeAt(p.x + rMid, p.y, postTop - boreDepth / 2);
    expect(intersectionVolume(lid, inBore)).toBe(0);
    // 同半徑、沉孔底以下（柱體實心區）→ 應為實心
    const belowBore = probeAt(p.x + rMid, p.y, postTop - boreDepth - 0.6);
    expect(intersectionVolume(lid, belowBore)).toBeGreaterThan(0);
  });
```

（`probeAt(x, y, z)` = 以該點為中心的 0.4mm 立方 probe；`kernel.box` 原點在底面中心，position 傳 `[x, y, z - 0.2]`。probe 尺寸取 0.4 是因為 M3 的沉孔壁環帶半徑寬約 1.25mm，0.4mm probe 放環帶中點兩側都有裕度。`SCREW_TABLE`、`planCornerPosts` 依檔內既有 import 補齊。）

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/lidGeometry.test.ts`
Expected: FAIL — 第一個 probe 交集體積 > 0（柱頂目前是實心，只有中央通孔）。

- [ ] **Step 3: 修改 `src/enclosure/lidGeometry.ts`**

import 區把 `pilotDiameter` 那行改為：

```ts
import { pilotDiameter, SCREW_TABLE } from './screws';
```

screw 分支的 for 迴圈內、`lid = kernel.difference(lid, through);` 之後加：

```ts
      // 杯頭沉孔：從柱頂向下挖，讓螺絲頭嵌入柱內不外露。深度 clamp 在柱高以內，
      // 避免沉孔貫穿柱子進入面板／合模面（M4 的 socketHeadDepth=4.3 已超過柱高 4，
      // clamp 恆常觸發，沉孔深度上限即柱高本身）。
      const spec = SCREW_TABLE[params.screwSize];
      const boreDepth = Math.min(spec.socketHeadDepth, POST_HEIGHT);
      const bore = kernel.transform(
        kernel.cylinder(spec.socketHeadDiameter / 2, boreDepth + 1),
        {
          position: [p.x, p.y, panelZ + panelH + POST_HEIGHT - boreDepth],
          ...noRotScale,
        },
      );
      lid = kernel.difference(lid, bore);
```

（沉孔圓柱高度 +1 讓頂端超出柱頂，確保切口乾淨貫通。）

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/lidGeometry.test.ts`
Expected: PASS（既有 + 新增）。既有「screwLid > slideLid」體積比較若因沉孔挖除量過大而翻轉，屬真實幾何變化：驗算 M3 預設下柱子淨增體積仍應為正（柱體積 ≈ π·postRadius²·4 遠大於沉孔挖除 π·2.95²·3.3 ≈ 90mm³ 與通孔挖除），若斷言失敗先手算確認再處理，不得直接放寬。

- [ ] **Step 5: 全套件驗證**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 全綠。

- [ ] **Step 6: Commit**

```bash
git add src/enclosure/lidGeometry.ts src/enclosure/lidGeometry.test.ts
git commit -m "feat: counterbore screw lid posts for socket head cap screws"
```

---

### Task 5: 外殼壁厚預設 3mm

**Files:**
- Modify: `src/enclosure/plan.ts`（`DEFAULT_ENCLOSURE_PARAMS`）
- Test: 既有測試如受預設值影響需同步修正期望值

**Interfaces:**
- Produces: `DEFAULT_ENCLOSURE_PARAMS.wallThickness = 3`、`standoffWallPadding = 3`（Plan 4 語意：支柱壁厚預設 = 壁厚現值，兩者同步改避免面板初始顯示不一致）。

- [ ] **Step 1: 修改 `src/enclosure/plan.ts`**

`DEFAULT_ENCLOSURE_PARAMS` 的 `wallThickness: 2,` 改 `wallThickness: 3,`；`standoffWallPadding: 2,` 改 `standoffWallPadding: 3,`。其餘欄位不動。

- [ ] **Step 2: 全套件驗證與受影響測試修正**

Run: `npx vitest run && npx tsc --noEmit`

使用 `DEFAULT_ENCLOSURE_PARAMS` 的幾何測試（`plan.test.ts`、`shellGeometry.test.ts`、`lidGeometry.test.ts`、`actions.test.ts`、Task 4 新測試）斷言多為相對比較或由 plan 值推導座標，預期不受影響；若有 pin 絕對數值的斷言失敗，手算新值後更新期望值（不得放寬）。明確以字面值 `wallThickness: 2` 自建 params 的測試（`types/document.test.ts`、`persistence/nexcadFile.test.ts`、`geometry/evaluate.test.ts`）不受預設值影響、不用改。

Expected: 全綠。

- [ ] **Step 3: 手動確認**

瀏覽器：開「產生外殼」面板 → 壁厚顯示 3、支柱壁厚顯示 3。

- [ ] **Step 4: Commit**

```bash
git add src/enclosure/plan.ts
git commit -m "feat: default enclosure wall thickness to 3mm"
```

（若 Step 2 修了測試檔，一併 add。）

---

### Task 6: 最終整合驗證

**Files:** 無新檔案（只驗證與修復）。

- [ ] **Step 1: 全套驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run test:e2e`
Expected: 全部通過（約 160 vitest + 1 Playwright），無型別錯誤，建置成功。

- [ ] **Step 2: 瀏覽器驗證清單**（dev server port 5174）

1. 螺絲工具開啟 → 孔型預設「杯頭沉孔」→ 加入 → 場景出現兩段式孔節點（細通孔+粗沉孔）。
2. 放一個零件 → 產生外殼（預設參數：壁厚 3、螺絲上蓋、M3）→ 上蓋四角柱頂端有明顯圓形沉孔開口。
3. 面板壁厚欄預設顯示 3、進階支柱壁厚顯示 3。
4. 語言切換 zh/en：「杯頭沉孔」/「Socket head counterbore」正確切換。
5. Console 無錯誤。

- [ ] **Step 3: 修復發現的問題並 commit**

發現問題：讀原始碼診斷 → 修復 → 重跑驗證 → 以 `fix:` commit。

---

## 完成驗證

- [ ] `npx vitest run`、`tsc --noEmit`、`npm run build`、`npm run test:e2e` 全綠
- [ ] Task 6 瀏覽器清單全部通過（或明確記錄無法瀏覽器級驗證的項目與其單元測試覆蓋依據）
- [ ] Spec 覆蓋：§1 杯頭孔型+預設 ✓（Task 1/2/3）、§2 上蓋杯頭沉孔 ✓（Task 4）、§3 壁厚預設 3mm ✓（Task 5）
- [ ] 已知取捨（記錄非遺漏）：使用者把壁厚調得極小（<1.5mm）時，M4 杯頭沉孔直徑可能超過上蓋柱直徑、沉孔吃穿柱壁——預設值下安全，屬極端輸入的既知限制，與 Plan 4 的 standoffWallPadding=0 同類；`standoffWallPadding` 預設隨壁厚改為 3 是 Plan 4「支柱壁厚預設=壁厚」語意的延續，spec §3 未明列但屬必要一致性

完成後使用 superpowers:finishing-a-development-branch skill 決定合併方式。
