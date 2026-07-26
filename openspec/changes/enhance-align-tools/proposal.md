## Why

The current Align Tools feature only supports basic center alignment on one axis and gives limited guidance about how the reference object is chosen. As users build enclosures from multiple parts, they need a clearer, safer alignment workflow that is easy for beginners but still precise enough for CAD layout work.

## What Changes

- Add a dedicated Align Tools capability for multi-object layout operations.
- Improve the Align Tools panel so users can understand the required selection count, the reference object, and available alignment actions before applying them.
- Support center alignment on X, Y, and Z axes using the first selected object as the reference.
- Preserve existing document behavior: alignment operations create one undo step, respect locked nodes, and do not alter visibility or grouping.
- Add tests covering alignment behavior and the Tools Tab entry point.

## Capabilities

### New Capabilities
- `align-tools`: Defines the Align Tools panel and object alignment behavior for selected scene nodes.

### Modified Capabilities

## Impact

- Affected UI: Tools Tab, Align Tools panel, related i18n strings.
- Affected state: document store selection-based alignment actions.
- Affected tests: document store tests and a small UI smoke path for opening the panel.
- No new runtime dependencies are expected.
