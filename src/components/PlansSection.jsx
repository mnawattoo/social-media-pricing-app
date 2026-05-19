import React from 'react';

export default function PlansSection({ plans, loading, settings, onSelectPlan }) {
  const currencySymbol = settings.currency || '$';
  const featuredLabel = settings.activePlanFeaturedLabel || 'Most Popular';

  const handleSelectPlan = (plan) => {
    onSelectPlan(plan);
    const calcSec = document.getElementById('calculator');
    if (calcSec) {
      calcSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="plans" className="pricing-section">
      <div className="container">
        <h2 className="section-title">Transparent, Music-First Pricing</h2>
        <p className="section-subtitle">
          Select a baseline rollout plan designed for your release frequency. Customize with custom promo deliverables using our interactive budget builder below.
        </p>

        <div className="pricing-grid" id="plans-container">
          {loading ? (
            <div style={{ textAlign: 'center', gridColumn: 'span 3', padding: '40px', color: 'var(--text-muted)' }}>
              <svg className="animate-spin" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', color: 'var(--primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Loading baseline release plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div style={{ textAlign: 'center', gridColumn: 'span 3', padding: '40px', color: 'var(--text-muted)' }}>
              <p>No plans available at this moment. Please check back later or contact us directly.</p>
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
                {plan.featured && (
                  <span className="badge-featured">{featuredLabel}</span>
                )}
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-desc">{plan.description}</p>
                
                <div className="plan-price-box">
                  <span className="plan-currency">{currencySymbol}</span>
                  <span className="plan-price">{plan.basePrice}</span>
                  <span className="plan-period">/ month</span>
                </div>

                <div className="plan-divider"></div>

                <div className="plan-features-title">Rollout Inclusions</div>
                
                <ul className="plan-features-list">
                  {/* Monthly Outputs */}
                  {(plan.monthlyOutputs || []).map((out, idx) => (
                    <li key={`out-${idx}`}>
                      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <strong>{out}</strong>
                    </li>
                  ))}
                  
                  {/* Included Services */}
                  {(plan.includedServices || []).map((srv, idx) => (
                    <li key={`srv-${idx}`}>
                      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{srv}</span>
                    </li>
                  ))}

                  {/* Platforms count & VA support daily hours summary details */}
                  {plan.platformsIncluded > 0 && (
                    <li>
                      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Supports {plan.platformsIncluded} Channels</span>
                    </li>
                  )}
                  {plan.vaHours > 0 && (
                    <li>
                      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Dedicated VA: {plan.vaHours} hrs / day</span>
                    </li>
                  )}
                </ul>

                <button 
                  onClick={() => handleSelectPlan(plan)}
                  className={`btn plan-cta ${plan.featured ? 'btn-primary' : 'btn-outline'}`}
                >
                  {plan.ctaText || 'Get Started'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
