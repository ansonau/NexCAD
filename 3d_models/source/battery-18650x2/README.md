# 18650×2 Holder

Visual/reference asset folder for NexCAD's `battery-18650x2` part.

## Files

- `battery-18650x2.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `power`.
- Body envelope: 77.7 × 40.2 × 21.5 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o battery-18650x2.stl battery-18650x2.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
