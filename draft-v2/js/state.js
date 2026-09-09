/**
 * Single source of truth for app state. Lives in memory only for the
 * current visit — every page load starts from a clean demo, so this is
 * never restored from (or written to) persistent storage.
 *
 * State shape:
 * {
 *   session: { name, trade, region, email, businessName, businessAddress, tradeRegNumber, loginAt } | null,
 *   currentJobId: string | null,
 *   viewingProfile: boolean,
 *   startingNewJob: boolean,
 *   jobs: [{
 *     id, jobType, jobTypeLabel, customerName, address, propertySize, labourCost,
 *     materials: [{ id, catalogId, name, unit, qty, options: [...], received }],
 *     status, customerPaid, materialsOrderedAt,
 *     wholesalerChoices: { [materialId]: wholesalerId },
 *     invoiceIncludesMaterials,
 *     extraCharges: [{ id, description, amount }], invoiceNotes,
 *     createdAt, updatedAt
 *   }],
 *   profile: {
 *     labourRatePerHour: number | null, labourRatePerJob: number | null,
 *     pendingReview: boolean,
 *     warehouse: [{ id, catalogId, name, unit, qty, note }]
 *   }
 * }
 */

// Old versions of this prototype persisted state under this key — still
// referenced so `bootstrapState()` can clear it and stop a stale demo
// from a previous visit resurfacing.
const STORAGE_KEY = 'sparkline:jobflow:v1';

// 'job-details' removed (was index 0): the new-job intake screen now
// collects customer name/address/job-type *before* a job object exists,
// so every job is created directly at 'materials-needed' — keeping the
// old stage would have every job's stepper show a phantom "already
// done" first dot nobody actually passed through. stepperHTML/
// stageCaption derive "Step N of {STATUS_ORDER.length}" dynamically, so
// removing an entry needed no other numbering changes.
const STATUS_ORDER = [
  'materials-needed',
  'wholesaler-selected',
  'materials-delivered',
  'job-started',
  'job-completed',
  'invoice',
];

// Sane upper bound for a user-entered quantity, checked when validating
// live edits in app.js.
const MAX_QTY = 10000;

function defaultState() {
  return {
    session: null,
    currentJobId: null,
    viewingProfile: false,
    startingNewJob: false,
    jobs: [],
    profile: { labourRatePerHour: null, labourRatePerJob: null, pendingReview: false, warehouse: [] },
  };
}

/**
 * Every visit starts from a clean demo — clears out anything an older
 * version of this prototype left behind, then always returns a fresh
 * state rather than restoring one. (Not named `load` — it never loads
 * anything back.)
 */
function bootstrapState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Storage unavailable (private mode, etc.) — nothing to clear.
  }
  return defaultState();
}

function generateId(prefix) {
  return (
    (prefix ? prefix + '-' : '') +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 9)
  );
}
