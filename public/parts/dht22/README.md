# DHT22

Visual/reference asset folder for NexCAD's `dht22` part.

## Files

- `dht22.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `sensor`.
- Body envelope: 15.1 × 25.1 × 7.7 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o dht22.stl dht22.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
