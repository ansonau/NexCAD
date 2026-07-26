## 1. Document Store Alignment

- [x] 1.1 Add or refine a document-store alignment action that aligns selected nodes to the first selected node on X, Y, or Z.
- [x] 1.2 Ensure alignment creates one undoable mutation and preserves selection membership.
- [x] 1.3 Ensure locked non-reference nodes are skipped without moving or unlocking them.

## 2. Align Tools UI

- [x] 2.1 Add or refine the Align Tools panel in the existing dialog style.
- [x] 2.2 Show clear copy for the minimum selection requirement and first-selected reference rule.
- [x] 2.3 Disable X, Y, and Z alignment actions when fewer than two objects are selected.
- [x] 2.4 Keep Align Tools available from the Tools Tab without changing selection when opened.

## 3. Localization

- [x] 3.1 Add English copy for Align Tools labels, hints, and disabled guidance.
- [x] 3.2 Add Traditional Chinese copy for Align Tools labels, hints, and disabled guidance.

## 4. Verification

- [x] 4.1 Add or update document store tests for X/Y/Z alignment, undo, locked-node behavior, and selection preservation.
- [x] 4.2 Add or update a UI smoke test that opens Align Tools from the Tools Tab.
- [x] 4.3 Run TypeScript and relevant test commands successfully.

## 5. A/B/Average Enhancement

- [x] 5.1 Add Align to A, Align to B, and Average target modes.
- [x] 5.2 Replace single-row axis controls with icon/button based target groups.
- [x] 5.3 Add tests for B target and average target alignment.


## 6. Inline Panel UX

- [x] 6.1 Convert Align Tools from a blocking dialog to an inline Tools Tab panel.
- [x] 6.2 Add an Align Tools undo button backed by the existing document undo stack.
- [x] 6.3 Update UI smoke coverage for inline Align Tools behavior.
