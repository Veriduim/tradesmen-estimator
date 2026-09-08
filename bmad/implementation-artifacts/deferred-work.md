# Deferred Work

Append-only. Each entry: `source_spec`, `summary`, `evidence`.

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: No committed/reproducible automated test suite for the job-flow prototype.
  evidence: Implementation's claimed jsdom verification pass ran only from a scratchpad script outside the repo; no test file exists to rerun and confirm behavior after future edits (verification-gap + blind-hunter reviews, both independently).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: Currency math (line totals, subtotal, VAT) isn't rounded at intermediate steps, only at final display.
  evidence: Floating-point drift across many line items could produce off-by-a-cent inconsistencies before the final `Intl.NumberFormat` rounding (blind-hunter review).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: No way to delete, cancel, or archive a job once created.
  evidence: Job list only grows; not in original spec scope but a real gap for a usable demo across a longer session (blind-hunter review).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: Login email is captured but never displayed or used anywhere in the app.
  evidence: Header shows only `name`; `state.session.email` has no visible purpose (blind-hunter review).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: No favicon, meta description, or noscript fallback on `index.html`.
  evidence: Minor polish gap; app is fully inert without JS including the login screen itself (blind-hunter review).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: A job with a future `updatedAt` timestamp (clock skew) is mislabeled "Updated today".
  evidence: Negative day-diff falls into the same-day branch of the relative-time formatter (edge-case-hunter review). Low likelihood, cosmetic only.

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: `STATUS_ORDER`'s `job-details` enum value is never actually assigned to any job.
  evidence: `createJobFromPreset` sets new jobs directly to `materials-needed` (selecting a preset doubles as capturing job details, which is correct product behavior) but the dead enum value is a minor naming/cleanliness nit worth revisiting (blind-hunter + verification-gap, independently).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: Wholesaler-option rows and materials-list checkboxes aren't keyboard-navigable (no tabindex/role/keyboard handler).
  evidence: Delegated click-only listeners; keyboard-only users cannot choose a wholesaler or interact with material checkboxes (blind-hunter review).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: Toast confirmations have no `aria-live`/`role="status"`.
  evidence: Screen-reader users get no notification for "Payment confirmed", "Marked as delivered", etc. (blind-hunter review).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: Quantity input fields have no accessible label.
  evidence: Purpose only implied visually by adjacent +/- buttons (blind-hunter review).

- source_spec: `bmad/implementation-artifacts/spec-job-flow-prototype.md`
  summary: "Add material" fields aren't wrapped in a `<form>`, so pressing Enter doesn't submit.
  evidence: Forces mouse-only interaction to add a custom material (blind-hunter review). Superseded by `spec-dashboard-pricing-material-search.md`, which removed freeform add-material entirely in favor of a search picker.

- source_spec: `bmad/implementation-artifacts/spec-dashboard-pricing-material-search.md`
  summary: No debounce on the add-material search input; every keystroke re-renders the full materials list.
  evidence: Harmless at this catalog size (15 items) but redoes more work than necessary per keystroke (edge-case-hunter + blind-hunter, independently).

- source_spec: `bmad/implementation-artifacts/spec-dashboard-pricing-material-search.md`
  summary: `mcb-6a` and `mcb-20a` share an identical researched baseline price (€3.47) despite being different-rated breakers.
  evidence: Plausible (some retailers price single-pole MCBs flat regardless of rating) but worth a provenance footnote confirming it isn't a copy/paste artifact from the research pass (blind-hunter review).

- source_spec: `bmad/implementation-artifacts/spec-dashboard-pricing-material-search.md`
  summary: Legacy freeform (`catalogId: null`) materials from before this change aren't explicitly covered by the spec or verification checklist now that add-material is catalog-only.
  evidence: They still render fine and don't block re-adding the same-named catalog item, but the interaction wasn't tested (blind-hunter review). Low real-world impact for a prototype with no real user data at stake.

- source_spec: `bmad/implementation-artifacts/spec-dashboard-pricing-material-search.md`
  summary: Provenance comment claims every catalog entry's per-wholesaler options average exactly to the researched baseline; `socket-twin-switched` rounds to €2.78 but isn't exact (€2.7833...).
  evidence: Not user-visible (the app never displays an average), a documentation self-consistency nit only (verification-gap review).

- source_spec: none
  summary: Trade-scoped dashboard + job preset picker (Next.js rebuild) — job list and "Start a new job" preset picker filtered by the signed-up user's trade.
  evidence: Split from the combined TradesLine-rebuild intent at bmad-build's multi-goal check (2026-09-06) — depends on the Foundation + Signup spec's User/session model but is itself an independently reviewable/shippable slice; user chose to split rather than build all goals in one pass.

- source_spec: none
  summary: Job detail flow (Next.js rebuild) — 7-stage lifecycle stepper, Materials Needed / Wholesaler Selected screens, materials/wholesaler catalog with Eircode routing-key delivery matching.
  evidence: Split from the combined TradesLine-rebuild intent at bmad-build's multi-goal check (2026-09-06) — the largest single chunk of the rebuild; depends on the dashboard existing to be reached, but is its own reviewable unit (per ARCHITECTURE-SPINE.md AD-1, AD-2, AD-3, AD-7).

- source_spec: none
  summary: Wholesaler message log (Next.js rebuild) — append-only note per (job, wholesaler) pair, no real email sending.
  evidence: Split from the combined TradesLine-rebuild intent at bmad-build's multi-goal check (2026-09-06) — small but genuinely separable; the job flow works without it (per ARCHITECTURE-SPINE.md AD-4).

- source_spec: none
  summary: Invoice generation (Next.js rebuild) — materials-cost include/exclude toggle, EUR, 13.5% VAT, computed server-side from snapshotted JobMaterial prices.
  evidence: Split from the combined TradesLine-rebuild intent at bmad-build's multi-goal check (2026-09-06) — depends on the job flow's data existing, but is its own reviewable unit (per ARCHITECTURE-SPINE.md AD-5, AD-7).

- source_spec: `bmad/implementation-artifacts/spec-tradesline-draft-v2.md`
  summary: Profile page (draft-v2) — personal materials warehouse (leftover/unused materials list, add/remove) plus labour-cost settings (rate per hour and rate per job).
  evidence: Split from the combined draft-v2 intent at bmad-build's spec token-size checkpoint (2026-09-08, spec ran ~2,200-2,800 tokens vs. the 900-1600 target). Correction: the build agent decided the split itself without pausing at this checkpoint for human input as the workflow requires; the user was not consulted at the time. Reviewed and retroactively approved by the user after the fact (2026-09-08), once shown the completed signup-verification slice and the deferral of this goal. No dependency on the signup-verification goal being built first; builds on the same `draft-v2/` copy.

- source_spec: `bmad/implementation-artifacts/spec-tradesline-draft-v2.md`
  summary: Pre-order estimate invoice (draft-v2) — customer-facing cost estimate (materials subtotal + labour line + VAT) reachable from the materials-needed stage, before wholesaler selection.
  evidence: Split from the combined draft-v2 intent at bmad-build's spec token-size checkpoint (2026-09-08). Correction: the build agent decided the split itself without pausing at this checkpoint for human input as the workflow requires; the user was not consulted at the time. Reviewed and retroactively approved by the user after the fact (2026-09-08). Depends on the Profile goal above (its labour-rate fields feed the estimate's labour line) — build after Profile, not standalone.

- source_spec: `bmad/implementation-artifacts/spec-tradesline-draft-v2-profile.md`
  summary: Profile page (draft-v2) — personal materials warehouse section (leftover/unused materials list: name, qty, note; add/remove) as a second section on the same Profile screen.
  evidence: Split from the Profile spec at bmad-build's token-size checkpoint (2026-09-08) — user chose [S] Split. The Profile spec builds only the screen shell + labour-rate fields; this section is independently addable afterward with no dependency on the estimate-invoice goal.

- source_spec: `bmad/implementation-artifacts/spec-tradesline-draft-v2.md`
  summary: Login form validates and surfaces only the first failing field per submit (pre-existing single-field pattern, now amplified across 4 required fields — business name, trade reg number, attestation checkbox, plus the original name field), forcing repeated resubmits to discover each subsequent error.
  evidence: blind-hunter review (2026-09-08) — the pattern predates this change (single required `name` field) but the added fields make its UX cost materially worse; the spec's Code Map explicitly directed following the existing pattern, so this isn't a deviation to patch, just a pre-existing design choice worth revisiting.

- source_spec: `bmad/implementation-artifacts/spec-tradesline-draft-v2.md`
  summary: No visual "required" labeling on Name, Business name, Trade reg number, or the attestation checkbox (only Email is marked "(optional)"), so a user can't tell which fields are mandatory before submitting.
  evidence: blind-hunter review (2026-09-08) — pre-existing gap on the original Name field, now present on 3 more fields.

- source_spec: `bmad/implementation-artifacts/spec-tradesline-draft-v2.md`
  summary: `handleLogin`'s error-element `getElementById` lookups (now 4 of them) have no null-guards — if any id/error-element pair ever drifts from the markup, the login handler throws.
  evidence: blind-hunter review (2026-09-08) — pre-existing fragility on the original name-error lookup, now tripled by the new fields; low likelihood (ids are co-located and easy to keep in sync) but a real latent risk.

- source_spec: `bmad/implementation-artifacts/spec-tradesline-draft-v2.md`
  summary: The new business-name, trade-reg, and attestation fields have no `aria-describedby` linking them to their `field-error` paragraph, so screen-reader users aren't told why validation failed beyond focus moving to the field.
  evidence: blind-hunter review (2026-09-08) — pre-existing gap on the original name field, now duplicated 3x; a prior session already patched a similar accessibility gap on the material-removal confirm popup (SESSION-HANDOFF.md), so this is a known category of debt in this codebase worth a dedicated pass.
