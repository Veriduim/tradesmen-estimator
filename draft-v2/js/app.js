/**
 * Render functions, event wiring, and business logic for the job-flow
 * prototype. Pure client-side, no network calls. All state lives in
 * `state` (see state.js) for the current visit only — nothing persists
 * across a page load.
 */

(function () {
  'use strict';

  const STATUS_LABELS = {
    'materials-needed': 'Materials Needed',
    'wholesaler-selected': 'Pending Materials',
    'materials-delivered': 'Materials Delivered',
    'job-started': 'Job Started',
    'job-completed': 'Job Completed',
    invoice: 'Invoice',
  };

  const TRADE_LABELS = {
    electrician: 'Electrician',
    plumber: 'Plumber',
    carpenter: 'Carpenter',
    'general-builder': 'General Builder',
  };

  const VAT_RATE = 0.135;

  let state = bootstrapState();

  // Transient, non-persisted UI state — resets on reload, which is fine
  // since only job/session data needs to survive a reload.
  const ui = {
    openWholesalerFor: null,
    addItemOpen: false,
    addItemQuery: '', // live search-as-you-type text for the add-material picker
    addItemHighlightIndex: 0, // keyboard-roving-highlight index into the current filtered results
    removeBlockedFor: null,
    payBlocked: false,
    viewingEstimate: false, // toggles the materials-needed body to the pre-order customer estimate view
    qtyNotice: null, // inline feedback when a quantity edit gets clamped to MAX_QTY
    confirmRemoveMaterialId: null, // set while the remove-material confirm popup is open
    confirmCancelJobId: null, // set while the cancel-job confirm popup is open
    editingProfileDetails: false, // toggles the Profile identity section (name/business/trade reg) into edit mode
    editingRates: false, // toggles the Profile labour-rate section into edit mode
    editingInvoice: false, // toggles the final-invoice screen into edit mode
    warehouseAddQuery: '', // live search-as-you-type text for the warehouse's material picker
    warehouseAddHighlightIndex: 0, // keyboard-roving-highlight index into the current filtered results
    warehouseAddCatalogId: null, // set once a search result is picked, before "Add" is clicked
  };

  let toastTimer = null;

  // Focus management for the confirm popup: the element to return focus
  // to on close, and whether the popup was already open on the previous
  // renderConfirmModal() call (so open/close transitions — not every
  // render() while it's already open — are what move focus).
  let confirmModalTrigger = null;
  let confirmModalWasOpen = false;

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  const currencyFmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
  function formatEUR(n) {
    return currencyFmt.format(Number.isFinite(n) ? n : 0);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function relativeTime(ts) {
    if (!ts) return '';
    const diffMs = Date.now() - ts;
    const day = 24 * 60 * 60 * 1000;
    if (diffMs < day) return 'Updated today';
    if (diffMs < 2 * day) return 'Updated yesterday';
    const days = Math.floor(diffMs / day);
    return 'Updated ' + days + ' days ago';
  }

  // Same day-bucketing as relativeTime, different phrasing — used on the
  // mocked wholesaler contact-log line rather than a job-card timestamp.
  function requestedTimeLabel(ts) {
    if (!ts) return '';
    const diffMs = Date.now() - ts;
    const day = 24 * 60 * 60 * 1000;
    if (diffMs < day) return 'today';
    if (diffMs < 2 * day) return 'yesterday';
    const days = Math.floor(diffMs / day);
    return days + ' days ago';
  }

  function findJob(id) {
    return state.jobs.find(function (j) {
      return j.id === id;
    });
  }

  function cheapestOption(material) {
    if (!material || !Array.isArray(material.options) || !material.options.length) return null;
    return material.options.reduce(function (best, opt) {
      return !best || opt.unitPrice < best.unitPrice ? opt : best;
    }, null);
  }

  function chosenOption(job, material) {
    if (!job || !material) return null;
    const choices = job.wholesalerChoices && typeof job.wholesalerChoices === 'object' ? job.wholesalerChoices : {};
    const wholesalerId = choices[material.id];
    if (!wholesalerId) return null;
    const options = Array.isArray(material.options) ? material.options : [];
    return (
      options.find(function (o) {
        return o.wholesalerId === wholesalerId;
      }) || null
    );
  }

  function estimateLineTotal(job, material) {
    const opt = chosenOption(job, material) || cheapestOption(material);
    return material.qty * (opt ? opt.unitPrice : 0);
  }

  function estimateJobTotal(job) {
    return job.materials.reduce(function (sum, m) {
      return sum + estimateLineTotal(job, m);
    }, 0);
  }

  function materialsCostFinal(job) {
    return job.materials.reduce(function (sum, m) {
      const opt = chosenOption(job, m) || cheapestOption(m);
      return sum + m.qty * (opt ? opt.unitPrice : 0);
    }, 0);
  }

  function allMaterialsHaveWholesaler(job) {
    return job.materials.every(function (m) {
      return !!job.wholesalerChoices[m.id];
    });
  }

  function allMaterialsReceived(job) {
    return job.materials.every(function (m) {
      return !!m.received;
    });
  }

  function showToast(message, ok) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.toggle('ok', !!ok);
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 2600);
  }

  function stepperHTML(currentStatus) {
    const order = STATUS_ORDER;
    let currentIndex = order.indexOf(currentStatus);
    if (currentIndex === -1) currentIndex = 0; // unmapped status — fall back to the first stage rather than lighting nothing
    let html = '';
    order.forEach(function (status, i) {
      let dotClass = 'step-dot';
      if (i < currentIndex) dotClass += ' done';
      else if (i === currentIndex) dotClass += ' filled';
      html += '<div class="' + dotClass + '"></div>';
      if (i < order.length - 1) {
        let lineClass = 'step-line';
        if (i < currentIndex) lineClass += ' done';
        else if (i === currentIndex) lineClass += ' filled';
        html += '<div class="' + lineClass + '"></div>';
      }
    });
    return html;
  }

  function stageCaption(status) {
    const idx = STATUS_ORDER.indexOf(status);
    const label = STATUS_LABELS[status];
    if (idx === -1 || !label) {
      // Unmapped/corrupt status value — show a sensible generic caption
      // instead of "Step 0 of 7 · undefined".
      return 'Step 1 of ' + STATUS_ORDER.length + ' · Unknown stage';
    }
    return 'Step ' + (idx + 1) + ' of ' + STATUS_ORDER.length + ' · ' + label;
  }

  // ---------------------------------------------------------------------
  // Top-level render / routing
  // ---------------------------------------------------------------------

  function render() {
    renderConfirmModal();

    const header = document.getElementById('app-header');
    const headerUser = document.getElementById('app-header-user');

    if (!state.session) {
      header.hidden = true;
      showScreen('screen-login');
      return;
    }

    header.hidden = false;
    headerUser.textContent = state.session.name;

    if (state.viewingProfile) {
      showScreen('screen-profile');
      renderProfile();
      return;
    }

    if (state.startingNewJob) {
      showScreen('screen-new-job');
      document.getElementById('new-job-body').innerHTML = newJobIntakeHTML();
      return;
    }

    const job = state.currentJobId ? findJob(state.currentJobId) : null;
    if (state.currentJobId && !job) {
      // Stale reference (e.g. the job was just removed) — fall back safely.
      state.currentJobId = null;
    }

    if (job) {
      showScreen('screen-job-detail');
      renderJobDetail(job);
    } else {
      showScreen('screen-job-picker');
      renderJobPicker();
    }
  }

  // Re-renders just the job-detail body without touching the rest of the
  // page or persisting/re-reading state — used for the add-material
  // search-as-you-type input so a full render() doesn't strip focus out
  // of the text field on every keystroke.
  function refreshJobDetailBody() {
    const job = findJob(state.currentJobId);
    // Guard against a stale input event firing after the job was removed
    // or its status moved on (e.g. via another tab) — only the
    // materials-needed screen ever calls this partial-render path.
    if (!job || job.status !== 'materials-needed') return;
    document.getElementById('job-detail-body').innerHTML = materialsNeededHTML(job);
  }

  function showScreen(id) {
    ['screen-login', 'screen-job-picker', 'screen-new-job', 'screen-job-detail', 'screen-profile'].forEach(function (sid) {
      document.getElementById(sid).hidden = sid !== id;
    });
  }

  // Shows/hides the shared confirm popup, driven by whichever of
  // ui.confirmRemoveMaterialId / ui.confirmCancelJobId is set (only one
  // at a time in practice — remove-material only opens from a job's own
  // materials-needed screen, cancel-job only from that job's estimate
  // view). The target may have vanished (e.g. the job changed underneath
  // it) — treat that as "nothing to confirm". Also handles the popup's
  // focus: moves focus in on open, restores it to whatever triggered the
  // popup on close, and makes the rest of the page inert while it's open
  // so keyboard/screen-reader users can't reach content behind the dialog.
  function renderConfirmModal() {
    const overlay = document.getElementById('confirm-modal');
    if (!overlay) return;

    const main = document.getElementById('main');
    const header = document.getElementById('app-header');
    const titleEl = document.getElementById('confirm-modal-title');
    const bodyEl = document.getElementById('confirm-modal-body');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const confirmBtn = document.getElementById('confirm-modal-confirm');

    const materialId = ui.confirmRemoveMaterialId;
    const materialJob = materialId ? findJob(state.currentJobId) : null;
    const material = materialJob
      ? materialJob.materials.find(function (m) {
          return m.id === materialId;
        })
      : null;

    const cancelJobId = ui.confirmCancelJobId;
    const jobToCancel = cancelJobId ? findJob(cancelJobId) : null;

    if (!material && !jobToCancel) {
      overlay.hidden = true;
      if (main) main.inert = false;
      if (header) header.inert = false;
      if (confirmModalWasOpen && confirmModalTrigger && document.contains(confirmModalTrigger)) {
        confirmModalTrigger.focus();
      }
      confirmModalWasOpen = false;
      confirmModalTrigger = null;
      return;
    }

    if (material) {
      titleEl.textContent = 'Remove material?';
      bodyEl.textContent = 'Remove "' + material.name + '" from this job? This can’t be undone.';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.setAttribute('data-action', 'confirm-remove-cancel');
      confirmBtn.textContent = 'Remove';
      confirmBtn.setAttribute('data-action', 'confirm-remove-confirm');
    } else {
      titleEl.textContent = 'Cancel job?';
      bodyEl.textContent =
        'Cancel "' +
        jobToCancel.jobTypeLabel +
        '" at ' +
        jobToCancel.address +
        '? Nothing has been ordered yet — this can’t be undone.';
      cancelBtn.textContent = 'Keep Job';
      cancelBtn.setAttribute('data-action', 'confirm-cancel-job-dismiss');
      confirmBtn.textContent = 'Cancel Job';
      confirmBtn.setAttribute('data-action', 'confirm-cancel-job-confirm');
    }

    overlay.hidden = false;
    if (main) main.inert = true;
    if (header) header.inert = true;

    if (!confirmModalWasOpen) {
      confirmModalTrigger = document.activeElement;
      if (cancelBtn) cancelBtn.focus();
    }
    confirmModalWasOpen = true;
  }

  // ---------------------------------------------------------------------
  // Job picker screen
  // ---------------------------------------------------------------------

  // A job card's status badge: "Active" statuses get the accent treatment,
  // the terminal `invoice` status gets the "done" treatment — matches the
  // Active/Completed section split below.
  function jobCardHTML(job) {
    const isPaid = job.status === 'invoice' && job.customerPaid;
    const isPendingPayment = job.status === 'invoice' && !job.customerPaid;
    const isPendingMaterials = job.status === 'wholesaler-selected';

    const metaRight = isPaid
      ? formatEUR(invoiceTotal(job)) + ' paid'
      : job.status === 'invoice'
      ? formatEUR(invoiceTotal(job)) + ' due'
      : job.materials.length + ' item' + (job.materials.length === 1 ? '' : 's');

    let badgeLabel;
    let badgeClass;
    if (isPaid) {
      badgeLabel = 'Paid';
      badgeClass = 'status-badge-done';
    } else if (isPendingPayment) {
      badgeLabel = 'Pending Payment';
      badgeClass = 'status-badge-warn';
    } else if (isPendingMaterials) {
      badgeLabel = 'Pending Materials';
      badgeClass = 'status-badge-warn';
    } else {
      badgeLabel = STATUS_LABELS[job.status] || 'Unknown';
      badgeClass = 'status-badge-active';
    }

    return (
      '<button type="button" class="job-card" data-action="open-job" data-job-id="' +
      job.id +
      '">' +
      '<div class="job-card-top">' +
      '<div class="job-addr">' +
      escapeHtml(job.customerName || job.address) +
      '</div>' +
      '<span class="status-badge ' +
      badgeClass +
      '">' +
      escapeHtml(badgeLabel) +
      '</span>' +
      '</div>' +
      '<div class="job-type">' +
      escapeHtml(job.propertySize) +
      ' · ' +
      escapeHtml(job.jobTypeLabel) +
      '</div>' +
      '<div class="stepper">' +
      stepperHTML(job.status) +
      '</div>' +
      '<div class="stage-caption">' +
      stageCaption(job.status) +
      '</div>' +
      '<div class="job-meta"><span>' +
      relativeTime(job.updatedAt) +
      '</span><span>' +
      metaRight +
      '</span></div>' +
      '</button>'
    );
  }

  // Single source of truth for the dashboard/Profile job groupings, so
  // the two lists (and their counts) can never silently diverge on what
  // counts as "pending materials" vs "pending payment".
  function groupJobsByBucket(jobs) {
    return {
      active: jobs.filter(function (j) {
        return j.status !== 'invoice' && j.status !== 'wholesaler-selected';
      }),
      pendingMaterials: jobs.filter(function (j) {
        return j.status === 'wholesaler-selected';
      }),
      pendingPayment: jobs.filter(function (j) {
        return j.status === 'invoice' && !j.customerPaid;
      }),
      completed: jobs.filter(function (j) {
        return j.status === 'invoice' && j.customerPaid;
      }),
    };
  }

  // Renders one dashboard section (heading + cards); returns '' (hiding
  // the header entirely) when there are no jobs in that group.
  function jobSectionHTML(label, jobs) {
    if (!jobs.length) return '';
    return (
      '<div class="job-section-heading">' +
      escapeHtml(label) +
      ' <span class="job-section-count">' +
      jobs.length +
      '</span></div>' +
      jobs.map(jobCardHTML).join('')
    );
  }

  function renderJobPicker() {
    const jobsWrap = document.getElementById('existing-jobs');
    const countSub = document.getElementById('job-count-sub');

    const jobs = state.jobs.slice().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    const groups = groupJobsByBucket(jobs);

    // Reflects the section split below rather than one combined "open
    // jobs" count, which reads as wrong once any job is pending/completed.
    if (!jobs.length) {
      countSub.textContent = 'No jobs yet — start one below';
    } else {
      const parts = [];
      if (groups.active.length) parts.push(groups.active.length + ' active');
      if (groups.pendingMaterials.length) parts.push(groups.pendingMaterials.length + ' pending materials');
      if (groups.pendingPayment.length) parts.push(groups.pendingPayment.length + ' pending payment');
      if (groups.completed.length) parts.push(groups.completed.length + ' completed');
      countSub.textContent = parts.join(' · ');
    }

    jobsWrap.innerHTML =
      jobSectionHTML('Active', groups.active) +
      jobSectionHTML('Pending Materials', groups.pendingMaterials) +
      jobSectionHTML('Pending Customer Payment', groups.pendingPayment) +
      jobSectionHTML('Completed', groups.completed);
  }

  // Trade-scoped preset cards — shared by the new-job intake screen (the
  // only place they render now) and kept as its own function since the
  // empty-state/trade-filter logic doesn't belong inlined into a bigger
  // screen-render function.
  function presetCardsHTML() {
    const tradePresets = JOB_PRESETS.filter(function (preset) {
      return preset.trade === state.session.trade;
    });

    if (!tradePresets.length) {
      const tradeLabel = TRADE_LABELS[state.session.trade] || state.session.trade;
      return '<p class="empty-state">No presets yet for ' + escapeHtml(tradeLabel) + ' — check back soon.</p>';
    }

    return tradePresets
      .map(function (preset) {
        return (
          '<button type="button" class="preset-card" data-action="create-job" data-preset-id="' +
          preset.id +
          '">' +
          '<div class="preset-title">' +
          escapeHtml(preset.label) +
          '</div>' +
          '<div class="preset-desc">' +
          escapeHtml(preset.description) +
          '</div>' +
          '<div class="preset-meta">' +
          escapeHtml(preset.propertySize) +
          ' · ' +
          preset.materials.length +
          ' materials · est. labour ' +
          formatEUR(preset.labourCost) +
          '</div>' +
          '</button>'
        );
      })
      .join('');
  }

  function newJobIntakeHTML() {
    return (
      '<div class="new-job-form">' +
      '<label class="field">' +
      '<span class="field-label">Customer name</span>' +
      '<input type="text" id="new-job-customer-name" placeholder="e.g. John Murphy" />' +
      '</label>' +
      '<p class="field-error" id="new-job-customer-name-error" hidden>Enter the customer’s name to continue.</p>' +
      '<button type="button" class="btn btn-secondary" data-action="use-example-name">Use example name</button>' +

      '<div class="field-group-label">Customer address</div>' +
      '<label class="field">' +
      '<span class="field-label">Address line 1</span>' +
      '<input type="text" id="new-job-address-line1" placeholder="e.g. 12 Maple Grove" />' +
      '</label>' +
      '<label class="field">' +
      '<span class="field-label">Address line 2 (optional)</span>' +
      '<input type="text" id="new-job-address-line2" placeholder="e.g. Dublin 15" />' +
      '</label>' +
      '<div class="field-row">' +
      '<label class="field"><span class="field-label">County</span>' +
      '<select id="new-job-address-county">' + countyOptionsHTML() + '</select></label>' +
      '<label class="field"><span class="field-label">Eircode</span>' +
      '<input type="text" id="new-job-address-eircode" placeholder="e.g. D15 XY12" /></label>' +
      '</div>' +
      '<label class="field"><span class="field-label">Country</span>' +
      '<select id="new-job-address-country">' + countryOptionsHTML() + '</select></label>' +
      '<p class="field-error" id="new-job-customer-address-error" hidden>Enter the customer’s address to continue.</p>' +
      '<button type="button" class="btn btn-secondary" data-action="use-example-address">Use example address</button>' +
      '</div>' +

      '<div class="picker-heading">Select a job type</div>' +
      '<div class="preset-list">' +
      presetCardsHTML() +
      '</div>'
    );
  }

  // Reads and validates the new-job intake screen's customer fields
  // before creating anything — a job is never created half-filled-in.
  // Runs on every preset-card click on that screen (the cards themselves
  // carry no validation of their own).
  function createJobFromPreset(presetId) {
    const nameInput = document.getElementById('new-job-customer-name');
    const line1Input = document.getElementById('new-job-address-line1');
    const line2Input = document.getElementById('new-job-address-line2');
    const countySelect = document.getElementById('new-job-address-county');
    const eircodeInput = document.getElementById('new-job-address-eircode');
    const countrySelect = document.getElementById('new-job-address-country');
    const nameError = document.getElementById('new-job-customer-name-error');
    const addressError = document.getElementById('new-job-customer-address-error');

    const trimmedCustomerName = (nameInput.value || '').trim();
    const trimmedLine1 = (line1Input.value || '').trim();
    const trimmedLine2 = (line2Input.value || '').trim();
    const county = countySelect.value;
    const trimmedEircode = (eircodeInput.value || '').trim();
    const country = countrySelect.value;

    nameError.hidden = true;
    addressError.hidden = true;

    if (!trimmedCustomerName) {
      nameError.hidden = false;
      nameInput.focus();
      return;
    }
    if (!trimmedLine1) {
      addressError.hidden = false;
      line1Input.focus();
      return;
    }
    if (!county) {
      addressError.hidden = false;
      countySelect.focus();
      return;
    }
    if (!trimmedEircode) {
      addressError.hidden = false;
      eircodeInput.focus();
      return;
    }

    const trimmedAddress = formatAddress({
      line1: trimmedLine1,
      line2: trimmedLine2,
      county: county,
      eircode: trimmedEircode,
      country: country,
    });

    const preset = JOB_PRESETS.find(function (p) {
      return p.id === presetId;
    });
    if (!preset) return;

    const materials = preset.materials.map(function (m) {
      const cat = MATERIAL_CATALOG[m.catalogId];
      return {
        id: generateId('mat'),
        catalogId: m.catalogId,
        name: cat.name,
        unit: cat.unit,
        qty: m.qty,
        options: cat.options,
        received: false,
      };
    });

    const now = Date.now();
    const job = {
      id: generateId('job'),
      jobType: preset.id,
      jobTypeLabel: preset.label,
      trade: preset.trade,
      customerName: trimmedCustomerName,
      address: trimmedAddress,
      propertySize: preset.propertySize,
      labourCost: preset.labourCost,
      materials: materials,
      status: 'materials-needed',
      wholesalerChoices: {},
      invoiceIncludesMaterials: true,
      customerPaid: false,
      extraCharges: [],
      invoiceNotes: '',
      createdAt: now,
      updatedAt: now,
    };

    state.jobs.push(job);
    state.currentJobId = job.id;
    state.startingNewJob = false;
    ui.addItemOpen = false;
    ui.addItemQuery = '';
    ui.addItemHighlightIndex = 0;
    ui.openWholesalerFor = null;
    ui.qtyNotice = null;
    ui.viewingEstimate = false;
    render();
  }

  // ---------------------------------------------------------------------
  // Profile screen
  // ---------------------------------------------------------------------

  // The region-appropriate preset for the signed-in user's trade, or null
  // when no preset catalog exists yet for that trade (Carpenter/General
  // Builder) — same "thin catalog, no fallback to another trade" rule as
  // JOB_PRESETS filtering.
  function ratePreset(field) {
    const byTrade = LABOUR_RATE_PRESETS[state.session.trade];
    const preset = byTrade ? byTrade[state.session.region] : null;
    return preset ? preset[field] : null;
  }

  function identitySectionHTML() {
    const session = state.session;
    if (ui.editingProfileDetails) {
      return (
        '<div class="picker-heading">Your Details</div>' +
        '<label class="field">' +
        '<span class="field-label">Name</span>' +
        '<input type="text" id="profile-name" value="' +
        escapeHtml(session.name) +
        '" /></label>' +
        '<p class="field-error" id="profile-name-error" hidden>Enter your name to continue.</p>' +
        '<label class="field">' +
        '<span class="field-label">Business / company name</span>' +
        '<input type="text" id="profile-business-name" value="' +
        escapeHtml(session.businessName) +
        '" /></label>' +
        '<p class="field-error" id="profile-business-name-error" hidden>Enter your business name to continue.</p>' +
        '<label class="field">' +
        '<span class="field-label">Trade registration number</span>' +
        '<input type="text" id="profile-trade-reg" value="' +
        escapeHtml(session.tradeRegNumber) +
        '" /></label>' +
        '<p class="field-error" id="profile-trade-reg-error" hidden>Enter your trade registration number to continue.</p>' +
        '<div class="action-bar">' +
        '<button type="button" class="btn btn-secondary" data-action="cancel-edit-details">Cancel</button>' +
        '<button type="button" class="btn btn-primary" data-action="save-profile-details">Save</button>' +
        '</div>'
      );
    }

    const pendingBanner = state.profile.pendingReview
      ? '<p class="inline-error">Pending review — changes to your name, business, or trade registration number are compared against your business details to confirm you’re a registered tradesperson before they’re considered verified.</p>'
      : '';

    return (
      '<div class="picker-heading">Your Details</div>' +
      '<div class="line-item"><span class="line-item-name">Name</span><span class="line-item-value">' +
      escapeHtml(session.name) +
      '</span></div>' +
      '<div class="line-item"><span class="line-item-name">Business</span><span class="line-item-value">' +
      escapeHtml(session.businessName) +
      '</span></div>' +
      '<div class="line-item"><span class="line-item-name">Trade reg. number</span><span class="line-item-value">' +
      escapeHtml(session.tradeRegNumber) +
      '</span></div>' +
      pendingBanner +
      '<button type="button" class="btn btn-secondary" data-action="edit-profile-details">Edit details</button>'
    );
  }

  function rateSectionHTML() {
    const profile = state.profile;
    if (ui.editingRates) {
      return (
        '<div class="picker-heading">Your Labour Rates</div>' +
        '<label class="field">' +
        '<span class="field-label">Rate per hour (EUR)</span>' +
        '<input type="number" id="profile-rate-hour" min="0" step="0.01" placeholder="e.g. 45.00" value="' +
        (profile.labourRatePerHour === null ? (ratePreset('perHour') === null ? '' : ratePreset('perHour')) : profile.labourRatePerHour) +
        '" /></label>' +
        '<label class="field">' +
        '<span class="field-label">Rate per job (EUR)</span>' +
        '<input type="number" id="profile-rate-job" min="0" step="0.01" placeholder="e.g. 350.00" value="' +
        (profile.labourRatePerJob === null ? (ratePreset('perJob') === null ? '' : ratePreset('perJob')) : profile.labourRatePerJob) +
        '" /></label>' +
        '<button type="button" class="btn btn-secondary" data-action="done-edit-rates">Done</button>'
      );
    }

    const hourPreset = ratePreset('perHour');
    const jobPreset = ratePreset('perJob');
    const hourLine =
      profile.labourRatePerHour !== null
        ? 'Rate per hour: ' + formatEUR(profile.labourRatePerHour) + ' (your rate)'
        : hourPreset !== null
        ? 'Rate per hour: ' + formatEUR(hourPreset) + ' (' + TRADE_LABELS[state.session.trade] + ' preset)'
        : 'Rate per hour: not set';
    const jobLine =
      profile.labourRatePerJob !== null
        ? 'Rate per job: ' + formatEUR(profile.labourRatePerJob) + ' (your rate)'
        : jobPreset !== null
        ? 'Rate per job: ' + formatEUR(jobPreset) + ' (' + TRADE_LABELS[state.session.trade] + ' preset)'
        : 'Rate per job: not set';

    return (
      '<div class="picker-heading">Your Labour Rates</div>' +
      '<div class="line-item"><span class="line-item-name">' +
      hourLine +
      '</span></div>' +
      '<div class="line-item"><span class="line-item-name">' +
      jobLine +
      '</span></div>' +
      '<button type="button" class="btn btn-secondary" data-action="edit-rates">Edit</button>'
    );
  }

  // Personal leftover-materials list — deliberately separate from
  // MATERIAL_CATALOG (no catalogId/unit-price/trade link): a flat visual
  // inventory, not tied to wholesaler pricing or a specific job.
  // Split from warehouseSectionHTML so refreshWarehouseSection() can
  // update just this container's contents while typing in the search
  // field, without touching (and losing focus/cursor in) the identity,
  // rates, or jobs sections that also live in #profile-body.
  function warehouseSectionInnerHTML() {
    const items = state.profile.warehouse;
    const rows = items
      .map(function (item) {
        return (
          '<div class="line-item">' +
          '<span class="line-item-name">' +
          escapeHtml(item.name) +
          ' <span class="line-item-qty">(' +
          item.qty +
          ' ' +
          escapeHtml(item.unit || '') +
          ')</span>' +
          (item.note ? ' <span class="line-item-qty">— ' + escapeHtml(item.note) + '</span>' : '') +
          '</span>' +
          '<button type="button" class="mat-remove" data-action="remove-warehouse-item" data-item-id="' +
          item.id +
          '">Remove</button>' +
          '</div>'
        );
      })
      .join('');

    // Only show the results dropdown while actively typing and before a
    // pick is confirmed — an always-expanded full catalog list here (the
    // job-materials picker's behavior when opened) would just be visual
    // noise on a page that has no explicit "open picker" step.
    const trimmedQuery = ui.warehouseAddQuery.trim().toLowerCase();
    const matchIds = ui.warehouseAddCatalogId ? [] : filteredWarehouseResultIds(trimmedQuery);
    const highlightIndex = Math.min(ui.warehouseAddHighlightIndex || 0, Math.max(matchIds.length - 1, 0));
    const showResults = !ui.warehouseAddCatalogId && trimmedQuery.length > 0;
    const resultsHTML = showResults
      ? materialResultsHTML(matchIds, ui.warehouseAddQuery.trim(), highlightIndex, 'warehouse-pick-material', 'No materials found.')
      : '';

    // Stacked full-width fields (the same .field pattern used everywhere
    // else) inside one .add-item-form card, replacing the old cramped
    // horizontal row — that row's fixed-width qty/note/button squeeze
    // was the reported "messy on phone" layout.
    return (
      '<div class="picker-heading">Your Materials Warehouse</div>' +
      '<div class="add-item-form">' +
      '<input type="text" id="warehouse-search" class="search-input" placeholder="Search materials to log…" ' +
      'aria-label="Search materials to log" value="' +
      escapeHtml(ui.warehouseAddQuery || '') +
      '" autocomplete="off">' +
      resultsHTML +
      '<label class="field">' +
      '<span class="field-label">Quantity</span>' +
      '<input type="number" id="warehouse-add-qty" min="1" step="1" value="1" />' +
      '</label>' +
      '<label class="field">' +
      '<span class="field-label">Note (optional)</span>' +
      '<input type="text" id="warehouse-add-note" placeholder="e.g. leftover from a job" />' +
      '</label>' +
      '<p class="field-error" id="warehouse-add-error" hidden>Pick a material from the search results above.</p>' +
      '<button type="button" class="btn btn-primary btn-block" data-action="add-warehouse-item">Add to warehouse</button>' +
      '</div>' +
      (items.length ? rows : '<p class="empty-state">No leftover materials logged yet.</p>')
    );
  }

  function warehouseSectionHTML() {
    return '<div id="warehouse-section">' + warehouseSectionInnerHTML() + '</div>';
  }

  // Rebuilds just the warehouse container (not the whole Profile body) so
  // typing in the search field doesn't lose focus/cursor position — same
  // pattern as refreshJobDetailBody for the job-materials search.
  function refreshWarehouseSection() {
    const container = document.getElementById('warehouse-section');
    if (!container) return;
    container.innerHTML = warehouseSectionInnerHTML();
  }

  function handleAddWarehouseItem() {
    const errorEl = document.getElementById('warehouse-add-error');
    const cat = ui.warehouseAddCatalogId ? MATERIAL_CATALOG[ui.warehouseAddCatalogId] : null;
    if (!cat) {
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;

    const qtyInput = document.getElementById('warehouse-add-qty');
    const noteInput = document.getElementById('warehouse-add-note');
    const qty = parseInt(qtyInput.value, 10);

    state.profile.warehouse.push({
      id: generateId('wh'),
      catalogId: ui.warehouseAddCatalogId,
      name: cat.name,
      unit: cat.unit,
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      note: (noteInput.value || '').trim(),
    });

    ui.warehouseAddQuery = '';
    ui.warehouseAddCatalogId = null;
    ui.warehouseAddHighlightIndex = 0;
    renderProfile();
  }

  function handleRemoveWarehouseItem(itemId) {
    state.profile.warehouse = state.profile.warehouse.filter(function (item) {
      return item.id !== itemId;
    });
    renderProfile();
  }

  function renderProfile() {
    const body = document.getElementById('profile-body');

    const jobs = state.jobs.slice().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    const groups = groupJobsByBucket(jobs);
    const jobsHTML = jobs.length
      ? jobSectionHTML('Active', groups.active) +
        jobSectionHTML('Pending Materials', groups.pendingMaterials) +
        jobSectionHTML('Pending Customer Payment', groups.pendingPayment) +
        jobSectionHTML('Completed', groups.completed)
      : '<p class="empty-state">No jobs yet.</p>';

    body.innerHTML =
      identitySectionHTML() +
      rateSectionHTML() +
      warehouseSectionHTML() +
      '<div class="picker-heading">Your Jobs</div>' +
      '<div class="job-list">' +
      jobsHTML +
      '</div>';
  }

  function handleSaveProfileDetails(name, businessName, tradeRegNumber) {
    const nameError = document.getElementById('profile-name-error');
    const businessNameError = document.getElementById('profile-business-name-error');
    const tradeRegError = document.getElementById('profile-trade-reg-error');

    const trimmedName = (name || '').trim();
    const trimmedBusinessName = (businessName || '').trim();
    const trimmedTradeReg = (tradeRegNumber || '').trim();

    nameError.hidden = true;
    businessNameError.hidden = true;
    tradeRegError.hidden = true;

    if (!trimmedName) {
      nameError.hidden = false;
      document.getElementById('profile-name').focus();
      return;
    }
    if (!trimmedBusinessName) {
      businessNameError.hidden = false;
      document.getElementById('profile-business-name').focus();
      return;
    }
    if (!trimmedTradeReg) {
      tradeRegError.hidden = false;
      document.getElementById('profile-trade-reg').focus();
      return;
    }

    state.session.name = trimmedName;
    state.session.businessName = trimmedBusinessName;
    state.session.tradeRegNumber = trimmedTradeReg;
    state.profile.pendingReview = true;
    ui.editingProfileDetails = false;
    render();
    showToast('Details updated — pending review.', true);
  }

  // Shared by both profile rate fields. Empty clears the rate back to
  // null; a non-numeric or negative entry is discarded and the field is
  // reverted to its last valid value. Deliberately does NOT call the full
  // render() on a successful save: profile-body sits inline with two
  // sibling fields, and a full render() would replace both inputs' DOM
  // nodes via innerHTML — destroying whichever field the user tabs/clicks
  // into next mid-interaction (observed live: typing into the second
  // field after the first field's change/blur fired lost every
  // keystroke, because render() from the first field's handler recreated
  // the second field's node out from under the user). The input already
  // visually shows what was typed, so no re-render is needed to save it;
  // only the revert path (invalid input) needs to force the display back
  // to the last valid value.
  function handleProfileRateChange(field, rawValue) {
    const trimmed = (rawValue || '').trim();
    if (trimmed === '') {
      state.profile[field] = null;
      return;
    }
    const next = parseFloat(trimmed);
    if (!Number.isFinite(next) || next < 0) {
      renderProfile();
      return;
    }
    state.profile[field] = next;
  }

  // ---------------------------------------------------------------------
  // Job detail screen — shell
  // ---------------------------------------------------------------------

  // Small flat pools for the "Use example" quick-fills — not
  // region-matched to the signed-in user, deliberately simple per this
  // pass's scope (flow/visualization, not real address data). Eircodes
  // are plausibly-shaped, not real/valid ones.
  const EXAMPLE_CUSTOMER_NAMES = [
    'John Murphy', 'Siobhán O’Brien', 'Aoife Kelly', 'Cian Byrne',
    'Niamh Walsh', 'Darragh Ryan', 'Éabha Connolly', 'Seán Doyle',
  ];
  const EXAMPLE_ADDRESSES = [
    { line1: '45 Elm Court', line2: '', county: 'Dublin', eircode: 'D08 X2C9', country: 'Ireland' },
    { line1: '9 Riverside Terrace', line2: 'Blackrock', county: 'Cork', eircode: 'T12 A1B2', country: 'Ireland' },
    { line1: '3 Parkview Grove', line2: '', county: 'Galway', eircode: 'H91 P3D4', country: 'Ireland' },
    { line1: '17 Meadowbrook Lane', line2: '', county: 'Limerick', eircode: 'V94 E5F6', country: 'Ireland' },
    { line1: '22 Orchard Close', line2: 'Ferrybank', county: 'Waterford', eircode: 'X91 G7H8', country: 'Ireland' },
  ];
  const EXAMPLE_BUSINESS_ADDRESSES = [
    { line1: 'Unit 4, Ashgrove Industrial Estate', line2: '', county: 'Dublin', eircode: 'D11 P8T6', country: 'Ireland' },
    { line1: '12 Distillery Road', line2: '', county: 'Cork', eircode: 'T23 R5K1', country: 'Ireland' },
    { line1: 'Unit 9, Liosban Business Park', line2: '', county: 'Galway', eircode: 'H91 D6F2', country: 'Ireland' },
    { line1: '8 Raheen Business Park', line2: '', county: 'Limerick', eircode: 'V94 N3W7', country: 'Ireland' },
  ];

  // Turns a structured address (as captured by the intake/sign-up forms)
  // into the single display string the rest of the app already expects
  // job.address / session.businessAddress-as-shown to be — every existing
  // consumer (job card, invoice, estimate, topbars) stays untouched.
  // Country is only appended when it isn't Ireland (the overwhelming
  // default), matching how a real Irish address is normally written.
  function formatAddress(parts) {
    const bits = [parts.line1];
    if (parts.line2) bits.push(parts.line2);
    bits.push('Co. ' + parts.county);
    bits.push(parts.eircode);
    const line = bits.join(', ');
    return parts.country && parts.country !== 'Ireland' ? line + ', ' + parts.country : line;
  }

  function countyOptionsHTML(selected) {
    return (
      '<option value="">Choose county</option>' +
      IRISH_COUNTIES.map(function (c) {
        return '<option value="' + c + '"' + (c === selected ? ' selected' : '') + '>' + c + '</option>';
      }).join('')
    );
  }

  function countryOptionsHTML(selected) {
    const use = selected || 'Ireland';
    return COUNTRY_OPTIONS.map(function (c) {
      return '<option value="' + c + '"' + (c === use ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
  }

  function renderJobDetail(job) {
    document.getElementById('job-detail-title').textContent = job.jobTypeLabel;
    document.getElementById('job-detail-customer').textContent = job.customerName ? 'For ' + job.customerName : '';
    document.getElementById('job-detail-sub').textContent = job.address + ' · ' + job.propertySize;
    document.getElementById('job-stepper').innerHTML = stepperHTML(job.status);
    document.getElementById('job-stage-caption').textContent = stageCaption(job.status);

    const body = document.getElementById('job-detail-body');
    switch (job.status) {
      case 'materials-needed':
        body.innerHTML = ui.viewingEstimate ? estimateInvoiceHTML(job) : materialsNeededHTML(job);
        break;
      case 'wholesaler-selected':
        body.innerHTML = wholesalerSelectedHTML(job);
        break;
      case 'materials-delivered':
        body.innerHTML = materialsDeliveredHTML(job);
        break;
      case 'job-started':
        body.innerHTML = jobStartedHTML(job);
        break;
      case 'job-completed':
        body.innerHTML = jobCompletedHTML(job);
        break;
      case 'invoice':
        body.innerHTML = invoiceHTML(job);
        break;
      default:
        body.innerHTML = materialsNeededHTML(job);
    }
  }

  // ---------------------------------------------------------------------
  // Materials needed (edit + wholesaler + pay)
  // ---------------------------------------------------------------------

  function materialWholesalerBlockHTML(job, material) {
    const chosen = chosenOption(job, material);
    const isOpen = ui.openWholesalerFor === material.id;

    let html = '<div class="wholesaler-row">';
    if (chosen) {
      const stockText =
        chosen.stock === 'in-stock' ? 'in stock' : chosen.leadDays + '-day lead';
      html +=
        '<div class="chip ok"><span class="dot' +
        (chosen.stock === 'in-stock' ? '' : ' warn') +
        '"></span>' +
        escapeHtml(WHOLESALERS[chosen.wholesalerId].name) +
        ' — ' +
        stockText +
        '</div>';
    } else {
      html += '<div class="chip unassigned"><span class="dot warn"></span>No wholesaler chosen</div>';
    }
    html +=
      '<button type="button" class="change-link" data-action="wholesaler-toggle" data-material-id="' +
      material.id +
      '">' +
      (chosen ? 'Change' : 'Choose') +
      '</button>' +
      '</div>';

    if (chosen && chosen.stock === 'lead-time') {
      html +=
        '<div class="warn-flag" style="margin-left:16px">Lead time risk — order today to hold schedule</div>';
    }

    if (isOpen) {
      html += '<div class="wholesaler-options">';
      material.options.forEach(function (opt) {
        const selected = job.wholesalerChoices[material.id] === opt.wholesalerId;
        const stockText =
          opt.stock === 'in-stock' ? 'in stock' : opt.leadDays + '-day lead';
        html +=
          '<div class="wholesaler-option' +
          (selected ? ' selected' : '') +
          '" data-action="wholesaler-choose" data-material-id="' +
          material.id +
          '" data-wholesaler-id="' +
          opt.wholesalerId +
          '">' +
          '<div>' +
          '<div class="wholesaler-option-name">' +
          escapeHtml(WHOLESALERS[opt.wholesalerId].name) +
          '</div>' +
          '<div class="wholesaler-option-meta">' +
          opt.distanceKm +
          'km · ' +
          stockText +
          '</div>' +
          '</div>' +
          '<div class="wholesaler-option-price">' +
          formatEUR(opt.unitPrice) +
          '/' +
          escapeHtml(material.unit) +
          '</div>' +
          '</div>';
      });
      html += '</div>';
    }

    return html;
  }

  function materialsNeededHTML(job) {
    const canRemove = job.materials.length > 1;

    const rows = job.materials
      .map(function (m) {
        return (
          '<div class="mat-row" data-material-id="' +
          m.id +
          '">' +
          '<div class="mat-top">' +
          '<div class="mat-left">' +
          '<div>' +
          '<div class="mat-name">' +
          escapeHtml(m.name) +
          '</div>' +
          '<div class="mat-unit">' +
          escapeHtml(m.unit) +
          '</div>' +
          '<div class="mat-unit mat-line-total">Est. ' +
          formatEUR(estimateLineTotal(job, m)) +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div class="mat-actions">' +
          (canRemove
            ? '<button type="button" class="mat-remove" data-action="remove-material" data-material-id="' +
              m.id +
              '">Remove</button>'
            : '<button type="button" class="mat-remove" data-action="remove-material" data-material-id="' +
              m.id +
              '" disabled title="A job needs at least one material">Remove</button>')
          +
          '<div class="qty-box">' +
          '<button type="button" data-action="qty-dec" data-material-id="' +
          m.id +
          '"' +
          (m.qty <= 1 ? ' disabled' : '') +
          '>−</button>' +
          '<input type="text" inputmode="numeric" class="qty-input" data-material-id="' +
          m.id +
          '" value="' +
          m.qty +
          '">' +
          '<button type="button" data-action="qty-inc" data-material-id="' +
          m.id +
          '">+</button>' +
          '</div>' +
          '</div>' +
          '</div>' +
          materialWholesalerBlockHTML(job, m) +
          '</div>'
        );
      })
      .join('');

    const addBlock = ui.addItemOpen
      ? addItemFormHTML(job)
      : '<button type="button" class="add-item" data-action="add-item-open">+ Add material</button>';

    const removeBlockedNote = !canRemove
      ? '<p class="inline-error">A job needs at least one material — add another before removing this one.</p>'
      : '';

    const qtyNoticeHTML = ui.qtyNotice ? '<p class="inline-error">' + escapeHtml(ui.qtyNotice) + '</p>' : '';

    const canPay = allMaterialsHaveWholesaler(job);
    const payNote = canPay
      ? ''
      : '<p class="inline-error">Choose a wholesaler for every material before paying.</p>';

    return (
      '<div class="mat-list">' +
      rows +
      '</div>' +
      addBlock +
      removeBlockedNote +
      qtyNoticeHTML +
      '<div class="summary-card">' +
      '<span class="summary-label">Estimated total</span>' +
      '<span class="summary-value" id="mn-total">' +
      formatEUR(estimateJobTotal(job)) +
      '</span>' +
      '</div>' +
      '<div class="action-bar">' +
      '<button type="button" class="btn btn-secondary btn-block" data-action="show-estimate">Show customer estimate</button>' +
      '<button type="button" class="btn btn-primary btn-block" data-action="pay"' +
      (canPay ? '' : ' disabled') +
      '>Pay ' +
      formatEUR(estimateJobTotal(job)) +
      '</button>' +
      payNote +
      '<button type="button" class="btn btn-danger btn-block" data-action="cancel-job" data-job-id="' +
      job.id +
      '">Cancel job — customer declined</button>' +
      '</div>'
    );
  }

  // Catalog ids for a trade matching the query (case-insensitive
  // substring), name-starts-with matches sorted first, optionally
  // excluding a set of ids. Shared base for every catalog search picker
  // in the app (job materials, personal warehouse) so match/sort order
  // can never silently diverge between them.
  function filterCatalogIds(trade, query, excludeIds) {
    const exclude = excludeIds || {};
    const ids = Object.keys(MATERIAL_CATALOG).filter(function (id) {
      if (MATERIAL_CATALOG[id].trade !== trade) return false;
      if (exclude[id]) return false;
      if (!query) return true;
      return MATERIAL_CATALOG[id].name.toLowerCase().indexOf(query) !== -1;
    });

    if (!query) return ids;
    return ids.slice().sort(function (a, b) {
      const aStarts = MATERIAL_CATALOG[a].name.toLowerCase().indexOf(query) === 0;
      const bStarts = MATERIAL_CATALOG[b].name.toLowerCase().indexOf(query) === 0;
      if (aStarts === bStarts) return 0;
      return aStarts ? -1 : 1;
    });
  }

  // Catalog ids not yet on this job, matching the query. Shared by the
  // rendered picker and the keyboard-nav handler so both agree on order.
  function filteredMaterialResultIds(job, query) {
    const alreadyAddedCatalogIds = {};
    job.materials.forEach(function (m) {
      if (m.catalogId) alreadyAddedCatalogIds[m.catalogId] = true;
    });
    return filterCatalogIds(job.trade, query, alreadyAddedCatalogIds);
  }

  // Same search, for the personal materials warehouse — no exclusion:
  // unlike a job (one row per material), having leftovers of the same
  // catalog item logged more than once (from different jobs) is normal.
  function filteredWarehouseResultIds(query) {
    return filterCatalogIds(state.session.trade, query, null);
  }

  // Shared results-dropdown markup for any catalog search picker —
  // `pickAction` is the data-action the click delegate dispatches on.
  function materialResultsHTML(matchIds, query, highlightIndex, pickAction, emptyMessage) {
    if (matchIds.length) {
      return (
        '<div class="material-results" aria-live="polite">' +
        matchIds
          .map(function (id, i) {
            const cat = MATERIAL_CATALOG[id];
            const cheapest = cheapestOption(cat);
            return (
              '<button type="button" class="material-result' +
              (i === highlightIndex ? ' highlighted' : '') +
              '" data-action="' +
              pickAction +
              '" data-catalog-id="' +
              id +
              '">' +
              '<div class="material-result-name">' +
              escapeHtml(cat.name) +
              '</div>' +
              '<div class="material-result-meta">' +
              escapeHtml(cat.unit) +
              (cheapest ? ' · from ' + formatEUR(cheapest.unitPrice) : '') +
              '</div>' +
              '</button>'
            );
          })
          .join('') +
        '</div>'
      );
    }
    if (query) {
      return '<p class="material-results-empty" aria-live="polite">No materials match "' + escapeHtml(query) + '".</p>';
    }
    return '<p class="material-results-empty" aria-live="polite">' + escapeHtml(emptyMessage) + '</p>';
  }

  // Search-as-you-type picker restricted to MATERIAL_CATALOG — the only
  // way to add a material, so every addable item still carries real
  // per-wholesaler pricing. No freeform name/price entry.
  function addItemFormHTML(job) {
    const query = (ui.addItemQuery || '').trim().toLowerCase();
    const matchIds = filteredMaterialResultIds(job, query);
    const highlightIndex = Math.min(ui.addItemHighlightIndex || 0, Math.max(matchIds.length - 1, 0));
    const resultsHTML = materialResultsHTML(matchIds, ui.addItemQuery.trim(), highlightIndex, 'add-item-pick', 'All materials already added.');

    return (
      '<div class="add-item-form">' +
      '<input type="text" id="add-item-search" class="search-input" placeholder="Search materials…" ' +
      'aria-label="Search materials to add" value="' +
      escapeHtml(ui.addItemQuery || '') +
      '" autocomplete="off">' +
      resultsHTML +
      '<div class="add-item-form-actions">' +
      '<button type="button" class="btn btn-secondary" data-action="add-item-cancel">Cancel</button>' +
      '</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------
  // Wholesaler selected (payment confirmed, ready for delivery)
  // ---------------------------------------------------------------------

  function wholesalerSelectedHTML(job) {
    const rows = job.materials
      .map(function (m) {
        const opt = chosenOption(job, m);
        const wholesalerName = opt ? escapeHtml(WHOLESALERS[opt.wholesalerId].name) : 'Unknown';
        return (
          '<div class="mat-row' +
          (m.received ? ' delivered' : '') +
          '" data-material-id="' +
          m.id +
          '">' +
          '<div class="mat-top">' +
          '<div class="mat-left">' +
          '<button type="button" class="checkbox' +
          (m.received ? ' checked' : '') +
          '" data-action="toggle-received" data-material-id="' +
          m.id +
          '" aria-pressed="' +
          (m.received ? 'true' : 'false') +
          '" aria-label="Mark ' +
          escapeHtml(m.name) +
          ' as received">' +
          (m.received ? '✓' : '') +
          '</button>' +
          '<div>' +
          '<div class="mat-name">' +
          escapeHtml(m.name) +
          '</div>' +
          '<div class="mat-unit">' +
          m.qty +
          ' ' +
          escapeHtml(m.unit) +
          (m.received ? ' · received' : '') +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div class="wholesaler-option-price">' +
          formatEUR(m.qty * (opt ? opt.unitPrice : 0)) +
          '</div>' +
          '</div>' +
          '<div class="wholesaler-row">' +
          '<div class="chip ok"><span class="dot"></span>' +
          wholesalerName +
          '</div>' +
          '</div>' +
          '<div class="contact-log">Requested via email · ' +
          wholesalerName +
          ' · ' +
          requestedTimeLabel(job.materialsOrderedAt) +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    const allReceived = allMaterialsReceived(job);
    const receivedCount = job.materials.filter(function (m) {
      return m.received;
    }).length;

    return (
      '<div class="status-panel ok">' +
      '<div class="status-panel-icon">✓</div>' +
      '<div class="status-panel-title">Payment confirmed</div>' +
      '<div class="status-panel-sub">' +
      formatEUR(materialsCostFinal(job)) +
      ' charged (mock) across ' +
      job.materials.length +
      ' item' +
      (job.materials.length === 1 ? '' : 's') +
      '. Materials are on order — check each item off as it arrives.</div>' +
      '</div>' +
      '<div class="mat-list">' +
      rows +
      '</div>' +
      '<div class="action-bar">' +
      '<button type="button" class="btn btn-primary btn-block" data-action="advance-status" data-next="materials-delivered" data-message="Marked as delivered."' +
      (allReceived ? '' : ' disabled') +
      '>Mark Delivered</button>' +
      (allReceived
        ? ''
        : '<p class="inline-error">' +
          receivedCount +
          ' of ' +
          job.materials.length +
          ' items checked off — mark every item received before continuing.</p>') +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------
  // Materials delivered
  // ---------------------------------------------------------------------

  function materialsDeliveredHTML(job) {
    const rows = job.materials
      .map(function (m) {
        return (
          '<div class="mat-row delivered">' +
          '<div class="mat-top">' +
          '<div class="mat-left">' +
          '<div class="checkbox checked">✓</div>' +
          '<div>' +
          '<div class="mat-name">' +
          escapeHtml(m.name) +
          '</div>' +
          '<div class="mat-unit">' +
          m.qty +
          ' ' +
          escapeHtml(m.unit) +
          ' · delivered</div>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="mat-list">' +
      rows +
      '</div>' +
      '<div class="checkoff-note">All ' +
      job.materials.length +
      ' item' +
      (job.materials.length === 1 ? '' : 's') +
      ' delivered</div>' +
      '<div class="action-bar">' +
      '<button type="button" class="btn btn-primary btn-block" data-action="advance-status" data-next="job-started" data-message="Job started.">Start Job</button>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------
  // Job started
  // ---------------------------------------------------------------------

  function jobStartedHTML(job) {
    return (
      '<div class="status-panel">' +
      '<div class="status-panel-icon">⚡</div>' +
      '<div class="status-panel-title">Job in progress</div>' +
      '<div class="status-panel-sub">Work is underway at ' +
      escapeHtml(job.address) +
      '. Mark complete when the job is finished on-site.</div>' +
      '</div>' +
      '<div class="action-bar">' +
      '<button type="button" class="btn btn-primary btn-block" data-action="advance-status" data-next="job-completed" data-message="Job marked complete.">Mark Complete</button>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------
  // Job completed
  // ---------------------------------------------------------------------

  function jobCompletedHTML(job) {
    return (
      '<div class="status-panel ok">' +
      '<div class="status-panel-icon">✓</div>' +
      '<div class="status-panel-title">Job completed</div>' +
      '<div class="status-panel-sub">' +
      escapeHtml(job.address) +
      ' is finished. Generate the invoice when you’re ready to bill.</div>' +
      '</div>' +
      '<div class="action-bar">' +
      '<button type="button" class="btn btn-primary btn-block" data-action="advance-status" data-next="invoice" data-message="Invoice generated.">Generate Invoice</button>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------
  // Invoice
  // ---------------------------------------------------------------------

  // Single source of truth for the labour + materials + VAT math, so the
  // job-picker's "amount due" badge and the invoice screen's own total
  // can never silently diverge.
  function invoiceBreakdown(job) {
    const materialsCost = materialsCostFinal(job);
    const includeMaterials = job.invoiceIncludesMaterials;
    const extraChargesTotal = (job.extraCharges || []).reduce(function (sum, c) {
      return sum + c.amount;
    }, 0);
    const subtotal = job.labourCost + (includeMaterials ? materialsCost : 0) + extraChargesTotal;
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    return {
      materialsCost: materialsCost,
      includeMaterials: includeMaterials,
      extraChargesTotal: extraChargesTotal,
      subtotal: subtotal,
      vat: vat,
      total: total,
    };
  }

  function invoiceTotal(job) {
    return invoiceBreakdown(job).total;
  }

  function invoiceNumberFor(job) {
    const idPart = String(job.id || '')
      .replace(/[^a-z0-9]/gi, '')
      .slice(-6)
      .toUpperCase();
    return 'INV-' + (idPart || '000000');
  }

  const invoiceDateFmt = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
  const TRADESPERSON_VAT_NUMBER = 'IE1234567T';

  function invoiceHTML(job) {
    if (ui.editingInvoice) return invoiceEditHTML(job);

    const breakdown = invoiceBreakdown(job);
    const materialsCost = breakdown.materialsCost;
    const includeMaterials = breakdown.includeMaterials;
    const subtotal = breakdown.subtotal;
    const vat = breakdown.vat;
    const total = breakdown.total;

    const materialLines = job.materials
      .map(function (m) {
        const opt = chosenOption(job, m);
        const lineValue = m.qty * (opt ? opt.unitPrice : 0);
        return (
          '<div class="line-item' +
          (includeMaterials ? '' : ' muted') +
          '">' +
          '<span class="line-item-name">' +
          escapeHtml(m.name) +
          ' <span class="line-item-qty">(' +
          m.qty +
          ' ' +
          escapeHtml(m.unit) +
          ')</span></span>' +
          '<span class="line-item-value">' +
          formatEUR(lineValue) +
          '</span>' +
          '</div>'
        );
      })
      .join('');

    const extraChargeLines = (job.extraCharges || [])
      .map(function (c) {
        return (
          '<div class="line-item"><span class="line-item-name">' +
          escapeHtml(c.description) +
          '</span><span class="line-item-value">' +
          formatEUR(c.amount) +
          '</span></div>'
        );
      })
      .join('');

    const notesBlock = job.invoiceNotes
      ? '<div class="line-section-label">Notes</div><p class="invoice-notes">' + escapeHtml(job.invoiceNotes) + '</p>'
      : '';

    const badgeLabel = job.customerPaid ? 'Paid' : 'Awaiting Payment';
    const badgeClass = job.customerPaid ? '' : ' badge-estimate';

    const actionButtons = job.customerPaid
      ? '<button type="button" class="btn btn-secondary btn-block" data-action="download-pdf">Download PDF</button>'
      : '<button type="button" class="btn btn-secondary" data-action="edit-invoice">Edit Invoice</button>' +
        '<button type="button" class="btn btn-secondary" data-action="download-pdf">Download PDF</button>' +
        '<button type="button" class="btn btn-primary btn-block" data-action="mark-paid" data-job-id="' +
        job.id +
        '">Mark as Paid</button>';

    return (
      '<div class="invoice-card">' +
      '<div class="invoice-header">' +
      '<div>' +
      '<div class="invoice-job">' +
      escapeHtml(job.customerName || job.jobTypeLabel) +
      '</div>' +
      '<div class="invoice-job-sub">' +
      escapeHtml(job.address) +
      ' · ' +
      escapeHtml(job.jobTypeLabel) +
      '</div>' +
      '</div>' +
      '<span class="invoice-badge' +
      badgeClass +
      '">' +
      badgeLabel +
      '</span>' +
      '</div>' +
      '<div class="invoice-meta-row">' +
      '<span>Invoice ' +
      escapeHtml(invoiceNumberFor(job)) +
      '</span>' +
      '<span>Issued ' +
      escapeHtml(invoiceDateFmt.format(new Date())) +
      '</span>' +
      '</div>' +
      '<div class="toggle-row" data-no-print>' +
      '<div>' +
      '<div class="toggle-label">Include materials cost</div>' +
      '<div class="toggle-sub">Off = labour-only invoice</div>' +
      '</div>' +
      '<label class="switch">' +
      '<input type="checkbox" id="invoice-materials-toggle"' +
      (includeMaterials ? ' checked' : '') +
      (job.customerPaid ? ' disabled' : '') +
      '>' +
      '<span class="switch-track"></span>' +
      '</label>' +
      '</div>' +
      '<div class="line-section-label">Labour</div>' +
      '<div class="line-item"><span class="line-item-name">Labour — ' +
      escapeHtml(job.jobTypeLabel) +
      '</span><span class="line-item-value">' +
      formatEUR(job.labourCost) +
      '</span></div>' +
      '<div class="line-section-label">Materials' +
      (includeMaterials ? '' : ' (excluded from this invoice)') +
      '</div>' +
      materialLines +
      (extraChargeLines ? '<div class="line-section-label">Extra Charges</div>' + extraChargeLines : '') +
      '<div class="invoice-totals">' +
      '<div class="line-item"><span class="line-item-name">Subtotal</span><span class="line-item-value">' +
      formatEUR(subtotal) +
      '</span></div>' +
      '<div class="line-item"><span class="line-item-name">VAT (13.5%)</span><span class="line-item-value">' +
      formatEUR(vat) +
      '</span></div>' +
      '<div class="line-item grand"><span class="line-item-name">Total due</span><span class="line-item-value">' +
      formatEUR(total) +
      '</span></div>' +
      '</div>' +
      notesBlock +
      '<div class="invoice-footer">VAT registration ' +
      escapeHtml(TRADESPERSON_VAT_NUMBER) +
      '</div>' +
      '</div>' +
      '<div class="action-bar" data-no-print>' +
      actionButtons +
      '</div>'
    );
  }

  function invoiceEditHTML(job) {
    const chargeRows = (job.extraCharges || [])
      .map(function (c) {
        return (
          '<div class="line-item"><span class="line-item-name">' +
          escapeHtml(c.description) +
          '</span><span class="line-item-value">' +
          formatEUR(c.amount) +
          '</span>' +
          '<button type="button" class="mat-remove" data-action="remove-extra-charge" data-charge-id="' +
          c.id +
          '">Remove</button></div>'
        );
      })
      .join('');

    return (
      '<div class="invoice-card">' +
      '<div class="line-section-label">Editing invoice</div>' +
      '<label class="field">' +
      '<span class="field-label">Labour cost (EUR)</span>' +
      '<input type="number" id="invoice-labour-input" min="0" step="0.01" value="' +
      job.labourCost +
      '" /></label>' +
      '<div class="line-section-label">Extra Charges</div>' +
      chargeRows +
      '<div class="warehouse-add-row">' +
      '<input type="text" id="extra-charge-desc" placeholder="Description (e.g. additional materials)" />' +
      '<input type="number" id="extra-charge-amount" min="0" step="0.01" placeholder="Amount" />' +
      '<button type="button" class="btn btn-secondary" data-action="add-extra-charge">Add</button>' +
      '</div>' +
      '<p class="field-error" id="extra-charge-error" hidden>Enter a description and a valid amount.</p>' +
      '<label class="field">' +
      '<span class="field-label">Notes (explain any labour or material changes to the customer)</span>' +
      '<textarea id="invoice-notes-input" rows="3">' +
      escapeHtml(job.invoiceNotes || '') +
      '</textarea></label>' +
      '<div class="action-bar">' +
      '<button type="button" class="btn btn-secondary" data-action="cancel-edit-invoice">Cancel</button>' +
      '<button type="button" class="btn btn-primary" data-action="save-invoice-edit">Save</button>' +
      '</div>' +
      '</div>'
    );
  }

  // Pre-order customer estimate, shown from the Materials Needed stage
  // before any wholesaler is chosen or paid. Deliberately a separate
  // function from invoiceHTML rather than a shared one with branches:
  // it prices materials at cheapest-available (estimateLineTotal, not
  // chosenOption-based materialsCostFinal) and pulls labour from the
  // tradesperson's profile rather than invoiceBreakdown's job.labourCost
  // — different inputs and no materials-toggle, so keeping it separate
  // matches the existing estimateJobTotal/materialsCostFinal split.
  function estimateInvoiceHTML(job) {
    // Explicit profile override wins; otherwise the trade+region preset
    // (a real, region-aware default); otherwise the preset job's own
    // flat labourCost (the only option for a trade with no rate preset
    // yet, e.g. Carpenter/General Builder).
    const presetPerJob = ratePreset('perJob');
    const labourCost =
      state.profile.labourRatePerJob !== null
        ? state.profile.labourRatePerJob
        : presetPerJob !== null
        ? presetPerJob
        : job.labourCost;
    const materialsCost = estimateJobTotal(job);
    const subtotal = labourCost + materialsCost;
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;

    const materialLines = job.materials
      .map(function (m) {
        return (
          '<div class="line-item">' +
          '<span class="line-item-name">' +
          escapeHtml(m.name) +
          ' <span class="line-item-qty">(' +
          m.qty +
          ' ' +
          escapeHtml(m.unit) +
          ')</span></span>' +
          '<span class="line-item-value">' +
          formatEUR(estimateLineTotal(job, m)) +
          '</span>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<button type="button" class="back-link" data-action="hide-estimate">&larr; Back to materials</button>' +
      '<div class="invoice-card">' +
      '<div class="invoice-header">' +
      '<div>' +
      '<div class="invoice-job">' +
      escapeHtml(job.customerName || job.jobTypeLabel) +
      '</div>' +
      '<div class="invoice-job-sub">' +
      escapeHtml(job.address) +
      ' · ' +
      escapeHtml(job.jobTypeLabel) +
      '</div>' +
      '</div>' +
      '<span class="invoice-badge badge-estimate">Estimate</span>' +
      '</div>' +
      '<div class="invoice-meta-row">' +
      '<span>Prepared ' +
      escapeHtml(invoiceDateFmt.format(new Date())) +
      '</span>' +
      '</div>' +
      '<div class="line-section-label">Labour</div>' +
      '<div class="line-item"><span class="line-item-name">Labour — ' +
      escapeHtml(job.jobTypeLabel) +
      '</span><span class="line-item-value">' +
      formatEUR(labourCost) +
      '</span></div>' +
      '<div class="line-section-label">Materials (estimated)</div>' +
      materialLines +
      '<div class="invoice-totals">' +
      '<div class="line-item"><span class="line-item-name">Subtotal</span><span class="line-item-value">' +
      formatEUR(subtotal) +
      '</span></div>' +
      '<div class="line-item"><span class="line-item-name">VAT (13.5%)</span><span class="line-item-value">' +
      formatEUR(vat) +
      '</span></div>' +
      '<div class="line-item grand"><span class="line-item-name">Estimated total</span><span class="line-item-value">' +
      formatEUR(total) +
      '</span></div>' +
      '</div>' +
      '<div class="invoice-footer">This is an estimate to give the customer an idea of cost — not a final invoice. Actual costs may vary once materials are ordered.</div>' +
      '</div>' +
      '<div class="action-bar" data-no-print>' +
      '<button type="button" class="btn btn-secondary btn-block" data-action="download-pdf">Download PDF</button>' +
      '<button type="button" class="btn btn-danger btn-block" data-action="cancel-job" data-job-id="' +
      job.id +
      '">Cancel job — customer declined</button>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------
  // Mutation handlers
  // ---------------------------------------------------------------------

  function touchJob(job) {
    job.updatedAt = Date.now();
  }

  function handleQtyChange(materialId, delta, explicitValue) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    const material = job.materials.find(function (m) {
      return m.id === materialId;
    });
    if (!material) return;

    let next;
    if (explicitValue !== undefined) {
      next = parseInt(explicitValue, 10);
      if (!Number.isFinite(next) || next < 1) next = 1;
    } else {
      next = material.qty + delta;
      if (next < 1) next = 1;
    }

    if (next > MAX_QTY) {
      next = MAX_QTY;
      ui.qtyNotice = 'Quantity capped at ' + MAX_QTY.toLocaleString() + ' ' + material.unit + '.';
    } else if (ui.qtyNotice) {
      ui.qtyNotice = null;
    }

    material.qty = next;
    touchJob(job);
    render();
  }

  function handleRemoveMaterial(materialId) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    if (job.materials.length <= 1) {
      ui.removeBlockedFor = materialId;
      render();
      return;
    }
    const removed = job.materials.find(function (m) {
      return m.id === materialId;
    });
    job.materials = job.materials.filter(function (m) {
      return m.id !== materialId;
    });
    delete job.wholesalerChoices[materialId];
    ui.removeBlockedFor = null;
    touchJob(job);
    render();
    if (removed) showToast('Removed "' + removed.name + '".', true);
  }

  function handleAddItemPick(catalogId) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    const cat = MATERIAL_CATALOG[catalogId];
    if (!cat) return;

    // Guard against a stale/duplicate click adding the same catalog item twice.
    const alreadyAdded = job.materials.some(function (m) {
      return m.catalogId === catalogId;
    });
    if (alreadyAdded) return;

    job.materials.push({
      id: generateId('mat'),
      catalogId: catalogId,
      name: cat.name,
      unit: cat.unit,
      qty: 1,
      options: cat.options,
      received: false,
    });

    ui.addItemOpen = false;
    ui.addItemQuery = '';
    ui.addItemHighlightIndex = 0;
    touchJob(job);
    render();
  }

  // Cancelling only makes sense before any wholesaler is chosen or paid
  // (the customer-estimate view this is reached from only shows on the
  // materials-needed stage) — so this is a full removal, not a
  // 'cancelled' status, matching a job that never actually happened.
  function handleCancelJob(jobId) {
    const job = findJob(jobId);
    if (!job) return;
    state.jobs = state.jobs.filter(function (j) {
      return j.id !== jobId;
    });
    if (state.currentJobId === jobId) {
      state.currentJobId = null;
      ui.viewingEstimate = false;
    }
    render();
    showToast('Cancelled "' + job.jobTypeLabel + '".', true);
  }

  function handleToggleReceived(materialId) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    const material = job.materials.find(function (m) {
      return m.id === materialId;
    });
    if (!material) return;
    material.received = !material.received;
    touchJob(job);
    render();
  }

  // Preserves whatever the user has typed into the invoice-edit form's
  // labour/notes fields (not yet saved) across a render() triggered by
  // something else on the same screen — render() regenerates the whole
  // edit form via invoiceEditHTML, which would otherwise silently wipe an
  // in-progress, unsaved edit to those two fields (observed live: adding
  // an extra charge reset a just-typed labour-cost value back to the
  // job's old one). Same class of bug as the earlier Profile rate-fields
  // fix, different shape since this screen's re-render is unavoidable
  // (the charges list itself must update).
  function withPreservedInvoiceEditFields(fn) {
    const labourInput = document.getElementById('invoice-labour-input');
    const notesInput = document.getElementById('invoice-notes-input');
    const preservedLabour = labourInput ? labourInput.value : null;
    const preservedNotes = notesInput ? notesInput.value : null;
    fn();
    if (preservedLabour !== null) {
      const restoredLabour = document.getElementById('invoice-labour-input');
      if (restoredLabour) restoredLabour.value = preservedLabour;
    }
    if (preservedNotes !== null) {
      const restoredNotes = document.getElementById('invoice-notes-input');
      if (restoredNotes) restoredNotes.value = preservedNotes;
    }
  }

  // Extra charges save immediately (like adding a material) rather than
  // waiting for the invoice-edit Save button — labour cost and notes are
  // free text/number fields that need a deliberate save moment, but an
  // added charge is already a complete, valid unit the moment it's typed.
  function handleAddExtraCharge(description, amountRaw) {
    const errorEl = document.getElementById('extra-charge-error');
    const trimmedDesc = (description || '').trim();
    const amount = parseFloat(amountRaw);
    if (!trimmedDesc || !Number.isFinite(amount) || amount <= 0) {
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;
    const job = findJob(state.currentJobId);
    if (!job) return;
    job.extraCharges.push({ id: generateId('chg'), description: trimmedDesc, amount: amount });
    touchJob(job);
    withPreservedInvoiceEditFields(render);
  }

  function handleRemoveExtraCharge(chargeId) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    job.extraCharges = job.extraCharges.filter(function (c) {
      return c.id !== chargeId;
    });
    touchJob(job);
    withPreservedInvoiceEditFields(render);
  }

  function handleSaveInvoiceEdit(labourCostRaw, notes) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    const labourCost = parseFloat(labourCostRaw);
    if (Number.isFinite(labourCost) && labourCost >= 0) {
      job.labourCost = labourCost;
    }
    job.invoiceNotes = (notes || '').trim();
    touchJob(job);
    ui.editingInvoice = false;
    render();
    showToast('Invoice updated.', true);
  }

  // Terminal action for this draft — once paid, the invoice locks (no
  // Edit Invoice button renders) since there's no real "send" step to
  // have happened before it; matches the "modifiable before we send it"
  // intent by closing the edit window at the point the job is done.
  function handleMarkPaid(jobId) {
    const job = findJob(jobId);
    if (!job) return;
    job.customerPaid = true;
    touchJob(job);
    render();
    showToast('Marked as paid.', true);
  }

  function handlePay() {
    const job = findJob(state.currentJobId);
    if (!job) return;
    if (!allMaterialsHaveWholesaler(job)) {
      render();
      return;
    }
    const total = materialsCostFinal(job);
    job.status = 'wholesaler-selected';
    job.materialsOrderedAt = Date.now();
    touchJob(job);
    render();
    showToast('Payment confirmed — ' + formatEUR(total) + ' charged (mock).', true);
  }

  function handleAdvance(next, message) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    if (STATUS_ORDER.indexOf(next) === -1) return;
    job.status = next;
    touchJob(job);
    render();
    if (message) showToast(message, true);
  }

  function handleWholesalerChoose(materialId, wholesalerId) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    job.wholesalerChoices[materialId] = wholesalerId;
    ui.openWholesalerFor = null;
    touchJob(job);
    render();
  }

  function handleInvoiceToggle(checked) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    job.invoiceIncludesMaterials = checked;
    touchJob(job);
    render();
  }

  function handleLogin(name, trade, region, email, businessName, addressLine1, addressLine2, addressCounty, addressEircode, addressCountry, tradeRegNumber, attested) {
    const nameError = document.getElementById('login-name-error');
    const tradeError = document.getElementById('login-trade-error');
    const regionError = document.getElementById('login-region-error');
    const businessNameError = document.getElementById('login-business-name-error');
    const addressError = document.getElementById('login-address-error');
    const tradeRegError = document.getElementById('login-trade-reg-error');
    const attestError = document.getElementById('login-attest-error');

    const trimmedName = (name || '').trim();
    const trimmedTrade = (trade || '').trim();
    const trimmedRegion = (region || '').trim();
    const trimmedBusinessName = (businessName || '').trim();
    const trimmedLine1 = (addressLine1 || '').trim();
    const trimmedLine2 = (addressLine2 || '').trim();
    const county = addressCounty || '';
    const trimmedEircode = (addressEircode || '').trim();
    const country = addressCountry || '';
    const trimmedTradeReg = (tradeRegNumber || '').trim();

    // Clear all errors up front so a stale error from a previous submit
    // (for a field the user already fixed) can't survive an early return
    // triggered by a different, earlier field failing this time.
    nameError.hidden = true;
    tradeError.hidden = true;
    regionError.hidden = true;
    businessNameError.hidden = true;
    addressError.hidden = true;
    tradeRegError.hidden = true;
    attestError.hidden = true;

    if (!trimmedName) {
      nameError.hidden = false;
      document.getElementById('login-name').focus();
      return;
    }
    nameError.hidden = true;

    if (!trimmedTrade) {
      tradeError.hidden = false;
      document.getElementById('login-trade-group').querySelector('.trade-chip').focus();
      return;
    }
    tradeError.hidden = true;

    if (!trimmedRegion) {
      regionError.hidden = false;
      document.getElementById('login-region').focus();
      return;
    }
    regionError.hidden = true;

    if (!trimmedBusinessName) {
      businessNameError.hidden = false;
      document.getElementById('login-business-name').focus();
      return;
    }
    businessNameError.hidden = true;

    if (!trimmedLine1) {
      addressError.hidden = false;
      document.getElementById('login-address-line1').focus();
      return;
    }
    if (!county) {
      addressError.hidden = false;
      document.getElementById('login-address-county').focus();
      return;
    }
    if (!trimmedEircode) {
      addressError.hidden = false;
      document.getElementById('login-address-eircode').focus();
      return;
    }
    addressError.hidden = true;

    if (!trimmedTradeReg) {
      tradeRegError.hidden = false;
      document.getElementById('login-trade-reg').focus();
      return;
    }
    tradeRegError.hidden = true;

    if (!attested) {
      attestError.hidden = false;
      document.getElementById('login-attest').focus();
      return;
    }
    attestError.hidden = true;

    state.session = {
      name: trimmedName,
      trade: trimmedTrade,
      region: trimmedRegion,
      email: (email || '').trim(),
      businessName: trimmedBusinessName,
      businessAddress: formatAddress({
        line1: trimmedLine1,
        line2: trimmedLine2,
        county: county,
        eircode: trimmedEircode,
        country: country,
      }),
      tradeRegNumber: trimmedTradeReg,
      loginAt: Date.now(),
    };
    state.currentJobId = null;
    render();
  }

  function handleLogout() {
    state.session = null;
    state.currentJobId = null;
    // Pre-existing gap, fixed while touching this area: neither of these
    // was reset on logout, so logging back in could silently land on
    // Profile or the new-job screen instead of the dashboard.
    state.viewingProfile = false;
    state.startingNewJob = false;
    render();
  }

  // ---------------------------------------------------------------------
  // Event wiring (delegated — DOM is rebuilt on every render)
  // ---------------------------------------------------------------------

  function init() {
    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      handleLogin(
        document.getElementById('login-name').value,
        document.getElementById('login-trade').value,
        document.getElementById('login-region').value,
        document.getElementById('login-email').value,
        document.getElementById('login-business-name').value,
        document.getElementById('login-address-line1').value,
        document.getElementById('login-address-line2').value,
        document.getElementById('login-address-county').value,
        document.getElementById('login-address-eircode').value,
        document.getElementById('login-address-country').value,
        document.getElementById('login-trade-reg').value,
        document.getElementById('login-attest').checked
      );
    });

    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-back-to-jobs').addEventListener('click', function () {
      state.currentJobId = null;
      ui.openWholesalerFor = null;
      ui.addItemOpen = false;
      ui.addItemQuery = '';
      ui.addItemHighlightIndex = 0;
      ui.qtyNotice = null;
      ui.viewingEstimate = false;
      render();
    });

    document.body.addEventListener('click', function (e) {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const action = el.getAttribute('data-action');
      const materialId = el.getAttribute('data-material-id');

      switch (action) {
        case 'open-job':
          state.currentJobId = el.getAttribute('data-job-id');
          state.viewingProfile = false;
          ui.openWholesalerFor = null;
          ui.addItemOpen = false;
          ui.addItemQuery = '';
          ui.addItemHighlightIndex = 0;
          ui.qtyNotice = null;
          ui.viewingEstimate = false;
          ui.editingProfileDetails = false;
          ui.editingRates = false;
          ui.editingInvoice = false;
          ui.warehouseAddQuery = '';
          ui.warehouseAddCatalogId = null;
          ui.warehouseAddHighlightIndex = 0;
          render();
          break;
        case 'create-job':
          createJobFromPreset(el.getAttribute('data-preset-id'));
          break;
        case 'qty-dec':
          handleQtyChange(materialId, -1);
          break;
        case 'qty-inc':
          handleQtyChange(materialId, 1);
          break;
        case 'remove-material':
          if (!el.disabled) {
            ui.confirmRemoveMaterialId = materialId;
            renderConfirmModal();
          }
          break;
        case 'confirm-remove-cancel':
          ui.confirmRemoveMaterialId = null;
          renderConfirmModal();
          break;
        case 'confirm-remove-confirm': {
          const idToRemove = ui.confirmRemoveMaterialId;
          ui.confirmRemoveMaterialId = null;
          if (idToRemove) handleRemoveMaterial(idToRemove);
          break;
        }
        case 'cancel-job':
          ui.confirmCancelJobId = el.getAttribute('data-job-id');
          renderConfirmModal();
          break;
        case 'confirm-cancel-job-dismiss':
          ui.confirmCancelJobId = null;
          renderConfirmModal();
          break;
        case 'confirm-cancel-job-confirm': {
          const idToCancel = ui.confirmCancelJobId;
          ui.confirmCancelJobId = null;
          if (idToCancel) handleCancelJob(idToCancel);
          break;
        }
        case 'add-item-open': {
          ui.addItemOpen = true;
          ui.addItemQuery = '';
          ui.addItemHighlightIndex = 0;
          render();
          // Picker's whole point is fast keyboard entry — focus it
          // immediately instead of making the user click again.
          const searchInput = document.getElementById('add-item-search');
          if (searchInput) searchInput.focus();
          break;
        }
        case 'add-item-cancel':
          ui.addItemOpen = false;
          ui.addItemQuery = '';
          ui.addItemHighlightIndex = 0;
          render();
          break;
        case 'add-item-pick':
          handleAddItemPick(el.getAttribute('data-catalog-id'));
          break;
        case 'wholesaler-toggle':
          ui.openWholesalerFor = ui.openWholesalerFor === materialId ? null : materialId;
          render();
          break;
        case 'wholesaler-choose':
          handleWholesalerChoose(materialId, el.getAttribute('data-wholesaler-id'));
          break;
        case 'pay':
          if (!el.disabled) handlePay();
          break;
        case 'advance-status':
          if (!el.disabled) handleAdvance(el.getAttribute('data-next'), el.getAttribute('data-message'));
          break;
        case 'toggle-received':
          handleToggleReceived(el.getAttribute('data-material-id'));
          break;
        case 'select-trade': {
          const trade = el.getAttribute('data-trade');
          document.getElementById('login-trade').value = trade;
          document.querySelectorAll('#login-trade-group .trade-chip').forEach(function (chip) {
            chip.classList.toggle('selected', chip === el);
          });
          document.getElementById('login-trade-error').hidden = true;
          break;
        }
        case 'go-profile':
          state.viewingProfile = true;
          render();
          break;
        case 'edit-profile-details':
          ui.editingProfileDetails = true;
          renderProfile();
          break;
        case 'cancel-edit-details':
          ui.editingProfileDetails = false;
          renderProfile();
          break;
        case 'save-profile-details':
          handleSaveProfileDetails(
            document.getElementById('profile-name').value,
            document.getElementById('profile-business-name').value,
            document.getElementById('profile-trade-reg').value
          );
          break;
        case 'edit-rates':
          ui.editingRates = true;
          renderProfile();
          break;
        case 'done-edit-rates':
          ui.editingRates = false;
          renderProfile();
          break;
        case 'add-warehouse-item':
          handleAddWarehouseItem();
          break;
        case 'remove-warehouse-item':
          handleRemoveWarehouseItem(el.getAttribute('data-item-id'));
          break;
        case 'warehouse-pick-material': {
          const catalogId = el.getAttribute('data-catalog-id');
          const cat = MATERIAL_CATALOG[catalogId];
          if (cat) {
            ui.warehouseAddCatalogId = catalogId;
            ui.warehouseAddQuery = cat.name;
            ui.warehouseAddHighlightIndex = 0;
            document.getElementById('warehouse-add-error').hidden = true;
          }
          refreshWarehouseSection();
          const searchInput = document.getElementById('warehouse-search');
          if (searchInput) searchInput.focus();
          break;
        }
        case 'edit-invoice':
          ui.editingInvoice = true;
          render();
          break;
        case 'cancel-edit-invoice':
          ui.editingInvoice = false;
          render();
          break;
        case 'save-invoice-edit':
          handleSaveInvoiceEdit(
            document.getElementById('invoice-labour-input').value,
            document.getElementById('invoice-notes-input').value
          );
          break;
        case 'add-extra-charge':
          handleAddExtraCharge(
            document.getElementById('extra-charge-desc').value,
            document.getElementById('extra-charge-amount').value
          );
          break;
        case 'remove-extra-charge':
          handleRemoveExtraCharge(el.getAttribute('data-charge-id'));
          break;
        case 'mark-paid':
          handleMarkPaid(el.getAttribute('data-job-id'));
          break;
        case 'download-pdf':
          window.print();
          break;
        case 'use-example-name': {
          const input = document.getElementById('new-job-customer-name');
          if (input) {
            input.value = EXAMPLE_CUSTOMER_NAMES[Math.floor(Math.random() * EXAMPLE_CUSTOMER_NAMES.length)];
            document.getElementById('new-job-customer-name-error').hidden = true;
          }
          break;
        }
        case 'use-example-address': {
          const line1Input = document.getElementById('new-job-address-line1');
          if (line1Input) {
            const pick = EXAMPLE_ADDRESSES[Math.floor(Math.random() * EXAMPLE_ADDRESSES.length)];
            line1Input.value = pick.line1;
            document.getElementById('new-job-address-line2').value = pick.line2;
            document.getElementById('new-job-address-county').value = pick.county;
            document.getElementById('new-job-address-eircode').value = pick.eircode;
            document.getElementById('new-job-address-country').value = pick.country;
            document.getElementById('new-job-customer-address-error').hidden = true;
          }
          break;
        }
        case 'use-example-business-address': {
          const line1Input = document.getElementById('login-address-line1');
          if (line1Input) {
            const pick = EXAMPLE_BUSINESS_ADDRESSES[Math.floor(Math.random() * EXAMPLE_BUSINESS_ADDRESSES.length)];
            line1Input.value = pick.line1;
            document.getElementById('login-address-line2').value = pick.line2;
            document.getElementById('login-address-county').value = pick.county;
            document.getElementById('login-address-eircode').value = pick.eircode;
            document.getElementById('login-address-country').value = pick.country;
            document.getElementById('login-address-error').hidden = true;
          }
          break;
        }
        case 'go-new-job':
          state.startingNewJob = true;
          render();
          break;
        case 'leave-new-job':
          state.startingNewJob = false;
          render();
          break;
        case 'show-estimate':
          ui.viewingEstimate = true;
          render();
          break;
        case 'hide-estimate':
          ui.viewingEstimate = false;
          render();
          break;
        case 'leave-profile':
          state.viewingProfile = false;
          ui.editingProfileDetails = false;
          ui.editingRates = false;
          ui.warehouseAddQuery = '';
          ui.warehouseAddCatalogId = null;
          ui.warehouseAddHighlightIndex = 0;
          render();
          break;
        default:
          break;
      }
    });

    document.body.addEventListener('change', function (e) {
      if (e.target && e.target.classList.contains('qty-input')) {
        handleQtyChange(e.target.getAttribute('data-material-id'), 0, e.target.value);
      }
      if (e.target && e.target.id === 'invoice-materials-toggle') {
        handleInvoiceToggle(e.target.checked);
      }
      if (e.target && e.target.id === 'profile-rate-hour') {
        handleProfileRateChange('labourRatePerHour', e.target.value);
      }
      if (e.target && e.target.id === 'profile-rate-job') {
        handleProfileRateChange('labourRatePerJob', e.target.value);
      }
    });

    document.body.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'add-item-search') {
        ui.addItemQuery = e.target.value;
        ui.addItemHighlightIndex = 0;
        // Transient UI-only state — not persisted — so just refresh the
        // body (not a full render()) and restore focus/cursor so typing
        // isn't interrupted on every keystroke.
        const prevScrollTop = (document.querySelector('.material-results') || {}).scrollTop;
        refreshJobDetailBody();
        const input = document.getElementById('add-item-search');
        if (input) {
          input.focus();
          const pos = input.value.length;
          try {
            input.setSelectionRange(pos, pos);
          } catch (err) {
            // Some input types don't support selection ranges — harmless.
          }
        }
        const resultsList = document.querySelector('.material-results');
        if (resultsList && prevScrollTop !== undefined) resultsList.scrollTop = prevScrollTop;
      }
      if (e.target && e.target.id === 'warehouse-search') {
        ui.warehouseAddQuery = e.target.value;
        ui.warehouseAddHighlightIndex = 0;
        ui.warehouseAddCatalogId = null; // typing again re-opens the search, discarding any prior pick
        refreshWarehouseSection();
        const input = document.getElementById('warehouse-search');
        if (input) {
          input.focus();
          const pos = input.value.length;
          try {
            input.setSelectionRange(pos, pos);
          } catch (err) {
            // Some input types don't support selection ranges — harmless.
          }
        }
      }
    });

    document.body.addEventListener('keydown', function (e) {
      if (!e.target || e.target.id !== 'add-item-search') return;
      const job = findJob(state.currentJobId);
      if (!job) return;
      const query = (ui.addItemQuery || '').trim().toLowerCase();
      const matchIds = filteredMaterialResultIds(job, query);
      if (!matchIds.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        ui.addItemHighlightIndex = Math.min((ui.addItemHighlightIndex || 0) + 1, matchIds.length - 1);
        // refreshJobDetailBody() rebuilds this input's DOM node, so the
        // pre-render `e.target` reference is detached afterward — re-query.
        refreshJobDetailBody();
        const afterDown = document.getElementById('add-item-search');
        if (afterDown) afterDown.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        ui.addItemHighlightIndex = Math.max((ui.addItemHighlightIndex || 0) - 1, 0);
        refreshJobDetailBody();
        const afterUp = document.getElementById('add-item-search');
        if (afterUp) afterUp.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pickIndex = Math.min(ui.addItemHighlightIndex || 0, matchIds.length - 1);
        handleAddItemPick(matchIds[pickIndex]);
      }
    });

    document.body.addEventListener('keydown', function (e) {
      if (!e.target || e.target.id !== 'warehouse-search') return;
      const query = (ui.warehouseAddQuery || '').trim().toLowerCase();
      const matchIds = ui.warehouseAddCatalogId ? [] : filteredWarehouseResultIds(query);
      if (!matchIds.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        ui.warehouseAddHighlightIndex = Math.min((ui.warehouseAddHighlightIndex || 0) + 1, matchIds.length - 1);
        refreshWarehouseSection();
        const afterDown = document.getElementById('warehouse-search');
        if (afterDown) afterDown.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        ui.warehouseAddHighlightIndex = Math.max((ui.warehouseAddHighlightIndex || 0) - 1, 0);
        refreshWarehouseSection();
        const afterUp = document.getElementById('warehouse-search');
        if (afterUp) afterUp.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pickIndex = Math.min(ui.warehouseAddHighlightIndex || 0, matchIds.length - 1);
        const catalogId = matchIds[pickIndex];
        const cat = MATERIAL_CATALOG[catalogId];
        if (cat) {
          ui.warehouseAddCatalogId = catalogId;
          ui.warehouseAddQuery = cat.name;
          ui.warehouseAddHighlightIndex = 0;
        }
        refreshWarehouseSection();
        const afterEnter = document.getElementById('warehouse-search');
        if (afterEnter) afterEnter.focus();
      }
    });

    // Dismiss the confirm popup on Escape or a click on the dimmed
    // backdrop, in addition to its explicit Cancel button.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.confirmRemoveMaterialId) {
        ui.confirmRemoveMaterialId = null;
        renderConfirmModal();
      }
    });
    const confirmOverlay = document.getElementById('confirm-modal');
    if (confirmOverlay) {
      confirmOverlay.addEventListener('click', function (e) {
        if (e.target === confirmOverlay) {
          ui.confirmRemoveMaterialId = null;
          renderConfirmModal();
        }
      });
    }

    initThemePreviewSwitcher();
    render();
  }

  // Dev-only color-scheme preview — only appears with ?preview-themes=1
  // in the URL, never in normal use or the promoted/deployed build.
  // Toggles a class on <body> matching the `body.theme-*` overrides in
  // styles.css (accent trio only). Pick a scheme, then either fold its
  // values into :root in styles.css and delete this + the CSS block, or
  // leave both in place for further comparison later.
  function initThemePreviewSwitcher() {
    if (!/[?&]preview-themes=1\b/.test(location.search)) return;

    const schemes = [
      { id: '', label: 'Teal (current)' },
      { id: 'theme-blue', label: 'Construction Blue' },
      { id: 'theme-indigo', label: 'Deep Indigo' },
      { id: 'theme-rust', label: 'Rust' },
    ];

    const bar = document.createElement('div');
    bar.style.cssText =
      'position:fixed;bottom:12px;right:12px;z-index:9999;display:flex;gap:6px;' +
      'background:#111827;padding:8px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.3);';

    schemes.forEach(function (scheme) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = scheme.label;
      btn.style.cssText =
        'font-size:11px;font-weight:600;padding:6px 10px;border-radius:6px;border:none;' +
        'cursor:pointer;background:#374151;color:#fff;';
      btn.addEventListener('click', function () {
        document.body.className = scheme.id;
      });
      bar.appendChild(btn);
    });

    document.body.appendChild(bar);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
