# NexCAD Object-first Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current left-column Tab layout with an object-first CAD sidebar where scene objects are always visible, parts are opened from a compact Add Part area, and workflow tools sit in a lower-priority accordion.

**Architecture:** Keep the existing three-column `WorkspaceShell`, `SceneTreePanel`, `PartsDrawer`, and `WorkflowTools`. Add only the minimum local state and props needed to render desktop left-column content in object-first order. Do not change document data, viewport behavior, geometry generation, selection semantics, or export.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Zustand stores, i18next/react-i18next, lucide-react, Playwright, Vitest.

## Global Constraints

- Left column first priority is `Objects / Scene Tree`.
- Users must not need to switch Tab to see scene objects.
- Parts library defaults collapsed on desktop and opens from `Add Part`.
- `產生外殼`, `智能小車`, and `螺絲工具` remain reachable from the left column.
- `Project flow` stays in the viewport lower-left and does not occupy the left column.
- Do not add a new dependency, UI framework, layer data model, draggable layout, or custom sidebar layout persistence.
- Do not modify 3D viewport, geometry worker, selection store semantics, STL export, or right properties panel.
- Preserve mobile/narrow-screen overlay and drawer behavior.
- Keep semantic buttons/inputs/selects with visible focus states.

---

## File Structure

- Modify `src/components/WorkspaceShell.tsx`: remove desktop left Tab state and replace it with a small object-first sidebar layout; keep mobile behavior.
- Modify `src/components/PartsDrawer.tsx`: add optional `compact` desktop mode so parts can sit inside a collapsed Add Part section without taking over the left column.
- Modify `src/components/WorkflowTools.tsx`: add optional compact styling if needed for a lower-priority tools accordion.
- Modify `src/components/SceneTreePanel.tsx`: add optional empty-state action hook so the empty objects panel can open Add Part.
- Modify `src/i18n/zh.json` and `src/i18n/en.json`: add copy for Add Part and sidebar section labels if existing keys are insufficient.
- Modify `e2e/smoke.spec.ts`: update desktop flow so it opens Add Part first, then opens Tools for enclosure generation.
- Test with `npx tsc --noEmit`, `npx vitest run src/i18n/resources.test.ts`, and `npx playwright test e2e/smoke.spec.ts`.

---

### Task 1: Add Sidebar Copy And Update Smoke Expectations

**Files:**
- Modify: `src/i18n/zh.json`
- Modify: `src/i18n/en.json`
- Modify: `e2e/smoke.spec.ts`
- Test: `src/i18n/resources.test.ts`
- Test: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: existing i18n namespaces `view` and `drawer`.
- Produces: labels used by `WorkspaceShell`, `SceneTreePanel`, and Playwright:
  - `view.addPart: string`
  - `view.partsLibrary: string`
  - `view.sidebarTools: string`
  - `view.sidebarObjectsHint: string`

- [ ] **Step 1: Add Chinese i18n keys**

Edit `src/i18n/zh.json` under the existing `"view"` object. Add these keys near `"objects"`:

```json
"addPart": "加入零件",
"partsLibrary": "零件庫",
"sidebarTools": "工具",
"sidebarObjectsHint": "先加入零件或基本形狀，物件會顯示在這裡。"
```

- [ ] **Step 2: Add English i18n keys**

Edit `src/i18n/en.json` under the existing `"view"` object. Add these keys near `"objects"`:

```json
"addPart": "Add Part",
"partsLibrary": "Parts Library",
"sidebarTools": "Tools",
"sidebarObjectsHint": "Add a part or primitive first; objects will appear here."
```

- [ ] **Step 3: Run i18n test**

Run:

```bash
npx vitest run src/i18n/resources.test.ts
```

Expected:

```text
Test Files  1 passed (1)
Tests  2 passed (2)
```

- [ ] **Step 4: Update smoke test for object-first desktop flow**

Edit `e2e/smoke.spec.ts`.

Replace the current parts-library open block:

```ts
// 桌面版零件庫常駐左欄；窄畫面仍可能是底部抽屜。
const drawerSearch = page.getByPlaceholder(zh.drawer.search);
if (!(await drawerSearch.isVisible())) {
  await page.getByRole('button', { name: zh.drawer.title }).first().click();
}
await expect(drawerSearch).toBeVisible();
```

with:

```ts
// 桌面版由左欄 Add Part 展開零件庫；窄畫面仍可能是底部抽屜。
const drawerSearch = page.getByPlaceholder(zh.drawer.search);
if (!(await drawerSearch.isVisible())) {
  await page.getByRole('button', { name: zh.view.addPart }).first().click();
}
await expect(drawerSearch).toBeVisible();
```

Replace the workflow tools click:

```ts
await page.getByRole('button', { name: zh.view.workflowTools }).click();
```

with:

```ts
await page.getByRole('button', { name: zh.view.sidebarTools }).click();
```

- [ ] **Step 5: Run smoke test and confirm expected failure**

Run:

```bash
npx playwright test e2e/smoke.spec.ts
```

Expected before Task 2 implementation:

```text
failed
```

Acceptable failure:

```text
waiting for getByRole('button', { name: '加入零件' })
```

Commit after this task only if i18n passes and smoke fails for the expected missing UI:

```bash
git add src/i18n/zh.json src/i18n/en.json e2e/smoke.spec.ts
git commit -m "test: expect object-first sidebar flow"
```

---

### Task 2: Implement Object-first Desktop Sidebar

**Files:**
- Modify: `src/components/WorkspaceShell.tsx`
- Modify: `src/components/PartsDrawer.tsx`
- Modify: `src/components/SceneTreePanel.tsx`
- Modify: `src/components/WorkflowTools.tsx`
- Test: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes from Task 1:
  - `t('view.addPart')`
  - `t('view.partsLibrary')`
  - `t('view.sidebarTools')`
  - `t('view.sidebarObjectsHint')`
- Produces:
  - `PartsDrawer({ docked?: boolean; showTitle?: boolean; compact?: boolean })`
  - `SceneTreePanel({ docked?: boolean; onAddPart?: () => void })`
  - `WorkflowTools({ showTitle?: boolean; compact?: boolean })`
  - Desktop sidebar where objects are always visible and Add Part opens the parts section.

- [ ] **Step 1: Extend `PartsDrawer` props**

Edit `src/components/PartsDrawer.tsx`.

Change the component signature from:

```tsx
export function PartsDrawer({ docked = false, showTitle = true }: { docked?: boolean; showTitle?: boolean }) {
```

to:

```tsx
export function PartsDrawer({
  docked = false,
  showTitle = true,
  compact = false,
}: {
  docked?: boolean;
  showTitle?: boolean;
  compact?: boolean;
}) {
```

- [ ] **Step 2: Make docked parts height compact when requested**

In `src/components/PartsDrawer.tsx`, replace the docked wrapper:

```tsx
<section className="flex max-h-[42vh] min-h-0 flex-col rounded-2xl border border-line bg-white/72 shadow-panel">
```

with:

```tsx
<section className={`${compact ? 'max-h-72' : 'max-h-[42vh]'} flex min-h-0 flex-col rounded-xl border border-line bg-white/72 shadow-sm`}>
```

In the parts-grid class expression, replace:

```tsx
docked ? 'max-h-48 grid-cols-1 px-3 pb-3'
```

with:

```tsx
docked ? `${compact ? 'max-h-40' : 'max-h-48'} grid-cols-1 px-3 pb-3`
```

In the primitive grid wrapper, keep the existing two-column compact layout:

```tsx
<div className={docked ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2 sm:grid-cols-4'}>
```

- [ ] **Step 3: Add empty-state Add Part action to `SceneTreePanel`**

Edit `src/components/SceneTreePanel.tsx`.

Change the signature from:

```tsx
export function SceneTreePanel({ docked = false }: { docked?: boolean }) {
```

to:

```tsx
export function SceneTreePanel({ docked = false, onAddPart }: { docked?: boolean; onAddPart?: () => void }) {
```

Replace the empty state:

```tsx
<p className="px-2 py-3 text-center text-[11px] leading-relaxed text-ink-3">{t('view.sceneTreeEmpty')}</p>
```

with:

```tsx
<div className="px-2 py-5 text-center">
  <p className="text-[12px] font-semibold text-ink-2">{t('view.sceneTreeEmpty')}</p>
  <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{t('view.sidebarObjectsHint')}</p>
  {onAddPart && (
    <button
      type="button"
      onClick={onAddPart}
      className="mt-3 inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-accent px-3 text-[12px] font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {t('view.addPart')}
    </button>
  )}
</div>
```

- [ ] **Step 4: Add compact mode to `WorkflowTools`**

Edit `src/components/WorkflowTools.tsx`.

Change the signature from:

```tsx
export function WorkflowTools({ showTitle = true }: { showTitle?: boolean }) {
```

to:

```tsx
export function WorkflowTools({ showTitle = true, compact = false }: { showTitle?: boolean; compact?: boolean }) {
```

Replace the section wrapper:

```tsx
<section className="rounded-2xl border border-line bg-white/72 p-2 shadow-panel">
```

with:

```tsx
<section className={`${compact ? 'rounded-xl shadow-sm' : 'rounded-2xl shadow-panel'} border border-line bg-white/72 p-2`}>
```

Leave button behavior unchanged.

- [ ] **Step 5: Replace desktop left Tab layout in `WorkspaceShell`**

Edit `src/components/WorkspaceShell.tsx`.

Remove these imports:

```tsx
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
```

Add this import:

```tsx
import { ChevronDown, ChevronRight, PackagePlus } from 'lucide-react';
```

Delete:

```tsx
type LeftTab = 'parts' | 'tools' | 'objects';
```

Delete the entire `LeftAccordion` function.

Inside `WorkspaceShell`, delete:

```tsx
const [leftTab, setLeftTab] = useState<LeftTab>('parts');
const [leftOpen, setLeftOpen] = useState(true);
const leftTabs: { id: LeftTab; label: string }[] = [
  { id: 'parts', label: t('drawer.title') },
  { id: 'tools', label: t('view.workflowTools') },
  { id: 'objects', label: t('view.objects') },
];
const activeLeftTitle = leftTabs.find((tab) => tab.id === leftTab)?.label ?? t('drawer.title');
```

Add:

```tsx
const [partsOpen, setPartsOpen] = useState(false);
const [toolsOpen, setToolsOpen] = useState(false);
```

Inside the desktop left `<aside>`, replace the current `<div className="flex h-full min-h-0 flex-col gap-2 p-3">` block that renders the three-way Tab bar and `LeftAccordion` with:

```tsx
<div className="flex h-full min-h-0 flex-col gap-2 p-3">
  <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {t('view.objects')}
      </p>
      <p className="text-[12px] font-medium text-ink-2">{t('view.sceneTree')}</p>
    </div>
    <button
      type="button"
      onClick={() => setPartsOpen((value) => !value)}
      aria-expanded={partsOpen}
      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <PackagePlus size={15} strokeWidth={1.9} />
      {t('view.addPart')}
    </button>
  </div>

  {partsOpen && (
    <div>
      <button
        type="button"
        onClick={() => setPartsOpen(false)}
        aria-expanded={partsOpen}
        className="mb-2 flex h-8 w-full cursor-pointer items-center justify-between rounded-lg px-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3 transition-colors hover:bg-slate-900/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {t('view.partsLibrary')}
        <ChevronDown size={14} />
      </button>
      <PartsDrawer docked showTitle={false} compact />
    </div>
  )}

  <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-white/72 p-2 shadow-sm">
    <SceneTreePanel docked onAddPart={() => setPartsOpen(true)} />
  </section>

  <div>
    <button
      type="button"
      onClick={() => setToolsOpen((value) => !value)}
      aria-expanded={toolsOpen}
      className="flex h-9 w-full cursor-pointer items-center justify-between rounded-xl border border-line bg-white/72 px-3 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3 shadow-sm transition-colors hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {t('view.sidebarTools')}
      {toolsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
    </button>
    {toolsOpen && (
      <div className="mt-2">
        <WorkflowTools showTitle={false} compact />
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 6: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected:

```text
exit code 0
```

- [ ] **Step 7: Run smoke test**

Run:

```bash
npx playwright test e2e/smoke.spec.ts
```

Expected:

```text
1 passed
```

Commit after this task:

```bash
git add src/components/WorkspaceShell.tsx src/components/PartsDrawer.tsx src/components/SceneTreePanel.tsx src/components/WorkflowTools.tsx
git commit -m "feat: make sidebar object-first"
```

---

### Task 3: Verify Visual Layout And Remove Regressions

**Files:**
- Modify: `e2e/smoke.spec.ts` only if Playwright role names need final adjustment
- Test: `src/i18n/resources.test.ts`
- Test: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes:
  - desktop app served by Vite
  - `WorkspaceShell` object-first sidebar from Task 2
- Produces:
  - verified desktop visual state
  - final passing checks

- [ ] **Step 1: Start a temporary preview server**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 5200
```

Expected:

```text
Local:   http://127.0.0.1:5200/
```

If port `5200` is occupied, Vite prints another port such as:

```text
Port 5200 is in use, trying another one
Local:   http://127.0.0.1:5201/
```

Use the printed URL for the next step.

- [ ] **Step 2: Capture a desktop screenshot**

Run this command, replacing the URL if Vite chose a different port:

```bash
node - <<'NODE'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5200/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/nexcad-object-first-sidebar.png', fullPage: true });
  await browser.close();
})();
NODE
```

Expected:

```text
exit code 0
```

- [ ] **Step 3: Manually inspect screenshot**

Open `/tmp/nexcad-object-first-sidebar.png` with the available image viewer.

Expected visual checks:

- Left column has no three-way Tab bar.
- Left column header says Objects / Scene objects.
- `Add Part` is visible in the left header.
- Objects panel is visible without switching modes.
- Parts library is hidden until `Add Part` is clicked.
- Tools accordion is below Objects.
- Viewport lower-left Project flow remains visible.
- Right properties panel remains unchanged.

- [ ] **Step 4: Run final checks**

Run:

```bash
npx tsc --noEmit
npx vitest run src/i18n/resources.test.ts
npx playwright test e2e/smoke.spec.ts
```

Expected:

```text
tsc exits 0
resources.test.ts passes
smoke.spec.ts passes
```

- [ ] **Step 5: Commit any final test or styling adjustments**

If Task 3 changed files, commit them:

```bash
git add e2e/smoke.spec.ts src/components/WorkspaceShell.tsx src/components/PartsDrawer.tsx src/components/SceneTreePanel.tsx src/components/WorkflowTools.tsx src/i18n/zh.json src/i18n/en.json
git commit -m "fix: polish object-first sidebar flow"
```

If Task 3 changed no files, do not create an empty commit.
