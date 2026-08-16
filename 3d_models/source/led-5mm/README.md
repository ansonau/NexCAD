# LED 5mm

Visual/reference asset folder for NexCAD's `led-5mm` part.

## Files

- `led-5mm.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `component`.
- Body envelope: 5.8 × 5.8 × 1 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o led-5mm.stl led-5mm.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
