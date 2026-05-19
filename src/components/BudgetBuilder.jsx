import React, { useState, useEffect } from 'react';

export default function BudgetBuilder({ plans, addons, settings, activePlan, setActivePlan, onSubmitLead }) {
  const [selectedAddons, setSelectedAddons] = useState({}); // format: { addonId: quantity }
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Lead form inputs
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const currencySymbol = settings.currency || '$';

  // Toggle addon checkbox inclusion
  const handleCheckboxChange = (addonId, checked) => {
    setSelectedAddons(prev => {
      const next = { ...prev };
      if (checked) {
        next[addonId] = 1;
      } else {
        delete next[addonId];
      }
      return next;
    });
  };

  // Adjust addon quantity
  const handleQuantityChange = (addonId, delta) => {
    setSelectedAddons(prev => {
      const currentQty = prev[addonId] || 1;
      const nextQty = Math.max(1, Math.min(50, currentQty + delta));
      return {
        ...prev,
        [addonId]: nextQty
      };
    });
  };

  // Format pricing types
  const formatPricingType = (type) => {
    switch (type) {
      case 'per_item': return '/ item';
      case 'per_hour': return '/ hr';
      case 'per_month': return '/ mo';
      default: return '';
    }
  };

  // Math Calculations
  const basePrice = activePlan ? activePlan.basePrice : 0;
  
  let addonsSubtotal = 0;
  const selectedAddonsList = [];

  Object.keys(selectedAddons).forEach(addonId => {
    const addon = addons.find(a => a.id === addonId);
    if (addon) {
      const qty = selectedAddons[addonId];
      const cost = addon.price * qty;
      addonsSubtotal += cost;
      selectedAddonsList.push({
        ...addon,
        quantity: qty,
        cost: cost
      });
    }
  });

  const grandTotal = basePrice + addonsSubtotal;

  // Handle lead form input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    const key = id.replace('lead-', '');
    setLeadForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle lead submission
  const handleSubmitLead = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const addonsFormatted = selectedAddonsList.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }));

    const payload = {
      name: leadForm.name,
      email: leadForm.email,
      phone: leadForm.phone,
      businessName: leadForm.businessName,
      selectedPlan: activePlan ? activePlan.name : '',
      selectedAddOns: addonsFormatted,
      finalPrice: grandTotal,
      message: leadForm.message
    };

    const success = await onSubmitLead(payload);
    setIsSubmitting(false);
    if (success) {
      setIsSuccess(true);
      setLeadForm({
        name: '',
        email: '',
        phone: '',
        businessName: '',
        message: ''
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsSuccess(false);
  };

  return (
    <section id="calculator" className="calc-section">
      <div className="container">
        <h2 className="section-title">Release <span className="gradient-text">Budget Builder</span></h2>
        <p className="section-subtitle">Select your baseline plan and add specialized music campaign add-ons. Watch your monthly rollout budget calculate in real-time instantly.</p>
        
        <div className="calc-grid">
          {/* Inputs Section (Left Panel) */}
          <div className="calc-card">
            {/* Step 1: Base Plan Selector */}
            <div className="calc-group">
              <h3 className="calc-group-title">
                <span style={{ color: 'var(--primary)' }}>1.</span> Select Release Baseline
              </h3>
              <div className="plan-selector-grid">
                {plans.filter(p => p.active).map(plan => (
                  <button
                    key={plan.id}
                    className={`plan-select-btn ${activePlan && activePlan.id === plan.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActivePlan(plan)}
                  >
                    <h4>{plan.name}</h4>
                    <p>{currencySymbol}{plan.basePrice}/mo</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Configure Add-ons */}
            <div className="calc-group" style={{ marginBottom: 0 }}>
              <h3 className="calc-group-title">
                <span style={{ color: 'var(--primary)' }}>2.</span> Configure Rollout Add-Ons
              </h3>
              <div className="addons-calc-list">
                {addons.filter(a => a.active).map(addon => {
                  const isChecked = !!selectedAddons[addon.id];
                  const qty = selectedAddons[addon.id] || 1;
                  
                  return (
                    <div key={addon.id} className={`addon-calc-item ${isChecked ? 'selected' : ''}`}>
                      <div className="addon-calc-info">
                        <div className="addon-calc-header">
                          <input
                            type="checkbox"
                            className="addon-checkbox"
                            id={`chk-${addon.id}`}
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(addon.id, e.target.checked)}
                          />
                          <label htmlFor={`chk-${addon.id}`} className="addon-calc-title">
                            {addon.name}
                          </label>
                        </div>
                        <p className="addon-calc-desc" style={{ paddingLeft: '30px' }}>
                          {addon.description}
                        </p>
                      </div>
                      
                      <div className="addon-calc-price-ctrl">
                        <div className="addon-calc-price">
                          {currencySymbol}{addon.price} {formatPricingType(addon.pricingType)}
                        </div>
                        <div className={`quantity-ctrl`} id={`qty-ctrl-${addon.id}`}>
                          <button
                            className="qty-btn qty-minus"
                            type="button"
                            onClick={() => handleQuantityChange(addon.id, -1)}
                          >
                            -
                          </button>
                          <span className="qty-val">{qty}</span>
                          <button
                            className="qty-btn qty-plus"
                            type="button"
                            onClick={() => handleQuantityChange(addon.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {addons.filter(a => a.active).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    No add-ons available.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Summary Sidebar (Right Panel) */}
          <div className="calc-summary-card">
            <h3 className="summary-title">Rollout Summary</h3>
            
            <div className="summary-row">
              <span>Selected Plan</span>
              <span>{activePlan ? activePlan.name : '-'}</span>
            </div>

            {activePlan && (
              <div className="summary-plan-details">
                <div>Base Price: <strong>{currencySymbol}{basePrice}/mo</strong></div>
                <div>Platforms included: <strong>{activePlan.platformsIncluded} channel(s)</strong></div>
                {activePlan.vaHours > 0 && (
                  <div>Dedicated VA support: <strong>{activePlan.vaHours} hrs/day</strong></div>
                )}
              </div>
            )}

            <div className="summary-row" style={{ marginBottom: '8px' }}>
              <span>Release Add-Ons Selected</span>
              <span>{selectedAddonsList.length}</span>
            </div>

            <div className="summary-addons-list">
              {selectedAddonsList.length > 0 ? (
                selectedAddonsList.map(item => {
                  let typeSuffix = '';
                  if (item.pricingType === 'per_hour') typeSuffix = ' hrs';
                  else if (item.pricingType === 'per_item' && item.quantity > 1) typeSuffix = 'x';
                  else if (item.pricingType === 'per_month') typeSuffix = '/mo';

                  return (
                    <div key={item.id} className="summary-addon-row">
                      <span>+ {item.name} {item.quantity > 1 ? `(${item.quantity}${typeSuffix})` : ''}</span>
                      <span>{currencySymbol}{item.cost}</span>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No add-ons selected yet.
                </div>
              )}
            </div>

            <div className="summary-row" style={{ marginBottom: 0, color: 'var(--text-muted)' }}>
              <span>Add-On Subtotal</span>
              <span>{currencySymbol}{addonsSubtotal}</span>
            </div>

            <div className="summary-divider"></div>

            <div className="total-box">
              <span className="total-label">Total Rollout Investment</span>
              <div className="total-price-box">
                <span className="total-price">{currencySymbol}{grandTotal}</span>
                <span className="total-period">/ month</span>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary calc-cta"
              disabled={!activePlan}
            >
              Lock In Campaign Budget
            </button>
          </div>
        </div>
      </div>

      {/* Lead Capture Modal Dialog */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="modal-box">
          <button className="modal-close" onClick={handleCloseModal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          {!isSuccess ? (
            <div id="modal-form-content">
              <h3 className="modal-title">Lock In Campaign Budget</h3>
              <p className="modal-desc">Tell us about your music project, artist handles, and goals. We will assemble your dedicated team and configure your campaign dashboard upon strategy review.</p>
              
              {/* Summary tags */}
              {activePlan && (
                <div className="modal-summary-tag">
                  <div className="modal-summary-left">
                    <h4>{activePlan.name}</h4>
                    <p>{selectedAddonsList.length > 0 ? `${selectedAddonsList.length} active add-on service(s) configured` : 'Pure baseline plan (No add-ons selected)'}</p>
                  </div>
                  <div className="modal-summary-right">
                    <div className="modal-summary-price">{currencySymbol}{grandTotal}</div>
                    <div className="modal-summary-period">per month</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitLead}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="lead-name">Artist / Band Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      id="lead-name"
                      placeholder="John Doe / The Waves"
                      required
                      value={leadForm.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lead-email">Contact Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      id="lead-email"
                      placeholder="management@artist.com"
                      required
                      value={leadForm.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="lead-phone">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      id="lead-phone"
                      placeholder="(555) 123-4567"
                      value={leadForm.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lead-company">Record Label / Management Group</label>
                    <input
                      type="text"
                      className="form-input"
                      id="lead-company"
                      placeholder="Independent / BeatPulse Records"
                      value={leadForm.businessName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '28px' }}>
                  <label className="form-label" htmlFor="lead-message">Tell us about your upcoming releases, music handles, or specific administrative tasks you'd like your VA to support... (Optional)</label>
                  <textarea
                    className="form-input"
                    id="lead-message"
                    placeholder="Upcoming single in 3 weeks, need TikTok hyping and playlist pitching. Touring schedule starts in September..."
                    value={leadForm.message}
                    onChange={handleInputChange}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary modal-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting Request...' : 'Lock In & Request Strategy Review'}
                </button>
              </form>
            </div>
          ) : (
            <div id="modal-success-content" className="success-state">
              <div className="success-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h3>Release Budget Locked In!</h3>
              <p>Thank you for choosing <span>{settings.agencyName || 'BeatPulse Agency'}</span>. A campaign growth manager will review your customized release scope and contact you within 24 hours to schedule your strategy onboarding call.</p>
              <button className="btn btn-outline" onClick={handleCloseModal} style={{ width: '100%' }}>
                Close Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
