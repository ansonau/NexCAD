# car-config-panel Delta Specification

## ADDED Requirements

### Requirement: Polygon shape options in chassis shape dropdown

The chassis shape dropdown in `CarConfigPanel` SHALL include `triangle`, `pentagon`, `hexagon`, and `octagon` in addition to the existing `rounded-rect`, `rect`, and `ellipse` options.

#### Scenario: All seven shapes available

- **WHEN** the CarConfigPanel opens
- **THEN** the shape dropdown contains seven options: rounded rectangle, sharp rectangle, ellipse, triangle, pentagon, hexagon, octagon

#### Scenario: Hexagon selected

- **WHEN** user selects "hexagon" from the shape dropdown
- **THEN** the config shape is set to `'hexagon'` and the dimension input labels update for polygon sizing

#### Scenario: i18n labels for polygon shapes

- **WHEN** language is English
- **THEN** the shape options display as "Triangle", "Pentagon", "Hexagon", "Octagon"

#### Scenario: Chinese labels for polygon shapes

- **WHEN** language is Chinese
- **THEN** the shape options display as "三角形", "五邊形", "六邊形", "八邊形"

### Requirement: Width label adapts for polygon shapes

When a polygon shape is selected, the width input label SHALL indicate it controls vertex-to-vertex distance.

#### Scenario: Width label for rectangle chassis

- **WHEN** shape is "rounded rectangle"
- **THEN** the width label displays "Width (mm)"

#### Scenario: Width label for polygon chassis

- **WHEN** shape is "hexagon"
- **THEN** the width label displays "Width (vertex-to-vertex, mm)" or equivalent

#### Scenario: Length field hidden for polygon shapes

- **WHEN** a polygon shape is selected
- **THEN** the length input field is hidden or disabled since it does not apply to regular polygons
