# car-config-panel Specification

## Purpose

Provide an interactive dialog panel that allows users to configure and generate a smart car with customizable chassis shape, dimensions, thickness, drive type, wheel size, and caster options.

## ADDED Requirements

### Requirement: Car config panel opens from toolbar

The toolbar "Smart Car" button SHALL open a configuration dialog `CarConfigPanel` instead of the existing preset menu.

#### Scenario: Panel opens on click

- **WHEN** user clicks the Car icon button in the toolbar
- **THEN** a `Dialog` titled "Smart Car" appears with chassis configuration options

#### Scenario: Panel closes on Escape

- **WHEN** the CarConfigPanel dialog is open and user presses Escape
- **THEN** the dialog closes without generating any nodes

#### Scenario: Panel closes on backdrop click

- **WHEN** the CarConfigPanel dialog is open and user clicks the backdrop
- **THEN** the dialog closes without generating any nodes

### Requirement: Chassis shape selection

The panel SHALL provide a select/dropdown for chassis shape with three options: rounded rectangle, sharp rectangle, and ellipse.

#### Scenario: Default shape

- **WHEN** the panel opens
- **THEN** "rounded rectangle" is selected by default

#### Scenario: Shape selection updates preview state

- **WHEN** user selects "sharp rectangle"
- **THEN** the chassis generation will use `cornerRadius: 0`

#### Scenario: Ellipse shape

- **WHEN** user selects "ellipse"
- **THEN** the chassis generation will use `cornerRadius` equal to half the smaller chassis dimension

### Requirement: Chassis dimension controls

The panel SHALL provide numeric input fields for chassis length (X-axis) and width (Y-axis), with minimum and maximum bounds.

#### Scenario: Default dimensions

- **WHEN** the panel opens
- **THEN** length defaults to 270mm and width defaults to 185mm

#### Scenario: Length bounds

- **WHEN** user adjusts length
- **THEN** the value MUST be constrained to 200-350mm

#### Scenario: Width bounds

- **WHEN** user adjusts width
- **THEN** the value MUST be constrained to 150-250mm

#### Scenario: Invalid input rejected

- **WHEN** user enters a value outside bounds (e.g., length of 100)
- **THEN** the value is clamped to the nearest bound

### Requirement: Chassis thickness control

The panel SHALL provide a numeric input field for chassis thickness.

#### Scenario: Default thickness

- **WHEN** the panel opens
- **THEN** thickness defaults to 3mm

#### Scenario: Thickness bounds

- **WHEN** user adjusts thickness
- **THEN** the value MUST be constrained to 2-6mm

### Requirement: Drive type selection

The panel SHALL provide a select/dropdown for drive type with "2WD" and "4WD" options.

#### Scenario: Default drive type

- **WHEN** the panel opens
- **THEN** "2WD" is selected by default

#### Scenario: Switching to 4WD

- **WHEN** user selects "4WD"
- **THEN** the caster option is hidden (4WD does not use a caster)

#### Scenario: Switching to 2WD

- **WHEN** user is on "4WD" and switches to "2WD"
- **THEN** the caster option reappears with its default value (ON)

### Requirement: Wheel size selection

The panel SHALL provide a select/dropdown for wheel size with at least one option (65mm).

#### Scenario: Default wheel size

- **WHEN** the panel opens
- **THEN** 65mm is selected

### Requirement: Caster toggle

The panel SHALL provide a checkbox toggle for including a ball caster, visible only when drive type is 2WD.

#### Scenario: Caster visible for 2WD

- **WHEN** drive type is "2WD"
- **THEN** a checkbox labeled "Include Ball Caster" is visible and checked by default

#### Scenario: Caster hidden for 4WD

- **WHEN** drive type is "4WD"
- **THEN** the caster checkbox is not rendered

#### Scenario: Caster disabled by user

- **WHEN** user unchecks the caster checkbox on a 2WD configuration
- **THEN** the generated car has no ball caster node

### Requirement: Generate button creates the car

The panel SHALL have a "Generate" button that creates all car nodes and inserts them into the scene.

#### Scenario: Successful generation

- **WHEN** user clicks "Generate" with valid configuration
- **THEN** the dialog closes and the scene contains the car nodes (chassis + electronics + wheels + optional caster) with the chassis geometry matching the user's configuration

#### Scenario: Default selection for enclosure

- **WHEN** car is generated
- **THEN** the chassis, wheels, and caster (if included) are selected (the "ground group") so "Generate Enclosure" immediately works

#### Scenario: Single undo removes entire car

- **WHEN** user performs undo after generating a car
- **THEN** all car nodes are removed in a single undo step

### Requirement: i18n support

All panel labels, options, and the dialog title SHALL support Chinese and English via i18next.

#### Scenario: Chinese labels

- **WHEN** language is set to Chinese
- **THEN** all panel labels and option names display in Chinese

#### Scenario: English labels

- **WHEN** language is set to English
- **THEN** all panel labels and option names display in English
