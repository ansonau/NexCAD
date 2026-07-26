# NexCAD Three-Column Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign NexCAD from floating panels into a stable three-column CAD workspace: left scene/project column, center 3D viewport, right contextual properties/tools column.

**Architecture:** Keep the existing CAD engine and panel components. Add a small workspace shell component that owns layout only, then make existing panels support fixed-column rendering with minimal props. Do not introduce new dependencies or a new design system.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Zustand stores, react-three-fiber viewport.

## Global Constraints

- Use current visual language: light canvas, navy/slate text, precision blue accent `#2563eb`.
- Preserve `Viewport` behavior, geometry worker calls, selection behavior, keyboard shortcuts, autosave, export, and project persistence.
- Desktop target: true 3-column workspace with left `260px`, center flexible viewport, right `320px`.
- Tablet/mobile target: do not force 3 columns; left/right panels become overlay drawers or stacked controls.
- No new package dependencies.
- No route/IA changes beyond rearranging existing panels.
- Keep all clickable controls as semantic `button`, `input`, or `select` with visible focus states.
- Existing dirty worktree may contain unrelated changes; do not revert unrelated files.

---

## Design Direction

`UI UX Pro Max` useful findings:
- Professional navy/blue works for engineering product UI.
- Keep contrast high and hover/focus states explicit.
- React accessibility basics matter: labels, semantic controls, dynamic states.

NexCAD-specific layout decision:
- Left column = structure: `ProjectsPanel`, always-visible `SceneTreePanel`, future part/library entry point.
- Center column = work surface: `Viewport`, `Toolbar`, `ViewToggles`, `PartsDrawer`, status badge.
- Right column = context: `LanguageToggle`, `PropertyCard`, later generated-tool panels if needed.

Design Taste note:
- Do not use landing-page flourishes. This is dense product UI, not a marketing page.
- Avoid generic glass cards everywhere; use flatter fixed sidebars and reserve shadows for overlays.

---

### Task 1: Add Workspace Shell Layout

**Files:**
- Create: `src/components/WorkspaceShell.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/WorkspaceShell.test.tsx` if the project already has a component test renderer; otherwise rely on TypeScript plus manual browser preview.

**Interfaces:**
- Consumes: existing components `Viewport`, `Toolbar`, `ProjectsPanel`, `SceneTreePanel`, `PropertyCard`, `LanguageToggle`, `ViewToggles`, `PartsDrawer`, `ToastStack`.
- Produces: `WorkspaceShell` React component used by `App`.

- [ ] **Step 1: Inspect current component test setup**

Run:
```bash
rg -n "@testing-library|render\(" src package.json
```

Expected:
- If Testing Library exists, add a minimal layout smoke test.
- If not, skip component test and use `npx tsc --noEmit` plus browser preview.

- [ ] **Step 2: Create `WorkspaceShell.tsx` with existing components arranged into three regions**

Create `src/components/WorkspaceShell.tsx`:
```tsx
import { LanguageToggle } from './LanguageToggle';
import { PartsDrawer } from './PartsDrawer';
import { ProjectsPanel } from './ProjectsPanel';
import { PropertyCard } from './PropertyCard';
import { SceneTreePanel } from './SceneTreePanel';
import { ToastStack } from './ToastStack';
import { Toolbar } from './Toolbar';
import { ViewToggles } from './ViewToggles';
import { Viewport } from './Viewport';

export function WorkspaceShell() {
  return (
    <div className="grid h-full w-full grid-cols-1 overflow-hidden bg-canvas text-ink lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <aside className="hidden min-w-0 border-r border-line bg-white/78 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="border-b border-line p-3">
          <ProjectsPanel />
        </div>
        <div className="min-h-0 flex-1 p-3">
          <SceneTreePanel docked />
        </div>
      </aside>

      <main className="relative min-h-0 min-w-0 overflow-hidden">
        <Viewport />
        <Toolbar />
        <div className="pointer-events-none absolute right-3 top-3 flex items-start gap-2">
          <div className="pointer-events-auto">
            <ViewToggles />
          </div>
        </div>
        <PartsDrawer />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-xl border border-line bg-white/80 py-1.5 pl-2 pr-2.5 shadow-panel backdrop-blur-xl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 12 20.5 7M12 12v9.5M12 12 3.5 7" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] font-semibold tracking-tight text-ink-2">NexCAD</span>
        </div>
      </main>

      <aside className="hidden min-w-0 border-l border-line bg-white/82 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center justify-end gap-2 border-b border-line p-3">
          <LanguageToggle />
        </div>
        <div className="min-h-0 flex-1 p-3">
          <PropertyCard docked />
        </div>
      </aside>

      <div className="lg:hidden">
        <div className="absolute left-3 top-3 z-30 flex flex-col items-start gap-2">
          <ProjectsPanel />
          <SceneTreePanel />
        </div>
        <div className="pointer-events-none absolute right-3 top-3 z-30 flex max-h-[calc(100%-1.5rem)] w-64 flex-col items-end gap-2">
          <div className="pointer-events-auto">
            <LanguageToggle />
          </div>
          <div className="pointer-events-auto">
            <ViewToggles />
          </div>
          <PropertyCard />
        </div>
      </div>

      <ToastStack />
    </div>
  );
}
```

- [ ] **Step 3: Update `App.tsx` to delegate layout**

Replace direct layout imports and return body with `WorkspaceShell`, keeping bootstrap logic and welcome overlay.

Expected `App.tsx` shape:
```tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkspaceShell } from './components/WorkspaceShell';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { listProjects, saveProject } from './persistence/db';
import { useDocumentStore } from './store/documentStore';
import { useProjectStore } from './store/projectStore';
import { emptyDocument, newId } from './types/document';

let bootstrapped = false;

export default function App() {
  useKeyboardShortcuts();
  useAutosave();
  const { t } = useTranslation();
  const nodeCount = useDocumentStore((s) => s.doc.nodes.length);

  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;
    void (async () => {
      if (useProjectStore.getState().projectId) return;
      const projects = await listProjects();
      if (projects.length > 0) {
        const latest = projects[0];
        useDocumentStore.setState({ doc: latest.doc, selection: [], past: [], future: [], dragBase: null });
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
    <div className="relative h-full w-full overflow-hidden bg-canvas text-ink">
      <WorkspaceShell />
      {nodeCount === 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-line bg-white/95 px-8 py-6 text-center shadow-pop backdrop-blur-xl animate-pop-in">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 12 20.5 7M12 12v9.5M12 12 3.5 7" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-semibold tracking-tight text-ink">{t('view.welcomeTitle')}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{t('view.welcomeHint')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run type check**

Run:
```bash
npx tsc --noEmit
```

Expected:
- Fails because `SceneTreePanel` and `PropertyCard` do not yet accept `docked`.

---

### Task 2: Make Scene Tree Work In Docked And Floating Modes

**Files:**
- Modify: `src/components/SceneTreePanel.tsx`

**Interfaces:**
- Consumes: `docked?: boolean` prop from `WorkspaceShell`.
- Produces: `SceneTreePanel({ docked })` where docked mode is always open and fills column height.

- [ ] **Step 1: Update component signature**

Change:
```tsx
export function SceneTreePanel() {
```

to:
```tsx
export function SceneTreePanel({ docked = false }: { docked?: boolean }) {
```

- [ ] **Step 2: Keep floating collapsed button only for non-docked mode**

Change:
```tsx
if (!open) {
```

to:
```tsx
if (!docked && !open) {
```

- [ ] **Step 3: Use fixed-column styling when docked**

Replace the return wrapper class with:
```tsx
<div className={docked ? 'flex h-full min-h-0 w-full flex-col' : `flex max-h-[60vh] w-60 animate-pop-in flex-col ${panelClass}`}>
```

- [ ] **Step 4: Hide collapse button when docked**

Replace header action:
```tsx
<IconButton title={t('view.sceneTree')} onClick={() => setOpen(false)} className="h-7 w-7">
  <ChevronUp size={15} />
</IconButton>
```

with:
```tsx
{!docked && (
  <IconButton title={t('view.sceneTree')} onClick={() => setOpen(false)} className="h-7 w-7">
    <ChevronUp size={15} />
  </IconButton>
)}
```

- [ ] **Step 5: Ensure scroll area fills docked column**

Change:
```tsx
<div className="overflow-y-auto p-1.5">
```

to:
```tsx
<div className="min-h-0 flex-1 overflow-y-auto p-1.5">
```

- [ ] **Step 6: Run type check**

Run:
```bash
npx tsc --noEmit
```

Expected:
- Still fails until `PropertyCard` supports `docked`.

---

### Task 3: Make Property Card Work In Docked And Floating Modes

**Files:**
- Modify: `src/components/PropertyCard.tsx`

**Interfaces:**
- Consumes: `docked?: boolean` prop from `WorkspaceShell`.
- Produces: `PropertyCard({ docked })` where docked mode fills the right column and uses no floating panel wrapper.

- [ ] **Step 1: Update component signature**

Change:
```tsx
export function PropertyCard() {
```

to:
```tsx
export function PropertyCard({ docked = false }: { docked?: boolean }) {
```

- [ ] **Step 2: Compute wrapper classes**

Before `return`, add:
```tsx
const wrapperClass = docked
  ? 'pointer-events-auto h-full w-full overflow-y-auto rounded-2xl border border-line bg-white/72 p-3.5'
  : `pointer-events-auto max-h-full w-full animate-pop-in overflow-y-auto p-3.5 ${panelClass}`;
```

- [ ] **Step 3: Use wrapper classes**

Change:
```tsx
<div className={`pointer-events-auto max-h-full w-full animate-pop-in overflow-y-auto p-3.5 ${panelClass}`}>
```

to:
```tsx
<div className={wrapperClass}>
```

- [ ] **Step 4: Run type check**

Run:
```bash
npx tsc --noEmit
```

Expected: PASS.

---

### Task 4: Verify Desktop And Mobile Layout Behavior

**Files:**
- Modify only if verification finds a concrete bug: `src/components/WorkspaceShell.tsx`, `src/App.tsx`, `src/components/SceneTreePanel.tsx`, `src/components/PropertyCard.tsx`

**Interfaces:**
- Consumes: working layout from Tasks 1-3.
- Produces: confirmed responsive behavior.

- [ ] **Step 1: Run app**

Run:
```bash
npm run dev -- --host 127.0.0.1
```

Expected:
- Vite starts on an available port.
- If port `5173` is occupied by another app, use the printed Vite port, not `5173`.

- [ ] **Step 2: Desktop preview**

Open the app at the Vite URL.

Expected at width `>= 1024px`:
- Left column is fixed and visible.
- Center viewport fills remaining space.
- Right column is fixed and visible.
- Toolbar remains centered over viewport, not entire browser.
- View cube remains in viewport.
- Parts drawer opens at bottom of viewport.
- Welcome empty state remains centered over app.

- [ ] **Step 3: Mobile preview**

Resize to `390px` width.

Expected:
- App reverts to existing overlay behavior.
- No forced side columns.
- No horizontal page scroll.
- Floating scene tree and property card remain usable.

- [ ] **Step 4: Fix only concrete layout bugs**

If toolbar is centered against the full page instead of viewport, change `Toolbar` only if needed by adding a prop:
```tsx
export function Toolbar({ viewportScoped = false }: { viewportScoped?: boolean }) {
```

Then keep existing class unless `viewportScoped` is true:
```tsx
className={`${viewportScoped ? 'left-1/2' : 'left-1/2'} ...`}
```

Prefer not to do this unless visual verification proves a bug. The toolbar inside `main.relative` should already scope correctly.

---

### Task 5: Final Verification

**Files:**
- No planned edits.

**Interfaces:**
- Consumes: completed UI changes.
- Produces: verified 3-column workspace.

- [ ] **Step 1: Run targeted tests**

Run:
```bash
npx tsc --noEmit
npx vitest run src/components/PropertyCard.test.tsx src/store/documentStore.test.ts src/geometry/evaluate.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full tests if time allows**

Run:
```bash
npx vitest run
```

Expected: PASS or only unrelated pre-existing failures. If unrelated failures exist, record exact failing test names.

- [ ] **Step 3: Manual smoke test**

In browser:
- Add a part from Parts Drawer.
- Select it in viewport.
- Confirm right property column updates.
- Toggle scene item visibility from left column.
- Open enclosure panel from toolbar and generate an enclosure.
- Select generated enclosure and confirm right column shows regenerate/params.

Expected:
- No lost functionality from current app.

---

## Self-Review

Spec coverage:
- 3-column layout: Tasks 1-4.
- Preserve CAD behavior: Tasks 1, 4, 5.
- Responsive fallback: Task 4.
- No new dependencies: Global Constraints.
- Professional UI direction: Design Direction and Task 1 shell classes.

Placeholder scan:
- No TBD/TODO/fill-later items.
- Optional fixes are bounded to concrete verification failures.

Type consistency:
- `SceneTreePanel({ docked?: boolean })` and `PropertyCard({ docked?: boolean })` match `WorkspaceShell` usage.
