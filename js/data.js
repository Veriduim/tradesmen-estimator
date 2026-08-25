/**
 * Mock catalog data for the job-flow prototype.
 * No network calls — everything here is static, illustrative data
 * styled after real Irish electrical wholesalers (Chadwicks Electrical,
 * Rexel Ireland, CEF Ireland). Prices are plausible, not real quotes.
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
 */
const MATERIAL_CATALOG = {
  'twin-earth-2-5': {
    name: 'Twin & Earth cable 2.5mm',
    unit: 'metres',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 0.85, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 0.79, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 0.92, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'twin-earth-1-5': {
    name: 'Twin & Earth cable 1.5mm',
    unit: 'metres',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 0.62, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 0.58, stock: 'in-stock', distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 0.66, stock: 'lead-time', leadDays: 3, distanceKm: 9.1 },
    ],
  },
  'consumer-unit-10way': {
    name: 'Consumer unit, 10-way dual RCD',
    unit: 'unit',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 142.0, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 138.5, stock: 'in-stock', distanceKm: 9.1 },
      { wholesalerId: 'rexel', unitPrice: 149.99, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
    ],
  },
  'socket-twin-switched': {
    name: 'Socket outlet, twin switched',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 3.45, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 3.1, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 3.6, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'light-switch-1gang': {
    name: 'Light switch, 1-gang',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 2.75, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 2.6, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'mcb-6a': {
    name: 'MCB 6A single pole',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 8.9, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 8.4, stock: 'lead-time', leadDays: 1, distanceKm: 6.8 },
    ],
  },
  'earth-cable-6mm': {
    name: 'Earth cable 6mm',
    unit: 'metres',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 1.35, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 1.28, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'cable-clips-25mm-200': {
    name: 'Cable clips, 25mm',
    unit: 'pack of 200',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 6.2, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 5.95, stock: 'in-stock', distanceKm: 6.8 },
    ],
  },
  'rcbo-32a': {
    name: 'RCBO 32A',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 24.5, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 22.9, stock: 'lead-time', leadDays: 2, distanceKm: 5.4 },
      { wholesalerId: 'cef', unitPrice: 25.1, stock: 'in-stock', distanceKm: 7.6 },
    ],
  },
  'mcb-20a': {
    name: 'MCB 20A',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 8.6, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'cef', unitPrice: 8.2, stock: 'in-stock', distanceKm: 7.6 },
    ],
  },
  'meter-tails-25mm': {
    name: 'Meter tails 25mm twin',
    unit: 'metres',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 4.1, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 3.95, stock: 'in-stock', distanceKm: 5.4 },
    ],
  },
  'earth-rod-clamp': {
    name: 'Earth rod & clamp kit',
    unit: 'kit',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 34.0, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'cef', unitPrice: 31.5, stock: 'lead-time', leadDays: 1, distanceKm: 7.6 },
    ],
  },
  'board-labels-kit': {
    name: 'Board labels kit',
    unit: 'kit',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 6.5, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 5.8, stock: 'in-stock', distanceKm: 5.4 },
    ],
  },
  'back-box-single-35mm': {
    name: 'Back box, single 35mm',
    unit: 'each',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 1.85, stock: 'in-stock', distanceKm: 2.4 },
      { wholesalerId: 'cef', unitPrice: 1.7, stock: 'in-stock', distanceKm: 6.9 },
    ],
  },
  'cable-clips-25mm-100': {
    name: 'Cable clips, 25mm',
    unit: 'pack of 100',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 3.6, stock: 'in-stock', distanceKm: 2.4 },
      { wholesalerId: 'rexel', unitPrice: 3.4, stock: 'in-stock', distanceKm: 6.9 },
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
