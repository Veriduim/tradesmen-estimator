---
title: 'TradesLine Draft v2 — Form Field Visual Polish (border-strong token)'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/ux-designs/ux-tradesmen-estimator-2026-08-25/DESIGN.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Client review flagged form fields (e.g. Profile's Name field) as needing formatting improvement. Investigated via `bmad-ux` (Update mode) rather than guessing — competitive research against Stripe/Linear/Vercel/Notion and field-service apps (Jobber/Housecall Pro/ServiceTitan) before proposing anything.

**Approach:** Research validated most of the existing design as already correct (Profile's section-level edit toggle, the teal focus treatment, the overall restrained aesthetic — field-service apps are praised specifically for restraint). It surfaced one real, named issue: the `surface-alt` (light gray) input background sat close enough to the page canvas to read as disabled rather than editable, and the existing hairline border fell below reliable contrast on white. Fixed with a new `border-strong` token, applied consistently to every editable field app-wide.

## Boundaries & Constraints

**Always:** `surface-alt` is now reserved specifically for a genuinely-`disabled` field state, never a plain editable one; `border-strong` reuses the color already used ad hoc for the checkbox control (`#cbd5e1`), not an invented new hue.

**Never:** restructure the Profile edit-toggle interaction (research validated it as correct for this case) or touch spacing/typography beyond the field-background/border fix — this pass is deliberately narrow (see DESIGN.md memlog for the full research findings and what was explicitly left alone).

</frozen-after-approval>

## Code Map

- `bmad/planning-artifacts/ux-designs/.../DESIGN.md` — new `border-strong` color token + doc, revised Form field component spec, new Do/Don't row (source of truth, updated first).
- `draft-v2/css/styles.css` (`:root`) — `--border-strong: #cbd5e1`.
- `draft-v2/css/styles.css` (`.field input`/`.field select`/`.field textarea`/`.warehouse-add-row input`) — `background: var(--surface)` (was `--surface-alt`), `border-color: var(--border-strong)` (was `--border`); added a `:disabled` variant using the old `surface-alt`/`border` pairing.
- `draft-v2/css/styles.css` (`.search-input`) — border updated to `border-strong` (background was already `surface`).

## Verification

**Live browser verification (2026-09-09), no bugs found:** confirmed via computed style (not just visual) that login fields and Profile's Name field in edit mode (the client's specifically-flagged example) both render `background-color: rgb(255, 255, 255)` and `border-color: rgb(203, 213, 225)` — matches the new tokens exactly. Visually distinct from the `#f5f7fa` page canvas in a way the prior gray fields weren't.
