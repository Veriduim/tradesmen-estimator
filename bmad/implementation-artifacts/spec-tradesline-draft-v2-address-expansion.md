---
title: 'TradesLine Draft v2 — Expanded Irish Address Fields, Example Fills, New-Job Layout Fix'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
  - bmad/implementation-artifacts/spec-tradesline-draft-v2-job-start-flow-cleanup.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Client follow-up on the new job-intake screen shipped in the prior batch: the single-line "Customer address" field is replaced with a realistic Irish address (Address line 1, Address line 2 optional, County, Eircode, Country), matching what the real app will eventually need, with a "Use example address" dummy-fill button (as before) plus a new "Use example name" button for Customer name. Confirmed with the user (AskUserQuestion) that the same treatment — a new Business Address block, same structure, own dummy-fill button — should be added to the sign-up form too, which had no address field at all before this pass.

Also fixes a second reported bug on the same intake screen: fields and buttons ran edge-to-edge on a narrow phone with no surrounding "box"/padding, unlike every other job-detail-body section (materials list, add-item form, action bar, status panel), which all supply their own 16px horizontal padding. The new-job screen never had that wrapper.

## Boundaries & Constraints

**Always:** the structured address (line1/line2/county/eircode/country) is formatted into a single display string (`formatAddress()`) at the point a job or session is created — every existing consumer of `job.address` (job card, invoice, estimate, topbar) and the profile's business info keep working unchanged, since they still only ever see a plain string. Country is appended to the formatted string only when it isn't "Ireland" (the default for almost every real case) — printing "Co. Dublin, D08 X2C9, Ireland" on every single job would be noise; "Co. Antrim, BT1 1AA, United Kingdom" is the case where naming the country actually matters.

**Never:** let the county/country `<select>` lists drift between the two forms — `IRISH_COUNTIES`/`COUNTRY_OPTIONS` in `data.js` are the single source for the JS-rendered new-job screen; the sign-up screen is static HTML (unlike job screens, which are all `innerHTML`-templated) so its `<option>` list is hand-written to match, not generated — a future edit to the county list must update both.

</frozen-after-approval>

## Code Map

- `draft-v2/js/data.js` — added `IRISH_COUNTIES` (32 counties, flat alphabetical list, not filtered by country) and `COUNTRY_OPTIONS` (`Ireland` / `Northern Ireland` / `United Kingdom`).
- `draft-v2/js/app.js` — `EXAMPLE_ADDRESSES` restructured from flat strings to `{line1, line2, county, eircode, country}` objects; added `EXAMPLE_CUSTOMER_NAMES` and `EXAMPLE_BUSINESS_ADDRESSES` pools; added `formatAddress(parts)`, `countyOptionsHTML(selected)`, `countryOptionsHTML(selected)` helpers.
- `draft-v2/js/app.js` (`newJobIntakeHTML`) — Customer address expanded to line1/line2/county-select/eircode/country-select; whole screen now wrapped in `.new-job-form` for padding; added the "Use example name" button.
- `draft-v2/js/app.js` (`createJobFromPreset`) — reads the 5 structured fields (was 1), validates name/line1/county/eircode (line2 and country always have a value — country defaults to Ireland, so neither blocks submission), formats them via `formatAddress()` into the same `job.address` string shape as before.
- `draft-v2/js/app.js` — `use-example-address` (new-job screen) now fills all 5 sub-fields from a random `EXAMPLE_ADDRESSES` entry; new `use-example-name` (new-job screen) and `use-example-business-address` (sign-up screen) actions.
- `draft-v2/js/app.js` (`handleLogin`) — signature grew 5 address parameters (line1/line2/county/eircode/country); validates line1/county/eircode the same way every other required login field is validated; formats them into `session.businessAddress` via the same `formatAddress()` helper. Trade and region remain the only genuinely un-editable-after-signup fields — business address follows the existing name/businessName/tradeRegNumber pattern and is not added to the Profile screen's edit form, matching that precedent rather than expanding it.
- `draft-v2/js/state.js` — `session` shape doc gained `businessAddress`.
- `draft-v2/index.html` — sign-up form gained a "Business address" block (line1/line2/county-select/eircode/country-select, county list hand-written to match `IRISH_COUNTIES`) between Business name and Trade registration number, with its own "Use example address" button; login submit handler passes the 5 new fields through in order.
- `draft-v2/css/styles.css` — added `.field-group-label` (sub-heading inside a form, e.g. "Customer address"/"Business address") and `.field-row`/`.field-row .field` (the County+Eircode side-by-side pair, `min-width: 0` so neither input can force the row wider than its card); added `.new-job-form` (16px horizontal padding + 14px vertical gap) wrapping the whole new-job intake screen — the fix for the edge-to-edge/clipping bug.

## Verification

**Live browser verification (2026-09-09), no bugs found**, via `python -m http.server` against `draft-v2/` with a simulated 360px phone width (`.app-shell` forced narrow via injected `<style>`, since the browser-automation `resize_window` tool doesn't actually resize the viewport in this environment):
- Bounding-box overflow check (every element inside `.app-shell` compared against the shell's own edges — not the flawed body-vs-viewport comparison used in the prior investigation) returned zero offending elements on both the sign-up screen and the new-job intake screen at 360px.
- Sign-up: filled all required fields, clicked "Use example address" for the new Business Address block — correctly filled all 5 sub-fields from `EXAMPLE_BUSINESS_ADDRESSES`; submitted successfully; `session.businessAddress` confirmed formatted correctly.
- New-job screen: "Use example name" and "Use example address" both fill correctly; validation confirmed step-by-step (blocks with no name → blocks with name but no address line 1 → blocks with line 1 but no county → blocks with county but no Eircode → succeeds once all four are present, Address line 2 and Country never block since they default/aren't required).
- Confirmed `formatAddress()`'s two branches: default-Ireland case renders as "45 Elm Court, Co. Dublin, D08 X2C9" (no trailing country, line 2 omitted when blank) on the job-detail topbar, the estimate, and the job card; a manually-entered non-Ireland case with a filled line 2 renders as "1 Test Street, Flat 2B, Co. Antrim, BT1 1AA, United Kingdom" — both exactly as designed.
- Screenshot of the new-job screen at simulated phone width shows properly padded, evenly-margined fields with the County/Eircode pair sitting cleanly side by side — visually confirms the `.new-job-form` padding fix.
