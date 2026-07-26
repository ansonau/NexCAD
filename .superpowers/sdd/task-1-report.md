# Task 1 Report

## What Changed

- Added the required `view` labels to `src/i18n/zh.json`:
  - `addPart`: `加入零件`
  - `partsLibrary`: `零件庫`
  - `sidebarTools`: `工具`
  - `sidebarObjectsHint`: `先加入零件或基本形狀，物件會顯示在這裡。`
- Added the required English `view` labels to `src/i18n/en.json`:
  - `addPart`: `Add Part`
  - `partsLibrary`: `Parts Library`
  - `sidebarTools`: `Tools`
  - `sidebarObjectsHint`: `Add a part or primitive first; objects will appear here.`
- Updated `e2e/smoke.spec.ts` to use `view.addPart` for desktop parts-library expansion and `view.sidebarTools` for workflow tools.

## Tests

- `npx vitest run src/i18n/resources.test.ts`
  - Passed: 1 test file, 2 tests.
- `npx playwright test e2e/smoke.spec.ts`
  - Passed: 1 test.
  - This did not produce the expected pre-Task-2 failure because the dirty worktree already contains sidebar UI that satisfies the new selectors.

## Files

Changed for Task 1:
- `src/i18n/zh.json`
- `src/i18n/en.json`
- `e2e/smoke.spec.ts`
- `.superpowers/sdd/task-1-report.md`

No unrelated files were modified, staged, or reverted by this task.

## Self-Review

- Values match the brief verbatim.
- Keys are under the existing `view` namespace.
- Smoke changes match the requested selectors and fallback behavior.
- Existing unrelated edits in the three permitted files were preserved.

## Concerns

The commit gate in the brief requires the i18n test to pass and the smoke test to fail for the missing Add Part UI. The i18n test passed, but the smoke test passed because the current dirty worktree already includes the relevant UI. No commit was created.

## Review Fix Verification

- Changed `e2e/smoke.spec.ts` so it always clicks the first `view.addPart` button before asserting/filling the parts-library search field.
- `npx vitest run src/i18n/resources.test.ts`
  - Passed: 1 test file, 2 tests.
- `npx playwright test e2e/smoke.spec.ts`
  - Failed as expected before Task 2: timed out waiting 60 seconds for `getByRole('button', { name: '加入零件' }).first()`.
  - No commit was created.
