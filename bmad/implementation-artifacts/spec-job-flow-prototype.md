---
title: 'Interactive job-flow prototype (account -> estimate -> wholesaler pay -> status -> invoice)'
type: 'feature'
created: '2026-08-25'
status: 'done'
baseline_commit: '8e183189caea0d84d83bc0bda1c12ff891e1a3b2'
review_loop_iteration: 0
context: ['{project-root}/bmad/planning-artifacts/briefs/brief-tradesmen-estimator-2026-08-24/brief.md', '{project-root}/bmad/planning-artifacts/ux-designs/ux-tradesmen-estimator-2026-08-25/.working/direction-b-clean-modern.html']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The electrician job-estimator concept (brief + UX direction picked) is only static mockups — there is nothing clickable that demonstrates the actual job lifecycle end to end.

**Approach:** Build a client-side-only static web app (no backend, no build step) implementing a fake-login entry, a common-job picker (3 preset job types), an auto-generated editable materials estimate, per-material wholesaler selection with a fake-payment confirmation, and status progression (Materials Delivered -> Job Started -> Job Completed -> Invoice) with a materials-cost include/exclude invoice toggle. Styled per the "Clean/Modern" direction already approved.

## Boundaries & Constraints

**Always:**
- Pure static site: plain HTML/CSS/JS, no framework, no build tooling, no network calls.
- All state (fake session, jobs, their materials/wholesaler/status) persists in `localStorage` under one namespaced key so a page reload resumes where the demo left off.
- Visual style matches `.working/direction-b-clean-modern.html` (white cards, soft shadows, rounded corners, teal accent) and stays phone-width-first, responsive up to desktop.
- All copy is real product content (job addresses, materials, wholesaler names) in the tradesperson-direct voice already used in the brief/mocks — no lorem ipsum.
- Currency EUR; invoice shows a 13.5% VAT line.
- Job status enum, in order: `job-details -> materials-needed -> wholesaler-selected -> materials-delivered -> job-started -> job-completed -> invoice`.

**Ask First:** Any request to add a real backend, real auth, a real payment gateway, or persistence beyond `localStorage`.

**Never:** Real authentication (no password checking/storage), real wholesaler API calls, real payment processing, native APK packaging — this is display-only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fake login | Any name/email entered on the login screen | Creates a local session, routes to job picker | Empty name field blocks submit with inline message |
| Pick common job | User selects one of 3 preset job types | New job created with pre-filled materials list for that type, status `materials-needed` | N/A |
| Edit materials | Add/remove/adjust qty on materials list | Estimate total recalculates live | Removing the last item blocks advancing with inline message |
| Assign wholesaler + pay | User confirms a wholesaler per material, taps "Pay" | Fake payment confirmation shown, status -> `wholesaler-selected` then immediately advances to `materials-delivered`-ready state | If any material has no wholesaler chosen, "Pay" stays disabled with inline message |
| Advance status | User taps the contextual "advance" button (Mark Delivered / Start Job / Mark Complete) | Status moves to next enum value, stepper UI updates | N/A |
| Generate invoice | User reaches `invoice` status, toggles materials cost on/off | Invoice total recalculates (labour-only vs labour+materials), 13.5% VAT line always shown | N/A |
| Reload mid-flow | Page reloaded with a job in progress | App reads `localStorage`, resumes at last status | Corrupt/missing localStorage falls back to fresh session, no crash |

</frozen-after-approval>

## Code Map

- No existing code — net-new static site at project root.
- `index.html` — single-page shell; one `<main>` with per-screen `<section>` containers toggled by JS (login, job-picker, job-detail).
- `css/styles.css` — Direction B tokens (colors/shadows/radius) ported from `.working/direction-b-clean-modern.html`; mobile-first breakpoints.
- `js/data.js` — mock catalog: 3 job-type presets (address, property size, job type) each with a materials template; wholesaler list with mocked price/stock/distance per material, styled after Chadwicks Electrical, Rexel Ireland, CEF Ireland.
- `js/state.js` — state shape `{session, jobs: [{id, jobType, address, materials[], status, wholesalerChoices{}, invoiceIncludesMaterials}]}`; `load()`/`save()` against one `localStorage` key.
- `js/app.js` — render functions per screen, status-stepper component, event wiring, invoice total calculation (materials/labour/VAT).

## Tasks & Acceptance

**Execution:**
- [x] `js/data.js` -- define 3 job presets + materials templates + wholesaler mock data -- gives every other file real content to render
- [x] `js/state.js` -- state shape + localStorage load/save -- single source of truth, enables reload-resume
- [x] `index.html` + `css/styles.css` -- screen shells + Direction B visual system -- structural + visual foundation
- [x] `js/app.js` -- login screen, job picker, materials editor, wholesaler+pay screen, status stepper/advance actions, invoice screen with toggle -- the actual interactive flow
- [x] Manual pass through the full flow in a browser -- confirm every I/O Matrix row behaves as specified (see Verification note below: driven headlessly via jsdom since no interactive browser tool was available in this session; a human should still eyeball it once in a real browser)

**Acceptance Criteria:**
- Given no prior session, when the user submits the login form with a name, then they land on the job picker.
- Given the job picker, when a common job is selected, then a materials-needed screen shows a pre-filled, editable list for that job type.
- Given a materials list with every item assigned a wholesaler, when the user taps Pay, then a fake payment confirmation appears and the job advances toward `materials-delivered`.
- Given a job at any status, when the user reloads the page, then the app resumes that job at the same status from `localStorage`.
- Given a job at `invoice` status, when the materials-cost toggle is switched, then the displayed total updates immediately and a 13.5% VAT line is always present.

## Design Notes

Status stepper is a reusable component (array of 7 labels, current index highlighted) — build once, reuse across job-detail and invoice screens so progress is always visible. "Advance" button label is contextual to current status (e.g. "Mark Delivered", "Start Job", "Mark Complete") rather than a generic "Next".

## Verification

**Manual checks (if no CLI):**
- Open `index.html` directly in a browser (or serve via any static server); walk all 3 job presets through the full flow to `invoice`; reload mid-flow at least once to confirm resume; toggle the invoice materials-cost switch and confirm the total and VAT line update correctly.

**Automated pass performed during implementation:** the claude-in-chrome browser tool was not connected in this session, so the full flow was instead driven headlessly with jsdom (Node) loading the real `index.html`/`js/*.js` unmodified and simulating clicks/inputs/reloads. Covered: empty-name login block, valid login routing, all 3 presets pre-filling their correct material counts, live qty-driven total recalculation, blocked removal of the last material (with inline message), Pay disabled until every material has a wholesaler (with inline message), full status progression through all 7 stages via each contextual advance button, invoice VAT-always-present + total changing on the materials toggle, reload-resume from `localStorage` (including that the invoice toggle choice survives reload), corrupt-localStorage fallback to a fresh session with no crash, adding a custom material, multiple jobs coexisting in the job picker, and logout preserving job data. All checks passed. A human should still open it in a real browser once to confirm visual polish, since headless DOM testing does not check rendering/CSS.

**Review pass (blind-hunter + edge-case-hunter + verification-gap, run in parallel against the diff):** 8 real findings converted to patches and applied (see Suggested Review Order below); 11 further real-but-out-of-scope findings logged to `deferred-work.md` (mostly accessibility gaps and polish, none blocking for a display prototype); 1 apparent spec ambiguity (whether Pay auto-advances the status) rejected as a false alarm — the spec's own Design Notes already establish manual contextual-advance buttons per stage. Patches re-verified via the original jsdom suite plus a new 8-scenario suite targeting each patch, both green.

## Suggested Review Order

**Data integrity / crash prevention (highest leverage — start here)**

- Individually sanitizes every job record on load, dropping/defaulting malformed data instead of trusting it
  [`state.js:111`](../../js/state.js#L111)

- Sanitizes and clamps a single material's qty/options during load
  [`state.js:81`](../../js/state.js#L81)

- Sanitizes a single wholesaler option, clamping unit price to `MAX_UNIT_PRICE`
  [`state.js:58`](../../js/state.js#L58)

- Top-level shape check now feeds into per-job sanitization rather than being the only guard
  [`state.js:46`](../../js/state.js#L46)

- Wires sanitization into the load path so corrupt storage degrades gracefully
  [`state.js:157`](../../js/state.js#L157)

**Invoice total — single source of truth**

- New shared formula (materials/subtotal/VAT/total) both consumers now derive from
  [`app.js:686`](../../js/app.js#L686)

- Job-picker "amount due" badge now calls the shared formula
  [`app.js:695`](../../js/app.js#L695)

- Invoice screen now calls the shared formula instead of recomputing inline
  [`app.js:710`](../../js/app.js#L710)

**Input bounds & inline feedback**

- Clamps quantity to `MAX_QTY`, shows inline note when clamped
  [`app.js:812`](../../js/app.js#L812)

- Empty-name and out-of-bounds qty/price now show inline errors instead of silently no-op'ing
  [`app.js:884`](../../js/app.js#L884)

**Defensive rendering guards**

- Guards against a material with missing/malformed options
  [`app.js:67`](../../js/app.js#L67)

- Guards against a missing `wholesalerChoices` entry
  [`app.js:74`](../../js/app.js#L74)

- Falls back to a valid index instead of "Step 0 of 7" for an unmapped status
  [`app.js:126`](../../js/app.js#L126)

- Falls back to "Unknown stage" instead of "undefined" for an unmapped status
  [`app.js:146`](../../js/app.js#L146)

**UI state hygiene & realism**

- Back-to-jobs now resets `openWholesalerFor`/`addItemOpen`, matching `open-job`'s behavior
  [`app.js:1038`](../../js/app.js#L1038)

- Custom-added materials get deterministic per-wholesaler price/stock/distance spread instead of 3 identical options
  [`app.js:871`](../../js/app.js#L871)
