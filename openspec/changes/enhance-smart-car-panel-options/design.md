## Context

The smart car feature currently offers two hardcoded presets (2WD/4WD) via a simple 2-button dialog. Users cannot customize chassis shape, dimensions, thickness, wheel size, or caster inclusion. The chassis geometry is statically defined in `src/parts/library.ts` and the electronics layout is baked into each preset in `src/parts/presets.ts`.

The existing `EnclosurePanel.tsx` establishes a UX pattern: a floating `Dialog` with `fieldClass`/`numberFieldClass` form controls, section labels, and a generate button. This change follows that same pattern.

## Goals / Non-Goals

**Goals:**
- Replace `CarPresetMenu.tsx` with a full interactive `CarConfigPanel.tsx` dialog
- Support 3 chassis shapes: rounded rectangle (default), sharp rectangle, ellipse
- Support configurable chassis length, width, and thickness with sensible bounds
- Drive type selection (2WD / 4WD) with automatic electronics layout adjustment
- Wheel size selection (65mm standard, with room for future sizes)
- Caster toggle for 2WD (on/off)
- Dynamic chassis geometry generation from user parameters
- All existing enclosure integration must continue working

**Non-Goals:**
- Custom electronics placement (electronics remain preset-layout per drive type)
- Arbitrary wheel sizes beyond predefined options
- Custom motor placement or motor type selection
- 3D preview of the car in the panel (footprint preview only, in future)
- Retroactive editing of already-generated cars

## Decisions

### D1: Dynamic chassis generation vs static part library

**Decision:** Generate chassis PartDefinitions dynamically at generation time based on user-selected shape and dimensions.

**Rationale:** Adding every combination of shape×size×thickness to the static library would require dozens of definitions. Dynamic generation is more maintainable and allows infinite customization. The `PartDefinition` type already supports runtime creation; `buildCarNodes` will construct the chassis definition from parameters.

**Alternative considered:** Static library entries for common sizes. Rejected due to combinatorial explosion and maintenance burden.

### D2: Runtime config object vs new preset specs

**Decision:** Introduce a `CarConfigParams` type with user-facing options (shape, length, width, thickness, drive, wheelSize, includeCaster). Keep `CarPresetSpec` for electronics layout, and have `buildCarNodes(spec, config, lang)` merge the two.

**Rationale:** Separates concerns: `CarPresetSpec` defines "what electronics go where" (driven by drive type), `CarConfigParams` defines "what the chassis looks like". Users pick drive type → a preset is selected internally → config overrides hardware dimensions.

### D3: Chassis shape geometry

**Decision:** Three shapes with consistent API:
- `rounded-rect`: `body: { size: [l, w, t], cornerRadius: r }` (existing, r = min(l,w) * 0.037)
- `rect`: `body: { size: [l, w, t], cornerRadius: 0 }` (sharp corners)
- `ellipse`: `body: { size: [l, w, t], cornerRadius: min(l,w)/2 }` (fully rounded = ellipse)

**Rationale:** Reuses the existing `roundedBox` kernel primitive. `cornerRadius = size/2` naturally produces an elliptical shape. No new kernel operations needed.

### D4: Dimension bounds

**Decision:** Length 200-350mm, Width 150-250mm, Thickness 2-6mm. Defaults match existing 2WD chassis (270×185×3mm).

**Rationale:** Lower bounds ensure all electronics fit on the chassis. Upper bounds keep it practical for 3D printing. Thickness 2mm minimum for structural integrity, 6mm max to avoid excessive weight/material.

### D5: Electronics layout adaptation

**Decision:** For 2WD, motors at rear (x=-35, y=±81.25) with wheels at (x=-15, y=±107.5). For 4WD, motors at front (x=45, y=±81.25) + rear (x=-100, y=±81.25) with wheels at (x=65, y=±107.5) + (x=-80, y=±107.5). Electronics positions (sensor, uno, driver, battery) are identical between drive types.

When chassis length changes, the rear components (battery, rear motors) shift proportionally. Sensor stays at front edge.

**Rationale:** Maintains existing proven layout. Proportional shift keeps components within the chassis footprint.

### D6: Caster behavior

**Decision:** Caster is only available for 2WD (redundant for 4WD). Toggle defaults to ON for 2WD, hidden for 4WD. Caster position adapts to chassis length (always near front edge).

**Rationale:** 4WD cars don't need a caster. Hiding irrelevant options reduces UI clutter.

## Risks / Trade-offs

- **Dynamic chassis has no part library ID** → chassis nodes won't appear in the parts drawer. Mitigation: chassis is primarily for the car assembly, not reusable standalone. Users can still export the STL.
- **Electronics layout might not scale well with extreme dimensions** → very small chassis (200×150mm) may cause overlap. Mitigation: enforce minimum bounds that guarantee no overlap.
- **Enclosure generation relies on mounting hole positions** → dynamic chassis must preserve the 4 corner standoff holes at predictable offsets. Mitigation: corner holes always at ±(length/2 - 10), ±(width/2 - 10).
- **No visual preview in panel** → users can't see shape/size until after generation. Mitigation: single undo removes everything, so experimentation is cheap. Footprint preview deferred to future.
