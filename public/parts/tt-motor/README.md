# TT Motor

Visual/reference asset folder for NexCAD's `tt-motor` part.

## Files

- `tt-motor.scad` — editable OpenSCAD source for human/AI collaboration.
- `tt-motor.stl` — high-resolution viewport asset loaded by NexCAD.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Current Reference Dimensions

- Gearbox body: 37 × 18 × 22 mm.
- Motor can: Ø22 × 33 mm.
- Double output shaft: Ø5 mm, total width about 40 mm.
- Mounting holes: two Ø3 mm holes at X ±9.25 mm, plus one Ø1.95 mm center locating hole.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o tt-motor.stl tt-motor.scad
```

After regenerating, verify the model still visually aligns with the procedural part in NexCAD high-res mode.
