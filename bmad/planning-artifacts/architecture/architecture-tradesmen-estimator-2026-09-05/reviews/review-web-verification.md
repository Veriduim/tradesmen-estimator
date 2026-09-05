---
name: Web Verification Review — TradesLine Architecture Spine
type: review
target: bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
review-date: 2026-09-05
method: live web search against each committed technology/version claim in the Stack table and the Eircode routing-key claim in AD-2
---

# Web Verification Review — TradesLine Architecture Spine

## Overall Verdict

Four of five checked claims hold up against live web research as of 2026-09-05 and were evidently reality-checked, not just asserted from training-data priors. One claim — "Vercel Postgres (Neon-backed)" — uses a product name that has been retired for roughly a year and a half and should be corrected before this spine is treated as build-ready.

## Findings

### 1. Next.js 16.3.4 — PASS (verified real, current, correctly characterized)

- `v16.3.4` is a real, current GitHub release tag (`vercel/next.js` releases page), published ~4 days before this spine's 2026-09-05 date — i.e., it is the actual latest patch at the time of writing, not a guessed/hallucinated version number.
- It sits in the `16.3.x` line (`next-16-3` blog post: Instant Navigations, faster dev server/builds, TypeScript 7 support in `next build`), which is the current stable minor as of Sept 2026.
- App Router + Server Actions remains the actively-recommended pattern in 2026: Vercel continues to state new feature development happens only in App Router, Pages Router is maintenance-mode only, and Server Actions (stable since Next 14) are described as production-ready and the standard mutation pattern for form-driven CRUD apps like this one.
- **Conclusion:** no correction needed. This looks researched (an oddly specific 4th patch digit is not something a model free-associates from training data).

### 2. Prisma ORM 7.10.0 — PASS (verified real; pin-vs-float reasoning is sound)

- `7.10.0` is a real, current Prisma ORM release (landed ~2026-08-26), the latest stable point release on the 7.x line — introduces a `@prisma/prisma7` compatibility package specifically so projects can keep the Prisma 7 CLI/config while `prisma@8` exists alongside it.
- Prisma 8 does exist on npm and (per Prisma's own release-maturity docs) is currently versioned as `8.0.0-rc.N` — a release-candidate line published under the `latest` dist-tag. That means the spine's warning — *"`@latest` currently resolves to the 8.x dev line — do not float"* — is factually correct, not a hedge invented to sound cautious. Pinning to `7.10.0` and avoiding a floating `@latest`/`^7` range that could silently pull an RC is the right call given Prisma's own dist-tag behavior right now.
- **Conclusion:** no correction needed. This is a case where a plausible-sounding caveat was checked and turned out to be literally true — good sign the architecture pass did real verification here.

### 3. "PostgreSQL via Vercel Postgres (Neon-backed)" — FLAG (stale product name; needs rewording)

- **"Vercel Postgres" as a distinct, provisionable product no longer exists.** It was discontinued and all existing Vercel Postgres databases were auto-migrated to Neon during Q4 2024–Q1 2025 (per Neon's own "Vercel Postgres Transition Guide" and Vercel's `/docs/postgres`). New projects provision Postgres today through the **Vercel Marketplace** (options include Neon, Prisma Postgres, Supabase, PlanetScale), integrated via the "Vercel-Managed Integration" or "Neon-Managed Integration," not a first-party "Vercel Postgres" SKU.
- A build story that says "provision Vercel Postgres" will hit a dashboard that doesn't have that product anymore — this is a real implementation-blocking staleness, not pedantry, since it's in the Stack table a builder will follow literally.
- Layered on top: Neon itself was acquired by Databricks (~$1B, closed mid-2025) and Neon's underlying engine is now also marketed under Databricks' **"Lakebase Postgres"** brand for Databricks-platform use, while Neon continues to operate its standalone product (and the Vercel Marketplace integration) under the Neon name. So "Neon-backed" is still directionally true today, but it's worth the architect knowing the Neon brand itself now sits under a bigger, renamed corporate umbrella — a second signal this row was written from a pre-2025 mental model rather than a fresh look.
- **Recommended fix:** change the Stack row to something like `PostgreSQL | via Vercel Marketplace — Neon integration (Vercel Postgres was retired in favor of Marketplace integrations in late 2024/early 2025)`.
- **Severity:** Medium. Doesn't invalidate the architecture (Neon-via-Vercel is still a fine, real choice), but the literal product name is wrong/deprecated and would confuse whoever provisions the database.

### 4. Eircode routing keys as delivery-coverage proxy — PASS (sound characterization)

- Confirmed: Ireland has **139 routing key areas**. Format is one letter + two digits (e.g., `D01`, `T12`), with a single documented exception (`D6W`) — consistent with the spine's `servedRoutingKeys: string[]` / `"D01"`, `"T12"` examples and its "first 3 characters" rule.
- Routing keys map to An Post's hub-and-spoke sorting geography (post towns/regions), so using "first-3-chars membership" as a coarse delivery-area proxy is a real, sound simplification of Ireland's postcode system — not an invented mechanic.
- One caveat worth surfacing (not a factual error, a granularity risk): routing-key areas are *not* uniform in size — Dublin postal districts (D01–D24) are small and dense, while some rural routing keys span large, sparser geography. A wholesaler branch that "serves T12" may in practice only deliver to part of that area. The spine's own Deferred section already anticipates this ("revisit only if routing-key granularity proves too coarse in practice"), so this is already hedged, not an unhandled gap — just worth flagging for anyone who assumes routing-key membership implies uniform delivery guarantee.
- **Conclusion:** no correction needed to AD-2 itself; the existing deferred-risk note already covers the one real edge case.

### 5. Other Stack-table entries

- **Hosting — Vercel:** not a version claim, nothing to verify; consistent with the Postgres row above (same platform).
- **Bonus/out-of-scope but cheap to check — 13.5% VAT (AD-5):** confirmed correct as Ireland's current reduced VAT rate applying to construction services in 2026 (standard rate 23%; note some other reduced-rate categories moved to 9% from July 2026, but construction services stayed at 13.5%). Flagging one real-world edge case for awareness, not a spine defect: Irish Revenue's "two-thirds rule" can require materials-heavy supplies to be treated/apportioned differently between materials (potentially 23%) and installed labour (13.5%) in some mixed-supply scenarios — AD-5's flat 13.5% rule is a reasonable MVP simplification for a demo/pitch build, but a future real-invoicing pass should not assume 13.5% is universally correct for every materials+labour combination.

## Summary Table

| Claim | Verified? | Severity if wrong | Action |
| --- | --- | --- | --- |
| Next.js 16.3.4, App Router + Server Actions | Real & current | — | None |
| Prisma ORM 7.10.0 pinned, avoid `@latest`→8.x-rc | Real & current, reasoning correct | — | None |
| Vercel Postgres (Neon-backed) | Product name retired ~2024–2025 | Medium | Reword to "Vercel Marketplace — Neon integration" |
| Eircode routing keys, 139 areas, first-3-char proxy | Real & accurate | — | None (existing granularity caveat already sufficient) |
| 13.5% VAT for construction (out-of-scope bonus check) | Correct for 2026 | Low | Note materials/labour apportionment nuance for future real-invoicing work |
