## 1. Kernel Extension: extrudePolygon

- [ ] 1.1 Add `extrudePolygon(vertices: [number, number][], height: number): Solid` to `GeometryKernel` interface in `src/geometry/kernel.ts`
- [ ] 1.2 Implement `extrudePolygon` in `ManifoldKernel` using CrossSection: create small circles at each vertex, hull them, extrude to height
- [ ] 1.3 Update `ManifoldKernelShapeStub` in test mocks to include `extrudePolygon`

## 2. Schema Extension: Polygon Body

- [ ] 2.1 Add optional `polygon?: { sides: number }` field to `partBodySchema` in `src/parts/schema.ts`
- [ ] 2.2 Add `PartBody` type export for use in geometry builder
- [ ] 2.3 Update `buildPartSolid` and `buildPartColoredSegments` in `src/parts/partGeometry.ts` to check for `body.polygon` and generate polygon body when present

## 3. Polygon Shape Types and Chassis Builder

- [ ] 3.1 Add `'triangle' | 'pentagon' | 'hexagon' | 'octagon'` to `CarChassisShape` type in `src/parts/presets.ts`
- [ ] 3.2 Update `computeCornerRadius` or create `computePolygonSides` helper that maps shape to polygon sides (triangle=3, pentagon=5, hexagon=6, octagon=8)
- [ ] 3.3 Update `buildChassisDef` to generate `body.polygon` for polygon shapes, using width as circumdiameter
- [ ] 3.4 Update `buildChassisDefWithHoles` to place corner holes at each polygon vertex inset 10mm toward center
- [ ] 3.5 Compute polygon vertex positions (regular polygon centered at origin, flat edge facing +X)

## 4. UI Panel Updates

- [ ] 4.1 Add new shape options to `SHAPE_OPTIONS` array in `CarConfigPanel.tsx`
- [ ] 4.2 Make length field hidden/disabled when polygon shape is selected
- [ ] 4.3 Update width label to show "Width (vertex-to-vertex)" for polygon shapes
- [ ] 4.4 Add i18n keys for new shapes in `zh.json` and `en.json`

## 5. Testing

- [ ] 5.1 Add kernel test for `extrudePolygon` correctness (volume check for triangle, hexagon)
- [ ] 5.2 Add test for PartDefinition with polygon body generating correct geometry
- [ ] 5.3 Add tests for polygon chassis defs: hexagon, triangle at various sizes
- [ ] 5.4 Add test for polygon corner hole placement (N holes at vertices)
- [ ] 5.5 Add tests for full buildCarNodes with polygon shapes (car generates correctly)
- [ ] 5.6 Verify all existing tests still pass

## 6. Verification

- [ ] 6.1 Run `npx tsc --noEmit` and fix TypeScript errors
- [ ] 6.2 Run `npm test` and ensure all tests pass
- [ ] 6.3 Run `npm run dev` and manually verify polygon shapes render correctly in the 3D viewport
- [ ] 6.4 Verify enclosure generation works with polygon chassis
- [ ] 6.5 Verify undo removes entire polygon car in one step