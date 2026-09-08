---
title: 'TradesLine Next.js Foundation + Signup'
type: 'feature'
created: '2026-09-06'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: 'df7d4e9caf2d4ca1b653e549a56e48be0ae95786'
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
  - bmad/planning-artifacts/ux-designs/ux-tradesmen-estimator-2026-08-25/DESIGN.md
  - bmad/planning-artifacts/ux-designs/ux-tradesmen-estimator-2026-08-25/EXPERIENCE.md
  - bmad/planning-artifacts/ux-designs/ux-tradesmen-estimator-2026-08-25/mockups/signup.html
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** TradesLine is still a static HTML/JS/no-persistence demo with a login screen; the finalized architecture calls for a real Next.js + Prisma + Postgres stack with a signup flow (trade + address + Eircode) replacing login, and none of that exists yet.

**Approach:** Scaffold a Next.js 16 (App Router, TypeScript) + Prisma 7.10.0 + Postgres project at the repo root (moving the legacy static prototype into `legacy-prototype/` for reference, preserving git history), implement the `User` model and a real signup form that issues a signed session cookie, landing on a placeholder trade-scoped dashboard stub. Full dashboard, job flow, messages, and invoice are separate, already-deferred specs.

## Boundaries & Constraints

**Always:**
- Follow `ARCHITECTURE-SPINE.md`'s layered paradigm (UI → Server Action → service → repository → Prisma) and AD-6 (no password; one session chokepoint in `lib/server/session.ts`).
- Signup fields/behavior per `EXPERIENCE.md`: real `<form>` (Enter submits), fixed trade list (Electrician, Plumber, Carpenter, General Builder), required name/trade/address/Eircode, optional email, inline per-field errors (not a top banner), focus moves to first invalid field on submit, submit disabled until required fields valid.
- Visual system from `DESIGN.md` (teal `#0d9488` accent, brand mark, form-field pattern) carried over faithfully — reference `mockups/signup.html` for layout.
- `User.routingKey` derived from `eircode` (first 3 chars, uppercase, whitespace-stripped) per AD-2, even though nothing consumes it yet.
- Preserve legacy prototype history via `git mv`, not delete+recreate.

**Ask First:**
- If no Postgres connection is available locally, ask whether to provision a local Docker Postgres or a Neon dev branch before running migrations.

**Never:**
- Do not build `JobPreset`, `Job`, `Material`, `WholesalerBranch`, `Invoice`, or `WholesalerMessage` in this spec — deferred (see `deferred-work.md`).
- Do not add a password field or real email verification (AD-6).
- Do not delete `legacy-prototype/` content or its history.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Valid name, trade, address, Eircode submitted | `User` row created, session cookie set, redirected to dashboard stub showing selected trade | N/A |
| Trade unselected | Form submitted with no trade chosen | Submit blocked; no default trade silently assumed | Inline error under trade field |
| Invalid Eircode shape | Eircode fails format check | Submit blocked | Inline error under Eircode field, focus moves there |
| Cold open, no session | Visitor loads `/` with no session cookie | Redirected to `/signup`, never a login wall | N/A |

</frozen-after-approval>

## Code Map

- `index.html`, `js/app.js:1104-1137` (`handleLogin`/`handleLogout`) -- prior session-shape reference; superseded, not reused directly
- `css/styles.css:139-235` (`.login-wrap`, `.brand`, `.field`, `.btn-primary`) -- port these visual tokens into the new signup page
- `bmad/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` -- AD-6 session pattern, Stack table, Consistency Conventions
- `bmad/planning-artifacts/ux-designs/.../EXPERIENCE.md` -- signup Component Patterns, State Patterns, Accessibility Floor
- `bmad/planning-artifacts/ux-designs/.../mockups/signup.html` -- layout/composition reference

## Tasks & Acceptance

**Execution:**
- [x] `legacy-prototype/` -- `git mv` `index.html`, `css/`, `js/` here -- keeps the static demo as reference without blocking a clean scaffold at repo root
- [x] repo root -- scaffold Next.js 16 (App Router, TypeScript) via `create-next-app` -- establishes `app/`, `lib/` per the spine's Structural Seed
- [x] `prisma/schema.prisma` -- `User` model (id, name, trade enum, addressLine, town, county, eircode, routingKey, email?, createdAt) + Postgres datasource
- [x] `lib/server/session.ts` -- signed httpOnly cookie helpers (create/read/clear) -- the single AD-6 chokepoint
- [x] `lib/server/repositories/user.ts` -- Prisma-only `User` create/read (only file importing the Prisma client for this entity)
- [x] `lib/server/services/signup.ts` -- validation, routing-key derivation, calls repository + session helper
- [x] `app/signup/page.tsx` + Server Action -- form UI + submission per Boundaries above
- [x] `app/dashboard/page.tsx` -- placeholder reading the session, shows "Signed up as {trade}"
- [x] `.env.example` -- `DATABASE_URL`, `SESSION_SECRET` placeholders

**Acceptance Criteria:**
- Given a visitor with no session, when they open `/`, then they land on `/signup`.
- Given valid signup data, when submitted, then a `User` row exists, a session cookie is set, and the browser shows the dashboard stub with the chosen trade.
- Given the trade left unselected, when submit is attempted, then submission is blocked with no default assumed.

## Spec Change Log

- **Finding (Matrix Test Audit, pre-review):** the "Trade unselected" and "Invalid Eircode" matrix rows initially failed live browser verification -- clicking Submit before the client JS bundle finished hydrating fell through to a native browser form submission (empty GET to `/signup?`), silently discarding every entered field with no error shown. The submit button used `aria-disabled` only (not a real `disabled` attribute), by design, so a click while invalid could still run client-side validation -- but that same choice left the pre-hydration window unprotected, since nothing else stopped native submission at that point.
- **Amendment:** `SignupForm.tsx`'s submit button now also carries a real `disabled` attribute gated on `useSyncExternalStore`-based hydration detection (`disabled={!hydrated}`), confirmed present in server-rendered HTML (`disabled=""`) -- while `aria-disabled` continues to gate the already-verified post-hydration validation-on-click behavor. Confirmed via direct DB/HTML verification, not just UI inspection: both matrix rows now show their inline error and correct DB state.
- **KEEP:** the post-hydration behavior (client-driven validation, inline errors, focus-to-first-invalid, `FormData`-based `signupAction`) was correct on first implementation and needed no change -- only the pre-hydration window was a gap.

## Verification

**Commands:**
- `npm run build` -- expected: production build succeeds, no type errors
- `npx prisma migrate dev` -- expected: `User` table created in Postgres with no errors

**Manual checks (if no CLI):**
- Visit `/signup`, submit valid data, confirm redirect to the dashboard stub and a session cookie present in devtools.
