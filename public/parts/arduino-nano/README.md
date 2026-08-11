# Arduino Nano 3.0

Visual/reference asset folder for NexCAD's `arduino-nano` part.

## Drawing

- Reference: `3d_models/arduino-nano-3.0-dimension.jpeg`.
- PCB outline: 43.18 × 17.77 × 1.6 mm.
- Mounting holes: Ø1.65 mm on a 40.64 × 15.24 mm pattern.
- Inferred component height: header strips set the visual envelope to 10.1 mm.

## Coordinate Contract

- Units: millimeters.
- Origin: PCB bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Files

- `arduino-nano.scad` — editable OpenSCAD source with the drawing parameters.
- `arduino-nano.stl` — generated binary visual model.

## Regeneration

```bash
openscad --export-format binstl \
  -o public/parts/arduino-nano/arduino-nano.stl \
  public/parts/arduino-nano/arduino-nano.scad
```
