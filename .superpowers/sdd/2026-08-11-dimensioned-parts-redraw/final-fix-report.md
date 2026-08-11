# Dimensioned Parts Final Fix Report

Date: 2026-08-12
Base HEAD: `ed6e27a034d10c3c231d470db1ef7087c45c9647`
Repair commit: the commit containing this report. Its exact SHA is reported in the task completion response because a Git commit cannot embed its own hash.

## Drawing Interpretation

- OLED 1.3: `30.40 mm` is the horizontal mounting-hole center span; `29.42 mm` is the active display width. The hole centers are therefore `x = +/-15.20 mm`, with the drawing's `28.50 mm` vertical span giving `y = +/-14.25 mm`.
- OLED 1.3: the active area's top edge is `7.35 mm` below the `33.50 mm` PCB top. With the header at positive Y, its center is `16.75 - 7.35 - 14.70 / 2 = +2.05 mm`.
- Mega 2560: the drawing shows USB-B but does not dimension its envelope. The existing procedural contract is retained: center `[-43.3, 15.5, 0]`, size `[16, 12, 11]`. The SCAD was corrected from 14 mm to 16 mm width, producing an absolute STL minimum X of `-51.3 mm`.

## Exact Contract Changes

- `oled-13.mountingHoles`: `x = +/-15.20`, `y = +/-14.25`, diameter `3.0 mm`.
- `oled-13` display block: position `[0, 2.05, 0]`, size `[29.42, 14.70, 1.6]`.
- `oled-13` top display port: `x = 0`, `z = 2.05`, `w = 29.42`, `h = 14.70`.
- OLED SCAD uses the same hole coordinates and active-area center; its binary STL was regenerated.
- Mega SCAD USB-B envelope now matches `library.ts` at `16 x 12 x 11 mm`; its binary STL was regenerated.
- Shared binary STL tests now assert absolute minimum and maximum vectors for all six assets, including `minZ = 0`, instead of checking extents only.
- TT Motor README now references `highResAssets.test.js`.

## Verification

All commands used Node `v22.22.3` via `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` and OpenSCAD `2021.01`.

| Check | Result |
| --- | --- |
| Focused red test | OLED failed at `x = +/-14.71`; after that correction it failed at port `z = -3`, confirming both regressions. |
| Focused asset red test | Mega STL failed at minimum X `-50.8` versus `-51.3` before regeneration. |
| OpenSCAD OLED export | Passed; simple 3D binary STL generated. |
| OpenSCAD Mega export | Passed; simple 3D binary STL generated. |
| Focused Vitest | Passed: 4 files, 21 tests. |
| `npx tsc --noEmit` | Passed. |
| `npx vitest run` | Passed: 38 files, 291 tests. |
| `npm run build` | Passed. |
| `git diff --check` | Passed before report creation and rechecked before commit. |

## Changed Files

- `docs/superpowers/specs/2026-08-11-dimensioned-parts-redraw-design.md`
- `docs/superpowers/plans/2026-08-11-dimensioned-parts-redraw.md`
- `public/parts/oled-13/README.md`
- `public/parts/oled-13/oled-13.scad`
- `public/parts/oled-13/oled-13.stl`
- `public/parts/arduino-mega-2560/README.md`
- `public/parts/arduino-mega-2560/arduino-mega-2560.scad`
- `public/parts/arduino-mega-2560/arduino-mega-2560.stl`
- `public/parts/tt-motor/README.md`
- `src/parts/library.ts`
- `src/parts/dimensionedParts.test.ts`
- `src/parts/highResAssets.test.js`
- `.superpowers/sdd/2026-08-11-dimensioned-parts-redraw/final-fix-report.md`

## Concerns

- Mega's USB-B envelope remains an explicit inference because the supplied drawing does not dimension the connector. It now consistently uses the pre-existing procedural contract in both representations.
- Vite still reports its existing browser-externalization and large-chunk advisories; neither is caused by these geometry changes.
