---
title: Rubric Walk — ARCHITECTURE-SPINE.md (TradesLine)
reviewed_file: ../ARCHITECTURE-SPINE.md
reviewer: rubric-walker (subagent)
date: 2026-09-05
---

# Rubric Walk: TradesLine Architecture Spine

## Overall Verdict

The spine is well-formed and its six ADs are each individually sound, enforceable, and correctly scoped against EXPERIENCE.md/brief.md — but it has one un-modeled entity (job presets) that its own AD-1 language implies should exist, and one internal fact error (the "six lifecycle stages... unchanged from the existing prototype" claim doesn't match the prototype's actual code). Both are exactly the kind of thing that causes two independently-built epics to diverge, so this is not ready to hand downstream as-is without a fix pass.

---

## Checklist Walk

### 1. Fixes the real divergence points for the level below — misses none?

Mostly yes. AD-1 through AD-6 each target a real fork point visible in the sources (trade-scoping, geocoding vs. routing-key, catalog provenance, email vs. log, float vs. cents, auth provider vs. session). One divergence point is **not** fixed despite being implied by AD-1's own wording: **job presets**. AD-1's rule text is "every preset/material/wholesaler read goes through a service function that takes the signed-in user's `trade` and filters by it; no repository method returns unscoped catalog rows to a UI path" — this treats presets exactly like materials/wholesalers (repository-backed, trade-filtered), but no `Preset`/`JobPreset` entity appears anywhere: not in "Core entities" (memlog line 22), not in the Structural Seed's `prisma/schema.prisma` outline, not in the ERD. See Finding 1.

### 2. Every AD's Rule is enforceable and actually prevents its stated divergence?

- **AD-1** (trade scoping): Rule is a code-review-enforceable convention ("no repository method returns unscoped catalog rows"); prevents the stated leak. Sound, modulo the preset gap above.
- **AD-2** (routing-key coverage): Rule is mechanically precise (`servedRoutingKeys: string[]`, first-3-chars membership) — fully enforceable at the type/query level, no ambiguity. Sound. Eircode routing-key terminology is used correctly (first 3 characters of an Eircode is in fact the "Routing Key").
- **AD-3** (catalog source): Enforceable via a required, non-nullable `source` enum column; genuinely prevents a future feed from forking the schema. Sound.
- **AD-4** (message log, no send): Enforceable by code review / absence of any SMTP/queue dependency; sound, matches EXPERIENCE.md's "no outbound email, no inbound reply handling" exactly.
- **AD-5** (integer cents): Enforceable via column typing + "computed once, in the service layer" convention. Sound, and it correctly targets the two paths (materials-cost toggle, invoice total) that would otherwise diverge.
- **AD-6** (session, no password): Enforceable by convention (no password field exists, every Server Action reads session). Sound; correctly rejects both failure modes (full auth provider and regressing to client-only state).

All six Rules are individually enforceable and each maps to a real, correctly-identified prevented divergence.

### 3. Anything under "Deferred" that should have been an AD instead?

No. Each deferred item (real wholesaler API/EDI, scraping, geocoding, real email, multi-user/payments, Carpenter/GB catalogs, brief.md refresh) is either already covered by an existing AD's escape hatch (AD-2/AD-3/AD-4 explicitly leave the door open without needing a second AD) or is genuinely unimplemented scope with no code to diverge yet. The Carpenter/GB catalogs item, however, sharpens the missing-Preset-entity problem: EXPERIENCE.md calls it "a content task... not a gap in this design," which only makes sense if presets are cheap-to-add static data — but AD-1's wording pushes toward repository-backed presets, so whether adding Carpenter's catalog later is "add rows" or "add a TS array" is currently undefined. This is a consequence of Finding 1, not a new deferred-item problem.

### 4. Named tech plausible/current?

- Next.js 16.3.4 — plausible progression from 15.x (Oct 2024) by Sept 2026; no red flags.
- Prisma ORM 7.10.0 pinned, with the claim that `@latest` currently resolves to an "8.x dev line" — **flagged**. npm's `latest` dist-tag conventionally points at the newest *stable* release; a package shipping an unstable major under `latest` (rather than under a `next`/`beta` tag) would be unusual package hygiene. This may be accurate (worth trusting if it was actually checked live during this session), but it's the one piece of named tech I can't independently corroborate and it reads a little too specific-yet-odd to accept at face value. Recommend a `npm view prisma dist-tags` / registry check before this version pin ships in a story.
- Vercel Postgres (Neon-backed) — current, correct (Vercel Postgres has been Neon-backed since the 2024 transition). No issue.
- Prisma `String[]` for `servedRoutingKeys` — valid for the `postgresql` provider (native array support). No issue.

### 5. Ratifies vs. contradicts the brownfield code?

Mostly ratifies — VAT rate (13.5%), EUR formatting, wholesaler chip/stock/lead-time pattern, search-based add-material picker, and the "materials-cost toggle" invoice math (`invoiceBreakdown` in `js/app.js`) are all preserved as concepts. AD-5's server-side-only cents computation is a real improvement over the current client-side float math in `js/app.js` (`invoiceBreakdown`, `estimateJobTotal` use plain floating-point `unitPrice * qty` arithmetic) without contradicting its behavior.

One real contradiction risk: see Finding 2 below — the "six lifecycle stages (unchanged names from the existing prototype)" convention line doesn't actually match what's in `js/state.js`/`js/app.js`.

### 6. Parent spine inheritance

N/A — first spine, `binds: []`, no parent.

### 7. Every structural dimension this altitude owns is decided/deferred/flagged?

Covered: paradigm/layering, naming, data formats (ids/dates/money/enum-in-principle), state/mutation/error/session conventions, stack + version pins, deployment/environments (explicitly single-environment, with a stated revisit trigger — this is the one dimension the checklist calls out by name, and it's handled, not silent).

Not covered, and not deferred/flagged either (silent):
- **Job presets as data** (Finding 1) — silent as a modeled dimension despite AD-1 implying it needs one.
- **Testing strategy** — no unit/integration/e2e convention anywhere (not in Consistency Conventions, not in Deferred). Given the spine's whole point is a testable layered split (service/repository), leaving this fully silent means two epics could each invent a different testing approach with nothing here to arbitrate.
- **Seeding/migrating existing catalog data** — `js/data.js`'s `MATERIAL_CATALOG`/`JOB_PRESETS` (researched real-world prices, per its own provenance comment) has no stated path into `WholesalerCatalogItem` rows (seed script vs. re-keyed manual entry). Minor on its own, but it's downstream of Finding 1 and worth resolving together.

---

## Findings (prioritized)

### Finding 1 — [High] Job presets are implied to be repository/DB-backed by AD-1, but no Preset entity is modeled anywheree

AD-1's Rule text: *"every preset/material/wholesaler read goes through a service function that takes the signed-in user's `trade` and filters by it; no repository method returns unscoped catalog rows to a UI path."*

This groups "preset" with "material" and "wholesaler" as if all three are repository-fetched catalog data. But:
- Core entities (`.memlog.md` line 22) lists `User`, `Job`, `JobMaterial`, `WholesalerBranch`, `WholesalerCatalogItem`, `WholesalerMessage`, `Invoice` — no `Preset`/`JobPreset`.
- The Structural Seed's `prisma/schema.prisma` outline and the ERD mermaid block both omit any preset table.
- The Capability Map row ("Trade-scoped dashboard & job presets → `app/dashboard/`, preset service → AD-1") names only a service, no backing model.
- Today's prototype (`js/data.js`) implements presets as a plain static `JOB_PRESETS` JS array, not a DB table — and EXPERIENCE.md's framing of Carpenter/General-Builder catalogs as "a content task" for `bmad-build` reads as if presets stay cheap static data, not DB rows requiring migrations.

An epic building the dashboard/preset picker and an epic building the materials/wholesaler catalog could independently decide differently here (one keeps presets as trade-keyed static arrays; another builds a `Preset` Prisma model + repository to satisfy AD-1's literal wording) — precisely the divergence ADs exist to prevent. This needs either: (a) AD-1's wording narrowed to just material/wholesaler reads, with presets explicitly declared out-of-DB (static, trade-keyed config) for this draft, or (b) a `Preset` entity added to the Structural Seed/ERD if presets really are meant to be DB rows (which would also change how "Carpenter/GB catalogs are a content task" should be described — content-editing a DB table is a different task shape than adding a TS array entry).

### Finding 2 — [High] "Six lifecycle stages, unchanged from the existing prototype" is asserted but not enumerated, and doesn't match the prototype

The Consistency Conventions table says: *`Job.stage`: enum of the six lifecycle stages (unchanged names from the existing prototype)*. Three different "six" lists exist across the sources, and none is stated explicitly in the spine:

- **brief.md / EXPERIENCE.md's six stages** (both consistent with each other): Job Details → Materials Needed → Wholesaler Selected → Materials Delivered → Job Completed → Invoice.
- **The prototype's actual code** (`js/state.js` `STATUS_ORDER`, `js/app.js` `STATUS_LABELS`): seven named slots — `job-details, materials-needed, wholesaler-selected, materials-delivered, job-started, job-completed, invoice` — and `js/app.js`'s `jobStartedHTML`/`handleAdvance` machinery actively uses `job-started` as a real, distinct, persisted status between "materials-delivered" and "job-completed." In practice only six of the seven ever get assigned to a real job (`job-details` is dead — `createJobFromPreset` creates jobs directly at `materials-needed`), but that live six is: `materials-needed, wholesaler-selected, materials-delivered, job-started, job-completed, invoice` — **not** the same six brief.md/EXPERIENCE.md describe (which include "Job Details" and omit "Job Started" entirely). EXPERIENCE.md even describes the UI chrome as a "**Six-dot stepper**... unchanged," but the code's `stepperHTML()` iterates the full 7-entry `STATUS_ORDER`, rendering seven dots, not six.

So "unchanged names from the existing prototype" is true of the code's live enum values but silently contradicts what the brief/UX call the six stages — and the spine doesn't enumerate the actual list either way. Whoever writes the Prisma `Job.stage` enum next needs a definitive, spelled-out list of stage values; right now they'd have to reverse-engineer it from `js/app.js`, and a plausible-looking read of brief.md/EXPERIENCE.md would produce a wrong (6-value, but different 6) enum.

### Finding 3 — [Medium] Prisma "`@latest` resolves to an 8.x dev line" claim is unusual and worth re-verifying

npm's `latest` dist-tag conventionally tracks the newest *stable* release; shipping a pre-release major under `latest` (rather than a `next`/`canary` tag) would be atypical for a project as mature as Prisma. This may well be accurate if it was checked live when the spine was drafted, but it's the one version claim I can't corroborate and its specificity ("8.x dev line") reads a bit too precise to take purely on faith. Worth a quick registry check (`npm view prisma dist-tags`) before a story pins to 7.10.0 on this rationale.

### Finding 4 — [Low] No testing convention decided, deferred, or flagged

The layered paradigm (Server Action → service → repository) is exactly the kind of structure that benefits from a stated testing convention (e.g., "services are unit-tested against a test DB; repositories are integration-tested; UI is untested at this stage"). Nothing in Consistency Conventions or Deferred addresses this — it's simply silent, leaving each epic free to invent its own approach.

### Finding 5 — [Low] No seed/migration path stated for existing catalog data

`js/data.js`'s `MATERIAL_CATALOG`/`JOB_PRESETS` carries researched, non-arbitrary pricing (per its own provenance comment) that presumably should port into the new `WholesalerCatalogItem`/preset data rather than being re-invented. The spine doesn't say whether this becomes a `prisma/seed.ts` script, manual re-entry, or something else. Minor on its own; folds into Finding 1's resolution.

---

## Minor note (not scored as a top finding)

`User.trade` — the memlog/EXPERIENCE.md fixed list (Electrician, Plumber, Carpenter, General Builder) is consistent across sources, so there's low divergence risk, but the spine never states whether `trade` is a Prisma enum or a free string constrained at the service layer. Given the Job.stage enum problem above, it would cost little to spell this out explicitly at the same time.
