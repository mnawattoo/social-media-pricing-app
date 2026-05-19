/**
 * Antigravity Social Media Pricing App - Frontend Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let plans = [];
  let addons = [];
  let settings = {};
  
  let activePlan = null;
  const selectedAddons = {}; // format: { addonId: { addon, quantity } }

  // DOM Elements
  const plansContainer = document.getElementById('plans-container');
  const plansLoading = document.getElementById('plans-loading');
  const calcPlanSelector = document.getElementById('calc-plan-selector');
  const calcAddonsList = document.getElementById('calc-addons-list');
  
  // Summary Panel Elements
  const summaryPlanName = document.getElementById('summary-plan-name');
  const summaryPlanDetails = document.getElementById('summary-plan-details-box');
  const summaryAddonsCount = document.getElementById('summary-addons-count');
  const summarySelectedAddons = document.getElementById('summary-selected-addons');
  const summaryAddonsSubtotal = document.getElementById('summary-addons-subtotal');
  const summaryGrandTotal = document.getElementById('summary-grand-total');
  
  // Modal Elements
  const leadModal = document.getElementById('lead-modal');
  const calcCtaBtn = document.getElementById('calc-cta-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalFormContent = document.getElementById('modal-form-content');
  const modalSuccessContent = document.getElementById('modal-success-content');
  const modalSuccessCloseBtn = document.getElementById('modal-success-close-btn');
  
  const leadForm = document.getElementById('lead-form');
  const leadSubmitBtn = document.getElementById('lead-submit-btn');
  
  const modalPlanLabel = document.getElementById('modal-plan-label');
  const modalAddonsLabel = document.getElementById('modal-addons-label');
  const modalTotalPrice = document.getElementById('modal-total-price');

  const footerAgencyName = document.getElementById('footer-agency-name');
  const successAgencyName = document.getElementById('success-agency-name');

  // Initialization: Fetch Data from REST API
  async function init() {
    try {
      // Parallel fetches for performance
      const [plansRes, addonsRes, settingsRes] = await Promise.all([
        fetch('/api/plans').then(r => r.json()),
        fetch('/api/addons').then(r => r.json()),
        fetch('/api/settings').then(r => r.json())
      ]);

      plans = plansRes;
      addons = addonsRes;
      settings = settingsRes;

      // Hydrate system labels
      if (settings.agencyName) {
        document.title = `Premium Social Media Management Plans | ${settings.agencyName}`;
        footerAgencyName.textContent = settings.agencyName;
        successAgencyName.textContent = settings.agencyName;
      }

      // Hide loading skeleton
      if (plansLoading) plansLoading.style.display = 'none';

      // Set default selected plan (featured or first available)
      activePlan = plans.find(p => p.featured && p.active) || plans.find(p => p.active) || plans[0];

      // Render items
      renderPlans();
      renderCalculatorSelectors();
      renderCalculatorAddons();
      
      // Initial calculation
      calculateTotal();
      
      // Wire static trigger buttons
      wireDynamicCtaButtons();

    } catch (err) {
      console.error('Failed to connect to API, running in offline/fallback mode:', err);
      showOfflineFallback();
    }
  }

  // Render baseline plans grid
  function renderPlans() {
    if (!plansContainer) return;

    // Filter out inactive plans
    const activePlansList = plans.filter(p => p.active);
    
    if (activePlansList.length === 0) {
      plansContainer.innerHTML = `<div style="grid-column: span 3; text-align: center; color: var(--text-muted);">No active plans available right now.</div>`;
      return;
    }

    plansContainer.innerHTML = '';
    
    activePlansList.forEach(plan => {
      const isFeatured = plan.featured;
      const currency = settings.currency || '$';
      
      const card = document.createElement('div');
      card.className = `pricing-card ${isFeatured ? 'featured' : ''}`;
      
      let featuredBadge = '';
      if (isFeatured) {
        featuredBadge = `<div class="badge-featured">${settings.activePlanFeaturedLabel || 'Most Popular'}</div>`;
      }

      // Create outputs list
      const outputsHtml = plan.monthlyOutputs.map(output => `
        <li>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
          <strong>${output}</strong>
        </li>
      `).join('');

      // Create deliverables list
      const deliverablesHtml = plan.includedServices.map(service => `
        <li>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>${service}</span>
        </li>
      `).join('');

      card.innerHTML = `
        ${featuredBadge}
        <h3 class="plan-name">${plan.name}</h3>
        <p class="plan-desc">${plan.description}</p>
        <div class="plan-price-box">
          <span class="plan-currency">${currency}</span>
          <span class="plan-price">${plan.basePrice}</span>
          <span class="plan-period">/ month</span>
        </div>
        <div class="plan-divider"></div>
        <h4 class="plan-features-title">Monthly Deliverables</h4>
        <ul class="plan-features-list" style="margin-bottom: 24px;">
          ${outputsHtml}
        </ul>
        <h4 class="plan-features-title">Scope Inclusions</h4>
        <ul class="plan-features-list">
          ${deliverablesHtml}
        </ul>
        <button class="btn ${isFeatured ? 'btn-primary' : 'btn-outline'} plan-cta" data-plan-id="${plan.id}">
          ${plan.ctaText || 'Get Started'}
        </button>
      `;
      
      plansContainer.appendChild(card);
    });
  }

  // Render plan options inside calculator
  function renderCalculatorSelectors() {
    if (!calcPlanSelector) return;
    
    calcPlanSelector.innerHTML = '';
    
    plans.filter(p => p.active).forEach(plan => {
      const btn = document.createElement('button');
      btn.className = `plan-select-btn ${activePlan && activePlan.id === plan.id ? 'active' : ''}`;
      btn.type = 'button';
      btn.dataset.id = plan.id;
      
      const currency = settings.currency || '$';
      btn.innerHTML = `
        <h4>${plan.name}</h4>
        <p>${currency}${plan.basePrice}/mo</p>
      `;
      
      btn.addEventListener('click', () => {
        // Toggle active selector class
        document.querySelectorAll('.plan-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active plan state
        activePlan = plans.find(p => p.id === plan.id);
        calculateTotal();
      });
      
      calcPlanSelector.appendChild(btn);
    });
  }

  // Render active add-ons list inside calculator
  function renderCalculatorAddons() {
    if (!calcAddonsList) return;
    
    calcAddonsList.innerHTML = '';
    const activeAddonsList = addons.filter(a => a.active);

    if (activeAddonsList.length === 0) {
      calcAddonsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No add-ons available.</div>`;
      return;
    }

    activeAddonsList.forEach(addon => {
      const item = document.createElement('div');
      item.className = 'addon-calc-item';
      item.id = `calc-addon-item-${addon.id}`;
      
      const currency = settings.currency || '$';
      const pricingTypeText = formatPricingType(addon.pricingType);
      
      item.innerHTML = `
        <div class="addon-calc-info">
          <div class="addon-calc-header">
            <input type="checkbox" class="addon-checkbox" id="chk-${addon.id}" data-id="${addon.id}">
            <label for="chk-${addon.id}" class="addon-calc-title">${addon.name}</label>
          </div>
          <p class="addon-calc-desc">${addon.description}</p>
        </div>
        <div class="addon-calc-price-ctrl">
          <div class="addon-calc-price">${currency}${addon.price} ${pricingTypeText}</div>
          <div class="quantity-ctrl" id="qty-ctrl-${addon.id}">
            <button class="qty-btn qty-minus" type="button" data-id="${addon.id}">-</button>
            <span class="qty-val" id="qty-val-${addon.id}">1</span>
            <button class="qty-btn qty-plus" type="button" data-id="${addon.id}">+</button>
          </div>
        </div>
      `;

      // Event listener for checkbox change
      const checkbox = item.querySelector('.addon-checkbox');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedAddons[addon.id] = {
            addon: addon,
            quantity: parseInt(document.getElementById(`qty-val-${addon.id}`).textContent) || 1
          };
          item.classList.add('selected');
        } else {
          delete selectedAddons[addon.id];
          item.classList.remove('selected');
        }
        calculateTotal();
      });

      // Minus button click
      item.querySelector('.qty-minus').addEventListener('click', () => {
        const qtyVal = document.getElementById(`qty-val-${addon.id}`);
        let currentQty = parseInt(qtyVal.textContent) || 1;
        if (currentQty > 1) {
          currentQty--;
          qtyVal.textContent = currentQty;
          
          if (selectedAddons[addon.id]) {
            selectedAddons[addon.id].quantity = currentQty;
            calculateTotal();
          }
        }
      });

      // Plus button click
      item.querySelector('.qty-plus').addEventListener('click', () => {
        const qtyVal = document.getElementById(`qty-val-${addon.id}`);
        let currentQty = parseInt(qtyVal.textContent) || 1;
        
        // Set maximum limit as a validation precaution (e.g. 50 items max)
        if (currentQty < 50) {
          currentQty++;
          qtyVal.textContent = currentQty;
          
          if (selectedAddons[addon.id]) {
            selectedAddons[addon.id].quantity = currentQty;
            calculateTotal();
          }
        }
      });

      calcAddonsList.appendChild(item);
    });
  }

  // Format pricing types to standard indicators
  function formatPricingType(type) {
    switch (type) {
      case 'per_item': return '/ item';
      case 'per_hour': return '/ hr';
      case 'per_month': return '/ mo';
      default: return '';
    }
  }

  // Main Live Pricing Formula & Sync
  function calculateTotal() {
    if (!activePlan) return;

    const currency = settings.currency || '$';
    const basePrice = activePlan.basePrice;
    let addonsTotal = 0;
    let addonsCount = 0;

    // Render selected plan name & basic specs in summary
    if (summaryPlanName) summaryPlanName.textContent = activePlan.name;
    
    if (summaryPlanDetails) {
      summaryPlanDetails.innerHTML = `
        <div>Base Price: <strong>${currency}${basePrice}/mo</strong></div>
        <div>Platforms included: <strong>${activePlan.platformsIncluded} channel(s)</strong></div>
        ${activePlan.vaHours > 0 ? `<div>Dedicated VA support: <strong>${activePlan.vaHours} hrs/day</strong></div>` : ''}
      `;
    }

    // Process selected add-ons list
    if (summarySelectedAddons) summarySelectedAddons.innerHTML = '';
    
    Object.keys(selectedAddons).forEach(id => {
      const entry = selectedAddons[id];
      const addon = entry.addon;
      const qty = entry.quantity;
      const cost = addon.price * qty;
      
      addonsTotal += cost;
      addonsCount += qty;

      if (summarySelectedAddons) {
        const row = document.createElement('div');
        row.className = 'summary-addon-row';
        
        let typeSuffix = '';
        if (addon.pricingType === 'per_hour') typeSuffix = ' hrs';
        else if (addon.pricingType === 'per_item' && qty > 1) typeSuffix = 'x';
        else if (addon.pricingType === 'per_month') typeSuffix = '/mo';

        row.innerHTML = `
          <span>+ ${addon.name} ${qty > 1 ? `(${qty}${typeSuffix})` : ''}</span>
          <span>${currency}${cost}</span>
        `;
        summarySelectedAddons.appendChild(row);
      }
    });

    if (addonsCount === 0 && summarySelectedAddons) {
      summarySelectedAddons.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem; font-style: italic;">No add-ons selected yet.</div>`;
    }

    // Update prices on screen
    const grandTotal = basePrice + addonsTotal;
    
    if (summaryAddonsCount) summaryAddonsCount.textContent = Object.keys(selectedAddons).length;
    if (summaryAddonsSubtotal) summaryAddonsSubtotal.textContent = `${currency}${addonsTotal}`;
    if (summaryGrandTotal) summaryGrandTotal.textContent = `${currency}${grandTotal}`;
    
    // Cache total calculation values to use on lead submission
    activePlan.calculatedTotal = grandTotal;
  }

  // Connect baseline plan grid CTA clicks to select in calculator and scroll
  function wireDynamicCtaButtons() {
    document.querySelectorAll('.plan-cta').forEach(button => {
      button.addEventListener('click', (e) => {
        const planId = e.target.dataset.planId;
        const matchedPlan = plans.find(p => p.id === planId);
        
        if (matchedPlan) {
          activePlan = matchedPlan;
          
          // Sync calculator plan selection styling
          document.querySelectorAll('.plan-select-btn').forEach(btn => {
            if (btn.dataset.id === planId) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          });
          
          calculateTotal();
          
          // Scroll smoothly to the interactive calculator
          document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // Open Lead Modal and Hydrate selections
  if (calcCtaBtn) {
    calcCtaBtn.addEventListener('click', () => {
      if (!activePlan) return;

      const currency = settings.currency || '$';
      const addonsKeys = Object.keys(selectedAddons);
      
      // Update labels inside lead modal
      if (modalPlanLabel) modalPlanLabel.textContent = `${activePlan.name} (Base: ${currency}${activePlan.basePrice})`;
      
      if (modalAddonsLabel) {
        modalAddonsLabel.textContent = addonsKeys.length > 0 
          ? `${addonsKeys.length} active add-on service(s) configured` 
          : 'Pure baseline plan (No add-ons selected)';
      }
      
      if (modalTotalPrice) modalTotalPrice.textContent = `${currency}${activePlan.calculatedTotal}`;
      
      // Reset Modal Form views
      modalFormContent.style.display = 'block';
      modalSuccessContent.style.display = 'none';
      
      // Trigger modal active class
      leadModal.classList.add('active');
    });
  }

  // Close Lead Modal
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      leadModal.classList.remove('active');
    });
  }

  if (modalSuccessCloseBtn) {
    modalSuccessCloseBtn.addEventListener('click', () => {
      leadModal.classList.remove('active');
    });
  }

  // Close modal when clicking dark overlay
  if (leadModal) {
    leadModal.addEventListener('click', (e) => {
      if (e.target === leadModal) {
        leadModal.classList.remove('active');
      }
    });
  }

  // Process Lead Submission
  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Collect values
      const name = document.getElementById('lead-name').value;
      const email = document.getElementById('lead-email').value;
      const phone = document.getElementById('lead-phone').value;
      const company = document.getElementById('lead-company').value;
      const notes = document.getElementById('lead-message').value;

      // Disable submit button and add loading class
      leadSubmitBtn.disabled = true;
      leadSubmitBtn.textContent = 'Submitting Request...';

      // Format selected add-ons array to store in DB
      const addonsFormatted = Object.keys(selectedAddons).map(id => {
        const entry = selectedAddons[id];
        return {
          id: entry.addon.id,
          name: entry.addon.name,
          quantity: entry.quantity,
          price: entry.addon.price
        };
      });

      const payload = {
        name: name,
        email: email,
        phone: phone,
        businessName: company,
        selectedPlan: activePlan.name,
        selectedAddOns: addonsFormatted,
        finalPrice: activePlan.calculatedTotal,
        message: notes
      };

      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
          // Switch to success screens
          modalFormContent.style.display = 'none';
          modalSuccessContent.style.display = 'block';
          leadForm.reset();
        } else {
          alert('Submission failed: ' + (result.error || 'Please check your connection and try again.'));
        }

      } catch (err) {
        console.error('Submission request failed:', err);
        alert('Network connection error. Lead could not be delivered to the API.');
      } finally {
        leadSubmitBtn.disabled = false;
        leadSubmitBtn.textContent = 'Submit Request';
      }
    });
  }

  // FAQ Accordion Trigger
  document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const faqItem = button.parentElement;
      const isActive = faqItem.classList.contains('active');
      
      // Close all other active items
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Toggle current item
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });

  // Offline / Fallback mode helper if REST API cannot be queried
  function showOfflineFallback() {
    plans = [
      {
        "id": "independent",
        "name": "Independent Plan",
        "description": "Best for rising beatmakers and indie creators establishing their social presence and brand identity.",
        "basePrice": 399,
        "featured": false,
        "includedServices": [
          "Custom beat/song cover graphics",
          "Short-form reel/TikTok editing",
          "Copywriting & lyric-centric captions",
          "Scheduled post scheduling",
          "Basic community interaction",
          "Monthly release planning",
          "Basic stream & reach analytics summary"
        ],
        "monthlyOutputs": [
          "12 custom post graphics per month",
          "4 short-form reels/shorts per month",
          "3 social posts per week",
          "Basic fan interaction support",
          "1 core music platform included"
        ],
        "platformsIncluded": 1,
        "vaHours": 0,
        "ctaText": "Deploy Independent Plan",
        "active": true
      },
      {
        "id": "rising-artist",
        "name": "Rising Artist Plan",
        "description": "Best for artists with active release schedules needing a complete, hands-on rollout strategy.",
        "basePrice": 799,
        "featured": true,
        "includedServices": [
          "Everything in Independent",
          "More graphics and promo videos",
          "Spotify Canvas loop animation (1 track)",
          "TikTok audio trend integration & hyping",
          "Release calendar management",
          "Proactive fan & playlist outreach",
          "Monthly campaign performance review",
          "Dedicated VA support for 2 hours",
          "VA assists show booking & promoter emails"
        ],
        "monthlyOutputs": [
          "20 custom promo graphics per month",
          "8 short-form edited video assets per month",
          "5 social posts per week",
          "Proactive community engagement",
          "2 social/music channels included",
          "Dedicated VA: 2 hours per day"
        ],
        "platformsIncluded": 2,
        "vaHours": 2,
        "ctaText": "Deploy Rising Artist",
        "active": true
      },
      {
        "id": "headliner",
        "name": "Headliner Elite Plan",
        "description": "Best for established touring acts, high-frequency producers, and boutique record labels.",
        "basePrice": 1399,
        "featured": false,
        "includedServices": [
          "Everything in Rising Artist",
          "High-volume creative outputs",
          "Spotify Canvas loops (up to 3 tracks)",
          "Custom 3D album cover art design",
          "Lyric video clip animations",
          "Press Release (PR) distribution pack",
          "Priority rollout support & label coordination",
          "Dedicated VA support for 4 hours",
          "VA supports booking, sponsors & sync licensing admin"
        ],
        "monthlyOutputs": [
          "30 custom high-tier graphics per month",
          "12 short-form edited video assets per month",
          "Daily high-reach posting",
          "Priority community response moderation",
          "3 social/music channels included",
          "Dedicated VA: 4 hours per day"
        ],
        "platformsIncluded": 3,
        "vaHours": 4,
        "ctaText": "Deploy Headliner Elite",
        "active": true
      }
    ];
    addons = [
      {
        "id": "playlist-pitch",
        "name": "Spotify Playlist Pitching",
        "description": "Outreach and pitch delivery to independent curators and genre lists.",
        "price": 150,
        "pricingType": "per_item",
        "active": true
      },
      {
        "id": "tiktok-trend",
        "name": "TikTok Trend Hype Campaign",
        "description": "Strategy drafting and influencer audio pitching to trend your track sound.",
        "price": 120,
        "pricingType": "per_item",
        "active": true
      },
      {
        "id": "lyric-video",
        "name": "Animated Lyric Video (up to 4m)",
        "description": "High-fidelity custom animated lyric video for release promo.",
        "price": 200,
        "pricingType": "per_item",
        "active": true
      },
      {
        "id": "album-cover-3d",
        "name": "Custom 3D Album Cover Art",
        "description": "Professional 3D modeled single/album artwork meeting streaming dimensions.",
        "price": 85,
        "pricingType": "per_item",
        "active": true
      },
      {
        "id": "spotify-canvas",
        "name": "Spotify Canvas Loop Animation",
        "description": "Mesmerizing 8-second vertical loop animation matching stream specifications.",
        "price": 40,
        "pricingType": "per_item",
        "active": true
      }
    ];
    settings = { agencyName: 'BeatPulse Agency', currency: '$', activePlanFeaturedLabel: 'Hottest Choice' };

    activePlan = plans[1];
    
    if (plansLoading) plansLoading.style.display = 'none';
    
    renderPlans();
    renderCalculatorSelectors();
    renderCalculatorAddons();
    calculateTotal();
    wireDynamicCtaButtons();
  }

  // Fire Init Process
  init();
});
