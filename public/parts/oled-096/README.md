# OLED 0.96" (SSD1306)

Visual/reference asset folder for NexCAD's `oled-096` part.

## Files

- `oled-096.scad` — editable OpenSCAD source for human/AI collaboration.

## Coordinate Contract

- Units: millimeters.
- Origin: part bottom-center, matching `src/parts/library.ts`.
- This asset is visual only. Enclosure planning, collision envelopes, mounting holes, and export logic continue to use `src/parts/library.ts` as the source of truth.

## Baseline Dimensions

- Category: `sensor`.
- Body envelope: 27 × 27.5 × 1.2 mm.

## Regeneration

If OpenSCAD is installed:

```bash
openscad -o oled-096.stl oled-096.scad
```

Only commit regenerated STL after checking visual alignment in NexCAD high-res mode.
