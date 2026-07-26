# Task 4 Report

- Status: DONE_WITH_CONCERNS
- Commit: a8e42fa (`feat: update CarConfigPanel to Phase 1 (electronics only)`)
- Test: `npx vitest run src/parts/presets.test.ts` passed, 1 file and 16 tests.
- Concern: `src/i18n/en.json` and `src/i18n/zh.json` had pre-existing dirty changes, so the required commit of those files includes them; unrelated files were not staged.

## Review Fix

- Status: DONE
- Evidence: the working tree had `Toolbar.tsx` wired to `CarConfigPanel`, but that change was not committed in the first Task 4 range.
- Fix: Restored `toolbar.smartCar2wd` and `toolbar.smartCar4wd` in `src/i18n/en.json` and `src/i18n/zh.json` for the `CAR_PRESETS` references. No unrelated locale cleanup was changed.
- Tests: `npx vitest run src/parts/presets.test.ts` passed (1 file, 16 tests); `npx tsc --noEmit` passed.

## Remaining Review Finding

- Status: DONE
- Fix: `src/components/Toolbar.tsx` now imports and renders `CarConfigPanel` for the smart car toolbar button instead of `CarPresetMenu`.
- Tests: `npx vitest run src/parts/presets.test.ts` passed (1 file, 16 tests); `npx tsc --noEmit` passed.

## Toolbar Overflow Review Fix

- Status: DONE
- Fix: Bounded the toolbar to the viewport width and enabled horizontal scrolling for narrow screens.
- Test: `npx tsc --noEmit`

## Locale Scope Review Fix

- Status: DONE
- Fix: Restored zh `view.xray` and `view.wireframe` labels to their prior localized values. Kept other added i18n keys because current committed UI references them.
- Tests: `npx tsc --noEmit` passed; `npx vitest run src/i18n/resources.test.ts src/parts/presets.test.ts` passed (18 tests).

## Unused Locale Key Review Fix

- Status: DONE
- Fix: Removed unused `property.selectHint`, `property.rotation`, `view.highRes`, `view.sceneTreeEmpty`, `view.welcomeTitle`, `view.welcomeHint`, `enclosure.noPartsHint`, and `enclosure.noPartsDetail` from both locale files.
- Tests: `npx tsc --noEmit` passed; `npx vitest run src/i18n/resources.test.ts src/parts/presets.test.ts` passed (18 tests).

## Final Locale Scope Fix

- Status: DONE
- Fix: Restored en `view.xray` to `Shell X-ray`; Task 4 locale diff now only adds the `car` section.
- Tests: `npx vitest run src/i18n/resources.test.ts` passed (2 tests).

## Guided Workbench Verification

- `npx vitest run src/i18n/resources.test.ts`: PASS, 1 file, 2 tests.
- `npx vitest run`: PASS, 35 files, 266 tests.
- `npx tsc --noEmit`: PASS, exit code 0.
- `npx playwright test`: PASS, 1 Chromium smoke test.

Playwright initially failed because `WorkspaceShell` mounted two `PropertyCard` instances, causing the `名稱` label locator to match two inputs. The responsive rail was adjusted to retain one property card; the desktop view-toggle overlay was moved below the toolbar to prevent pointer interception. Playwright passed after these small fixes.
