# polygon-chassis-shapes Specification

## Purpose

Support regular polygon chassis shapes (triangle, pentagon, hexagon, octagon) in the car config panel via a kernel-level polygon extrusion primitive and schema extensions.

## ADDED Requirements

### Requirement: extrudePolygon kernel method

The `GeometryKernel` interface SHALL expose `extrudePolygon(vertices: [number, number][], height: number): Solid` for creating extrusions from arbitrary 2D polygon profiles.

#### Scenario: Hexagon extrusion

- **WHEN** `extrudePolygon` is called with 6 regular hexagon vertices and height 3
- **THEN** the resulting Solid is a hexagonal prism of the specified height

#### Scenario: Triangle extrusion

- **WHEN** `extrudePolygon` is called with 3 equilateral triangle vertices and height 3
- **THEN** the resulting Solid is a triangular prism

#### Scenario: Volume is correct

- **WHEN** a regular polygon Solid is created
- **THEN** `volume()` returns the geometric volume of the polygon prism (area × height)

### Requirement: PartDefinition body supports polygon field

The `partBodySchema` in `src/parts/schema.ts` SHALL accept an optional `polygon` field `{ sides: number }` where `sides` is an integer from 3 to 64.

#### Scenario: Box body (no polygon)

- **WHEN** a PartDefinition body has no `polygon` field
- **THEN** `buildPartSolid` uses `roundedBox` as before (backward compatible)

#### Scenario: Polygon body

- **WHEN** a PartDefinition body has `polygon: { sides: 6 }`
- **THEN** `buildPartSolid` calls `extrudePolygon` with a regular 6-sided polygon instead of `roundedBox`

#### Scenario: Polygon body drills holes correctly

- **WHEN** a polygon body part has mounting holes
- **THEN** holes are subtracted from the polygon body (same drill flow as box bodies)

### Requirement: buildChassisDef generates polygon chassis

`buildChassisDef` SHALL generate a `PartDefinition` with `body.polygon` when the chassis shape is a polygon type (triangle, pentagon, hexagon, octagon).

#### Scenario: Hexagon chassis definition

- **WHEN** `buildChassisDef` is called with shape `'hexagon'`, width 185, thickness 3
- **THEN** the returned PartDefinition has `body.polygon: { sides: 6 }` and `body.size` has height 3

#### Scenario: Polygon corner holes at each vertex

- **WHEN** a hexagon chassis is generated
- **THEN** there are 6 corner standoff holes (one at each vertex, inset 10mm toward center)

#### Scenario: Electronics mounting holes on polygon chassis

- **WHEN** a polygon chassis is generated for a specific car config
- **THEN** electronics mounting holes are placed at their computed world-offset positions relative to the chassis center

### Requirement: Polygon chassis respects configuration

A polygon chassis SHALL size itself based on the config `width` parameter as vertex-to-vertex circumdiameter.

#### Scenario: Width controls polygon size

- **WHEN** config width is 185 for a hexagon chassis
- **THEN** opposite vertices are 185mm apart

#### Scenario: Length parameter is unused for polygons

- **WHEN** config length is 300 for a hexagon chassis
- **THEN** the hexagon has circumradius = width / 2 = 92.5 (length is ignored for regular polygons)

### Requirement: Polygon chassis oriented flat-front

Regular polygon chassis SHALL be rotated so a flat edge faces +X (forward direction) rather than a vertex.

#### Scenario: Hexagon flat front

- **WHEN** a hexagon chassis is generated
- **THEN** the geometry has a flat face oriented toward +X

#### Scenario: Triangle flat front

- **WHEN** a triangle chassis is generated
- **THEN** the base of the triangular chassis faces +X
