## Context

NexCAD now has a three-column workspace with a Tools Tab for workflow utilities. Align Tools exists as a small modal launched from that tab and currently aligns selected node positions along X, Y, or Z. The next improvement should make the feature clearer and safer without adding a large layout subsystem.

## Goals / Non-Goals

**Goals:**
- Keep Align Tools inside the existing Tools Tab and dialog pattern.
- Make the panel beginner-friendly by showing the selection requirement and reference-object rule.
- Align selected scene nodes by center position on X, Y, or Z.
- Respect existing document semantics: one undo step per action, locked nodes unchanged, no visibility/group side effects.
- Cover behavior with focused store and UI tests.

**Non-Goals:**
- No edge, min/max, distribute, grid snap, or constraint-solver alignment in this change.
- No new dependencies or new scene data model.
- No persistent align settings.

## Decisions

- Use the first selected node as the reference object.
  - Rationale: it matches common CAD selection flows and avoids adding another reference picker UI.
  - Alternative considered: selected bounding-box average. Rejected because it is less predictable for beginners.

- Implement alignment in the document store, not inside the React panel.
  - Rationale: the store already owns selection, mutation, undo, and node lookup.
  - Alternative considered: update positions from the panel. Rejected because it would duplicate document mutation behavior.

- Align node transform centers only.
  - Rationale: current nodes already have transform positions, so this is the smallest precise operation.
  - Alternative considered: mesh-bound edge alignment. Rejected for this change because it requires geometry bounds and more UI states.

## Risks / Trade-offs

- Users may expect edge alignment or distribution → Keep labels explicit as center alignment and add those actions later only if needed.
- The first-selected reference rule can be missed → Show it in the panel copy and disable actions until enough objects are selected.
- Locked nodes can make results look partial → Preserve locked nodes and cover this with a test.
