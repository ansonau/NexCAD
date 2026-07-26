## Why

The car config panel currently supports only three chassis shapes (rounded rectangle, sharp rectangle, ellipse) — all derived from the same `roundedBox` kernel primitive. Users building custom robots need more distinctive chassis geometries (hexagonal, octagonal, triangular) for specific applications like omnidirectional robots, sumo bots, or aesthetic custom builds.

## What Changes

- Extend `GeometryKernel` interface with a new `regularPolygon(sides, radius, height)` method for creating regular polygon extrusions
- Implement `regularPolygon` in `ManifoldKernel` using the existing `CrossSection` API (already used internally by `roundedBox`)
- Add four new chassis shape options to `CarChassisShape`: `triangle` (3-sided), `pentagon` (5), `hexagon` (6), `octagon` (8)
- Update `buildChassisDef` to use `regularPolygon` for the new shapes
- Update `CarConfigPanel` shape dropdown to include new options
- Add i18n labels for new shapes
- Update `partBlockSchema` to support regular polygon blocks (for future part definitions)
- **BREAKING**: `GeometryKernel` interface gains one new method `regularPolygon` — any custom kernel implementations must add it

## Capabilities

### New Capabilities
- `polygon-chassis-shapes`: Regular polygon chassis shapes (triangle, pentagon, hexagon, octagon) selectable in the car config panel

### Modified Capabilities
- `car-config-panel`: Shape dropdown gains triangle, pentagon, hexagon, octagon options alongside existing rounded-rect, rect, ellipse

## Impact

- `src/geometry/kernel.ts` — new `regularPolygon` method on GeometryKernel interface
- `src/geometry/manifoldKernel.ts` — implementation using CrossSection.hull of polygon vertices
- `src/geometry/worker.ts` — new message handler for polygon operations
- `src/geometry/evaluate.ts` — no changes needed (chassis built via part definition as before)
- `src/parts/presets.ts` — new shape enum values, updated `buildChassisDef`
- `src/components/CarConfigPanel.tsx` — new shape options in dropdown
- `src/i18n/zh.json`, `src/i18n/en.json` — new shape labels
- `src/parts/schema.ts` — optional: add polygon block type
- Tests: new kernel tests for polygon geometry, updated chassis shape tests
