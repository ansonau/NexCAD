# Arduino Uno R3

Visual/reference asset folder for NexCAD's `arduino-uno` part.

## Files

- `arduino-uno.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `board`.
- Body envelope: 68.6 × 53.4 × 1.6 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o arduino-uno.stl arduino-uno.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
