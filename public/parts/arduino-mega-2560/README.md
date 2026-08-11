# Arduino Mega 2560 R3

Visual/reference asset folder for NexCAD's `arduino-mega-2560` part.

## Drawing

- Reference: `3d_models/arduino-mega-2560-r3-dimension.jpeg`.
- PCB outline: 101.6 x 53.35 x 1.6 mm.
- Mounting holes: six Ø3.2 mm R3 points.
- Simplified components set the visual envelope to 12.6 mm.

## Coordinate Contract

- Units: millimeters.
- Origin: PCB bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Files

- `arduino-mega-2560.scad` - editable OpenSCAD source with the drawing parameters.
- `arduino-mega-2560.stl` - generated binary visual model.

## Regeneration

```bash
openscad --export-format binstl \
  -o public/parts/arduino-mega-2560/arduino-mega-2560.stl \
  public/parts/arduino-mega-2560/arduino-mega-2560.scad
```
