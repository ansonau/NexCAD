# Push Button 12mm

Visual/reference asset folder for NexCAD's `push-button-12mm` part.

## Files

- `push-button-12mm.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `component`.
- Body envelope: 12 × 12 × 6.5 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o push-button-12mm.stl push-button-12mm.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
