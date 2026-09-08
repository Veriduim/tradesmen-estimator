/**
 * Mock catalog data for the job-flow prototype.
 * No network calls — everything here is static data styled after real
 * Irish electrical wholesalers (Chadwicks Electrical, Rexel Ireland,
 * CEF Ireland). Wholesaler names/stock/distance are illustrative, but
 * unitPrice figures are grounded in researched real-world trade prices
 * (see the provenance comment above MATERIAL_CATALOG) rather than
 * invented placeholders — baked in as static values, not a live feed.
 */

const WHOLESALERS = {
  chadwicks: { id: 'chadwicks', name: 'Chadwicks Electrical' },
  rexel: { id: 'rexel', name: 'Rexel Ireland' },
  cef: { id: 'cef', name: 'CEF Ireland' },
};

/**
 * Reusable wholesaler-option sets, keyed by catalog material id.
 * stock: 'in-stock' | 'lead-time'
 * leadDays only present when stock === 'lead-time'
 *
 * PROVENANCE (researched 2026-08-25, baked in as static values — not a
 * live feed): the researched baseline single-price-point per material is
 * T&E 2.5mm €2.15/m, T&E 1.5mm €0.70/m, consumer unit 10-way dual RCD
 * €104, twin switched socket €2.78, 1-gang light switch €0.92, MCB 6A
 * €3.47, earth cable 6mm €1.74/m, cable clips 25mm 100-pack €1.61 /
 * 200-pack ~€3.00, RCBO 32A €13.91, MCB 20A €3.47, meter tails 25mm twin
 * €4.60/m, earth rod & clamp kit €14.40, board labels kit €9.63, back
 * box single 35mm €0.80. Most figures are UK-trade-price proxies
 * (Screwfix) converted at ~1.16 GBP->EUR where Irish-specific pricing
 * wasn't directly available. Each wholesaler's unitPrice below is that
 * baseline scaled by the same relative per-wholesaler spread the mock
 * data used previously, so the average across a material's options
 * equals the researched baseline exactly, while the 3-way price/stock/
 * distance comparison still reads naturally.
 */
const MATERIAL_CATALOG = {
  'twin-earth-2-5': {
    name: 'Twin & Earth cable 2.5mm',
    unit: 'metres',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 2.14, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 1.99, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 2.32, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'twin-earth-1-5': {
    name: 'Twin & Earth cable 1.5mm',
    unit: 'metres',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 0.70, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 0.65, stock: 'in-stock', distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 0.75, stock: 'lead-time', leadDays: 3, distanceKm: 9.1 },
    ],
  },
  'consumer-unit-10way': {
    name: 'Consumer unit, 10-way dual RCD',
    unit: 'unit',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 102.90, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 100.40, stock: 'in-stock', distanceKm: 9.1 },
      { wholesalerId: 'rexel', unitPrice: 108.70, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
    ],
  },
  'socket-twin-switched': {
    name: 'Socket outlet, twin switched',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 2.84, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 2.55, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 2.96, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'light-switch-1gang': {
    name: 'Light switch, 1-gang',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 0.95, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 0.89, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'mcb-6a': {
    name: 'MCB 6A single pole',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 3.57, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 3.37, stock: 'lead-time', leadDays: 1, distanceKm: 6.8 },
    ],
  },
  'earth-cable-6mm': {
    name: 'Earth cable 6mm',
    unit: 'metres',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 1.79, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 1.69, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'cable-clips-25mm-200': {
    name: 'Cable clips, 25mm (200-pack)',
    unit: 'pack of 200',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 3.06, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 2.94, stock: 'in-stock', distanceKm: 6.8 },
    ],
  },
  'rcbo-32a': {
    name: 'RCBO 32A',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 14.10, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 13.18, stock: 'lead-time', leadDays: 2, distanceKm: 5.4 },
      { wholesalerId: 'cef', unitPrice: 14.45, stock: 'in-stock', distanceKm: 7.6 },
    ],
  },
  'mcb-20a': {
    name: 'MCB 20A',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 3.55, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'cef', unitPrice: 3.39, stock: 'in-stock', distanceKm: 7.6 },
    ],
  },
  'meter-tails-25mm': {
    name: 'Meter tails 25mm twin',
    unit: 'metres',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 4.69, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 4.51, stock: 'in-stock', distanceKm: 5.4 },
    ],
  },
  'earth-rod-clamp': {
    name: 'Earth rod & clamp kit',
    unit: 'kit',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 14.95, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'cef', unitPrice: 13.85, stock: 'lead-time', leadDays: 1, distanceKm: 7.6 },
    ],
  },
  'board-labels-kit': {
    name: 'Board labels kit',
    unit: 'kit',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 10.18, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 9.08, stock: 'in-stock', distanceKm: 5.4 },
    ],
  },
  'back-box-single-35mm': {
    name: 'Back box, single 35mm',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 0.83, stock: 'in-stock', distanceKm: 2.4 },
      { wholesalerId: 'cef', unitPrice: 0.77, stock: 'in-stock', distanceKm: 6.9 },
    ],
  },
  'cable-clips-25mm-100': {
    name: 'Cable clips, 25mm (100-pack)',
    unit: 'pack of 100',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 1.66, stock: 'in-stock', distanceKm: 2.4 },
      { wholesalerId: 'rexel', unitPrice: 1.56, stock: 'in-stock', distanceKm: 6.9 },
    ],
  },
};

/**
 * Three preset common job types. Each `materials` entry references a
 * MATERIAL_CATALOG id (catalogId) plus the default quantity for that job.
 */
const JOB_PRESETS = [
  {
    id: 'full-rewire',
    label: 'Full Rewire',
    description: 'Complete house rewire, first + second fix',
    address: '12 Maple Grove, Dublin 15',
    propertySize: '3-bed semi',
    labourCost: 2200,
    materials: [
      { catalogId: 'twin-earth-2-5', qty: 120 },
      { catalogId: 'twin-earth-1-5', qty: 80 },
      { catalogId: 'consumer-unit-10way', qty: 1 },
      { catalogId: 'socket-twin-switched', qty: 14 },
      { catalogId: 'light-switch-1gang', qty: 9 },
      { catalogId: 'mcb-6a', qty: 6 },
      { catalogId: 'earth-cable-6mm', qty: 20 },
      { catalogId: 'cable-clips-25mm-200', qty: 1 },
    ],
  },
  {
    id: 'fuse-board-upgrade',
    label: 'Fuse Board Upgrade',
    description: 'Consumer unit swap to 18th edition dual-RCD board',
    address: 'Flat 4, Cork Rd, Cork',
    propertySize: '1-bed apartment',
    labourCost: 480,
    materials: [
      { catalogId: 'consumer-unit-10way', qty: 1 },
      { catalogId: 'rcbo-32a', qty: 4 },
      { catalogId: 'mcb-20a', qty: 3 },
      { catalogId: 'meter-tails-25mm', qty: 2 },
      { catalogId: 'earth-rod-clamp', qty: 1 },
      { catalogId: 'board-labels-kit', qty: 1 },
    ],
  },
  {
    id: 'socket-circuit-addition',
    label: 'Socket / Circuit Addition',
    description: 'New ring circuit + outlets for a kitchen extension',
    address: '8 Ashfield Park, Galway',
    propertySize: 'Kitchen extension',
    labourCost: 340,
    materials: [
      { catalogId: 'twin-earth-2-5', qty: 15 },
      { catalogId: 'socket-twin-switched', qty: 4 },
      { catalogId: 'back-box-single-35mm', qty: 4 },
      { catalogId: 'mcb-20a', qty: 1 },
      { catalogId: 'cable-clips-25mm-100', qty: 1 },
    ],
  },
];
