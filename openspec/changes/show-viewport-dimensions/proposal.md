## Why

Users need a quick way to verify object size directly in the 3D viewport without selecting each object and reading numeric fields elsewhere. A dimension display toggle in the existing viewport display toolbar makes size checking visible, beginner-friendly, and close to the model.

## What Changes

- Add a new viewport display toolbar toggle for dimension display.
- When enabled, visible scene objects show simple length labels for their bounding dimensions in the viewport.
- Keep the dimension display session-only, like X-ray and Wireframe, so it does not modify the document or export geometry.
- Hide dimension labels when the toggle is off or when an object is hidden.
- Use millimeter units and compact labels suitable for beginner CAD inspection.

## Capabilities

### New Capabilities

### Modified Capabilities
- `viewport-display`: Add a session-only dimension display mode controlled from the viewport display toolbar.

## Impact

- Affected UI: `ViewToggles` display toolbar and i18n labels.
- Affected viewport rendering: visual-only dimension overlays in `Viewport`.
- Affected state: view/session store gets a boolean toggle for dimension display.
- Affected tests: view store/unit tests where present and e2e smoke coverage for the new toggle.
- No document schema, export format, or geometry worker change is expected.
