# LCD1602 (I2C)

Visual/reference asset folder for NexCAD's `lcd1602` part.

## Files

- `lcd1602.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `sensor`.
- Body envelope: 80 × 36 × 1.6 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o lcd1602.stl lcd1602.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
