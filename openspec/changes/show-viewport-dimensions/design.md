## Context

The viewport display toolbar already controls visual-only modes such as Shell X-ray, Wireframe, and High res. Users now need a similar visual-only mode for checking object dimensions directly in the 3D workspace without selecting objects or opening property controls.

## Goals / Non-Goals

**Goals:**
- Add a display toolbar toggle for dimensions.
- Render compact millimeter dimension labels for visible viewport objects.
- Keep the feature session-only and visual-only.
- Reuse existing view store, viewport rendering, and installed three/drei dependencies.

**Non-Goals:**
- No document schema changes.
- No STL/export geometry changes.
- No editable dimension constraints or parametric resizing.
- No advanced drafting annotations, tolerances, arrows, or measurement tools in this change.

## Decisions

- Store dimension display as a boolean in `viewStore`.
  - Rationale: it behaves like X-ray/Wireframe and should not persist in the project file.
  - Alternative considered: document-level setting. Rejected because display dimensions are an inspection overlay, not model data.

- Compute dimensions from each rendered mesh payload bounding box.
  - Rationale: the viewport already receives evaluated mesh data, so this avoids geometry worker or document schema changes.
  - Alternative considered: dimensions from part library metadata only. Rejected because generated/enclosure/primitive nodes also need labels.

- Show compact axis length labels in millimeters.
  - Rationale: beginners need immediately readable object size, not a full drafting annotation system.
  - Alternative considered: full dimension lines with arrowheads. Rejected for this first pass because it adds visual clutter and more camera-facing layout complexity.

## Risks / Trade-offs

- Dense scenes may become visually busy -> keep the overlay behind a toggle and use compact labels.
- Mesh payload bounds may differ from semantic dimensions for rotated or complex parts -> label evaluated viewport bounds, which matches what the user sees.
- Labels may overlap at some camera angles -> acceptable for first pass; add smarter placement later if users need it.
