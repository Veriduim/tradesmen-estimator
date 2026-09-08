---
title: 'TradesLine Draft v2 — Pre-Order Estimate Invoice'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A tradesperson can only show a customer a cost figure once a job reaches the final `invoice` stage — by then materials are already ordered and wholesalers contacted. There's no way to show a customer a ballpark cost up front, before committing to any of that.

**Approach:** Add a "Show customer estimate" view reachable from the Materials Needed stage (before the Pay/wholesaler-order action). It reuses the existing invoice card's visual structure but computes cost from cheapest-available pricing (no wholesaler chosen yet) plus the tradesperson's profile labour rate, and is visually marked as a non-final estimate, not a real invoice.

## Boundaries & Constraints

**Always:**
- New view only in `draft-v2/` — never touch `draft-v1/`.
- Reachable only from the `materials-needed` job stage, via a new button in `materialsNeededHTML`'s action area, above the existing "Pay" button.
- New `ui.viewingEstimate` boolean (transient, like `ui.addItemOpen`) toggles the job-detail body between the materials list and the estimate view; a "Back to materials" button clears it. Does not touch `job.status` — this is a view, not a stage transition.
- Pricing: materials use `estimateJobTotal`/`estimateLineTotal` (cheapest-option based — no wholesaler is chosen yet at this stage); labour line = `state.profile.labourRatePerJob` when set, else falls back to the job's existing preset `labourCost` (the per-hour rate has no "estimated hours" concept in this data model yet, so it isn't consumed here — deliberately out of scope, see Never).
- Visually distinct from the real invoice: badge reads "Estimate" using a new `.badge-estimate` CSS modifier (reuse existing `--warn`/`--warn-soft` tokens, not new colors), and a footer note states it isn't a final invoice.
- Reuse existing CSS vocabulary (`invoice-card`, `invoice-header`, `line-item`, `invoice-totals` families) — only the one new badge modifier is added.

**Ask First:** none expected — additive, no existing behavior changes.

**Never:** compute or expose an hours-based labour estimate (no "estimated hours" field exists — that's a future extension, not this spec); include the materials-cost include/exclude toggle (that's specific to the final invoice's labour-only billing option; the pre-order estimate always shows the full projected figure); touch `job.status`, `invoiceBreakdown`, or `invoiceHTML`; add an invoice number (this isn't a real invoice — use a "Prepared <date>" line instead).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open estimate | On Materials Needed, click "Show customer estimate" | Estimate card renders in place of the materials list, with materials (cheapest pricing) + labour + VAT + total | N/A |
| Profile labour rate set | `state.profile.labourRatePerJob` has a value | Estimate's labour line uses that value | N/A |
| Profile labour rate not set | `state.profile.labourRatePerJob` is `null` | Estimate's labour line falls back to `job.labourCost` (existing preset default) | N/A |
| Return to materials | On the estimate view, click "Back to materials" | `materialsNeededHTML` renders again, no data changed | N/A |
| Estimate view + material added/removed elsewhere | User backs out, edits materials, reopens estimate | Estimate reflects the current material list each time it's opened (not cached) | N/A |

</frozen-after-approval>

## Code Map

- `draft-v2/js/app.js:27-36` (`ui` transient state object) — add `viewingEstimate: false`.
- `draft-v2/js/app.js:98-107` (`estimateLineTotal`, `estimateJobTotal`) — reuse as-is for the estimate's materials pricing.
- `draft-v2/js/app.js:491-494` (`renderJobDetail`'s `case 'materials-needed':`) — branch on `ui.viewingEstimate`: render `estimateInvoiceHTML(job)` when true, `materialsNeededHTML(job)` otherwise.
- `draft-v2/js/app.js:659-680` (end of `materialsNeededHTML`, the `action-bar` block) — insert a `<button data-action="show-estimate" class="btn btn-secondary btn-block">Show customer estimate</button>` above the existing Pay button.
- `draft-v2/js/app.js:883-975` (`invoiceHTML`) — model `estimateInvoiceHTML(job)` on this structure (card/header/line-items/totals shape), substituting: `estimateLineTotal`/`estimateJobTotal` for pricing, `state.profile.labourRatePerJob || job.labourCost` for the labour line, "Estimate" badge (`.badge-estimate` class) instead of "Ready", a `<button data-action="hide-estimate">&larr; Back to materials</button>` at the top, "Prepared <date>" instead of an invoice-number row, and a footer note instead of the VAT-registration line — no materials-toggle row.
- `draft-v2/js/app.js:1265-1270` (`data-action` switch, `advance-status` case) — add `'show-estimate'` (`ui.viewingEstimate = true; render();`) and `'hide-estimate'` (`ui.viewingEstimate = false; render();`) cases.
- `draft-v2/css/styles.css:871-877` (`.invoice-badge`) — add `.invoice-badge.badge-estimate { color: var(--warn-ink); background: var(--warn-soft); }`.

## Tasks & Acceptance

**Execution:**
- [ ] `draft-v2/js/app.js` — `ui.viewingEstimate` state, `renderJobDetail` branch, `estimateInvoiceHTML(job)`, action-bar button, `show-estimate`/`hide-estimate` action wiring
- [ ] `draft-v2/css/styles.css` — `.badge-estimate` modifier

**Acceptance Criteria:**
- Given a job on Materials Needed, when "Show customer estimate" is clicked, then the estimate card renders with the current materials (cheapest pricing), labour line, VAT (13.5%), and total, badged "Estimate"
- Given the estimate view, when "Back to materials" is clicked, then the materials-needed screen renders unchanged (no wholesaler chosen, no status change)
- Given `state.profile.labourRatePerJob` is set to a value, when the estimate is shown, then the labour line equals that value, not the job's preset `labourCost`
- Given `draft-v1/` files, when this spec is implemented, then they remain byte-identical to their pre-implementation state

## Verification

**Manual checks (no build/test tooling in this static draft):**
- Serve `draft-v2/` locally, log in, set a per-job labour rate in Profile, start a job, click "Show customer estimate" — confirm the labour line matches the profile rate and the total is materials-cheapest + labour + VAT.
- Clear the profile's per-job rate, reopen the estimate — confirm the labour line falls back to the preset `labourCost`.
- Click "Back to materials", confirm the materials list is unchanged and no wholesaler/status was affected; confirm the real end-of-job Invoice screen (reached via the normal stage flow) is unaffected by this change.

## Spec Change Log

- **Live browser verification (2026-09-08):** set profile per-job rate to €500, started a "Full Rewire" job (preset `labourCost` €2,200), opened the estimate — labour line correctly showed €500 (the override), not the preset default. Materials summed to €491.87 (cheapest-option pricing), subtotal €991.87, VAT €133.90, total €1,125.77 — verified the arithmetic by hand, matches exactly. Badge computed style confirmed amber (`#92400e` on `#fef3c7`, the `--warn` tokens), visually distinct from the invoice's green "Ready" badge. "Back to materials" correctly restores the normal materials-needed view (add-material and Pay buttons present, estimate card gone) with no `job.status` change. No bugs found — implementation matched the spec on first pass.
