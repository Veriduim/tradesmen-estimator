/**
 * Render functions, event wiring, and business logic for the job-flow
 * prototype. Pure client-side, no network calls. All state lives in
 * `state` (see state.js) for the current visit only — nothing persists
 * across a page load.
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
    ['screen-login', 'screen-job-picker', 'screen-job-detail', 'screen-profile'].forEach(function (sid) {
      document.getElementById(sid).hidden = sid !== id;
    });
  }

  // Shows/hides the "remove this material?" confirm popup based on
  // ui.confirmRemoveMaterialId. The material may have vanished (e.g. the
  // job changed underneath it) — treat that as "nothing to confirm".
  // Also handles the popup's focus: moves focus in on open, restores it
  // to whatever triggered the popup on close, and makes the rest of the
  // page inert while it's open so keyboard/screen-reader users can't
  // reach content behind the dialog.
  function renderConfirmModal() {
    const overlay = document.getElementById('confirm-modal');
    if (!overlay) return;

    const materialId = ui.confirmRemoveMaterialId;
    const job = materialId ? findJob(state.currentJobId) : null;
    const material = job
      ? job.materials.find(function (m) {
          return m.id === materialId;
        })
      : null;

    const main = document.getElementById('main');
    const header = document.getElementById('app-header');

    if (!material) {
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

    document.getElementById('confirm-modal-body').textContent =
      'Remove "' + material.name + '" from this job? This can’t be undone.';
    overlay.hidden = false;
    if (main) main.inert = true;
    if (header) header.inert = true;

    if (!confirmModalWasOpen) {
      confirmModalTrigger = document.activeElement;
      const cancelBtn = document.getElementById('confirm-modal-cancel');
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
    const metaRight =
      job.status === 'invoice'
        ? formatEUR(invoiceTotal(job)) + ' due'
        : job.materials.length + ' item' + (job.materials.length === 1 ? '' : 's');
    const isCompleted = job.status === 'invoice';
    // The Completed section groups by the terminal `invoice` status, but
    // its own stage label ("Invoice") doesn't read as "done" on its own —
    // give it distinct badge copy so the section heading and card badge
    // use consistent completed/active vocabulary.
    const badgeLabel = isCompleted ? 'Invoiced' : STATUS_LABELS[job.status] || 'Unknown';
    return (
      '<button type="button" class="job-card" data-action="open-job" data-job-id="' +
      job.id +
      '">' +
      '<div class="job-card-top">' +
      '<div class="job-addr">' +
      escapeHtml(job.address) +
      '</div>' +
      '<span class="status-badge' +
      (isCompleted ? ' status-badge-done' : ' status-badge-active') +
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
    const presetsWrap = document.getElementById('job-presets');

    const jobs = state.jobs.slice().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    const activeJobs = jobs.filter(function (j) {
      return j.status !== 'invoice';
    });
    const completedJobs = jobs.filter(function (j) {
      return j.status === 'invoice';
    });

    // Reflects the Active/Completed split below rather than one combined
    // "open jobs" count, which reads as wrong once any job is completed.
    if (!jobs.length) {
      countSub.textContent = 'No jobs yet — pick a job type below to start one';
    } else if (completedJobs.length) {
      countSub.textContent =
        activeJobs.length + ' active · ' + completedJobs.length + ' completed';
    } else {
      countSub.textContent = activeJobs.length + ' open job' + (activeJobs.length === 1 ? '' : 's');
    }

    jobsWrap.innerHTML = jobSectionHTML('Active', activeJobs) + jobSectionHTML('Completed', completedJobs);

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

  function renderProfile() {
    const body = document.getElementById('profile-body');
    const profile = state.profile;
    body.innerHTML =
      '<label class="field">' +
      '<span class="field-label">Rate per hour (EUR)</span>' +
      '<input type="number" id="profile-rate-hour" min="0" step="0.01" placeholder="e.g. 45.00" value="' +
      (profile.labourRatePerHour === null ? '' : profile.labourRatePerHour) +
      '" /></label>' +
      '<label class="field">' +
      '<span class="field-label">Rate per job (EUR)</span>' +
      '<input type="number" id="profile-rate-job" min="0" step="0.01" placeholder="e.g. 350.00" value="' +
      (profile.labourRatePerJob === null ? '' : profile.labourRatePerJob) +
      '" /></label>';
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

  function renderJobDetail(job) {
    document.getElementById('job-detail-title').textContent = job.jobTypeLabel;
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
      '</div>'
    );
  }

  // Catalog ids not yet on this job, matching the query (case-insensitive
  // substring), name-starts-with matches sorted first. Shared by the
  // rendered picker and the keyboard-nav handler so both agree on order.
  function filteredMaterialResultIds(job, query) {
    const alreadyAddedCatalogIds = {};
    job.materials.forEach(function (m) {
      if (m.catalogId) alreadyAddedCatalogIds[m.catalogId] = true;
    });

    const ids = Object.keys(MATERIAL_CATALOG).filter(function (id) {
      if (alreadyAddedCatalogIds[id]) return false;
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

  // Search-as-you-type picker restricted to MATERIAL_CATALOG — the only
  // way to add a material, so every addable item still carries real
  // per-wholesaler pricing. No freeform name/price entry.
  function addItemFormHTML(job) {
    const query = (ui.addItemQuery || '').trim().toLowerCase();
    const matchIds = filteredMaterialResultIds(job, query);
    const highlightIndex = Math.min(ui.addItemHighlightIndex || 0, Math.max(matchIds.length - 1, 0));

    let resultsHTML;
    if (matchIds.length) {
      resultsHTML =
        '<div class="material-results" aria-live="polite">' +
        matchIds
          .map(function (id, i) {
            const cat = MATERIAL_CATALOG[id];
            const cheapest = cheapestOption(cat);
            return (
              '<button type="button" class="material-result' +
              (i === highlightIndex ? ' highlighted' : '') +
              '" data-action="add-item-pick" data-catalog-id="' +
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
        '</div>';
    } else if (query) {
      resultsHTML =
        '<p class="material-results-empty" aria-live="polite">No materials match "' +
        escapeHtml(ui.addItemQuery.trim()) +
        '".</p>';
    } else {
      resultsHTML = '<p class="material-results-empty" aria-live="polite">All materials already added.</p>';
    }

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

  // Pre-order customer estimate, shown from the Materials Needed stage
  // before any wholesaler is chosen or paid. Deliberately a separate
  // function from invoiceHTML rather than a shared one with branches:
  // it prices materials at cheapest-available (estimateLineTotal, not
  // chosenOption-based materialsCostFinal) and pulls labour from the
  // tradesperson's profile rather than invoiceBreakdown's job.labourCost
  // — different inputs and no materials-toggle, so keeping it separate
  // matches the existing estimateJobTotal/materialsCostFinal split.
  function estimateInvoiceHTML(job) {
    const labourCost =
      state.profile.labourRatePerJob !== null ? state.profile.labourRatePerJob : job.labourCost;
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
      escapeHtml(job.address) +
      '</div>' +
      '<div class="invoice-job-sub">' +
      escapeHtml(job.jobTypeLabel) +
      ' · ' +
      escapeHtml(job.propertySize) +
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
    });

    ui.addItemOpen = false;
    ui.addItemQuery = '';
    ui.addItemHighlightIndex = 0;
    touchJob(job);
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

  function handleLogin(name, email, businessName, tradeRegNumber, attested) {
    const nameError = document.getElementById('login-name-error');
    const businessNameError = document.getElementById('login-business-name-error');
    const tradeRegError = document.getElementById('login-trade-reg-error');
    const attestError = document.getElementById('login-attest-error');

    const trimmedName = (name || '').trim();
    const trimmedBusinessName = (businessName || '').trim();
    const trimmedTradeReg = (tradeRegNumber || '').trim();

    // Clear all errors up front so a stale error from a previous submit
    // (for a field the user already fixed) can't survive an early return
    // triggered by a different, earlier field failing this time.
    nameError.hidden = true;
    businessNameError.hidden = true;
    tradeRegError.hidden = true;
    attestError.hidden = true;

    if (!trimmedName) {
      nameError.hidden = false;
      document.getElementById('login-name').focus();
      return;
    }
    nameError.hidden = true;

    if (!trimmedBusinessName) {
      businessNameError.hidden = false;
      document.getElementById('login-business-name').focus();
      return;
    }
    businessNameError.hidden = true;

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
      email: (email || '').trim(),
      businessName: trimmedBusinessName,
      tradeRegNumber: trimmedTradeReg,
      loginAt: Date.now(),
    };
    state.currentJobId = null;
    render();
  }

  function handleLogout() {
    state.session = null;
    state.currentJobId = null;
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
        document.getElementById('login-email').value,
        document.getElementById('login-business-name').value,
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
          ui.openWholesalerFor = null;
          ui.addItemOpen = false;
          ui.addItemQuery = '';
          ui.addItemHighlightIndex = 0;
          ui.qtyNotice = null;
          ui.viewingEstimate = false;
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
          handleAdvance(el.getAttribute('data-next'), el.getAttribute('data-message'));
          break;
        case 'go-profile':
          state.viewingProfile = true;
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

    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
