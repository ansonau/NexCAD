# micro:bit V2

Visual/reference asset folder for NexCAD's `microbit-v2` part.

## Files

- `microbit-v2.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `board`.
- Body envelope: 52 × 42 × 1.2 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o microbit-v2.stl microbit-v2.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
