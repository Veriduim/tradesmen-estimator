---
title: 'TradesLine Draft v2 — Region at Signup, Preset Labour Rates, Editable Identity'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Profile's labour-rate fields start blank with no reference point, and there's no way to see or correct the name/business/trade-reg info captured once at signup — plus no signal that changing verification-relevant fields should mean something.

**Approach:** Add a region field to signup (Dublin/Cork/Galway/Limerick/Other); use trade+region to look up a researched preset labour rate (both per-hour and per-job), shown read-only with an Edit button that reveals it as an overridable input, pre-filled with the preset. Add a "Your Details" section to Profile showing name/business/trade-reg read-only with an Edit button; saving an edit sets a `pendingReview` flag that shows a persistent banner (UI-only — no real backend, matches the existing signup-attestation "theater" pattern).

## Boundaries & Constraints

**Always:** preset lookup falls back gracefully (no preset for Carpenter/General Builder → fields show "not set", user can still set a custom rate); the estimate invoice's labour line now falls back through profile-override → trade+region preset → the job preset's own flat `labourCost`, in that order; identity edits reuse the exact signup validation pattern (non-empty, inline errors, focus-on-fail).

**Never:** make `pendingReview` block anything — it's a persistent informational banner, not a real approval gate (no backend exists to approve/reject).

**Ask First:** none — additive, no existing behavior changes beyond the estimate's labour-line fallback (which only changes behavior for a signed-up trade/region that now has a preset, previously falling straight to the job's flat default).

</frozen-after-approval>

## Code Map

- `draft-v2/index.html` — added a `Region` `<select>` to signup (Dublin/Cork/Galway/Limerick/Other), required, same field-error pattern as the rest of the form.
- `draft-v2/js/data.js` — added `LABOUR_RATE_PRESETS` (trade → region → `{perHour, perJob}`), with a provenance comment disclosing exactly what's sourced (plumber per-region rates, Grafta 2026) vs. estimated (electrician per-region, all `perJob` figures — day-rate proxies).
- `draft-v2/js/state.js` — added `region` to `session`, `pendingReview` to `profile`.
- `draft-v2/js/app.js` — `handleLogin`/submit handler gained region validation + `state.session.region`; new `ratePreset(field)` helper; `identitySectionHTML()`/`rateSectionHTML()` (display-vs-edit-mode rendering, replacing the old always-editable rate inputs); `handleSaveProfileDetails()`; `edit-profile-details`/`cancel-edit-details`/`save-profile-details`/`edit-rates`/`done-edit-rates` action wiring; `estimateInvoiceHTML`'s labour-line fallback now checks the preset before the job's flat default; `open-job`/`leave-profile` reset the two new edit-mode `ui` flags alongside the existing ones.

## Verification

**Live browser verification (2026-09-08), no bugs found:**
- Signed up as Electrician/Cork with region left blank — submit correctly blocked with inline error; filled in Cork — signup succeeded.
- Profile showed "Rate per hour: €58.00 (Electrician preset)" / "Rate per job: €410.00 (Electrician preset)" — matches the Cork electrician preset in `data.js` exactly.
- Edited business name to "Byrne Electrical Ltd" — saved correctly, and the "Pending review" banner appeared. Tried saving with an empty Name field — correctly blocked, stayed in edit mode, inline error shown.
- Edit-rates mode correctly pre-filled both inputs with the preset values (58, 410); overrode per-hour to 70 and confirmed the display switched to "€70.00 (your rate)" while per-job stayed "(Electrician preset)" — per-field override tracked independently, as intended.
- Started a job, opened the customer estimate — labour line showed €410.00 (the region preset), not the job preset's own flat €480 default — confirms the fallback-chain priority (override → preset → job default) resolves correctly.
