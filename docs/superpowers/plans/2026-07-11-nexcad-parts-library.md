# NexCAD 零件庫與持久化實作計畫（Plan 2 / 3）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加入 23 個電子零件的零件庫（資料定義 + 程式化 3D 幾何 + 抽屜 UI + 孔位磁吸）、中英雙語、IndexedDB 專案持久化與 `.nexcad` 檔、匯出前列印檢查，並補齊 Plan 1 審查標記的缺口。

**Architecture:** 零件是資料不是模型：每個零件一份通過 zod 驗證的 `PartDefinition`（尺寸、安裝孔、接口、淨空高度），3D 外觀由 `buildPartSolid()` 從定義程式化生成。文件模型新增 `PartNode`（引用零件 id）。持久化用 IndexedDB（idb），文件本身是 JSON-safe 的場景樹，直接序列化。規格見 `docs/superpowers/specs/2026-07-10-nexcad-design.md` §7、§10、§11、§12。

**Tech Stack:** 既有 Plan 1 技術棧 + zod（schema 驗證）、i18next + react-i18next（雙語）、idb（IndexedDB）、fake-indexeddb（測試用 dev dep）。

## Global Constraints

- 所有尺寸單位 mm；primitive 與零件的本地原點在**底面中心**（Plan 1 慣例）
- 幾何求值走 `GeometryKernel`，呼叫端負責 `releaseAll()`（arena 記憶體契約，Plan 1 建立）
- `evaluate.ts` 是純函數：不得跨呼叫快取 `Solid` 把手
- 觸控目標 ≥ 44px（Tailwind `h-11 w-11`）；light theme；TypeScript strict
- 測試檔與原始碼同目錄（`*.test.ts`）；UI 元件不寫單元測試（WebGL 無法在 node 環境運作），以 `npm run build` + 瀏覽器手動驗證
- 預設語言 zh（繁中），可切換 en；零件英文名（`name`）不翻譯
- **零件尺寸為 v1 近似值**（依常見公開規格），檔案標註來源狀態；修正尺寸屬純資料變更
- Commit 訊息用 conventional commits（feat/fix/test/chore）；不要 commit `.DS_Store`

---

## 檔案結構

```
src/
  capabilities.ts              WebGL2/WASM 偵測（純函數）             [Task 1]
  types/document.ts            newId 強化；新增 PartNode              [Task 1, 6]
  store/toastStore.ts          toast 狀態（zustand）                  [Task 2]
  components/ToastStack.tsx    toast 顯示                             [Task 2]
  parts/schema.ts              zod PartDefinition schema              [Task 3]
  parts/library.ts             23 個零件定義 + registry               [Task 4]
  parts/partGeometry.ts        PartDefinition → Solid（純函數）       [Task 5]
  geometry/evaluate.ts         buildSolid 支援 part 節點              [Task 6]
  i18n/{index.ts,zh.json,en.json}  雙語資源                           [Task 7]
  components/LanguageToggle.tsx 語言切換                              [Task 7]
  components/PartsDrawer.tsx   底部零件抽屜                           [Task 8]
  geometry/holeSnap.ts         孔位磁吸（純函數）                     [Task 9]
  components/SelectionGizmo.tsx 整合磁吸                              [Task 9]
  persistence/db.ts            idb 封裝（CRUD）                        [Task 10]
  store/projectStore.ts        目前專案 id                            [Task 10]
  hooks/useAutosave.ts         debounce 自動儲存 + pagehide flush     [Task 10]
  persistence/nexcadFile.ts    .nexcad 序列化/驗證解析                [Task 11]
  components/ProjectsPanel.tsx 專案列表 modal + 匯入/匯出             [Task 11]
  export/analyze.ts            bbox/三角形數/薄件警告（純函數）       [Task 12]
  components/ExportDialog.tsx  匯出對話框                             [Task 12]
```

修改的既有檔案：`main.tsx`（能力偵測 + i18n 載入）、`App.tsx`（新元件掛載、頂部列）、`Toolbar.tsx`（i18n、匯出改開對話框）、`PropertyCard.tsx`（i18n、aria-pressed）、`Viewport.tsx`（onError → toast、零件配色）、`geometry/worker.ts`（錯誤碼）、`geometry/workerClient.test.ts`（錯誤碼）。

---

### Task 1: 基礎強化（newId、能力偵測、a11y）

**Files:**
- Modify: `src/types/document.ts`（newId）
- Create: `src/capabilities.ts`
- Modify: `src/main.tsx`
- Modify: `src/components/PropertyCard.tsx`（RoleToggle aria-pressed）
- Test: `src/capabilities.test.ts`、`src/types/document.test.ts`（追加）

**Interfaces:**
- Produces: `detectCapabilities(doc?): { webgl2: boolean; wasm: boolean }`；`newId(): string`（簽名不變，實作改用 crypto.randomUUID）

- [ ] **Step 1: 追加失敗測試**

在 `src/types/document.test.ts` 的 describe 內追加：

```ts
  it('newId 使用 UUID 格式且大量生成不重複', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
    expect(newId()).toMatch(/^n_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
```

並 import `newId`。建立 `src/capabilities.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { detectCapabilities } from './capabilities';

const fakeDoc = (ctx: unknown) =>
  ({ createElement: () => ({ getContext: () => ctx }) }) as unknown as Pick<Document, 'createElement'>;

describe('detectCapabilities', () => {
  it('WebGL2 context 存在時 webgl2 為 true', () => {
    expect(detectCapabilities(fakeDoc({})).webgl2).toBe(true);
  });

  it('getContext 回傳 null 時 webgl2 為 false', () => {
    expect(detectCapabilities(fakeDoc(null)).webgl2).toBe(false);
  });

  it('getContext 拋錯時 webgl2 為 false 且不會 throw', () => {
    const doc = {
      createElement: () => ({ getContext: () => { throw new Error('no gl'); } }),
    } as unknown as Pick<Document, 'createElement'>;
    expect(detectCapabilities(doc).webgl2).toBe(false);
  });

  it('Node 環境有 WebAssembly，wasm 為 true', () => {
    expect(detectCapabilities(fakeDoc({})).wasm).toBe(true);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/capabilities.test.ts src/types/document.test.ts`
Expected: FAIL — `capabilities` 模組不存在；newId 格式不符

- [ ] **Step 3: 實作**

建立 `src/capabilities.ts`：

```ts
export interface Capabilities {
  webgl2: boolean;
  wasm: boolean;
}

/** 偵測執行環境是否支援 NexCAD 所需功能（規格 §12） */
export function detectCapabilities(
  doc: Pick<Document, 'createElement'> = document,
): Capabilities {
  let webgl2 = false;
  try {
    webgl2 = doc.createElement('canvas').getContext('webgl2') != null;
  } catch {
    webgl2 = false;
  }
  const wasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  return { webgl2, wasm };
}
```

修改 `src/types/document.ts` 的 `newId`（保留 counter fallback）：

```ts
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `n_${crypto.randomUUID()}`;
  }
  idCounter += 1;
  return `n_${Date.now().toString(36)}_${idCounter}`;
}
```

改寫 `src/main.tsx`：

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { detectCapabilities } from './capabilities';
import './index.css';

const caps = detectCapabilities();
const root = createRoot(document.getElementById('root')!);

if (!caps.webgl2 || !caps.wasm) {
  const missing = [!caps.webgl2 && 'WebGL2', !caps.wasm && 'WebAssembly']
    .filter(Boolean)
    .join('、');
  root.render(
    <div style={{ maxWidth: 480, margin: '20vh auto', padding: 24, fontFamily: 'system-ui', color: '#334155' }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>NexCAD 無法在這個瀏覽器執行</h1>
      <p style={{ marginBottom: 8 }}>缺少必要功能：{missing}。請改用最新版本的 Safari、Chrome 或 Edge。</p>
      <p style={{ color: '#64748b' }}>
        NexCAD can&apos;t run in this browser (missing: {missing}). Please use a recent version of
        Safari, Chrome, or Edge.
      </p>
    </div>,
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

修改 `src/components/PropertyCard.tsx` 中 `RoleToggle` 的按鈕，加上 aria-pressed：

```tsx
        <button
          key={role}
          onClick={() => onChange(role)}
          aria-pressed={node.role === role}
          className={`rounded-lg py-1.5 text-sm ${
            node.role === role ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
```

- [ ] **Step 4: 驗證**

Run: `npx vitest run && npm run build`
Expected: 全部通過（38 tests）；建置無錯誤

- [ ] **Step 5: Commit**

```bash
git add src/capabilities.ts src/capabilities.test.ts src/types src/main.tsx src/components/PropertyCard.tsx
git commit -m "feat: add capability detection, UUID node ids, and role toggle a11y"
```

---

### Task 2: Toast 通知（取代 alert 與 console-only 錯誤）

**Files:**
- Create: `src/store/toastStore.ts`、`src/components/ToastStack.tsx`
- Modify: `src/components/Viewport.tsx`（onError → toast）、`src/components/Toolbar.tsx`（alert → toast）、`src/App.tsx`（掛載 ToastStack）
- Test: `src/store/toastStore.test.ts`

**Interfaces:**
- Produces: `useToastStore` zustand store，`show(message: string): void`、`dismiss(id: number): void`、`toasts: { id: number; message: string }[]`。後續 task 用 `useToastStore.getState().show(...)` 顯示錯誤。

- [ ] **Step 1: 寫失敗測試 `src/store/toastStore.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from './toastStore';

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toastStore', () => {
  it('show 加入訊息', () => {
    useToastStore.getState().show('測試訊息');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('測試訊息');
  });

  it('5 秒後自動消失', () => {
    useToastStore.getState().show('a');
    vi.advanceTimersByTime(5001);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('dismiss 立即移除指定 toast', () => {
    useToastStore.getState().show('a');
    useToastStore.getState().show('b');
    const first = useToastStore.getState().toasts[0];
    useToastStore.getState().dismiss(first.id);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['b']);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/store/toastStore.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/store/toastStore.ts`**

```ts
import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string) => void;
  dismiss: (id: number) => void;
}

const TOAST_DURATION_MS = 5000;
let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message) => {
    toastId += 1;
    const id = toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, TOAST_DURATION_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/store/toastStore.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: 建立 `src/components/ToastStack.tsx`**

```tsx
import { useToastStore } from '../store/toastStore';

export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className="absolute bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-2 text-sm text-amber-800 shadow-lg backdrop-blur"
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: 接線**

`src/components/Viewport.tsx`：import `useToastStore`，把 `client.onError` 改為：

```ts
    client.onError = (message) => {
      console.warn('幾何運算失敗：', message);
      useToastStore.getState().show(`幾何運算失敗，已保留上一個有效狀態（${message}）`);
    };
```

`src/components/Toolbar.tsx`：import `useToastStore`，`exportStl` 的 `catch` 改為：

```ts
    } catch (err) {
      useToastStore.getState().show(err instanceof Error ? err.message : '匯出失敗');
    } finally {
```

`src/App.tsx`：import 並在 `<PropertyCard />` 後掛 `<ToastStack />`。

- [ ] **Step 7: 驗證與 Commit**

Run: `npx vitest run && npm run build` — Expected: 全綠（41 tests）

```bash
git add src/store/toastStore.ts src/store/toastStore.test.ts src/components/ToastStack.tsx src/components/Viewport.tsx src/components/Toolbar.tsx src/App.tsx
git commit -m "feat: add toast notifications for geometry and export errors"
```

---

### Task 3: 零件定義 schema（zod）

**Files:**
- Modify: `package.json`（新增 `"zod": "^4.4.3"` 至 dependencies（實際安裝 v4，已驗證相容），執行 `npm install zod`）
- Create: `src/parts/schema.ts`
- Test: `src/parts/schema.test.ts`

**Interfaces:**
- Produces: `partDefinitionSchema`（zod）、型別 `PartDefinition`、`PartBlock`、`MountingHole`、`PartPort`、`PartCategory = 'board'|'sensor'|'power'|'component'`

零件座標慣例：原點 = 主體底面中心，x 沿長邊、y 沿短邊、z 向上。`blocks` 的 z 從主體**頂面**起算（可為負）；`mountingHoles` 的 z 為孔平面絕對高度（預設 0 = 底面，伺服馬達固定翼等用非零值）。`ports` 供 Plan 3 外殼開孔：`face` 為 north(+y)/south(−y)/east(+x)/west(−x)/top；`x` 為沿該面的水平偏移（top 面時為板面 x 偏移）、`z` 為自主體頂面起算的垂直偏移（top 面時為板面 y 偏移）。

- [ ] **Step 1: 安裝 zod 並寫失敗測試 `src/parts/schema.test.ts`**

Run: `npm install zod`

```ts
import { describe, expect, it } from 'vitest';
import { partDefinitionSchema } from './schema';

const validPart = {
  id: 'test-part',
  name: 'Test Part',
  nameZh: '測試零件',
  category: 'board',
  body: { size: [20, 10, 1.6] },
  clearanceHeight: 5,
};

describe('partDefinitionSchema', () => {
  it('合法定義通過並套用預設值', () => {
    const parsed = partDefinitionSchema.parse(validPart);
    expect(parsed.body.blocks).toEqual([]);
    expect(parsed.mountingHoles).toEqual([]);
    expect(parsed.ports).toEqual([]);
  });

  it('拒絕大寫或含空白的 id', () => {
    expect(partDefinitionSchema.safeParse({ ...validPart, id: 'Bad ID' }).success).toBe(false);
  });

  it('拒絕未知分類', () => {
    expect(partDefinitionSchema.safeParse({ ...validPart, category: 'misc' }).success).toBe(false);
  });

  it('拒絕非正的孔徑與淨空高度', () => {
    expect(
      partDefinitionSchema.safeParse({
        ...validPart,
        mountingHoles: [{ x: 0, y: 0, diameter: 0 }],
      }).success,
    ).toBe(false);
    expect(partDefinitionSchema.safeParse({ ...validPart, clearanceHeight: -1 }).success).toBe(false);
  });

  it('接受完整的 blocks/holes/ports', () => {
    const parsed = partDefinitionSchema.parse({
      ...validPart,
      body: {
        size: [20, 10, 1.6],
        blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [5, 5, 8], label: '燈體' }],
      },
      mountingHoles: [{ x: 5, y: 3, diameter: 3.2 }, { x: -5, y: -3, diameter: 3.2, z: 10 }],
      ports: [{ face: 'west', shape: 'rect', x: 0, z: 0, w: 12, h: 11, label: 'USB' }],
    });
    expect(parsed.mountingHoles).toHaveLength(2);
    expect(parsed.ports[0].face).toBe('west');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/parts/schema.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/parts/schema.ts`**

```ts
import { z } from 'zod';

export const partCategorySchema = z.enum(['board', 'sensor', 'power', 'component']);
export type PartCategory = z.infer<typeof partCategorySchema>;

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

export const partBlockSchema = z.object({
  shape: z.enum(['box', 'cylinder']),
  /** box: 中心 xy + 底面 z；cylinder: 底面中心。z 自主體頂面起算（可為負） */
  position: vec3Schema,
  /** box: [寬x, 深y, 高z]；cylinder: [直徑, 直徑, 高] */
  size: vec3Schema,
  label: z.string().optional(),
});
export type PartBlock = z.infer<typeof partBlockSchema>;

export const mountingHoleSchema = z.object({
  x: z.number(),
  y: z.number(),
  diameter: z.number().positive(),
  /** 孔平面絕對高度；預設 0 = 主體底面 */
  z: z.number().optional(),
});
export type MountingHole = z.infer<typeof mountingHoleSchema>;

export const partPortSchema = z.object({
  face: z.enum(['north', 'south', 'east', 'west', 'top']),
  shape: z.enum(['rect', 'circle']),
  /** 沿該面的水平偏移（top 面時為板面 x 偏移） */
  x: z.number(),
  /** 自主體頂面起算的垂直偏移（top 面時為板面 y 偏移） */
  z: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  label: z.string().optional(),
});
export type PartPort = z.infer<typeof partPortSchema>;

export const partDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  nameZh: z.string().min(1),
  category: partCategorySchema,
  body: z.object({
    /** 主體尺寸 [長x, 寬y, 厚z]，原點在底面中心 */
    size: vec3Schema,
    blocks: z.array(partBlockSchema).default([]),
  }),
  mountingHoles: z.array(mountingHoleSchema).default([]),
  ports: z.array(partPortSchema).default([]),
  /** 最高點（含元件），供外殼淨空與支柱計算（規格 §7） */
  clearanceHeight: z.number().positive(),
});
export type PartDefinition = z.infer<typeof partDefinitionSchema>;
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/parts/schema.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/parts
git commit -m "feat: add zod schema for part definitions"
```

---

### Task 4: 零件庫資料（23 項）

**Files:**
- Create: `src/parts/library.ts`
- Test: `src/parts/library.test.ts`

**Interfaces:**
- Consumes: `partDefinitionSchema`、`PartDefinition`（Task 3）
- Produces: `PART_LIBRARY: PartDefinition[]`（23 項）、`getPartDefinition(id: string): PartDefinition | undefined`、`PART_CATEGORIES: PartCategory[]`（固定順序 board→sensor→power→component）

- [ ] **Step 1: 寫失敗測試 `src/parts/library.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { partDefinitionSchema } from './schema';
import { PART_LIBRARY, getPartDefinition } from './library';

describe('PART_LIBRARY', () => {
  it('共 23 個零件', () => {
    expect(PART_LIBRARY).toHaveLength(23);
  });

  it('每個定義都通過 schema 驗證', () => {
    for (const part of PART_LIBRARY) {
      const result = partDefinitionSchema.safeParse(part);
      expect(result.success, `零件 ${part.id} 未通過驗證`).toBe(true);
    }
  });

  it('id 不重複', () => {
    const ids = new Set(PART_LIBRARY.map((p) => p.id));
    expect(ids.size).toBe(23);
  });

  it('分類數量符合規格 §7', () => {
    const count = (c: string) => PART_LIBRARY.filter((p) => p.category === c).length;
    expect(count('board')).toBe(6);
    expect(count('sensor')).toBe(5);
    expect(count('power')).toBe(6);
    expect(count('component')).toBe(6);
  });

  it('getPartDefinition 依 id 查詢', () => {
    expect(getPartDefinition('arduino-uno')?.nameZh).toBe('Arduino Uno R3');
    expect(getPartDefinition('nope')).toBeUndefined();
  });

  it('安裝孔都落在主體範圍內（z=0 的孔）', () => {
    for (const part of PART_LIBRARY) {
      const [l, w] = part.body.size;
      for (const hole of part.mountingHoles.filter((h) => (h.z ?? 0) === 0)) {
        expect(Math.abs(hole.x), `${part.id} 孔 x 超界`).toBeLessThanOrEqual(l / 2);
        expect(Math.abs(hole.y), `${part.id} 孔 y 超界`).toBeLessThanOrEqual(w / 2);
      }
    }
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/parts/library.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/parts/library.ts`**

完整內容如下（**尺寸為 v1 近似值**，依常見公開規格整理；修正屬純資料變更，不影響程式）：

```ts
import type { PartCategory, PartDefinition } from './schema';

export const PART_CATEGORIES: PartCategory[] = ['board', 'sensor', 'power', 'component'];

/**
 * 零件庫 v1。尺寸為近似值（常見公開規格），日後對照原廠 datasheet 修正。
 * 座標慣例見 schema.ts。零件英文名不翻譯（規格 §2）。
 */
export const PART_LIBRARY: PartDefinition[] = [
  // ── 開發板 board ──────────────────────────────────────────────
  {
    id: 'arduino-uno',
    name: 'Arduino Uno R3',
    nameZh: 'Arduino Uno R3',
    category: 'board',
    body: {
      size: [68.6, 53.4, 1.6],
      blocks: [
        { shape: 'box', position: [-27, 15.5, 0], size: [16, 12, 11], label: 'USB-B' },
        { shape: 'box', position: [-27, -19, 0], size: [14, 9, 11], label: 'DC 電源' },
        { shape: 'box', position: [5, 24.5, 0], size: [50, 2.5, 8.5], label: '排針' },
        { shape: 'box', position: [2, -24.5, 0], size: [55, 2.5, 8.5], label: '排針' },
      ],
    },
    mountingHoles: [
      { x: -20.3, y: -24.2, diameter: 3.2 },
      { x: -19, y: 24, diameter: 3.2 },
      { x: 31.8, y: 8.8, diameter: 3.2 },
      { x: 31.8, y: -19.1, diameter: 3.2 },
    ],
    ports: [
      { face: 'west', shape: 'rect', x: 15.5, z: 0, w: 13, h: 12, label: 'USB' },
      { face: 'west', shape: 'rect', x: -19, z: 0, w: 10, h: 12, label: 'DC' },
    ],
    clearanceHeight: 15,
  },
  {
    id: 'arduino-nano',
    name: 'Arduino Nano',
    nameZh: 'Arduino Nano',
    category: 'board',
    body: {
      size: [43.2, 18, 1.6],
      blocks: [
        { shape: 'box', position: [-17.6, 0, 0], size: [8, 8, 4], label: 'Mini-USB' },
        { shape: 'box', position: [0, 7.6, 0], size: [38, 2.5, 8.5], label: '排針' },
        { shape: 'box', position: [0, -7.6, 0], size: [38, 2.5, 8.5], label: '排針' },
      ],
    },
    mountingHoles: [
      { x: -20.3, y: -7.6, diameter: 1.8 },
      { x: -20.3, y: 7.6, diameter: 1.8 },
      { x: 20.3, y: -7.6, diameter: 1.8 },
      { x: 20.3, y: 7.6, diameter: 1.8 },
    ],
    ports: [{ face: 'west', shape: 'rect', x: 0, z: 0, w: 9, h: 5, label: 'USB' }],
    clearanceHeight: 10.1,
  },
  {
    id: 'esp32-devkit',
    name: 'ESP32 DevKit V1',
    nameZh: 'ESP32 DevKit V1',
    category: 'board',
    body: {
      size: [51.5, 25.4, 1.6],
      blocks: [
        { shape: 'box', position: [7, 0, 0], size: [25.5, 18, 3.1], label: 'WiFi 模組' },
        { shape: 'box', position: [-23, 0, 0], size: [6, 8, 4], label: 'Micro-USB' },
        { shape: 'box', position: [0, 11.4, 0], size: [46, 2.5, 8.5], label: '排針' },
        { shape: 'box', position: [0, -11.4, 0], size: [46, 2.5, 8.5], label: '排針' },
      ],
    },
    mountingHoles: [
      { x: -23.5, y: -10.5, diameter: 3 },
      { x: -23.5, y: 10.5, diameter: 3 },
      { x: 23.5, y: -10.5, diameter: 3 },
      { x: 23.5, y: 10.5, diameter: 3 },
    ],
    ports: [{ face: 'west', shape: 'rect', x: 0, z: 0, w: 9, h: 5, label: 'USB' }],
    clearanceHeight: 10.1,
  },
  {
    id: 'raspberry-pi-4',
    name: 'Raspberry Pi 4B',
    nameZh: 'Raspberry Pi 4B',
    category: 'board',
    body: {
      size: [85, 56, 1.4],
      blocks: [
        { shape: 'box', position: [38, 18, 0], size: [21, 16, 13.5], label: '乙太網路' },
        { shape: 'box', position: [38, -2, 0], size: [17, 15, 16], label: 'USB' },
        { shape: 'box', position: [38, -20, 0], size: [17, 15, 16], label: 'USB' },
        { shape: 'box', position: [3.5, 23.5, 0], size: [51, 5, 8.5], label: 'GPIO' },
      ],
    },
    mountingHoles: [
      { x: -29, y: -24.5, diameter: 2.7 },
      { x: -29, y: 24.5, diameter: 2.7 },
      { x: 29, y: -24.5, diameter: 2.7 },
      { x: 29, y: 24.5, diameter: 2.7 },
    ],
    ports: [
      { face: 'south', shape: 'rect', x: -32, z: 0, w: 10, h: 4, label: 'USB-C' },
      { face: 'south', shape: 'rect', x: -18, z: 0, w: 8, h: 4, label: 'micro-HDMI' },
      { face: 'south', shape: 'rect', x: -4.5, z: 0, w: 8, h: 4, label: 'micro-HDMI' },
      { face: 'east', shape: 'rect', x: 18, z: 0, w: 17, h: 14, label: '乙太網路' },
      { face: 'east', shape: 'rect', x: -2, z: 0, w: 16, h: 17, label: 'USB' },
      { face: 'east', shape: 'rect', x: -20, z: 0, w: 16, h: 17, label: 'USB' },
    ],
    clearanceHeight: 20,
  },
  {
    id: 'raspberry-pi-zero-2',
    name: 'Raspberry Pi Zero 2 W',
    nameZh: 'Raspberry Pi Zero 2 W',
    category: 'board',
    body: {
      size: [65, 30, 1.4],
      blocks: [{ shape: 'box', position: [0, 11.5, 0], size: [51, 5, 3], label: 'GPIO' }],
    },
    mountingHoles: [
      { x: -29, y: -11.5, diameter: 2.75 },
      { x: -29, y: 11.5, diameter: 2.75 },
      { x: 29, y: -11.5, diameter: 2.75 },
      { x: 29, y: 11.5, diameter: 2.75 },
    ],
    ports: [
      { face: 'south', shape: 'rect', x: -20, z: 0, w: 12, h: 4, label: 'mini-HDMI' },
      { face: 'south', shape: 'rect', x: 4, z: 0, w: 8, h: 3, label: 'USB' },
      { face: 'south', shape: 'rect', x: 16, z: 0, w: 8, h: 3, label: 'USB' },
    ],
    clearanceHeight: 6,
  },
  {
    id: 'microbit-v2',
    name: 'micro:bit V2',
    nameZh: 'micro:bit V2',
    category: 'board',
    body: {
      size: [52, 42, 1.2],
      blocks: [
        { shape: 'box', position: [-18, 0, 0], size: [6, 6, 4], label: '按鈕 A' },
        { shape: 'box', position: [18, 0, 0], size: [6, 6, 4], label: '按鈕 B' },
      ],
    },
    mountingHoles: [
      { x: -21.6, y: -16.5, diameter: 4 },
      { x: 0, y: -16.5, diameter: 4 },
      { x: 21.6, y: -16.5, diameter: 4 },
    ],
    ports: [{ face: 'north', shape: 'rect', x: 0, z: 0, w: 9, h: 4, label: 'USB' }],
    clearanceHeight: 12,
  },
  // ── 感測器與顯示 sensor ────────────────────────────────────────
  {
    id: 'hc-sr04',
    name: 'HC-SR04',
    nameZh: 'HC-SR04 超音波感測器',
    category: 'sensor',
    body: {
      size: [45, 20, 1.2],
      blocks: [
        { shape: 'cylinder', position: [-13, 0, 0], size: [16, 16, 12], label: '發射' },
        { shape: 'cylinder', position: [13, 0, 0], size: [16, 16, 12], label: '接收' },
      ],
    },
    mountingHoles: [
      { x: -20.5, y: -7.5, diameter: 1.8 },
      { x: -20.5, y: 7.5, diameter: 1.8 },
      { x: 20.5, y: -7.5, diameter: 1.8 },
      { x: 20.5, y: 7.5, diameter: 1.8 },
    ],
    ports: [
      { face: 'top', shape: 'circle', x: -13, z: 0, w: 16.5, h: 16.5, label: '發射開孔' },
      { face: 'top', shape: 'circle', x: 13, z: 0, w: 16.5, h: 16.5, label: '接收開孔' },
    ],
    clearanceHeight: 13.2,
  },
  {
    id: 'oled-096',
    name: 'OLED 0.96" (SSD1306)',
    nameZh: 'OLED 0.96 吋顯示器',
    category: 'sensor',
    body: {
      size: [27, 27.5, 1.2],
      blocks: [
        { shape: 'box', position: [0, -1.5, 0], size: [26, 15, 1.6], label: '螢幕' },
        { shape: 'box', position: [0, 12, 0], size: [10, 2.5, 3], label: '排針' },
      ],
    },
    mountingHoles: [
      { x: -11.5, y: -11.75, diameter: 2 },
      { x: -11.5, y: 11.75, diameter: 2 },
      { x: 11.5, y: -11.75, diameter: 2 },
      { x: 11.5, y: 11.75, diameter: 2 },
    ],
    ports: [{ face: 'top', shape: 'rect', x: 0, z: -1.5, w: 26, h: 15, label: '螢幕視窗' }],
    clearanceHeight: 4.2,
  },
  {
    id: 'lcd1602',
    name: 'LCD1602 (I2C)',
    nameZh: 'LCD1602 液晶顯示器',
    category: 'sensor',
    body: {
      size: [80, 36, 1.6],
      blocks: [{ shape: 'box', position: [0, 0, 0], size: [71.5, 25.5, 7], label: '螢幕' }],
    },
    mountingHoles: [
      { x: -37.5, y: -15.5, diameter: 2.9 },
      { x: -37.5, y: 15.5, diameter: 2.9 },
      { x: 37.5, y: -15.5, diameter: 2.9 },
      { x: 37.5, y: 15.5, diameter: 2.9 },
    ],
    ports: [{ face: 'top', shape: 'rect', x: 0, z: 0, w: 72, h: 26, label: '螢幕視窗' }],
    clearanceHeight: 8.6,
  },
  {
    id: 'pir-hc-sr501',
    name: 'PIR HC-SR501',
    nameZh: 'PIR 人體感測器',
    category: 'sensor',
    body: {
      size: [32.5, 24, 1.6],
      blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [23, 23, 11.5], label: '感測罩' }],
    },
    mountingHoles: [
      { x: -14.25, y: 0, diameter: 2 },
      { x: 14.25, y: 0, diameter: 2 },
    ],
    ports: [{ face: 'top', shape: 'circle', x: 0, z: 0, w: 23.5, h: 23.5, label: '感測罩開孔' }],
    clearanceHeight: 13.1,
  },
  {
    id: 'dht22',
    name: 'DHT22',
    nameZh: 'DHT22 溫濕度感測器',
    category: 'sensor',
    body: { size: [15.1, 25.1, 7.7] },
    mountingHoles: [{ x: 0, y: 9.5, diameter: 3 }],
    ports: [{ face: 'top', shape: 'rect', x: 0, z: -2, w: 13, h: 18, label: '通風開孔' }],
    clearanceHeight: 7.7,
  },
  // ── 動力與電源 power ──────────────────────────────────────────
  {
    id: 'sg90',
    name: 'SG90',
    nameZh: 'SG90 伺服馬達',
    category: 'power',
    body: {
      size: [22.5, 11.8, 22.7],
      blocks: [
        { shape: 'box', position: [0, 0, -6.8], size: [32.2, 11.8, 2.5], label: '固定翼' },
        { shape: 'cylinder', position: [5.5, 0, 0], size: [4.6, 4.6, 3.2], label: '轉軸' },
      ],
    },
    mountingHoles: [
      { x: -13.85, y: 0, diameter: 2, z: 15.9 },
      { x: 13.85, y: 0, diameter: 2, z: 15.9 },
    ],
    ports: [{ face: 'top', shape: 'circle', x: 5.5, z: 0, w: 6, h: 6, label: '轉軸開孔' }],
    clearanceHeight: 26,
  },
  {
    id: 'mg996r',
    name: 'MG996R',
    nameZh: 'MG996R 伺服馬達',
    category: 'power',
    body: {
      size: [40.7, 19.7, 42.9],
      blocks: [
        { shape: 'box', position: [0, 0, -6.3], size: [54.5, 19.7, 2.5], label: '固定翼' },
        { shape: 'cylinder', position: [10.3, 0, 0], size: [6, 6, 4], label: '轉軸' },
      ],
    },
    mountingHoles: [
      { x: -24.5, y: -5, diameter: 4.5, z: 36.6 },
      { x: -24.5, y: 5, diameter: 4.5, z: 36.6 },
      { x: 24.5, y: -5, diameter: 4.5, z: 36.6 },
      { x: 24.5, y: 5, diameter: 4.5, z: 36.6 },
    ],
    ports: [{ face: 'top', shape: 'circle', x: 10.3, z: 0, w: 8, h: 8, label: '轉軸開孔' }],
    clearanceHeight: 46.9,
  },
  {
    id: 'tt-motor',
    name: 'TT Motor',
    nameZh: 'TT 減速馬達',
    category: 'power',
    // TT 馬達為側向安裝（水平軸），v1 不支援自動支柱；先提供外形供排位
    body: { size: [65, 22.5, 18.5] },
    clearanceHeight: 18.5,
  },
  {
    id: 'l298n',
    name: 'L298N',
    nameZh: 'L298N 馬達驅動板',
    category: 'power',
    body: {
      size: [43.5, 43.2, 1.6],
      blocks: [
        { shape: 'box', position: [10, 0, 0], size: [16, 23, 24], label: '散熱片' },
        { shape: 'box', position: [-18, 10, 0], size: [8, 20, 10], label: '端子' },
      ],
    },
    mountingHoles: [
      { x: -18.5, y: -18.4, diameter: 3.2 },
      { x: -18.5, y: 18.4, diameter: 3.2 },
      { x: 18.5, y: -18.4, diameter: 3.2 },
      { x: 18.5, y: 18.4, diameter: 3.2 },
    ],
    clearanceHeight: 25.6,
  },
  {
    id: 'battery-18650x2',
    name: '18650×2 Holder',
    nameZh: '18650 雙節電池盒',
    category: 'power',
    body: { size: [77.7, 40.2, 21.5] },
    mountingHoles: [
      { x: -29, y: 0, diameter: 3 },
      { x: 29, y: 0, diameter: 3 },
    ],
    clearanceHeight: 21.5,
  },
  {
    id: 'battery-9v',
    name: '9V Battery',
    nameZh: '9V 電池',
    category: 'power',
    body: { size: [48.5, 26.5, 17.5] },
    clearanceHeight: 17.5,
  },
  // ── 小型元件 component ────────────────────────────────────────
  {
    id: 'led-5mm',
    name: 'LED 5mm',
    nameZh: '5mm LED',
    category: 'component',
    body: {
      size: [5.8, 5.8, 1],
      blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [5, 5, 7.6], label: '燈體' }],
    },
    ports: [{ face: 'top', shape: 'circle', x: 0, z: 0, w: 5.2, h: 5.2, label: '燈孔' }],
    clearanceHeight: 8.6,
  },
  {
    id: 'push-button-12mm',
    name: 'Push Button 12mm',
    nameZh: '12mm 按鈕',
    category: 'component',
    body: {
      size: [12, 12, 6.5],
      blocks: [{ shape: 'cylinder', position: [0, 0, 0], size: [7, 7, 1], label: '按鈕' }],
    },
    ports: [{ face: 'top', shape: 'circle', x: 0, z: 0, w: 13, h: 13, label: '按鈕開孔' }],
    clearanceHeight: 7.5,
  },
  {
    id: 'buzzer-module',
    name: 'Buzzer Module',
    nameZh: '蜂鳴器模組',
    category: 'component',
    body: {
      size: [22, 12, 1.6],
      blocks: [{ shape: 'cylinder', position: [3.5, 0, 0], size: [12, 12, 9.7], label: '蜂鳴器' }],
    },
    mountingHoles: [{ x: -8.5, y: 0, diameter: 2 }],
    ports: [{ face: 'top', shape: 'circle', x: 3.5, z: 0, w: 3, h: 3, label: '發聲孔' }],
    clearanceHeight: 11.3,
  },
  {
    id: 'relay-1ch',
    name: 'Relay 1CH',
    nameZh: '1 路繼電器模組',
    category: 'component',
    body: {
      size: [50, 26, 1.6],
      blocks: [
        { shape: 'box', position: [5, 0, 0], size: [19, 15.5, 15.5], label: '繼電器' },
        { shape: 'box', position: [-19, 0, 0], size: [8, 20, 10], label: '端子' },
      ],
    },
    mountingHoles: [
      { x: -22.6, y: -9.5, diameter: 2.9 },
      { x: -22.6, y: 9.5, diameter: 2.9 },
      { x: 22.6, y: -9.5, diameter: 2.9 },
      { x: 22.6, y: 9.5, diameter: 2.9 },
    ],
    clearanceHeight: 17.1,
  },
  {
    id: 'breadboard-half',
    name: 'Breadboard 400',
    nameZh: '半尺寸麵包板（400 孔）',
    category: 'component',
    body: { size: [82.5, 54.5, 8.5] },
    clearanceHeight: 8.5,
  },
  {
    id: 'breadboard-full',
    name: 'Breadboard 830',
    nameZh: '全尺寸麵包板（830 孔）',
    category: 'component',
    body: { size: [165, 54.5, 8.5] },
    clearanceHeight: 8.5,
  },
];

const registry = new Map(PART_LIBRARY.map((p) => [p.id, p]));

export function getPartDefinition(id: string): PartDefinition | undefined {
  return registry.get(id);
}
```

**必須採用 parse-at-load 形式**：`body.blocks`、`mountingHoles`、`ports` 是 zod `.default([])` 欄位，在輸出型別（`z.infer`）中為必填，而上面的資料刻意省略了空欄位。因此原始資料要宣告為 `z.input` 型別、載入時 parse（同時完成執行期驗證）：

```ts
import { z } from 'zod';
import { partDefinitionSchema } from './schema';
import type { PartCategory, PartDefinition } from './schema';

const RAW_LIBRARY: z.input<typeof partDefinitionSchema>[] = [
  /* 上面的 23 項資料放這裡 */
];

export const PART_LIBRARY: PartDefinition[] = RAW_LIBRARY.map((p) =>
  partDefinitionSchema.parse(p),
);
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/parts/library.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: Commit**

```bash
git add src/parts
git commit -m "feat: add 23-part electronics library with validated definitions"
```

---

### Task 5: 零件幾何生成

**Files:**
- Create: `src/parts/partGeometry.ts`
- Test: `src/parts/partGeometry.test.ts`

**Interfaces:**
- Consumes: `PartDefinition`（Task 3）、`GeometryKernel`/`Solid`（Plan 1）
- Produces: `buildPartSolid(def: PartDefinition, kernel: GeometryKernel): Solid` — 純函數，不快取把手

- [ ] **Step 1: 寫失敗測試 `src/parts/partGeometry.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { getPartDefinition } from './library';
import { buildPartSolid } from './partGeometry';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('buildPartSolid', () => {
  it('麵包板（純主體）體積 ≈ 長×寬×厚', () => {
    const def = getPartDefinition('breadboard-half')!;
    const v = kernel.volume(buildPartSolid(def, kernel));
    expect(v).toBeCloseTo(82.5 * 54.5 * 8.5, 1);
  });

  it('Arduino Uno 含元件方塊且鑽了安裝孔', () => {
    const def = getPartDefinition('arduino-uno')!;
    const v = kernel.volume(buildPartSolid(def, kernel));
    const boardOnly = 68.6 * 53.4 * 1.6;
    // 元件方塊使體積大於裸板
    expect(v).toBeGreaterThan(boardOnly);
    // 對照：無孔版本應更大（孔確實被鑽掉）
    const noHoles = { ...def, mountingHoles: [] };
    const vNoHoles = kernel.volume(buildPartSolid(noHoles, kernel));
    expect(vNoHoles - v).toBeGreaterThan(4 * Math.PI * 1.6 * 1.6 * 1.6 * 0.9);
  });

  it('cylinder block 正常生成（LED）', () => {
    const def = getPartDefinition('led-5mm')!;
    const v = kernel.volume(buildPartSolid(def, kernel));
    const flange = 5.8 * 5.8 * 1;
    const dome = Math.PI * 2.5 * 2.5 * 7.6;
    expect(v).toBeGreaterThan(flange);
    expect(v).toBeLessThan(flange + dome);
  });

  it('非零 z 的安裝孔鑽在固定翼上（SG90）', () => {
    const def = getPartDefinition('sg90')!;
    const v = kernel.volume(buildPartSolid(def, kernel));
    const noHoles = { ...def, mountingHoles: [] };
    const vNoHoles = kernel.volume(buildPartSolid(noHoles, kernel));
    expect(vNoHoles).toBeGreaterThan(v);
  });

  it('mesh 可輸出且非空', () => {
    const def = getPartDefinition('raspberry-pi-4')!;
    const mesh = kernel.toMesh(buildPartSolid(def, kernel));
    expect(mesh.indices.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/parts/partGeometry.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/parts/partGeometry.ts`**

```ts
import type { GeometryKernel, Solid } from '../geometry/kernel';
import type { PartDefinition } from './schema';

const noTransform = { rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };

/**
 * 由零件定義生成 Solid：主體 + 元件方塊 union，再鑽安裝孔。
 * 原點 = 主體底面中心（與 primitive 慣例一致）。純函數，把手由呼叫端 releaseAll 管理。
 */
export function buildPartSolid(def: PartDefinition, kernel: GeometryKernel): Solid {
  const [bodyL, bodyW, bodyT] = def.body.size;
  let solid = kernel.box(bodyL, bodyW, bodyT);

  for (const block of def.body.blocks) {
    const [a, b, h] = block.size;
    const base = block.shape === 'cylinder' ? kernel.cylinder(a / 2, h) : kernel.box(a, b, h);
    const [x, y, z] = block.position;
    // blocks 的 z 從主體頂面起算
    solid = kernel.union(
      solid,
      kernel.transform(base, { position: [x, y, bodyT + z], ...noTransform }),
    );
  }

  for (const hole of def.mountingHoles) {
    const planeZ = hole.z ?? 0;
    // 鑽孔高度 = 主體厚 + 2mm 餘量，自孔平面下方 1mm 起，確保穿透
    const drill = kernel.transform(kernel.cylinder(hole.diameter / 2, bodyT + 2), {
      position: [hole.x, hole.y, planeZ - 1],
      ...noTransform,
    });
    solid = kernel.difference(solid, drill);
  }

  return solid;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/parts/partGeometry.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
git add src/parts
git commit -m "feat: generate part solids from definitions"
```

---

### Task 6: PartNode 整合（文件模型 + 求值 + 渲染配色）

**Files:**
- Modify: `src/types/document.ts`（PartNode、createPartNode）
- Modify: `src/geometry/evaluate.ts`（buildSolid 支援 part）
- Modify: `src/components/Viewport.tsx`（零件 PCB 綠配色）
- Test: `src/types/document.test.ts`（追加）、`src/geometry/evaluate.test.ts`（追加）

**Interfaces:**
- Produces: `PartNode { type:'part'; partId: string } & NodeCommon`；`SceneNode = PrimitiveNode | GroupNode | PartNode`；`createPartNode(partId: string, name: string, overrides?): PartNode`
- Consumes: `getPartDefinition`（Task 4）、`buildPartSolid`（Task 5）

- [ ] **Step 1: 追加失敗測試**

`src/types/document.test.ts` 追加（import `createPartNode`）：

```ts
  it('createPartNode 建立零件節點', () => {
    const node = createPartNode('arduino-uno', 'Arduino Uno R3');
    expect(node.type).toBe('part');
    expect(node.partId).toBe('arduino-uno');
    expect(node.role).toBe('solid');
    expect(node.transform).toEqual(identityTransform());
  });
```

`src/geometry/evaluate.test.ts` 追加（import `createPartNode`）：

```ts
  it('part 節點可求值（體積 > 0）', () => {
    const node = createPartNode('breadboard-half', 'bb');
    const solid = evaluateForExport([node], kernel);
    expect(solid).not.toBeNull();
    expect(kernel.volume(solid!)).toBeGreaterThan(30000);
  });

  it('未知 partId 的節點被略過而非拋錯', () => {
    const ghost = createPartNode('does-not-exist', 'ghost');
    expect(evaluateForExport([ghost], kernel)).toBeNull();
    const withPlate = evaluateForExport([plate(), ghost], kernel);
    expect(kernel.volume(withPlate!)).toBeCloseTo(800, 3);
  });
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/types/document.test.ts src/geometry/evaluate.test.ts`
Expected: FAIL — `createPartNode` 不存在

- [ ] **Step 3: 實作**

`src/types/document.ts` 追加（`NodeCommon` 之後、`SceneNode` 定義處修改）：

```ts
export interface PartNode extends NodeCommon {
  type: 'part';
  partId: string;
}

export type SceneNode = PrimitiveNode | GroupNode | PartNode;

export function createPartNode(
  partId: string,
  name: string,
  overrides: Partial<Omit<PartNode, 'type' | 'partId'>> = {},
): PartNode {
  return {
    type: 'part',
    id: newId(),
    name,
    role: 'solid',
    transform: identityTransform(),
    visible: true,
    locked: false,
    partId,
    ...overrides,
  };
}
```

`src/geometry/evaluate.ts` 的 `buildSolid` 改為：

```ts
import { getPartDefinition } from '../parts/library';
import { buildPartSolid } from '../parts/partGeometry';

function buildSolid(node: SceneNode, kernel: GeometryKernel): Solid | null {
  let base: Solid | null;
  if (node.type === 'primitive') {
    const p = node.params;
    switch (node.kind) {
      case 'box':
        base = kernel.box(p.width, p.depth, p.height);
        break;
      case 'cylinder':
        base = kernel.cylinder(p.radius, p.height);
        break;
      case 'sphere':
        base = kernel.sphere(p.radius);
        break;
      case 'cone':
        base = kernel.cone(p.radiusBottom, p.radiusTop, p.height);
        break;
    }
  } else if (node.type === 'part') {
    const def = getPartDefinition(node.partId);
    base = def ? buildPartSolid(def, kernel) : null;
  } else {
    base = combineScope(node.children, kernel);
  }
  return base ? kernel.transform(base, node.transform) : null;
}
```

`src/components/Viewport.tsx`：讓零件顯示 PCB 綠。`Viewport` 內計算 part id 集合並傳給 `SceneMesh`：

```tsx
import { findNode } from '../store/documentStore';
```

在 `Viewport` 的 meshes map 中：

```tsx
        {meshes.map((m) => (
          <SceneMesh
            key={m.nodeId}
            payload={m}
            selected={selection.includes(m.nodeId)}
            isPart={findNode(doc.nodes, m.nodeId)?.type === 'part'}
            onSelect={() => setSelection([m.nodeId])}
          />
        ))}
```

`SceneMesh` 增加 `isPart: boolean` prop，材質色改為：

```tsx
      <meshStandardMaterial
        color={isHole ? '#ef4444' : selected ? '#3b82f6' : isPart ? '#2e7d5b' : '#9db4d0'}
        transparent={isHole}
        opacity={isHole ? 0.45 : 1}
        roughness={0.6}
        metalness={0.05}
      />
```

- [ ] **Step 4: 驗證**

Run: `npx vitest run && npm run build`
Expected: 全綠；建置無錯誤

- [ ] **Step 5: Commit**

```bash
git add src/types src/geometry src/components/Viewport.tsx
git commit -m "feat: add part nodes with library-driven geometry and PCB coloring"
```

---

### Task 7: i18n 中英雙語

**Files:**
- Modify: `package.json`（`npm install i18next react-i18next`）
- Create: `src/i18n/index.ts`、`src/i18n/zh.json`、`src/i18n/en.json`、`src/components/LanguageToggle.tsx`
- Modify: `src/main.tsx`（import './i18n'）、`src/components/Toolbar.tsx`、`src/components/PropertyCard.tsx`、`src/components/Viewport.tsx`、`src/App.tsx`、`src/geometry/worker.ts`、`src/geometry/workerClient.test.ts`
- Test: `src/i18n/resources.test.ts`

**Interfaces:**
- Produces: `useTranslation()` 可用；資源 key 見下。錯誤碼慣例：worker 拋 `'EXPORT_EMPTY'`，UI 層對應 `t('errors.exportEmpty')`。後續 task 的 UI 一律用 `t()`。

- [ ] **Step 1: 安裝與失敗測試**

Run: `npm install i18next react-i18next`

`src/i18n/resources.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import zh from './zh.json';
import en from './en.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('i18n resources', () => {
  it('zh 與 en 的 key 集合完全一致', () => {
    expect(flattenKeys(zh).sort()).toEqual(flattenKeys(en).sort());
  });

  it('沒有空字串翻譯', () => {
    const check = (obj: Record<string, unknown>) => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) check(value as Record<string, unknown>);
        else expect(String(value).length).toBeGreaterThan(0);
      }
    };
    check(zh);
    check(en);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/i18n/resources.test.ts`
Expected: FAIL — 資源檔不存在

- [ ] **Step 3: 建立資源檔**

`src/i18n/zh.json`：

```json
{
  "toolbar": {
    "box": "方塊",
    "cylinder": "圓柱",
    "sphere": "球體",
    "cone": "圓錐",
    "undo": "復原",
    "redo": "重做",
    "delete": "刪除",
    "export": "匯出 STL"
  },
  "property": {
    "name": "名稱",
    "solid": "實體",
    "hole": "孔",
    "size": "尺寸 (mm)",
    "position": "位置 (mm)",
    "width": "寬",
    "depth": "深",
    "height": "高",
    "radius": "半徑",
    "radiusBottom": "底半徑",
    "radiusTop": "頂半徑"
  },
  "drawer": {
    "title": "零件庫",
    "search": "搜尋零件",
    "close": "收合",
    "board": "開發板",
    "sensor": "感測器與顯示",
    "power": "動力與電源",
    "component": "小型元件"
  },
  "projects": {
    "title": "專案",
    "open": "開啟",
    "delete": "刪除",
    "deleteConfirm": "確定刪除專案「{{name}}」？此動作無法復原。",
    "new": "新專案",
    "import": "匯入 .nexcad",
    "exportFile": "匯出 .nexcad",
    "importFailed": "匯入失敗：檔案格式不正確",
    "untitled": "未命名專案",
    "empty": "還沒有專案"
  },
  "export": {
    "title": "匯出 STL",
    "dimensions": "模型尺寸",
    "triangles": "三角形數",
    "warnings": "列印提醒",
    "thinFeature": "「{{name}}」有小於 1mm 的尺寸，可能過薄無法列印",
    "tooLarge": "模型超過 250mm，可能超出列印範圍",
    "cancel": "取消",
    "download": "下載 STL"
  },
  "errors": {
    "geometry": "幾何運算失敗，已保留上一個有效狀態",
    "exportEmpty": "沒有可匯出的實體",
    "exportFailed": "匯出失敗"
  }
}
```

`src/i18n/en.json`：

```json
{
  "toolbar": {
    "box": "Box",
    "cylinder": "Cylinder",
    "sphere": "Sphere",
    "cone": "Cone",
    "undo": "Undo",
    "redo": "Redo",
    "delete": "Delete",
    "export": "Export STL"
  },
  "property": {
    "name": "Name",
    "solid": "Solid",
    "hole": "Hole",
    "size": "Size (mm)",
    "position": "Position (mm)",
    "width": "Width",
    "depth": "Depth",
    "height": "Height",
    "radius": "Radius",
    "radiusBottom": "Bottom radius",
    "radiusTop": "Top radius"
  },
  "drawer": {
    "title": "Parts",
    "search": "Search parts",
    "close": "Close",
    "board": "Boards",
    "sensor": "Sensors & displays",
    "power": "Motion & power",
    "component": "Small parts"
  },
  "projects": {
    "title": "Projects",
    "open": "Open",
    "delete": "Delete",
    "deleteConfirm": "Delete project \"{{name}}\"? This can't be undone.",
    "new": "New project",
    "import": "Import .nexcad",
    "exportFile": "Export .nexcad",
    "importFailed": "Import failed: invalid file format",
    "untitled": "Untitled project",
    "empty": "No projects yet"
  },
  "export": {
    "title": "Export STL",
    "dimensions": "Model size",
    "triangles": "Triangles",
    "warnings": "Print warnings",
    "thinFeature": "\"{{name}}\" has a dimension under 1mm and may be too thin to print",
    "tooLarge": "Model exceeds 250mm and may not fit the print bed",
    "cancel": "Cancel",
    "download": "Download STL"
  },
  "errors": {
    "geometry": "Geometry operation failed; the last valid state was kept",
    "exportEmpty": "Nothing to export",
    "exportFailed": "Export failed"
  }
}
```

`src/i18n/index.ts`：

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import zh from './zh.json';

const STORAGE_KEY = 'nexcad-lang';

void i18n.use(initReactI18next).init({
  resources: { zh: { translation: zh }, en: { translation: en } },
  lng: localStorage.getItem(STORAGE_KEY) ?? 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => localStorage.setItem(STORAGE_KEY, lng));

export default i18n;
```

`src/main.tsx` 最上方 import 之後加入 `import './i18n';`（放在 `./index.css` 之前皆可）。注意 `localStorage` 只在瀏覽器存在 — 此檔僅由 main.tsx 載入，不會進入 vitest node 環境。

- [ ] **Step 4: 建立 `src/components/LanguageToggle.tsx`**

```tsx
import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'zh' ? 'en' : 'zh';
  return (
    <button
      onClick={() => void i18n.changeLanguage(next)}
      aria-label={next === 'en' ? 'Switch to English' : '切換為中文'}
      className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-600 shadow-lg backdrop-blur hover:bg-slate-100"
    >
      {i18n.language === 'zh' ? 'EN' : '中'}
    </button>
  );
}
```

- [ ] **Step 5: 改寫既有元件字串**

`src/components/Toolbar.tsx`：加 `import { useTranslation } from 'react-i18next';`。`PRIMITIVES` 的 `label` 改為 key（`'toolbar.box'` 等），元件內 `const { t } = useTranslation();`，`title={t(p.label)}`、復原/重做/刪除/匯出按鈕 `title={t('toolbar.undo')}` 等。錯誤處理改為：

```ts
    } catch (err) {
      const message = err instanceof Error && err.message === 'EXPORT_EMPTY'
        ? t('errors.exportEmpty')
        : t('errors.exportFailed');
      useToastStore.getState().show(message);
    } finally {
```

`src/components/PropertyCard.tsx`：`PARAM_LABELS` 值改為 key（`width: 'property.width'` 等），`RoleToggle` 顯示 `t('property.solid')`/`t('property.hole')`，區塊標題 `t('property.size')`、`t('property.position')`，名稱欄 `aria-label={t('property.name')}`。各元件內取 `const { t } = useTranslation();`（`ParamFields`、`RoleToggle` 也要）。

`src/components/Viewport.tsx`：onError toast 改為（i18n module 直接 import，非 hook — worker callback 不在 render 內）：

```ts
import i18n from '../i18n';
...
    client.onError = (message) => {
      console.warn('geometry error:', message);
      useToastStore.getState().show(`${i18n.t('errors.geometry')}（${message}）`);
    };
```

`src/geometry/worker.ts`：`throw new Error('沒有可匯出的實體')` 改為 `throw new Error('EXPORT_EMPTY')`。

`src/geometry/workerClient.test.ts`：兩處 `'沒有可匯出的實體'` 改為 `'EXPORT_EMPTY'`。

`src/App.tsx`：右上角掛 `<div className="absolute right-4 top-4"><LanguageToggle /></div>`（PropertyCard 改為 `top-20`，已是）。

- [ ] **Step 6: 驗證**

Run: `npx vitest run && npm run build`
Expected: 全綠；建置無錯誤。手動：`npm run dev` 點右上角 EN/中 切換，工具列與屬性卡文字即時切換，重新整理後語言保留。

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/i18n src/components src/main.tsx src/geometry/worker.ts src/geometry/workerClient.test.ts src/App.tsx
git commit -m "feat: add zh/en i18n with language toggle"
```

---

### Task 8: 零件抽屜 UI

**Files:**
- Create: `src/components/PartsDrawer.tsx`
- Modify: `src/App.tsx`（掛載）

**Interfaces:**
- Consumes: `PART_LIBRARY`、`PART_CATEGORIES`（Task 4）、`createPartNode`（Task 6）、`useDocumentStore.addNode`、i18n key `drawer.*`（Task 7）

- [ ] **Step 1: 建立 `src/components/PartsDrawer.tsx`**

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PART_CATEGORIES, PART_LIBRARY } from '../parts/library';
import type { PartCategory, PartDefinition } from '../parts/schema';
import { useDocumentStore } from '../store/documentStore';
import { createPartNode } from '../types/document';

export function PartsDrawer() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<PartCategory>('board');
  const [query, setQuery] = useState('');
  const addNode = useDocumentStore((s) => s.addNode);

  const q = query.trim().toLowerCase();
  const parts = PART_LIBRARY.filter((p) =>
    q ? `${p.name} ${p.nameZh}`.toLowerCase().includes(q) : p.category === category,
  );

  const addPart = (part: PartDefinition) => {
    addNode(createPartNode(part.id, i18n.language === 'zh' ? part.nameZh : part.name));
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 left-1/2 flex h-11 -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm font-medium text-slate-700 shadow-lg backdrop-blur hover:bg-slate-100"
      >
        <ChevronUp size={16} />
        {t('drawer.title')}
      </button>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3">
        {PART_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setQuery('');
            }}
            aria-pressed={category === c && q === ''}
            className={`h-11 shrink-0 rounded-lg px-3 text-sm ${
              category === c && q === ''
                ? 'bg-slate-800 font-medium text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t(`drawer.${c}`)}
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('drawer.search')}
              className="h-11 w-32 bg-transparent text-sm text-slate-700 outline-none"
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label={t('drawer.close')}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>
      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4">
        {parts.map((p) => (
          <button
            key={p.id}
            onClick={() => addPart(p)}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <p className="text-sm font-medium text-slate-800">
              {i18n.language === 'zh' ? p.nameZh : p.name}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {p.body.size[0]} × {p.body.size[1]} mm
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 掛載到 `src/App.tsx`**

import 並在 `<Toolbar />` 之後加 `<PartsDrawer />`。NexCAD 標誌（bottom-left）與抽屜收合鈕（bottom-center）不衝突；`ToastStack` 在 `bottom-20` 高於兩者。

- [ ] **Step 3: 驗證**

Run: `npx vitest run && npm run build` — Expected: 全綠。
手動（`npm run dev`）：底部「零件庫」展開 → 分類切換 → 點 Arduino Uno → 畫布出現綠色板（含 USB 塊與四個安裝孔）且被選取；搜尋「oled」跨分類找到 OLED；切 EN 後零件卡顯示英文名。

- [ ] **Step 4: Commit**

```bash
git add src/components/PartsDrawer.tsx src/App.tsx
git commit -m "feat: add bottom parts drawer with categories and search"
```

---

### Task 9: 孔位磁吸

**Files:**
- Create: `src/geometry/holeSnap.ts`
- Modify: `src/components/SelectionGizmo.tsx`
- Test: `src/geometry/holeSnap.test.ts`

**Interfaces:**
- Produces: `collectHoleWorldPositions(nodes: SceneNode[], excludeId?: string): Vec3[]`、`snapToHoles(position: Vec3, holes: Vec3[], threshold?: number): Vec3`
- Consumes: `getPartDefinition`（Task 4）

- [ ] **Step 1: 寫失敗測試 `src/geometry/holeSnap.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createPartNode } from '../types/document';
import { collectHoleWorldPositions, snapToHoles } from './holeSnap';

describe('collectHoleWorldPositions', () => {
  it('回傳零件安裝孔的世界座標（含節點位移）', () => {
    const uno = createPartNode('arduino-uno', 'uno');
    uno.transform.position = [100, 50, 0];
    const holes = collectHoleWorldPositions([uno]);
    expect(holes).toHaveLength(4);
    expect(holes).toContainEqual([100 - 20.3, 50 - 24.2, 0]);
  });

  it('Z 軸旋轉 90° 時孔位跟著旋轉', () => {
    const uno = createPartNode('arduino-uno', 'uno');
    uno.transform.rotation = [0, 0, 90];
    const holes = collectHoleWorldPositions([uno]);
    // (x, y) 旋轉 90° → (−y, x)
    const target = holes.find((h) => Math.abs(h[0] - 24.2) < 1e-6 && Math.abs(h[1] + 20.3) < 1e-6);
    expect(target).toBeDefined();
  });

  it('排除指定節點與隱藏節點', () => {
    const a = createPartNode('arduino-uno', 'a');
    const b = createPartNode('arduino-uno', 'b');
    b.visible = false;
    expect(collectHoleWorldPositions([a, b], a.id)).toHaveLength(0);
  });

  it('未知 partId 與非零件節點被略過', () => {
    const ghost = createPartNode('nope', 'ghost');
    expect(collectHoleWorldPositions([ghost])).toHaveLength(0);
  });
});

describe('snapToHoles', () => {
  it('XY 距離小於閾值時吸附到孔位（保留原 z）', () => {
    const snapped = snapToHoles([10.8, 20.5, 5], [[10, 20, 0]], 2);
    expect(snapped).toEqual([10, 20, 5]);
  });

  it('超出閾值不吸附', () => {
    expect(snapToHoles([15, 20, 0], [[10, 20, 0]], 2)).toEqual([15, 20, 0]);
  });

  it('多個孔位時吸附最近的', () => {
    const snapped = snapToHoles([10.9, 0, 0], [[10, 0, 0], [12, 0, 0]], 2);
    expect(snapped[0]).toBe(10);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/geometry/holeSnap.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/geometry/holeSnap.ts`**

```ts
import { getPartDefinition } from '../parts/library';
import type { SceneNode, Vec3 } from '../types/document';

const DEG = Math.PI / 180;

/**
 * 收集所有可見零件節點的安裝孔世界座標。
 * 只考慮 Z 軸旋轉（板件通常平放）；X/Y 旋轉的零件孔位不參與磁吸。
 */
export function collectHoleWorldPositions(nodes: SceneNode[], excludeId?: string): Vec3[] {
  const out: Vec3[] = [];
  for (const node of nodes) {
    if (node.id === excludeId || !node.visible || node.type !== 'part') continue;
    if (node.transform.rotation[0] !== 0 || node.transform.rotation[1] !== 0) continue;
    const def = getPartDefinition(node.partId);
    if (!def) continue;
    const angle = node.transform.rotation[2] * DEG;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const hole of def.mountingHoles) {
      out.push([
        node.transform.position[0] + hole.x * cos - hole.y * sin,
        node.transform.position[1] + hole.x * sin + hole.y * cos,
        node.transform.position[2],
      ]);
    }
  }
  return out;
}

/** 拖曳位置與某孔位的 XY 距離小於 threshold 時吸附（z 保留） */
export function snapToHoles(position: Vec3, holes: Vec3[], threshold = 2): Vec3 {
  let best: Vec3 | null = null;
  let bestDistance = threshold;
  for (const hole of holes) {
    const d = Math.hypot(position[0] - hole[0], position[1] - hole[1]);
    if (d < bestDistance) {
      bestDistance = d;
      best = hole;
    }
  }
  return best ? [best[0], best[1], position[2]] : position;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/geometry/holeSnap.test.ts`
Expected: PASS（7 tests）

- [ ] **Step 5: 整合到 `src/components/SelectionGizmo.tsx`**

拖曳開始時收集一次孔位（避免每個 move 事件重算），commit 時先格點吸附再孔位磁吸：

```tsx
import { useEffect, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { collectHoleWorldPositions, snapToHoles } from '../geometry/holeSnap';
import { findNode, useDocumentStore } from '../store/documentStore';
import type { Vec3 } from '../types/document';

const snap = (v: number) => Math.round(v);

export function SelectionGizmo() {
  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const beginDrag = useDocumentStore((s) => s.beginDrag);
  const updateTransient = useDocumentStore((s) => s.updateTransient);
  const proxyRef = useRef<THREE.Object3D>(null!);
  const holesRef = useRef<Vec3[]>([]);

  const selected = selection.length === 1 ? findNode(doc.nodes, selection[0]) : undefined;

  useEffect(() => {
    if (selected && proxyRef.current) {
      proxyRef.current.position.set(...selected.transform.position);
    }
  }, [selected]);

  if (!selected || selected.locked) return null;

  const commitPosition = () => {
    const p = proxyRef.current.position;
    const snapped = snapToHoles([snap(p.x), snap(p.y), snap(p.z)], holesRef.current);
    updateTransient(selected.id, (n) => {
      n.transform.position = snapped;
    });
  };

  return (
    <>
      <object3D ref={proxyRef} />
      <TransformControls
        object={proxyRef}
        mode="translate"
        translationSnap={1}
        size={0.8}
        onMouseDown={() => {
          holesRef.current = collectHoleWorldPositions(
            useDocumentStore.getState().doc.nodes,
            selected.id,
          );
          beginDrag();
        }}
        onObjectChange={commitPosition}
      />
    </>
  );
}
```

- [ ] **Step 6: 驗證**

Run: `npx vitest run && npm run build` — Expected: 全綠。
手動：放一個 Arduino Uno + 一個圓柱（孔模式、半徑 1.6）；拖圓柱靠近 Uno 角落安裝孔 → 位置吸附到孔心（屬性卡座標對上 Uno 位置 ± 孔偏移）。

- [ ] **Step 7: Commit**

```bash
git add src/geometry/holeSnap.ts src/geometry/holeSnap.test.ts src/components/SelectionGizmo.tsx
git commit -m "feat: add mounting-hole magnetic snapping during drag"
```

---

### Task 10: IndexedDB 持久化與自動儲存

**Files:**
- Modify: `package.json`（`npm install idb && npm install -D fake-indexeddb`）
- Create: `src/persistence/db.ts`、`src/store/projectStore.ts`、`src/hooks/useAutosave.ts`
- Modify: `src/App.tsx`（啟動載入 + useAutosave）
- Test: `src/persistence/db.test.ts`

**Interfaces:**
- Produces: `ProjectRecord { id, name, updatedAt, doc }`；`saveProject(record)`、`loadProject(id)`、`listProjects()`（依 updatedAt 新→舊）、`deleteProject(id)`；`useProjectStore { projectId, setProjectId }`；`useAutosave()` hook
- Consumes: `NexcadDocument`、`newId`、`emptyDocument`

- [ ] **Step 1: 安裝與失敗測試**

Run: `npm install idb && npm install -D fake-indexeddb`

`src/persistence/db.test.ts`：

```ts
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDocument } from '../types/document';
import { deleteProject, listProjects, loadProject, saveProject } from './db';

const record = (id: string, updatedAt: number) => ({
  id,
  name: `專案 ${id}`,
  updatedAt,
  doc: emptyDocument(`專案 ${id}`),
});

beforeEach(async () => {
  for (const p of await listProjects()) await deleteProject(p.id);
});

describe('persistence/db', () => {
  it('save 後可 load 回相同內容', async () => {
    await saveProject(record('a', 100));
    const loaded = await loadProject('a');
    expect(loaded?.name).toBe('專案 a');
    expect(loaded?.doc.units).toBe('mm');
  });

  it('list 依 updatedAt 新到舊排序', async () => {
    await saveProject(record('old', 100));
    await saveProject(record('new', 200));
    const all = await listProjects();
    expect(all.map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('save 相同 id 為覆寫', async () => {
    await saveProject(record('a', 100));
    await saveProject({ ...record('a', 300), name: '改名' });
    expect(await listProjects()).toHaveLength(1);
    expect((await loadProject('a'))?.name).toBe('改名');
  });

  it('delete 移除專案', async () => {
    await saveProject(record('a', 100));
    await deleteProject('a');
    expect(await loadProject('a')).toBeUndefined();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/persistence/db.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/persistence/db.ts`**

```ts
import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { NexcadDocument } from '../types/document';

export interface ProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  doc: NexcadDocument;
}

interface NexcadDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectRecord;
    indexes: { 'by-updated': number };
  };
}

let dbPromise: Promise<IDBPDatabase<NexcadDB>> | null = null;

function getDb(): Promise<IDBPDatabase<NexcadDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NexcadDB>('nexcad', 1, {
      upgrade(db) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

export async function saveProject(record: ProjectRecord): Promise<void> {
  await (await getDb()).put('projects', record);
}

export async function loadProject(id: string): Promise<ProjectRecord | undefined> {
  return (await getDb()).get('projects', id);
}

/** 依 updatedAt 新→舊 */
export async function listProjects(): Promise<ProjectRecord[]> {
  const all = await (await getDb()).getAllFromIndex('projects', 'by-updated');
  return all.reverse();
}

export async function deleteProject(id: string): Promise<void> {
  await (await getDb()).delete('projects', id);
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/persistence/db.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: 建立 `src/store/projectStore.ts` 與 `src/hooks/useAutosave.ts`**

`src/store/projectStore.ts`：

```ts
import { create } from 'zustand';

interface ProjectState {
  projectId: string | null;
  setProjectId: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  setProjectId: (id) => set({ projectId: id }),
}));
```

`src/hooks/useAutosave.ts`：

```ts
import { useEffect } from 'react';
import { saveProject } from '../persistence/db';
import { useDocumentStore } from '../store/documentStore';
import { useProjectStore } from '../store/projectStore';

const AUTOSAVE_DELAY_MS = 800;

function persistNow(): void {
  const projectId = useProjectStore.getState().projectId;
  if (!projectId) return;
  const doc = useDocumentStore.getState().doc;
  void saveProject({ id: projectId, name: doc.name, updatedAt: Date.now(), doc });
}

/** 文件變更後 debounce 寫入 IndexedDB；pagehide 時立即寫入 */
export function useAutosave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useDocumentStore.subscribe((state, prev) => {
      if (state.doc === prev.doc) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(persistNow, AUTOSAVE_DELAY_MS);
    });
    const onPageHide = () => persistNow();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}
```

- [ ] **Step 6: 啟動載入 — 修改 `src/App.tsx`**

```tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PartsDrawer } from './components/PartsDrawer';
import { PropertyCard } from './components/PropertyCard';
import { LanguageToggle } from './components/LanguageToggle';
import { ToastStack } from './components/ToastStack';
import { Toolbar } from './components/Toolbar';
import { Viewport } from './components/Viewport';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { listProjects, saveProject } from './persistence/db';
import { useDocumentStore } from './store/documentStore';
import { useProjectStore } from './store/projectStore';
import { emptyDocument, newId } from './types/document';

export default function App() {
  useKeyboardShortcuts();
  useAutosave();
  const { t } = useTranslation();

  useEffect(() => {
    void (async () => {
      if (useProjectStore.getState().projectId) return;
      const projects = await listProjects();
      if (projects.length > 0) {
        const latest = projects[0];
        useDocumentStore.setState({
          doc: latest.doc,
          selection: [],
          past: [],
          future: [],
          dragBase: null,
        });
        useProjectStore.getState().setProjectId(latest.id);
      } else {
        const id = newId();
        const doc = emptyDocument(t('projects.untitled'));
        useDocumentStore.setState({ doc, selection: [], past: [], future: [], dragBase: null });
        useProjectStore.getState().setProjectId(id);
        await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
      }
    })();
  }, [t]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-50">
      <Viewport />
      <Toolbar />
      <PropertyCard />
      <PartsDrawer />
      <ToastStack />
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="absolute bottom-4 left-4 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur">
        NexCAD
      </div>
    </div>
  );
}
```

（`useEffect` 內的 `projectId` guard 讓 StrictMode 雙掛載安全；第二次執行時 id 已設定即返回。）

- [ ] **Step 7: 驗證**

Run: `npx vitest run && npm run build` — Expected: 全綠。
手動：放幾個形狀 → 等 1 秒 → 重新整理頁面 → 場景恢復。

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/persistence src/store/projectStore.ts src/hooks/useAutosave.ts src/App.tsx
git commit -m "feat: add IndexedDB persistence with debounced autosave"
```

---

### Task 11: 專案面板與 .nexcad 匯出/匯入

**Files:**
- Create: `src/persistence/nexcadFile.ts`、`src/components/ProjectsPanel.tsx`
- Modify: `src/App.tsx`（左上角專案鈕 + 專案名輸入）
- Test: `src/persistence/nexcadFile.test.ts`

**Interfaces:**
- Produces: `serializeNexcadFile(doc: NexcadDocument): string`、`parseNexcadFile(text: string): NexcadDocument`（格式錯誤時 throw）
- Consumes: `saveProject/loadProject/listProjects/deleteProject`（Task 10）、i18n key `projects.*`

- [ ] **Step 1: 寫失敗測試 `src/persistence/nexcadFile.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createPartNode, createPrimitive, emptyDocument, identityTransform, newId } from '../types/document';
import type { GroupNode } from '../types/document';
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
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/persistence/nexcadFile.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/persistence/nexcadFile.ts`**

```ts
import { z } from 'zod';
import type { GroupNode, NexcadDocument, SceneNode } from '../types/document';

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

const nodeCommonShape = {
  id: z.string(),
  name: z.string(),
  role: z.enum(['solid', 'hole']),
  transform: z.object({
    position: vec3Schema,
    rotation: vec3Schema,
    scale: vec3Schema,
  }),
  visible: z.boolean(),
  locked: z.boolean(),
};

const primitiveNodeSchema = z.object({
  ...nodeCommonShape,
  type: z.literal('primitive'),
  kind: z.enum(['box', 'cylinder', 'sphere', 'cone']),
  // zod v4 的 record 需要明確的 key schema
  params: z.record(z.string(), z.number()),
});

const partNodeSchema = z.object({
  ...nodeCommonShape,
  type: z.literal('part'),
  partId: z.string(),
});

const groupNodeSchema: z.ZodType<GroupNode> = z.lazy(() =>
  z.object({
    ...nodeCommonShape,
    type: z.literal('group'),
    children: z.array(sceneNodeSchema),
  }),
);

const sceneNodeSchema: z.ZodType<SceneNode> = z.lazy(() =>
  z.union([primitiveNodeSchema, partNodeSchema, groupNodeSchema]),
);

const documentSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  units: z.literal('mm'),
  nodes: z.array(sceneNodeSchema),
});

export function serializeNexcadFile(doc: NexcadDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** 解析 .nexcad 專案檔；格式錯誤時拋出例外 */
export function parseNexcadFile(text: string): NexcadDocument {
  return documentSchema.parse(JSON.parse(text));
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/persistence/nexcadFile.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: 建立 `src/components/ProjectsPanel.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Plus, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  deleteProject,
  listProjects,
  saveProject,
  type ProjectRecord,
} from '../persistence/db';
import { parseNexcadFile, serializeNexcadFile } from '../persistence/nexcadFile';
import { useDocumentStore } from '../store/documentStore';
import { useProjectStore } from '../store/projectStore';
import { useToastStore } from '../store/toastStore';
import { emptyDocument, newId } from '../types/document';

function loadDocIntoStore(doc: ProjectRecord['doc'], id: string): void {
  useDocumentStore.setState({
    doc: structuredClone(doc),
    selection: [],
    past: [],
    future: [],
    dragBase: null,
  });
  useProjectStore.getState().setProjectId(id);
}

async function persistCurrent(): Promise<void> {
  const id = useProjectStore.getState().projectId;
  if (!id) return;
  const doc = useDocumentStore.getState().doc;
  await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
}

export function ProjectsPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentId = useProjectStore((s) => s.projectId);
  const docName = useDocumentStore((s) => s.doc.name);
  const mutate = useDocumentStore((s) => s.mutate);

  useEffect(() => {
    if (open) void listProjects().then(setProjects);
  }, [open]);

  const openProject = async (record: ProjectRecord) => {
    await persistCurrent();
    loadDocIntoStore(record.doc, record.id);
    setOpen(false);
  };

  const newProject = async () => {
    await persistCurrent();
    const id = newId();
    const doc = emptyDocument(t('projects.untitled'));
    loadDocIntoStore(doc, id);
    await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
    setOpen(false);
  };

  const removeProject = async (record: ProjectRecord) => {
    if (!window.confirm(t('projects.deleteConfirm', { name: record.name }))) return;
    await deleteProject(record.id);
    setProjects(await listProjects());
  };

  const exportFile = () => {
    const doc = useDocumentStore.getState().doc;
    const blob = new Blob([serializeNexcadFile(doc)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.nexcad`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const doc = parseNexcadFile(await file.text());
      await persistCurrent();
      const id = newId();
      loadDocIntoStore(doc, id);
      await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
      setOpen(false);
    } catch {
      useToastStore.getState().show(t('projects.importFailed'));
    }
  };

  return (
    <>
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          aria-label={t('projects.title')}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-lg backdrop-blur hover:bg-slate-100"
        >
          <FolderOpen size={20} />
        </button>
        <input
          value={docName}
          onChange={(e) => mutate('rename', (d) => void (d.name = e.target.value))}
          aria-label={t('projects.title')}
          className="h-11 w-44 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-lg backdrop-blur"
        />
      </div>
      {open && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[70vh] w-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">{t('projects.title')}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => void newProject()}
                  title={t('projects.new')}
                  aria-label={t('projects.new')}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  title={t('projects.import')}
                  aria-label={t('projects.import')}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  <Upload size={18} />
                </button>
                <button
                  onClick={exportFile}
                  className="h-11 rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  {t('projects.exportFile')}
                </button>
              </div>
            </div>
            {projects.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">{t('projects.empty')}</p>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className={`mb-1 flex items-center justify-between rounded-xl border px-3 py-2 ${
                  p.id === currentId ? 'border-blue-200 bg-blue-50' : 'border-slate-100'
                }`}
              >
                <div>
                  <p className="text-sm text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(p.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => void openProject(p)}
                    className="h-11 rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    {t('projects.open')}
                  </button>
                  <button
                    onClick={() => void removeProject(p)}
                    aria-label={t('projects.delete')}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <input
              ref={fileRef}
              type="file"
              accept=".nexcad,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 6: 掛載到 `src/App.tsx`**

import `ProjectsPanel`，在 `<Toolbar />` 前加 `<ProjectsPanel />`。

- [ ] **Step 7: 驗證**

Run: `npx vitest run && npm run build` — Expected: 全綠。
手動：改專案名 → 開專案面板（左上資料夾）→ 新專案 → 兩個專案可切換且場景各自保留；匯出 `.nexcad` → 匯入 → 出現為新專案；匯入壞檔（隨便選個 .txt）→ toast 錯誤。

- [ ] **Step 8: Commit**

```bash
git add src/persistence src/components/ProjectsPanel.tsx src/App.tsx
git commit -m "feat: add projects panel with .nexcad import/export"
```

---

### Task 12: 匯出對話框與列印檢查

**Files:**
- Create: `src/export/analyze.ts`、`src/components/ExportDialog.tsx`
- Modify: `src/components/Toolbar.tsx`（匯出改開對話框）
- Test: `src/export/analyze.test.ts`

**Interfaces:**
- Produces: `analyzeMesh(mesh: MeshData): { bbox: [number, number, number]; triangles: number }`、`collectThinFeatures(nodes: SceneNode[]): string[]`（回傳有 <1mm 參數的節點名）、`MAX_PRINT_MM = 250`
- Consumes: `getGeometryClient().requestExport`、`writeBinaryStl`、i18n key `export.*`

- [ ] **Step 1: 寫失敗測試 `src/export/analyze.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { createPrimitive } from '../types/document';
import { analyzeMesh, collectThinFeatures } from './analyze';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('analyzeMesh', () => {
  it('回傳正確的 bounding box 與三角形數', () => {
    const mesh = kernel.toMesh(kernel.box(60, 25, 2));
    const stats = analyzeMesh(mesh);
    expect(stats.bbox[0]).toBeCloseTo(60, 3);
    expect(stats.bbox[1]).toBeCloseTo(25, 3);
    expect(stats.bbox[2]).toBeCloseTo(2, 3);
    expect(stats.triangles).toBe(12);
  });

  it('空 mesh 回傳零值', () => {
    expect(analyzeMesh({ positions: new Float32Array(0), indices: new Uint32Array(0) })).toEqual({
      bbox: [0, 0, 0],
      triangles: 0,
    });
  });
});

describe('collectThinFeatures', () => {
  it('偵測 <1mm 的參數', () => {
    const thin = createPrimitive('box', { name: '薄板' });
    thin.params.height = 0.5;
    expect(collectThinFeatures([thin])).toEqual(['薄板']);
  });

  it('孔節點與 radiusTop=0 不觸發警告', () => {
    const hole = createPrimitive('cylinder', { role: 'hole' });
    hole.params.radius = 0.5;
    const cone = createPrimitive('cone');
    expect(collectThinFeatures([hole, cone])).toEqual([]);
  });

  it('遞迴檢查群組內節點', () => {
    const thin = createPrimitive('box', { name: '內層' });
    thin.params.width = 0.8;
    expect(
      collectThinFeatures([
        {
          type: 'group',
          id: 'g',
          name: 'g',
          role: 'solid',
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          visible: true,
          locked: false,
          children: [thin],
        },
      ]),
    ).toEqual(['內層']);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/export/analyze.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/export/analyze.ts`**

```ts
import type { MeshData } from '../geometry/kernel';
import type { SceneNode } from '../types/document';

export interface MeshStats {
  bbox: [number, number, number];
  triangles: number;
}

export const MIN_FEATURE_MM = 1;
export const MAX_PRINT_MM = 250;

export function analyzeMesh(mesh: MeshData): MeshStats {
  const p = mesh.positions;
  if (p.length === 0) return { bbox: [0, 0, 0], triangles: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    minX = Math.min(minX, p[i]);
    maxX = Math.max(maxX, p[i]);
    minY = Math.min(minY, p[i + 1]);
    maxY = Math.max(maxY, p[i + 1]);
    minZ = Math.min(minZ, p[i + 2]);
    maxZ = Math.max(maxZ, p[i + 2]);
  }
  return {
    bbox: [maxX - minX, maxY - minY, maxZ - minZ],
    triangles: mesh.indices.length / 3,
  };
}

/**
 * 參數層級的薄件檢查（規格 §11）：實體 primitive 有 <1mm 參數即列出節點名。
 * radiusTop 允許 0（圓錐尖）。真正的 mesh 壁厚分析屬未來工作。
 */
export function collectThinFeatures(nodes: SceneNode[]): string[] {
  const out: string[] = [];
  const visit = (list: SceneNode[]) => {
    for (const node of list) {
      if (!node.visible) continue;
      if (node.type === 'group') {
        visit(node.children);
        continue;
      }
      if (node.type !== 'primitive' || node.role === 'hole') continue;
      for (const [key, value] of Object.entries(node.params)) {
        if (key !== 'radiusTop' && value < MIN_FEATURE_MM) {
          out.push(node.name);
          break;
        }
      }
    }
  };
  visit(nodes);
  return out;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/export/analyze.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: 建立 `src/components/ExportDialog.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analyzeMesh, collectThinFeatures, MAX_PRINT_MM, type MeshStats } from '../export/analyze';
import { writeBinaryStl } from '../export/stl';
import { getGeometryClient } from '../geometry/client';
import type { MeshData } from '../geometry/kernel';
import { useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [stats, setStats] = useState<MeshStats | null>(null);

  // 開啟時只請求一次；onClose/t 為短生命週期擷取，勿加入依賴（會重複請求）
  useEffect(() => {
    const { doc } = useDocumentStore.getState();
    getGeometryClient()
      .requestExport(doc.nodes)
      .then((m) => {
        setMesh(m);
        setStats(analyzeMesh(m));
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error && err.message === 'EXPORT_EMPTY'
            ? t('errors.exportEmpty')
            : t('errors.exportFailed');
        useToastStore.getState().show(message);
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = () => {
    if (!mesh) return;
    const { doc } = useDocumentStore.getState();
    const blob = new Blob([writeBinaryStl(mesh)], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.stl`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const doc = useDocumentStore.getState().doc;
  const thin = collectThinFeatures(doc.nodes);
  const tooLarge = stats ? stats.bbox.some((d) => d > MAX_PRINT_MM) : false;
  const warnings = [
    ...thin.map((name) => t('export.thinFeature', { name })),
    ...(tooLarge ? [t('export.tooLarge')] : []),
  ];
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-medium text-slate-800">{t('export.title')}</p>
        {stats && (
          <div className="mb-3 space-y-1 text-sm text-slate-600">
            <p>
              {t('export.dimensions')}：{fmt(stats.bbox[0])} × {fmt(stats.bbox[1])} ×{' '}
              {fmt(stats.bbox[2])} mm
            </p>
            <p>
              {t('export.triangles')}：{stats.triangles.toLocaleString()}
            </p>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1 text-xs font-medium text-amber-800">{t('export.warnings')}</p>
            {warnings.map((w) => (
              <p key={w} className="text-xs text-amber-700">
                {w}
              </p>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-11 rounded-xl px-4 text-sm text-slate-600 hover:bg-slate-100"
          >
            {t('export.cancel')}
          </button>
          <button
            onClick={download}
            disabled={!mesh}
            className="h-11 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {t('export.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 修改 `src/components/Toolbar.tsx`**

移除 `exportStl` 函數與 `exporting` state 及相關 import（`writeBinaryStl`、`getGeometryClient`、`useToastStore` 若無其他使用處），改為：

```tsx
  const [showExport, setShowExport] = useState(false);
```

匯出按鈕改為 `onClick={() => setShowExport(true)}`（不再 disabled），在工具列 JSX 最外層 fragment 加：

```tsx
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
```

（`return` 改為 `<>...</>` fragment 包住原本的 div 與 dialog。）import `ExportDialog`。

- [ ] **Step 7: 驗證**

Run: `npx vitest run && npm run build` — Expected: 全綠。
手動：放一個 0.5mm 高的薄方塊 + 一個正常方塊 → 匯出 → 對話框顯示尺寸、三角形數與薄件警告 → 下載成功；空場景匯出 → toast「沒有可匯出的實體」。

- [ ] **Step 8: Commit**

```bash
git add src/export src/components/ExportDialog.tsx src/components/Toolbar.tsx
git commit -m "feat: add export dialog with size summary and print warnings"
```

---

### Task 13: 最終整合驗證

**Files:** 無新檔案（只驗證與修復）

- [ ] **Step 1: 全套驗證**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 全部通過（約 70+ tests），無型別錯誤，建置成功（worker chunk + wasm 正常產出）

- [ ] **Step 2: 瀏覽器驗證清單**（`npm run dev`）

1. 底部零件庫抽屜：四分類齊全、共 23 個零件卡、搜尋可跨分類
2. 放入 Arduino Uno：綠色 PCB、USB/電源塊、四孔可見
3. 放一個圓柱（孔模式、半徑 1.6）拖近 Uno 安裝孔 → 磁吸對齊
4. 語言切換 EN：工具列/屬性卡/抽屜全部切換、重新整理保留
5. 重新整理頁面：場景自動恢復（IndexedDB）
6. 專案面板：新專案、切換、刪除（有確認）、匯出/匯入 .nexcad
7. 匯出 STL：對話框顯示尺寸與警告（做一個 0.5mm 薄板觸發）
8. 錯誤 toast：匯入壞檔顯示錯誤訊息
9. 無 console 錯誤

- [ ] **Step 3: 修復發現的問題並 commit**

發現問題時：讀原始碼診斷 → 修復 → 重跑驗證 → 以 `fix:` commit。

---

## 完成驗證

- [ ] `npm test`、`tsc --noEmit`、`npm run build` 全綠
- [ ] Task 13 瀏覽器清單全部通過
- [ ] 規格覆蓋：§7 零件庫（23 項、四類、安裝孔/接口/淨空資料）✓、§10 零件抽屜與孔位磁吸 ✓、§2 雙語 ✓、§11 自動儲存/專案檔/匯出警告 ✓、§12 能力偵測與錯誤 toast ✓
- [ ] 明確遞延至 Plan 3：外殼生成器（§8）、螺絲孔工具與孔位投影（§9）、3MF、Worker 自動重啟、Playwright E2E、真 mesh 壁厚分析、visible/locked 的場景樹 UI

完成後使用 superpowers:finishing-a-development-branch skill 決定合併方式。



