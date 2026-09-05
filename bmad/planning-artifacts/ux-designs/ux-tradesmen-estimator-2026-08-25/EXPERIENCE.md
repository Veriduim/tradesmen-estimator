---
title: TradesLine — Experience Spine
name: TradesLine
status: draft
sources:
  - {planning_artifacts}/briefs/brief-tradesmen-estimator-2026-08-24/brief.md
  - bmad/implementation-artifacts/spec-job-flow-prototype.md
  - bmad/implementation-artifacts/spec-dashboard-pricing-material-search.md
  - bmad/implementation-artifacts/deferred-work.md
updated: 2026-09-05
---

# TradesLine — Experience Spine

> Second draft. Rebrands "Sparkline" (electrician-only) to TradesLine (multi-trade). DESIGN.md carries over unchanged from the prior draft; this spine captures the behavioral delta: signup replaces login, and trade selection at signup now scopes job presets, materials, and wholesalers. `brief-tradesmen-estimator-2026-08-24.md` still scopes the product as electrician-only and login-free — that brief needs a follow-up update (flagged, not blocking this draft; see `.memlog.md`).

## Foundation

Responsive web app, mobile/tablet-first (electrician-on-site usage pattern generalizes to any on-site trade), also usable on desktop — unchanged from the prior draft. No named UI system; hand-rolled components per `DESIGN.md`. Single persona per signup (no team/multi-user accounts — unchanged scope). Stakes: still a demo/pitch prototype, not production auth — signup is illustrative (no password, no real verification) but must *behave* like a real signup, not a login.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Signup | App cold-open | **New this draft.** Replaces Login. Captures name, trade, full address (+ Eircode), optional email. |
| Job Dashboard | After signup / app reopen | List of the user's jobs + "Start a new job" preset picker, scoped to the user's trade. |
| Job Detail | Dashboard job-card tap or preset selection | Six-stage lifecycle body: Job Details → Materials Needed → Wholesaler Selected → Materials Delivered → Job Completed → Invoice. Stage content is trade-scoped (job types, materials, wholesalers) but the six-stage shape is identical across trades. |

Single-column throughout; no tab bar, no drawer (unchanged). Confirm modal and toast remain global overlays reachable from Job Detail.

→ Composition reference: `mockups/signup.html` (new, at-rest + validation-error states), `mockups/dashboard-trade-scoped.html` (new, plumber dashboard vs. existing electrician dashboard side by side), existing built app (`index.html`, `js/app.js`) for the unchanged dashboard/job-detail structure. Spine wins on conflict.

## Voice and Tone

Microcopy. Brand voice lives in `DESIGN.md.Brand & Style`. Tone stays direct/functional — no fluff, no trade-specific slang that would alienate a different trade.

| Do | Don't |
|---|---|
| "Sign up to start tracking your jobs." | "Welcome back" / "Sign in" (this is a first-time signup, not a returning-user login) |
| "What's your trade?" | "What kind of electrician are you?" (assumes a trade) |
| "We use your address to match you with wholesalers who deliver to you." | Silent address field with no stated reason (a stranger asking for a home address needs the "why") |
| "Demo signup — nothing is sent anywhere." | Implying real account security ("Your data is encrypted") when it isn't |

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Signup form | Signup | **New.** Real `<form>` (Enter submits — deliberately avoiding the "Add material" form-less gap logged in `deferred-work.md`). Fields: name (required), trade (required, single-select from fixed list), address line, town/county, Eircode (required as a group), email (optional). Submit disabled until required fields are valid; inline errors below each field, not a single top-of-form banner. |
| Trade selector | Signup | Fixed list per the memlog decision: Electrician, Plumber, Carpenter, General Builder. Single-select (radio-style chips or native select — implementation's call within `DESIGN.md` tokens). Selection is not editable after signup in this draft (no profile/settings surface exists yet — logged as an open item below). |
| Job preset picker | Dashboard, "Start a new job" | Presets are filtered to the signed-up user's trade. An electrician sees Full Rewire / Fuse Board Upgrade / Socket-Circuit Addition (unchanged); a plumber sees plumbing-equivalent presets (e.g., Bathroom Retrofit, Boiler Swap, Leak Repair) drawn from a parallel per-trade catalog. |
| Materials list + wholesaler row | Job Detail → Materials Needed / Wholesaler Selected | Unchanged interaction pattern (qty stepper, wholesaler chip with stock/lead-time, "Change" link, search-based add-material picker). Wholesaler names shown are trade-appropriate (e.g., plumbing/heating merchants, not electrical ones) for the user's trade — mocked data, not a live feed. |
| Six-dot stepper | Job Detail | Unchanged — six stages regardless of trade. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Signup — missing/invalid field | Signup | Inline error under the specific field on submit attempt (or on blur); focus moves to the first invalid field. |
| Signup — trade not yet selected | Signup | Submit stays disabled; no default trade silently assumed. |
| First job after signup | Dashboard | Empty job list + trade-scoped preset picker, same pattern as the current empty-dashboard state, just trade-filtered. |
| Trade with a thin preset catalog | Dashboard | If a trade's preset catalog isn't fully built out yet, show whatever presets exist for that trade rather than falling back to another trade's presets. **Open item:** only Electrician (existing) and Plumber (this draft's validation case) have full preset/material/wholesaler catalogs; Carpenter and General Builder are signup-selectable but their catalogs are a follow-on content task for `bmad-build` — logged in `.memlog.md`, not a gap in this design. |

## Interaction Primitives

- Tap/click to act; form fields use native keyboard input (unchanged).
- Confirm-before-destructive pattern (modal with focus handling, `inert` background) reused as-is for any destructive action — no new pattern introduced.
- Toast confirmations reused as-is for signup success ("Signed up — let's get your first job started.").
- Address entry is free-typed with format validation only (required fields present, Eircode shape check) — **no live geocoding/autocomplete**. Wholesaler "distance" shown on the Materials/Wholesaler screens stays illustrative/mocked exactly as it is today (`js/data.js` distanceKm is static per wholesaler, not derived from the entered address) — this draft's signup address establishes the *pattern* (trade + location scope who a user's wholesalers are) without wiring real geo-matching. Real address-to-wholesaler-delivery logic is an architecture-level decision, not a UX one — out of scope for this spine.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md`.

- Every signup field has a real, programmatically-associated `<label>` — do not repeat the existing quantity-input labeling gap logged in `deferred-work.md`.
- Trade selector is keyboard-operable and exposes selected state to assistive tech (native `<select>`/radio group, not a div-based click-only picker) — do not repeat the existing wholesaler-row/checkbox keyboard-nav gap logged in `deferred-work.md`.
- Signup form-level and field-level errors are associated via `aria-describedby`, consistent with the existing confirm-modal pattern.
- Signup success toast carries `role="status"`/`aria-live="polite"` — this draft's toast should not repeat the missing-aria-live gap already logged for other toasts in `deferred-work.md`; if fixed here, consider back-porting to the other toasts as a follow-on build item.
- Tap targets ≥ 44px, consistent with existing components.

## Inspiration & Anti-patterns

- **Rejected — free-text trade entry:** more flexible at signup, but nothing downstream (job presets, materials, wholesalers) could key off an unconstrained string yet. Fixed list chosen deliberately (memlog decision).
- **Rejected — per-trade visual reskinning:** the shell (color, shapes, stepper, chips) stays identical across trades; differentiation lives entirely in content. Keeps the brand coherent as more trades are added later without a design pass each time.
- **Rejected — coarse address (town/county only):** would have made signup lighter, but the whole point of collecting address is wholesaler-delivery matching, which needs street-level precision to mean anything later.

## Key Flows

### Flow 1 — First-time signup (Tom, a general builder in Galway, hears about the app from another tradesperson)

1. Tom opens the app cold — lands on Signup, not a login wall.
2. He reads the one-line "why we ask for your address" note and doesn't hesitate on the address field.
3. He enters his name, selects **General Builder** from the trade list, fills in his address + Eircode, skips the optional email.
4. Submits — inline validation passes on the first try because required fields were obvious.
5. **Climax:** he lands on an empty Dashboard captioned for *his* trade — "Start a new job" shows builder-relevant presets, not electrician ones — proof the app already understands who he is before he's done anything else.

Failure: Tom leaves the trade unselected → submit stays disabled, no silent default trade is assumed.

### Flow 2 — Trade-scoped job (Niamh, a plumber in Cork, validates the multi-trade generalization)

1. Niamh has already signed up as Plumber. She opens the Dashboard.
2. Preset list shows plumbing job types (e.g., Bathroom Retrofit) — the same preset-picker pattern as the electrician flow, different content.
3. She selects a preset; Job Detail opens on Materials Needed pre-populated with plumbing materials and quantities, mirroring the electrician flow's materials-estimate pattern exactly.
4. On Wholesaler Selected, the suggested wholesalers are plumbing/heating merchants (mocked, styled after real Irish plumbing suppliers), not the electrical wholesalers an electrician would see for the same stage.
5. **Climax:** the six-dot stepper, chip styling, and screen layout are pixel-identical to the electrician's version of this same stage — Niamh is clearly using "the same app," just tuned to her trade, not a bolted-on separate product.

Empty state: if Niamh's trade had no presets yet, she'd see "No presets yet for General Builder — add a job manually" rather than an electrician preset (this fallback only currently applies to Carpenter/General Builder per the State Patterns open item).
