# TT Motor

Parametric visual asset for NexCAD's yellow TT geared motor.

## Files

- `tt-motor.scad` — editable OpenSCAD source.
- `tt-motor.stl` — binary high-resolution viewport asset.
- `../../../3d_models/tt-motor-dimension.jpeg` — dimensional source of truth.
- `../../../3d_models/high_res/tt-motor.glb` — appearance reference only; not shipped at runtime.

## Coordinate Contract

- Units: millimetres.
- Origin: gearbox body centre in X/Y, bottom face at Z = 0.
- Long axis: X, with the motor can toward negative X.
- Double output shaft: Y.
- Height: positive Z.

The OpenSCAD asset and `src/parts/library.ts` use the same gearbox origin and
shaft datum. The detailed STL is visual; enclosure planning and collision use
the simpler procedural definition.

## Key Dimensions

| Feature | Value |
| --- | --- |
| Overall bounding box | 69.9 × 37.0 × 22.4 mm |
| Gearbox body | 37.0 × 18.8 × 22.3 mm |
| Motor can | Ø22.4 × 33.0 mm |
| Shaft centre | X 7.22, Z 11.2 mm |
| Double output shaft | Ø5.4, 37.0 mm total span, 3.7 mm D-flat width |
| Side holes | 2 × Ø3.0, 17.3 mm centre spacing |
| Front side hole | Ø2.8 mm |

The three drawing holes run along Y through the gearbox sides. NexCAD's
`mountingHoles` currently describes only Z-axis bottom holes, so these side
holes are present in the detailed model but deliberately excluded from
`mountingHoles`. This prevents false enclosure standoffs.

## Regeneration

```bash
openscad --export-format binstl \
  -o public/parts/tt-motor/tt-motor.stl \
  public/parts/tt-motor/tt-motor.scad
```

Always export binary STL. The automated `ttMotorAsset.test.js` check validates
the binary structure and model envelope; `ttMotor.test.ts` validates the
procedural envelope and shaft datum.
