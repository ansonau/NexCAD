# ESP32 DevKit V1

Visual/reference asset folder for NexCAD's `esp32-devkit` part.

## Files

- `esp32-devkit.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `board`.
- Body envelope: 51.5 × 25.4 × 1.6 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o esp32-devkit.stl esp32-devkit.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
