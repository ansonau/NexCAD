# OLED 0.96" (SSD1306)

Visual/reference asset folder for NexCAD's `oled-096` part.

## Drawing

- Reference: `3d_models/monochrome-0.96-oled-graphic-display-with-i2c-dimension.jpeg`.
- PCB outline: 27.3 x 27.3 x 1.2 mm.
- Visual mounting slots: four 3.5 x 2.0 mm capsules centered at x = +/-10.35 and y = +/-11.65 mm.
- Display: 23.3 x 19 x 1.6 mm; four-pin header reaches Z = 11 mm.

## Files

- `oled-096.scad` — editable OpenSCAD source for human/AI collaboration.
- `oled-096.stl` — generated binary visual model.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `sensor`.
- Body envelope: 27.3 × 27.3 × 1.2 mm.

## Regeneration

If OpenSCAD is installed:

```bash
/opt/homebrew/bin/openscad --export-format binstl \
  -o public/parts/oled-096/oled-096.stl \
  public/parts/oled-096/oled-096.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
