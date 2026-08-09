# TT Motor Redraw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redraw the TT Motor from the supplied dimension drawing and GLB reference, then align NexCAD collision geometry and smart-car wheel placement with the new model.

**Architecture:** Keep OpenSCAD as the editable visual source and binary STL as the runtime sidecar. Use the gearbox body centre as the common X/Y origin, derive the shaft centre from drawing dimensions, and keep the procedural model intentionally coarse while matching the high-resolution model's envelope and shaft datum.

**Tech Stack:** OpenSCAD 2021.01, TypeScript 5.8, Manifold 3D, Vitest, React Three Fiber STLLoader.

## Global Constraints

- Drawing dimensions are authoritative; the 167MB GLB is appearance reference only.
- Coordinates: long axis X, shaft axis Y, bottom face Z=0, gearbox body centre at X/Y zero.
- Target overall envelope is approximately `69.9 × 37.0 × 22.4 mm`.
- Shaft centre is `[7.22, 0, 11.2]`, shaft diameter `5.4 mm`, and D-flat width `3.7 mm`.
- Side holes are visual Y-axis holes and must not appear in `mountingHoles`.
- Runtime STL must be binary and use the existing loader; no dependency or document-schema change.
- Preserve unrelated dirty-worktree changes and do not commit overlapping files automatically.

---

### Task 1: Procedural Envelope And Shaft Datum

**Files:**
- Modify: `src/parts/ttMotor.test.ts`
- Modify: `src/parts/library.ts`

**Interfaces:**
- Produces: TT Motor procedural envelope near `69.9 × 37.0 × 22.4 mm`.
- Produces: shaft blocks centred at local X `7.22`, local Z `11.2`, diameter `5.4`.
- Produces: `mountingHoles: []` for TT Motor.

- [ ] **Step 1: Change tests to the new drawing contract**

```ts
it('matches the drawing envelope and clearance height', () => {
  const b = bounds();
  expect(b.maxX - b.minX).toBeCloseTo(69.9, 0);
  expect(b.maxY - b.minY).toBeCloseTo(37, 0);
  expect(b.maxZ - b.minZ).toBeCloseTo(22.4, 0);
  expect(def.clearanceHeight).toBeGreaterThanOrEqual(22.4);
});

it('uses the drawing shaft datum and does not expose side holes as bottom holes', () => {
  const shafts = def.body.blocks.filter((block) => block.label === '輸出軸');
  expect(shafts).toHaveLength(2);
  expect(shafts.every((shaft) => shaft.position[0] === 7.22)).toBe(true);
  expect(shafts.every((shaft) => shaft.size[0] === 5.4)).toBe(true);
  expect(def.mountingHoles).toEqual([]);
});
```

- [ ] **Step 2: Run the test and verify the old dimensions fail**

Run: `npx vitest run src/parts/ttMotor.test.ts`

Expected: FAIL because the old shaft is X `9.5`, diameter `5`, and mounting holes are present.

- [ ] **Step 3: Update only the TT Motor definition**

Use a `37 × 18.8 × 22.3` gearbox body, a `Ø22.4 × 33` motor can extending to X `-46`, a front tab extending to X `23.9`, and two shaft blocks spanning Y `±18.5`. Set `clearanceHeight: 22.4` and remove the three false Z-axis mounting holes.

- [ ] **Step 4: Run focused geometry tests**

Run: `npx vitest run src/parts/ttMotor.test.ts src/parts/library.test.ts`

Expected: PASS.

### Task 2: Smart-Car Motor/Wheel Alignment

**Files:**
- Modify: `src/parts/presets.test.ts`
- Modify: `src/parts/presets.ts`

**Interfaces:**
- Consumes: TT Motor shaft local datum X `7.22`, Z `11.2`.
- Produces: 2WD and 4WD motor shaft world X/Z equal to corresponding wheel centres.

- [ ] **Step 1: Replace hard-coded motor node expectations with axis alignment assertions**

```ts
const shaftX = 7.22;
const shaftZ = 11.2;
const motor = at('tt-motor', 81.25);
const wheel = at('car-wheel', 107.5);
expect(motor.transform.position[0] + shaftX).toBe(wheel.transform.position[0]);
expect(motor.transform.position[2] + shaftZ).toBe(32.5);
```

Add the same assertion for both X positions in `SMART_CAR_4WD`.

- [ ] **Step 2: Run preset tests and verify old constants fail**

Run: `npx vitest run src/parts/presets.test.ts`

Expected: FAIL because current constants use shaft X `9.5` and Z `11`.

- [ ] **Step 3: Update the two TT Motor datum constants**

```ts
const TT_MOTOR_SHAFT_LOCAL_X = 7.22;
const TT_MOTOR_SHAFT_LOCAL_Z = 11.2;
```

Keep `motorXForWheel()` and `CHASSIS_TOP_Z` as the single placement path.

- [ ] **Step 4: Run preset and TT Motor tests**

Run: `npx vitest run src/parts/presets.test.ts src/parts/ttMotor.test.ts`

Expected: PASS.

### Task 3: Parametric High-Resolution Model

**Files:**
- Modify: `public/parts/tt-motor/tt-motor.scad`
- Regenerate: `public/parts/tt-motor/tt-motor.stl`
- Modify: `public/parts/tt-motor/README.md`
- Create: `src/parts/ttMotorAsset.test.js`

**Interfaces:**
- Consumes: common gearbox origin and shaft datum from Tasks 1-2.
- Produces: compact binary STL loadable by the existing `HIGH_RES_MODELS` entry.

- [ ] **Step 1: Add a binary STL envelope regression test**

Read `public/parts/tt-motor/tt-motor.stl` with `readFileSync`, assert byte 80's triangle count fits the file length (`84 + triangles * 50`), scan each 50-byte triangle record's nine float vertices, and assert envelope dimensions close to `69.9`, `37.0`, and `22.4` with one decimal-place tolerance.

- [ ] **Step 2: Run the asset test and verify the old STL fails**

Run: `npx vitest run src/parts/ttMotorAsset.test.js`

Expected: FAIL because the current STL is approximately `69.5 × 36.5 × 22.0 mm`.

- [ ] **Step 3: Rewrite SCAD parameters around the drawing**

Use these primary values:

```scad
axis_z = 11.2;
gearbox_x0 = -18.5;
gearbox_x1 = 18.5;
gearbox_w = 18.8;
gearbox_h = 22.3;
can_d = 22.4;
can_x_end = -46.0;
can_x_front = -13.0;
shaft_d = 5.4;
shaft_span = 37.0;
shaft_x = 7.22;
shaft_flat = 3.7;
hole_d = 3.0;
hole_x = -13.25;
hole_z = [2.5, 19.8];
front_tab_x1 = 23.9;
front_hole_d = 2.8;
```

Keep named modules for gearbox halves, D-shafts, motor can/end cap, retaining bracket, terminals, side holes, front tab/hole, screws, vents, and seams. Do not model internal gears or microscopic GLB mesh details.

- [ ] **Step 4: Generate binary STL**

Run:

```bash
openscad --export-format binstl \
  -o public/parts/tt-motor/tt-motor.stl \
  public/parts/tt-motor/tt-motor.scad
```

Expected: command exits 0 and creates a binary STL.

- [ ] **Step 5: Run STL and procedural geometry tests**

Run: `npx vitest run src/parts/ttMotorAsset.test.js src/parts/ttMotor.test.ts src/parts/presets.test.ts src/parts/assets.test.ts`

Expected: PASS.

- [ ] **Step 6: Update README with the new source of truth**

Document the drawing path, GLB reference path, gearbox-centre origin, key dimensions, Y-axis side-hole limitation, binary export command, and the distinction between visual STL and procedural collision geometry.

- [ ] **Step 7: Run TypeScript and full focused verification**

Run: `npx tsc --noEmit`

Run: `npx vitest run src/parts/ttMotorAsset.test.js src/parts/ttMotor.test.ts src/parts/presets.test.ts src/parts/library.test.ts src/parts/assets.test.ts`

Expected: all commands pass.

- [ ] **Step 8: Inspect and render the final STL**

Open the explicit STL through the render skill and save ISO, side, and top snapshots. Confirm D-shafts, motor bracket, terminals, side holes, rounded gearcase and front tab are visible; rerun the envelope test after any repair.

- [ ] **Step 9: Review the final diff without staging unrelated work**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; implementation files remain unstaged if their diffs overlap earlier user work.
