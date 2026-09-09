---
title: 'TradesLine Draft v2 — Job-Address Screen and Materials-Order Page Fix'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Two client-review items. (1) A job is created straight from a preset with a hardcoded address baked in — there's no address-entry step, which also matters for future groundwork (e.g. floorplans). (2) The materials-order (wholesaler-selected) screen's checkboxes were pure decoration (no click handler at all), and "Mark Delivered" was a single all-or-nothing button — confirmed as a real bug, not a misunderstanding.

**Approach:** (1) `job-details` — the first `STATUS_ORDER` stage, defined but never actually used (jobs skipped straight to `materials-needed`) — becomes the real address-entry screen: a text field, a "Use example address" quick-fill (random pick from a small pool), and Continue. (2) Materials-order checkboxes become real, per-material `received` toggles; "Mark Delivered" is disabled until every item is checked off; each material also shows a mocked "Requested via email — <wholesaler> — <when>" line, simulating proof that an order request went out.

## Boundaries & Constraints

**Always:** `job.address` starts empty at creation (no longer copied from the preset) and is only set via the new screen; the contact-log line's timestamp (`job.materialsOrderedAt`) is set once, in `handlePay()`, not per-checkbox-toggle; `advance-status` respects a disabled button (added the same `!el.disabled` guard the `pay` action already had — was missing, now consistent).

**Never:** add a real address autocomplete/geocoding service (still second-phase per AD-2); make the "Requested via email" log editable or persist a full message thread (that's the deferred second-phase `WholesalerMessage` design) — this is a mocked confirmation line only.

</frozen-after-approval>

## Code Map

- `draft-v2/js/app.js` (`createJobFromPreset`) — `job.address` starts `''`; `job.status` starts `'job-details'` (was `'materials-needed'`).
- `draft-v2/js/app.js` — new `jobDetailsHTML(job)`, `EXAMPLE_ADDRESSES` pool, `handleSaveJobAddress()`; `use-example-address`/`save-job-address` action wiring; `renderJobDetail`'s switch gained a `case 'job-details'`; the job-detail subheader omits the `· ` separator when address is still empty.
- `draft-v2/js/app.js` (material creation in `createJobFromPreset` and `handleAddItemPick`) — added `received: false`.
- `draft-v2/js/app.js` — new `allMaterialsReceived(job)`, `requestedTimeLabel(ts)`, `handleToggleReceived(materialId)`; `handlePay()` sets `job.materialsOrderedAt`.
- `draft-v2/js/app.js` (`wholesalerSelectedHTML`) — rewritten: checkboxes are now `<button data-action="toggle-received">`, each row shows the contact-log line, "Mark Delivered" is `disabled` until all received with an inline progress note.
- `draft-v2/css/styles.css` — `.checkbox` gained button-appearance resets (`background:none`, `padding:0`); new `.contact-log` style.

## Verification

**Live browser verification (2026-09-08), no bugs found:**
- Created a job — landed on "Step 1 of 7 · Job Details" with an empty address field; clicking Continue with nothing entered correctly blocked with an inline error. "Use example address" filled a real address ("22 Orchard Close, Waterford" in one run), Continue advanced to Materials Needed and the address showed correctly everywhere (job subheader, dashboard job card).
- Chose wholesalers for all 5 materials on a job, paid — landed on the materials-order screen with "Mark Delivered" correctly disabled and every material showing "Requested via email · Chadwicks Electrical · today".
- Checked items off one at a time — count and gating note updated live each click; button stayed disabled until all 5 were checked, then correctly enabled. Unchecking one item re-disabled it. Re-checked and clicked "Mark Delivered" — correctly advanced to "Step 4 of 7 · Materials Delivered".
