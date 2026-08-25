/**
 * Single source of truth for app state, persisted to one namespaced
 * localStorage key so a page reload resumes where the demo left off.
 *
 * State shape:
 * {
 *   session: { name, email, loginAt } | null,
 *   currentJobId: string | null,
 *   jobs: [{
 *     id, jobType, jobTypeLabel, address, propertySize, labourCost,
 *     materials: [{ id, catalogId, name, unit, qty, options: [...] }],
 *     status,
 *     wholesalerChoices: { [materialId]: wholesalerId },
 *     invoiceIncludesMaterials,
 *     createdAt, updatedAt
 *   }]
 * }
 */

const STORAGE_KEY = 'sparkline:jobflow:v1';

const STATUS_ORDER = [
  'job-details',
  'materials-needed',
  'wholesaler-selected',
  'materials-delivered',
  'job-started',
  'job-completed',
  'invoice',
];

// Shared sane upper bounds for user-entered quantities/prices, referenced
// both when sanitizing loaded state and when validating live edits in
// app.js — keeps the two in sync from one source of truth.
const MAX_QTY = 10000;
const MAX_UNIT_PRICE = 100000;

function defaultState() {
  return {
    session: null,
    currentJobId: null,
    jobs: [],
  };
}

function isValidState(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;
  if (!Array.isArray(candidate.jobs)) return false;
  if (candidate.session !== null && typeof candidate.session !== 'object') return false;
  if (candidate.currentJobId !== null && candidate.currentJobId !== undefined && typeof candidate.currentJobId !== 'string') return false;
  return true;
}

/**
 * Validates and normalizes one wholesaler option. Returns null if the
 * option is too malformed to use (missing id or a non-numeric price).
 */
function sanitizeWholesalerOption(opt) {
  if (!opt || typeof opt !== 'object') return null;
  if (typeof opt.wholesalerId !== 'string' || !opt.wholesalerId) return null;
  const unitPrice = Number(opt.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;
  const sanitized = {
    wholesalerId: opt.wholesalerId,
    unitPrice: Math.min(unitPrice, MAX_UNIT_PRICE),
    stock: opt.stock === 'lead-time' ? 'lead-time' : 'in-stock',
    distanceKm: Number.isFinite(Number(opt.distanceKm)) ? Number(opt.distanceKm) : 0,
  };
  if (sanitized.stock === 'lead-time') {
    sanitized.leadDays = Number.isFinite(Number(opt.leadDays)) && Number(opt.leadDays) > 0 ? Number(opt.leadDays) : 1;
  }
  return sanitized;
}

/**
 * Validates and normalizes one material line. Returns null (drop the
 * material) if it's too malformed to render or price safely — e.g.
 * missing id/name/unit, a non-numeric quantity, or no usable wholesaler
 * options at all.
 */
function sanitizeMaterial(m) {
  if (!m || typeof m !== 'object') return null;
  if (typeof m.id !== 'string' || !m.id) return null;
  if (typeof m.name !== 'string' || !m.name) return null;
  if (typeof m.unit !== 'string' || !m.unit) return null;

  const qtyNum = Number(m.qty);
  if (!Number.isFinite(qtyNum) || qtyNum < 1) return null;
  const qty = Math.min(Math.max(Math.round(qtyNum), 1), MAX_QTY);

  const rawOptions = Array.isArray(m.options) ? m.options : [];
  const options = rawOptions.map(sanitizeWholesalerOption).filter(Boolean);
  if (!options.length) return null;

  return {
    id: m.id,
    catalogId: typeof m.catalogId === 'string' ? m.catalogId : null,
    name: m.name,
    unit: m.unit,
    qty: qty,
    options: options,
  };
}

/**
 * Validates and normalizes one job record. Returns null (drop the job
 * entirely) if it can't be made safe to render — e.g. `materials` isn't
 * an array, or every material in it is malformed (a job needs at least
 * one usable material line for the rest of the app to function).
 */
function sanitizeJob(job) {
  if (!job || typeof job !== 'object') return null;
  if (typeof job.id !== 'string' || !job.id) return null;
  if (!Array.isArray(job.materials)) return null;

  const materials = job.materials.map(sanitizeMaterial).filter(Boolean);
  if (!materials.length) return null;

  const materialIds = {};
  materials.forEach(function (m) {
    materialIds[m.id] = true;
  });

  const rawChoices = job.wholesalerChoices && typeof job.wholesalerChoices === 'object' ? job.wholesalerChoices : {};
  const wholesalerChoices = {};
  Object.keys(rawChoices).forEach(function (materialId) {
    if (materialIds[materialId] && typeof rawChoices[materialId] === 'string') {
      wholesalerChoices[materialId] = rawChoices[materialId];
    }
  });

  const status = STATUS_ORDER.indexOf(job.status) !== -1 ? job.status : 'materials-needed';
  const labourCostNum = Number(job.labourCost);

  return {
    id: job.id,
    jobType: typeof job.jobType === 'string' ? job.jobType : '',
    jobTypeLabel: typeof job.jobTypeLabel === 'string' && job.jobTypeLabel ? job.jobTypeLabel : 'Job',
    address: typeof job.address === 'string' && job.address ? job.address : 'Address unavailable',
    propertySize: typeof job.propertySize === 'string' ? job.propertySize : '',
    labourCost: Number.isFinite(labourCostNum) && labourCostNum >= 0 ? labourCostNum : 0,
    materials: materials,
    status: status,
    wholesalerChoices: wholesalerChoices,
    invoiceIncludesMaterials: job.invoiceIncludesMaterials !== false,
    createdAt: Number.isFinite(Number(job.createdAt)) ? Number(job.createdAt) : Date.now(),
    updatedAt: Number.isFinite(Number(job.updatedAt)) ? Number(job.updatedAt) : Date.now(),
  };
}

/**
 * Reads state from localStorage. Falls back to a fresh default state
 * on missing or corrupt data — never throws. Every job record is
 * individually validated/sanitized (or dropped) so a malformed entry
 * can never reach the renderer and throw downstream.
 */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!isValidState(parsed)) return defaultState();

    const jobs = parsed.jobs.map(sanitizeJob).filter(Boolean);
    const validJobIds = {};
    jobs.forEach(function (j) {
      validJobIds[j.id] = true;
    });

    const state = Object.assign(defaultState(), parsed, { jobs: jobs });

    if (state.currentJobId && !validJobIds[state.currentJobId]) {
      state.currentJobId = null;
    }

    if (state.session !== null && (typeof state.session !== 'object' || typeof state.session.name !== 'string' || !state.session.name)) {
      // Malformed session — fall back to logged-out rather than trusting
      // a half-broken session object, but keep whatever jobs sanitized OK.
      state.session = null;
      state.currentJobId = null;
    }

    return state;
  } catch (err) {
    return defaultState();
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Storage unavailable (private mode, quota, etc.) — demo continues
    // in-memory for this page life, just without persistence.
  }
}

function generateId(prefix) {
  return (
    (prefix ? prefix + '-' : '') +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 9)
  );
}
