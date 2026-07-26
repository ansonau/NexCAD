## Why

The current smart car generation panel offers only two hardcoded presets (2WD / 4WD) in a simple dialog with no customization. Users cannot adjust chassis dimensions, shape, thickness, plate material, or mix-and-match configurations. This limits the tool's usefulness for makers who need to adapt the car to different projects, sensor layouts, or wheel sizes.

## What Changes

- Replace the simple 2-button dialog with a full interactive generation panel featuring multiple configurable sections
- Add chassis shape options (rounded rectangle, rectangular, oval/elliptical)
- Add chassis dimension controls (length, width) with sensible defaults and bounds
- Add chassis thickness option (standard 3mm, or user-selectable)
- Add drive type selection (2WD, 4WD) as a toggle/selector rather than two separate buttons
- Add wheel size options (standard 65mm, or other common sizes)
- Add caster option toggle for 2WD configurations
- Preview of the chassis footprint relative to component layout before insertion
- **BREAKING**: `CarPresetSpec` interface expanded with new optional fields; `buildCarNodes` signature may change to accept runtime parameters

## Capabilities

### New Capabilities
- `car-config-panel`: Interactive smart car generation panel with chassis shape, size, thickness, drive type, wheel size, and caster options

### Modified Capabilities
- `part-presets`: Car preset data model gains support for runtime-customizable chassis parameters (shape, dimensions, thickness)

## Impact

- `src/components/CarPresetMenu.tsx` — replaced with new panel component
- `src/parts/presets.ts` — extended `CarPresetSpec` interface, updated `buildCarNodes` to accept runtime parameters
- `src/parts/library.ts` — new chassis part definitions for different shapes, or parameterized chassis generation
- `src/parts/partGeometry.ts` — may need new geometry primitives (e.g., elliptical plate, unrounded box)
- `src/i18n/zh.json`, `src/i18n/en.json` — new i18n keys for panel labels
- `src/components/Toolbar.tsx` — unchanged (button remains, opens new panel)
- Tests: new tests for panel options, updated preset/geometry tests
