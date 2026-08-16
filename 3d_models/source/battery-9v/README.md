# 9V Battery

Visual/reference asset folder for NexCAD's `battery-9v` part.

## Files

- `battery-9v.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `power`.
- Body envelope: 48.5 × 26.5 × 17.5 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o battery-9v.stl battery-9v.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
