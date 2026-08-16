# Breadboard 400

Visual/reference asset folder for NexCAD's `breadboard-half` part.

## Files

- `breadboard-half.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `component`.
- Body envelope: 82.5 × 54.5 × 8.5 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o breadboard-half.stl breadboard-half.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
