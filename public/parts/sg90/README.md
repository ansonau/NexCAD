# SG90

Visual/reference asset folder for NexCAD's `sg90` part.

## Files

- `sg90.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `power`.
- Body envelope: 22.5 × 11.8 × 22.7 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o sg90.stl sg90.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
