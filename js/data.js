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
  heatmerchants: { id: 'heatmerchants', name: 'Heat Merchants' },
  davies: { id: 'davies', name: 'Davies' },
  pts: { id: 'pts', name: 'PTS Plumbing Trade Supplies' },
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
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 2.14, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 1.99, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 2.32, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'twin-earth-1-5': {
    name: 'Twin & Earth cable 1.5mm',
    unit: 'metres',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 0.70, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 0.65, stock: 'in-stock', distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 0.75, stock: 'lead-time', leadDays: 3, distanceKm: 9.1 },
    ],
  },
  'consumer-unit-10way': {
    name: 'Consumer unit, 10-way dual RCD',
    unit: 'unit',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 102.90, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 100.40, stock: 'in-stock', distanceKm: 9.1 },
      { wholesalerId: 'rexel', unitPrice: 108.70, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
    ],
  },
  'socket-twin-switched': {
    name: 'Socket outlet, twin switched',
    unit: 'each',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 2.84, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 2.55, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
      { wholesalerId: 'cef', unitPrice: 2.96, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'light-switch-1gang': {
    name: 'Light switch, 1-gang',
    unit: 'each',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 0.95, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 0.89, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'mcb-6a': {
    name: 'MCB 6A single pole',
    unit: 'each',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 3.57, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 3.37, stock: 'lead-time', leadDays: 1, distanceKm: 6.8 },
    ],
  },
  'earth-cable-6mm': {
    name: 'Earth cable 6mm',
    unit: 'metres',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 1.79, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'cef', unitPrice: 1.69, stock: 'in-stock', distanceKm: 9.1 },
    ],
  },
  'cable-clips-25mm-200': {
    name: 'Cable clips, 25mm (200-pack)',
    unit: 'pack of 200',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 3.06, stock: 'in-stock', distanceKm: 4.2 },
      { wholesalerId: 'rexel', unitPrice: 2.94, stock: 'in-stock', distanceKm: 6.8 },
    ],
  },
  'rcbo-32a': {
    name: 'RCBO 32A',
    unit: 'each',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 14.10, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 13.18, stock: 'lead-time', leadDays: 2, distanceKm: 5.4 },
      { wholesalerId: 'cef', unitPrice: 14.45, stock: 'in-stock', distanceKm: 7.6 },
    ],
  },
  'mcb-20a': {
    name: 'MCB 20A',
    unit: 'each',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 3.55, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'cef', unitPrice: 3.39, stock: 'in-stock', distanceKm: 7.6 },
    ],
  },
  'meter-tails-25mm': {
    name: 'Meter tails 25mm twin',
    unit: 'metres',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 4.69, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 4.51, stock: 'in-stock', distanceKm: 5.4 },
    ],
  },
  'earth-rod-clamp': {
    name: 'Earth rod & clamp kit',
    unit: 'kit',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 14.95, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'cef', unitPrice: 13.85, stock: 'lead-time', leadDays: 1, distanceKm: 7.6 },
    ],
  },
  'board-labels-kit': {
    name: 'Board labels kit',
    unit: 'kit',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 10.18, stock: 'in-stock', distanceKm: 3.1 },
      { wholesalerId: 'rexel', unitPrice: 9.08, stock: 'in-stock', distanceKm: 5.4 },
    ],
  },
  'back-box-single-35mm': {
    name: 'Back box, single 35mm',
    unit: 'each',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 0.83, stock: 'in-stock', distanceKm: 2.4 },
      { wholesalerId: 'cef', unitPrice: 0.77, stock: 'in-stock', distanceKm: 6.9 },
    ],
  },
  'cable-clips-25mm-100': {
    name: 'Cable clips, 25mm (100-pack)',
    unit: 'pack of 100',
    trade: 'electrician',
    options: [
      { wholesalerId: 'chadwicks', unitPrice: 1.66, stock: 'in-stock', distanceKm: 2.4 },
      { wholesalerId: 'rexel', unitPrice: 1.56, stock: 'in-stock', distanceKm: 6.9 },
    ],
  },

  // PROVENANCE, Plumber materials (researched 2026-09-08, baked in as
  // static values — not a live feed): wholesalers are real Irish plumbing
  // merchants (Heat Merchants — largest, 47 ROI locations; Davies —
  // established Dublin merchant, Grafton Group; PTS Plumbing Trade
  // Supplies — real but thin ROI footprint, one Dublin branch, mirrors
  // CEF's smaller/leaner role above). VERIFIED pricing (Screwfix UK,
  // converted at ~1.16 GBP->EUR, same convention as the electrician
  // section above): 15mm copper pipe €5.70/m, 22mm copper pipe €11.60/m,
  // 15mm isolation valve/stopcock €5.37. ESTIMATED (no direct source
  // found — reasoned, not researched): compression elbow €1.74, indirect
  // vented cylinder 150-180L €225 (unvented cylinders run far higher —
  // not the right product class for this baseline), immersion heater
  // element €23.20, PTFE tape €0.90/roll, pipe lagging €1.74/m, mixer tap
  // €46.40. Each wholesaler's unitPrice is that baseline scaled by a
  // similar relative spread to the electrician section, not an exact
  // average (unlike the electrician set, which documents an exact-average
  // spread).
  'copper-pipe-15mm': {
    name: '15mm copper pipe',
    unit: 'metres',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 5.55, stock: 'in-stock', distanceKm: 5.0 },
      { wholesalerId: 'davies', unitPrice: 5.85, stock: 'in-stock', distanceKm: 8.3 },
      { wholesalerId: 'pts', unitPrice: 5.95, stock: 'lead-time', leadDays: 2, distanceKm: 11.2 },
    ],
  },
  'copper-pipe-22mm': {
    name: '22mm copper pipe',
    unit: 'metres',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 11.35, stock: 'in-stock', distanceKm: 5.0 },
      { wholesalerId: 'davies', unitPrice: 11.75, stock: 'in-stock', distanceKm: 8.3 },
      { wholesalerId: 'pts', unitPrice: 12.05, stock: 'lead-time', leadDays: 2, distanceKm: 11.2 },
    ],
  },
  'isolation-valve-15mm': {
    name: 'Isolation valve / stopcock, 15mm',
    unit: 'each',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 5.20, stock: 'in-stock', distanceKm: 5.0 },
      { wholesalerId: 'davies', unitPrice: 5.45, stock: 'in-stock', distanceKm: 8.3 },
      { wholesalerId: 'pts', unitPrice: 5.60, stock: 'in-stock', distanceKm: 11.2 },
    ],
  },
  'compression-elbow-15mm': {
    name: 'Compression elbow, 15mm',
    unit: 'each',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 1.68, stock: 'in-stock', distanceKm: 5.0 },
      { wholesalerId: 'davies', unitPrice: 1.79, stock: 'in-stock', distanceKm: 8.3 },
    ],
  },
  'indirect-cylinder-150l': {
    name: 'Indirect hot water cylinder, 150L',
    unit: 'unit',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 219.00, stock: 'lead-time', leadDays: 3, distanceKm: 5.0 },
      { wholesalerId: 'davies', unitPrice: 234.00, stock: 'in-stock', distanceKm: 8.3 },
      { wholesalerId: 'pts', unitPrice: 242.00, stock: 'lead-time', leadDays: 4, distanceKm: 11.2 },
    ],
  },
  'immersion-heater-element': {
    name: 'Immersion heater element',
    unit: 'each',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 22.40, stock: 'in-stock', distanceKm: 5.0 },
      { wholesalerId: 'davies', unitPrice: 23.90, stock: 'in-stock', distanceKm: 8.3 },
    ],
  },
  'ptfe-tape': {
    name: 'PTFE tape',
    unit: 'roll',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 0.85, stock: 'in-stock', distanceKm: 5.0 },
      { wholesalerId: 'davies', unitPrice: 0.92, stock: 'in-stock', distanceKm: 8.3 },
      { wholesalerId: 'pts', unitPrice: 0.95, stock: 'in-stock', distanceKm: 11.2 },
    ],
  },
  'pipe-lagging-15mm': {
    name: 'Pipe lagging, 15mm',
    unit: 'metres',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 1.68, stock: 'in-stock', distanceKm: 5.0 },
      { wholesalerId: 'pts', unitPrice: 1.85, stock: 'in-stock', distanceKm: 11.2 },
    ],
  },
  'mixer-tap-standard': {
    name: 'Mixer tap, standard',
    unit: 'each',
    trade: 'plumber',
    options: [
      { wholesalerId: 'heatmerchants', unitPrice: 44.90, stock: 'in-stock', distanceKm: 5.0 },
      { wholesalerId: 'davies', unitPrice: 47.50, stock: 'lead-time', leadDays: 2, distanceKm: 8.3 },
      { wholesalerId: 'pts', unitPrice: 49.00, stock: 'in-stock', distanceKm: 11.2 },
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
    trade: 'electrician',
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
    trade: 'electrician',
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
    trade: 'electrician',
    materials: [
      { catalogId: 'twin-earth-2-5', qty: 15 },
      { catalogId: 'socket-twin-switched', qty: 4 },
      { catalogId: 'back-box-single-35mm', qty: 4 },
      { catalogId: 'mcb-20a', qty: 1 },
      { catalogId: 'cable-clips-25mm-100', qty: 1 },
    ],
  },
  {
    id: 'bathroom-replumb',
    label: 'Bathroom Re-plumb',
    description: 'Full bathroom re-pipe and fit-out',
    address: '22 Riverside Walk, Limerick',
    propertySize: '4-bed detached',
    labourCost: 2400,
    trade: 'plumber',
    materials: [
      { catalogId: 'copper-pipe-15mm', qty: 20 },
      { catalogId: 'copper-pipe-22mm', qty: 8 },
      { catalogId: 'isolation-valve-15mm', qty: 4 },
      { catalogId: 'compression-elbow-15mm', qty: 8 },
      { catalogId: 'mixer-tap-standard', qty: 1 },
      { catalogId: 'pipe-lagging-15mm', qty: 10 },
      { catalogId: 'ptfe-tape', qty: 3 },
    ],
  },
  {
    id: 'cylinder-immersion-swap',
    label: 'Cylinder & Immersion Swap',
    description: 'Replace hot water cylinder and immersion element',
    address: '15 Beechwood Ave, Waterford',
    propertySize: '2-bed terrace',
    labourCost: 450,
    trade: 'plumber',
    materials: [
      { catalogId: 'indirect-cylinder-150l', qty: 1 },
      { catalogId: 'immersion-heater-element', qty: 1 },
      { catalogId: 'isolation-valve-15mm', qty: 2 },
      { catalogId: 'copper-pipe-22mm', qty: 3 },
      { catalogId: 'compression-elbow-15mm', qty: 2 },
      { catalogId: 'ptfe-tape', qty: 1 },
    ],
  },
  {
    id: 'tap-valve-replacement',
    label: 'Tap & Valve Replacement',
    description: 'Swap a worn tap and isolation valves',
    address: '3 Harbour View, Wexford',
    propertySize: 'Bathroom renovation',
    labourCost: 220,
    trade: 'plumber',
    materials: [
      { catalogId: 'mixer-tap-standard', qty: 1 },
      { catalogId: 'isolation-valve-15mm', qty: 2 },
      { catalogId: 'compression-elbow-15mm', qty: 1 },
      { catalogId: 'ptfe-tape', qty: 1 },
    ],
  },
];

/**
 * PROVENANCE (researched 2026-09-08, baked in as static values — not a
 * live feed): no official Irish rate card exists for either trade
 * (multiple market-guide sources explicitly say so) — all figures below
 * are from trade-pricing aggregators (Grafta, ShamFix, onlinetradesmen.ie,
 * plumbersinireland.ie), not government/trade-body statistics.
 *
 * Plumber perHour is directly sourced per region (Grafta, 2026): Dublin
 * €75-100/hr, Cork €65-90/hr, Galway €60-90/hr, rural/regional €50-75/hr
 * — figures below are each band's midpoint. Limerick has no direct
 * source; ESTIMATED by interpolating between the Cork/Galway band and
 * the rural band.
 *
 * Electrician perHour has only a verified Dublin-vs-rural differential
 * (ShamFix: Dublin runs 15-25% above rural) against a national baseline
 * of €45-75/hr (most-cited band, excluding one outlier source quoting
 * €90-150/hr that disagreed with every other source checked). Cork/
 * Galway/Limerick electrician figures are ESTIMATED by applying the same
 * relative regional spread found in the (directly-sourced) plumber
 * figures to an electrician rural baseline — not sourced per-region
 * directly, disclosed here rather than presented as researched.
 *
 * perJob figures (both trades, all regions) are ESTIMATED day-rate
 * proxies scaled by the same regional ratios as perHour, not separately
 * sourced — day-rate bands found were wide (electrician €280-550,
 * plumber €300-450) and not broken out by region in any source checked.
 */
const LABOUR_RATE_PRESETS = {
  electrician: {
    dublin: { perHour: 65, perJob: 450 },
    cork: { perHour: 58, perJob: 410 },
    galway: { perHour: 56, perJob: 395 },
    limerick: { perHour: 54, perJob: 380 },
    other: { perHour: 48, perJob: 330 },
  },
  plumber: {
    dublin: { perHour: 85, perJob: 420 },
    cork: { perHour: 78, perJob: 385 },
    galway: { perHour: 75, perJob: 370 },
    limerick: { perHour: 72, perJob: 355 },
    other: { perHour: 62, perJob: 310 },
  },
};

// All 32 traditional Irish counties (Republic + Northern Ireland), one
// flat alphabetical list rather than filtered by country — an address
// selector shouldn't require guessing which side of the border a county
// falls on before finding it.
const IRISH_COUNTIES = [
  'Antrim', 'Armagh', 'Carlow', 'Cavan', 'Clare', 'Cork', 'Derry', 'Donegal',
  'Down', 'Dublin', 'Fermanagh', 'Galway', 'Kerry', 'Kildare', 'Kilkenny',
  'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth', 'Mayo', 'Meath',
  'Monaghan', 'Offaly', 'Roscommon', 'Sligo', 'Tipperary', 'Tyrone',
  'Waterford', 'Westmeath', 'Wexford', 'Wicklow',
];

const COUNTRY_OPTIONS = ['Ireland', 'Northern Ireland', 'United Kingdom'];
