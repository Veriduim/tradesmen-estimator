---
title: 'TradesLine Draft v2 — Wholesaler-Picker Box Alignment on Materials Needed'
type: 'fix'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
  - bmad/implementation-artifacts/spec-tradesline-draft-v2-job-start-flow-cleanup.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

On Materials Needed, the vendor-choice block (the "No wholesaler chosen"/"Choose" row, and the expanded list of wholesaler options once opened) sat indented 30px from the material card's left edge, leaving a dead strip of unused space and narrowing the box instead of using the card's full width. Root cause: `.wholesaler-row`/`.wholesaler-options` were originally indented to line up under the material-name text, which used to sit beside a checkbox (checkbox width 20px + gap 10px = 30px) — that decorative checkbox was removed from this screen in the previous batch, but the indent built for it was never cleaned up. Fix: flush the block left and let it use the card's full width.

## Boundaries & Constraints

**Always:** the fix is scoped to Materials Needed only, via a `.no-checkbox` modifier class added just where `materialWholesalerBlockHTML` renders `.wholesaler-row`/`.wholesaler-options` — the wholesaler-selected screen's own (unmodified) `.wholesaler-row` usage still has a real checkbox (the received-toggle) in `.mat-left` and still needs the 30px indent to line its chip up under the material name; changing the base rule directly would have broken that screen.

**Never:** conflate this with the wholesaler-selected screen's checkbox — that one is functional (marks a material received) and out of scope; only the decorative one removed last batch was the source of the leftover indent.

</frozen-after-approval>

## Code Map

- `draft-v2/js/app.js` (`materialWholesalerBlockHTML`) — both the `.wholesaler-row` and `.wholesaler-options` divs it renders now also carry a `no-checkbox` class.
- `draft-v2/css/styles.css` — added `.wholesaler-row.no-checkbox, .wholesaler-options.no-checkbox { padding-left: 0; }` immediately after the base `.wholesaler-row` rule (which keeps its `padding-left: 30px` for wholesaler-selected's still-checkboxed row).

## Verification

Live browser check (2026-09-09) via `python -m http.server` against `draft-v2/`, simulated 360px phone width:
- Materials Needed: measured the chip/"Choose" row and each expanded wholesaler-option row — all now flush with the material card's own 14px inner padding (previously offset an extra 30px), using the card's full width.
- Regression check on wholesaler-selected (after ordering, where the received-toggle checkbox still exists): confirmed via the rendered chip's position that it's still aligned under the material name exactly as before — untouched by this change.
- Screenshot of an open vendor picker on Materials Needed confirms the visual fix: the "No wholesaler chosen" chip, "Choose" link, and all three wholesaler option rows sit flush-left and full-width, matching the rest of the card layout.
