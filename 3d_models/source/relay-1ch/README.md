# Relay 1CH

Visual/reference asset folder for NexCAD's `relay-1ch` part.

## Files

- `relay-1ch.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `component`.
- Body envelope: 50 × 26 × 1.6 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o relay-1ch.stl relay-1ch.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
