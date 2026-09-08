---
title: 'TradesLine Draft v2 — Cancel Job From Customer Estimate'
type: 'feature'
created: '2026-09-08'
status: 'done'
review_loop_iteration: 0
context:
  - bmad/planning-artifacts/architecture/architecture-tradesmen-estimator-2026-09-05/ARCHITECTURE-SPINE.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A tradesperson showing a customer the pre-order estimate has no way to walk away if the customer declines on price — the job just sits there with no path to close it out, and nothing should be ordered from wholesalers for a job that isn't happening.

**Approach:** Add a "Cancel job — customer declined" action to the customer estimate view. Since cancelling only happens before any wholesaler is chosen or materials ordered, this is a full removal from `state.jobs` (a job that never happened), not a new terminal status. Reuses the existing material-removal confirm-popup infrastructure, generalized to a second mode rather than duplicated.

## Boundaries & Constraints

**Always:** cancel action only reachable from the estimate view (`estimateInvoiceHTML`), gated behind the same confirm-modal pattern as material removal (focus management, `inert` background, Escape/backdrop dismiss); generalize `renderConfirmModal()`/`#confirm-modal` to a shared two-mode popup rather than building a second modal.

**Never:** add a `cancelled` job status; allow cancelling from any other stage (wholesaler-selected onward — materials may already be ordered by then, out of scope for this spec).

**Ask First:** none — small, additive, no existing behavior changes outside the shared modal's generalization.

</frozen-after-approval>

## Code Map

- `draft-v2/index.html:123-132` (`#confirm-modal`) — added `id="confirm-modal-confirm"` to the danger button so its label/data-action can be set dynamically.
- `draft-v2/js/app.js` (`ui` object) — added `confirmCancelJobId: null`.
- `draft-v2/js/app.js` (`renderConfirmModal`) — generalized to branch on `ui.confirmRemoveMaterialId` vs `ui.confirmCancelJobId`, setting title/body/button-label/data-action per mode.
- `draft-v2/js/app.js` (click-delegation switch) — added `cancel-job` (trigger), `confirm-cancel-job-dismiss`, `confirm-cancel-job-confirm` cases.
- `draft-v2/js/app.js` (new `handleCancelJob(jobId)`) — filters the job out of `state.jobs`, clears `state.currentJobId`/`ui.viewingEstimate` if it was the current job, toasts.
- `draft-v2/js/app.js` (`estimateInvoiceHTML`) — added the "Cancel job — customer declined" button.

## Tasks & Acceptance

**Acceptance Criteria:**
- Given the estimate view, when "Cancel job — customer declined" is clicked and confirmed, then the job is removed and the dashboard shows no trace of it
- Given the cancel-confirm popup, when "Keep Job" is clicked, then nothing changes and the estimate view remains
- Given the pre-existing material-removal confirm popup, when used on any job, then it behaves identically to before this spec (regression check on the shared modal)

## Verification

**Live browser verification (2026-09-08), no bugs found:** cancel flow tested end-to-end — modal showed correct mode-specific copy ("Cancel job?" / "Keep Job" / "Cancel Job"), "Keep Job" correctly dismissed without side effects, confirming cancellation removed the job and returned to an empty dashboard. Regression-tested the original material-removal modal on a fresh job afterward — correct title/body/button labels ("Remove material?" / "Cancel" / "Remove"), and the actual removal completed correctly (8 → 7 materials). No duplication, no cross-mode leakage between the two confirm flows sharing one modal.
