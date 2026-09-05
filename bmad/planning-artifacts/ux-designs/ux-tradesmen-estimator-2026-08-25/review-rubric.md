# Spine Pair Review — tradesmen-estimator (TradesLine)

## Overall verdict

The pair is well-shaped mechanically — canonical section order, resolving `sources`, two properly-linked mockups, and both Key Flows have a named protagonist/steps/climax/failure-or-empty-state — but it has drifted from the system it is supposed to govern. The most serious defects are factual, not structural: both files assert a "six-stage / six-dot" job lifecycle that is wrong (the already-built, spec-cited app has seven stages including "Job Started"), the DESIGN.md color palette omits four tokens (`accent-dark`, `danger-soft`, `ok-ink`, `warn-ink`) that are already live in production CSS and that this draft's own new mockups either need or misuse as a result, and the DESIGN.md↔EXPERIENCE.md Components pairing — which the reference exemplar treats as a strict 1:1 contract — matches on only one of nine component names. A downstream consumer who trusted this spine over the real code would visibly regress the stepper and chip colors.

## 1. Flow coverage — adequate

Both Key Flows have a named protagonist (Tom / Niamh), numbered steps, an explicit **Climax:** beat, and an off-happy-path line (Flow 1: "Failure:"; Flow 2: "Empty state:" — this split matches the reference exemplar's own pattern, not an inconsistency). The one real problem is a content contradiction, not a structural gap.

### Findings
- **high** Flow 1's climax states that Tom (a General Builder) "lands on an empty Dashboard captioned for his trade — 'Start a new job' shows builder-relevant presets, not electrician ones" (EXPERIENCE.md, Key Flows → Flow 1, step 5). This directly contradicts the State Patterns "Trade with a thin preset catalog" row and Flow 2's own footnote, both of which state that **only Electrician and Plumber have full preset/material/wholesaler catalogs** and that a General Builder would instead see "No presets yet for General Builder — add a job manually" (EXPERIENCE.md, State Patterns row + Key Flows → Flow 2, "Empty state" line). Tom's climax as written cannot currently happen. *Fix:* either change Tom's trade to Plumber (which does have a full catalog) or rewrite the climax to depict the honest "No presets yet" outcome.

## 2. Token completeness — thin

Every token in DESIGN.md's frontmatter (`colors`, `typography`, `rounded`, `spacing`, `components`) has a real value, and every `{path.to.token}` reference in the prose resolves to a defined token — no missing-hex cases inside the document as written. The gap is the other direction: tokens that already exist and are load-bearing in the shipped app are absent from the frontmatter entirely.

### Findings
- **critical** DESIGN.md's `colors` block is missing four tokens that are already defined and actively used in `css/styles.css`: `accent-dark` (`#0f766e` — button hover, status-badge-active text, link color: `css/styles.css:15,233,321`), `danger-soft` (`#fee2e2` — material-remove button background, error banners: `css/styles.css:24,538,742`), `ok-ink` (`#15803d`) and `warn-ink` (`#92400e` — the actual chip text colors used for ok/warn stock states: `css/styles.css:19,22,592,596`). As a direct consequence, DESIGN.md's own `status-chip` component spec (`ok: {..., color: '{colors.ok}'}`, `warn: {..., color: '{colors.warn}'}`) contradicts the real, already-shipped chip text colors, which use the darker ink variants instead (DESIGN.md frontmatter `components.status-chip`). *Fix:* add the four missing tokens and repoint `status-chip.ok.color`/`status-chip.warn.color` to `{colors.ok-ink}`/`{colors.warn-ink}`.
- **high** Because `danger-soft` isn't documented, this draft's own new mockup reinvents a near-miss, undocumented shade instead of citing the real token: `mockups/signup.html`'s `.input.err` background is `#fef2f2`, while the real, already-shipped `--danger-soft` is `#fee2e2` (`css/styles.css:24`). *Fix:* once `danger-soft` is a token, correct the mockup to the exact value.
- **medium** `screen-sub` is defined in the `typography` frontmatter (fontSize/fontWeight) but never mentioned in the Typography prose, which claims "Three roles carry almost everything: `screen-title`, `body`, `meta`" (DESIGN.md, Typography section) — silently dropping both `screen-sub` and `label` from that count. `screen-sub` in particular has no prose explanation anywhere and is discoverable only via the frontmatter or by inference from the mockups' `.screen-sub`/`.sub` classes. *Fix:* name all five roles in the Typography prose, or state explicitly which are minor variants of `body`/`meta`.
- **low** The primary-button's disabled visual treatment (`#99d8d1`, no shadow — `mockups/signup.html` `.btn-primary.disabled`) has no token or component rule anywhere in DESIGN.md, even though the behavior it renders ("Submit stays disabled") is a named State Pattern in EXPERIENCE.md. *Fix:* add a disabled state to the `primary-button` component definition.

## 3. Component coverage — broken

Extracting every component name from both files: DESIGN.md.Components lists Brand mark, Status chip, Primary button, Six-dot stepper, Form field. EXPERIENCE.md.Component Patterns lists Signup form, Trade selector, Job preset picker, Materials list + wholesaler row, Six-dot stepper. Only **one** name — Six-dot stepper — appears identically in both tables. The reference exemplar (`design-example-mobile.md` / `experience-example-mobile.md`) pairs all five of its components 1:1 by name; this pair does not.

### Findings
- **critical** Eight of nine component names fail to pair: DESIGN.md-only (no behavioral row anywhere in EXPERIENCE.md) — Brand mark, Status chip, Primary button. EXPERIENCE.md-only (no visual-spec row anywhere in DESIGN.md) — Signup form, Trade selector, Job preset picker, Materials list + wholesaler row. *Fix:* reconcile to a shared vocabulary — every component needs both a DESIGN.md visual row and an EXPERIENCE.md behavioral row under the same name.
- **high** Trade selector — a brand-new interactive pattern this draft introduces — has zero dedicated DESIGN.md visual grounding; it's only mentioned in passing inside the generic "Form field" row ("used for the Signup form's trade selector and address fields"). Concretely, the selected-chip text color rendered in `mockups/signup.html` (`#0f766e`) isn't defined by any DESIGN.md token (see Token completeness, above) — there is no spine-sourced answer for what makes a trade chip look "selected." *Fix:* give Trade selector its own DESIGN.md.Components row (unselected/selected border, background, and text-color tokens).
- **medium** Job preset picker and Materials list + wholesaler row — both core, frequently-touched surfaces explicitly named in EXPERIENCE.md.Component Patterns — have no matching visual-spec entry in DESIGN.md at all (no preset-card, job-card, quantity-stepper, or wholesaler-chip rows). A downstream consumer must reverse-engineer these from `css/styles.css` or the mockups rather than the spine. *Fix:* add DESIGN.md rows for these, or state explicitly that their visual truth lives in the (unlisted) prior full draft and cite it.
- **low** Status chip and Primary button behavioral rules (which of the three chip variants applies where; disabled/pressed states) are only implied via other rows (Materials list's "wholesaler chip with stock/lead-time," State Patterns' "Submit stays disabled") rather than stated as their own rule. Low impact since Interaction Primitives covers generic tap behavior.

## 4. State coverage — thin

Walking the three IA surfaces: Signup has missing/invalid-field and trade-unselected states; Dashboard has first-job-empty and thin-catalog states; Job Detail inherits unchanged states from the existing app (reasonable, since the spine explicitly defers to it). Offline and cold-load states are correctly omitted — this is a static, local-only demo with no network calls, so they don't apply.

### Findings
- **high** The Component Patterns → Trade selector row promises "no profile/settings surface exists yet — logged as an open item below" (EXPERIENCE.md, Component Patterns), but no such open item exists anywhere else in EXPERIENCE.md or in `.memlog.md`. The only "Open item" in either file concerns preset-catalog completeness, not trade-immutability. This decision (a user can never change trade after signup) is effectively untracked. *Fix:* either add the promised open item to State Patterns/`.memlog.md`, or drop the dangling "logged... below" claim.
- **medium** No state is defined for what a user sees on Job Detail / Materials Needed if they proceed past the Dashboard's thin-catalog fallback for Carpenter/General Builder — State Patterns only covers the picker-level message, not the downstream materials/wholesaler screens for a trade with an incomplete catalog. *Fix:* add a row, or state explicitly that this path isn't reachable in this draft.
- **low** Signup success (toast) is documented only under Interaction Primitives, not as a row in the State Patterns table, where a reader scanning "what happens after valid submit" would look first.

## 5. Visual reference coverage — thin

Both `mockups/` files are linked inline in EXPERIENCE.md's Information Architecture section, and each names exactly what it illustrates (signup: at-rest + validation-error; dashboard: plumber vs. existing electrician side by side). No `wireframes/` or `imports/` directories exist. Linking hygiene is perfect — but one of the two promoted mockups is factually wrong about the system it claims to prove parity with.

### Findings
- **critical** DESIGN.md ("Six-dot stepper... spans all six lifecycle stages") and EXPERIENCE.md ("Six-stage lifecycle body: Job Details → Materials Needed → Wholesaler Selected → Materials Delivered → Job Completed → Invoice"; "Six-dot stepper | Job Detail | Unchanged — six stages regardless of trade") both assert a six-stage job lifecycle. The real, already-built app — including `spec-job-flow-prototype.md`, which EXPERIENCE.md itself lists as a canonical `source` — has **seven** stages: `job-details, materials-needed, wholesaler-selected, materials-delivered, job-started, job-completed, invoice` (`js/state.js:26-34`; stepper renders `STATUS_ORDER.length` dots, `js/app.js:133-161`; spec's own Design Notes call for "an array of 7 labels"). "Job Started" is a real, distinctly labeled stage (`js/app.js:16`) that both spine documents simply omit. Consistent with this, `mockups/dashboard-trade-scoped.html` — one of only two promoted "key screen" mockups, explicitly presented as proof the dashboard is "pixel-identical" to the live app — renders exactly 6 stepper dots and captions "Step 2 of 6," which does not match the live app's 7-dot stepper. *Fix:* correct DESIGN.md and EXPERIENCE.md to the real 7-stage lifecycle (or explicitly document that `job-details` is a non-visited enum value and the stepper is 6 *visited* dots — but then the dot set must be Materials Needed→Invoice, not the current text's Job Details→Invoice), and re-render the mockup with the correct dot count.
- **medium** `mockups/dashboard-trade-scoped.html`'s `.job-list` background (`#f8fafc`) matches neither DESIGN.md's `surface-alt` token (`#f1f5f9`) nor the real app's actual CSS (`background: var(--surface-alt)`, `css/styles.css:267`) — a small fidelity drift in a mockup explicitly presented as shell-parity proof.

## 6. Bloat & overspecification — strong

Both files are lean and scoped to the actual delta (rebrand + signup + trade-scoping), consistent with `.memlog.md`'s framing of this as a second, delta-only draft. No redundant restatement of unchanged content beyond what's needed for context.

### Findings
- **low** A few Interaction Primitives / State Patterns sentences bundle two or three separate decisions into one dense sentence (e.g., the wholesaler-distance/geocoding bullet covers "no autocomplete," "distance is mocked today," and "real geo-matching is out of scope" in one run-on). Not redundant, just harder to scan than necessary.

## 7. Inheritance discipline — thin

`sources` frontmatter in EXPERIENCE.md resolves cleanly — all four listed paths exist (`brief-tradesmen-estimator-2026-08-24/brief.md`, `spec-job-flow-prototype.md`, `spec-dashboard-pricing-material-search.md`, `deferred-work.md`). Section cross-references (`DESIGN.md.Brand & Style`, `DESIGN.md.Components`, `EXPERIENCE.md.Component Patterns`) all point at sections that actually exist.

### Findings
- **critical** EXPERIENCE.md declares `spec-job-flow-prototype.md` a canonical source, but its own IA and Component Patterns text (six-stage lifecycle, six-dot stepper) contradicts that very source's frozen 7-stage `STATUS_ORDER` and Design Notes ("array of 7 labels"). See Visual reference coverage, above, for full evidence — restated here because it's specifically an inheritance failure: the spine did not actually absorb a load-bearing decision from a document it cites as its source of truth.
- **critical** Component names are not identical across DESIGN.md and EXPERIENCE.md — see Component coverage, above (8 of 9 names fail to pair). This is the same discipline check from a different angle: a name introduced in one file should be traceable to the other under the same name, and here it mostly isn't.

## 8. Shape fit — strong

DESIGN.md's sections appear in canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts). EXPERIENCE.md has all required defaults (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) plus the optional Inspiration & Anti-patterns section, in the same order as the reference exemplar, with three genuine rejected-alternative entries (not filler).

### Findings
- None of substance.

## Mechanical notes

- **Broken/dangling reference:** EXPERIENCE.md's Trade selector row promises an open item "logged... below" that does not exist anywhere in EXPERIENCE.md or `.memlog.md` (see State coverage).
- **Cross-document factual error, appears three times:** "six-stage"/"six-dot" language occurs in DESIGN.md.Components, EXPERIENCE.md.Information Architecture, and EXPERIENCE.md.Component Patterns — all three need correcting together once the real 7-stage lifecycle is confirmed as the intended fix (see Visual reference coverage / Inheritance discipline).
- **Naming drift, not breakage:** DESIGN.md's "Form field" is the closest visual counterpart to EXPERIENCE.md's "Signup form"/"Trade selector," but the names don't match — flagged fully under Component coverage.
- **Frontmatter completeness:** DESIGN.md and EXPERIENCE.md frontmatter both match the reference exemplar's shape (DESIGN.md has no `sources`, correctly — that field belongs to EXPERIENCE.md only). `updated: 2026-09-05` in both files is internally consistent with each other and with today's date.
- Protagonist details (Tom/General Builder/Galway; Niamh/Plumber/Cork) are consistent across EXPERIENCE.md's Key Flows and both mockup files — good cross-artifact discipline apart from the Flow 1 contradiction noted above.
