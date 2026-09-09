---
title: 'TradesLine Draft v2 — Remove-Button Reorder, Searchable Warehouse Picker'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Two small client-review refinements. (1) The materials-needed Remove button should sit above the qty stepper, at the top-right of the card, not below it. (2) The materials-warehouse's "Material name" field should be a searchable dropdown against the trade's catalog, matching the picker already used to add materials to a job — not a freeform text box.

## Boundaries & Constraints

**Always:** the warehouse picker is catalog-only (must pick a search result, no freeform name) — matches the job-materials picker's own rule, and keeps warehouse item names consistent with what's used elsewhere in the app; unlike the job picker, the warehouse search does **not** exclude already-logged catalog items (having leftovers of the same material from multiple jobs is normal, unlike a job's one-row-per-material rule); the shared search/filter/render code (`filterCatalogIds`, `materialResultsHTML`) is now used by both pickers so they can't silently diverge.

**Never:** let the warehouse dropdown regress into the earlier "full re-render wipes focus mid-typing" bug — required building a dedicated `#warehouse-section` container and `refreshWarehouseSection()` partial-refresh, mirroring `refreshJobDetailBody`'s existing pattern.

</frozen-after-approval>

## Code Map

- `draft-v2/js/app.js` (`materialsNeededHTML`) — swapped order inside `.mat-actions`: Remove button first, qty-box second.
- `draft-v2/css/styles.css` (`.mat-actions`) — spacing moved from `.mat-remove`'s `margin-top` to a `gap` on the flex container, so it's correct regardless of child order.
- `draft-v2/js/app.js` — extracted `filterCatalogIds(trade, query, excludeIds)` as the shared base under `filteredMaterialResultIds` (job picker, unchanged behavior) and new `filteredWarehouseResultIds(query)` (no exclusion); extracted `materialResultsHTML(matchIds, query, highlightIndex, pickAction, emptyMessage)` as the shared dropdown renderer, used by both `addItemFormHTML` and the new warehouse picker.
- `draft-v2/js/app.js` (`ui`) — `warehouseAddQuery`, `warehouseAddHighlightIndex`, `warehouseAddCatalogId`.
- `draft-v2/js/app.js` — `warehouseSectionInnerHTML()`/`warehouseSectionHTML()` split (the latter just wraps the former in `#warehouse-section`) so `refreshWarehouseSection()` can update only that container; `handleAddWarehouseItem()` now requires a confirmed `catalogId` and pulls `name`/`unit` from `MATERIAL_CATALOG`.
- `draft-v2/js/app.js` — `warehouse-pick-material` click case, `#warehouse-search` `input`/`keydown` listeners (mirroring `#add-item-search`'s pattern exactly: arrow nav, Enter-to-pick, focus/cursor preservation on every keystroke).
- `draft-v2/js/app.js` (`open-job`, `leave-profile` cases) — reset the three new `ui.warehouseAdd*` flags alongside the existing resets.

## Verification

**Live browser verification (2026-09-09), no bugs found:**
- Confirmed geometrically (not just visually): the Remove button's bounding rect sits above the qty-box's, both with the same right edge (within 2px) — matches "top right, above the number counter."
- Warehouse search: typed "twin" — got 4 correctly-filtered, correctly-sorted results (starts-with matches first), focus stayed on the search input the whole time (partial-refresh fix held). Clicked a result — name locked in, dropdown closed. Set qty/note, clicked Add — item appeared with the catalog's real unit ("12 metres"). Tried Add without picking anything — correctly blocked with an inline error. Removed the item — list updated correctly. Arrow-down highlighted the next result and Enter picked it — full keyboard parity with the job-materials picker confirmed.
