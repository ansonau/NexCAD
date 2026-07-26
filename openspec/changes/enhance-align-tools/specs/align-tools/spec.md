## ADDED Requirements

### Requirement: Tools Tab exposes Align Tools
The system SHALL provide an Align Tools entry in the Tools Tab. Activating the entry SHALL open an inline Align Tools panel inside the Tools Tab without changing the current document selection or covering the viewport.

#### Scenario: Open Align Tools from Tools Tab
- **WHEN** the user opens the Tools Tab and activates Align Tools
- **THEN** the inline Align Tools panel is displayed inside the Tools Tab, the viewport remains visible, and the current selection remains unchanged

### Requirement: Align Tools explains selection and target behavior
The Align Tools panel SHALL show that at least two objects are required. The panel SHALL explain that A is the first selected object and B is the second selected object. Alignment actions SHALL be icon/button based and disabled when fewer than two objects are selected.

#### Scenario: Alignment disabled with fewer than two selected objects
- **WHEN** fewer than two scene objects are selected
- **THEN** all A, B, and average alignment axis actions are disabled

#### Scenario: Alignment enabled with two or more selected objects
- **WHEN** two or more scene objects are selected
- **THEN** A, B, and average alignment axis actions are enabled

### Requirement: Selected objects can center-align to A, B, or average
The system SHALL align selected objects along the chosen axis using one of three targets: A object, B object, or average position. A SHALL be the first selected object. B SHALL be the second selected object. Average SHALL be the arithmetic mean of the selected objects' positions on the chosen axis. Non-target axes SHALL remain unchanged.

#### Scenario: Align selected objects to A on X axis
- **WHEN** two or more objects are selected and the user activates Align to A on X
- **THEN** every unlocked selected object except A has its X position set to A's X position, while Y and Z positions remain unchanged

#### Scenario: Align selected objects to B on X axis
- **WHEN** two or more objects are selected and the user activates Align to B on X
- **THEN** every unlocked selected object except B has its X position set to B's X position, while Y and Z positions remain unchanged

#### Scenario: Align selected objects to average on X axis
- **WHEN** two or more objects are selected and the user activates Average on X
- **THEN** every unlocked selected object has its X position set to the selected objects' average X position, while Y and Z positions remain unchanged

### Requirement: Alignment preserves document safety semantics
Alignment SHALL create a single undoable document mutation. The Align Tools panel SHALL expose an undo action that uses the document undo stack. Alignment SHALL NOT move locked nodes, and SHALL NOT change node visibility, grouping, or selection membership.

#### Scenario: Undo restores positions after alignment
- **WHEN** the user aligns selected objects and then runs undo
- **THEN** all aligned object positions return to their pre-alignment values

#### Scenario: Undo from Align Tools panel
- **WHEN** the user aligns selected objects and activates the Align Tools undo action
- **THEN** the latest document mutation is undone using the existing document undo stack

#### Scenario: Locked selected objects are not moved
- **WHEN** a locked object is selected as an object that would otherwise move and the user activates an alignment action
- **THEN** the locked object position remains unchanged

#### Scenario: Alignment keeps selection membership
- **WHEN** the user aligns selected objects
- **THEN** the same objects remain selected after the operation
