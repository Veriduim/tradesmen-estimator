---
title: 'TradesLine Draft v2 — Job List on Profile'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Profile page has no way to see your jobs — you have to go back to the dashboard.

**Approach:** Reuse the existing `jobSectionHTML`/`jobCardHTML` functions (already built for the dashboard's Active/Completed split) inside `renderProfile()`, fed by the same `state.jobs`. Fixed a real navigation bug found while wiring this up: the `open-job` action never cleared `state.viewingProfile`, so opening a job from anywhere while Profile was showing would leave the screen stuck on Profile even though `state.currentJobId` was set correctly.

**Boundaries:** No new job-list behavior beyond what the dashboard already has (same sort, same Active/Completed split, same click-to-open) — this is a second place to reach the same list, not a new feature.

</frozen-after-approval>

## Code Map

- `draft-v2/js/app.js` (`renderProfile`) — added an Active/Completed job list (reusing `jobSectionHTML`/`jobCardHTML` verbatim) after the labour-rate fields, with an empty-state message when there are no jobs.
- `draft-v2/js/app.js` (`open-job` case) — added `state.viewingProfile = false` to the existing reset block (bug fix, not new scope — every other entry point into a job already reset every other relevant `ui`/`state` flag here, this one was missed).

## Verification

**Live browser verification (2026-09-08):** created a job, navigated to Profile — job appeared correctly under "Active" with correct address/status/stage caption. Clicked the job card from Profile — confirmed navigation correctly left the Profile screen and landed on job detail (this is the bug-fix path; without it, `screen-profile` would have stayed visible). No bugs remaining after the fix.
