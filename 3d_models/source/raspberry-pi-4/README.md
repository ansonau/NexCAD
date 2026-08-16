# Raspberry Pi 4B

Visual/reference asset folder for NexCAD's `raspberry-pi-4` part.

## Files

- `raspberry-pi-4.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `board`.
- Body envelope: 85 × 56 × 1.4 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o raspberry-pi-4.stl raspberry-pi-4.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
