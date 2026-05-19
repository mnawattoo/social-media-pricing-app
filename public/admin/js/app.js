/**
 * Antigravity Social Media Pricing App - Admin Dashboard Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Active state repositories
  let plans = [];
  let addons = [];
  let leads = [];
  let settings = {};

  // Form list builder temporary buffers
  let tempOutputs = [];
  let tempServices = [];

  // DOM Elements
  const authOverlay = document.getElementById('auth-overlay');
  const authForm = document.getElementById('auth-form');
  const authPasswordInput = document.getElementById('auth-password');
  const authErrorMsg = document.getElementById('auth-error-msg');
  const logoutBtn = document.getElementById('logout-btn');

  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  const viewPanels = document.querySelectorAll('.view-panel');
  const viewTitle = document.getElementById('view-title');

  // Stats Counters
  const statTotalLeads = document.getElementById('stat-total-leads');
  const statAvgValue = document.getElementById('stat-avg-value');
  const statActivePlans = document.getElementById('stat-active-plans');
  const statActiveAddons = document.getElementById('stat-active-addons');

  // Overview info quick view
  const quickAgencyName = document.getElementById('quick-agency-name');
  const quickContactEmail = document.getElementById('quick-contact-email');
  const quickCurrency = document.getElementById('quick-currency');
  const quickFeaturedLabel = document.getElementById('quick-featured-label');
  const quickViewLeadsBtn = document.getElementById('quick-view-leads-btn');
  const quickEditSettingsBtn = document.getElementById('quick-edit-settings-btn');

  // Tables Tbody
  const overviewLeadsTbody = document.getElementById('overview-leads-tbody');
  const plansTbody = document.getElementById('plans-tbody');
  const addonsTbody = document.getElementById('addons-tbody');
  const leadsFeedTbody = document.getElementById('leads-feed-tbody');

  // Settings
  const settingsForm = document.getElementById('settings-form');
  const settingAgency = document.getElementById('setting-agency');
  const settingCurrency = document.getElementById('setting-currency');
  const settingEmail = document.getElementById('setting-email');
  const settingPhone = document.getElementById('setting-phone');
  const settingFeaturedLabel = document.getElementById('setting-featured-label');
  const settingNewPassword = document.getElementById('setting-new-password');

  // Plan Modals
  const planModal = document.getElementById('plan-modal');
  const addPlanBtn = document.getElementById('add-plan-btn');
  const planModalClose = document.getElementById('plan-modal-close');
  const planForm = document.getElementById('plan-form');
  const planFormTitle = document.getElementById('plan-modal-title');
  const planFormId = document.getElementById('plan-form-id');
  const planFormName = document.getElementById('plan-form-name');
  const planFormPrice = document.getElementById('plan-form-price');
  const planFormDescription = document.getElementById('plan-form-description');
  const planFormPlatforms = document.getElementById('plan-form-platforms');
  const planFormVa = document.getElementById('plan-form-va');
  const planFormCta = document.getElementById('plan-form-cta');
  const planFormActive = document.getElementById('plan-form-active');
  const planFormFeatured = document.getElementById('plan-form-featured');
  const planFormSubmitBtn = document.getElementById('plan-form-submit-btn');

  // Plan List Builder DOMs
  const newOutputInput = document.getElementById('new-output-input');
  const addOutputListBtn = document.getElementById('add-output-list-btn');
  const outputsBuilderItems = document.getElementById('outputs-builder-items');

  const newServiceInput = document.getElementById('new-service-input');
  const addServiceListBtn = document.getElementById('add-service-list-btn');
  const servicesBuilderItems = document.getElementById('services-builder-items');

  // Add-on Modals
  const addonModal = document.getElementById('addon-modal');
  const addAddonBtn = document.getElementById('add-addon-btn');
  const addonModalClose = document.getElementById('addon-modal-close');
  const addonForm = document.getElementById('addon-form');
  const addonFormTitle = document.getElementById('addon-modal-title');
  const addonFormId = document.getElementById('addon-form-id');
  const addonFormName = document.getElementById('addon-form-name');
  const addonFormDescription = document.getElementById('addon-form-description');
  const addonFormPrice = document.getElementById('addon-form-price');
  const addonFormType = document.getElementById('addon-form-type');
  const addonFormActive = document.getElementById('addon-form-active');
  const addonFormSubmitBtn = document.getElementById('addon-form-submit-btn');

  // Leads export
  const downloadLeadsCsv = document.getElementById('download-leads-csv');

  // Core Request Helper with session token headers
  function getHeaders() {
    const token = localStorage.getItem('social_admin_token') || '';
    return {
      'Content-Type': 'application/json',
      'X-Admin-Token': token
    };
  }

  // Authentication State Checks
  async function checkAuth() {
    const token = localStorage.getItem('social_admin_token');
    if (!token) {
      showLoginScreen();
      return;
    }

    try {
      const res = await fetch('/api/auth/session', { headers: getHeaders() });
      const session = await res.json();
      
      if (session.authenticated) {
        hideLoginScreen();
        loadAllData();
      } else {
        showLoginScreen();
      }
    } catch (err) {
      console.error('Session validation query error:', err);
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    authOverlay.classList.remove('hidden');
    authPasswordInput.focus();
  }

  function hideLoginScreen() {
    authOverlay.classList.add('hidden');
    authPasswordInput.value = '';
    authErrorMsg.style.display = 'none';
  }

  // Authentication submit handler
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = authPasswordInput.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });

      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('social_admin_token', data.token);
        hideLoginScreen();
        loadAllData();
      } else {
        authErrorMsg.textContent = data.error || 'Invalid credentials.';
        authErrorMsg.style.display = 'block';
        authPasswordInput.focus();
      }
    } catch (err) {
      console.error('Authentication attempt network error:', err);
      authErrorMsg.textContent = 'Server connection failed.';
      authErrorMsg.style.display = 'block';
    }
  });

  // Logout handler
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      localStorage.removeItem('social_admin_token');
      showLoginScreen();
    }
  });

  // Tab Sidebar Navigation
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      const targetView = link.dataset.view;

      // Active class toggling on links
      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Toggling view panels
      viewPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `view-${targetView}`) {
          panel.classList.add('active');
        }
      });

      // Update Toolbar Header Name
      viewTitle.textContent = link.textContent.trim();
    });
  });

  // Global Data Fetch Loader
  async function loadAllData() {
    try {
      const [plansRes, addonsRes, leadsRes, settingsRes] = await Promise.all([
        fetch('/api/plans', { headers: getHeaders() }).then(r => r.json()),
        fetch('/api/addons', { headers: getHeaders() }).then(r => r.json()),
        fetch('/api/leads', { headers: getHeaders() }).then(r => r.json()),
        fetch('/api/settings', { headers: getHeaders() }).then(r => r.json())
      ]);

      plans = plansRes;
      addons = addonsRes;
      leads = leadsRes;
      settings = settingsRes;

      // Hydrate views
      renderOverviewTab();
      renderPlansTab();
      renderAddonsTab();
      renderLeadsTab();
      hydrateSettingsForm();

    } catch (err) {
      console.error('Fatal data fetching sync failed:', err);
      alert('Error fetching backend databases. Please verify that server.rb is running.');
    }
  }

  // View 1: Overview Panel Hydration
  function renderOverviewTab() {
    const currency = settings.currency || '$';
    
    // stats calculation
    statTotalLeads.textContent = leads.length;
    statActivePlans.textContent = plans.filter(p => p.active).length;
    statActiveAddons.textContent = addons.filter(a => a.active).length;

    let averageVal = 0;
    if (leads.length > 0) {
      const totalCostSum = leads.reduce((sum, lead) => sum + (lead.finalPrice || 0), 0);
      averageVal = Math.round(totalCostSum / leads.length);
    }
    statAvgValue.textContent = `${currency}${averageVal}`;

    // Agency summary
    quickAgencyName.textContent = settings.agencyName || '-';
    quickContactEmail.textContent = settings.contactEmail || '-';
    quickCurrency.textContent = settings.currency || '-';
    quickFeaturedLabel.textContent = settings.activePlanFeaturedLabel || '-';

    // Hydrate top 5 recent submissions
    overviewLeadsTbody.innerHTML = '';
    const recentLeads = leads.slice(0, 5);

    if (recentLeads.length === 0) {
      overviewLeadsTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">No inquiries submitted yet.</td></tr>`;
      return;
    }

    recentLeads.forEach(lead => {
      const row = document.createElement('tr');
      const formattedDate = new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      
      row.innerHTML = `
        <td>
          <div class="lead-title-primary">${lead.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${lead.email}</div>
        </td>
        <td><span class="badge badge-plan">${lead.selectedPlan}</span></td>
        <td style="font-weight: 700; color: #fff;">${currency}${lead.finalPrice}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${formattedDate}</td>
      `;
      overviewLeadsTbody.appendChild(row);
    });
  }

  // Redirect buttons inside Overview cards
  if (quickViewLeadsBtn) {
    quickViewLeadsBtn.addEventListener('click', () => {
      document.querySelector('[data-view="leads"]').click();
    });
  }

  if (quickEditSettingsBtn) {
    quickEditSettingsBtn.addEventListener('click', () => {
      document.querySelector('[data-view="settings"]').click();
    });
  }

  // View 2: Plans Manager Panel Hydration
  function renderPlansTab() {
    plansTbody.innerHTML = '';
    const currency = settings.currency || '$';

    if (plans.length === 0) {
      plansTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No plans found in database. Create one above!</td></tr>`;
      return;
    }

    plans.forEach(plan => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td style="font-weight: 600; color: #fff;">${plan.name}</td>
        <td style="font-weight: 700; color: var(--primary);">${currency}${plan.basePrice}/mo</td>
        <td style="text-align: center;">${plan.platformsIncluded} channel(s)</td>
        <td style="text-align: center;">${plan.vaHours > 0 ? `${plan.vaHours} hours` : 'None'}</td>
        <td style="text-align: center;">
          <label class="switch">
            <input type="checkbox" class="plan-toggle-active" data-id="${plan.id}" ${plan.active ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </td>
        <td style="text-align: center;">
          ${plan.featured ? `<span class="badge badge-featured">${settings.activePlanFeaturedLabel || 'Featured'}</span>` : '<span style="color: var(--text-dim); font-size: 0.8rem;">-</span>'}
        </td>
        <td>
          <div class="action-btns-cell">
            <button class="btn-icon edit plan-edit-btn" data-id="${plan.id}" title="Edit plan">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg>
            </button>
            <button class="btn-icon delete plan-delete-btn" data-id="${plan.id}" title="Delete plan">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      `;

      // Quick active status toggle slider listener
      row.querySelector('.plan-toggle-active').addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const active = e.target.checked;
        const matched = plans.find(p => p.id === id);
        if (matched) {
          const payload = { ...matched, active: active };
          await savePlanRequest(payload, true);
        }
      });

      // Edit click handler
      row.querySelector('.plan-edit-btn').addEventListener('click', () => {
        openPlanModal(plan);
      });

      // Delete click handler
      row.querySelector('.plan-delete-btn').addEventListener('click', async () => {
        if (confirm(`Are you absolutely sure you want to delete ${plan.name}? This will remove it from the system.`)) {
          await deletePlanRequest(plan.id);
        }
      });

      plansTbody.appendChild(row);
    });
  }

  // View 3: Addons Manager Panel Hydration
  function renderAddonsTab() {
    addonsTbody.innerHTML = '';
    const currency = settings.currency || '$';

    if (addons.length === 0) {
      addonsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No add-ons found in database. Create one above!</td></tr>`;
      return;
    }

    addons.forEach(addon => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td style="font-weight: 600; color: #fff;">${addon.name}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${addon.description}</td>
        <td style="font-weight: 700; color: var(--primary);">${currency}${addon.price}</td>
        <td style="text-transform: capitalize;">${addon.pricingType.replace('_', ' ')}</td>
        <td style="text-align: center;">
          <label class="switch">
            <input type="checkbox" class="addon-toggle-active" data-id="${addon.id}" ${addon.active ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </td>
        <td>
          <div class="action-btns-cell">
            <button class="btn-icon edit addon-edit-btn" data-id="${addon.id}" title="Edit add-on">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg>
            </button>
            <button class="btn-icon delete addon-delete-btn" data-id="${addon.id}" title="Delete add-on">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </td>
      `;

      // Quick active status toggle listener
      row.querySelector('.addon-toggle-active').addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const active = e.target.checked;
        const matched = addons.find(a => a.id === id);
        if (matched) {
          const payload = { ...matched, active: active };
          await saveAddonRequest(payload, true);
        }
      });

      // Edit click handler
      row.querySelector('.addon-edit-btn').addEventListener('click', () => {
        openAddonModal(addon);
      });

      // Delete click handler
      row.querySelector('.addon-delete-btn').addEventListener('click', async () => {
        if (confirm(`Are you absolutely sure you want to delete ${addon.name}? This will remove it from the system.`)) {
          await deleteAddonRequest(addon.id);
        }
      });

      addonsTbody.appendChild(row);
    });
  }

  // View 4: Leads Submissions Feed Hydration
  function renderLeadsTab() {
    leadsFeedTbody.innerHTML = '';
    const currency = settings.currency || '$';

    if (leads.length === 0) {
      leadsFeedTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No inquiries captured yet.</td></tr>`;
      return;
    }

    leads.forEach(lead => {
      const row = document.createElement('tr');
      const formattedDate = new Date(lead.createdAt).toLocaleDateString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      // Nicely format the chosen add-ons list in scope column
      let addonsListHtml = '';
      if (lead.selectedAddOns && lead.selectedAddOns.length > 0) {
        addonsListHtml = `
          <div style="font-size: 0.8rem; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--admin-border);">
            <div style="font-weight: 600; color: var(--text-muted); margin-bottom: 2px;">Configured Add-ons:</div>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 2px; padding-left: 0;">
              ${lead.selectedAddOns.map(addon => `
                <li style="color: var(--text-muted);"><span style="color: var(--primary); font-weight: 600;">+</span> ${addon.name} (x${addon.quantity})</li>
              `).join('')}
            </ul>
          </div>
        `;
      } else {
        addonsListHtml = `<div style="font-size: 0.75rem; color: var(--text-dim); font-style: italic; margin-top: 4px;">Baseline card only</div>`;
      }

      row.innerHTML = `
        <td>
          <div class="lead-title-primary">${lead.name}</div>
          <div class="lead-subtitle">${lead.email}</div>
          ${lead.phone ? `<div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">📞 ${lead.phone}</div>` : ''}
        </td>
        <td style="font-weight: 500;">${lead.businessName || '<span style="color: var(--text-dim); font-style: italic;">Not provided</span>'}</td>
        <td>
          <span class="badge badge-plan" style="font-size: 0.8rem;">${lead.selectedPlan}</span>
          ${addonsListHtml}
        </td>
        <td>
          <div style="font-size: 0.85rem; max-width: 280px; max-height: 100px; overflow-y: auto; color: var(--text-muted); word-break: break-word;">
            ${lead.message ? lead.message : '<span style="color: var(--text-dim); font-style: italic;">No message/notes.</span>'}
          </div>
        </td>
        <td style="font-weight: 800; font-size: 1.1rem; color: #fff;">${currency}${lead.finalPrice}</td>
        <td style="color: var(--text-muted); font-size: 0.85rem; white-space: nowrap;">${formattedDate}</td>
      `;
      
      leadsFeedTbody.appendChild(row);
    });
  }

  // Leads export handler
  if (downloadLeadsCsv) {
    downloadLeadsCsv.addEventListener('click', () => {
      if (leads.length === 0) {
        alert('No leads available to export.');
        return;
      }
      
      // Since it's a browser dashboard, exporting a cleanly formatted JSON string is incredibly robust
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", `leads_export_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // View 5: Settings Hydrator
  function hydrateSettingsForm() {
    settingAgency.value = settings.agencyName || '';
    settingCurrency.value = settings.currency || '$';
    settingEmail.value = settings.contactEmail || '';
    settingPhone.value = settings.contactPhone || '';
    settingFeaturedLabel.value = settings.activePlanFeaturedLabel || '';
    settingNewPassword.value = ''; // Always load empty
  }

  // Settings Save Handler
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable submit
    const saveBtn = document.getElementById('settings-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving Changes...';

    const payload = {
      agencyName: settingAgency.value.trim(),
      currency: settingCurrency.value.trim(),
      contactEmail: settingEmail.value.trim(),
      contactPhone: settingPhone.value.trim(),
      activePlanFeaturedLabel: settingFeaturedLabel.value.trim()
    };

    const newPass = settingNewPassword.value;
    if (newPass && newPass.trim().length > 0) {
      payload.newPassword = newPass.trim();
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        settings = data.settings;
        alert('Global settings updated successfully!');
        hydrateSettingsForm();
        renderOverviewTab();
      } else {
        alert('Failed to save settings: ' + (data.error || 'Unknown error.'));
      }
    } catch (err) {
      console.error('Settings saving request failure:', err);
      alert('Error saving settings. Connection lost.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Commit Changes';
    }
  });


  // CRUD: PLANS MODAL ACTIONS
  function openPlanModal(plan = null) {
    // Reset Form
    planForm.reset();
    tempOutputs = [];
    tempServices = [];
    
    if (plan) {
      // Edit mode
      planFormTitle.textContent = `Edit Plan: ${plan.name}`;
      planFormId.value = plan.id;
      planFormName.value = plan.name;
      planFormPrice.value = plan.basePrice;
      planFormDescription.value = plan.description;
      planFormPlatforms.value = plan.platformsIncluded;
      planFormVa.value = plan.vaHours;
      planFormCta.value = plan.ctaText || 'Get Started';
      planFormActive.checked = plan.active;
      planFormFeatured.checked = plan.featured;
      
      tempOutputs = [...(plan.monthlyOutputs || [])];
      tempServices = [...(plan.includedServices || [])];
    } else {
      // Create mode
      planFormTitle.textContent = 'Create New Baseline Plan';
      planFormId.value = '';
      planFormActive.checked = true;
      planFormFeatured.checked = false;
      planFormPlatforms.value = 1;
      planFormVa.value = 0;
      planFormCta.value = 'Get Started';
    }

    // Render list builder sub-elements
    renderPlanBuilderLists();

    // Trigger Modal
    planModal.classList.add('active');
  }

  function closePlanModal() {
    planModal.classList.remove('active');
  }

  addPlanBtn.addEventListener('click', () => openPlanModal());
  planModalClose.addEventListener('click', closePlanModal);

  // Output/Deliverable list builders
  addOutputListBtn.addEventListener('click', () => {
    const val = newOutputInput.value.trim();
    if (val.length > 0) {
      tempOutputs.push(val);
      newOutputInput.value = '';
      newOutputInput.focus();
      renderPlanBuilderLists();
    }
  });

  // Scope/Service list builders
  addServiceListBtn.addEventListener('click', () => {
    const val = newServiceInput.value.trim();
    if (val.length > 0) {
      tempServices.push(val);
      newServiceInput.value = '';
      newServiceInput.focus();
      renderPlanBuilderLists();
    }
  });

  function renderPlanBuilderLists() {
    // 1. Output Deliverables
    outputsBuilderItems.innerHTML = '';
    tempOutputs.forEach((output, idx) => {
      const item = document.createElement('div');
      item.className = 'list-builder-item';
      item.innerHTML = `
        <span>${output}</span>
        <button class="btn btn-outline" type="button" style="padding: 4px 8px; color: var(--danger); font-size: 0.75rem;" data-idx="${idx}">Remove</button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        tempOutputs.splice(idx, 1);
        renderPlanBuilderLists();
      });
      outputsBuilderItems.appendChild(item);
    });

    // 2. Included Services
    servicesBuilderItems.innerHTML = '';
    tempServices.forEach((service, idx) => {
      const item = document.createElement('div');
      item.className = 'list-builder-item';
      item.innerHTML = `
        <span>${service}</span>
        <button class="btn btn-outline" type="button" style="padding: 4px 8px; color: var(--danger); font-size: 0.75rem;" data-idx="${idx}">Remove</button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        tempServices.splice(idx, 1);
        renderPlanBuilderLists();
      });
      servicesBuilderItems.appendChild(item);
    });
  }

  // Plan Submit Form Handler
  planForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = planFormId.value;
    const isEdit = id.length > 0;

    const payload = {
      name: planFormName.value.trim(),
      basePrice: parseInt(planFormPrice.value),
      description: planFormDescription.value.trim(),
      platformsIncluded: parseInt(planFormPlatforms.value),
      vaHours: parseInt(planFormVa.value),
      ctaText: planFormCta.value.trim(),
      active: planFormActive.checked,
      featured: planFormFeatured.checked,
      monthlyOutputs: tempOutputs,
      includedServices: tempServices
    };

    if (isEdit) {
      payload.id = id;
    }

    await savePlanRequest(payload);
  });

  async function savePlanRequest(payload, isToggleOnly = false) {
    const isEdit = !!payload.id;
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
      const res = await fetch('/api/plans', {
        method: method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        if (!isToggleOnly) {
          closePlanModal();
          alert(isEdit ? 'Plan updated successfully!' : 'Plan created successfully!');
        }
        await loadAllData();
      } else {
        alert('Failed to save plan: ' + (result.error || 'Unknown database issue'));
      }
    } catch (err) {
      console.error('Plan save HTTP error:', err);
      alert('Error updating baseline plan.');
    }
  }

  async function deletePlanRequest(planId) {
    try {
      const res = await fetch(`/api/plans?id=${planId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      const result = await res.json();
      if (result.success) {
        alert('Plan deleted successfully!');
        await loadAllData();
      } else {
        alert('Delete failed: ' + (result.error || 'System database error.'));
      }
    } catch (err) {
      console.error('Plan deletion error:', err);
      alert('Network request failure.');
    }
  }


  // CRUD: ADD-ONS MODAL ACTIONS
  function openAddonModal(addon = null) {
    addonForm.reset();

    if (addon) {
      addonFormTitle.textContent = `Edit Add-On: ${addon.name}`;
      addonFormId.value = addon.id;
      addonFormName.value = addon.name;
      addonFormDescription.value = addon.description;
      addonFormPrice.value = addon.price;
      addonFormType.value = addon.pricingType;
      addonFormActive.checked = addon.active;
    } else {
      addonFormTitle.textContent = 'Create New Custom Add-On';
      addonFormId.value = '';
      addonFormActive.checked = true;
      addonFormType.value = 'per_item';
    }

    addonModal.classList.add('active');
  }

  function closeAddonModal() {
    addonModal.classList.remove('active');
  }

  addAddonBtn.addEventListener('click', () => openAddonModal());
  addonModalClose.addEventListener('click', closeAddonModal);

  // Addon Submit Handler
  addonForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = addonFormId.value;
    const isEdit = id.length > 0;

    const payload = {
      name: addonFormName.value.trim(),
      description: addonFormDescription.value.trim(),
      price: parseInt(addonFormPrice.value),
      pricingType: addonFormType.value,
      active: addonFormActive.checked
    };

    if (isEdit) {
      payload.id = id;
    }

    await saveAddonRequest(payload);
  });

  async function saveAddonRequest(payload, isToggleOnly = false) {
    const isEdit = !!payload.id;
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
      const res = await fetch('/api/addons', {
        method: method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        if (!isToggleOnly) {
          closeAddonModal();
          alert(isEdit ? 'Add-on updated successfully!' : 'Add-on created successfully!');
        }
        await loadAllData();
      } else {
        alert('Failed to save add-on: ' + (result.error || 'Unknown database issue'));
      }
    } catch (err) {
      console.error('Add-on save HTTP error:', err);
      alert('Error updating add-on details.');
    }
  }

  async function deleteAddonRequest(addonId) {
    try {
      const res = await fetch(`/api/addons?id=${addonId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      const result = await res.json();
      if (result.success) {
        alert('Add-on deleted successfully!');
        await loadAllData();
      } else {
        alert('Delete failed: ' + (result.error || 'System database error.'));
      }
    } catch (err) {
      console.error('Add-on deletion error:', err);
      alert('Network request failure.');
    }
  }

  // Fire Session check on boot
  checkAuth();
});
