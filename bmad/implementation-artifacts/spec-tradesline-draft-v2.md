---
title: 'TradesLine Draft v2 — Signup Verification Gate'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'df7d4e9caf2d4ca1b653e549a56e48be0ae95786'
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current static draft (root `index.html`/`js`/`css`, "Sparkline") has no signal that it's trade-only — any consumer could sign in and see trade pricing, which matters because consumers seeing discounted trade prices causes real issues for tradesmen.

**Approach:** Stand up a new sibling draft copy at `draft-v2/` (a full copy of the current static site, so root stays untouched as the rollback target), and add UI attestation fields to its login form: company/business name, trade registration number, and a checkbox confirming professional status — all required to sign in. This is the first of three split goals (see `deferred-work.md` for the deferred Profile and Pre-Order Estimate goals, which build on this same `draft-v2/` copy in later passes).

## Boundaries & Constraints

**Always:**
- New draft lives entirely under `draft-v2/` (own `index.html`, `css/`, `js/`), a full copy of root — do not edit root `index.html`/`css/`/`js/` at all.
- No backend, no DB, no persistence across reload — `js/state.js` in-memory only, matching ARCHITECTURE-SPINE.md's draft-stage paradigm.
- Reuse existing CSS vocabulary (`field`/`field-label`/`field-error`, `btn btn-primary`/`btn-block`) — no new classes needed for this goal.
- Verification is UI attestation only: company/business name + trade registration number fields + a "I confirm I am a registered tradesperson" checkbox, all required to submit login. No real lookup/validation beyond non-empty (this is a static demo, not a real verification pipeline).

**Ask First:** none expected.

**Never:** modify root `index.html`/`css/styles.css`/`js/*`; add any backend/network call or real credential verification; add a password field; touch `job`/`STATUS_ORDER`/invoice logic (out of scope for this goal).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Login submit, all fields valid | Name, business name, trade reg number filled, checkbox checked | Session created, dashboard loads (unchanged from today) | N/A |
| Login submit, attestation unchecked | Other fields filled, checkbox unchecked | Blocked, inline error under checkbox, focus moves to it | Matches existing `login-name-error` pattern |
| Login submit, business name blank | Checkbox checked, business name empty | Blocked, inline field error, focus moves to it | Same pattern |
| Login submit, trade reg number blank | Checkbox checked, reg number empty | Blocked, inline field error, focus moves to it | Same pattern |

</frozen-after-approval>

## Code Map

- `js/state.js:8` (`session` shape in the header comment) and `js/state.js:40-46` (`defaultState`) — extend the `session` object with `businessName` and `tradeRegNumber` (both strings); attestation itself doesn't need a stored field (if session exists, attestation happened).
- `index.html:22-47` (`#screen-login` → `#login-form`) — insert three new fields after the existing name field (`index.html:32-37`), matching its `<label class="field"><span class="field-label">…</span><input …></label>` + `<p class="field-error" id="…-error" hidden>…</p>` pattern exactly: `login-business-name` (text), `login-trade-reg` (text), `login-attest` (checkbox) each with its own `-error` paragraph.
- `js/app.js:1104-1116` (`handleLogin(name, email)`) — change signature to accept the three new values; extend validation to check `businessName`, `tradeRegNumber` (non-empty, trimmed) and the checkbox (checked), each showing/hiding its own error element and moving focus to the first invalid field, following the existing `nameError`/`login-name` pattern at :1105-1111. On success, add `businessName`/`tradeRegNumber` to the `state.session` object built at :1113.
- `js/app.js:1128-1135` (`init`'s login-form submit listener) — read the three new field values (`document.getElementById('login-business-name').value`, `'login-trade-reg'`, `'login-attest'`.checked`) and pass them into `handleLogin`.

## Tasks & Acceptance

**Execution:**
- [x] `draft-v2/` — copy root `index.html`, `css/styles.css`, `js/app.js`, `js/state.js`, `js/data.js` verbatim as the starting point; root stays untouched
- [x] `draft-v2/js/state.js` — extend `defaultState()`'s `session` shape (and its header-comment doc) with `businessName`, `tradeRegNumber`
- [x] `draft-v2/index.html` — add business-name, trade-reg-number, and attestation-checkbox fields (each with its own error paragraph) to `#login-form`
- [x] `draft-v2/js/app.js` — extend `handleLogin` validation and the login-form submit listener per Code Map

**Acceptance Criteria:**
- Given the login form with business name, trade reg number, and attestation checkbox all valid, when submitted, then a session is created and the dashboard loads, unchanged from current behavior otherwise
- Given the login form with any one of the three new fields invalid (empty text field, or unchecked box), when submitted, then that field's inline error shows, focus moves to it, and no session is created
- Given root `index.html`/`css/styles.css`/`js/*`, when this spec is implemented, then they are byte-identical to their pre-implementation state (rollback path preserved)

## Verification

**Manual checks (no build/test tooling in this static draft):**
- Serve `draft-v2/` locally (e.g. `python -m http.server`) and click through: submit with each new field empty in turn (expect the matching inline error each time) → fill all three → submit succeeds → dashboard loads as today.
- `git status` / `git diff` on root `index.html`, `css/styles.css`, `js/*` shows no changes — only `draft-v2/**` is new.

## Suggested Review Order

**Signup verification fields (entry point)**

- Three new required fields inserted between Name and Email, matching the existing field/error markup exactly.
  [`draft-v2/index.html:39-53`](../../draft-v2/index.html#L39)

- Demo-safety copy updated so the new sensitive-looking fields don't read as real regulatory data.
  [`draft-v2/index.html:61`](../../draft-v2/index.html#L61)

**Validation logic**

- Sequential per-field validation extended to 4 fields, following the existing single-field pattern.
  [`draft-v2/js/app.js:1104`](../../draft-v2/js/app.js#L1104)

- Patch: all 4 errors cleared up front so an early return can't leave a stale error from a prior submit.
  [`draft-v2/js/app.js:1114`](../../draft-v2/js/app.js#L1114)

- On success, the two new fields are added to the session object.
  [`draft-v2/js/app.js:1150`](../../draft-v2/js/app.js#L1150)

**State shape**

- `session` doc comment extended with `businessName`/`tradeRegNumber` — no code change needed since session starts `null`.
  [`draft-v2/js/state.js:8`](../../draft-v2/js/state.js#L8)

**Peripherals**

- Submit listener reads the three new field values and passes them into `handleLogin`.
  [`draft-v2/js/app.js:1172`](../../draft-v2/js/app.js#L1172)
