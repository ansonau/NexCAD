## Context

The car config panel (`CarConfigPanel.tsx`) offers three chassis shapes all derived from `roundedBox`: rounded-rect, sharp rect, ellipse. To support true polygon shapes (triangle, pentagon, hexagon, octagon), we need a new kernel primitive and a way to encode polygon geometry in the part definition schema.

The `ManifoldKernel` already uses `CrossSection` internally (for `roundedBox`), which can construct arbitrary 2D profiles. Adding polygon extrusion follows the same pattern — compute polygon vertices in 2D, create `CrossSection` points, hull them, extrude.

## Goals / Non-Goals

**Goals:**
- Add `extrudePolygon(vertices, height)` to `GeometryKernel` for general polygon extrusion
- Extend `PartDefinition.body` with optional `polygon` field so part definitions can describe polygonal bodies
- Add triangle (3), pentagon (5), hexagon (6), octagon (8) chassis shapes
- All existing framework (enclosure, holes, layout) works with polygon chassis

**Non-Goals:**
- Freeform/custom polygon (user-defined vertex positions)
- Polygon shapes for individual part blocks (e.g., polygon blocks on a box body)
- Non-regular polygons
- Star shapes or concave polygons

## Decisions

### D1: Extend kernel vs build polygons from existing primitives

**Decision:** Add `extrudePolygon(vertices: [number, number][], height: number): Solid` to `GeometryKernel`.

**Rationale:** Building a hexagon from 6 rotated boxes via union would produce messy internal edges and potential manifold issues. The Manifold `CrossSection` API (already used for `roundedBox`) handles polygon profile construction cleanly. One new kernel method is simpler than complex box-union hacks.

**Alternative considered:** Union of rotated boxes. Rejected — fragile, imprecise, performs poorly.

### D2: Schema extension for polygon bodies

**Decision:** Add optional `polygon?: { sides: number }` to `PartDefinition.body`. When present, `buildPartSolid` uses `kernel.extrudePolygon(vertices, height)` instead of `kernel.roundedBox()`.

**Rationale:** The PartDefinition schema is the natural place for body geometry description. Adding an optional field is backward compatible — existing parts are unaffected. The `polygon` field uses `sides` (computed from regular polygon math) rather than raw vertices to keep the schema simple and parametric.

### D3: Polygon dimension mapping

**Decision:** The chassis `width` parameter sets the polygon's circumdiameter (distance between opposite vertices). For odd-sided polygons (triangle, pentagon), this is the circumscribed circle diameter. `length` parameter is ignored for polygon shapes.

**Rationale:** Using width as the controlling dimension matches user intuition — "make it 185mm wide" means vertex-to-vertex. Length is meaningless for regular polygons so it's unused for these shapes, though still stored for config consistency.

### D4: Chassis corner holes for polygons

**Decision:** For polygon chassis, the 4 corner standoff holes are replaced with holes at each vertex, inset from the tip by 10mm toward center (same 10mm inset as rectangular corner holes).

**Rationale:** Rectangular chassis has 4 corners → 4 standoff holes. Polygon chassis has N vertices → N standoff holes at each vertex. The 10mm inset from the tip keeps holes inside the body.

### D5: Chassis orientation

**Decision:** Polygons are oriented with one flat edge facing forward (+X, the car's front direction). This gives a flat front for the ultrasonic sensor.

**Rationale:** A vertex pointing forward would make sensor placement awkward. A flat front edge provides a natural mounting surface.

## Risks / Trade-offs

- **Polygon chassis has no width dimension meaning** → `length` field unused but still present in config. Mitigation: UI labels "Width (vertex-to-vertex, mm)" for polygon shapes.
- **Odd-sided polygons have different visual bulk than rectangular chassis** → a triangle with 185mm vertex-to-vertex is much smaller in area than a 270×185mm rectangle. Mitigation: document the dimension meaning clearly in UI labels.
- **Enclosure generation around polygon chassis** → enclosure `planShell` uses AABB from parts, not the actual polygon outline. The enclosure will be rectangular around the polygon, which is acceptable (a protective rectangular box around the polygon chassis).
