# OLED 1.3" (I2C)

Visual/reference asset folder for NexCAD's `oled-13` part.

## Drawing

- Reference: `3d_models/monochrome-1.3-oled-graphic-display-with-i2c-dimension.jpeg`.
- PCB outline: 35.4 x 33.5 x 1.2 mm.
- Mounting holes: four 3.0 mm circles centered at x = +/-15.20 and y = +/-14.25 mm (30.40 x 28.50 mm pitch).
- Active display: 29.42 x 14.70 x 1.6 mm, centered at y = +2.05 mm; header reaches Z = 11.3 mm.

## Files

- `oled-13.scad` - editable OpenSCAD source for human/AI collaboration.
- `oled-13.stl` - generated binary visual model.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `sensor`.
- Body envelope: 35.4 x 33.5 x 1.2 mm.

## Regeneration

```bash
/opt/homebrew/bin/openscad --export-format binstl \
  -o public/parts/oled-13/oled-13.stl \
  public/parts/oled-13/oled-13.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
