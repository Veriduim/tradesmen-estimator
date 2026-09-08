---
title: 'TradesLine Draft v2 — Profile Page (Labour Rate Settings)'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `draft-v2/` has no concept of a tradesperson's own labour rates — every job's labour cost comes from a fixed preset value, with nowhere to record what the tradesperson actually charges.

**Approach:** Add a new "Profile" screen (own nav entry in the header) holding two plain number fields — rate-per-hour and rate-per-job, either/both optional — saved live into in-memory state. This is the screen shell plus rate settings only; the materials warehouse (a separate section on this same screen) is deferred to its own follow-up spec. The next spec after this one (pre-order estimate invoice) consumes the per-job rate captured here.

## Boundaries & Constraints

**Always:**
- New screen only in `draft-v2/` — never touch `draft-v1/`.
- Add `profile: { labourRatePerHour: null, labourRatePerJob: null }` to `defaultState()` in `js/state.js`; update its header-comment state-shape doc. In-memory only, like the rest of state (resets on reload).
- Reuse existing CSS vocabulary (`field`/`field-label`/`field-error`) — no new visual language.
- Rate fields save on blur/change directly into `state.profile` (no explicit "Save" button — matches the app's immediate-mutation pattern elsewhere, e.g. quantity steppers). Both fields accept empty (cleared back to `null`).
- Add a "Profile" entry to `#app-header` (next to the existing user name / before "Log out"), visible whenever logged in, on every screen.
- Build `#screen-profile` so a later spec can append a materials-warehouse section without restructuring this screen's shell (topbar/back-link + a body container the next spec can add to).

**Ask First:** none expected — additive UI with no existing behavior to conflict with.

**Never:** touch `job.labourCost`, `invoiceBreakdown`, or any existing job/invoice logic (that wiring is a later spec); add persistence (localStorage etc.); build the materials warehouse section (deferred).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Set labour rate | Enter a number in either rate field, blur | Value saved to `state.profile`, persists across screen navigation (not reload) | Non-numeric/negative input rejected, field reverts to last valid value |
| Clear a labour rate | Empty an already-set rate field, blur | Field saved as `null` | N/A |
| Navigate to Profile and back | Click "Profile" from dashboard or job detail, then "Back" | Profile screen renders with current rate values; Back returns to the screen the user came from | N/A |

</frozen-after-approval>

## Code Map

- `draft-v2/js/state.js:7-18` (state-shape doc) and `:40-46` (`defaultState`) — add `profile: { labourRatePerHour: null, labourRatePerJob: null }`.
- `draft-v2/index.html:13-17` (`#app-header`) — add `<button class="app-header-profile" id="btn-profile">Profile</button>` between `#app-header-user` and `#btn-logout`.
- `draft-v2/index.html:81-93` (pattern to copy — same `topbar`/back-link shell as `#screen-job-detail`) — insert a new `<section id="screen-profile" class="screen" hidden>` after `#screen-job-detail`, before `</main>`, with a `#profile-body` container for the rate fields (and, later, the warehouse section).
- `draft-v2/js/app.js:211-215` (`showScreen`) — add `'screen-profile'` to the toggled id list.
- `draft-v2/js/app.js:168-196` (`render`) — add a `state.viewingProfile` boolean (new transient routing flag) checked before the job/job-picker branch; a back-link clears it and calls `render()`.
- `draft-v2/js/app.js:331-381` (`renderJobPicker`) — closest existing pattern for a simple form-driven screen; model `renderProfile()` on this shape, rendering two `field`-styled number inputs into `#profile-body`.
- `draft-v2/js/app.js:1201-1265` (`data-action` switch in the delegated click handler in `init()`) — add a `'go-profile'` case (`state.viewingProfile = true; render()`) wired to `#btn-profile`; rate-field changes wire via a `change`/`blur` listener set up in `init()` alongside the other form listeners, not the `data-action` switch.

## Tasks & Acceptance

**Execution:**
- [ ] `draft-v2/js/state.js` — extend `defaultState()` + doc comment with `profile` shape
- [ ] `draft-v2/index.html` — add header Profile button + `#screen-profile` markup (two labour-rate fields inside `#profile-body`)
- [ ] `draft-v2/js/app.js` — routing (`showScreen`, `render`, `viewingProfile` flag, back-link), `renderProfile()`, rate-field change handlers, `'go-profile'` action wiring

**Acceptance Criteria:**
- Given a logged-in session, when "Profile" is clicked from any screen, then the Profile screen renders with the current rate values, and "Back" returns to wherever the user was
- Given the Profile screen, when a labour rate field is set then cleared, then `state.profile`'s corresponding field ends as `null`
- Given `draft-v1/` files, when this spec is implemented, then they remain byte-identical to their pre-implementation state

## Verification

**Manual checks (no build/test tooling in this static draft):**
- Serve `draft-v2/` locally, log in, click Profile from the dashboard and from inside a job detail screen — confirm it renders and Back returns correctly from both.
- Set both rate fields, navigate away and back (confirms in-session persistence within one visit), reload the page (confirms no accidental cross-reload persistence).

## Spec Change Log

- **Finding (live browser verification, 2026-09-08):** the originally-implemented `handleProfileRateChange` called the full `render()` on every successful save. Since both rate fields live in the same `#profile-body`, saving the first field (on blur, when focus moved to the second field) triggered a full re-render that replaced the second field's DOM node via `innerHTML` mid-interaction — destroying whatever the user was about to type into it. Reproduced live: typing "45" then moving to the second field and typing "350" left the second field empty.
  **Fix:** `handleProfileRateChange` no longer calls `render()` on a successful save (the input already visually shows the typed value, so no re-render is needed); it only calls `renderProfile()` to force-revert the display on the invalid-input path. Re-verified live after the fix: both fields retain independently-typed values, in-session navigation away and back preserves them, and a full page reload correctly resets both to empty (no accidental persistence).
  **KEEP:** routing via `state.viewingProfile`, the screen markup, and the header nav button all worked correctly on first verification — no changes needed there.
