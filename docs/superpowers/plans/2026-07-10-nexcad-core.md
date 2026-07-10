# NexCAD 核心建模器實作計畫（Plan 1 / 3）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 NexCAD 的核心建模器 — 可在瀏覽器新增基本形狀、觸控/滑鼠操作、孔模式 boolean 減料、undo/redo、匯出 STL。

**Architecture:** 全前端 SPA。文件是參數化場景樹（JSON），幾何運算由 manifold-3d WASM 在 Web Worker 中求值，回傳 mesh 給 three.js 渲染。Zustand 儲存文件 + 快照式 undo/redo。規格見 `docs/superpowers/specs/2026-07-10-nexcad-design.md`。

**Tech Stack:** React 19 + TypeScript + Vite、three.js + react-three-fiber + drei、manifold-3d（WASM）、Zustand、Tailwind CSS v4、Vitest、lucide-react。

**後續計畫（本計畫不含）：** Plan 2 = 零件庫 + i18n + IndexedDB；Plan 3 = 外殼生成器 + 螺絲孔工具 + 3MF + E2E。

---

## 檔案結構

```
package.json / vite.config.ts / tsconfig.json / index.html / .gitignore
src/
  main.tsx / App.tsx / index.css
  types/document.ts          場景樹型別 + 建構 helper
  geometry/
    kernel.ts                GeometryKernel 介面 + MeshData
    manifoldKernel.ts        Manifold WASM 實作
    evaluate.ts              場景樹 → Solid/mesh 求值（純函數）
    protocol.ts              Worker 訊息型別
    worker.ts                Web Worker 入口（薄膠水層）
    workerClient.ts          主執行緒客戶端（請求合併）
    client.ts                Worker 單例
  export/stl.ts              binary STL writer（純函數）
  store/documentStore.ts     Zustand 文件 store + undo/redo
  components/
    Viewport.tsx             R3F 畫布 + mesh 渲染 + 相機
    SelectionGizmo.tsx       移動 gizmo（1mm 吸附）
    Toolbar.tsx              懸浮工具列
    PropertyCard.tsx         浮動屬性卡片
  hooks/useKeyboardShortcuts.ts
```

慣例：測試檔與原始碼同目錄（`*.test.ts`）。所有尺寸單位為 mm。CAD 座標 Z 向上；three.js 場景以旋轉 group 轉換。

---

### Task 1: 專案腳手架

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `src/index.css`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: 建立 `package.json`**

```json
{
  "name": "nexcad",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@react-three/drei": "^10.4.0",
    "@react-three/fiber": "^9.1.0",
    "lucide-react": "^0.525.0",
    "manifold-3d": "^3.1.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "three": "^0.178.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@types/three": "^0.178.0",
    "@vitejs/plugin-react": "^4.6.0",
    "tailwindcss": "^4.1.0",
    "typescript": "~5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: 建立 `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['manifold-3d'] },
  test: { environment: 'node' },
});
```

- [ ] **Step 3: 建立 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 建立 `index.html`**

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>NexCAD</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 建立 `.gitignore`**

```
node_modules
dist
*.local
```

- [ ] **Step 6: 建立 `src/index.css`**

```css
@import "tailwindcss";

html, body, #root {
  height: 100%;
  margin: 0;
  overscroll-behavior: none;
}
```

- [ ] **Step 7: 建立 `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: 建立暫時的 `src/App.tsx`（Task 10 會改寫）**

```tsx
export default function App() {
  return <div className="p-8 text-slate-600">NexCAD — 建置中</div>;
}
```

- [ ] **Step 9: 安裝依賴**

Run: `npm install`
Expected: 成功，無 peer dependency 錯誤

- [ ] **Step 10: 驗證建置**

Run: `npm run build`
Expected: tsc 無錯誤，vite build 產出 `dist/`

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind project"
```

---

### Task 2: 文件模型（場景樹型別）

**Files:**
- Create: `src/types/document.ts`
- Test: `src/types/document.test.ts`

- [ ] **Step 1: 寫失敗測試 `src/types/document.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createPrimitive, emptyDocument, identityTransform } from './document';

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
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/types/document.test.ts`
Expected: FAIL — 模組不存在

- [ ] **Step 3: 建立 `src/types/document.ts`**

```ts
export type Vec3 = [number, number, number];

export interface Transform {
  position: Vec3;
  /** 旋轉角度（degrees），依 X→Y→Z 順序套用 */
  rotation: Vec3;
  scale: Vec3;
}

export type NodeRole = 'solid' | 'hole';

export type PrimitiveKind = 'box' | 'cylinder' | 'sphere' | 'cone';

interface NodeCommon {
  id: string;
  name: string;
  role: NodeRole;
  transform: Transform;
  visible: boolean;
  locked: boolean;
}

export interface PrimitiveNode extends NodeCommon {
  type: 'primitive';
  kind: PrimitiveKind;
  params: Record<string, number>;
}

export interface GroupNode extends NodeCommon {
  type: 'group';
  children: SceneNode[];
}

export type SceneNode = PrimitiveNode | GroupNode;

export interface NexcadDocument {
  version: 1;
  name: string;
  units: 'mm';
  nodes: SceneNode[];
}

export function identityTransform(): Transform {
  return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
}

export const PRIMITIVE_DEFAULTS: Record<PrimitiveKind, Record<string, number>> = {
  box: { width: 20, depth: 20, height: 20 },
  cylinder: { radius: 10, height: 20 },
  sphere: { radius: 10 },
  cone: { radiusBottom: 10, radiusTop: 0, height: 20 },
};

let idCounter = 0;

export function newId(): string {
  idCounter += 1;
  return `n_${Date.now().toString(36)}_${idCounter}`;
}

export function createPrimitive(
  kind: PrimitiveKind,
  overrides: Partial<Omit<PrimitiveNode, 'type' | 'kind'>> = {},
): PrimitiveNode {
  return {
    type: 'primitive',
    id: newId(),
    name: kind,
    role: 'solid',
    transform: identityTransform(),
    visible: true,
    locked: false,
    kind,
    params: { ...PRIMITIVE_DEFAULTS[kind] },
    ...overrides,
  };
}

export function emptyDocument(name = '未命名專案'): NexcadDocument {
  return { version: 1, name, units: 'mm', nodes: [] };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/types/document.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add src/types
git commit -m "feat: add parametric scene tree document model"
```

---

### Task 3: GeometryKernel 介面與 Manifold 實作

**Files:**
- Create: `src/geometry/kernel.ts`, `src/geometry/manifoldKernel.ts`
- Test: `src/geometry/manifoldKernel.test.ts`

慣例：所有 primitive 的本地原點在**底面中心**（放在工作平面上），球體例外原點在最低點正上方 r 處（即球心提高 r，球底貼地）。

- [ ] **Step 1: 建立 `src/geometry/kernel.ts`（介面，無邏輯，先寫）**

```ts
import type { Transform } from '../types/document';

export interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
}

/** 幾何核心的不透明 Solid 把手 */
export interface Solid {
  readonly __solid: true;
}

/**
 * 幾何核心抽象。第一版由 ManifoldKernel 實作；
 * 日後可加 OpenCascade 實作以支援 STEP 匯出（見規格 §4）。
 */
export interface GeometryKernel {
  init(): Promise<void>;
  box(width: number, depth: number, height: number): Solid;
  cylinder(radius: number, height: number): Solid;
  sphere(radius: number): Solid;
  cone(radiusBottom: number, radiusTop: number, height: number): Solid;
  union(a: Solid, b: Solid): Solid;
  difference(a: Solid, b: Solid): Solid;
  transform(s: Solid, t: Transform): Solid;
  toMesh(s: Solid): MeshData;
  volume(s: Solid): number;
}
```

- [ ] **Step 2: 寫失敗測試 `src/geometry/manifoldKernel.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { identityTransform } from '../types/document';
import { ManifoldKernel } from './manifoldKernel';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('ManifoldKernel', () => {
  it('box 體積正確', () => {
    expect(kernel.volume(kernel.box(60, 25, 2))).toBeCloseTo(3000, 3);
  });

  it('cylinder 體積接近 πr²h（多邊形近似略小）', () => {
    const v = kernel.volume(kernel.cylinder(5, 10));
    expect(v).toBeGreaterThan(770);
    expect(v).toBeLessThan(Math.PI * 25 * 10);
  });

  it('difference 在板上鑽孔', () => {
    const plate = kernel.box(20, 20, 2);
    const drill = kernel.transform(kernel.cylinder(1.6, 10), {
      ...identityTransform(),
      position: [0, 0, -1],
    });
    const v = kernel.volume(kernel.difference(plate, drill));
    expect(v).toBeGreaterThan(780);
    expect(v).toBeLessThan(800);
  });

  it('union 合併兩個重疊方塊', () => {
    const a = kernel.box(10, 10, 10);
    const b = kernel.transform(kernel.box(10, 10, 10), {
      ...identityTransform(),
      position: [5, 0, 0],
    });
    expect(kernel.volume(kernel.union(a, b))).toBeCloseTo(1500, 3);
  });

  it('transform 依序套用 scale、rotation、position', () => {
    const s = kernel.transform(kernel.box(10, 10, 10), {
      position: [100, 0, 0],
      rotation: [0, 0, 45],
      scale: [2, 1, 1],
    });
    expect(kernel.volume(s)).toBeCloseTo(2000, 3);
  });

  it('toMesh 回傳三角形索引 mesh', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    expect(mesh.indices.length % 3).toBe(0);
    expect(mesh.indices.length / 3).toBe(12);
    expect(mesh.positions.length % 3).toBe(0);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npx vitest run src/geometry/manifoldKernel.test.ts`
Expected: FAIL — `manifoldKernel` 模組不存在

- [ ] **Step 4: 建立 `src/geometry/manifoldKernel.ts`**

```ts
import Module from 'manifold-3d';
import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import type { Transform } from '../types/document';
import type { GeometryKernel, MeshData, Solid } from './kernel';

interface MSolid extends Solid {
  m: Manifold;
}

const wrap = (m: Manifold): Solid => ({ __solid: true, m }) as MSolid;
const un = (s: Solid): Manifold => (s as MSolid).m;

/** 圓形分段數；越高越圓但 mesh 越大 */
const SEGMENTS = 48;

export class ManifoldKernel implements GeometryKernel {
  private wasm!: ManifoldToplevel;

  async init(): Promise<void> {
    this.wasm = await Module();
    this.wasm.setup();
  }

  private get M() {
    return this.wasm.Manifold;
  }

  box(width: number, depth: number, height: number): Solid {
    return wrap(this.M.cube([width, depth, height]).translate([-width / 2, -depth / 2, 0]));
  }

  cylinder(radius: number, height: number): Solid {
    return wrap(this.M.cylinder(height, radius, radius, SEGMENTS));
  }

  sphere(radius: number): Solid {
    return wrap(this.M.sphere(radius, SEGMENTS).translate([0, 0, radius]));
  }

  cone(radiusBottom: number, radiusTop: number, height: number): Solid {
    return wrap(this.M.cylinder(height, radiusBottom, radiusTop, SEGMENTS));
  }

  union(a: Solid, b: Solid): Solid {
    return wrap(un(a).add(un(b)));
  }

  difference(a: Solid, b: Solid): Solid {
    return wrap(un(a).subtract(un(b)));
  }

  transform(s: Solid, t: Transform): Solid {
    return wrap(un(s).scale(t.scale).rotate(t.rotation).translate(t.position));
  }

  toMesh(s: Solid): MeshData {
    const mesh = un(s).getMesh();
    return {
      positions: new Float32Array(mesh.vertProperties),
      indices: new Uint32Array(mesh.triVerts),
    };
  }

  volume(s: Solid): number {
    const m = un(s) as unknown as {
      volume?: () => number;
      getProperties?: () => { volume: number };
    };
    return typeof m.volume === 'function' ? m.volume() : m.getProperties!().volume;
  }
}
```

注意：`Manifold.cylinder(height, rLow, rHigh, segments)` 底面在 z=0；`cube` 角落在原點所以平移到底面中心。`rotate` 參數為 degrees。

- [ ] **Step 5: 執行測試確認通過**

Run: `npx vitest run src/geometry/manifoldKernel.test.ts`
Expected: PASS（6 tests）。若 WASM 載入失敗，確認 Node 版本 ≥ 18 且 `manifold-3d` 版本 ≥ 3。

- [ ] **Step 6: Commit**

```bash
git add src/geometry
git commit -m "feat: add GeometryKernel interface with Manifold WASM implementation"
```

---

### Task 4: 場景樹求值（evaluate）

**Files:**
- Create: `src/geometry/evaluate.ts`
- Test: `src/geometry/evaluate.test.ts`

語意（規格 §6）：同一層級中，`hole` 節點會從該層所有 `solid` 減料；群組先在內部結算成單一 Solid 再參與外層運算；隱藏節點不參與。

- [ ] **Step 1: 寫失敗測試 `src/geometry/evaluate.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { createPrimitive, identityTransform, newId } from '../types/document';
import type { GroupNode } from '../types/document';
import { evaluateForExport, evaluateForRender } from './evaluate';
import { ManifoldKernel } from './manifoldKernel';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

function plate() {
  return createPrimitive('box', { params: { width: 20, depth: 20, height: 2 } });
}

function drillHole() {
  const h = createPrimitive('cylinder', {
    role: 'hole',
    params: { radius: 5, height: 10 },
  });
  h.transform.position = [0, 0, -1];
  return h;
}

describe('evaluate', () => {
  it('hole 從同層 solid 減料（export 路徑）', () => {
    const solid = evaluateForExport([plate(), drillHole()], kernel);
    expect(solid).not.toBeNull();
    const v = kernel.volume(solid!);
    expect(v).toBeGreaterThan(642);
    expect(v).toBeLessThan(648);
  });

  it('render 路徑：solid 被減料，hole 顯示自身形狀', () => {
    const nodes = [plate(), drillHole()];
    const out = evaluateForRender(nodes, kernel);
    expect(out).toHaveLength(2);
    const roles = out.map((e) => e.role).sort();
    expect(roles).toEqual(['hole', 'solid']);
    for (const e of out) expect(e.mesh.indices.length).toBeGreaterThan(0);
  });

  it('隱藏節點不參與求值', () => {
    const hidden = drillHole();
    hidden.visible = false;
    const solid = evaluateForExport([plate(), hidden], kernel);
    expect(kernel.volume(solid!)).toBeCloseTo(800, 3);
  });

  it('群組內部先結算，群組 transform 再套用', () => {
    const group: GroupNode = {
      type: 'group',
      id: newId(),
      name: 'g',
      role: 'solid',
      transform: { ...identityTransform(), position: [10, 0, 0] },
      visible: true,
      locked: false,
      children: [plate(), drillHole()],
    };
    const solid = evaluateForExport([group], kernel);
    const v = kernel.volume(solid!);
    expect(v).toBeGreaterThan(642);
    expect(v).toBeLessThan(648);
  });

  it('空文件回傳 null', () => {
    expect(evaluateForExport([], kernel)).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/geometry/evaluate.test.ts`
Expected: FAIL — `evaluate` 模組不存在

- [ ] **Step 3: 建立 `src/geometry/evaluate.ts`**

```ts
import type { NodeRole, SceneNode } from '../types/document';
import type { GeometryKernel, MeshData, Solid } from './kernel';

export interface EvaluatedNode {
  nodeId: string;
  role: NodeRole;
  mesh: MeshData;
}

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
  } else {
    base = combineScope(node.children, kernel);
  }
  return base ? kernel.transform(base, node.transform) : null;
}

/** 同一層：所有 solid union 起來，再減去該層所有 hole */
export function combineScope(nodes: SceneNode[], kernel: GeometryKernel): Solid | null {
  const solids: Solid[] = [];
  const holes: Solid[] = [];
  for (const n of nodes) {
    if (!n.visible) continue;
    const s = buildSolid(n, kernel);
    if (!s) continue;
    (n.role === 'hole' ? holes : solids).push(s);
  }
  if (solids.length === 0) return null;
  let result = solids.reduce((a, b) => kernel.union(a, b));
  for (const h of holes) result = kernel.difference(result, h);
  return result;
}

/** 渲染用：每個頂層節點一個 mesh。solid 被同層 hole 減料；hole 回傳自身形狀 */
export function evaluateForRender(nodes: SceneNode[], kernel: GeometryKernel): EvaluatedNode[] {
  const out: EvaluatedNode[] = [];
  const holeNodes = nodes.filter((n) => n.visible && n.role === 'hole');
  for (const node of nodes) {
    if (!node.visible) continue;
    let s = buildSolid(node, kernel);
    if (!s) continue;
    if (node.role === 'solid') {
      for (const h of holeNodes) {
        const hs = buildSolid(h, kernel);
        if (hs) s = kernel.difference(s, hs);
      }
    }
    out.push({ nodeId: node.id, role: node.role, mesh: kernel.toMesh(s) });
  }
  return out;
}

/** 匯出用：整份文件結算成單一 Solid（無實體時回傳 null） */
export function evaluateForExport(nodes: SceneNode[], kernel: GeometryKernel): Solid | null {
  return combineScope(nodes, kernel);
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/geometry/evaluate.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: Commit**

```bash
git add src/geometry
git commit -m "feat: add scene tree evaluation with hole subtraction semantics"
```

---

### Task 5: Binary STL 匯出

**Files:**
- Create: `src/export/stl.ts`
- Test: `src/export/stl.test.ts`

- [ ] **Step 1: 寫失敗測試 `src/export/stl.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { ManifoldKernel } from '../geometry/manifoldKernel';
import { writeBinaryStl } from './stl';

const kernel = new ManifoldKernel();

beforeAll(async () => {
  await kernel.init();
});

describe('writeBinaryStl', () => {
  it('立方體輸出 12 個三角形、正確位元組數', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    const buf = writeBinaryStl(mesh);
    expect(buf.byteLength).toBe(84 + 12 * 50);
    const view = new DataView(buf);
    expect(view.getUint32(80, true)).toBe(12);
  });

  it('每個三角形的法向量為單位長度', () => {
    const mesh = kernel.toMesh(kernel.box(10, 10, 10));
    const view = new DataView(writeBinaryStl(mesh));
    for (let t = 0; t < 12; t++) {
      const off = 84 + t * 50;
      const nx = view.getFloat32(off, true);
      const ny = view.getFloat32(off + 4, true);
      const nz = view.getFloat32(off + 8, true);
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 5);
    }
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/export/stl.test.ts`
Expected: FAIL — `stl` 模組不存在

- [ ] **Step 3: 建立 `src/export/stl.ts`**

```ts
import type { MeshData } from '../geometry/kernel';

/** 產生 binary STL（little-endian）。格式：80B 標頭 + uint32 三角形數 + 每三角形 50B */
export function writeBinaryStl(mesh: MeshData): ArrayBuffer {
  const triCount = mesh.indices.length / 3;
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);
  view.setUint32(80, triCount, true);
  const p = mesh.positions;
  let offset = 84;
  for (let t = 0; t < triCount; t++) {
    const a = mesh.indices[t * 3] * 3;
    const b = mesh.indices[t * 3 + 1] * 3;
    const c = mesh.indices[t * 3 + 2] * 3;
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }
    const values = [nx, ny, nz, p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2]];
    for (const v of values) {
      view.setFloat32(offset, v, true);
      offset += 4;
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  return buffer;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/export/stl.test.ts`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add src/export
git commit -m "feat: add binary STL writer"
```

---

### Task 6: Web Worker 與客戶端（請求合併）

**Files:**
- Create: `src/geometry/protocol.ts`, `src/geometry/workerClient.ts`, `src/geometry/worker.ts`, `src/geometry/client.ts`
- Test: `src/geometry/workerClient.test.ts`

Worker 是薄膠水層（邏輯都在已測試的 `evaluate.ts`）。客戶端負責：同一時間只有一個 evaluate 在執行，期間收到的新請求只保留最新一筆（合併），完成後自動送出。

- [ ] **Step 1: 建立 `src/geometry/protocol.ts`**

```ts
import type { NodeRole, SceneNode } from '../types/document';

export type GeometryRequest =
  | { id: number; type: 'evaluate'; nodes: SceneNode[] }
  | { id: number; type: 'export'; nodes: SceneNode[] };

export interface NodeMeshPayload {
  nodeId: string;
  role: NodeRole;
  positions: Float32Array;
  indices: Uint32Array;
}

export type GeometryResponse =
  | { id: number; ok: true; type: 'evaluate'; meshes: NodeMeshPayload[] }
  | { id: number; ok: true; type: 'export'; positions: Float32Array; indices: Uint32Array }
  | { id: number; ok: false; error: string };
```

- [ ] **Step 2: 寫失敗測試 `src/geometry/workerClient.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createPrimitive } from '../types/document';
import type { GeometryRequest, GeometryResponse } from './protocol';
import { GeometryClient, type WorkerLike } from './workerClient';

class FakeWorker implements WorkerLike {
  posted: GeometryRequest[] = [];
  onmessage: ((e: MessageEvent<GeometryResponse>) => void) | null = null;

  postMessage(message: GeometryRequest): void {
    this.posted.push(message);
  }

  respond(res: GeometryResponse): void {
    this.onmessage?.({ data: res } as MessageEvent<GeometryResponse>);
  }
}

const nodes = () => [createPrimitive('box')];

describe('GeometryClient', () => {
  it('合併連續的 evaluate 請求，只保留最新', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    client.requestEvaluate(nodes());
    client.requestEvaluate(nodes());
    client.requestEvaluate(nodes());
    expect(worker.posted).toHaveLength(1);
    worker.respond({ id: worker.posted[0].id, ok: true, type: 'evaluate', meshes: [] });
    expect(worker.posted).toHaveLength(2);
    worker.respond({ id: worker.posted[1].id, ok: true, type: 'evaluate', meshes: [] });
    expect(worker.posted).toHaveLength(2);
  });

  it('evaluate 完成時呼叫 onMeshes', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const onMeshes = vi.fn();
    client.onMeshes = onMeshes;
    client.requestEvaluate(nodes());
    const payload = {
      nodeId: 'x',
      role: 'solid' as const,
      positions: new Float32Array(9),
      indices: new Uint32Array(3),
    };
    worker.respond({ id: worker.posted[0].id, ok: true, type: 'evaluate', meshes: [payload] });
    expect(onMeshes).toHaveBeenCalledWith([payload]);
  });

  it('export 回傳 promise 並以 mesh resolve', async () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const promise = client.requestExport(nodes());
    worker.respond({
      id: worker.posted[0].id,
      ok: true,
      type: 'export',
      positions: new Float32Array(9),
      indices: new Uint32Array(3),
    });
    const mesh = await promise;
    expect(mesh.indices).toHaveLength(3);
  });

  it('export 錯誤時 reject', async () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const promise = client.requestExport(nodes());
    worker.respond({ id: worker.posted[0].id, ok: false, error: '沒有可匯出的實體' });
    await expect(promise).rejects.toThrow('沒有可匯出的實體');
  });

  it('evaluate 錯誤時呼叫 onError 並繼續處理排隊中的請求', () => {
    const worker = new FakeWorker();
    const client = new GeometryClient(worker);
    const onError = vi.fn();
    client.onError = onError;
    client.requestEvaluate(nodes());
    client.requestEvaluate(nodes());
    worker.respond({ id: worker.posted[0].id, ok: false, error: 'boom' });
    expect(onError).toHaveBeenCalledWith('boom');
    expect(worker.posted).toHaveLength(2);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npx vitest run src/geometry/workerClient.test.ts`
Expected: FAIL — `workerClient` 模組不存在

- [ ] **Step 4: 建立 `src/geometry/workerClient.ts`**

```ts
import type { SceneNode } from '../types/document';
import type { MeshData } from './kernel';
import type { GeometryRequest, GeometryResponse, NodeMeshPayload } from './protocol';

export interface WorkerLike {
  postMessage(message: GeometryRequest): void;
  onmessage: ((e: MessageEvent<GeometryResponse>) => void) | null;
}

interface PendingExport {
  resolve: (mesh: MeshData) => void;
  reject: (error: Error) => void;
}

export class GeometryClient {
  onMeshes: (meshes: NodeMeshPayload[]) => void = () => {};
  onError: (message: string) => void = () => {};

  private nextId = 1;
  private evaluating = false;
  private pendingNodes: SceneNode[] | null = null;
  private exports = new Map<number, PendingExport>();

  constructor(private worker: WorkerLike) {
    worker.onmessage = (e) => this.handle(e.data);
  }

  requestEvaluate(nodes: SceneNode[]): void {
    if (this.evaluating) {
      this.pendingNodes = nodes;
      return;
    }
    this.evaluating = true;
    this.worker.postMessage({ id: this.nextId++, type: 'evaluate', nodes });
  }

  requestExport(nodes: SceneNode[]): Promise<MeshData> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.exports.set(id, { resolve, reject });
      this.worker.postMessage({ id, type: 'export', nodes });
    });
  }

  private handle(res: GeometryResponse): void {
    if (!res.ok) {
      const pendingExport = this.exports.get(res.id);
      if (pendingExport) {
        this.exports.delete(res.id);
        pendingExport.reject(new Error(res.error));
      } else {
        this.finishEvaluate();
        this.onError(res.error);
      }
      return;
    }
    if (res.type === 'evaluate') {
      this.finishEvaluate();
      this.onMeshes(res.meshes);
    } else {
      const pending = this.exports.get(res.id);
      if (pending) {
        this.exports.delete(res.id);
        pending.resolve({ positions: res.positions, indices: res.indices });
      }
    }
  }

  private finishEvaluate(): void {
    this.evaluating = false;
    if (this.pendingNodes) {
      const nodes = this.pendingNodes;
      this.pendingNodes = null;
      this.requestEvaluate(nodes);
    }
  }
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `npx vitest run src/geometry/workerClient.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 6: 建立 `src/geometry/worker.ts`（薄膠水層，由瀏覽器整合驗證）**

```ts
import { evaluateForExport, evaluateForRender } from './evaluate';
import { ManifoldKernel } from './manifoldKernel';
import type { GeometryRequest, GeometryResponse } from './protocol';

const kernel = new ManifoldKernel();
const ready = kernel.init();

const post = (response: GeometryResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(response, transfer);

self.onmessage = async (e: MessageEvent<GeometryRequest>) => {
  const req = e.data;
  try {
    await ready;
    if (req.type === 'evaluate') {
      const meshes = evaluateForRender(req.nodes, kernel).map((entry) => ({
        nodeId: entry.nodeId,
        role: entry.role,
        positions: entry.mesh.positions,
        indices: entry.mesh.indices,
      }));
      post(
        { id: req.id, ok: true, type: 'evaluate', meshes },
        meshes.flatMap((m) => [m.positions.buffer, m.indices.buffer]),
      );
    } else {
      const solid = evaluateForExport(req.nodes, kernel);
      if (!solid) throw new Error('沒有可匯出的實體');
      const mesh = kernel.toMesh(solid);
      post(
        { id: req.id, ok: true, type: 'export', positions: mesh.positions, indices: mesh.indices },
        [mesh.positions.buffer, mesh.indices.buffer],
      );
    }
  } catch (err) {
    post({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
```

- [ ] **Step 7: 建立 `src/geometry/client.ts`（單例）**

```ts
import { GeometryClient } from './workerClient';

let client: GeometryClient | null = null;

export function getGeometryClient(): GeometryClient {
  if (!client) {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    client = new GeometryClient(worker);
  }
  return client;
}
```

- [ ] **Step 8: 驗證建置（worker 打包正常）**

Run: `npm run build`
Expected: 無錯誤

- [ ] **Step 9: Commit**

```bash
git add src/geometry
git commit -m "feat: add geometry web worker with coalescing client"
```

---

### Task 7: 文件 Store（Zustand + undo/redo）

**Files:**
- Create: `src/store/documentStore.ts`
- Test: `src/store/documentStore.test.ts`

快照式 undo：每次 `mutate` 前把目前文件 push 進 `past`。拖曳期間用 `beginDrag`（存一次快照）+ `updateTransient`（不存快照），整段拖曳只佔一步 undo。

- [ ] **Step 1: 寫失敗測試 `src/store/documentStore.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createPrimitive, emptyDocument } from '../types/document';
import type { PrimitiveNode } from '../types/document';
import { findNode, useDocumentStore } from './documentStore';

beforeEach(() => {
  useDocumentStore.setState({ doc: emptyDocument(), selection: [], past: [], future: [] });
});

const store = () => useDocumentStore.getState();

describe('documentStore', () => {
  it('addNode 加入節點並選取', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    expect(store().doc.nodes).toHaveLength(1);
    expect(store().selection).toEqual([node.id]);
  });

  it('undo/redo 來回', () => {
    store().addNode(createPrimitive('box'));
    store().undo();
    expect(store().doc.nodes).toHaveLength(0);
    store().redo();
    expect(store().doc.nodes).toHaveLength(1);
  });

  it('mutate 後 redo 歷史被清空', () => {
    store().addNode(createPrimitive('box'));
    store().undo();
    store().addNode(createPrimitive('cylinder'));
    store().redo();
    expect(store().doc.nodes).toHaveLength(1);
    expect((store().doc.nodes[0] as PrimitiveNode).kind).toBe('cylinder');
  });

  it('updateNode 修改參數且可 undo', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    store().updateNode(node.id, (n) => {
      if (n.type === 'primitive') n.params.width = 50;
    });
    expect((findNode(store().doc.nodes, node.id) as PrimitiveNode).params.width).toBe(50);
    store().undo();
    expect((findNode(store().doc.nodes, node.id) as PrimitiveNode).params.width).toBe(20);
  });

  it('beginDrag + updateTransient 整段拖曳只佔一步 undo', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    store().beginDrag();
    store().updateTransient(node.id, (n) => {
      n.transform.position = [5, 0, 0];
    });
    store().updateTransient(node.id, (n) => {
      n.transform.position = [9, 0, 0];
    });
    expect(findNode(store().doc.nodes, node.id)!.transform.position).toEqual([9, 0, 0]);
    store().undo();
    expect(findNode(store().doc.nodes, node.id)!.transform.position).toEqual([0, 0, 0]);
  });

  it('removeSelected 刪除選取節點並清空選取', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    store().removeSelected();
    expect(store().doc.nodes).toHaveLength(0);
    expect(store().selection).toEqual([]);
  });

  it('findNode 能找到群組內的節點', () => {
    const inner = createPrimitive('box');
    store().mutate('add group', (d) => {
      d.nodes.push({
        type: 'group',
        id: 'g1',
        name: 'g',
        role: 'solid',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        visible: true,
        locked: false,
        children: [inner],
      });
    });
    expect(findNode(store().doc.nodes, inner.id)?.id).toBe(inner.id);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/store/documentStore.test.ts`
Expected: FAIL — `documentStore` 模組不存在

- [ ] **Step 3: 建立 `src/store/documentStore.ts`**

```ts
import { create } from 'zustand';
import type { NexcadDocument, SceneNode } from '../types/document';
import { emptyDocument } from '../types/document';

const MAX_HISTORY = 100;

interface DocumentState {
  doc: NexcadDocument;
  selection: string[];
  past: NexcadDocument[];
  future: NexcadDocument[];
  mutate: (label: string, fn: (doc: NexcadDocument) => void) => void;
  undo: () => void;
  redo: () => void;
  setSelection: (ids: string[]) => void;
  addNode: (node: SceneNode) => void;
  updateNode: (id: string, fn: (node: SceneNode) => void) => void;
  removeSelected: () => void;
  beginDrag: () => void;
  updateTransient: (id: string, fn: (node: SceneNode) => void) => void;
}

export function findNode(nodes: SceneNode[], id: string): SceneNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.type === 'group') {
      const hit = findNode(n.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  doc: emptyDocument(),
  selection: [],
  past: [],
  future: [],

  mutate: (_label, fn) => {
    const { doc, past } = get();
    const next = structuredClone(doc);
    fn(next);
    set({ doc: next, past: [...past.slice(-MAX_HISTORY + 1), doc], future: [] });
  },

  undo: () => {
    const { past, doc, future } = get();
    if (past.length === 0) return;
    set({ doc: past[past.length - 1], past: past.slice(0, -1), future: [doc, ...future] });
  },

  redo: () => {
    const { past, doc, future } = get();
    if (future.length === 0) return;
    set({ doc: future[0], past: [...past, doc], future: future.slice(1) });
  },

  setSelection: (ids) => set({ selection: ids }),

  addNode: (node) => {
    get().mutate('新增節點', (d) => {
      d.nodes.push(node);
    });
    set({ selection: [node.id] });
  },

  updateNode: (id, fn) =>
    get().mutate('修改節點', (d) => {
      const n = findNode(d.nodes, id);
      if (n) fn(n);
    }),

  removeSelected: () => {
    const selected = new Set(get().selection);
    if (selected.size === 0) return;
    get().mutate('刪除節點', (d) => {
      d.nodes = d.nodes.filter((n) => !selected.has(n.id));
    });
    set({ selection: [] });
  },

  beginDrag: () =>
    set((s) => ({ past: [...s.past.slice(-MAX_HISTORY + 1), s.doc], future: [] })),

  updateTransient: (id, fn) =>
    set((s) => {
      const next = structuredClone(s.doc);
      const n = findNode(next.nodes, id);
      if (!n) return {};
      fn(n);
      return { doc: next };
    }),
}));
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/store/documentStore.test.ts`
Expected: PASS（7 tests）

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: add document store with snapshot undo/redo and drag transients"
```

---

### Task 8: 3D 畫布（Viewport）

**Files:**
- Create: `src/components/Viewport.tsx`

UI 元件不寫單元測試（WebGL 在 jsdom 無法運作）；以 `npm run build` + 開發伺服器手動驗證。CAD 座標 Z 向上，three.js Y 向上 — 所有 mesh 放進 `rotation={[-Math.PI / 2, 0, 0]}` 的 group 轉換。

- [ ] **Step 1: 建立 `src/components/Viewport.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getGeometryClient } from '../geometry/client';
import type { NodeMeshPayload } from '../geometry/protocol';
import { useDocumentStore } from '../store/documentStore';
import { SelectionGizmo } from './SelectionGizmo';

export function Viewport() {
  const doc = useDocumentStore((s) => s.doc);
  const selection = useDocumentStore((s) => s.selection);
  const setSelection = useDocumentStore((s) => s.setSelection);
  const [meshes, setMeshes] = useState<NodeMeshPayload[]>([]);

  useEffect(() => {
    const client = getGeometryClient();
    client.onMeshes = setMeshes;
    client.onError = (message) => console.warn('幾何運算失敗：', message);
  }, []);

  useEffect(() => {
    getGeometryClient().requestEvaluate(doc.nodes);
  }, [doc]);

  return (
    <Canvas
      className="touch-none"
      camera={{ position: [120, 100, 120], fov: 45, near: 0.1, far: 5000 }}
      onPointerMissed={() => setSelection([])}
    >
      <color attach="background" args={['#f7f8fa']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[100, 200, 150]} intensity={1.2} />
      <Grid
        args={[500, 500]}
        cellSize={10}
        sectionSize={50}
        cellColor="#dde1e7"
        sectionColor="#c3c9d4"
        fadeDistance={600}
      />
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {meshes.map((m) => (
          <SceneMesh
            key={m.nodeId}
            payload={m}
            selected={selection.includes(m.nodeId)}
            onSelect={() => setSelection([m.nodeId])}
          />
        ))}
        <SelectionGizmo />
      </group>
      <OrbitControls
        makeDefault
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
    </Canvas>
  );
}

function SceneMesh({
  payload,
  selected,
  onSelect,
}: {
  payload: NodeMeshPayload;
  selected: boolean;
  onSelect: () => void;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(payload.positions, 3));
    g.setIndex(new THREE.BufferAttribute(payload.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [payload]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const isHole = payload.role === 'hole';
  return (
    <mesh
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <meshStandardMaterial
        color={isHole ? '#ef4444' : selected ? '#3b82f6' : '#9db4d0'}
        transparent={isHole}
        opacity={isHole ? 0.45 : 1}
        roughness={0.6}
        metalness={0.05}
      />
    </mesh>
  );
}
```

注意：`SelectionGizmo` 於 Task 9 建立；本 task 建置會失敗是預期的，先建立一個空殼讓建置通過：

- [ ] **Step 2: 建立暫時的 `src/components/SelectionGizmo.tsx`（Task 9 改寫）**

```tsx
export function SelectionGizmo() {
  return null;
}
```

- [ ] **Step 3: 驗證建置**

Run: `npm run build`
Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add src/components
git commit -m "feat: add 3D viewport with worker-driven mesh rendering"
```

---

### Task 9: 選取 Gizmo 與屬性卡片

**Files:**
- Modify: `src/components/SelectionGizmo.tsx`（改寫 Task 8 的空殼）
- Create: `src/components/PropertyCard.tsx`

- [ ] **Step 1: 改寫 `src/components/SelectionGizmo.tsx`**

gizmo 附著在一個代理 object 上，拖曳時以 `updateTransient` 即時更新（worker 客戶端會自動合併求值請求），放開時位置已寫入文件；`beginDrag` 讓整段拖曳只佔一步 undo。

```tsx
import { useEffect, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { findNode, useDocumentStore } from '../store/documentStore';

const snap = (v: number) => Math.round(v);

export function SelectionGizmo() {
  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const beginDrag = useDocumentStore((s) => s.beginDrag);
  const updateTransient = useDocumentStore((s) => s.updateTransient);
  const proxyRef = useRef<THREE.Object3D>(null!);

  const selected = selection.length === 1 ? findNode(doc.nodes, selection[0]) : undefined;

  useEffect(() => {
    if (selected && proxyRef.current) {
      proxyRef.current.position.set(...selected.transform.position);
    }
  }, [selected]);

  if (!selected || selected.locked) return null;

  const commitPosition = () => {
    const p = proxyRef.current.position;
    updateTransient(selected.id, (n) => {
      n.transform.position = [snap(p.x), snap(p.y), snap(p.z)];
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
        onMouseDown={() => beginDrag()}
        onObjectChange={commitPosition}
      />
    </>
  );
}
```

- [ ] **Step 2: 建立 `src/components/PropertyCard.tsx`**

```tsx
import { findNode, useDocumentStore } from '../store/documentStore';
import type { PrimitiveNode, SceneNode } from '../types/document';

const PARAM_LABELS: Record<string, string> = {
  width: '寬',
  depth: '深',
  height: '高',
  radius: '半徑',
  radiusBottom: '底半徑',
  radiusTop: '頂半徑',
};

const AXIS_LABELS = ['X', 'Y', 'Z'] as const;

export function PropertyCard() {
  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const updateNode = useDocumentStore((s) => s.updateNode);

  const node = selection.length === 1 ? findNode(doc.nodes, selection[0]) : undefined;
  if (!node) return null;

  return (
    <div className="absolute right-4 top-20 w-64 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
      <input
        className="mb-3 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-800"
        value={node.name}
        onChange={(e) => updateNode(node.id, (n) => void (n.name = e.target.value))}
        aria-label="名稱"
      />
      <RoleToggle node={node} onChange={(role) => updateNode(node.id, (n) => void (n.role = role))} />
      {node.type === 'primitive' && <ParamFields node={node} updateNode={updateNode} />}
      <p className="mb-1 mt-3 text-xs text-slate-400">位置 (mm)</p>
      <div className="grid grid-cols-3 gap-2">
        {AXIS_LABELS.map((axis, i) => (
          <NumberField
            key={axis}
            label={axis}
            value={node.transform.position[i]}
            onChange={(v) =>
              updateNode(node.id, (n) => void (n.transform.position[i] = v))
            }
          />
        ))}
      </div>
    </div>
  );
}

function RoleToggle({
  node,
  onChange,
}: {
  node: SceneNode;
  onChange: (role: 'solid' | 'hole') => void;
}) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {(['solid', 'hole'] as const).map((role) => (
        <button
          key={role}
          onClick={() => onChange(role)}
          className={`rounded-lg py-1.5 text-sm ${
            node.role === role ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          {role === 'solid' ? '實體' : '孔'}
        </button>
      ))}
    </div>
  );
}

function ParamFields({
  node,
  updateNode,
}: {
  node: PrimitiveNode;
  updateNode: (id: string, fn: (n: SceneNode) => void) => void;
}) {
  return (
    <>
      <p className="mb-1 text-xs text-slate-400">尺寸 (mm)</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(node.params).map(([key, value]) => (
          <NumberField
            key={key}
            label={PARAM_LABELS[key] ?? key}
            value={value}
            min={key === 'radiusTop' ? 0 : 0.1}
            onChange={(v) =>
              updateNode(node.id, (n) => {
                if (n.type === 'primitive') n.params[key] = v;
              })
            }
          />
        ))}
      </div>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="number"
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
        value={value}
        min={min}
        step={1}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value);
          if (!Number.isNaN(v) && (min === undefined || v >= min)) onChange(v);
        }}
      />
    </label>
  );
}
```

- [ ] **Step 3: 驗證建置**

Run: `npm run build`
Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add src/components
git commit -m "feat: add translate gizmo with snapping and floating property card"
```

---

### Task 10: 工具列、鍵盤快捷鍵與 App 組裝

**Files:**
- Create: `src/components/Toolbar.tsx`, `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/App.tsx`（改寫 Task 1 的暫時版本）

- [ ] **Step 1: 建立 `src/hooks/useKeyboardShortcuts.ts`**

```ts
import { useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const store = useDocumentStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        store.removeSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
```

- [ ] **Step 2: 建立 `src/components/Toolbar.tsx`**

```tsx
import { useState } from 'react';
import {
  Box,
  Circle,
  Cone,
  Cylinder,
  Download,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getGeometryClient } from '../geometry/client';
import { writeBinaryStl } from '../export/stl';
import { useDocumentStore } from '../store/documentStore';
import { createPrimitive } from '../types/document';
import type { PrimitiveKind } from '../types/document';

const PRIMITIVES: { kind: PrimitiveKind; label: string; icon: LucideIcon }[] = [
  { kind: 'box', label: '方塊', icon: Box },
  { kind: 'cylinder', label: '圓柱', icon: Cylinder },
  { kind: 'sphere', label: '球體', icon: Circle },
  { kind: 'cone', label: '圓錐', icon: Cone },
];

export function Toolbar() {
  const addNode = useDocumentStore((s) => s.addNode);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const removeSelected = useDocumentStore((s) => s.removeSelected);
  const selection = useDocumentStore((s) => s.selection);
  const canUndo = useDocumentStore((s) => s.past.length > 0);
  const canRedo = useDocumentStore((s) => s.future.length > 0);
  const [exporting, setExporting] = useState(false);

  const exportStl = async () => {
    setExporting(true);
    try {
      const { doc } = useDocumentStore.getState();
      const mesh = await getGeometryClient().requestExport(doc.nodes);
      const blob = new Blob([writeBinaryStl(mesh)], { type: 'model/stl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}.stl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '匯出失敗');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-lg backdrop-blur">
      {PRIMITIVES.map((p) => (
        <ToolButton key={p.kind} title={p.label} onClick={() => addNode(createPrimitive(p.kind))}>
          <p.icon size={20} />
        </ToolButton>
      ))}
      <Divider />
      <ToolButton title="復原" onClick={undo} disabled={!canUndo}>
        <Undo2 size={20} />
      </ToolButton>
      <ToolButton title="重做" onClick={redo} disabled={!canRedo}>
        <Redo2 size={20} />
      </ToolButton>
      <ToolButton title="刪除" onClick={removeSelected} disabled={selection.length === 0}>
        <Trash2 size={20} />
      </ToolButton>
      <Divider />
      <ToolButton title="匯出 STL" onClick={exportStl} disabled={exporting}>
        <Download size={20} />
      </ToolButton>
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-slate-200" />;
}

function ToolButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
```

（44px 觸控目標 = Tailwind `h-11 w-11`，符合規格 §10。）

- [ ] **Step 3: 改寫 `src/App.tsx`**

```tsx
import { PropertyCard } from './components/PropertyCard';
import { Toolbar } from './components/Toolbar';
import { Viewport } from './components/Viewport';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  useKeyboardShortcuts();
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-50">
      <Viewport />
      <Toolbar />
      <PropertyCard />
      <div className="absolute left-4 top-4 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur">
        NexCAD
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 驗證建置與全部測試**

Run: `npm run build && npm test`
Expected: 建置無錯誤；全部測試通過（29 tests：document 4 + kernel 6 + evaluate 5 + stl 2 + workerClient 5 + store 7）

- [ ] **Step 5: 開發伺服器手動驗證**

Run: `npm run dev`（背景執行），瀏覽器開啟 http://localhost:5173

驗證清單：
1. 點「方塊」→ 畫布中出現方塊，且被選取（藍色）
2. 拖曳 gizmo 箭頭 → 方塊以 1mm 吸附移動，畫布即時更新
3. 屬性卡片改「寬」為 50 → 方塊變寬
4. 新增圓柱，屬性卡片切到「孔」→ 圓柱變半透明紅色；拖進方塊重疊處 → 方塊被挖洞
5. ⌘Z 復原、⇧⌘Z 重做正常
6. 點「匯出 STL」→ 下載 `未命名專案.stl`，用切片軟體（或 macOS 快速預覽）打開確認幾何正確、有挖洞
7. 開發者工具切換 iPad 模擬：單指旋轉視角、雙指縮放平移

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add floating toolbar, keyboard shortcuts, and app shell"
```

---

## 完成驗證

- [ ] `npm test` 全數通過
- [ ] `npm run build` 無錯誤
- [ ] Task 10 Step 5 的手動驗證清單全部通過
- [ ] 對照規格 §6（文件模型）、§9（hole 模式 boolean）、§10（佈局與觸控）、§11（STL 匯出）確認已覆蓋
- [ ] 未覆蓋項屬後續計畫：§7 零件庫、i18n、IndexedDB（Plan 2）；§8 外殼生成器、螺絲孔工具、3MF、Worker 自動重啟、Playwright E2E（Plan 3）

完成後使用 superpowers:finishing-a-development-branch skill 決定合併方式。
