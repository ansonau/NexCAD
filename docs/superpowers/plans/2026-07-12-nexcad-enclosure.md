# NexCAD 外殼生成器與收尾功能實作計畫（Plan 3 / 3）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加入外殼生成器（一鍵由零件位置產生殼體/支柱/接口開孔/上蓋）、螺絲孔與孔位投影工具、3MF 匯出、Worker 崩潰自動重啟，以及 Playwright 冒煙測試，完成規格 v1 全部項目。

**Architecture:** 外殼生成是純函數管線：`plan.ts`（零件範圍→殼體/支柱座標的數學）→ `shellGeometry.ts`/`portProjection.ts`/`lidGeometry.ts`（用 `GeometryKernel` 把規劃結果變成 Solid）→ `generate.ts`（組裝，worker-safe，供 `evaluate.ts` 呼叫）。文件模型新增 `EnclosureNode`，在生成當下把零件座標「快照」進節點本身（`sourceParts`），符合規格「一鍵重新生成」而非即時連動的語意。3MF 用手刻最小 ZIP + XML（沿用 Plan 1 手刻 STL 的風格，不引入重量級套件）。

**Tech Stack:** 沿用 Plan 1/2 技術棧；新增 Playwright（devDependency，E2E）。無其他新依賴。

## Global Constraints

- 所有尺寸單位 mm；殼體/零件本地慣例：primitive/part 原點在**底面中心**（Plan 1/2 慣例），本計畫的殼體與上蓋也遵循此慣例
- 幾何求值走 `GeometryKernel`，呼叫端負責 `releaseAll()`（arena 記憶體契約）
- `evaluate.ts`、`enclosure/generate.ts` 等被 Worker 引用的模組**不得**匯入 `zustand`/`react`/`documentStore`（避免把 UI 狀態機拉進 worker bundle，也避免循環匯入）；store 相關的組裝/重新生成邏輯放在 `src/enclosure/actions.ts`
- 觸控目標 ≥ 44px；light theme；TypeScript strict；測試檔與原始碼同目錄
- **v1 範圍限制**（明確記錄，非遺漏）：外殼生成器包住「文件中目前所有可見的零件節點」（不做多選 UI）；零件旋轉僅支援 Z 軸 0°/90°/180°/270°（與 Plan 2 的孔位磁吸慣例一致）——非直角旋轉的零件仍會被計入殼體外框，但其 `ports` 開孔會被略過；接口開孔一律用**外接矩形**（不論 `port.shape` 是否為 circle），避免旋轉圓柱幾何的高風險程式碼
- Commit 訊息用 conventional commits；不要 commit `.DS_Store`

---

## 檔案結構

```
src/
  geometry/kernel.ts            新增 roundedBox()                      [Task 1]
  geometry/manifoldKernel.ts    roundedBox 實作（CrossSection hull）   [Task 1]
  enclosure/screws.ts           M2/M2.5/M3/M4 螺絲孔尺寸表              [Task 2]
  enclosure/plan.ts             零件範圍/殼體/支柱/角柱純數學            [Task 3]
  enclosure/shellGeometry.ts    殼體本體（含支柱）Solid 組裝            [Task 4]
  enclosure/portProjection.ts   接口投影規劃 + 開孔 Solid 組裝           [Task 5]
  enclosure/lidGeometry.ts      上蓋（screw/slide）Solid 組裝            [Task 6]
  enclosure/generate.ts         組裝入口 buildEnclosureNodeSolid        [Task 7]
  enclosure/actions.ts          generateEnclosure/regenerateEnclosure  [Task 7]
  enclosure/screwHoleNode.ts    螺絲孔節點建構（含沉頭）                [Task 9]
  enclosure/holeProjection.ts   零件孔位→板件螺絲孔投影                 [Task 9]
  types/document.ts             新增 EnclosureNode                     [Task 7]
  geometry/evaluate.ts          buildSolid 支援 enclosure 節點          [Task 7]
  store/documentStore.ts        新增 addNodes 批次動作                  [Task 9]
  components/EnclosurePanel.tsx 外殼參數面板 + 產生/重新產生按鈕         [Task 8]
  components/ScrewToolsMenu.tsx 螺絲孔與孔位投影工具選單                 [Task 9]
  components/Toolbar.tsx        掛載上述兩個面板的開關按鈕               [Task 8,9]
  export/crc32.ts               CRC-32（ZIP 需要）                      [Task 10]
  export/zip.ts                 最小 STORED-only ZIP 封裝               [Task 10]
  export/threemf.ts             3MF（ZIP+XML）寫出                      [Task 11]
  components/ExportDialog.tsx   格式選擇（STL/3MF）                     [Task 11]
  geometry/workerClient.ts      GeometryClient.replaceWorker            [Task 12]
  geometry/client.ts            Worker onerror → 自動重建               [Task 12]
  i18n/zh.json, en.json         外殼/工具/匯出格式 相關 key              [Task 8,9,11]
e2e/
  smoke.spec.ts                 建專案→放零件→產生外殼→匯出 STL         [Task 13]
playwright.config.ts                                                    [Task 13]
```

---

### Task 1: GeometryKernel — roundedBox()

**Files:**
- Modify: `src/geometry/kernel.ts`（介面新增方法）
- Modify: `src/geometry/manifoldKernel.ts`（實作）
- Test: `src/geometry/manifoldKernel.test.ts`（追加）

**Interfaces:**
- Produces: `GeometryKernel.roundedBox(width: number, depth: number, height: number, cornerRadius: number): Solid` — 底面中心原點，垂直邊圓角（頂/底面仍為平面矩形，不同於整體圓角）。`cornerRadius <= 0` 時退化為一般 `box()`。

外殼殼體與上蓋都需要「垂直邊圓角、頂底平面」的盒子（不是把 8 個角都磨圓的膠囊形）。做法：在 XY 平面做「四個圓的 2D 凸包」（`CrossSection.hull`），再用 `.extrude(height)` 拉伸成 3D。Manifold 的 `CrossSection` 是獨立於 `Manifold` 的 WASM 物件，需要自己的 arena 追蹤陣列與 `releaseAll`。

- [ ] **Step 1: 在 `src/geometry/kernel.ts` 的 `GeometryKernel` 介面加入方法**

```ts
  /** 底面中心原點，垂直邊圓角的長方體；cornerRadius<=0 時等同 box() */
  roundedBox(width: number, depth: number, height: number, cornerRadius: number): Solid;
```

（插入在 `box(...)` 方法宣告之後即可，其餘介面內容不變。）

- [ ] **Step 2: 寫失敗測試（追加到 `src/geometry/manifoldKernel.test.ts` 的 `describe('ManifoldKernel', ...)` 內）**

```ts
  it('roundedBox cornerRadius<=0 時體積等同 box', () => {
    const v1 = kernel.volume(kernel.roundedBox(20, 10, 5, 0));
    const v2 = kernel.volume(kernel.box(20, 10, 5));
    expect(v1).toBeCloseTo(v2, 3);
  });

  it('roundedBox 體積小於同尺寸方盒（四角被削掉）', () => {
    const rounded = kernel.volume(kernel.roundedBox(20, 20, 10, 5));
    const sharp = kernel.volume(kernel.box(20, 20, 10));
    // 理論值：(20*20 - (4-π)*5²) * 10
    const expected = (20 * 20 - (4 - Math.PI) * 25) * 10;
    expect(rounded).toBeLessThan(sharp);
    expect(rounded).toBeGreaterThan(expected * 0.9);
    expect(rounded).toBeLessThan(expected * 1.1);
  });

  it('roundedBox 底面中心原點、垂直邊圓角但頂底為平面矩形', () => {
    const mesh = kernel.toMesh(kernel.roundedBox(20, 20, 10, 5));
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) {
      minZ = Math.min(minZ, mesh.positions[i]);
      maxZ = Math.max(maxZ, mesh.positions[i]);
    }
    expect(minZ).toBeCloseTo(0, 1);
    expect(maxZ).toBeCloseTo(10, 1);
  });
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npx vitest run src/geometry/manifoldKernel.test.ts`
Expected: FAIL — `kernel.roundedBox is not a function`

- [ ] **Step 4: 在 `src/geometry/manifoldKernel.ts` 實作**

`ManifoldKernel` class 內新增一個追蹤 2D 物件的陣列與 track 方法，並實作 `roundedBox`：

```ts
  /** 自上次 releaseAll 以來建立的所有 WASM CrossSection（2D，獨立於 Manifold 的記憶體池） */
  private allocated2D: CrossSection[] = [];

  private track2D(c: CrossSection): CrossSection {
    this.allocated2D.push(c);
    return c;
  }

  roundedBox(width: number, depth: number, height: number, cornerRadius: number): Solid {
    if (cornerRadius <= 0) return this.box(width, depth, height);
    const cx = width / 2 - cornerRadius;
    const cy = depth / 2 - cornerRadius;
    const CS = this.wasm.CrossSection;
    const corners = [
      this.track2D(this.track2D(CS.circle(cornerRadius, SEGMENTS)).translate([cx, cy])),
      this.track2D(this.track2D(CS.circle(cornerRadius, SEGMENTS)).translate([-cx, cy])),
      this.track2D(this.track2D(CS.circle(cornerRadius, SEGMENTS)).translate([-cx, -cy])),
      this.track2D(this.track2D(CS.circle(cornerRadius, SEGMENTS)).translate([cx, -cy])),
    ];
    const profile = this.track2D(CS.hull(corners));
    return wrap(this.track(profile.extrude(height)));
  }
```

在檔案頂部的 import 加入 `CrossSection` 型別：

```ts
import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d';
```

修改 `releaseAll()`，同時釋放 2D 物件：

```ts
  releaseAll(): void {
    for (const m of this.allocated) m.delete();
    this.allocated = [];
    for (const c of this.allocated2D) c.delete();
    this.allocated2D = [];
  }
```

- [ ] **Step 5: 執行測試確認通過**

Run: `npx vitest run src/geometry/manifoldKernel.test.ts`
Expected: PASS（10 tests：原 7 + 新增 3）

- [ ] **Step 6: 執行完整套件與建置**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠（87 tests）；建置無錯誤

- [ ] **Step 7: Commit**

```bash
git add src/geometry
git commit -m "feat: add roundedBox primitive via 2D hull+extrude for enclosure shells"
```

---

### Task 2: 螺絲孔尺寸表

**Files:**
- Create: `src/enclosure/screws.ts`
- Test: `src/enclosure/screws.test.ts`

**Interfaces:**
- Produces: `ScrewSize = 'M2'|'M2.5'|'M3'|'M4'`、`HoleStyle = 'through'|'selfTap'|'countersink'`、`ScrewHoleSpec { throughDiameter, selfTapDiameter, countersinkDiameter, countersinkDepth }`、`SCREW_TABLE: Record<ScrewSize, ScrewHoleSpec>`、`pilotDiameter(size, style): number`

- [ ] **Step 1: 寫失敗測試 `src/enclosure/screws.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { pilotDiameter, SCREW_TABLE } from './screws';

describe('SCREW_TABLE', () => {
  it('涵蓋 M2/M2.5/M3/M4 四種規格', () => {
    expect(Object.keys(SCREW_TABLE).sort()).toEqual(['M2', 'M2.5', 'M3', 'M4']);
  });

  it('每個規格：自攻孔 < 通孔 < 沉頭孔徑', () => {
    for (const spec of Object.values(SCREW_TABLE)) {
      expect(spec.selfTapDiameter).toBeLessThan(spec.throughDiameter);
      expect(spec.throughDiameter).toBeLessThan(spec.countersinkDiameter);
      expect(spec.countersinkDepth).toBeGreaterThan(0);
    }
  });

  it('尺寸隨規格遞增（M2 < M2.5 < M3 < M4）', () => {
    const order: (keyof typeof SCREW_TABLE)[] = ['M2', 'M2.5', 'M3', 'M4'];
    for (let i = 1; i < order.length; i++) {
      expect(SCREW_TABLE[order[i]].throughDiameter).toBeGreaterThan(
        SCREW_TABLE[order[i - 1]].throughDiameter,
      );
    }
  });
});

describe('pilotDiameter', () => {
  it('through 回傳通孔直徑', () => {
    expect(pilotDiameter('M3', 'through')).toBe(SCREW_TABLE.M3.throughDiameter);
  });

  it('selfTap 與 countersink 都回傳自攻導孔直徑（沉頭錐面另外處理）', () => {
    expect(pilotDiameter('M3', 'selfTap')).toBe(SCREW_TABLE.M3.selfTapDiameter);
    expect(pilotDiameter('M3', 'countersink')).toBe(SCREW_TABLE.M3.selfTapDiameter);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/screws.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/enclosure/screws.ts`**

```ts
export type ScrewSize = 'M2' | 'M2.5' | 'M3' | 'M4';
export type HoleStyle = 'through' | 'selfTap' | 'countersink';

export interface ScrewHoleSpec {
  /** 通孔直徑：螺絲可自由穿過 */
  throughDiameter: number;
  /** 自攻導孔直徑：螺絲自行攻牙，較緊配合 */
  selfTapDiameter: number;
  /** 沉頭窩口直徑（螺絲頭卡住的位置） */
  countersinkDiameter: number;
  /** 沉頭窩深度 */
  countersinkDepth: number;
}

export const SCREW_TABLE: Record<ScrewSize, ScrewHoleSpec> = {
  M2: { throughDiameter: 2.4, selfTapDiameter: 1.6, countersinkDiameter: 4.0, countersinkDepth: 1.2 },
  'M2.5': { throughDiameter: 2.9, selfTapDiameter: 2.0, countersinkDiameter: 5.0, countersinkDepth: 1.5 },
  M3: { throughDiameter: 3.4, selfTapDiameter: 2.5, countersinkDiameter: 6.0, countersinkDepth: 1.8 },
  M4: { throughDiameter: 4.5, selfTapDiameter: 3.3, countersinkDiameter: 8.0, countersinkDepth: 2.4 },
};

/** 依螺絲規格與孔型回傳「導孔本體」直徑（countersink 的錐面另外處理，見 lidGeometry/screwHoleNode） */
export function pilotDiameter(size: ScrewSize, style: HoleStyle): number {
  const spec = SCREW_TABLE[size];
  return style === 'through' ? spec.throughDiameter : spec.selfTapDiameter;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/screws.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
git add src/enclosure
git commit -m "feat: add screw hole size table (M2/M2.5/M3/M4)"
```

---

### Task 3: 外殼規劃數學（純函數）

**Files:**
- Create: `src/enclosure/plan.ts`
- Test: `src/enclosure/plan.test.ts`

**Interfaces:**
- Consumes: `PartDefinition`（Plan 2 `parts/schema.ts`）、`Transform`/`Vec3`（`types/document.ts`）、`pilotDiameter`/`ScrewSize`（Task 2）
- Produces: `PartInstance { def: PartDefinition; transform: Transform }`、`Bounds3 { minX,maxX,minY,maxY,minZ,maxZ }`、`EnclosureParams { wallThickness, clearanceMargin, cornerRadius, lidType: 'screw'|'slide'|'open', screwSize: ScrewSize }`、`DEFAULT_ENCLOSURE_PARAMS`、`ShellPlan { inner: Bounds3; outer: Bounds3; cornerRadius: number; floorZ: number }`、`StandoffPlan { x, y, topZ, pilotDiameter, pilotDepth }`、函數 `partWorldBounds`、`combinedBounds`、`planShell`、`planStandoffs`、`planCornerPosts`

零件世界座標範圍與孔位換算只支援 Z 軸旋轉（與 Plan 2 `holeSnap.ts` 的 `collectHoleWorldPositions` 一致：非零 X/Y 旋轉的零件仍計入外框但不特別處理旋轉包絡）。

- [ ] **Step 1: 寫失敗測試 `src/enclosure/plan.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import {
  combinedBounds,
  planCornerPosts,
  planShell,
  planStandoffs,
  DEFAULT_ENCLOSURE_PARAMS,
  partWorldBounds,
} from './plan';
import type { PartInstance } from './plan';

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

function instance(overrides: Partial<PartInstance['transform']> = {}): PartInstance {
  return { def: boardDef, transform: { ...identityTransform(), ...overrides } };
}

describe('partWorldBounds', () => {
  it('無旋轉時直接以零件尺寸與位置計算', () => {
    const b = partWorldBounds(instance());
    expect(b.minX).toBeCloseTo(-20, 6);
    expect(b.maxX).toBeCloseTo(20, 6);
    expect(b.minY).toBeCloseTo(-10, 6);
    expect(b.maxY).toBeCloseTo(10, 6);
    expect(b.minZ).toBeCloseTo(0, 6);
    expect(b.maxZ).toBeCloseTo(10, 6);
  });

  it('旋轉 90° 後長寬互換', () => {
    const b = partWorldBounds(instance({ rotation: [0, 0, 90] }));
    expect(b.maxX - b.minX).toBeCloseTo(20, 6);
    expect(b.maxY - b.minY).toBeCloseTo(40, 6);
  });

  it('位移正確反映在範圍上', () => {
    const b = partWorldBounds(instance({ position: [100, 50, 5] }));
    expect(b.minX).toBeCloseTo(80, 6);
    expect(b.maxZ).toBeCloseTo(15, 6);
  });
});

describe('combinedBounds', () => {
  it('合併多個零件的外框', () => {
    const parts = [instance({ position: [0, 0, 0] }), instance({ position: [100, 0, 0] })];
    const b = combinedBounds(parts);
    expect(b.minX).toBeCloseTo(-20, 6);
    expect(b.maxX).toBeCloseTo(120, 6);
  });
});

describe('planShell', () => {
  it('內腔比零件範圍多出 clearanceMargin，外殼比內腔多出 wallThickness', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const margin = DEFAULT_ENCLOSURE_PARAMS.clearanceMargin;
    const wall = DEFAULT_ENCLOSURE_PARAMS.wallThickness;
    expect(plan.inner.minX).toBeCloseTo(-20 - margin, 6);
    expect(plan.inner.maxX).toBeCloseTo(20 + margin, 6);
    expect(plan.outer.minX).toBeCloseTo(-20 - margin - wall, 6);
    expect(plan.outer.maxX).toBeCloseTo(20 + margin + wall, 6);
  });

  it('外殼底部比零件底部低一個壁厚，頂部開放（等於內腔頂）', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    expect(plan.outer.minZ).toBeCloseTo(-DEFAULT_ENCLOSURE_PARAMS.wallThickness, 6);
    expect(plan.outer.maxZ).toBeCloseTo(plan.inner.maxZ, 6);
    expect(plan.floorZ).toBeCloseTo(plan.outer.minZ, 6);
  });

  it('cornerRadius 被限制在不超過外形寬/深的一半', () => {
    const tiny = planShell([instance()], { ...DEFAULT_ENCLOSURE_PARAMS, cornerRadius: 1000 });
    const width = tiny.outer.maxX - tiny.outer.minX;
    const depth = tiny.outer.maxY - tiny.outer.minY;
    expect(tiny.cornerRadius).toBeLessThan(width / 2);
    expect(tiny.cornerRadius).toBeLessThan(depth / 2);
  });
});

describe('planStandoffs', () => {
  it('每個安裝孔對應一個支柱，座標為世界座標', () => {
    const standoffs = planStandoffs([instance({ position: [10, 0, 5] })], 'M3');
    expect(standoffs).toHaveLength(2);
    expect(standoffs[0].x).toBeCloseTo(10 - 15, 6);
    expect(standoffs[0].topZ).toBeCloseTo(5, 6);
  });
});

describe('planCornerPosts', () => {
  it('回傳外殼四個角落的支柱，頂部對齊內腔頂', () => {
    const plan = planShell([instance()], DEFAULT_ENCLOSURE_PARAMS);
    const posts = planCornerPosts(plan, 'M3');
    expect(posts).toHaveLength(4);
    for (const p of posts) {
      expect(p.topZ).toBeCloseTo(plan.inner.maxZ, 6);
      expect(p.x).toBeGreaterThan(plan.outer.minX);
      expect(p.x).toBeLessThan(plan.outer.maxX);
    }
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/plan.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/enclosure/plan.ts`**

```ts
import { pilotDiameter } from './screws';
import type { ScrewSize } from './screws';
import type { PartDefinition } from '../parts/schema';
import type { Transform } from '../types/document';

const DEG = Math.PI / 180;

export interface PartInstance {
  def: PartDefinition;
  /** 只使用 position 與 rotation.z（與 holeSnap.ts 慣例一致） */
  transform: Transform;
}

export interface Bounds3 {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface EnclosureParams {
  wallThickness: number;
  clearanceMargin: number;
  cornerRadius: number;
  lidType: 'screw' | 'slide' | 'open';
  screwSize: ScrewSize;
}

export const DEFAULT_ENCLOSURE_PARAMS: EnclosureParams = {
  wallThickness: 2,
  clearanceMargin: 3,
  cornerRadius: 3,
  lidType: 'screw',
  screwSize: 'M3',
};

/** 零件在世界座標下的包覆範圍（只考慮 Z 軸旋轉） */
export function partWorldBounds(part: PartInstance): Bounds3 {
  const [w, d, t] = part.def.body.size;
  const angle = part.transform.rotation[2] * DEG;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfW = (w * cos + d * sin) / 2;
  const halfD = (w * sin + d * cos) / 2;
  const [px, py, pz] = part.transform.position;
  return {
    minX: px - halfW,
    maxX: px + halfW,
    minY: py - halfD,
    maxY: py + halfD,
    minZ: pz,
    maxZ: pz + Math.max(t, part.def.clearanceHeight),
  };
}

export function combinedBounds(parts: PartInstance[]): Bounds3 {
  const boxes = parts.map(partWorldBounds);
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
    minZ: Math.min(...boxes.map((b) => b.minZ)),
    maxZ: Math.max(...boxes.map((b) => b.maxZ)),
  };
}

export interface ShellPlan {
  /** 淨空腔體（含 clearanceMargin），頂部即殼體開口 */
  inner: Bounds3;
  /** 含壁厚的外形；頂部與 inner 相同（開放，上蓋另外生成） */
  outer: Bounds3;
  cornerRadius: number;
  /** 殼體外底面高度，等同 outer.minZ */
  floorZ: number;
}

export function planShell(parts: PartInstance[], params: EnclosureParams): ShellPlan {
  const p = combinedBounds(parts);
  const m = params.clearanceMargin;
  const inner: Bounds3 = {
    minX: p.minX - m,
    maxX: p.maxX + m,
    minY: p.minY - m,
    maxY: p.maxY + m,
    minZ: p.minZ,
    maxZ: p.maxZ + m,
  };
  const t = params.wallThickness;
  const outer: Bounds3 = {
    minX: inner.minX - t,
    maxX: inner.maxX + t,
    minY: inner.minY - t,
    maxY: inner.maxY + t,
    minZ: inner.minZ - t,
    maxZ: inner.maxZ,
  };
  const width = outer.maxX - outer.minX;
  const depth = outer.maxY - outer.minY;
  const cornerRadius = Math.max(0, Math.min(params.cornerRadius, width / 2 - 0.1, depth / 2 - 0.1));
  return { inner, outer, cornerRadius, floorZ: outer.minZ };
}

export interface StandoffPlan {
  x: number;
  y: number;
  /** 支柱頂面（螺絲導孔開口）絕對高度 */
  topZ: number;
  pilotDiameter: number;
  pilotDepth: number;
}

const PILOT_DEPTH = 6;

/** 每個零件的每個安裝孔 → 世界座標支柱規劃 */
export function planStandoffs(parts: PartInstance[], screwSize: ScrewSize): StandoffPlan[] {
  const out: StandoffPlan[] = [];
  for (const part of parts) {
    const angle = part.transform.rotation[2] * DEG;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [px, py, pz] = part.transform.position;
    for (const hole of part.def.mountingHoles) {
      out.push({
        x: px + hole.x * cos - hole.y * sin,
        y: py + hole.x * sin + hole.y * cos,
        topZ: pz + (hole.z ?? 0),
        pilotDiameter: pilotDiameter(screwSize, 'selfTap'),
        pilotDepth: PILOT_DEPTH,
      });
    }
  }
  return out;
}

/** 外殼四個角落的上蓋鎖點支柱，頂部對齊殼體開口（內腔頂） */
export function planCornerPosts(plan: ShellPlan, screwSize: ScrewSize): StandoffPlan[] {
  const inset = plan.cornerRadius + 3;
  const xs = [plan.outer.minX + inset, plan.outer.maxX - inset];
  const ys = [plan.outer.minY + inset, plan.outer.maxY - inset];
  const out: StandoffPlan[] = [];
  for (const x of xs) {
    for (const y of ys) {
      out.push({
        x,
        y,
        topZ: plan.inner.maxZ,
        pilotDiameter: pilotDiameter(screwSize, 'selfTap'),
        pilotDepth: PILOT_DEPTH,
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/plan.test.ts`
Expected: PASS（10 tests）

- [ ] **Step 5: Commit**

```bash
git add src/enclosure
git commit -m "feat: add pure-math enclosure planning (bounds, standoffs, corner posts)"
```

---

### Task 4: 殼體本體幾何（含支柱）

**Files:**
- Create: `src/enclosure/shellGeometry.ts`
- Test: `src/enclosure/shellGeometry.test.ts`

**Interfaces:**
- Consumes: `ShellPlan`/`StandoffPlan`（Task 3）、`GeometryKernel`/`Solid`（Task 1 起 `roundedBox`）
- Produces: `buildShellSolid(plan: ShellPlan, wallThickness: number, standoffs: StandoffPlan[], kernel: GeometryKernel): Solid`

- [ ] **Step 1: 寫失敗測試 `src/enclosure/shellGeometry.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { DEFAULT_ENCLOSURE_PARAMS, planShell, planStandoffs } from './plan';
import type { PartInstance } from './plan';
import { buildShellSolid } from './shellGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

const boardDef: PartDefinition = {
  id: 'test-board',
  name: 'Test',
  nameZh: '測試板',
  category: 'board',
  body: { size: [40, 20, 2], blocks: [] },
  mountingHoles: [{ x: -15, y: -5, diameter: 3 }],
  ports: [],
  clearanceHeight: 10,
};

const parts: PartInstance[] = [{ def: boardDef, transform: identityTransform() }];

describe('buildShellSolid', () => {
  it('殼體體積小於外框方塊、大於內腔挖空後的下限（是中空的殼）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const solid = buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, [], kernel);
    const v = kernel.volume(solid);
    const outerBoxVolume =
      (plan.outer.maxX - plan.outer.minX) *
      (plan.outer.maxY - plan.outer.minY) *
      (plan.outer.maxZ - plan.outer.minZ);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(outerBoxVolume);
  });

  it('加入支柱後體積增加', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const noStandoff = kernel.volume(buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, [], kernel));
    const standoffs = planStandoffs(parts, DEFAULT_ENCLOSURE_PARAMS.screwSize);
    const withStandoff = kernel.volume(
      buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, standoffs, kernel),
    );
    expect(withStandoff).toBeGreaterThan(noStandoff);
  });

  it('殼體是單一封閉 mesh（三角形數為正且可整除 3）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const mesh = kernel.toMesh(buildShellSolid(plan, DEFAULT_ENCLOSURE_PARAMS.wallThickness, [], kernel));
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(mesh.indices.length % 3).toBe(0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/shellGeometry.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/enclosure/shellGeometry.ts`**

```ts
import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { ShellPlan, StandoffPlan } from './plan';

const noRotScale = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };

/**
 * 殼體本體：外形（圓角）挖去內腔，再加上每個支柱（含螺絲導孔）。
 * 世界絕對座標，呼叫端不需再套用額外 transform。
 */
export function buildShellSolid(
  plan: ShellPlan,
  wallThickness: number,
  standoffs: StandoffPlan[],
  kernel: GeometryKernel,
): Solid {
  const { outer, inner, cornerRadius } = plan;

  const outerSolid = kernel.transform(
    kernel.roundedBox(outer.maxX - outer.minX, outer.maxY - outer.minY, outer.maxZ - outer.minZ, cornerRadius),
    {
      position: [(outer.minX + outer.maxX) / 2, (outer.minY + outer.maxY) / 2, outer.minZ],
      ...noRotScale,
    },
  );

  // 內腔：從壁厚位置貫穿到外形頂端以上，確保開口貫通
  const cavityHeight = outer.maxZ - inner.minZ + 1;
  const innerCornerRadius = Math.max(0, cornerRadius - wallThickness);
  const cavitySolid = kernel.transform(
    kernel.roundedBox(inner.maxX - inner.minX, inner.maxY - inner.minY, cavityHeight, innerCornerRadius),
    {
      position: [(inner.minX + inner.maxX) / 2, (inner.minY + inner.maxY) / 2, inner.minZ],
      ...noRotScale,
    },
  );

  let shell = kernel.difference(outerSolid, cavitySolid);

  for (const s of standoffs) {
    const standoffHeight = s.topZ - plan.floorZ;
    if (standoffHeight <= 0) continue;
    const standoffRadius = s.pilotDiameter / 2 + wallThickness;
    const post = kernel.transform(kernel.cylinder(standoffRadius, standoffHeight), {
      position: [s.x, s.y, plan.floorZ],
      ...noRotScale,
    });
    shell = kernel.union(shell, post);
    const pilot = kernel.transform(kernel.cylinder(s.pilotDiameter / 2, s.pilotDepth + 1), {
      position: [s.x, s.y, s.topZ - s.pilotDepth],
      ...noRotScale,
    });
    shell = kernel.difference(shell, pilot);
  }

  return shell;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/shellGeometry.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add src/enclosure
git commit -m "feat: build enclosure shell solid with standoffs"
```

---

### Task 5: 接口投影（開孔）

**Files:**
- Create: `src/enclosure/portProjection.ts`
- Test: `src/enclosure/portProjection.test.ts`

**Interfaces:**
- Consumes: `PartInstance`/`Bounds3`（Task 3）、`GeometryKernel`/`Solid`（Task 1）
- Produces: `PortCutoutPlan { wall: 'north'|'south'|'east'|'west'; u: number; v: number; w: number; h: number; shape: 'rect'|'circle' }`、`planPortCutouts(parts: PartInstance[]): PortCutoutPlan[]`、`cutPorts(shell: Solid, outer: Bounds3, cutouts: PortCutoutPlan[], kernel: GeometryKernel): Solid`

只投影 `face !== 'top'` 的接口，且只支援零件 Z 軸旋轉為 90° 倍數（見全域限制）；`shape` 一律以外接矩形挖孔（避免旋轉圓柱體的高風險程式碼，見全域限制）。

- [ ] **Step 1: 寫失敗測試 `src/enclosure/portProjection.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import type { PartInstance } from './plan';
import { cutPorts, planPortCutouts } from './portProjection';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

const boardDef: PartDefinition = {
  id: 'usb-board',
  name: 'Test',
  nameZh: '測試板',
  category: 'board',
  body: { size: [40, 20, 2], blocks: [] },
  mountingHoles: [],
  ports: [
    { face: 'west', shape: 'rect', x: 5, z: 0, w: 10, h: 5, label: 'USB' },
    { face: 'top', shape: 'circle', x: 0, z: 0, w: 6, h: 6, label: '燈孔' },
  ],
  clearanceHeight: 10,
};

describe('planPortCutouts', () => {
  it('west 面接口投影到 west 牆，含 0.4mm 公差', () => {
    const part: PartInstance = { def: boardDef, transform: identityTransform() };
    const cutouts = planPortCutouts([part]);
    expect(cutouts).toHaveLength(1);
    expect(cutouts[0].wall).toBe('west');
    expect(cutouts[0].w).toBeCloseTo(10.8, 6);
    expect(cutouts[0].h).toBeCloseTo(5.8, 6);
  });

  it('旋轉 90° 後 west 面變成投影到 south 牆', () => {
    const part: PartInstance = {
      def: boardDef,
      transform: { ...identityTransform(), rotation: [0, 0, 90] },
    };
    const cutouts = planPortCutouts([part]);
    expect(cutouts[0].wall).toBe('south');
  });

  it('非 90 倍數旋轉時該零件的接口被略過', () => {
    const part: PartInstance = {
      def: boardDef,
      transform: { ...identityTransform(), rotation: [0, 0, 45] },
    };
    expect(planPortCutouts([part])).toHaveLength(0);
  });

  it('top 面接口不投影到牆面', () => {
    const onlyTop: PartDefinition = {
      ...boardDef,
      ports: [{ face: 'top', shape: 'circle', x: 0, z: 0, w: 6, h: 6 }],
    };
    const part: PartInstance = { def: onlyTop, transform: identityTransform() };
    expect(planPortCutouts([part])).toHaveLength(0);
  });
});

describe('cutPorts', () => {
  it('挖孔後殼體體積變小', () => {
    const shell = kernel.box(50, 30, 20);
    const outer = { minX: -25, maxX: 25, minY: -15, maxY: 15, minZ: 0, maxZ: 20 };
    const before = kernel.volume(shell);
    const after = kernel.volume(
      cutPorts(
        shell,
        outer,
        [{ wall: 'west', u: 0, v: 10, w: 10, h: 5, shape: 'rect' }],
        kernel,
      ),
    );
    expect(after).toBeLessThan(before);
    expect(before - after).toBeGreaterThan(10 * 5 * 2 * 0.5); // 至少挖穿部分壁厚
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/portProjection.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/enclosure/portProjection.ts`**

```ts
import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { Vec3 } from '../types/document';
import type { Bounds3, PartInstance } from './plan';

const DEG = Math.PI / 180;
const TOLERANCE_MM = 0.4;

export interface PortCutoutPlan {
  wall: 'north' | 'south' | 'east' | 'west';
  /** 沿牆面水平方向的世界座標（east/west 牆為 Y，north/south 牆為 X） */
  u: number;
  /** 世界 Z 高度（開孔中心） */
  v: number;
  w: number;
  h: number;
  shape: 'rect' | 'circle';
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function worldNormalToWall(nx: number, ny: number): 'north' | 'south' | 'east' | 'west' {
  if (Math.abs(nx) > Math.abs(ny)) return nx > 0 ? 'east' : 'west';
  return ny > 0 ? 'north' : 'south';
}

/**
 * 把零件側面（非 top）接口投影到對應的外殼牆面。只支援 Z 軸 90° 倍數旋轉，
 * 其餘角度的零件其接口會被略過（見計畫全域限制）。
 */
export function planPortCutouts(parts: PartInstance[]): PortCutoutPlan[] {
  const out: PortCutoutPlan[] = [];
  for (const part of parts) {
    const angle = normalizeAngle(part.transform.rotation[2]);
    if (angle % 90 !== 0) continue;
    const [bodyL, bodyW, bodyT] = part.def.body.size;
    const [px, py, pz] = part.transform.position;
    const rad = angle * DEG;
    const cos = Math.round(Math.cos(rad));
    const sin = Math.round(Math.sin(rad));
    for (const port of part.def.ports) {
      if (port.face === 'top') continue;
      let localX: number;
      let localY: number;
      let normal: [number, number];
      switch (port.face) {
        case 'west':
          localX = -bodyL / 2;
          localY = port.x;
          normal = [-1, 0];
          break;
        case 'east':
          localX = bodyL / 2;
          localY = port.x;
          normal = [1, 0];
          break;
        case 'south':
          localX = port.x;
          localY = -bodyW / 2;
          normal = [0, -1];
          break;
        case 'north':
        default:
          localX = port.x;
          localY = bodyW / 2;
          normal = [0, 1];
          break;
      }
      const worldX = px + localX * cos - localY * sin;
      const worldY = py + localX * sin + localY * cos;
      const worldNX = normal[0] * cos - normal[1] * sin;
      const worldNY = normal[0] * sin + normal[1] * cos;
      const wall = worldNormalToWall(worldNX, worldNY);
      const horizontal = wall === 'east' || wall === 'west' ? worldY : worldX;
      out.push({
        wall,
        u: horizontal,
        v: pz + bodyT + port.z,
        w: port.w + TOLERANCE_MM * 2,
        h: port.h + TOLERANCE_MM * 2,
        shape: port.shape,
      });
    }
  }
  return out;
}

/** 在殼體對應牆面挖出矩形開孔（見全域限制：一律以外接矩形挖孔） */
export function cutPorts(
  shell: Solid,
  outer: Bounds3,
  cutouts: PortCutoutPlan[],
  kernel: GeometryKernel,
): Solid {
  let result = shell;
  const cutDepth = 20;
  for (const c of cutouts) {
    const isEastWest = c.wall === 'east' || c.wall === 'west';
    const box = isEastWest ? kernel.box(cutDepth, c.w, c.h) : kernel.box(c.w, cutDepth, c.h);
    let position: [number, number, number];
    if (c.wall === 'east') position = [outer.maxX, c.u, c.v - c.h / 2];
    else if (c.wall === 'west') position = [outer.minX, c.u, c.v - c.h / 2];
    else if (c.wall === 'north') position = [c.u, outer.maxY, c.v - c.h / 2];
    else position = [c.u, outer.minY, c.v - c.h / 2];
    const cut = kernel.transform(box, { position, rotation: [0, 0, 0], scale: [1, 1, 1] });
    result = kernel.difference(result, cut);
  }
  return result;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/portProjection.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
git add src/enclosure
git commit -m "feat: project part side ports onto enclosure walls as cutouts"
```

---

### Task 6: 上蓋幾何

**Files:**
- Create: `src/enclosure/lidGeometry.ts`
- Test: `src/enclosure/lidGeometry.test.ts`

**Interfaces:**
- Consumes: `ShellPlan`（Task 3）、`planCornerPosts`（Task 3）、`pilotDiameter`（Task 2）、`GeometryKernel`/`Solid`（Task 1）
- Produces: `buildLidSolid(plan: ShellPlan, params: EnclosureParams, kernel: GeometryKernel): Solid`

`lidType === 'screw'`：面板 + 貼合內腔的唇邊（0.4mm 間隙）+ 四角螺絲柱（含通孔，鎖入殼體對應角柱的自攻導孔）。`lidType === 'slide'`：只有面板 + 唇邊（無螺絲柱，靠摩擦力滑入）。`lidType === 'open'` 不呼叫本函數（由呼叫端略過，見 Task 7）。

- [ ] **Step 1: 寫失敗測試 `src/enclosure/lidGeometry.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import type { PartDefinition } from '../parts/schema';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { DEFAULT_ENCLOSURE_PARAMS, planShell } from './plan';
import type { PartInstance } from './plan';
import { buildLidSolid } from './lidGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

const boardDef: PartDefinition = {
  id: 'test-board',
  name: 'Test',
  nameZh: '測試板',
  category: 'board',
  body: { size: [40, 20, 2], blocks: [] },
  mountingHoles: [],
  ports: [],
  clearanceHeight: 10,
};

const parts: PartInstance[] = [{ def: boardDef, transform: identityTransform() }];

describe('buildLidSolid', () => {
  it('screw 上蓋體積大於面板本身（含唇邊與螺絲柱，扣除通孔仍為正）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const solid = buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, kernel);
    const panelOnly =
      (plan.outer.maxX - plan.outer.minX) *
      (plan.outer.maxY - plan.outer.minY) *
      DEFAULT_ENCLOSURE_PARAMS.wallThickness;
    expect(kernel.volume(solid)).toBeGreaterThan(panelOnly * 0.8);
  });

  it('slide 上蓋比 screw 上蓋體積小（無螺絲柱）', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const screwLid = kernel.volume(buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, kernel));
    const slideLid = kernel.volume(
      buildLidSolid(plan, { ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'slide' }, kernel),
    );
    expect(slideLid).toBeLessThan(screwLid);
  });

  it('上蓋底面（不含唇邊/螺絲柱向下延伸部分）貼齊殼體開口頂端', () => {
    const plan = planShell(parts, DEFAULT_ENCLOSURE_PARAMS);
    const mesh = kernel.toMesh(buildLidSolid(plan, DEFAULT_ENCLOSURE_PARAMS, kernel));
    let maxZ = -Infinity;
    for (let i = 2; i < mesh.positions.length; i += 3) maxZ = Math.max(maxZ, mesh.positions[i]);
    expect(maxZ).toBeCloseTo(plan.inner.maxZ + DEFAULT_ENCLOSURE_PARAMS.wallThickness, 0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/lidGeometry.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/enclosure/lidGeometry.ts`**

```ts
import type { GeometryKernel, Solid } from '../geometry/kernel';
import { pilotDiameter } from './screws';
import { planCornerPosts } from './plan';
import type { EnclosureParams, ShellPlan } from './plan';

const noRotScale = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
const LIP_MARGIN = 0.4;
const LIP_HEIGHT = 3;
const POST_HEIGHT = 4;

function buildLip(plan: ShellPlan, wallThickness: number, height: number, kernel: GeometryKernel, panelZ: number): Solid {
  const { inner, cornerRadius } = plan;
  const innerCornerRadius = Math.max(0, cornerRadius - wallThickness);
  return kernel.transform(
    kernel.roundedBox(
      inner.maxX - inner.minX - LIP_MARGIN * 2,
      inner.maxY - inner.minY - LIP_MARGIN * 2,
      height,
      Math.max(0, innerCornerRadius - LIP_MARGIN),
    ),
    {
      position: [(inner.minX + inner.maxX) / 2, (inner.minY + inner.maxY) / 2, panelZ - height],
      ...noRotScale,
    },
  );
}

/** 上蓋（screw：面板+唇邊+四角螺絲柱；slide：面板+唇邊）。呼叫端應在 lidType==='open' 時不呼叫本函數 */
export function buildLidSolid(plan: ShellPlan, params: EnclosureParams, kernel: GeometryKernel): Solid {
  const { outer, cornerRadius } = plan;
  const panelH = params.wallThickness;
  const panelZ = plan.inner.maxZ;

  let lid = kernel.transform(
    kernel.roundedBox(outer.maxX - outer.minX, outer.maxY - outer.minY, panelH, cornerRadius),
    {
      position: [(outer.minX + outer.maxX) / 2, (outer.minY + outer.maxY) / 2, panelZ],
      ...noRotScale,
    },
  );

  lid = kernel.union(lid, buildLip(plan, params.wallThickness, LIP_HEIGHT, kernel, panelZ));

  if (params.lidType === 'screw') {
    for (const p of planCornerPosts(plan, params.screwSize)) {
      const postRadius = p.pilotDiameter / 2 + params.wallThickness;
      const post = kernel.transform(kernel.cylinder(postRadius, POST_HEIGHT), {
        position: [p.x, p.y, panelZ - POST_HEIGHT],
        ...noRotScale,
      });
      lid = kernel.union(lid, post);
      const through = kernel.transform(
        kernel.cylinder(pilotDiameter(params.screwSize, 'through') / 2, panelH + POST_HEIGHT + 2),
        { position: [p.x, p.y, panelZ - POST_HEIGHT - 1], ...noRotScale },
      );
      lid = kernel.difference(lid, through);
    }
  }

  return lid;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/lidGeometry.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add src/enclosure
git commit -m "feat: build enclosure lid geometry (screw and slide variants)"
```

---

### Task 7: EnclosureNode 文件模型與組裝

**Files:**
- Modify: `src/types/document.ts`（新增 `EnclosureNode`）
- Modify: `src/geometry/evaluate.ts`（`buildSolid` 支援 enclosure 節點）
- Modify: `src/enclosure/plan.ts`（`EnclosureParams` 改為從 `types/document.ts` re-export）
- Create: `src/enclosure/generate.ts`（worker-safe 組裝入口）
- Create: `src/enclosure/actions.ts`（store 層：產生/重新產生）
- Test: `src/types/document.test.ts`（追加）、`src/geometry/evaluate.test.ts`（追加）、`src/enclosure/actions.test.ts`

**Interfaces:**
- Produces: `EnclosureNode { type:'enclosure'; part:'base'|'lid'; params: EnclosureParams; sourceParts: {nodeId:string; partId:string; transform:Transform}[] } & NodeCommon`；`SceneNode` 聯集加入 `EnclosureNode`；`buildEnclosureNodeSolid(node: EnclosureNode, kernel: GeometryKernel): Solid | null`（**worker-safe，不得匯入 store**）；`generateEnclosure(params: EnclosureParams): void`、`regenerateEnclosure(nodeId: string): void`（store 層，呼叫 `useDocumentStore`）
- Consumes: `getPartDefinition`（Plan 2）、Task 3-6 全部函數、`findNode`/`useDocumentStore`（僅 `actions.ts` 使用）

- [ ] **Step 1: 追加失敗測試**

`src/types/document.test.ts` 追加（於既有 `describe` 內，需 import `identityTransform`／已存在）：

```ts
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
      },
      sourceParts: [],
    };
    expect(node.type).toBe('enclosure');
  });
```

`src/geometry/evaluate.test.ts` 追加（需 import `getPartDefinition` 由 `../parts/library`，測試檔已有 `createPartNode` 等既有 import，沿用）：

```ts
  it('enclosure 節點（base）可求值出實心殼體', () => {
    const boardDef = getPartDefinition('arduino-nano')!;
    const enclosureNode: SceneNode = {
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
        lidType: 'open',
        screwSize: 'M3',
      },
      sourceParts: [{ nodeId: 'x', partId: boardDef.id, transform: identityTransform() }],
    };
    const solid = evaluateForExport([enclosureNode], kernel);
    expect(solid).not.toBeNull();
    expect(kernel.volume(solid!)).toBeGreaterThan(0);
  });

  it('enclosure 節點找不到任何來源零件定義時回傳 null（被略過而非拋錯）', () => {
    const ghost: SceneNode = {
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
        lidType: 'open',
        screwSize: 'M3',
      },
      sourceParts: [{ nodeId: 'x', partId: 'does-not-exist', transform: identityTransform() }],
    };
    expect(evaluateForExport([ghost], kernel)).toBeNull();
  });
```

在 `src/geometry/evaluate.test.ts` 檔案頂部追加 import：

```ts
import { getPartDefinition } from '../parts/library';
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/types/document.test.ts src/geometry/evaluate.test.ts`
Expected: FAIL — `EnclosureNode` 型別不存在／`buildSolid` 不支援 `enclosure`

- [ ] **Step 3: 實作**

`src/types/document.ts` 於 `PartNode` 定義之後追加（`EnclosureParams` 直接內嵌定義於此檔，避免 `types/document.ts` 反向依賴 `enclosure/plan.ts`；`enclosure/plan.ts` 改為從這裡 re-export 型別，見下）：

```ts
export type ScrewSizeLiteral = 'M2' | 'M2.5' | 'M3' | 'M4';

export interface EnclosureParams {
  wallThickness: number;
  clearanceMargin: number;
  cornerRadius: number;
  lidType: 'screw' | 'slide' | 'open';
  screwSize: ScrewSizeLiteral;
}

export interface EnclosureSourcePart {
  nodeId: string;
  partId: string;
  transform: Transform;
}

export interface EnclosureNode extends NodeCommon {
  type: 'enclosure';
  part: 'base' | 'lid';
  params: EnclosureParams;
  sourceParts: EnclosureSourcePart[];
}

export type SceneNode = PrimitiveNode | GroupNode | PartNode | EnclosureNode;
```

（移除原本 `export type SceneNode = PrimitiveNode | GroupNode | PartNode;` 那一行，改成上面含 `EnclosureNode` 的版本。）

修改 `src/enclosure/plan.ts`：把 `ScrewSize`（Task 2 `screws.ts` 的型別）與 `types/document.ts` 的 `ScrewSizeLiteral` 對齊——`screws.ts` 的 `ScrewSize` 已經是 `'M2'|'M2.5'|'M3'|'M4'`，與 `ScrewSizeLiteral` 結構相同，兩者互相相容（TS 結構化型別），不需修改 `screws.ts`。將 `plan.ts` 內的 `EnclosureParams` 定義改為 re-export：

```ts
export type { EnclosureParams } from '../types/document';
```

並移除 `plan.ts` 內原本手寫的 `export interface EnclosureParams {...}` 區塊（改用上面這行 re-export；`DEFAULT_ENCLOSURE_PARAMS` 常數與其餘函式簽名不變，因為結構相同）。

`src/geometry/evaluate.ts` 加入 import 與 dispatch 分支：

```ts
import { buildEnclosureNodeSolid } from '../enclosure/generate';
```

`buildSolid` 函數的 if/else 鏈追加一個分支（放在 `part` 分支之後、`group` 的 `else` 之前）：

```ts
  } else if (node.type === 'enclosure') {
    base = buildEnclosureNodeSolid(node, kernel);
  } else if (node.type === 'part') {
```

（實際插入位置：把既有的 `} else if (node.type === 'part') { ... }` 區塊保留，只在其後、`else { base = combineScope(...) }` 之前插入上面的 `enclosure` 分支；即最終順序為 primitive → part → enclosure → group。）

建立 `src/enclosure/generate.ts`（**不得 import store/zustand/react**）：

```ts
import { getPartDefinition } from '../parts/library';
import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { EnclosureNode } from '../types/document';
import { planCornerPosts, planShell, planStandoffs } from './plan';
import type { PartInstance } from './plan';
import { cutPorts, planPortCutouts } from './portProjection';
import { buildShellSolid } from './shellGeometry';
import { buildLidSolid } from './lidGeometry';

function resolveParts(node: EnclosureNode): PartInstance[] {
  const out: PartInstance[] = [];
  for (const s of node.sourceParts) {
    const def = getPartDefinition(s.partId);
    if (def) out.push({ def, transform: s.transform });
  }
  return out;
}

/** 由 EnclosureNode 組裝出 Solid；worker-safe（不依賴 store）。找不到任何來源零件時回傳 null */
export function buildEnclosureNodeSolid(node: EnclosureNode, kernel: GeometryKernel): Solid | null {
  const parts = resolveParts(node);
  if (parts.length === 0) return null;
  const plan = planShell(parts, node.params);

  if (node.part === 'lid') {
    if (node.params.lidType === 'open') return null;
    return buildLidSolid(plan, node.params, kernel);
  }

  const standoffs = [
    ...planStandoffs(parts, node.params.screwSize),
    ...(node.params.lidType === 'screw' ? planCornerPosts(plan, node.params.screwSize) : []),
  ];
  let shell = buildShellSolid(plan, node.params.wallThickness, standoffs, kernel);
  shell = cutPorts(shell, plan.outer, planPortCutouts(parts), kernel);
  return shell;
}
```

建立 `src/enclosure/actions.ts`（store 層，UI 元件呼叫）：

```ts
import { findNode, useDocumentStore } from '../store/documentStore';
import { identityTransform, newId } from '../types/document';
import type { EnclosureNode, EnclosureParams, EnclosureSourcePart, SceneNode } from '../types/document';

function collectPartSnapshots(nodes: SceneNode[]): EnclosureSourcePart[] {
  const out: EnclosureSourcePart[] = [];
  const visit = (list: SceneNode[]) => {
    for (const n of list) {
      if (!n.visible) continue;
      if (n.type === 'part') out.push({ nodeId: n.id, partId: n.partId, transform: n.transform });
      else if (n.type === 'group') visit(n.children);
    }
  };
  visit(nodes);
  return out;
}

function makeEnclosureNode(
  part: 'base' | 'lid',
  params: EnclosureParams,
  sourceParts: EnclosureSourcePart[],
): EnclosureNode {
  return {
    type: 'enclosure',
    id: newId(),
    name: part === 'base' ? '外殼底座' : '外殼上蓋',
    role: 'solid',
    transform: identityTransform(),
    visible: true,
    locked: false,
    part,
    params,
    sourceParts,
  };
}

/** 依文件中目前所有可見零件節點產生外殼（base，以及非 open 時的 lid）。無零件時不動作 */
export function generateEnclosure(params: EnclosureParams): void {
  const store = useDocumentStore.getState();
  const sourceParts = collectPartSnapshots(store.doc.nodes);
  if (sourceParts.length === 0) return;
  store.addNode(makeEnclosureNode('base', params, sourceParts));
  if (params.lidType !== 'open') {
    store.addNode(makeEnclosureNode('lid', params, sourceParts));
  }
}

/** 用目前零件最新位置重新產生指定外殼節點（沿用其既有 params） */
export function regenerateEnclosure(nodeId: string): void {
  const store = useDocumentStore.getState();
  const node = findNode(store.doc.nodes, nodeId);
  if (!node || node.type !== 'enclosure') return;
  const refreshed = node.sourceParts.map((s) => {
    const live = findNode(store.doc.nodes, s.nodeId);
    return live && live.type === 'part' ? { ...s, transform: live.transform } : s;
  });
  store.updateNode(nodeId, (n) => {
    if (n.type === 'enclosure') n.sourceParts = refreshed;
  });
}
```

- [ ] **Step 4: 寫 `src/enclosure/actions.test.ts`（TDD 用於 Step 3 之後的驗證，非事前紅測；action 依賴真實 store，測試沿用 `documentStore.test.ts` 的 `beforeEach` 重置慣例）**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDocument, identityTransform, createPartNode } from '../types/document';
import { findNode, useDocumentStore } from '../store/documentStore';
import { DEFAULT_ENCLOSURE_PARAMS } from './plan';
import { generateEnclosure, regenerateEnclosure } from './actions';

beforeEach(() => {
  useDocumentStore.setState({
    doc: emptyDocument(),
    selection: [],
    past: [],
    future: [],
    dragBase: null,
  });
});

describe('generateEnclosure', () => {
  it('沒有零件時不新增任何節點', () => {
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    expect(useDocumentStore.getState().doc.nodes).toHaveLength(0);
  });

  it('有零件時新增 base 與 lid 兩個 enclosure 節點（screw 型）', () => {
    useDocumentStore.getState().addNode(createPartNode('arduino-nano', 'Nano'));
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    const nodes = useDocumentStore.getState().doc.nodes.filter((n) => n.type === 'enclosure');
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.type === 'enclosure' && n.part).sort()).toEqual(['base', 'lid']);
  });

  it('open 型只新增 base，不新增 lid', () => {
    useDocumentStore.getState().addNode(createPartNode('arduino-nano', 'Nano'));
    generateEnclosure({ ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'open' });
    const nodes = useDocumentStore.getState().doc.nodes.filter((n) => n.type === 'enclosure');
    expect(nodes).toHaveLength(1);
  });
});

describe('regenerateEnclosure', () => {
  it('用零件目前位置更新 sourceParts', () => {
    const part = createPartNode('arduino-nano', 'Nano');
    useDocumentStore.getState().addNode(part);
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    const baseId = useDocumentStore
      .getState()
      .doc.nodes.find((n) => n.type === 'enclosure' && n.part === 'base')!.id;

    useDocumentStore.getState().updateNode(part.id, (n) => {
      n.transform.position = [50, 0, 0];
    });
    regenerateEnclosure(baseId);

    const base = findNode(useDocumentStore.getState().doc.nodes, baseId);
    expect(base?.type === 'enclosure' && base.sourceParts[0].transform.position).toEqual([50, 0, 0]);
  });

  it('目標不是 enclosure 節點時不動作', () => {
    const part = createPartNode('arduino-nano', 'Nano');
    useDocumentStore.getState().addNode(part);
    regenerateEnclosure(part.id);
    expect(findNode(useDocumentStore.getState().doc.nodes, part.id)).toEqual(part);
  });
});
```

- [ ] **Step 5: 執行測試確認通過**

Run: `npx vitest run`
Expected: 全綠（約 106 tests：87 + document 追加 1 + evaluate 追加 2 + plan/shellGeometry/portProjection/lidGeometry/screws 共 24 + actions 5）

- [ ] **Step 6: 驗證建置**

Run: `npx tsc --noEmit && npm run build`
Expected: 無錯誤；worker chunk 正常產出（`enclosure/generate.ts` 經 `evaluate.ts` 被 worker 引用）

- [ ] **Step 7: Commit**

```bash
git add src/types src/geometry/evaluate.ts src/enclosure
git commit -m "feat: add EnclosureNode with generate/regenerate actions"
```

---

### Task 8: 外殼參數面板 UI

**Files:**
- Create: `src/components/EnclosurePanel.tsx`
- Modify: `src/components/Toolbar.tsx`（掛載開關按鈕）
- Modify: `src/components/PropertyCard.tsx`（enclosure 節點顯示「重新產生」按鈕）
- Modify: `src/i18n/zh.json`、`src/i18n/en.json`（新增 `enclosure.*` key）

**Interfaces:**
- Consumes: `generateEnclosure`/`regenerateEnclosure`（Task 7）、`DEFAULT_ENCLOSURE_PARAMS`/`EnclosureParams`（Task 3，經 `types/document.ts` re-export）

UI 元件不寫單元測試；以 `npm run build` + 瀏覽器手動驗證。

- [ ] **Step 1: 在 `src/i18n/zh.json` 的頂層加入 `enclosure` 區塊**（放在 `"export"` 區塊之後、`"errors"` 之前）：

```json
  "enclosure": {
    "title": "產生外殼",
    "wallThickness": "壁厚 (mm)",
    "clearanceMargin": "淨空邊距 (mm)",
    "cornerRadius": "圓角半徑 (mm)",
    "lidType": "上蓋類型",
    "lidScrew": "螺絲上蓋",
    "lidSlide": "滑蓋",
    "lidOpen": "開放式",
    "screwSize": "螺絲規格",
    "generate": "產生外殼",
    "regenerate": "重新產生",
    "noParts": "場景中沒有零件，無法產生外殼"
  },
```

同步在 `src/i18n/en.json` 對應位置加入：

```json
  "enclosure": {
    "title": "Generate enclosure",
    "wallThickness": "Wall thickness (mm)",
    "clearanceMargin": "Clearance margin (mm)",
    "cornerRadius": "Corner radius (mm)",
    "lidType": "Lid type",
    "lidScrew": "Screw-on lid",
    "lidSlide": "Slide lid",
    "lidOpen": "Open",
    "screwSize": "Screw size",
    "generate": "Generate enclosure",
    "regenerate": "Regenerate",
    "noParts": "No parts in the scene to enclose"
  },
```

- [ ] **Step 2: 建立 `src/components/EnclosurePanel.tsx`**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateEnclosure } from '../enclosure/actions';
import { DEFAULT_ENCLOSURE_PARAMS } from '../enclosure/plan';
import type { EnclosureParams } from '../types/document';
import { useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';

export function EnclosurePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [params, setParams] = useState<EnclosureParams>(DEFAULT_ENCLOSURE_PARAMS);

  const set = <K extends keyof EnclosureParams>(key: K, value: EnclosureParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const generate = () => {
    const hasParts = useDocumentStore
      .getState()
      .doc.nodes.some((n) => n.type === 'part' && n.visible);
    if (!hasParts) {
      useToastStore.getState().show(t('enclosure.noParts'));
      return;
    }
    generateEnclosure(params);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-medium text-slate-800">{t('enclosure.title')}</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <NumberField
            label={t('enclosure.wallThickness')}
            value={params.wallThickness}
            onChange={(v) => set('wallThickness', v)}
          />
          <NumberField
            label={t('enclosure.clearanceMargin')}
            value={params.clearanceMargin}
            onChange={(v) => set('clearanceMargin', v)}
          />
          <NumberField
            label={t('enclosure.cornerRadius')}
            value={params.cornerRadius}
            onChange={(v) => set('cornerRadius', v)}
          />
        </div>
        <label className="mb-3 block">
          <span className="text-xs text-slate-400">{t('enclosure.lidType')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
            value={params.lidType}
            onChange={(e) => set('lidType', e.target.value as EnclosureParams['lidType'])}
          >
            <option value="screw">{t('enclosure.lidScrew')}</option>
            <option value="slide">{t('enclosure.lidSlide')}</option>
            <option value="open">{t('enclosure.lidOpen')}</option>
          </select>
        </label>
        <label className="mb-4 block">
          <span className="text-xs text-slate-400">{t('enclosure.screwSize')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
            value={params.screwSize}
            onChange={(e) => set('screwSize', e.target.value as EnclosureParams['screwSize'])}
          >
            {(['M2', 'M2.5', 'M3', 'M4'] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-11 rounded-xl px-4 text-sm text-slate-600 hover:bg-slate-100"
          >
            {t('export.cancel')}
          </button>
          <button
            onClick={generate}
            className="h-11 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700"
          >
            {t('enclosure.generate')}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="number"
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
        value={draft ?? value}
        min={0}
        step={0.5}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = Number.parseFloat(e.target.value);
          if (!Number.isNaN(v) && v >= 0) onChange(v);
        }}
      />
    </label>
  );
}
```

- [ ] **Step 3: 修改 `src/components/Toolbar.tsx`**

import `PackageOpen` icon與 `EnclosurePanel`：

```tsx
import { Box, Circle, Cone, Cylinder, Download, PackageOpen, Redo2, Trash2, Undo2 } from 'lucide-react';
import { EnclosurePanel } from './EnclosurePanel';
```

在 `const [showExport, setShowExport] = useState(false);` 之後加一行：

```tsx
  const [showEnclosure, setShowEnclosure] = useState(false);
```

在工具列 JSX 內、`匯出` 按鈕的 `<Divider />` 之前插入新按鈕（即形狀按鈕與復原/重做群之間）：

```tsx
        <Divider />
        <ToolButton title={t('enclosure.title')} onClick={() => setShowEnclosure(true)}>
          <PackageOpen size={20} />
        </ToolButton>
```

在 fragment 最外層（`{showExport && <ExportDialog .../>}` 之後）加入：

```tsx
      {showEnclosure && <EnclosurePanel onClose={() => setShowEnclosure(false)} />}
```

- [ ] **Step 4: 修改 `src/components/PropertyCard.tsx`**

import `RefreshCw` icon 與 `regenerateEnclosure`：

```tsx
import { RefreshCw } from 'lucide-react';
import { regenerateEnclosure } from '../enclosure/actions';
```

在 `PropertyCard` 函數內、`{node.type === 'primitive' && <ParamFields .../>}` 這一行之後加入：

```tsx
      {node.type === 'enclosure' && (
        <button
          onClick={() => regenerateEnclosure(node.id)}
          className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw size={16} />
          {t('enclosure.regenerate')}
        </button>
      )}
```

- [ ] **Step 5: 驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠；無型別錯誤

手動（`npm run dev`）：放入一個 Arduino Nano → 點「產生外殼」圖示 → 對話框產生 → 點「產生外殼」按鈕 → 畫布出現包住零件的殼體與上蓋（半透明選取後可見支柱與唇邊）→ 選取殼體節點 → 屬性卡出現「重新產生」按鈕 → 拖動零件位置 → 點重新產生 → 殼體幾何更新。

- [ ] **Step 6: Commit**

```bash
git add src/components src/i18n
git commit -m "feat: add enclosure generation panel and regenerate action"
```

---

### Task 9: 螺絲孔與孔位投影工具

**Files:**
- Create: `src/enclosure/screwHoleNode.ts`
- Create: `src/enclosure/holeProjection.ts`
- Create: `src/components/ScrewToolsMenu.tsx`
- Modify: `src/store/documentStore.ts`（新增 `addNodes` 批次動作）
- Modify: `src/components/Toolbar.tsx`（掛載開關按鈕）
- Modify: `src/i18n/zh.json`、`src/i18n/en.json`
- Test: `src/enclosure/screwHoleNode.test.ts`、`src/enclosure/holeProjection.test.ts`、`src/store/documentStore.test.ts`（追加）

**Interfaces:**
- Consumes: `SCREW_TABLE`/`pilotDiameter`/`ScrewSize`/`HoleStyle`（Task 2）、`createPrimitive`/`PartNode`/`PrimitiveNode`（既有）、`getPartDefinition`（Plan 2）
- Produces: `createScrewHoleNode(size, style): SceneNode`、`projectPartHoles(part, targetZRange, screwSize): PrimitiveNode[]`、`primitiveZRange(node): {min,max}`、`useDocumentStore().addNodes: (nodes: SceneNode[]) => void`

- [ ] **Step 1: 寫失敗測試 `src/enclosure/screwHoleNode.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { SCREW_TABLE } from './screws';
import { createScrewHoleNode } from './screwHoleNode';

describe('createScrewHoleNode', () => {
  it('through 樣式產生單一圓柱孔節點，半徑符合通孔尺寸', () => {
    const node = createScrewHoleNode('M3', 'through');
    expect(node.type).toBe('primitive');
    expect(node.role).toBe('hole');
    expect(node.type === 'primitive' && node.params.radius).toBeCloseTo(SCREW_TABLE.M3.throughDiameter / 2, 6);
  });

  it('selfTap 樣式半徑符合自攻導孔尺寸', () => {
    const node = createScrewHoleNode('M3', 'selfTap');
    expect(node.type === 'primitive' && node.params.radius).toBeCloseTo(SCREW_TABLE.M3.selfTapDiameter / 2, 6);
  });

  it('countersink 樣式產生含導孔與錐面兩個子節點的群組，role 為 hole', () => {
    const node = createScrewHoleNode('M3', 'countersink');
    expect(node.type).toBe('group');
    expect(node.role).toBe('hole');
    expect(node.type === 'group' && node.children).toHaveLength(2);
    expect(node.type === 'group' && node.children.map((c) => c.type === 'primitive' && c.kind)).toEqual([
      'cylinder',
      'cone',
    ]);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/screwHoleNode.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/enclosure/screwHoleNode.ts`**

```ts
import { createPrimitive, identityTransform, newId } from '../types/document';
import type { GroupNode, SceneNode } from '../types/document';
import { SCREW_TABLE } from './screws';
import type { HoleStyle, ScrewSize } from './screws';

const PILOT_HALF_HEIGHT = 10;

/** 建立標準螺絲孔節點（role='hole'），置於原點，供使用者以 gizmo 拖曳到定位 */
export function createScrewHoleNode(size: ScrewSize, style: HoleStyle): SceneNode {
  const spec = SCREW_TABLE[size];

  if (style === 'through') {
    return createPrimitive('cylinder', {
      name: `${size} 通孔`,
      role: 'hole',
      params: { radius: spec.throughDiameter / 2, height: PILOT_HALF_HEIGHT * 2 },
    });
  }

  if (style === 'selfTap') {
    return createPrimitive('cylinder', {
      name: `${size} 自攻導孔`,
      role: 'hole',
      params: { radius: spec.selfTapDiameter / 2, height: PILOT_HALF_HEIGHT * 2 },
    });
  }

  const pilot = createPrimitive('cylinder', {
    params: { radius: spec.selfTapDiameter / 2, height: PILOT_HALF_HEIGHT * 2 },
  });
  pilot.transform.position = [0, 0, -PILOT_HALF_HEIGHT];
  const sink = createPrimitive('cone', {
    params: {
      radiusBottom: spec.selfTapDiameter / 2,
      radiusTop: spec.countersinkDiameter / 2,
      height: spec.countersinkDepth,
    },
  });
  sink.transform.position = [0, 0, PILOT_HALF_HEIGHT];
  const group: GroupNode = {
    type: 'group',
    id: newId(),
    name: `${size} 沉頭孔`,
    role: 'hole',
    transform: identityTransform(),
    visible: true,
    locked: false,
    children: [pilot, sink],
  };
  return group;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/enclosure/screwHoleNode.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: 寫失敗測試 `src/enclosure/holeProjection.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createPartNode, createPrimitive } from '../types/document';
import { pilotDiameter } from './screws';
import { primitiveZRange, projectPartHoles } from './holeProjection';

describe('primitiveZRange', () => {
  it('box：底部為 transform.position.z，頂部加上 height', () => {
    const box = createPrimitive('box');
    box.transform.position = [0, 0, 5];
    expect(primitiveZRange(box)).toEqual({ min: 5, max: 25 });
  });

  it('sphere：頂部為底部加兩倍半徑', () => {
    const sphere = createPrimitive('sphere');
    expect(primitiveZRange(sphere)).toEqual({ min: 0, max: 20 });
  });
});

describe('projectPartHoles', () => {
  it('每個安裝孔對應一個投影孔，XY 對齊零件孔位', () => {
    const part = createPartNode('arduino-nano', 'Nano');
    part.transform.position = [10, 0, 0];
    const holes = projectPartHoles(part, { min: -2, max: 0 }, 'M2');
    expect(holes).toHaveLength(4);
    for (const h of holes) {
      expect(h.role).toBe('hole');
      expect(h.params.radius).toBeCloseTo(pilotDiameter('M2', 'selfTap') / 2, 6);
    }
  });

  it('找不到零件定義時回傳空陣列', () => {
    const part = createPartNode('does-not-exist', 'ghost');
    expect(projectPartHoles(part, { min: 0, max: 1 }, 'M3')).toEqual([]);
  });
});
```

- [ ] **Step 6: 執行測試確認失敗**

Run: `npx vitest run src/enclosure/holeProjection.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 7: 建立 `src/enclosure/holeProjection.ts`**

```ts
import { getPartDefinition } from '../parts/library';
import { createPrimitive } from '../types/document';
import type { PartNode, PrimitiveNode } from '../types/document';
import { pilotDiameter } from './screws';
import type { ScrewSize } from './screws';

const DEG = Math.PI / 180;

export function primitiveZRange(node: PrimitiveNode): { min: number; max: number } {
  const z = node.transform.position[2];
  const height = node.kind === 'sphere' ? node.params.radius * 2 : node.params.height;
  return { min: z, max: z + height };
}

/**
 * 把零件安裝孔投影成對齊的螺絲孔（role='hole' 圓柱），XY 對齊孔位，
 * 高度貫穿目標板件的整個垂直範圍（+2mm 餘量）。
 */
export function projectPartHoles(
  part: PartNode,
  targetZRange: { min: number; max: number },
  screwSize: ScrewSize,
): PrimitiveNode[] {
  const def = getPartDefinition(part.partId);
  if (!def) return [];
  const angle = part.transform.rotation[2] * DEG;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [px, py] = part.transform.position;
  const height = targetZRange.max - targetZRange.min + 2;
  return def.mountingHoles.map((hole) => {
    const node = createPrimitive('cylinder', {
      name: '投影螺絲孔',
      role: 'hole',
      params: { radius: pilotDiameter(screwSize, 'selfTap') / 2, height },
    });
    node.transform.position = [
      px + hole.x * cos - hole.y * sin,
      py + hole.x * sin + hole.y * cos,
      targetZRange.min - 1,
    ];
    return node;
  });
}
```

- [ ] **Step 8: 執行測試確認通過**

Run: `npx vitest run src/enclosure/holeProjection.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 9: 追加失敗測試到 `src/store/documentStore.test.ts`**

```ts
  it('addNodes 一次加入多個節點並整體選取，佔一步 undo', () => {
    const a = createPrimitive('box');
    const b = createPrimitive('cylinder');
    store().addNodes([a, b]);
    expect(store().doc.nodes).toHaveLength(2);
    expect(store().selection.sort()).toEqual([a.id, b.id].sort());
    store().undo();
    expect(store().doc.nodes).toHaveLength(0);
  });
```

- [ ] **Step 10: 執行測試確認失敗**

Run: `npx vitest run src/store/documentStore.test.ts`
Expected: FAIL — `addNodes is not a function`

- [ ] **Step 11: 修改 `src/store/documentStore.ts`**

在 `DocumentState` 介面的 `addNode` 宣告之後加入：

```ts
  addNodes: (nodes: SceneNode[]) => void;
```

在 store 實作的 `addNode` 之後加入：

```ts
  addNodes: (nodes) => {
    if (nodes.length === 0) return;
    get().mutate('新增節點', (d) => {
      d.nodes.push(...nodes);
    });
    set({ selection: nodes.map((n) => n.id) });
  },
```

- [ ] **Step 12: 執行測試確認通過**

Run: `npx vitest run src/store/documentStore.test.ts`
Expected: PASS（11 tests）

- [ ] **Step 13: 加入 Shift 點選多選（`projectHoles` 需要恰好選取兩個節點，目前 Viewport 點選一律單選，必須先支援多選）**

修改 `src/components/Viewport.tsx` 的 `SceneMesh` 元件，把 `onSelect` prop 型別從 `() => void` 改為 `(shiftKey: boolean) => void`：

```tsx
function SceneMesh({
  payload,
  selected,
  isPart,
  onSelect,
}: {
  payload: NodeMeshPayload;
  selected: boolean;
  isPart: boolean;
  onSelect: (shiftKey: boolean) => void;
}) {
```

`SceneMesh` 的 `<mesh onClick>` 改為：

```tsx
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
```

`Viewport` 元件內傳給 `<SceneMesh>` 的 `onSelect` 改為：

```tsx
            onSelect={(shiftKey) => {
              if (shiftKey) {
                const current = useDocumentStore.getState().selection;
                setSelection(
                  current.includes(m.nodeId)
                    ? current.filter((id) => id !== m.nodeId)
                    : [...current, m.nodeId],
                );
              } else {
                setSelection([m.nodeId]);
              }
            }}
```

- [ ] **Step 14: 執行測試確認全部仍通過（UI 元件無單元測試，此步驟確認未破壞既有測試）**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 全綠；無型別錯誤

- [ ] **Step 15: i18n key** — 於 `src/i18n/zh.json` 的 `enclosure` 區塊之後加入 `tools` 區塊：

```json
  "tools": {
    "title": "螺絲工具",
    "screwHole": "放置螺絲孔",
    "projectHoles": "投影孔位",
    "size": "規格",
    "style": "孔型",
    "throughStyle": "通孔",
    "selfTapStyle": "自攻",
    "countersinkStyle": "沉頭",
    "add": "加入",
    "projectNeedsSelection": "請先選取一個零件與一個板件（恰好兩個節點）",
    "projected": "已投影 {{count}} 個螺絲孔"
  },
```

`en.json` 對應：

```json
  "tools": {
    "title": "Screw tools",
    "screwHole": "Place screw hole",
    "projectHoles": "Project hole positions",
    "size": "Size",
    "style": "Style",
    "throughStyle": "Through",
    "selfTapStyle": "Self-tap",
    "countersinkStyle": "Countersink",
    "add": "Add",
    "projectNeedsSelection": "Select exactly one part and one plate first",
    "projected": "Projected {{count}} screw holes"
  },
```

- [ ] **Step 16: 建立 `src/components/ScrewToolsMenu.tsx`**

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createScrewHoleNode } from '../enclosure/screwHoleNode';
import { primitiveZRange, projectPartHoles } from '../enclosure/holeProjection';
import type { HoleStyle, ScrewSize } from '../enclosure/screws';
import { findNode, useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';

const SIZES: ScrewSize[] = ['M2', 'M2.5', 'M3', 'M4'];
const STYLES: { value: HoleStyle; key: string }[] = [
  { value: 'through', key: 'tools.throughStyle' },
  { value: 'selfTap', key: 'tools.selfTapStyle' },
  { value: 'countersink', key: 'tools.countersinkStyle' },
];

export function ScrewToolsMenu({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [size, setSize] = useState<ScrewSize>('M3');
  const [style, setStyle] = useState<HoleStyle>('through');
  const addNode = useDocumentStore((s) => s.addNode);
  const addNodes = useDocumentStore((s) => s.addNodes);

  const addScrewHole = () => {
    addNode(createScrewHoleNode(size, style));
    onClose();
  };

  const projectHoles = () => {
    const { selection, doc } = useDocumentStore.getState();
    if (selection.length !== 2) {
      useToastStore.getState().show(t('tools.projectNeedsSelection'));
      return;
    }
    const [a, b] = selection.map((id) => findNode(doc.nodes, id));
    const part = a?.type === 'part' ? a : b?.type === 'part' ? b : undefined;
    const plate = a?.type === 'primitive' ? a : b?.type === 'primitive' ? b : undefined;
    if (!part || !plate) {
      useToastStore.getState().show(t('tools.projectNeedsSelection'));
      return;
    }
    const holes = projectPartHoles(part, primitiveZRange(plate), size);
    if (holes.length === 0) return;
    addNodes(holes);
    useToastStore.getState().show(t('tools.projected', { count: holes.length }));
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30"
      onClick={onClose}
    >
      <div
        className="w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-medium text-slate-800">{t('tools.title')}</p>
        <label className="mb-3 block">
          <span className="text-xs text-slate-400">{t('tools.size')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
            value={size}
            onChange={(e) => setSize(e.target.value as ScrewSize)}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-4 block">
          <span className="text-xs text-slate-400">{t('tools.style')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
            value={style}
            onChange={(e) => setStyle(e.target.value as HoleStyle)}
          >
            {STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.key)}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={addScrewHole}
          className="mb-2 h-11 w-full rounded-xl bg-slate-800 text-sm font-medium text-white hover:bg-slate-700"
        >
          {t('tools.screwHole')}：{t('tools.add')}
        </button>
        <button
          onClick={projectHoles}
          className="h-11 w-full rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
        >
          {t('tools.projectHoles')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 17: 修改 `src/components/Toolbar.tsx`**

import `Wrench` icon 與 `ScrewToolsMenu`：

```tsx
import { Box, Circle, Cone, Cylinder, Download, PackageOpen, Redo2, Trash2, Undo2, Wrench } from 'lucide-react';
import { ScrewToolsMenu } from './ScrewToolsMenu';
```

加入 state：

```tsx
  const [showTools, setShowTools] = useState(false);
```

在外殼按鈕之後加入：

```tsx
        <ToolButton title={t('tools.title')} onClick={() => setShowTools(true)}>
          <Wrench size={20} />
        </ToolButton>
```

在 fragment 內加入面板：

```tsx
      {showTools && <ScrewToolsMenu onClose={() => setShowTools(false)} />}
```

- [ ] **Step 18: 驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠（約 122 tests）；無型別錯誤

手動：點螺絲工具圖示 → 選 M3/通孔 → 「加入」→ 畫布出現半透明紅色圓柱孔 → 拖曳到方塊上挖洞；放一個零件 + 一個方塊 → 點零件、Shift+點方塊（兩者都應顯示選取狀態）→ 點「投影孔位」→ 板件上出現對齊零件安裝孔的孔，toast 顯示投影數量。

- [ ] **Step 19: Commit**

```bash
git add src/enclosure src/components src/store src/i18n
git commit -m "feat: add screw hole placement and hole-projection tools"
```

---

### Task 10: CRC-32 與最小 ZIP 封裝

**Files:**
- Create: `src/export/crc32.ts`
- Create: `src/export/zip.ts`
- Test: `src/export/crc32.test.ts`、`src/export/zip.test.ts`

**Interfaces:**
- Produces: `crc32(bytes: Uint8Array): number`、`writeZipStored(entries: {name: string; data: Uint8Array}[]): ArrayBuffer`

3MF 檔案是一個 ZIP 壓縮檔。沿用 Plan 1 手刻 STL 的風格，手刻最小 ZIP（只用 STORED／不壓縮，避免引入壓縮函式庫），不依賴任何套件。

- [ ] **Step 1: 寫失敗測試 `src/export/crc32.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32';

describe('crc32', () => {
  it('空陣列的 CRC32 為 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('標準測試向量 "123456789" → 0xCBF43926', () => {
    const bytes = new TextEncoder().encode('123456789');
    expect(crc32(bytes)).toBe(0xcbf43926);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/export/crc32.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/export/crc32.ts`**

```ts
let table: Uint32Array | null = null;

function getTable(): Uint32Array {
  if (table) return table;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  table = t;
  return t;
}

/** 標準 CRC-32（IEEE 802.3），ZIP 格式要求 */
export function crc32(bytes: Uint8Array): number {
  const t = getTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = t[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/export/crc32.test.ts`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add src/export/crc32.ts src/export/crc32.test.ts
git commit -m "feat: add CRC-32 implementation for ZIP entries"
```

- [ ] **Step 6: 寫失敗測試 `src/export/zip.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32';
import { writeZipStored } from './zip';

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

describe('writeZipStored', () => {
  it('產生的檔案以本地檔頭簽章開頭', () => {
    const buf = writeZipStored([{ name: 'a.txt', data: new TextEncoder().encode('hello') }]);
    const view = new DataView(buf);
    expect(readU32(view, 0)).toBe(0x04034b50);
  });

  it('每個項目的 CRC32 與內容長度正確寫入本地檔頭', () => {
    const data = new TextEncoder().encode('hello world');
    const buf = writeZipStored([{ name: 'a.txt', data }]);
    const view = new DataView(buf);
    expect(readU32(view, 14)).toBe(crc32(data)); // CRC-32 欄位
    expect(readU32(view, 18)).toBe(data.length); // 壓縮後大小（STORED = 原始大小）
    expect(readU32(view, 22)).toBe(data.length); // 未壓縮大小
  });

  it('結尾含中央目錄結束記錄簽章', () => {
    const buf = writeZipStored([{ name: 'a.txt', data: new Uint8Array([1, 2, 3]) }]);
    const view = new DataView(buf);
    expect(readU32(view, buf.byteLength - 22)).toBe(0x06054b50);
  });

  it('多個項目都能寫入且檔案總長度合理（大於各項目資料總和）', () => {
    const entries = [
      { name: 'a.txt', data: new Uint8Array([1, 2, 3]) },
      { name: 'b/c.txt', data: new Uint8Array([4, 5]) },
    ];
    const buf = writeZipStored(entries);
    const totalData = entries.reduce((sum, e) => sum + e.data.length, 0);
    expect(buf.byteLength).toBeGreaterThan(totalData);
  });
});
```

- [ ] **Step 7: 執行測試確認失敗**

Run: `npx vitest run src/export/zip.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 8: 建立 `src/export/zip.ts`**

```ts
import { crc32 } from './crc32';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/** 產生最小可用的 ZIP（STORED，不壓縮），供 3MF 等 OPC 格式使用 */
export function writeZipStored(entries: ZipEntry[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = new DataView(new ArrayBuffer(30));
    localHeader.setUint32(0, LOCAL_SIG, true);
    localHeader.setUint16(4, 20, true); // version needed
    localHeader.setUint16(6, 0, true); // flags
    localHeader.setUint16(8, 0, true); // method = stored
    localHeader.setUint16(10, 0, true); // mod time
    localHeader.setUint16(12, 0, true); // mod date
    localHeader.setUint32(14, crc, true);
    localHeader.setUint32(18, entry.data.length, true);
    localHeader.setUint32(22, entry.data.length, true);
    localHeader.setUint16(26, nameBytes.length, true);
    localHeader.setUint16(28, 0, true); // extra length

    const localOffset = offset;
    parts.push(new Uint8Array(localHeader.buffer), nameBytes, entry.data);
    offset += 30 + nameBytes.length + entry.data.length;

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, CENTRAL_SIG, true);
    central.setUint16(4, 20, true); // version made by
    central.setUint16(6, 20, true); // version needed
    central.setUint16(8, 0, true); // flags
    central.setUint16(10, 0, true); // method
    central.setUint16(12, 0, true); // mod time
    central.setUint16(14, 0, true); // mod date
    central.setUint32(16, crc, true);
    central.setUint32(20, entry.data.length, true);
    central.setUint32(24, entry.data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true); // extra length
    central.setUint16(32, 0, true); // comment length
    central.setUint16(34, 0, true); // disk number
    central.setUint16(36, 0, true); // internal attrs
    central.setUint32(38, 0, true); // external attrs
    central.setUint32(42, localOffset, true);
    centralParts.push(new Uint8Array(central.buffer), nameBytes);
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const p of centralParts) centralSize += p.length;

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, EOCD_SIG, true);
  eocd.setUint16(4, 0, true); // disk number
  eocd.setUint16(6, 0, true); // central dir start disk
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralStart, true);
  eocd.setUint16(20, 0, true); // comment length

  const all = [...parts, ...centralParts, new Uint8Array(eocd.buffer)];
  const totalSize = all.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const a of all) {
    out.set(a, pos);
    pos += a.length;
  }
  return out.buffer;
}
```

- [ ] **Step 9: 執行測試確認通過**

Run: `npx vitest run src/export/zip.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 10: 執行完整套件與建置**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠

- [ ] **Step 11: Commit**

```bash
git add src/export/zip.ts src/export/zip.test.ts
git commit -m "feat: add minimal STORED-only ZIP writer for 3MF export"
```

---

### Task 11: 3MF 匯出與格式選擇

**Files:**
- Create: `src/export/threemf.ts`
- Modify: `src/components/ExportDialog.tsx`（格式選擇 STL/3MF）
- Modify: `src/i18n/zh.json`、`src/i18n/en.json`
- Test: `src/export/threemf.test.ts`

**Interfaces:**
- Consumes: `MeshData`（Plan 1 `geometry/kernel.ts`）、`writeZipStored`（Task 10）
- Produces: `writeThreeMf(mesh: MeshData): ArrayBuffer`

- [ ] **Step 1: 寫失敗測試 `src/export/threemf.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { writeThreeMf } from './threemf';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

function extractStoredEntry(buf: ArrayBuffer, name: string): string {
  // 手動解析：STORED 項目資料緊跟在本地檔頭之後，檔名長度可從檔頭讀出
  const view = new DataView(buf);
  let offset = 0;
  while (offset < buf.byteLength && view.getUint32(offset, true) === 0x04034b50) {
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameBytes = new Uint8Array(buf, offset + 30, nameLen);
    const entryName = new TextDecoder().decode(nameBytes);
    const dataStart = offset + 30 + nameLen + extraLen;
    if (entryName === name) {
      return new TextDecoder().decode(new Uint8Array(buf, dataStart, compSize));
    }
    offset = dataStart + compSize;
  }
  throw new Error(`entry not found: ${name}`);
}

describe('writeThreeMf', () => {
  it('產生的 ZIP 含三個必要項目', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    const buf = writeThreeMf(mesh);
    expect(() => extractStoredEntry(buf, '[Content_Types].xml')).not.toThrow();
    expect(() => extractStoredEntry(buf, '_rels/.rels')).not.toThrow();
    expect(() => extractStoredEntry(buf, '3D/3dmodel.model')).not.toThrow();
  });

  it('3dmodel.model 內的頂點與三角形數量與 mesh 相符', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    const buf = writeThreeMf(mesh);
    const xml = extractStoredEntry(buf, '3D/3dmodel.model');
    const vertexCount = mesh.positions.length / 3;
    const triCount = mesh.indices.length / 3;
    expect((xml.match(/<vertex /g) ?? []).length).toBe(vertexCount);
    expect((xml.match(/<triangle /g) ?? []).length).toBe(triCount);
  });

  it('[Content_Types].xml 宣告 3mf model content type', () => {
    const mesh = kernel.toMesh(kernel.box(5, 5, 5));
    const buf = writeThreeMf(mesh);
    const xml = extractStoredEntry(buf, '[Content_Types].xml');
    expect(xml).toContain('3dmanufacturing-3dmodel');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/export/threemf.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/export/threemf.ts`**

```ts
import type { MeshData } from '../geometry/kernel';
import { writeZipStored } from './zip';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

function buildModelXml(mesh: MeshData): string {
  const vertexCount = mesh.positions.length / 3;
  const vertices: string[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const x = mesh.positions[i * 3];
    const y = mesh.positions[i * 3 + 1];
    const z = mesh.positions[i * 3 + 2];
    vertices[i] = `<vertex x="${x}" y="${y}" z="${z}"/>`;
  }
  const triCount = mesh.indices.length / 3;
  const triangles: string[] = new Array(triCount);
  for (let i = 0; i < triCount; i++) {
    const a = mesh.indices[i * 3];
    const b = mesh.indices[i * 3 + 1];
    const c = mesh.indices[i * 3 + 2];
    triangles[i] = `<triangle v1="${a}" v2="${b}" v3="${c}"/>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<resources>
<object id="1" type="model">
<mesh>
<vertices>
${vertices.join('\n')}
</vertices>
<triangles>
${triangles.join('\n')}
</triangles>
</mesh>
</object>
</resources>
<build>
<item objectid="1"/>
</build>
</model>`;
}

/** 產生最小可用的 3MF（ZIP + 核心 XML），可被 PrusaSlicer/Bambu Studio/Cura 讀取 */
export function writeThreeMf(mesh: MeshData): ArrayBuffer {
  const encoder = new TextEncoder();
  return writeZipStored([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(RELS) },
    { name: '3D/3dmodel.model', data: encoder.encode(buildModelXml(mesh)) },
  ]);
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/export/threemf.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: i18n key** — `src/i18n/zh.json` 的 `export` 區塊內加入：

```json
    "format": "檔案格式"
```

（放在 `"title": "匯出 STL",` 這行**之後**，並把該行改成 `"title": "匯出模型",`，因為對話框現在同時支援兩種格式。）`en.json` 對應：把 `"title": "Export STL",` 改為 `"title": "Export model",`，並加入 `"format": "File format"`。

- [ ] **Step 6: 修改 `src/components/ExportDialog.tsx`**

在檔案頂部 import 加入：

```tsx
import { writeThreeMf } from '../export/threemf';
```

在 `const [stats, setStats] = useState<MeshStats | null>(null);` 之後加入格式 state：

```tsx
  const [format, setFormat] = useState<'stl' | '3mf'>('stl');
```

把 `download` 函數改為：

```tsx
  const download = () => {
    if (!mesh) return;
    const { doc } = useDocumentStore.getState();
    const buffer = format === 'stl' ? writeBinaryStl(mesh) : writeThreeMf(mesh);
    const mime = format === 'stl' ? 'model/stl' : 'model/3mf';
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };
```

在對話框內、`{t('export.title')}` 段落之後、尺寸摘要區塊之前插入格式選擇器：

```tsx
        <label className="mb-3 block">
          <span className="text-xs text-slate-400">{t('export.format')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'stl' | '3mf')}
          >
            <option value="stl">STL</option>
            <option value="3mf">3MF</option>
          </select>
        </label>
```

- [ ] **Step 7: 驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠（約 130 tests）

手動：放一個方塊 → 匯出 → 選 3MF → 下載 → 用 macOS 快速預覽或線上 3MF 檢視器確認能開啟且形狀正確。

- [ ] **Step 8: Commit**

```bash
git add src/export src/components/ExportDialog.tsx src/i18n
git commit -m "feat: add 3MF export with format selector"
```

---

### Task 12: Worker 崩潰自動重啟

**Files:**
- Modify: `src/geometry/workerClient.ts`（`GeometryClient.replaceWorker`）
- Modify: `src/geometry/client.ts`（真實 Worker 的 `onerror` → 重建）
- Test: `src/geometry/workerClient.test.ts`（追加）

**Interfaces:**
- Produces: `GeometryClient.replaceWorker(worker: WorkerLike): void`（清空進行中狀態、重新掛載 `onmessage`、若有上次 evaluate 請求則重送；進行中的 export promise 一律 reject，因為對應的 worker 已消失、回應永遠不會來）

- [ ] **Step 1: 寫失敗測試（追加到 `src/geometry/workerClient.test.ts` 的 `describe('GeometryClient', ...)` 內）**

```ts
  it('replaceWorker 後重送最近一次 evaluate 請求', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    client.requestEvaluate(nodes());
    worker.respond({ id: worker.posted[0].id, ok: true, type: 'evaluate', meshes: [] });

    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);

    expect(worker2.posted).toHaveLength(1);
    expect(worker2.posted[0].type).toBe('evaluate');
  });

  it('replaceWorker 前沒有任何 evaluate 請求時不會送出多餘請求', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);
    expect(worker2.posted).toHaveLength(0);
  });

  it('replaceWorker 時讓所有進行中的 export promise reject', async () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const promise = client.requestExport(nodes());
    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);
    await expect(promise).rejects.toThrow('WORKER_RESTARTED');
  });

  it('replaceWorker 後新 worker 的訊息會被正確處理', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const onMeshes = vi.fn();
    client.onMeshes = onMeshes;
    const worker2 = new FakeWorker();
    client.replaceWorker(worker2);
    client.requestEvaluate(nodes());
    worker2.respond({ id: worker2.posted[0].id, ok: true, type: 'evaluate', meshes: [] });
    expect(onMeshes).toHaveBeenCalledWith([]);
  });
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/geometry/workerClient.test.ts`
Expected: FAIL — `client.replaceWorker is not a function`

- [ ] **Step 3: 修改 `src/geometry/workerClient.ts`**

`GeometryClient` 的 `worker` 建構子參數目前是 `private worker: WorkerLike`（非 readonly，`this.worker = worker` 可直接賦值，無需修改建構子簽名）。

`pendingNodes` 只在「上一批 evaluate 仍在進行中、新請求被排入佇列」時才有值；如果 worker 是在「已送出一批 evaluate、正在等回應」的當下崩潰，此時沒有排隊中的請求，需要另外記住「最近一次送出的節點」才能在重啟後重送。在 class 屬性區塊（`private pendingNodes: SceneNode[] | null = null;` 之後）加入：

```ts
  private lastSentNodes: SceneNode[] | null = null;
```

修改 `requestEvaluate`，送出的同時記錄下來：

```ts
  requestEvaluate(nodes: SceneNode[]): void {
    if (this.evaluating) {
      this.pendingNodes = nodes;
      return;
    }
    this.evaluating = true;
    this.lastSentNodes = nodes;
    this.worker.postMessage({ id: this.nextId++, type: 'evaluate', nodes });
  }
```

在 `requestExport` 方法之後加入 `replaceWorker`（`pendingNodes` 優先於 `lastSentNodes`，因為佇列中的請求代表更新的文件狀態）：

```ts
  /** Worker 崩潰時呼叫：換上新 worker，讓進行中的 export 失敗，並重送最近一次 evaluate 請求 */
  replaceWorker(worker: WorkerLike): void {
    for (const pending of this.exports.values()) {
      pending.reject(new Error('WORKER_RESTARTED'));
    }
    this.exports.clear();
    this.worker = worker;
    worker.onmessage = (e) => this.handle(e.data);
    this.evaluating = false;
    const nodes = this.pendingNodes ?? this.lastSentNodes;
    this.pendingNodes = null;
    this.lastSentNodes = null;
    if (nodes) this.requestEvaluate(nodes);
  }
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/geometry/workerClient.test.ts`
Expected: PASS（10 tests：原 6 + 新增 4）

- [ ] **Step 5: 修改 `src/geometry/client.ts`**

```ts
import { GeometryClient } from './workerClient';

let client: GeometryClient | null = null;

function createWorker(): Worker {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onerror = () => {
    worker.terminate();
    const fresh = createWorker();
    client?.replaceWorker(fresh);
  };
  return worker;
}

export function getGeometryClient(): GeometryClient {
  if (!client) {
    client = new GeometryClient(createWorker());
  }
  return client;
}
```

- [ ] **Step 6: 執行完整套件與建置**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全綠

- [ ] **Step 7: Commit**

```bash
git add src/geometry
git commit -m "feat: auto-restart geometry worker on crash and replay last evaluate"
```

---

### Task 13: Playwright E2E 冒煙測試

**Files:**
- Modify: `package.json`（`npm install -D @playwright/test && npx playwright install --with-deps chromium`）
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`

**Interfaces:**
- 無程式介面；純測試基礎設施。E2E 在功能已存在後撰寫，用來驗證整合，不驅動開發（與規格 §13 一致）。

- [ ] **Step 1: 安裝 Playwright**

Run: `npm install -D @playwright/test`
Run: `npx playwright install --with-deps chromium`

加一個 npm script：在 `package.json` 的 `"scripts"` 內加入：

```json
    "test:e2e": "playwright test"
```

- [ ] **Step 2: 建立 `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:5183',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: 建立 `e2e/smoke.spec.ts`**

流程對應規格 §13：建專案（自動）→ 放零件 → 產生外殼 → 匯出 STL。

```ts
import { expect, test } from '@playwright/test';

test('建立零件、產生外殼、匯出 STL', async ({ page }) => {
  await page.goto('/');

  // 等待畫布就緒（工具列出現代表 App 已掛載）
  await expect(page.getByRole('button', { name: '零件庫' })).toBeVisible();

  // 放入一個零件
  await page.getByRole('button', { name: '零件庫' }).click();
  await page.getByPlaceholder('搜尋零件').fill('nano');
  await page.getByText('Arduino Nano').click();

  // 確認場景中出現屬性卡（零件已選取）
  await expect(page.getByLabel('名稱')).toHaveValue('Arduino Nano');

  // 產生外殼
  await page.getByTitle('產生外殼').click();
  await page.getByRole('button', { name: '產生外殼', exact: true }).click();

  // 匯出 STL：攔截下載事件確認檔案產生
  await page.getByTitle('匯出 STL').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載 STL' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.stl$/);
});
```

- [ ] **Step 4: 執行 E2E 測試**

Run: `npm run test:e2e`
Expected: PASS（1 test）。若因選擇器與實際 DOM 不符而失敗，用 `npx playwright test --debug` 檢查實際可互動元素文字/aria-label 並調整選擇器（不可調整成允許測試通過但未驗證到正確行為的寬鬆斷言）。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.ts e2e
git commit -m "test: add Playwright E2E smoke test (part -> enclosure -> STL export)"
```

---

### Task 14: 最終整合驗證

**Files:** 無新檔案（只驗證與修復）

- [ ] **Step 1: 全套驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run test:e2e`
Expected: 全部通過（約 130 個 vitest + 1 個 Playwright），無型別錯誤，建置成功

- [ ] **Step 2: 瀏覽器驗證清單**（`npm run dev`）

1. 放入一個 Arduino Uno + 一個 HC-SR04（有側面接口）
2. 點「產生外殼」→ 預設參數 → 產生 → 出現底座（含支柱、四角螺絲柱）與上蓋（含唇邊、螺絲柱通孔）
3. 底座 west 面應有對應 HC-SR04 USB/接口的開孔（若該零件旋轉非 90 倍數則此步驟略過並記錄）
4. 選取底座 → 屬性卡「重新產生」按鈕存在；拖動零件位置後點擊 → 殼體幾何更新
5. 螺絲工具：放置一個 M3 通孔、拖曳定位；選一個零件+一個板件、Shift 多選、投影孔位成功
6. 匯出：STL 與 3MF 都能下載且非空檔案
7. 語言切換：外殼面板、螺絲工具面板文字隨語言切換
8. 開發者工具 Console 面板：Application → Service Workers/Workers 找到 geometry worker，手動 `worker.terminate()` 模擬崩潰後，繼續拖曳零件應仍能正常求值（自動重啟生效）——若瀏覽器 devtools 無法直接終止 worker，改為在 Console 執行 `window.dispatchEvent(new ErrorEvent('error'))`（若無效則此步驟記錄為「以 workerClient.test.ts 的單元測試覆蓋，未做瀏覽器級手動驗證」，不可略過測試本身）
9. 無 console 錯誤

- [ ] **Step 3: 修復發現的問題並 commit**

發現問題時：讀原始碼診斷 → 修復 → 重跑驗證 → 以 `fix:` commit。

---

## 完成驗證

- [ ] `npm test`、`tsc --noEmit`、`npm run build`、`npm run test:e2e` 全綠
- [ ] Task 14 瀏覽器清單全部通過（或明確記錄無法瀏覽器級驗證的項目與其單元測試覆蓋依據）
- [ ] 規格覆蓋：§8 外殼生成器（壁厚/淨空/圓角/盒型/支柱/接口投影/上蓋）✓、§9 螺絲孔工具與孔位投影 ✓（boolean/孔模式已於 Plan 1 完成）、§11 3MF 匯出 ✓、§12 Worker 自動重啟 ✓、§13 Playwright 冒煙測試 ✓
- [ ] 明確記錄的 v1 範圍限制（非遺漏，見「Global Constraints」）：外殼只包住文件中全部可見零件（無多選 UI 指定子集）；零件旋轉僅 90° 倍數才會有接口投影；接口開孔一律外接矩形；真正的 mesh 壁厚分析（而非參數層級檢查）留給未來工作；規格 §8「選配：通風槽」未實作（v1 不做，可用既有孔模式 primitive 手動加開槽孔）；規格 §10「視角方塊（ViewCube）」未實作（Plan 1/2 也未涵蓋，非本計畫範圍，記錄為後續工作）

完成後使用 superpowers:finishing-a-development-branch skill 決定合併方式。





