---
title: 'TradesLine Draft v2 — Job-State Dashboard Buckets, Editable Invoice, PDF Export'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Two client-review items needing real design decisions (proposed and confirmed with the user before building). (1) The dashboard only ever groups jobs as Active/Completed — there's no visibility into "materials are on order" or "invoiced but not yet paid." (2) The final invoice is a static, uneditable snapshot with no way to download it or adjust it for labour/material changes discovered after the job was quoted.

**Approach:** (1) Keep the 7-stage stepper untouched; split the dashboard/Profile job list into 4 groups instead of 2 — Active, **Pending Materials** (the existing `wholesaler-selected` stage, relabeled and given its own bucket), **Pending Customer Payment** (invoice generated, not yet paid — new `job.customerPaid` flag), and Completed (paid). (2) Add an Edit mode to the invoice screen (labour cost, ad-hoc extra-charge line items, a notes field) plus a browser print-to-PDF "Download PDF" button on both the estimate and final invoice. Editing locks once "Mark as Paid" is clicked — there's no real "send" step in this draft, so payment is treated as the point past which the invoice is final.

## Boundaries & Constraints

**Always:** `groupJobsByBucket(jobs)` is the single source of truth for the 4-way split, used by both the dashboard and Profile job lists — never re-derived separately; extra charges are ad-hoc `{id, description, amount}` line items, not routed back through `MATERIAL_CATALOG`/wholesaler selection (that flow already happened for this job); the print stylesheet hides all app chrome (`[data-no-print]`, `.app-header`, `.topbar`, `.stepper`, `.stage-caption`, `.back-link`) so only the invoice/estimate card prints.

**Never:** let extra-charge/labour/notes edits after "Mark as Paid" — the invoice locks (no Edit Invoice button renders) once paid; add a real PDF-generation library (confirmed with the user: browser print-to-PDF only, zero new dependencies).

</frozen-after-approval>

## Code Map

- `draft-v2/js/app.js` (`jobCardHTML`) — badge/meta logic now branches on `isPaid`/`isPendingPayment`/`isPendingMaterials` instead of a single `isCompleted` check.
- `draft-v2/js/app.js` (new `groupJobsByBucket(jobs)`) — shared 4-way filter, used by both `renderJobPicker` and `renderProfile`.
- `draft-v2/js/app.js` (`STATUS_LABELS`) — `wholesaler-selected` relabeled "Pending Materials" (was "Wholesaler Selected") so the stepper caption and dashboard badge agree.
- `draft-v2/css/styles.css` — new `.status-badge-warn` (amber, `--warn` tokens) for the two "pending" badges.
- `draft-v2/js/app.js` (job creation) — added `customerPaid: false`, `extraCharges: []`, `invoiceNotes: ''`.
- `draft-v2/js/app.js` (`invoiceBreakdown`) — subtotal now includes `extraChargesTotal`.
- `draft-v2/js/app.js` (`invoiceHTML`) — dispatches to new `invoiceEditHTML(job)` when `ui.editingInvoice`; badge reflects paid/awaiting-payment; renders extra-charge lines and a notes block when present; action buttons (`Edit Invoice`/`Download PDF`/`Mark as Paid`) only show the first two once paid.
- `draft-v2/js/app.js` (new `invoiceEditHTML`, `handleSaveInvoiceEdit`, `handleAddExtraCharge`, `handleRemoveExtraCharge`, `handleMarkPaid`, `withPreservedInvoiceEditFields`) — edit form + handlers; `estimateInvoiceHTML` gained a matching "Download PDF" button.
- `draft-v2/css/styles.css` — `@media print` block; `.invoice-notes` style.

## Verification

**Live browser verification (2026-09-09):**
- Ran a job through to Invoice — dashboard correctly showed it under "Pending Customer Payment" with an amber badge and "€X due".
- **Found and fixed a real bug:** adding an extra charge triggered a full re-render of the edit form, silently resetting an already-typed (unsaved) labour-cost value back to the job's old value — same class of bug as the earlier Profile rate-fields fix. Fixed with `withPreservedInvoiceEditFields`, which captures and restores the labour/notes inputs around any re-render triggered by something else on the same screen. Re-verified: editing labour to €380, adding a €25 extra charge, then saving — labour correctly stayed €380, and the total (€380 + €51.99 materials + €25 extra = €456.99, +13.5% VAT = €518.68) matched exactly.
- Clicked "Mark as Paid" — badge changed to "Paid", both "Edit Invoice" and "Mark as Paid" correctly disappeared (locked), "Download PDF" remained. Dashboard correctly moved the job to "Completed" showing "€518.68 paid".
- Confirmed `window.print()` fires from the "Download PDF" button (mocked `window.print` and verified the call) on both the estimate and final invoice screens.
