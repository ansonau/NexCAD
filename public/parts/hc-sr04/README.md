# HC-SR04

Visual/reference asset folder for NexCAD's `hc-sr04` part.

## Drawing

- Reference: `3d_models/ultrasonic-ranging-sensor-hc-sr04-dimension.jpeg`.
- PCB outline: 45 x 20 x 1.5 mm.
- Mounting holes: two diagonal Ø2 mm holes at (-21, -8.25) and (21, 8.25).
- Two Ø16 x 12 mm transducers set the visual envelope to 13.5 mm.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Files

- `hc-sr04.scad` — editable OpenSCAD source with drawing parameters.
- `hc-sr04.stl` — generated binary visual model.

## Regeneration

If OpenSCAD is installed:

```bash
openscad --export-format binstl \
  -o public/parts/hc-sr04/hc-sr04.stl \
  public/parts/hc-sr04/hc-sr04.scad
```
