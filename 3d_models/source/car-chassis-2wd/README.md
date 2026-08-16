# 2WD Car Chassis

Visual/reference asset folder for NexCAD's `car-chassis-2wd` part.

## Files

- `car-chassis-2wd.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `component`.
- Body envelope: 270 × 185 × 3 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o car-chassis-2wd.stl car-chassis-2wd.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
