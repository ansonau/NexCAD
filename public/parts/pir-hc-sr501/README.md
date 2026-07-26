# PIR HC-SR501

Visual/reference asset folder for NexCAD's `pir-hc-sr501` part.

## Files

- `pir-hc-sr501.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `sensor`.
- Body envelope: 32.5 × 24 × 1.6 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o pir-hc-sr501.stl pir-hc-sr501.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
