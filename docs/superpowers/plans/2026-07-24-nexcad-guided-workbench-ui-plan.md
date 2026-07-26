# NexCAD Guided Workbench UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing three-column NexCAD workspace into the approved Guided Workbench UI with a workflow-first Action Rail and clean right-top global controls.

**Architecture:** Keep the current `WorkspaceShell`, viewport, geometry, stores, and panel components. Add two small UI components: `ActionRail` for workflow guidance and `GlobalActions` for `Help / language / Settings / User`; wire them into the existing shell without adding dependencies.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Zustand stores, i18next/react-i18next, lucide-react.

## Global Constraints

- Main layout remains three columns: left workflow, center 3D viewport, right contextual properties.
- Visual tone is Clean Engineering: light theme, white/near-white panels, blue accent `#2563eb`, subtle borders/shadows.
- Right-top controls are global only: `Help`, language dropdown, Settings, User.
- Do not put modeling tools in the right-top global controls.
- Do not add a full account system, cloud sync, billing, dark mode, new UI framework, or new dependencies.
- Preserve `Viewport`, geometry worker, selection, autosave, export, project persistence, and existing toolbar behavior.
- Touch targets should stay at least 44px where practical.
- Existing dirty worktree may contain unrelated changes; do not revert unrelated files.

---

## File Structure

- Create `src/components/ActionRail.tsx`: workflow steps, active-step derivation from document nodes, and a reusable next-step label.
- Create `src/components/GlobalActions.tsx`: compact Help button, language `<select>`, Settings button, User button.
- Modify `src/components/WorkspaceShell.tsx`: place `ActionRail` above `SceneTreePanel`, replace `LanguageToggle` with `GlobalActions`, add viewport next-step hint.
- Modify `src/i18n/zh.json` and `src/i18n/en.json`: add labels for workflow and global controls.
- Test with existing TypeScript/i18n/unit/browser checks; no new test framework.

---

### Task 1: Add Workflow-First Action Rail

**Files:**
- Create: `src/components/ActionRail.tsx`
- Modify: `src/i18n/zh.json`
- Modify: `src/i18n/en.json`
- Test: `src/i18n/resources.test.ts`

**Interfaces:**
- Consumes: `useDocumentStore((s) => s.doc.nodes)` and `SceneNode[]`.
- Produces: `ActionRail` component and `getGuidedWorkbenchStep(nodes: SceneNode[]): GuidedWorkbenchStep`.

- [ ] **Step 1: Add i18n keys**

Modify `src/i18n/zh.json` under `"view"`:

```json
"workflow": "專案流程",
"workflowAddParts": "加入零件",
"workflowAddPartsHint": "從零件庫或工具列加入第一個物件",
"workflowArrange": "調整位置",
"workflowArrangeHint": "移動零件並檢查高度與邊距",
"workflowEnclosure": "產生外殼",
"workflowEnclosureHint": "選上蓋、螺絲柱和開孔參數",
"workflowCheck": "檢查孔位",
"workflowCheckHint": "確認螺絲柱、螺絲孔和零件沒有衝突",
"workflowExport": "匯出 STL",
"workflowExportHint": "最後檢查後下載列印檔",
"nextStep": "下一步：{{step}}",
"objects": "物件"
```

Modify `src/i18n/en.json` under `"view"`:

```json
"workflow": "Project flow",
"workflowAddParts": "Add parts",
"workflowAddPartsHint": "Add the first object from the parts library or toolbar",
"workflowArrange": "Arrange",
"workflowArrangeHint": "Move parts and check height and spacing",
"workflowEnclosure": "Generate enclosure",
"workflowEnclosureHint": "Choose lid, standoffs, and cutout settings",
"workflowCheck": "Check holes",
"workflowCheckHint": "Confirm standoffs, screw holes, and parts do not conflict",
"workflowExport": "Export STL",
"workflowExportHint": "Run a final check and download the print file",
"nextStep": "Next: {{step}}",
"objects": "Objects"
```

- [ ] **Step 2: Run i18n resource test**

Run:

```bash
npx vitest run src/i18n/resources.test.ts
```

Expected: FAIL if any key is missing or JSON syntax is invalid; otherwise PASS.

- [ ] **Step 3: Create `ActionRail.tsx`**

Create `src/components/ActionRail.tsx`:

```tsx
import { CheckCircle2, Circle, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/documentStore';
import type { SceneNode } from '../types/document';

export type GuidedWorkbenchStep = 'addParts' | 'arrange' | 'enclosure' | 'check' | 'export';

const STEP_KEYS: { id: GuidedWorkbenchStep; label: string; hint: string }[] = [
  { id: 'addParts', label: 'view.workflowAddParts', hint: 'view.workflowAddPartsHint' },
  { id: 'arrange', label: 'view.workflowArrange', hint: 'view.workflowArrangeHint' },
  { id: 'enclosure', label: 'view.workflowEnclosure', hint: 'view.workflowEnclosureHint' },
  { id: 'check', label: 'view.workflowCheck', hint: 'view.workflowCheckHint' },
  { id: 'export', label: 'view.workflowExport', hint: 'view.workflowExportHint' },
];

export function getGuidedWorkbenchStep(nodes: SceneNode[]): GuidedWorkbenchStep {
  if (nodes.length === 0) return 'addParts';
  if (!nodes.some((node) => node.type === 'enclosure')) return 'enclosure';
  return 'check';
}

export function ActionRail() {
  const { t } = useTranslation();
  const nodes = useDocumentStore((s) => s.doc.nodes);
  const activeStep = getGuidedWorkbenchStep(nodes);
  const activeIndex = STEP_KEYS.findIndex((step) => step.id === activeStep);

  return (
    <section className="rounded-2xl border border-line bg-white/72 p-3 shadow-panel">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Route size={16} strokeWidth={2} />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t('view.workflow')}
          </p>
          <p className="text-[12px] font-medium text-ink-2">
            {t('view.nextStep', { step: t(STEP_KEYS[activeIndex]?.label ?? STEP_KEYS[0].label) })}
          </p>
        </div>
      </div>
      <ol className="space-y-2">
        {STEP_KEYS.map((step, index) => {
          const active = step.id === activeStep;
          const done = index < activeIndex;
          const Icon = done ? CheckCircle2 : Circle;
          return (
            <li
              key={step.id}
              className={`rounded-xl border px-3 py-2 transition-colors ${
                active
                  ? 'border-accent/35 bg-accent-soft text-accent'
                  : 'border-line bg-white/75 text-ink-2'
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight">{index + 1}. {t(step.label)}</p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-3">{t(step.hint)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

---

### Task 2: Add Clean Right-Top Global Controls

**Files:**
- Create: `src/components/GlobalActions.tsx`
- Modify: `src/i18n/zh.json`
- Modify: `src/i18n/en.json`
- Test: `src/i18n/resources.test.ts`

**Interfaces:**
- Consumes: `useTranslation()` and `i18n.changeLanguage`.
- Produces: `GlobalActions` component.

- [ ] **Step 1: Add i18n keys**

Modify `src/i18n/zh.json` under `"view"`:

```json
"help": "說明",
"helpTitle": "說明與快捷鍵",
"helpHint": "提示：先加入零件，再調整位置，然後產生外殼。",
"settings": "設定",
"settingsTitle": "設定",
"settingsHint": "單位：mm｜格線：顯示｜預設匯出：STL",
"language": "語言",
"user": "使用者"
```

Modify `src/i18n/en.json` under `"view"`:

```json
"help": "Help",
"helpTitle": "Help & shortcuts",
"helpHint": "Tip: add parts first, arrange them, then generate the enclosure.",
"settings": "Settings",
"settingsTitle": "Settings",
"settingsHint": "Units: mm | Grid: visible | Default export: STL",
"language": "Language",
"user": "User"
```

- [ ] **Step 2: Create `GlobalActions.tsx`**

Create `src/components/GlobalActions.tsx`:

```tsx
import { HelpCircle, Settings, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const controlClass =
  'flex h-9 min-w-9 items-center justify-center rounded-full border border-line bg-white px-2.5 text-[12px] font-semibold text-ink-2 shadow-panel transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

export function GlobalActions() {
  const { t, i18n } = useTranslation();
  const [popover, setPopover] = useState<'help' | 'settings' | null>(null);
  const language = i18n.language === 'en' ? 'en' : 'zh';

  return (
    <div className="relative flex items-center justify-end gap-2">
      <button
        type="button"
        className={controlClass}
        aria-label={t('view.help')}
        onClick={() => setPopover((value) => (value === 'help' ? null : 'help'))}
      >
        <HelpCircle size={16} strokeWidth={1.9} />
      </button>
      <select
        className={`${controlClass} cursor-pointer appearance-none pr-6`}
        aria-label={t('view.language')}
        value={language}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        <option value="zh">繁中</option>
        <option value="en">EN</option>
      </select>
      <button
        type="button"
        className={controlClass}
        aria-label={t('view.settings')}
        onClick={() => setPopover((value) => (value === 'settings' ? null : 'settings'))}
      >
        <Settings size={16} strokeWidth={1.9} />
      </button>
      <button type="button" className={`${controlClass} bg-slate-800 text-white hover:text-white`} aria-label={t('view.user')}>
        <UserRound size={16} strokeWidth={1.9} />
      </button>
      {popover && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-line bg-white/95 p-3 text-left shadow-pop backdrop-blur-xl">
          <p className="text-[13px] font-semibold text-ink">
            {popover === 'help' ? t('view.helpTitle') : t('view.settingsTitle')}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
            {popover === 'help' ? t('view.helpHint') : t('view.settingsHint')}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run i18n resource test**

Run:

```bash
npx vitest run src/i18n/resources.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

---

### Task 3: Wire Guided Workbench Into WorkspaceShell

**Files:**
- Modify: `src/components/WorkspaceShell.tsx`
- Test: browser preview at local Vite URL

**Interfaces:**
- Consumes: `ActionRail`, `GlobalActions`, `getGuidedWorkbenchStep`.
- Produces: left workflow rail, simplified object list below it, viewport next-step hint, right-top global controls.

- [ ] **Step 1: Update imports**

Modify `src/components/WorkspaceShell.tsx` imports:

```tsx
import { useTranslation } from 'react-i18next';
import { ActionRail, getGuidedWorkbenchStep } from './ActionRail';
import { GlobalActions } from './GlobalActions';
import { PartsDrawer } from './PartsDrawer';
import { ProjectsPanel } from './ProjectsPanel';
import { PropertyCard } from './PropertyCard';
import { SceneTreePanel } from './SceneTreePanel';
import { ToastStack } from './ToastStack';
import { Toolbar } from './Toolbar';
import { ViewToggles } from './ViewToggles';
import { Viewport } from './Viewport';
import { useDocumentStore } from '../store/documentStore';
```

- [ ] **Step 2: Add translated next-step calculation inside `WorkspaceShell`**

At the top of `WorkspaceShell()` add:

```tsx
  const { t } = useTranslation();
  const nodes = useDocumentStore((s) => s.doc.nodes);
  const activeStep = getGuidedWorkbenchStep(nodes);
  const stepLabelKey = {
    addParts: 'view.workflowAddParts',
    arrange: 'view.workflowArrange',
    enclosure: 'view.workflowEnclosure',
    check: 'view.workflowCheck',
    export: 'view.workflowExport',
  }[activeStep];
```

- [ ] **Step 3: Replace desktop left column content**

In the desktop left `<aside>`, replace the current `ProjectsPanel` + full-height `SceneTreePanel` layout with:

```tsx
        <div className="border-b border-line p-3">
          <ProjectsPanel />
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <ActionRail />
          <section className="min-h-0 rounded-2xl border border-line bg-white/72 p-2 shadow-panel">
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {t('view.objects')}
            </div>
            <SceneTreePanel docked />
          </section>
        </div>
```

- [ ] **Step 4: Add viewport next-step hint**

Inside `<main className="relative...">`, after `<PartsDrawer />`, add:

```tsx
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-2xl border border-line bg-white/85 px-3 py-2 text-[12px] font-semibold text-ink-2 shadow-panel backdrop-blur-xl">
          {t('view.nextStep', { step: t(stepLabelKey) })}
        </div>
```

Then remove the old bottom-left `NexCAD` badge block to avoid duplicate bottom-left badges.

- [ ] **Step 5: Replace right column language-only header**

Replace:

```tsx
        <div className="flex items-center justify-end gap-2 border-b border-line p-3">
          <LanguageToggle />
        </div>
```

with:

```tsx
        <div className="flex items-center justify-end gap-2 border-b border-line p-3">
          <GlobalActions />
        </div>
```

- [ ] **Step 6: Replace mobile language-only control**

In the mobile right overlay, replace the `LanguageToggle` wrapper with:

```tsx
          <div className="pointer-events-auto">
            <GlobalActions />
          </div>
```

- [ ] **Step 7: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

---

### Task 4: Verify UX Acceptance Criteria

**Files:**
- No code files unless checks reveal defects.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: verified Guided Workbench UI.

- [ ] **Step 1: Run targeted i18n test**

Run:

```bash
npx vitest run src/i18n/resources.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 3: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Preview in browser**

Run Vite on an available port:

```bash
npm run dev -- --host 127.0.0.1
```

Expected:

- App loads without console-blocking errors.
- Desktop shows left Action Rail, center 3D viewport, right Context Panel.
- Right top shows `?`, language dropdown, Settings, User.
- Modeling tools remain in the toolbar, not in global controls.
- Empty state still gives a clear start prompt.
- Narrow viewport keeps controls usable without forcing three cramped columns.

- [ ] **Step 5: Optional Playwright smoke**

If the dev server is running, run the existing smoke flow:

```bash
npx playwright test
```

Expected: PASS. If Playwright is configured for another port, use the project’s existing preview command from `playwright.config.ts`.

---

## Self-Review

Spec coverage:

- Three-column layout: Task 3.
- Workflow-first Action Rail: Task 1 and Task 3.
- Center next-step prompt: Task 3.
- Right Context Panel preserved: Task 3.
- Clean right-top `Help / language / Settings / User`: Task 2 and Task 3.
- Clean Engineering visual tone: Task 1, Task 2, Task 3 use existing light panels and blue accent.
- No full account system or new dependencies: Global Constraints and Task 2 static user button.
- Responsive principle: Task 3 mobile replacement and Task 4 preview checks.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation steps.

Type consistency:

- `GuidedWorkbenchStep`, `getGuidedWorkbenchStep`, `ActionRail`, and `GlobalActions` are defined before use in `WorkspaceShell`.
