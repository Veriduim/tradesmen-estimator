---
title: Adversarial Review — Architecture Spine (TradesLine)
type: review
reviews: bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
method: two-units-one-level-down (construct pairs that each satisfy AD-1..AD-6 to the letter yet build incompatibly)
created: 2026-09-05
---

# Adversarial Review — TradesLine Architecture Spine

## Verdict

The six ADs are each individually well-formed (clear bind/prevents/rule), but the spine under-specifies the **shape of the entities it governs**, not just their behavior — it names `JobMaterial`, `WholesalerCatalogItem`, `Job.stage`, and `WholesalerMessage` as if their fields are settled, but for each, at least one load-bearing field, relationship, or enum value is never actually pinned down anywhere in the document. In every case below, two builders can each honestly claim "I followed every AD" and still ship incompatible schemas or logic. Several of these are not hypothetical — they're confirmed against the actual prototype source (`js/state.js`, `js/data.js`, `js/app.js`) and the cited EXPERIENCE.md, which already disagree with the spine and with each other.

Highest-priority fix: the spine needs a **named, exhaustive entity/field list** (or a stub `prisma/schema.prisma` sketch) — right now several entities the ADs govern (`JobMaterial`, the preset system, a cross-wholesaler material identity) are referenced by name in AD binds and the Capability Map but never defined with fields, which is the root cause of most pairs below.

---

## Finding 1 — `Job.stage` enum: the spine's own "six stages" claim contradicts its cited source of truth (CRITICAL)

**AD/convention:** Consistency Conventions table — `Job.stage`: "enum of the six lifecycle stages (unchanged names from the existing prototype)."

**Evidence of the contradiction:**
- `js/state.js` `STATUS_ORDER` (the actual prototype, the spine's own cited "unchanged" source) has **seven** entries: `job-details, materials-needed, wholesaler-selected, materials-delivered, job-started, job-completed, invoice`.
- `js/app.js` `STATUS_LABELS` confirms seven matching human labels, including `job-started: 'Job Started'`.
- `EXPERIENCE.md` (a spine *source*) states in its Information Architecture and Key Flows sections only six: "Job Details → Materials Needed → Wholesaler Selected → Materials Delivered → Job Completed → Invoice" — **silently dropping `Job Started`**, and separately asserts "Six-dot stepper... unchanged — six stages regardless of trade."
- The architecture spine picks up EXPERIENCE.md's "six" count but tells builders to take "unchanged names from the existing prototype" — an instruction that, followed literally, yields seven values, not six.

**Concrete incompatible pair:**
- **Builder A** reads the architecture spine's "six stages, unchanged names," goes to the prototype, counts seven, and — trusting "six" as the hard constraint — folds `job-started` into `materials-delivered` (reasoning: "started" isn't really a distinct customer-facing milestone). Ships `Job.stage` with 6 values, no `JOB_STARTED`.
- **Builder B** reads the same instruction, goes to the same prototype, and — trusting "unchanged names from the existing prototype" as the hard constraint — keeps all seven `STATUS_ORDER` values verbatim, including `job-started`. Ships `Job.stage` with 7 values.
- Both cite the same sentence in the spine as justification. A stage-transition Server Action written against Builder A's enum (`materials-delivered → job-completed`) cannot run against Builder B's schema (`materials-delivered → job-started → job-completed`) or vice versa — this is a hard runtime failure (invalid enum value / unreachable transition), not a cosmetic mismatch, and it also breaks any six-dot-stepper UI component built assuming exactly six positions if the other side has seven.
- A third plausible builder normalizes casing/format differently again (`SCREAMING_SNAKE` Prisma enum members like `JOB_STARTED` vs. kebab-case string literals copied straight from the JS, `'job-started'`) since the spine never states the enum's literal member format either.

**Proposed fix:** Add an explicit stage-enum block to the spine (new AD or a hardened Consistency Conventions row) that:
1. Resolves the 6-vs-7 discrepancy explicitly — state whether `job-started` is a real seventh persisted stage or is merged/dropped, and say so in one sentence that overrides both the prototype and EXPERIENCE.md's silent omission.
2. Lists the literal enum member names in order (e.g. `JOB_DETAILS, MATERIALS_NEEDED, WHOLESALER_SELECTED, MATERIALS_DELIVERED, JOB_STARTED, JOB_COMPLETED, INVOICE` or whichever set is chosen), pinning exact casing.
3. States that human-readable labels are a separate mapping (mirroring the prototype's `STATUS_LABELS` split from `STATUS_ORDER`), not derived from the enum member spelling, so no builder re-titlecases the enum for display.

---

## Finding 2 — `JobMaterial.unitPrice` snapshot timing and its link to `WholesalerCatalogItem` are unspecified (HIGH)

**AD/convention:** AD-5 binds `JobMaterial.unitPrice` and mandates "computed server-side only... never re-derived." AD-3 binds `WholesalerCatalogItem` provenance. Neither states *when* a `JobMaterial`'s price is copied from a `WholesalerCatalogItem`, nor does the ER diagram give `JobMaterial` any FK to `WholesalerCatalogItem` — only `WholesalerBranch ||--o{ JobMaterial : supplies`.

**Concrete incompatible pair:**
- **Builder A** (building the "Wholesaler Selected" flow) treats `unitPrice` as a **snapshot**: the moment a wholesaler is chosen for a material, the current `WholesalerCatalogItem.unitPrice` is copied into `JobMaterial.unitPrice` and never touched again, even if the catalog price later changes.
- **Builder B** (building the "Generate Invoice" flow, independently, weeks later) assumes `JobMaterial.unitPrice` is a **live join target** — at invoice time, the service re-reads the current `WholesalerCatalogItem` price for whatever `wholesalerBranchId` is on the `JobMaterial` row and writes/overwrites `unitPrice` then, treating any earlier value as provisional.
- Both are "computed server-side only," both never touch money client-side, both satisfy AD-5's letter. But if a catalog price changes between materials-selection and invoicing, Builder A's invoice reflects the quoted price the customer saw; Builder B's invoice silently reflects a different, later price — a real billing discrepancy, and neither developer can tell from the spine which behavior is "correct" without reading the other's code.
- Compounding this: because `JobMaterial` has no specified FK to `WholesalerCatalogItem` (only to `WholesalerBranch`), Builder A can't even re-derive "which catalog row was this priced from" later for a price-changed audit/display, while Builder B's live-rejoin needs *some* item-level key to find the right catalog row — and since none is specified, Builder B has to invent one (e.g., matching on material name string), which is fragile and may not match Builder A's approach at all.

**Proposed fix:** Tighten AD-5 (or add a new AD) to state explicitly:
- `JobMaterial` carries `wholesalerCatalogItemId` (FK) in addition to `wholesalerBranchId`.
- `unitPrice` is copied from `WholesalerCatalogItem.unitPrice` exactly once, at the moment a wholesaler is assigned to that line item (the per-line "Wholesaler Selected" action), and is immutable afterward.
- Invoice generation sums `JobMaterial.unitPrice × qty` only — it never re-reads `WholesalerCatalogItem` — so a later catalog price change cannot retroactively alter an already-quoted or already-invoiced job.

---

## Finding 3 — No canonical cross-wholesaler material identity exists in the data model (HIGH)

**AD/convention:** Not directly bound by any AD — which is itself the problem. The ER diagram and the Naming row list only `WholesalerBranch` and `WholesalerCatalogItem`; there is no `Material`/`Product` entity. The prototype's actual mechanism for "the same material at three different wholesalers" is a shared `catalogId` (e.g. `'twin-earth-2-5'`) that each per-wholesaler price option keys off of (`js/data.js`) — this is the entire mechanism behind the app's core value prop (wholesaler price comparison), and the spine doesn't carry it forward at all.

**Concrete incompatible pair:**
- **Builder A** adds a plain string column, `WholesalerCatalogItem.materialSlug: string`, and groups rows across branches by exact string match — cheap, mirrors the prototype, but has no referential integrity (a typo silently creates a "new" material that doesn't compare against the others).
- **Builder B**, working the preset-import feature independently, decides string-matching is too fragile for reliable joins and instead adds a first-class `Material` table (`id`, `name`, `trade`) with `WholesalerCatalogItem.materialId` as a real FK — a model that appears nowhere in the spine's naming table, ER diagram, or Capability Map.
- Both satisfy AD-3 ("every `WholesalerCatalogItem` row carries `source`... same table shape") to the letter — AD-3 says nothing about a materialId/slug field either way. But seed data, job-preset material references, and any "compare this material across wholesalers" query built against Builder A's schema cannot run against Builder B's, and vice versa — they've built two different foreign-key universes for the same feature.

**Proposed fix:** Add an AD naming the canonical material-identity mechanism explicitly — e.g., "`WholesalerCatalogItem` carries a required, trade-scoped `materialId: string` (stable slug, e.g. `twin-earth-2-5`), matching the prototype's `catalogId` pattern; this is the only key used to group the same logical material across branches. No separate `Material` table exists in this draft." (Or the inverse — pick one, but pick it here, not per-builder.)

---

## Finding 4 — AD-1's trade-scoping has no field to scope by, and "job preset" is an ungoverned, undefined entity (HIGH)

**AD/convention:** AD-1 binds "all job-preset, material, and wholesaler queries" and requires filtering "by [the user's] `trade`." The Capability Map lists "Trade-scoped dashboard & job presets" governed by AD-1. But the Naming row's Prisma model list (`User, Job, JobMaterial, WholesalerBranch, WholesalerCatalogItem, WholesalerMessage, Invoice`) contains **no preset model at all**, and no model besides (implicitly) `User` is said to carry a `trade` column.

**Concrete incompatible pair:**
- **Builder A** treats "job preset" as static seed content (mirroring the current prototype's `JOB_PRESETS` constant in `js/data.js`) — no DB table, just a trade-keyed object literal in `lib/server/services/presets.ts`, satisfying AD-1 by filtering that in-memory structure by `user.trade` before returning it.
- **Builder B**, working the "Carpenter/General Builder catalog" content task (flagged in Deferred as a future non-architectural task) independently assumes presets are DB rows, and creates a `JobPreset` Prisma model with its own `trade` column, so content can be edited without a redeploy.
- Both are AD-1-compliant (trade-filtered reads), but one preset system is a compile-time constant and the other is a runtime-editable table — incompatible foundations for the same capability, and whichever ships second must throw away the other's work rather than extend it, because the spine never said which one the "preset service" in the Structural Seed (`lib/server/services/` — "trade-scoping...") is supposed to sit on top of.
- Separately: even for `WholesalerBranch`/`WholesalerCatalogItem` (which *are* named models), neither is listed with a `trade` column anywhere. A third builder enforcing AD-1 on wholesaler queries has to invent where trade-scoping attaches — denormalized `trade` on `WholesalerBranch` directly, vs. scoping only through a material/preset join (which, per Finding 3, doesn't exist yet either).

**Proposed fix:** Either (a) add `JobPreset`/`PresetMaterial` to the Naming row and ER diagram as real Prisma models with an explicit `trade` column, closing the "is it DB-backed or a code constant" question, or (b) explicitly state in AD-1 that presets are compile-time, trade-keyed constants (not a DB table) for this draft. Also add `trade` to the explicit field list for `WholesalerBranch` (and/or `WholesalerCatalogItem`/`Material` per Finding 3) so AD-1's "filter by trade" has a named column to filter on.

---

## Finding 5 — Eircode routing-key normalization is unspecified (case, whitespace) (MEDIUM)

**AD/convention:** AD-2 — "A user's routing key is the first 3 characters of the Eircode captured at signup. Coverage is `userRoutingKey IN branch.servedRoutingKeys`."

**Concrete incompatible pair:**
- A real Eircode looks like `D01 F5P2` (routing key + unique identifier, space-separated). EXPERIENCE.md's signup spec only requires "Eircode shape check," not case/whitespace normalization.
- **Builder A** (signup form) stores the Eircode exactly as typed, uppercased at input time via an `oninput` transform, so `"d01 f5p2"` becomes `"D01 F5P2"` before it ever reaches the server.
- **Builder B** (delivery-matching service, built independently) defensively re-uppercases and strips whitespace at query time — reasonable, since AD-2 never says normalization already happened upstream — and additionally strips the internal space before slicing the first 3 characters (`"D01F5P2"` → `"D01"`), which happens to produce the same result here but reflects a different, undocumented assumption about storage format.
- **Builder C**, populating `WholesalerBranch.servedRoutingKeys` from manually-entered admin data (AD-3's "manual" source), types routing keys as `"d01"` lowercase, or with a trailing space, because AD-2's rule gives an example (`"D01"`, `"T12"`) but never states a canonical stored format or a validation/normalization step applied uniformly to both sides of the `IN` check.
- Net effect: the `userRoutingKey IN branch.servedRoutingKeys` comparison in AD-2 is a raw string-set membership test with no stated case-folding — two builders on either side of that comparison (signup capture vs. admin catalog entry) can each be internally consistent yet produce a silent, hard-to-detect false-negative "this wholesaler doesn't deliver to you" for real users.

**Proposed fix:** Tighten AD-2 to state: Eircode is stored uppercase with all whitespace stripped, validated against the Eircode format at signup (single normalization point, in the signup Server Action, not repeated defensively elsewhere); `servedRoutingKeys` entries are validated/normalized to the same uppercase-no-whitespace form at write time (in the same repository method AD-3 already centralizes for catalog writes); the `IN` comparison is a case-sensitive exact-match on these normalized forms only.

---

## Finding 6 — `WholesalerMessage`'s schema will collide with the deferred real-email feature it explicitly anticipates (MEDIUM)

**AD/convention:** AD-4 — the log's fields are fixed at exactly `jobId, wholesalerBranchId, authorUserId, body, createdAt`. The Deferred section explicitly flags "Real email sending + inbound reply handling for wholesaler comms... revisit once real wholesaler order-placement exists," clearly anticipating this table (or something like it) growing to handle that.

**Concrete incompatible pair:**
- `authorUserId` is a straight FK to `User`. Wholesalers are not `User` rows anywhere in this schema (no wholesaler login/auth exists). This means an inbound reply "from the wholesaler" — the exact case Deferred flags as future work — is structurally unrepresentable in the current shape without a schema change, and nothing in AD-4 marks the 5-field list as extensible or reserves a discriminator for it.
- **Builder A**, building a "message history" UI component now, notices this gap and preemptively future-proofs by making `authorUserId` nullable and adding a `direction: 'outbound' | 'inbound'` column, reasoning "a null author + direction='inbound' means the wholesaler sent it" — a schema change made *today*, ahead of the feature being scoped, that AD-4 doesn't forbid (it only forbids sending, not extra columns).
- **Builder B**, building the "log a follow-up note" write path independently, doesn't anticipate this at all and ships strictly the 5 AD-4 fields with `authorUserId` as `NOT NULL`.
- When the real-email feature eventually lands, whichever builder's assumption didn't win requires a breaking migration of a table the other already depends on (nullable-author queries, or a `direction` column that's always `'outbound'` and never checked) — and worse, if both builders shipped their own version to different branches/environments before either was told the other's shape, the two `WholesalerMessage` tables are already incompatible in production data, not just in code review.

**Proposed fix:** Add a sentence to AD-4 explicitly freezing the schema for this draft: "The 5 fields above are the complete `WholesalerMessage` shape for this draft; no nullable-author, `direction`, or `channel` column may be added speculatively. Real inbound/email support, when scoped, gets a new table (or a reviewed schema migration explicitly called out in a future AD) rather than a silent extension of this one." This converts an implicit assumption into an explicit, checkable rule.

---

## Finding 7 — AD-6 doesn't mandate a single chokepoint for "resolve the current user," nor a shared error contract for a missing/invalid session (MEDIUM)

**AD/convention:** AD-6 — "Every Server Action reads the session to resolve the current user; there is no anonymous write path." The Structural Seed lists `session.ts` ("signed httpOnly cookie helpers," plural) but nothing requires all Server Actions to funnel through one specific exported function, and nothing specifies the behavior on a missing/invalid/expired session.

**Concrete incompatible pair:**
- **Builder A** (building `CreateJobMaterial`) imports a shared `getCurrentUser()` from `session.ts` that verifies the cookie's signature and throws a typed `UnauthenticatedError` if it's missing, malformed, or fails verification.
- **Builder B** (building `PostWholesalerMessage`, independently) also "reads the session to resolve the current user" per AD-6's letter — but writes their own inline `cookies().get('session')?.value` read and trusts the raw value as `User.id` directly, without verifying the signature (they didn't know `getCurrentUser()` existed, or didn't realize it was meant to be the only path) — this technically satisfies AD-6 ("reads the session... resolves the current user... no anonymous write path exists," since *some* value is always read) while reintroducing exactly the spoofable-cookie hole AD-6's "signed" cookie was meant to prevent.
- Even if both call the same helper, AD-6 doesn't say what happens when the session is missing/expired: Builder A's Server Action might redirect to `/signup`; Builder B's might throw an unhandled 500; a third might silently proceed treating the request as anonymous if a developer forgets the check on one particular action (nothing structural — like middleware — forces it), producing inconsistent UX and a possible accidental anonymous-write path via whichever Server Action skipped the pattern.

**Proposed fix:** Tighten AD-6 to name the single legal entry point: "`lib/server/session.ts` exports one function, `requireUser(): Promise<User>`, that verifies the signed cookie and throws a typed `UnauthenticatedError` on missing/invalid/expired session; every Server Action's body must call it as its first statement (or via a shared Server Action wrapper) — no Server Action may read or decode the session cookie directly. `UnauthenticatedError` is translated uniformly [redirect-to-signup / form error — pick one] by the shared wrapper, not per Server Action."

---

## Summary Table

| # | Finding | Severity | Fix in one line |
|---|---|---|---|
| 1 | `Job.stage`: spine says "six," prototype has seven, EXPERIENCE.md silently drops one | Critical | Inline the literal, ordered enum member list and resolve the 6-vs-7 count explicitly |
| 2 | `JobMaterial.unitPrice` snapshot timing vs. `WholesalerCatalogItem` unspecified | High | Add `wholesalerCatalogItemId` FK; mandate snapshot-once-at-selection, never re-read at invoice time |
| 3 | No cross-wholesaler material identity in the data model | High | Add a named `materialId`/`Material` mechanism to the spine's entity list |
| 4 | AD-1 trade-scoping has no named field/entity to scope by; "job preset" is undefined | High | Add `JobPreset` to the model list with a `trade` column, or declare presets as code constants explicitly |
| 5 | Eircode routing-key case/whitespace normalization unspecified | Medium | Pin canonical stored form (uppercase, no whitespace) and single normalization point |
| 6 | `WholesalerMessage` schema not frozen against the deferred real-email feature | Medium | Explicitly freeze the 5-field shape; forbid speculative nullable-author/direction columns |
| 7 | AD-6 has no mandated single session-resolution function or error contract | Medium | Name one exported `requireUser()` chokepoint + typed error, ban ad hoc cookie reads |
