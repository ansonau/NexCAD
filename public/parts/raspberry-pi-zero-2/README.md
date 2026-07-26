# Raspberry Pi Zero 2 W

Visual/reference asset folder for NexCAD's `raspberry-pi-zero-2` part.

## Files

- `raspberry-pi-zero-2.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `board`.
- Body envelope: 65 × 30 × 1.4 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o raspberry-pi-zero-2.stl raspberry-pi-zero-2.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
