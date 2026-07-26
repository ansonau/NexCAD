# L298N

Visual/reference asset folder for NexCAD's `l298n` part.

## Files

- `l298n.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `power`.
- Body envelope: 43.5 × 43.2 × 1.6 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o l298n.stl l298n.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
