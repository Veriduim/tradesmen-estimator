---
title: 'TradesLine Draft v2 — Rebrand, Remove-Button Alignment, Color-Scheme Preview, Materials Warehouse'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Four small, independent client-review items, batched as one low-effort pass:

1. Rename "Sparkline" → "TradesLine" (matching the already-ratified UX docs) throughout `draft-v2`.
2. Fix the materials-needed "Remove" button, which sat left-aligned under the qty stepper instead of flush with the card's right edge.
3. Let the user compare a few accent-color schemes live, across the real app, without shipping a real theme-switcher feature or touching the promoted/deployed build.
4. Build the personal materials-warehouse list on Profile (deferred earlier this session) — deliberately simple, visual-only, no wholesaler/catalog tie-in.

## Boundaries & Constraints

**Always:** the color-scheme switcher only ever renders behind `?preview-themes=1` in the URL — confirmed absent (zero DOM footprint) without it, so it can never leak into a normal session or the promoted root copy; warehouse items are a flat `{id, name, qty, note}` shape, no `catalogId`/pricing/trade link.

**Never:** treat the theme switcher as a real feature to keep long-term — once a scheme is picked, either fold its values into `:root` and delete the switcher + `body.theme-*` CSS, or leave both for further comparison, but don't ship the switcher UI itself to real users.

</frozen-after-approval>

## Code Map

- `draft-v2/index.html`, `draft-v2/css/styles.css` — all `Sparkline` → `TradesLine`, brand-mark letter `S` → `T`.
- `draft-v2/js/app.js` (`materialsNeededHTML`) — the qty-box + Remove button wrapper `<div>` gained a `.mat-actions` class.
- `draft-v2/css/styles.css` — `.mat-actions { display:flex; flex-direction:column; align-items:flex-end; }` right-aligns both children to the card edge.
- `draft-v2/css/styles.css` — `body.theme-blue`/`.theme-indigo`/`.theme-rust` override just the accent trio (`--accent`/`--accent-dark`/`--accent-soft`); everything else (ok/warn/danger/neutrals) stays constant across schemes.
- `draft-v2/js/app.js` (`initThemePreviewSwitcher`, called at the end of `init()`) — gated on `location.search`, injects a small fixed-position button bar (inline-styled, not real app CSS) that toggles `document.body.className`.
- `draft-v2/js/state.js` — `profile.warehouse: []`.
- `draft-v2/js/app.js` — `warehouseSectionHTML()`, `handleAddWarehouseItem()`, `handleRemoveWarehouseItem()`, wired into `renderProfile()` and the `add-warehouse-item`/`remove-warehouse-item` actions.
- `draft-v2/css/styles.css` — `.warehouse-add-row` (compact inline add form) reusing `.field input`'s look.

## Verification

**Live browser verification (2026-09-08), no bugs found:**
- Title/header/brand mark all read "TradesLine"; grepped the whole `draft-v2/` tree for any remaining "Sparkline" — none.
- Materials-needed screenshot confirmed the Remove button now sits directly under the qty-box, both flush with the card's right edge.
- `?preview-themes=1` shows a 4-button switcher bottom-right; clicked "Construction Blue" and "Deep Indigo" — accent color changed correctly across the header, brand mark, and Sign-in button in both cases. Reloaded without the query param — confirmed zero extra DOM nodes (`document.body.children` = exactly the app shell + 3 script tags), so the switcher has no footprint in normal use.
- Added a warehouse item with name/qty/note — rendered correctly, form reset after add. Tried adding again with an empty name — correctly blocked with an inline error, no duplicate/blank entry created. Removed the item — list correctly returned to its empty state.
