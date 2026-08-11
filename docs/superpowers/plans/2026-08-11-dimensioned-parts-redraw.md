# Dimensioned Parts Redraw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redraw four existing NexCAD parts and add Arduino Mega 2560 plus OLED 1.3 using the supplied dimension drawings, with matching procedural collision geometry and binary STL high-resolution assets.

**Architecture:** Keep NexCAD's existing two-layer model: `src/parts/library.ts` remains the collision/enclosure source of truth while self-contained OpenSCAD files generate visual STL assets selected through `HIGH_RES_MODELS`. A single table-driven STL test validates binary structure and bounds for every high-resolution model; each part task extends that table only after generating its asset.

**Tech Stack:** TypeScript, Vitest, OpenSCAD 2021.01, Three.js `STLLoader`, existing Manifold geometry kernel.

## Global Constraints

- Units are millimeters; origin is the PCB or main-body bottom center, XY is the footprint plane, and positive Z is height.
- Dimension drawings in `3d_models/` override existing approximations; unspecified heights use current values or common module dimensions.
- Do not add dependencies, change the STL loader, create a shared OpenSCAD framework, or model traces, silkscreen, solder joints, or internal electronics.
- Generate binary STL with `openscad --export-format binstl`; never commit a partial or ASCII STL.
- High-resolution assets are visual only. Collision, enclosure generation, holes, and export continue to use `library.ts`.
- Preserve unrelated dirty work. Stage only files listed by the current task; do not stage `.superpowers/cad/`, `3d_models/high_res/tt-motor.glb`, or unrelated manual-measure/UI changes.
- Use the dimension images at repository-root `3d_models/` as source-controlled references; runtime must not load them.

---

### Task 1: Arduino Nano 3.0

**Files:**
- Create: `src/parts/dimensionedParts.test.ts`
- Create: `src/parts/highResAssets.test.js`
- Delete: `src/parts/ttMotorAsset.test.js`
- Modify: `src/parts/library.ts`
- Modify: `src/parts/highResModels.ts`
- Modify: `public/parts/arduino-nano/arduino-nano.scad`
- Create: `public/parts/arduino-nano/arduino-nano.stl`
- Modify: `public/parts/arduino-nano/README.md`
- Add reference: `3d_models/arduino-nano-3.0-dimension.jpeg`

**Interfaces:**
- Consumes: `getPartDefinition(id: string): PartDefinition | undefined`; `HIGH_RES_MODELS: Record<string, HighResModel>`.
- Produces: table-driven `readBinaryStlBounds(partId: string)` inside `highResAssets.test.js`; later tasks append cases to the same test table.

- [ ] **Step 1: Write failing Nano dimension tests**

Create `dimensionedParts.test.ts` with explicit drawing contracts:

```ts
import { describe, expect, it } from 'vitest';
import { getPartDefinition } from './library';

describe('dimension-drawing parts', () => {
  it('Arduino Nano follows the 3.0 drawing', () => {
    const part = getPartDefinition('arduino-nano')!;
    expect(part.body.size).toEqual([43.18, 17.77, 1.6]);
    expect(part.mountingHoles).toHaveLength(4);
    expect(part.mountingHoles.every((hole) => hole.diameter === 1.65)).toBe(true);
    const xs = part.mountingHoles.map((hole) => hole.x);
    const ys = part.mountingHoles.map((hole) => hole.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(40.64, 2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(15.24, 2);
    expect(part.clearanceHeight).toBeGreaterThanOrEqual(10.1);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run src/parts/dimensionedParts.test.ts`

Expected: FAIL because the old body is `43.2 × 18` and holes are `Ø1.8`.

- [ ] **Step 3: Update Nano procedural geometry**

Set `body.size` to `[43.18, 17.77, 1.6]`, holes to `x = ±20.32`, `y = ±7.62`, `diameter = 1.65`, and keep `clearanceHeight = 10.1`. Keep the USB and two header blocks inside the drawing footprint.

- [ ] **Step 4: Run the procedural test and verify GREEN**

Run: `npx vitest run src/parts/dimensionedParts.test.ts src/parts/library.test.ts`

Expected: PASS.

- [ ] **Step 5: Replace the Nano OpenSCAD baseline**

Use named drawing parameters and actual drilled holes:

```scad
pcb = [43.18, 17.77, 1.6];
hole_d = 1.65;
hole_dx = 40.64;
hole_dy = 15.24;

difference() {
  linear_extrude(pcb[2]) square([pcb[0], pcb[1]], center = true);
  for (x = [-hole_dx / 2, hole_dx / 2])
    for (y = [-hole_dy / 2, hole_dy / 2])
      translate([x, y, -0.1]) cylinder(d = hole_d, h = pcb[2] + 0.2, $fn = 32);
}
```

Add simplified USB, two header strips, main MCU, and pin rows without exceeding `Z = 10.1`.

- [ ] **Step 6: Generalize the STL test and verify RED**

Rename `ttMotorAsset.test.js` to `highResAssets.test.js`, retain the existing binary parser, and use this case table:

```js
const assets = [
  ['tt-motor', [69.9, 37, 22.4]],
  ['arduino-nano', [43.18, 17.77, 10.1]],
];
```

For every vertex assert `Number.isFinite(value)`, then assert each bound with `toBeCloseTo(expected, 1)`. Add Nano to `HIGH_RES_MODELS`:

```ts
'arduino-nano': { url: '/parts/arduino-nano/arduino-nano.stl', originOffset: [0, 0, 0] },
```

Run: `npx vitest run src/parts/highResAssets.test.js src/parts/assets.test.ts`

Expected: FAIL because `arduino-nano.stl` does not exist yet.

- [ ] **Step 7: Generate the binary STL and verify GREEN**

Run:

```bash
openscad --export-format binstl \
  -o public/parts/arduino-nano/arduino-nano.stl \
  public/parts/arduino-nano/arduino-nano.scad
```

Expected: OpenSCAD exits 0 and reports a simple 3D object.

Run: `npx vitest run src/parts/highResAssets.test.js src/parts/assets.test.ts`

Expected: PASS.

- [ ] **Step 8: Update README and commit**

Document drawing path, origin, `43.18 × 17.77 mm`, inferred heights, and binary generation command.

```bash
git add 3d_models/arduino-nano-3.0-dimension.jpeg \
  src/parts/dimensionedParts.test.ts src/parts/highResAssets.test.js \
  src/parts/ttMotorAsset.test.js src/parts/library.ts src/parts/highResModels.ts \
  public/parts/arduino-nano
git commit -m "feat: redraw Arduino Nano from dimensions"
```

### Task 2: Arduino Mega 2560 R3

**Files:**
- Create: `public/parts/arduino-mega-2560/arduino-mega-2560.scad`
- Create: `public/parts/arduino-mega-2560/arduino-mega-2560.stl`
- Create: `public/parts/arduino-mega-2560/README.md`
- Modify: `src/parts/library.ts`
- Modify: `src/parts/library.test.ts`
- Modify: `src/parts/dimensionedParts.test.ts`
- Modify: `src/parts/highResModels.ts`
- Modify: `src/parts/highResAssets.test.js`
- Add reference: `3d_models/arduino-mega-2560-r3-dimension.jpeg`

**Interfaces:**
- Consumes: the PartDefinition schema and STL table from Task 1.
- Produces: part ID `arduino-mega-2560`, category `board`, high-res URL `/parts/arduino-mega-2560/arduino-mega-2560.stl`.

- [ ] **Step 1: Write failing library and drawing tests**

Append:

```ts
it('Arduino Mega 2560 follows the board drawing', () => {
  const part = getPartDefinition('arduino-mega-2560')!;
  expect(part.category).toBe('board');
  expect(part.body.size).toEqual([101.6, 53.35, 1.6]);
  expect(part.mountingHoles).toHaveLength(6);
  expect(part.mountingHoles.every((hole) => hole.diameter === 3.2)).toBe(true);
  expect(part.clearanceHeight).toBeGreaterThanOrEqual(12.6);
});
```

Update `library.test.ts` expectations to 27 total parts and 7 boards.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/parts/dimensionedParts.test.ts src/parts/library.test.ts`

Expected: FAIL because `arduino-mega-2560` does not exist and count remains 26.

- [ ] **Step 3: Add the procedural definition**

Add the board with six common R3 mounting points relative to board center:

```ts
mountingHoles: [
  { x: -36.8, y: -24.18, diameter: 3.2 },
  { x: -36.8, y: 24.13, diameter: 3.2 },
  { x: 15.2, y: -19.08, diameter: 3.2 },
  { x: 15.2, y: 8.93, diameter: 3.2 },
  { x: 45.7, y: -24.18, diameter: 3.2 },
  { x: 39.4, y: 24.13, diameter: 3.2 },
],
```

Use blocks for USB-B, DC jack, and header envelopes; set `clearanceHeight: 12.6`.

- [ ] **Step 4: Verify procedural GREEN**

Run: `npx vitest run src/parts/dimensionedParts.test.ts src/parts/library.test.ts src/parts/assets.test.ts`

Expected: `assets.test.ts` fails until the new source and README are created; other assertions pass.

- [ ] **Step 5: Create OpenSCAD, README, and STL**

Use `pcb = [101.6, 53.35, 1.6]`, subtract the six holes above, and add simplified USB-B, DC jack, header banks, and main chip. Keep total Z at `12.6`.

Run:

```bash
openscad --export-format binstl \
  -o public/parts/arduino-mega-2560/arduino-mega-2560.stl \
  public/parts/arduino-mega-2560/arduino-mega-2560.scad
```

- [ ] **Step 6: Add high-res mapping and STL case**

Append `['arduino-mega-2560', [101.6, 53.35, 12.6]]` to the asset table and add the matching URL to `HIGH_RES_MODELS`.

Run: `npx vitest run src/parts/dimensionedParts.test.ts src/parts/library.test.ts src/parts/assets.test.ts src/parts/highResAssets.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add 3d_models/arduino-mega-2560-r3-dimension.jpeg \
  public/parts/arduino-mega-2560 src/parts/library.ts src/parts/library.test.ts \
  src/parts/dimensionedParts.test.ts src/parts/highResModels.ts src/parts/highResAssets.test.js
git commit -m "feat: add dimensioned Arduino Mega 2560"
```

### Task 3: OLED 0.96

**Files:**
- Modify: `public/parts/oled-096/oled-096.scad`
- Create: `public/parts/oled-096/oled-096.stl`
- Modify: `public/parts/oled-096/README.md`
- Modify: `src/parts/library.ts`
- Modify: `src/parts/dimensionedParts.test.ts`
- Modify: `src/parts/highResModels.ts`
- Modify: `src/parts/highResAssets.test.js`
- Add reference: `3d_models/monochrome-0.96-oled-graphic-display-with-i2c-dimension.jpeg`

**Interfaces:**
- Consumes: existing `oled-096` ID and high-res asset table.
- Produces: corrected circular planning-hole centers and capsule-shaped visual slots.

- [ ] **Step 1: Add failing dimensions test**

```ts
it('OLED 0.96 follows the module drawing', () => {
  const part = getPartDefinition('oled-096')!;
  expect(part.body.size).toEqual([27.3, 27.3, 1.2]);
  expect(part.mountingHoles).toHaveLength(4);
  const xs = part.mountingHoles.map((hole) => hole.x);
  expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(20.7, 2);
  expect(part.mountingHoles.every((hole) => hole.diameter === 2)).toBe(true);
  expect(part.clearanceHeight).toBeGreaterThanOrEqual(11);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/parts/dimensionedParts.test.ts`

Expected: FAIL for old `27 × 27.5` dimensions and `4.2` clearance.

- [ ] **Step 3: Update procedural geometry**

Use body `[27.3, 27.3, 1.2]`, hole centers `x = ±10.35`, `y = ±11.65`, planning diameter `2`, display block `23.3 × 19 × 1.6`, header envelope reaching `Z = 11`, and `clearanceHeight = 11`.

- [ ] **Step 4: Draw actual capsule slots in OpenSCAD**

Use a reusable local module:

```scad
module slot(length, diameter, height) {
  hull()
    for (x = [-length / 2 + diameter / 2, length / 2 - diameter / 2])
      translate([x, 0, 0]) cylinder(d = diameter, h = height, $fn = 32);
}
```

Subtract four `3.5 × 2.0 mm` slots, then add display and four-pin header within `Z = 11`.

- [ ] **Step 5: Generate, map, and test STL**

```bash
openscad --export-format binstl -o public/parts/oled-096/oled-096.stl public/parts/oled-096/oled-096.scad
```

Append `['oled-096', [27.3, 27.3, 11]]` and `/parts/oled-096/oled-096.stl` to the shared tables.

Run: `npx vitest run src/parts/dimensionedParts.test.ts src/parts/assets.test.ts src/parts/highResAssets.test.js`

Expected: PASS.

- [ ] **Step 6: Update README and commit**

```bash
git add 3d_models/monochrome-0.96-oled-graphic-display-with-i2c-dimension.jpeg \
  public/parts/oled-096 src/parts/library.ts src/parts/dimensionedParts.test.ts \
  src/parts/highResModels.ts src/parts/highResAssets.test.js
git commit -m "feat: redraw OLED 0.96 from dimensions"
```

### Task 4: OLED 1.3

**Files:**
- Create: `public/parts/oled-13/oled-13.scad`
- Create: `public/parts/oled-13/oled-13.stl`
- Create: `public/parts/oled-13/README.md`
- Modify: `src/parts/library.ts`
- Modify: `src/parts/library.test.ts`
- Modify: `src/parts/dimensionedParts.test.ts`
- Modify: `src/parts/highResModels.ts`
- Modify: `src/parts/highResAssets.test.js`
- Add reference: `3d_models/monochrome-1.3-oled-graphic-display-with-i2c-dimension.jpeg`

**Interfaces:**
- Produces: part ID `oled-13`, category `sensor`, high-res URL `/parts/oled-13/oled-13.stl`.

- [ ] **Step 1: Write failing library and dimension tests**

```ts
it('OLED 1.3 follows the module drawing', () => {
  const part = getPartDefinition('oled-13')!;
  expect(part.category).toBe('sensor');
  expect(part.body.size).toEqual([35.4, 33.5, 1.2]);
  expect(part.mountingHoles).toHaveLength(4);
  expect(part.mountingHoles.every((hole) => hole.diameter === 3)).toBe(true);
  const xs = part.mountingHoles.map((hole) => hole.x);
  const ys = part.mountingHoles.map((hole) => hole.y);
  expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(29.42, 2);
  expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(28.5, 2);
  expect(part.clearanceHeight).toBeGreaterThanOrEqual(11.3);
});
```

Update library totals to 28 parts and 6 sensors.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/parts/dimensionedParts.test.ts src/parts/library.test.ts`

Expected: FAIL because `oled-13` is absent and totals remain 27/5.

- [ ] **Step 3: Add procedural definition**

Use body `[35.4, 33.5, 1.2]`, holes at `x = ±14.71`, `y = ±14.25`, `Ø3`, display block `29.42 × 14.7`, header block reaching `11.3`, and `clearanceHeight = 11.3`.

- [ ] **Step 4: Create OpenSCAD and binary STL**

Use the same numeric contract directly in a self-contained file; subtract four circular holes and add the display plus header.

```bash
openscad --export-format binstl -o public/parts/oled-13/oled-13.stl public/parts/oled-13/oled-13.scad
```

- [ ] **Step 5: Add mapping, README, and asset case**

Append `['oled-13', [35.4, 33.5, 11.3]]` and `/parts/oled-13/oled-13.stl`.

Run: `npx vitest run src/parts/dimensionedParts.test.ts src/parts/library.test.ts src/parts/assets.test.ts src/parts/highResAssets.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 3d_models/monochrome-1.3-oled-graphic-display-with-i2c-dimension.jpeg \
  public/parts/oled-13 src/parts/library.ts src/parts/library.test.ts \
  src/parts/dimensionedParts.test.ts src/parts/highResModels.ts src/parts/highResAssets.test.js
git commit -m "feat: add dimensioned OLED 1.3"
```

### Task 5: HC-SR04

**Files:**
- Modify: `public/parts/hc-sr04/hc-sr04.scad`
- Create: `public/parts/hc-sr04/hc-sr04.stl`
- Modify: `public/parts/hc-sr04/README.md`
- Modify: `src/parts/library.ts`
- Modify: `src/parts/dimensionedParts.test.ts`
- Modify: `src/parts/highResModels.ts`
- Modify: `src/parts/highResAssets.test.js`
- Add reference: `3d_models/ultrasonic-ranging-sensor-hc-sr04-dimension.jpeg`

**Interfaces:**
- Consumes: existing `hc-sr04` ID.
- Produces: two diagonal mounting holes and a `45 × 20 × 13.5 mm` visual envelope.

- [ ] **Step 1: Write failing HC-SR04 test**

```ts
it('HC-SR04 follows the sensor drawing', () => {
  const part = getPartDefinition('hc-sr04')!;
  expect(part.body.size).toEqual([45, 20, 1.5]);
  expect(part.mountingHoles).toEqual([
    { x: -21, y: -8.25, diameter: 2 },
    { x: 21, y: 8.25, diameter: 2 },
  ]);
  const cans = part.body.blocks.filter((block) => block.label?.includes('換能器'));
  expect(cans.map((block) => block.position[0])).toEqual([-13, 13]);
  expect(cans.every((block) => block.size[0] === 16 && block.size[2] === 12)).toBe(true);
  expect(part.clearanceHeight).toBeGreaterThanOrEqual(13.5);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/parts/dimensionedParts.test.ts`

Expected: FAIL because the old definition has four `Ø1.8` holes and `1.2 mm` PCB.

- [ ] **Step 3: Update procedural geometry**

Set PCB thickness `1.5`, retain transducer centers `±13`, set cans `Ø16 × 12`, use only the two drawing holes, and set `clearanceHeight = 13.5`.

- [ ] **Step 4: Redraw OpenSCAD**

Subtract the two diagonal `Ø2` holes. Add two `Ø16 × 12` cans centered at `x = ±13`, four-pin header at 2.54 mm pitch, and one simplified crystal. Keep the origin at PCB bottom center.

- [ ] **Step 5: Generate, map, and verify**

```bash
openscad --export-format binstl -o public/parts/hc-sr04/hc-sr04.stl public/parts/hc-sr04/hc-sr04.scad
```

Append `['hc-sr04', [45, 20, 13.5]]` and `/parts/hc-sr04/hc-sr04.stl`.

Run: `npx vitest run src/parts/dimensionedParts.test.ts src/parts/assets.test.ts src/parts/highResAssets.test.js`

Expected: PASS.

- [ ] **Step 6: Update README and commit**

```bash
git add 3d_models/ultrasonic-ranging-sensor-hc-sr04-dimension.jpeg \
  public/parts/hc-sr04 src/parts/library.ts src/parts/dimensionedParts.test.ts \
  src/parts/highResModels.ts src/parts/highResAssets.test.js
git commit -m "feat: redraw HC-SR04 from dimensions"
```

### Task 6: TT Motor Revalidation

**Files:**
- Modify only if required: `public/parts/tt-motor/tt-motor.scad`
- Regenerate: `public/parts/tt-motor/tt-motor.stl`
- Modify: `public/parts/tt-motor/README.md`
- Verify: `src/parts/ttMotor.test.ts`
- Verify: `src/parts/highResAssets.test.js`
- Add reference: `3d_models/tt-motor-dimension.jpeg`

**Interfaces:**
- Preserves: `tt-motor` origin, bounds near `[69.9, 37, 22.4]`, shaft center `[7.22, 0, 11.2]`, and empty `mountingHoles`.

- [ ] **Step 1: Run the existing contract before editing**

Run: `npx vitest run src/parts/ttMotor.test.ts src/parts/highResAssets.test.js`

Expected: PASS. If it fails, change only the SCAD parameter responsible for the reported dimension.

- [ ] **Step 2: Point documentation at the canonical root drawing**

Update comments and README from `3d_models/high_res/tt-motor-dimension.jpeg` to `3d_models/tt-motor-dimension.jpeg`. Do not add the 167 MB GLB to runtime or this commit.

- [ ] **Step 3: Regenerate the binary STL from unchanged or minimally repaired source**

```bash
openscad --export-format binstl -o public/parts/tt-motor/tt-motor.stl public/parts/tt-motor/tt-motor.scad
```

- [ ] **Step 4: Verify the contract again**

Run: `npx vitest run src/parts/ttMotor.test.ts src/parts/highResAssets.test.js`

Expected: PASS with the same bounds and shaft contract.

- [ ] **Step 5: Commit**

```bash
git add 3d_models/tt-motor-dimension.jpeg public/parts/tt-motor
git commit -m "docs: align TT motor with canonical drawing"
```

### Task 7: Integration and Visual Validation

**Files:**
- Verify: `src/parts/library.ts`
- Verify: `src/parts/highResModels.ts`
- Verify: `src/parts/dimensionedParts.test.ts`
- Verify: `src/parts/highResAssets.test.js`
- Modify only for discovered contract defects: the responsible part's `.scad`, README, or `library.ts` entry.

**Interfaces:**
- Consumes: all six completed part definitions and STL mappings.
- Produces: a buildable app where all six parts render in procedural and high-resolution modes.

- [ ] **Step 1: Run all static and unit verification**

Run:

```bash
npx tsc --noEmit
npx vitest run
npm run build
git diff --check
```

Expected: all commands exit 0; library totals are 28, asset tests cover all six target IDs, and no whitespace errors exist.

- [ ] **Step 2: Inspect all STL bounds from the shared test output**

Run: `npx vitest run src/parts/highResAssets.test.js --reporter=verbose`

Expected: six named binary STL cases pass with finite vertices and expected XYZ bounds.

- [ ] **Step 3: Review each model in CAD Explorer**

Use the render skill for these exact paths:

```text
public/parts/arduino-nano/arduino-nano.stl
public/parts/arduino-mega-2560/arduino-mega-2560.stl
public/parts/oled-096/oled-096.stl
public/parts/oled-13/oled-13.stl
public/parts/hc-sr04/hc-sr04.stl
public/parts/tt-motor/tt-motor.stl
```

For each, check one isometric view plus a top view. Reject only visible geometry defects: missing board, closed holes, inverted orientation, detached major components, or obvious dimension mismatch.

- [ ] **Step 4: Verify viewport behavior**

Start the app on a free printed Vite port. Add all six parts, toggle High Res off/on, and verify each remains visible, selectable, and aligned to the same origin. Confirm the browser console has no STL loader or geometry-worker errors.

- [ ] **Step 5: Commit only if visual validation required a repair**

```bash
git add public/parts/arduino-nano public/parts/arduino-mega-2560 \
  public/parts/oled-096 public/parts/oled-13 public/parts/hc-sr04 public/parts/tt-motor \
  src/parts/library.ts src/parts/dimensionedParts.test.ts src/parts/highResAssets.test.js
git commit -m "fix: correct dimensioned part geometry"
```

If no repair was needed, do not create an empty commit.
