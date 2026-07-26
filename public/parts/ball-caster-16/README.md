# Ball Caster 16mm

Visual/reference asset folder for NexCAD's `ball-caster-16` part.

## Files

- `ball-caster-16.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `component`.
- Body envelope: 14 × 14 × 9 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o ball-caster-16.stl ball-caster-16.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
