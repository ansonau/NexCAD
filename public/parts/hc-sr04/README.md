# HC-SR04

Visual/reference asset folder for NexCAD's `hc-sr04` part.

## Files

- `hc-sr04.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `sensor`.
- Body envelope: 45 × 20 × 1.2 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o hc-sr04.stl hc-sr04.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
