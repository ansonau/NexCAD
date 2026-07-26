# MG996R

Visual/reference asset folder for NexCAD's `mg996r` part.

## Files

- `mg996r.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `power`.
- Body envelope: 40.7 × 19.7 × 42.9 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o mg996r.stl mg996r.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
