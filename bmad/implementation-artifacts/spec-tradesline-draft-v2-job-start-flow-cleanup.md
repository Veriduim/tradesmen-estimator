---
title: 'TradesLine Draft v2 — New Job-Start Flow, Warehouse/Materials-Needed Cleanup'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Five client-review items, the largest being a real flow restructure (confirmed with the user before building): the dashboard's job-preset grid becomes a single "+ Start a Job" button; clicking it opens a new pre-creation intake screen collecting Customer Name, Customer Address, then Job Select — a job is only created once a preset is picked there, landing directly on Materials Needed. This retires the old post-creation `job-details`/address-entry stage entirely (its whole purpose — collecting address — now happens earlier), and `STATUS_ORDER` drops from 7 stages to 6 rather than leave a phantom "already done" first stepper dot on every job.

Plus: removed the last decorative (non-functional) material checkbox, on Materials Needed; added "Cancel job" to the bottom of Materials Needed (previously only reachable via the estimate sub-view); reordered the warehouse's add-material form above the items list and restructured it from a cramped 3-field horizontal row to stacked full-width fields (the reported "messy on phone" layout); investigated a reported heading-clipping bug on the old address page (see Verification — not reproducible post-restructure).

## Boundaries & Constraints

**Always:** `createJobFromPreset` validates customer name + address (required, inline errors, matches every other required-field pattern in the app) before creating anything — no half-filled job is ever created; `job.customerName` now drives the primary heading on the job card, invoice, and estimate (previously address held that role); `STATUS_ORDER`/`STATUS_LABELS` no longer carry `job-details` — `stepperHTML`/`stageCaption` derive "Step N of {length}" dynamically, so this needed no other numbering changes.

**Never:** leave the retired job-details render path in place as unreachable dead code — deleted `jobDetailsHTML`, `handleSaveJobAddress`, and their action-cases outright (this session's own work, not inherited debt, so no reason to preserve it "just in case").

</frozen-after-approval>

## Code Map

- `draft-v2/js/state.js` — `STATUS_ORDER` drops `'job-details'` (6 entries now); `startingNewJob` added to `defaultState()`/shape doc; `customerName` added to the job shape doc.
- `draft-v2/index.html` — `#job-presets` div replaced with a `+ Start a Job` button; new `#screen-new-job` section; job-detail topbar gained `#job-detail-customer`.
- `draft-v2/js/app.js` — `STATUS_LABELS` drops `'job-details'`; `renderJobPicker` no longer renders presets; new `presetCardsHTML()` (extracted, trade-scoped) and `newJobIntakeHTML()`; `createJobFromPreset` now validates + reads customer name/address from the intake screen, sets `job.customerName`, starts `status: 'materials-needed'` directly; `render()`/`showScreen()` gained the `startingNewJob` routing branch; `go-new-job`/`leave-new-job` actions; `use-example-address` retargeted to the new screen's address field; `handleLogout` now also resets `viewingProfile`/`startingNewJob` (pre-existing gap, fixed while touching this area).
- `draft-v2/js/app.js` — deleted `jobDetailsHTML`, `handleSaveJobAddress`, the `'job-details'` render-switch case, and `'save-job-address'` action (all fully unreachable post-restructure); kept `EXAMPLE_ADDRESSES`, reused by the new screen.
- `draft-v2/js/app.js` (`jobCardHTML`, `invoiceHTML`, `estimateInvoiceHTML`) — primary heading now `job.customerName` (was address); address moved to the secondary line alongside job type.
- `draft-v2/js/app.js` (`materialsNeededHTML`) — removed the decorative `<div class="checkbox">` (the last one left in the app — wholesaler-selected's is functional, materials-delivered's is an intentional "already delivered" indicator, neither touched); added a "Cancel job — customer declined" button to the action bar.
- `draft-v2/js/app.js` (`warehouseSectionInnerHTML`) — add-form (search + Quantity/Note fields, now `.field`-labeled and stacked, not a cramped flex row) now renders before the items list, not after.
- `draft-v2/css/styles.css` — removed the now-dead `#warehouse-add-name`/`#warehouse-add-qty`/`#warehouse-add-note` ID rules (`.warehouse-add-row` itself is still used by the invoice-edit's extra-charge row, kept with a generic `input { flex: 1 }` rule).

## Verification

**Live browser verification (2026-09-09), no bugs found:**
- New-job flow: "+ Start a Job" → intake screen with 3 trade-scoped preset cards; submitting a preset with no name blocked (inline error), with name but no address blocked (separate inline error), "Use example address" + valid name → job created directly at "Step 1 of 6 · Materials Needed" (confirmed 6-step, not 7), header showed "For John Murphy" correctly.
- Customer name confirmed as the primary heading on: the dashboard job card, the customer estimate, and (read via the same shared template) the final invoice.
- Materials Needed: confirmed zero decorative checkboxes remain (`document.querySelectorAll('.mat-row .checkbox').length === 0`); confirmed the wholesaler-selected screen's functional received-checkbox and materials-delivered's checked-indicator were untouched (grepped both remaining `.checkbox` usages). "Cancel job" present in the action bar and confirmed working end-to-end (confirm modal → job removed → back on dashboard).
- Warehouse: confirmed via DOM order that the search/add-form renders before the items list; full add flow (search → pick → qty/note → Add) still works correctly with the new stacked layout.
- **Heading-clipping investigation:** simulated a real phone width (360px, below the app-shell's actual minimum) and stress-tested with a deliberately long customer name/address ("Christopher O'Sullivan-Fitzgerald", a full long street address) — no clipping reproduced on any job-detail heading (`scrollHeight`/`scrollWidth` matched `offsetHeight`/`clientWidth` exactly in every case). The one real truncation point found (`.app-header-user`, ellipsis on a long name) is intentional, prevents the header's Profile/Log out buttons being pushed off-screen, and is not a "heading." Since the specific screen the clipping was reported on (the old post-creation address page) has been completely rebuilt by this same pass, the most likely explanation is this already resolved it as a side effect — flagged to the user to recheck on the live site rather than guessing further at an unreproducible bug.
