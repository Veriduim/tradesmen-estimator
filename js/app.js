/**
 * Render functions, event wiring, and business logic for the job-flow
 * prototype. Pure client-side, no network calls. All persistent state
 * lives in `state` (see state.js) and is saved after every mutation.
 */

(function () {
  'use strict';

  const STATUS_LABELS = {
    'job-details': 'Job Details',
    'materials-needed': 'Materials Needed',
    'wholesaler-selected': 'Wholesaler Selected',
    'materials-delivered': 'Materials Delivered',
    'job-started': 'Job Started',
    'job-completed': 'Job Completed',
    invoice: 'Invoice',
  };

  const VAT_RATE = 0.135;

  let state = load();

  // Transient, non-persisted UI state — resets on reload, which is fine
  // since only job/session data needs to survive a reload.
  const ui = {
    openWholesalerFor: null,
    addItemOpen: false,
    removeBlockedFor: null,
    payBlocked: false,
    qtyNotice: null, // inline feedback when a quantity edit gets clamped to MAX_QTY
  };

  let toastTimer = null;

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

  function persist() {
    save(state);
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
    const header = document.getElementById('app-header');
    const headerUser = document.getElementById('app-header-user');

    if (!state.session) {
      header.hidden = true;
      showScreen('screen-login');
      return;
    }

    header.hidden = false;
    headerUser.textContent = state.session.name;

    const job = state.currentJobId ? findJob(state.currentJobId) : null;
    if (state.currentJobId && !job) {
      // Stale reference (e.g. corrupted/edited storage) — fall back safely.
      state.currentJobId = null;
      persist();
    }

    if (job) {
      showScreen('screen-job-detail');
      renderJobDetail(job);
    } else {
      showScreen('screen-job-picker');
      renderJobPicker();
    }
  }

  function showScreen(id) {
    ['screen-login', 'screen-job-picker', 'screen-job-detail'].forEach(function (sid) {
      document.getElementById(sid).hidden = sid !== id;
    });
  }

  // ---------------------------------------------------------------------
  // Job picker screen
  // ---------------------------------------------------------------------

  function renderJobPicker() {
    const jobsWrap = document.getElementById('existing-jobs');
    const countSub = document.getElementById('job-count-sub');
    const presetsWrap = document.getElementById('job-presets');

    const jobs = state.jobs.slice().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    countSub.textContent = jobs.length
      ? jobs.length + ' open job' + (jobs.length === 1 ? '' : 's')
      : 'No jobs yet — pick a job type below to start one';

    jobsWrap.innerHTML = jobs
      .map(function (job) {
        const metaRight =
          job.status === 'invoice'
            ? formatEUR(invoiceTotal(job)) + ' due'
            : job.materials.length + ' item' + (job.materials.length === 1 ? '' : 's');
        return (
          '<button type="button" class="job-card" data-action="open-job" data-job-id="' +
          job.id +
          '">' +
          '<div class="job-addr">' +
          escapeHtml(job.address) +
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
      })
      .join('');

    presetsWrap.innerHTML = JOB_PRESETS.map(function (preset) {
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
    }).join('');
  }

  function createJobFromPreset(presetId) {
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
      };
    });

    const now = Date.now();
    const job = {
      id: generateId('job'),
      jobType: preset.id,
      jobTypeLabel: preset.label,
      address: preset.address,
      propertySize: preset.propertySize,
      labourCost: preset.labourCost,
      materials: materials,
      status: 'materials-needed',
      wholesalerChoices: {},
      invoiceIncludesMaterials: true,
      createdAt: now,
      updatedAt: now,
    };

    state.jobs.push(job);
    state.currentJobId = job.id;
    persist();
    ui.addItemOpen = false;
    ui.openWholesalerFor = null;
    ui.qtyNotice = null;
    render();
  }

  // ---------------------------------------------------------------------
  // Job detail screen — shell
  // ---------------------------------------------------------------------

  function renderJobDetail(job) {
    document.getElementById('job-detail-title').textContent = job.jobTypeLabel;
    document.getElementById('job-detail-sub').textContent = job.address + ' · ' + job.propertySize;
    document.getElementById('job-stepper').innerHTML = stepperHTML(job.status);
    document.getElementById('job-stage-caption').textContent = stageCaption(job.status);

    const body = document.getElementById('job-detail-body');
    switch (job.status) {
      case 'materials-needed':
        body.innerHTML = materialsNeededHTML(job);
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
          '<div class="checkbox"></div>' +
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
          '<div>' +
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
          (canRemove
            ? '<button type="button" class="mat-remove" data-action="remove-material" data-material-id="' +
              m.id +
              '">Remove</button>'
            : '<button type="button" class="mat-remove" data-action="remove-material" data-material-id="' +
              m.id +
              '" disabled title="A job needs at least one material">Remove</button>')
          +
          '</div>' +
          '</div>' +
          materialWholesalerBlockHTML(job, m) +
          '</div>'
        );
      })
      .join('');

    const addBlock = ui.addItemOpen
      ? addItemFormHTML()
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
      '<button type="button" class="btn btn-primary btn-block" data-action="pay"' +
      (canPay ? '' : ' disabled') +
      '>Pay ' +
      formatEUR(estimateJobTotal(job)) +
      '</button>' +
      payNote +
      '</div>'
    );
  }

  function addItemFormHTML() {
    return (
      '<div class="add-item-form">' +
      '<label class="field"><span class="field-label">Material name</span>' +
      '<input type="text" id="add-item-name" placeholder="e.g. Junction box"></label>' +
      '<div class="add-item-form-row">' +
      '<label class="field"><span class="field-label">Unit</span>' +
      '<input type="text" id="add-item-unit" placeholder="each"></label>' +
      '<label class="field"><span class="field-label">Qty</span>' +
      '<input type="text" inputmode="numeric" id="add-item-qty" placeholder="1"></label>' +
      '</div>' +
      '<label class="field"><span class="field-label">Est. price per unit (€)</span>' +
      '<input type="text" inputmode="decimal" id="add-item-price" placeholder="0.00"></label>' +
      '<p class="inline-error" id="add-item-error" hidden></p>' +
      '<div class="add-item-form-actions">' +
      '<button type="button" class="btn btn-secondary" data-action="add-item-cancel">Cancel</button>' +
      '<button type="button" class="btn btn-primary" data-action="add-item-submit">Add</button>' +
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
        return (
          '<div class="mat-row">' +
          '<div class="mat-top">' +
          '<div class="mat-left">' +
          '<div class="checkbox"></div>' +
          '<div>' +
          '<div class="mat-name">' +
          escapeHtml(m.name) +
          '</div>' +
          '<div class="mat-unit">' +
          m.qty +
          ' ' +
          escapeHtml(m.unit) +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div class="wholesaler-option-price">' +
          formatEUR(m.qty * (opt ? opt.unitPrice : 0)) +
          '</div>' +
          '</div>' +
          '<div class="wholesaler-row">' +
          '<div class="chip ok"><span class="dot"></span>' +
          (opt ? escapeHtml(WHOLESALERS[opt.wholesalerId].name) : 'Unknown') +
          '</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

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
      '. Materials are on order.</div>' +
      '</div>' +
      '<div class="mat-list">' +
      rows +
      '</div>' +
      '<div class="action-bar">' +
      '<button type="button" class="btn btn-primary btn-block" data-action="advance-status" data-next="materials-delivered" data-message="Marked as delivered.">Mark Delivered</button>' +
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
    const subtotal = job.labourCost + (includeMaterials ? materialsCost : 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    return { materialsCost: materialsCost, includeMaterials: includeMaterials, subtotal: subtotal, vat: vat, total: total };
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

    return (
      '<div class="invoice-card">' +
      '<div class="invoice-header">' +
      '<div>' +
      '<div class="invoice-job">' +
      escapeHtml(job.address) +
      '</div>' +
      '<div class="invoice-job-sub">' +
      escapeHtml(job.jobTypeLabel) +
      ' · ' +
      escapeHtml(job.propertySize) +
      '</div>' +
      '</div>' +
      '<span class="invoice-badge">Ready</span>' +
      '</div>' +
      '<div class="invoice-meta-row">' +
      '<span>Invoice ' +
      escapeHtml(invoiceNumberFor(job)) +
      '</span>' +
      '<span>Issued ' +
      escapeHtml(invoiceDateFmt.format(new Date())) +
      '</span>' +
      '</div>' +
      '<div class="toggle-row">' +
      '<div>' +
      '<div class="toggle-label">Include materials cost</div>' +
      '<div class="toggle-sub">Off = labour-only invoice</div>' +
      '</div>' +
      '<label class="switch">' +
      '<input type="checkbox" id="invoice-materials-toggle"' +
      (includeMaterials ? ' checked' : '') +
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
      '<div class="invoice-footer">VAT registration ' +
      escapeHtml(TRADESPERSON_VAT_NUMBER) +
      '</div>' +
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
    persist();
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
    job.materials = job.materials.filter(function (m) {
      return m.id !== materialId;
    });
    delete job.wholesalerChoices[materialId];
    ui.removeBlockedFor = null;
    touchJob(job);
    persist();
    render();
  }

  // Custom (user-typed) materials don't come from the catalog, so they
  // have no natural per-wholesaler pricing — but making the mandatory
  // wholesaler choice meaningful means the 3 options can't be identical.
  // Apply the same kind of deterministic price/stock/distance spread the
  // catalog uses, keyed off the entered base price.
  const CUSTOM_MATERIAL_WHOLESALER_VARIATION = [
    { wholesalerId: 'chadwicks', priceFactor: 1.0, stock: 'in-stock', distanceKm: 4.2 },
    { wholesalerId: 'rexel', priceFactor: 0.93, stock: 'lead-time', leadDays: 2, distanceKm: 6.8 },
    { wholesalerId: 'cef', priceFactor: 1.07, stock: 'in-stock', distanceKm: 9.1 },
  ];

  function buildCustomMaterialOptions(basePrice) {
    return CUSTOM_MATERIAL_WHOLESALER_VARIATION.map(function (v) {
      const opt = {
        wholesalerId: v.wholesalerId,
        unitPrice: Math.round(basePrice * v.priceFactor * 100) / 100,
        stock: v.stock,
        distanceKm: v.distanceKm,
      };
      if (v.stock === 'lead-time') opt.leadDays = v.leadDays;
      return opt;
    });
  }

  function handleAddItemSubmit() {
    const job = findJob(state.currentJobId);
    if (!job) return;
    const nameEl = document.getElementById('add-item-name');
    const unitEl = document.getElementById('add-item-unit');
    const qtyEl = document.getElementById('add-item-qty');
    const priceEl = document.getElementById('add-item-price');
    const errorEl = document.getElementById('add-item-error');

    function showFormError(msg) {
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
      }
    }

    const name = (nameEl.value || '').trim();
    if (!name) {
      showFormError('Enter a material name to add it.');
      nameEl.focus();
      return;
    }

    const unit = (unitEl.value || '').trim() || 'each';

    let qty = parseInt(qtyEl.value, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    let qtyClamped = false;
    if (qty > MAX_QTY) {
      qty = MAX_QTY;
      qtyClamped = true;
    }

    let price = parseFloat(priceEl.value);
    if (!Number.isFinite(price) || price < 0) price = 0;
    let priceClamped = false;
    if (price > MAX_UNIT_PRICE) {
      price = MAX_UNIT_PRICE;
      priceClamped = true;
    }

    if (qtyClamped || priceClamped) {
      // Correct the fields in place and ask the user to confirm rather
      // than silently accepting an absurd total — mirrors the Remove/Pay
      // block-with-inline-message pattern used elsewhere in the app.
      qtyEl.value = String(qty);
      priceEl.value = String(price);
      const parts = [];
      if (qtyClamped) parts.push('quantity to ' + qty.toLocaleString());
      if (priceClamped) parts.push('price to ' + formatEUR(price));
      showFormError('Capped ' + parts.join(' and ') + '. Review and tap Add again.');
      return;
    }

    if (errorEl) errorEl.hidden = true;

    const options = buildCustomMaterialOptions(price);

    job.materials.push({
      id: generateId('mat'),
      catalogId: null,
      name: name,
      unit: unit,
      qty: qty,
      options: options,
    });

    ui.addItemOpen = false;
    touchJob(job);
    persist();
    render();
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
    touchJob(job);
    persist();
    render();
    showToast('Payment confirmed — ' + formatEUR(total) + ' charged (mock).', true);
  }

  function handleAdvance(next, message) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    if (STATUS_ORDER.indexOf(next) === -1) return;
    job.status = next;
    touchJob(job);
    persist();
    render();
    if (message) showToast(message, true);
  }

  function handleWholesalerChoose(materialId, wholesalerId) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    job.wholesalerChoices[materialId] = wholesalerId;
    ui.openWholesalerFor = null;
    touchJob(job);
    persist();
    render();
  }

  function handleInvoiceToggle(checked) {
    const job = findJob(state.currentJobId);
    if (!job) return;
    job.invoiceIncludesMaterials = checked;
    touchJob(job);
    persist();
    render();
  }

  function handleLogin(name, email) {
    const nameError = document.getElementById('login-name-error');
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      nameError.hidden = false;
      document.getElementById('login-name').focus();
      return;
    }
    nameError.hidden = true;
    state.session = { name: trimmedName, email: (email || '').trim(), loginAt: Date.now() };
    state.currentJobId = null;
    persist();
    render();
  }

  function handleLogout() {
    state.session = null;
    state.currentJobId = null;
    persist();
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
        document.getElementById('login-email').value
      );
    });

    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-back-to-jobs').addEventListener('click', function () {
      state.currentJobId = null;
      ui.openWholesalerFor = null;
      ui.addItemOpen = false;
      ui.qtyNotice = null;
      persist();
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
          ui.openWholesalerFor = null;
          ui.addItemOpen = false;
          ui.qtyNotice = null;
          persist();
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
          if (!el.disabled) handleRemoveMaterial(materialId);
          break;
        case 'add-item-open':
          ui.addItemOpen = true;
          render();
          break;
        case 'add-item-cancel':
          ui.addItemOpen = false;
          render();
          break;
        case 'add-item-submit':
          handleAddItemSubmit();
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
          handleAdvance(el.getAttribute('data-next'), el.getAttribute('data-message'));
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
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
