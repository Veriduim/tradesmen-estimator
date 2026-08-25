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
  evidence: Forces mouse-only interaction to add a custom material (blind-hunter review).
