---
title: TradesLine — Visual Identity
name: TradesLine
description: Multi-trade job estimator and invoicing tool. Calm, elevated operations-software aesthetic that reads as a polished business tool, not a consumer app or a rugged field app.
status: draft
created: 2026-08-25
updated: 2026-09-09
colors:
  bg: '#f5f7fa'
  surface: '#ffffff'
  surface-alt: '#f1f5f9'
  border: '#e2e8f0'
  border-strong: '#cbd5e1'
  ink: '#1e293b'
  ink-dim: '#64748b'
  ink-faint: '#94a3b8'
  accent: '#0d9488'
  accent-soft: '#ccfbf1'
  warn: '#d97706'
  warn-soft: '#fef3c7'
  ok: '#16a34a'
  ok-soft: '#dcfce7'
  danger: '#dc2626'
typography:
  family:
    note: 'System font stack — -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  screen-title:
    fontSize: 24px
    fontWeight: 700
    letterSpacing: -0.01em
  screen-sub:
    fontSize: 13px
    fontWeight: 400
  body:
    fontSize: 14px
    fontWeight: 400
  label:
    fontSize: 12px
    fontWeight: 600
  meta:
    fontSize: 11.5px
    fontWeight: 600
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 16px
  full: 999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 32px
components:
  brand-mark:
    shape: '{rounded.sm}'
    background: '{colors.accent}'
    color: '{colors.surface}'
    letter: T
  primary-button:
    background: '{colors.accent}'
    color: '{colors.surface}'
    rounded: '{rounded.lg}'
    shadow: '0 8px 18px -6px rgba(13,148,136,0.5)'
  status-chip:
    rounded: '{rounded.full}'
    ok: { background: '{colors.ok-soft}', color: '{colors.ok}' }
    warn: { background: '{colors.warn-soft}', color: '{colors.warn}' }
    neutral: { background: '{colors.accent-soft}', color: '{colors.accent}' }
---

## Brand & Style

TradesLine (formerly "Sparkline," and formerly scoped to electricians only) is a calm, elevated operations tool for any self-employed tradesperson running jobs solo or with a small crew — electricians, plumbers, carpenters, general builders. The rebrand and broadening change *who* the product is for, not *what kind of thing* it is: it should still read as polished business software a tradesperson would trust for quoting and invoicing, not a rugged field-utility skin or a generic consumer app. Nothing about the visual language is electrical-specific (no wire/bolt iconography, no trade-coded color), which is precisely why the existing "Direction B — Clean/Modern SaaS" identity carries over unchanged into the multi-trade rebrand: white cards, a light neutral canvas, soft elevation, restrained teal accent. The trade a user practices shows up in *content* (job types, materials, wholesalers), never in the shell's visual identity.

## Colors

- **`bg` (`#f5f7fa`)** — app canvas. Cool, quiet, recedes behind content.
- **`surface` (`#ffffff`)** / **`surface-alt` (`#f1f5f9`)** — cards and rows sit on `surface`; recessed elements (quantity steppers, chips) sit on `surface-alt`.
- **`ink` / `ink-dim` / `ink-faint`** — three-step text hierarchy (primary copy / secondary copy / metadata & timestamps).
- **`border` / `border-strong`** — `border` (`#e2e8f0`) is a hairline for cards, rows, and dividers; `border-strong` (`#cbd5e1`, new this draft) is for editable-field boundaries specifically, where `border` alone fell below reliable contrast against a white input. `border-strong` was already used ad hoc for the checkbox control's border before this draft named it as a token.
- **`accent` (`#0d9488`, teal-600)** — the one chromatic color for primary actions, the current lifecycle stage, and links. Used identically regardless of the user's trade — no per-trade accent variants.
- **`warn` (`#d97706`)** — lead-time / delivery risk flags only.
- **`ok` (`#16a34a`)** — delivered / completed states only.
- **`danger` (`#dc2626`)** — destructive actions (remove material, etc.) — new token this draft, formalizing the red already introduced for the material-remove button so it's not a one-off.

Avoid: trade-coded colors (e.g., no "electrician blue" vs "plumber orange"), gradients, and any second chromatic accent competing with teal for primary-action attention.

## Typography

System font stack, platform-native rendering rather than a custom webfont — keeps the app light and fast on the phone/tablet the tradesperson is using on-site. Three roles carry almost everything: `screen-title` (screen headers), `body` (content, form fields, list rows), `meta` (timestamps, secondary counts, chip labels). No display sizes beyond `screen-title`; no all-caps section labels except short `label`-role field captions.

## Layout & Spacing

Scale: 4 / 8 / 12 / 16 / 20 / 32px. Mobile-first single column throughout (see `EXPERIENCE.md.Foundation`); the six-stage job stepper and card-based lists both depend on generous vertical spacing (`{spacing.4}`–`{spacing.5}`) between cards and tighter spacing (`{spacing.2}`) within a card's internal rows, unchanged from the prior draft.

## Elevation & Depth

Two elevation levels only: flat (`surface-alt` recessed elements) and one soft card shadow (`0 1px 2px rgba(15,23,42,0.04)` for list rows, heavier `0 20px 40px -12px rgba(15,23,42,0.18)` reserved for the phone-frame/modal level). No elevation ramp beyond that — depth signals "this is a distinct card," not a hierarchy of importance.

## Shapes

`{rounded.sm}` (6px) for the brand mark and tight controls. `{rounded.md}`–`{rounded.lg}` (10–14px) for rows, buttons, and form fields. `{rounded.xl}` (16px) for cards. `{rounded.full}` for status chips and the stepper dots. Consistent rounding across trades — no per-trade shape treatment.

## Components

- **Brand mark** — single-letter mark, `{components.brand-mark}`. Was "S" (Sparkline); becomes "T" (TradesLine) this draft.
- **Status chip** — `{components.status-chip}`, used for wholesaler stock state, job-stage captions, and invoice status. Neutral/ok/warn variants only — never a fourth color.
- **Primary button** — `{components.primary-button}`, teal fill, used for the one primary action per screen (Sign up / Sign in, + New Job, Confirm, etc.).
- **Six-dot stepper** — unchanged visual pattern from the prior draft (filled = current, done = green, empty = pending); still spans all six lifecycle stages regardless of trade.
- **Form field** — label (`label` role) above a `surface` (white, not `surface-alt`) input with a `border-strong` boundary, `danger`-toned inline error text below. Revised this draft (competitive research, see `.memlog.md`): a `surface-alt` field on the `bg` canvas read as disabled/inactive rather than editable, and the prior hairline `border` fell below reliable contrast on white — both fixed by this token pair. Reserve `surface-alt` fields specifically for a `disabled` state, so disabled genuinely reads differently from editable. Applies everywhere a labeled field appears: login, Profile (display and edit mode), warehouse add-form, invoice edit.

## Do's and Don'ts

| Do | Don't |
|---|---|
| One teal accent for all primary actions, any trade | Introduce per-trade accent colors or badges |
| Keep the brand mark, stepper, chip, and card system exactly as designed for electricians | Reskin the shell "for plumbers" — differentiation lives in content, not chrome |
| Use `danger` red only for destructive confirmation | Use red for anything else (it was previously used ad hoc for the remove button; now formalized) |
| System font stack, platform-rendered | Custom display webfont |
| Flat two-level elevation | An elevation ramp implying a hierarchy of card "importance" |
| White (`surface`) background + `border-strong` for any editable field | Gray (`surface-alt`) for an editable field — reserve gray for `disabled` fields specifically |
