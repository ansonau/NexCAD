# Arduino Nano

Visual/reference asset folder for NexCAD's `arduino-nano` part.

## Files

- `arduino-nano.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `board`.
- Body envelope: 43.2 × 18 × 1.6 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o arduino-nano.stl arduino-nano.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
