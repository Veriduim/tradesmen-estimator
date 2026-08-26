---
title: 'Dashboard grouping, real-world pricing, searchable material picker'
type: 'feature'
created: '2026-08-25'
status: 'done'
baseline_commit: 'c81132c8ec1dc4e202ed6c6fd3d4c45cce628704'
review_loop_iteration: 0
context: ['{project-root}/bmad/implementation-artifacts/spec-job-flow-prototype.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Three fidelity gaps in the v1 prototype: (1) the job dashboard is one flat growing list with no sense of active-vs-done, (2) material prices are arbitrary invented numbers instead of grounded in real costs, (3) "add material" accepts any freeform name/price, which undermines the wholesaler-comparison premise the app is built around.

**Approach:** Split the job dashboard into "Active" and "Completed" sections with a status badge per card. Replace `MATERIAL_CATALOG` unit prices with researched, real-world-grounded EUR figures (documented provenance, not a live feed). Replace the freeform add-material fields with a search-as-you-type picker restricted to the catalog, so every addable material still carries real per-wholesaler pricing.

## Boundaries & Constraints

**Always:**
- Stay pure static client-side (no backend, no build step, no runtime network calls) — researched prices are baked into `js/data.js` as static values with a provenance comment, not fetched live.
- Job list splits into **Active** (`status !== 'invoice'`) and **Completed** (`status === 'invoice'`) sections; every card shows a human-readable status badge (reuse `STATUS_LABELS`).
- "Add material" becomes a filtered, search-as-you-type list over `MATERIAL_CATALOG`, excluding items already on the job; selecting one adds it at qty 1 with its real wholesaler options. No freeform name/price entry remains anywhere.
- Preserve all v1 behavior and fixes (sanitization, single invoice-total formula, status stepper, input clamping, etc.) — this is additive, not a rewrite.

**Ask First:** Any request to fetch pricing from a real live API, or to support multiple concurrent user accounts (this stays single-electrician).

**Never:** Don't remove the ability to adjust quantity or remove a material after adding it via search. Don't reintroduce freeform custom-material entry.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dashboard grouping | Jobs exist at various statuses | Split into "Active" / "Completed" sections, each card shows a status badge | Zero jobs in a section hides that section header |
| Search picker: typing | User types in the add-material search box | List filters to catalog items whose name matches (case-insensitive substring), already-on-job items excluded | No match -> "No materials match" empty state, nothing addable |
| Search picker: select | User clicks a filtered result | Material added to the job at qty 1 with its real wholesaler options; search closes/resets | N/A |
| Real prices | Any screen showing a material's price (materials list, wholesaler compare, invoice) | Reflects the researched `data.js` value, not a placeholder | N/A |

</frozen-after-approval>

## Code Map

- `js/data.js` — replace `MATERIAL_CATALOG` `unitPrice` values with researched EUR figures (small per-wholesaler variation preserved, same pattern as today); add a provenance comment. Researched figures (base, before per-wholesaler spread): T&E 2.5mm €2.15/m, T&E 1.5mm €0.70/m, consumer unit 10-way dual RCD €104, twin switched socket €2.78, 1-gang light switch €0.92, MCB 6A €3.47, earth cable 6mm €1.74/m, cable clips 25mm (100-pack) €1.61 / (200-pack) ~€3.00, RCBO 32A €13.91, MCB 20A €3.47, meter tails 25mm twin €4.60/m, earth rod & clamp kit €14.40, board labels kit €9.63, back box single 35mm €0.80. Most are UK-trade-price proxies (Screwfix) converted at ~1.16 GBP→EUR where Irish-specific pricing wasn't directly available — note this in the comment.
- `js/app.js` `renderJobPicker()` (~line 200) — group `state.jobs` into active/completed arrays before rendering, render two labeled sections (skip a section if empty).
- `js/app.js` `addItemFormHTML()` / `handleAddItemSubmit()` (~lines 500-529, 884+) — replace the name/qty/price freeform fields with a text search input + live-filtered result list drawn from `MATERIAL_CATALOG`, excluding catalog ids already in `job.materials`; clicking a result calls the existing add-material state logic with that catalog entry.
- `css/styles.css` — section header + status badge styles for the dashboard; filtered-list styling for the search picker, matching Direction B (white cards, soft shadow, teal accent).

## Tasks & Acceptance

**Execution:**
- [x] `js/data.js` -- update all `MATERIAL_CATALOG` unit prices to the researched figures above, add provenance comment -- grounds the demo in real costs
- [x] `js/app.js` `renderJobPicker` -- split job list into Active/Completed sections with status badges -- makes the dashboard read as an account
- [x] `js/app.js` add-material flow -- replace freeform inputs with a searchable, catalog-only picker (filter-as-you-type, exclude already-added items, click-to-add) -- keeps wholesaler comparison meaningful
- [x] `css/styles.css` -- section headers, status badges, search-picker styling
- [x] Manual pass re-verifying the full v1 flow still works plus the 3 new behaviors (dashboard grouping, search-add, updated prices) -- driven headlessly via jsdom since no interactive browser tool was available in this session; see Verification note below

**Acceptance Criteria:**
- Given jobs at multiple statuses, when viewing the dashboard, then jobs appear under "Active" or "Completed" with a visible status badge per card.
- Given the materials screen, when the user types a query into add-material and selects a result, then only matching not-yet-added catalog items were shown, and the added item carries real wholesaler pricing.
- Given any screen showing a material's price, when compared to `js/data.js`, then it matches the researched value, not a v1 placeholder.

## Design Notes

The search picker can be a simple inline filtered list under a text input (no modal needed) — consistent with the app's existing inline-expansion pattern already used for wholesaler selection.

## Verification

**Manual checks (if no CLI):**
- Open the app, create jobs at a few different statuses (or advance one to invoice), confirm the dashboard splits them into Active/Completed with correct badges. On a materials-needed job, open add-material, type a partial name, confirm filtering and exclusion of already-added items, select one, confirm it's added with real per-wholesaler pricing. Spot-check 3-4 displayed prices against `js/data.js`.

## Verification

**Automated pass performed during implementation:** no interactive browser tool was connected in this session, so the app was driven headlessly with jsdom (Node), loading the real `index.html`/`js/*.js` unmodified with all three scripts inlined into one parse (so jsdom's native `DOMContentLoaded` fires `init()` exactly once, matching real-browser behavior). Covered: login -> create job -> add-material search box appears; already-on-job catalog items excluded from results; typing a partial name ("rcbo") filters to the matching catalog item and the search input keeps focus/cursor across the live re-render; a non-matching query shows the "No materials match" empty state; no freeform name/price fields exist anywhere in the DOM; selecting a filtered result adds it at qty 1 and closes/resets the search; wholesaler-compare prices shown for a catalog item match the researched `js/data.js` values exactly (spot-checked consumer unit and MCB 20A); assigning a wholesaler to every material enables Pay, which advances the job through wholesaler-selected -> materials-delivered -> job-started -> job-completed -> invoice via the existing contextual advance buttons (untouched v1 flow still works); the dashboard splits jobs into "Active" (materials-needed) and "Completed" (invoice) sections in that order, each job card carries the correct `STATUS_LABELS` badge, and a zero-job session renders neither section heading; every `MATERIAL_CATALOG` entry's per-wholesaler options average to exactly the researched baseline price from this spec; every `JOB_PRESETS` material reference still resolves to a valid catalog id after the price rewrite; state persisted to `localStorage` after creating a job round-trips correctly through `load()`. All checks passed. A human should still open it in a real browser once to confirm visual polish (badge/section styling, search-picker layout) since headless DOM testing does not check rendering/CSS.

**Review pass (blind-hunter + edge-case-hunter + verification-gap, run in parallel against the diff):** 11 real findings converted to patches and applied; 5 further real-but-out-of-scope findings logged to `deferred-work.md` (debounce/perf, a pricing coincidence worth a footnote, legacy freeform-material migration, a documentation rounding nit). No findings required reopening the frozen intent. The implementer that was dispatched to apply the patches hit a session usage limit before making any changes, so the patches were applied directly in the main conversation instead. Re-verified with three jsdom suites: the original full-flow suite (updated — its freeform-add-material assertions were rewritten to use the new search picker, since that path no longer exists by design), the round-1 patch suite (updated the same way for its `add-item-name` references; its patch4/5-price/7 blocks, which only tested the now-removed freeform form, were removed as superseded rather than force-fit), and a new suite covering all 11 round-2 patches plus the original dashboard/pricing/search behaviors (23 checks). All three suites pass in full.

## Suggested Review Order

**Dashboard grouping**

- Entry point: splits jobs into Active/Completed, computes the corrected count-sub copy
  [`app.js:277`](../../js/app.js#L277)

- Renders one section (heading + cards), hides the header when empty
  [`app.js:265`](../../js/app.js#L265)

- Per-card badge — completed jobs now read "Invoiced" instead of the raw "Invoice" stage label
  [`app.js:218`](../../js/app.js#L218)

**Real pricing**

- Every catalog entry's `unitPrice` replaced with researched EUR figures; provenance comment above
  [`data.js:37`](../../js/data.js#L37)

- Duplicate "Cable clips, 25mm" names disambiguated to (100-pack)/(200-pack)
  [`data.js:99`](../../js/data.js#L99)

**Search-as-you-type material picker**

- Shared filter+sort (name-starts-with first) used by both rendering and keyboard nav
  [`app.js:580`](../../js/app.js#L580)

- Renders the picker: accessible label, `aria-live` results, highlighted-result class, differentiated empty states
  [`app.js:604`](../../js/app.js#L604)

- Arrow-key/Enter keyboard navigation over filtered results — the old freeform form was fully keyboard-operable, this restores that for the picker
  [`app.js:1201`](../../js/app.js#L1201)

- Partial re-render for the live search box; now guards against rendering into a job that's moved past `materials-needed`, and preserves results-list scroll position across keystrokes
  [`app.js:196`](../../js/app.js#L196)
