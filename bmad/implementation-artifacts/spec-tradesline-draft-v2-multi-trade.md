---
title: 'TradesLine Draft v2 — Multi-Trade Signup + Plumber Content'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
  - bmad/planning-artifacts/ux-designs/ux-tradesmen-estimator-2026-08-25/EXPERIENCE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `draft-v2` has no trade concept at all — signup has no trade field, and the entire catalog (materials, wholesalers, job presets) is hardcoded electrician-only, so no other tradesperson can use the app meaningfully.

**Approach:** Add a trade selector to signup (chip-style, matching the already-ratified `mockups/signup.html`), trade-scope the dashboard's preset picker and the materials-needed add-item search, and add a second full trade — Plumber — with its own researched job presets, materials, and wholesalers (Heat Merchants, Davies, PTS Plumbing Trade Supplies — real Irish plumbing merchants, verified via web research; material pricing from Screwfix UK converted at ~1.16 GBP→EUR, same convention as the existing electrician data, disclosed as illustrative). Electrician and Plumber are the only trades with real content this pass; Carpenter and General Builder are signup-selectable (per EXPERIENCE.md) but show a "no presets yet" empty state — building their content is a separate future pass, not this spec.

## Boundaries & Constraints

**Always:**
- New work only in `draft-v2/` — never touch `draft-v1/` or root's promoted copy (root gets re-synced from `draft-v2/` only when explicitly promoted, not as part of this spec).
- Trade selector: 4 chips (Electrician, Plumber, Carpenter, General Builder) per EXPERIENCE.md's ratified fixed list, inserted between Name and Business name in the login form. Single-select, required — matches the existing required-field validation pattern (inline error, focus-on-fail).
- `state.session` gains `trade` (one of the 4 values). Stored, never geo/address-scoped (that's second-phase per ARCHITECTURE-SPINE.md AD-2).
- Every `MATERIAL_CATALOG` entry (existing electrician ones included) gets a `trade` field so the add-item search can filter by the current job's trade.
- Every `JOB_PRESETS` entry gets a `trade` field; the dashboard's "Start a new job" list filters to `state.session.trade`.
- New Plumber wholesalers/materials/presets are additive — existing electrician `WHOLESALERS`/`MATERIAL_CATALOG`/`JOB_PRESETS` entries and their ids are unchanged.
- Job objects gain a `trade` field (copied from the preset at creation) so per-job material search can filter correctly regardless of the signed-in user's current trade.
- Carpenter/General Builder selectable at signup; dashboard preset list shows an empty-state message ("No presets yet for &lt;trade&gt; — check back soon") rather than falling back to another trade's presets or erroring, per EXPERIENCE.md's already-ratified fallback.
- Data provenance: new Plumber content's mock-data comment discloses what's verified (wholesaler names, 15mm/22mm copper pipe price, 15mm stopcock/valve price) vs. reasoned-estimate (fittings, cylinder, immersion element, PTFE tape, lagging, tap, and all three job presets' labour costs) — same honesty standard as the existing electrician provenance comment.

**Ask First:** none expected — additive content and an established, already-ratified UX pattern (chips from the mockup).

**Never:** build Carpenter/General Builder catalog content in this pass; add address/Eircode/geo-matching to signup (still second-phase per AD-2); let trade selection be edited after signup (EXPERIENCE.md: "not editable after signup in this draft" — the Profile-overhaul work, separately scoped, is where identity-field editing gets designed).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sign up as Plumber | All fields valid, "Plumber" chip selected | Dashboard shows plumbing presets (Bathroom Re-plumb, Cylinder/Immersion Swap, Tap & Valve Replacement) | N/A |
| Sign up, no trade chosen | Other fields valid, no chip selected | Blocked, inline error under the trade group, matching other required-field pattern | N/A |
| Sign up as Carpenter or General Builder | Valid otherwise | Dashboard renders with the trade's name in the header/caption but an empty "No presets yet" state instead of a preset list | N/A |
| Plumber job's add-material search | On Materials Needed for a plumbing job, open add-item | Search results show only plumbing materials, never electrician ones | N/A |
| Existing electrician flow | Sign up as Electrician | Behaves exactly as before this spec (same 3 presets, same materials/wholesalers) | N/A |

</frozen-after-approval>

## Code Map

- `draft-v2/index.html:31-38` (between the Name field and Business-name field) — insert the trade-chip group markup: a `<div class="field">` with a `field-label`, a `<div class="trade-group" id="login-trade-group">` containing 4 `<button type="button" class="trade-chip" data-trade="electrician">Electrician</button>`-style buttons (electrician, plumber, carpenter, general-builder), a hidden `<input type="hidden" id="login-trade" />` to hold the selected value for submit-time reading (mirrors how other fields are read via `document.getElementById(...).value`), and a `field-error` paragraph.
- `draft-v2/css/styles.css` (near `.field`/`.btn` rules, ~line 174-215) — add `.trade-group` (flex, wrap, gap) and `.trade-chip`/`.trade-chip.selected` using existing tokens (`--border`, `--ink-dim`, `--accent-soft`, `--accent`, `--accent-dark`) per the ratified mockup's colors.
- `draft-v2/js/app.js:1240-1295` (`handleLogin`) — add a `trade` parameter, validate non-empty (same clear-errors-up-front / focus-on-fail pattern as the other 3 fields, inserted after the trade-reg-number check), add `trade: trimmedTrade` to the `state.session` object.
- `draft-v2/js/app.js` (`init`'s login-form submit + a new click handler for `.trade-chip`) — click handler toggles `.selected` on the clicked chip, clears it from siblings, sets `#login-trade`'s value; submit handler reads `document.getElementById('login-trade').value` alongside the other fields.
- `draft-v2/js/state.js:7-9` (state-shape doc) — add `trade` to the `session` shape.
- `draft-v2/js/data.js` — add `trade` field to every existing `MATERIAL_CATALOG` and `JOB_PRESETS` entry (`'electrician'`); add new `WHOLESALERS` entries (`heatmerchants`, `davies`, `pts`), new `MATERIAL_CATALOG` entries for plumbing materials (each with `trade: 'plumber'`), and 3 new `JOB_PRESETS` entries (Bathroom Re-plumb / Cylinder & Immersion Swap / Tap & Valve Replacement, each `trade: 'plumber'`) — full content authored during implementation per the Boundaries' provenance rules, not enumerated here.
- `draft-v2/js/app.js:383-431` (`createJobFromPreset`) — copy `preset.trade` onto the created `job.trade`.
- `draft-v2/js/app.js:331-381` (`renderJobPicker`) — filter `JOB_PRESETS` to `state.session.trade` before rendering the preset list; when the filtered list is empty, render an empty-state message instead of the preset grid.
- `draft-v2/js/app.js:689-708` (`filteredMaterialResultIds`) — filter `Object.keys(MATERIAL_CATALOG)` to entries whose `trade` matches `job.trade` before the existing already-added/query filters.

## Tasks & Acceptance

**Execution:**
- [ ] `draft-v2/index.html` — trade-chip group markup + hidden input + error paragraph
- [ ] `draft-v2/css/styles.css` — `.trade-group`/`.trade-chip` styles
- [ ] `draft-v2/js/state.js` — `session.trade` in the shape doc
- [ ] `draft-v2/js/data.js` — `trade` field on all existing entries; new Plumber wholesalers, materials, presets with disclosed provenance comment
- [ ] `draft-v2/js/app.js` — trade-chip click handling, `handleLogin` validation + session field, `createJobFromPreset` trade copy, `renderJobPicker` trade-filtering + empty state, `filteredMaterialResultIds` trade-filtering

**Acceptance Criteria:**
- Given signup with no trade chip selected, when submitted, then a trade-specific inline error shows and no session is created
- Given a Plumber signup, when the dashboard renders, then only the 3 plumbing presets show, never electrician ones
- Given a Carpenter or General Builder signup, when the dashboard renders, then an empty-state message shows instead of a preset list or an error
- Given an Electrician signup, when the dashboard and a job's add-material search are used, then behavior is unchanged from before this spec
- Given `draft-v1/` files, when this spec is implemented, then they remain byte-identical to their pre-implementation state

## Design Notes

Plumber wholesaler/material provenance (verified via web research, 2026-09-08): **Heat Merchants** (largest ROI plumbing merchant, 47 locations) and **Davies** (Dublin merchant, Grafton Group — same parent as Chadwicks) are real, well-established; **PTS Plumbing Trade Supplies** has only one ROI branch (Dublin/Ballymount) — mirrors CEF's "smaller/leaner" role in the electrician set. Verified pricing: 15mm copper pipe £4.91/m, 22mm copper pipe ~£10/m, 15mm stopcock/isolation valve £4.63 (Screwfix). Reasoned estimates (no direct source found, flagged in the data.js comment same as the fork's own disclosure): compression fittings ~£1.50, indirect vented cylinder 150-180L ~£150-300 (unvented runs far higher, not the right class of product), immersion element ~£20, PTFE tape ~£0.75/roll, pipe lagging ~£1.50/m, mixer tap ~£40. Job-preset labour costs (Bathroom Re-plumb ~€2,400, Cylinder/Immersion Swap ~€450, Tap & Valve Replacement ~€220) are reasoned estimates scaled against the electrician presets' tiers, not sourced Irish plumber day-rate data — disclose this the same way in the data.js comment.

## Verification

**Manual checks (no build/test tooling in this static draft):**
- Serve `draft-v2/` locally, sign up as Plumber — confirm dashboard shows only the 3 plumbing presets, start "Bathroom Re-plumb", confirm materials-needed shows plumbing materials with plausible pricing, and add-item search never surfaces electrician materials.
- Sign up as Carpenter — confirm the empty-state message renders, no error, no electrician presets leak through.
- Sign up as Electrician — confirm dashboard/materials/add-item search are identical to pre-spec behavior.
- Confirm the trade-chip group's required-field validation (submit with nothing selected) matches the existing 3 fields' inline-error/focus pattern.

## Spec Change Log

- **Live browser verification (2026-09-08), no bugs found:** signed up as Plumber — dashboard showed exactly the 3 plumbing presets; started "Bathroom Re-plumb" — materials-needed listed all 7 plumbing materials correctly (15mm/22mm copper pipe, isolation valve, compression elbow, mixer tap, pipe lagging, PTFE tape); add-item search showed only the 2 not-yet-added plumbing materials (cylinder, immersion element), zero electrician leakage. Signed up as Carpenter — empty-state message rendered ("No presets yet for Carpenter — check back soon"), no error, no leaked presets. Signed up with no trade chip selected — submit correctly blocked, inline error shown. Signed up as Electrician — dashboard and add-item search behaved identically to pre-spec (3 original presets, zero plumbing leakage). All cross-trade isolation and reference integrity (every `JOB_PRESETS`/`MATERIAL_CATALOG` cross-reference) verified programmatically before browser testing.
