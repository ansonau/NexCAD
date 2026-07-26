## 1. View State and Toolbar

- [x] 1.1 Add a session-only `showDimensions` boolean and toggle action to `viewStore`.
- [x] 1.2 Add a dimension display icon button to `ViewToggles` beside the existing display toggles.
- [x] 1.3 Add English and Traditional Chinese labels for the dimension display toggle.
- [x] 1.4 Convert Dimensions from toggle to dropdown with enclosure and hole-distance modes.

## 2. Viewport Dimension Overlay

- [x] 2.1 Compute visible mesh bounding dimensions from existing viewport mesh payloads.
- [x] 2.2 Render compact mm dimension labels only when `showDimensions` is enabled.
- [x] 2.3 Ensure hidden objects and high-res visual replacements do not produce duplicate or stale labels.
- [x] 2.4 Replace the single combined size label with CAD-style dimension lines, arrows, and per-axis labels.
- [x] 2.5 Add hole-to-hole distance mode using visible hole mesh centers.
- [x] 2.6 Add part-size mode for visible non-enclosure, non-hole objects.
- [x] 2.7 Include visible part mounting holes in hole-to-hole distance mode.

## 3. Verification

- [x] 3.1 Add or update store tests for the new view toggle if a view store test exists or can be added simply.
- [x] 3.2 Add or update e2e smoke coverage for the dimension display toolbar button.
- [x] 3.3 Run TypeScript and relevant tests successfully.
