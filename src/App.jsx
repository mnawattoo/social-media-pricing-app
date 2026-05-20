import React, { useState, useEffect } from 'react';
import Hero from './components/Hero.jsx';
import PlansSection from './components/PlansSection.jsx';
import BudgetBuilder from './components/BudgetBuilder.jsx';
import AdminPortal from './components/AdminPortal.jsx';

export default function App() {
  const [plans, setPlans] = useState([]);
  const [addons, setAddons] = useState([]);
  const [settings, setSettings] = useState({
    agencyName: 'BeatPulse',
    currency: '£',
    contactEmail: 'contact@beatpulse.co',
    contactPhone: '(555) 123-4567',
    activePlanFeaturedLabel: 'Most Popular'
  });
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePlan, setActivePlan] = useState(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [faqOpen, setFaqOpen] = useState({});

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, addonsRes, settingsRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/addons'),
        fetch('/api/settings')
      ]);

      const plansData = await plansRes.json();
      const addonsData = await addonsRes.json();
      const settingsData = await settingsRes.json();

      if (Array.isArray(plansData)) {
        setPlans(plansData);
      } else if (plansData.success && Array.isArray(plansData.data)) {
        setPlans(plansData.data);
      }

      if (Array.isArray(addonsData)) {
        setAddons(addonsData);
      } else if (addonsData.success && Array.isArray(addonsData.data)) {
        setAddons(addonsData.data);
      }

      // Settings endpoint returns settings object directly or under settings.data
      if (settingsData && !settingsData.success) {
        setSettings(prev => ({ ...prev, ...settingsData }));
      } else if (settingsData && settingsData.success && settingsData.settings) {
        setSettings(prev => ({ ...prev, ...settingsData.settings }));
      }

      // If session exists, try fetching Leads Feed
      const token = localStorage.getItem('admin_token');
      if (token === 'admin-session-active') {
        setIsAuthenticated(true);
        const leadsRes = await fetch('/api/leads', {
          headers: { 'X-Admin-Token': token }
        });
        const leadsData = await leadsRes.json();
        if (Array.isArray(leadsData)) {
          setLeads(leadsData);
        } else if (leadsData.success && Array.isArray(leadsData.leads)) {
          setLeads(leadsData.leads);
        } else if (leadsData.success && Array.isArray(leadsData.data)) {
          setLeads(leadsData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching baseline configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check auth and fetch config at mount
  useEffect(() => {
    fetchData();
  }, []);

  // Listen to popstate for router changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Set default selected active plan
  useEffect(() => {
    if (plans && plans.length > 0 && !activePlan) {
      const activePlans = plans.filter(p => p.active !== false);
      const featured = activePlans.find(p => p.featured);
      const defaultPlan = featured || activePlans[0] || plans[0];
      setActivePlan(defaultPlan);
    }
  }, [plans, activePlan]);

  // Client-side router navigation helper
  const navigate = (path) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Lead submitting strategy logic
  const onSubmitLead = async (payload) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        // Hydrate leads if already logged in admin is using the client side
        fetchData();
        return true;
      } else {
        alert('Error submitting inquiry: ' + (data.error || 'Server error'));
        return false;
      }
    } catch (err) {
      console.error('Error submitting lead:', err);
      alert('Network error submitting inquiry. Please try again.');
      return false;
    }
  };

  // Toggle FAQ accordion item
  const toggleFaq = (index) => {
    setFaqOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Scroll target handler
  const handleScrollToSection = (e, sectionId) => {
    e.preventDefault();
    if (currentPath !== '/') {
      navigate('/');
    }
    setTimeout(() => {
      const sec = document.getElementById(sectionId);
      if (sec) {
        sec.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const agencyName = settings.agencyName || 'BeatPulse';
  const currencySymbol = settings.currency || '$';

  // Render Admin Portal View
  if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    return (
      <AdminPortal
        plans={plans}
        addons={addons}
        settings={settings}
        leads={leads}
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        fetchData={fetchData}
        navigate={navigate}
      />
    );
  }

  // Render Client Landing Page View
  return (
    <div className="landing-layout">
      {/* Navigation Header */}
      <header>
        <div className="container nav-container">
          <a href="#" className="logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span>{agencyName}</span>
          </a>
          <nav>
            <ul>
              <li><a href="#plans" onClick={(e) => handleScrollToSection(e, 'plans')}>Campaign Plans</a></li>
              <li><a href="#calculator" onClick={(e) => handleScrollToSection(e, 'calculator')}>Release Budget Builder</a></li>
              <li><a href="#compare" onClick={(e) => handleScrollToSection(e, 'compare')}>Rollout Specs</a></li>
              <li><a href="#faq" onClick={(e) => handleScrollToSection(e, 'faq')}>FAQ</a></li>
              <li>
                <button 
                  onClick={() => navigate('/admin')} 
                  className="btn btn-outline nav-admin-btn"
                >
                  Admin Panel
                </button>
              </li>
              <li>
                <a 
                  href="#calculator" 
                  onClick={(e) => handleScrollToSection(e, 'calculator')} 
                  className="btn btn-primary nav-cta-btn"
                >
                  Build Rollout
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Banner Component */}
      <Hero settings={settings} />

      {/* Plans Pricing Grid Section */}
      <PlansSection 
        plans={plans} 
        loading={loading} 
        settings={settings} 
        onSelectPlan={setActivePlan} 
      />

      {/* Interactive Budget Builder Component */}
      <BudgetBuilder
        plans={plans}
        addons={addons}
        settings={settings}
        activePlan={activePlan}
        setActivePlan={setActivePlan}
        onSubmitLead={onSubmitLead}
      />

      {/* Comparison Specifications Matrix */}
      <section id="compare" className="comparison-section">
        <div className="container">
          <h2 className="section-title">Rollout Specs &amp; Tier Details</h2>
          <p className="section-subtitle">
            A detailed comparative breakdown of our baseline campaign deliverables, output pacing, and team resources.
          </p>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Rollout Deliverables</th>
                  <th>Independent Plan</th>
                  <th>Rising Artist Plan</th>
                  <th>Headliner Elite Plan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Album Cover &amp; Promo Graphics</td>
                  <td>12 per month</td>
                  <td>20 per month</td>
                  <td>30 per month</td>
                </tr>
                <tr>
                  <td>Spotify Canvas &amp; Short Videos</td>
                  <td>4 per month (Basic)</td>
                  <td>8 per month (Advanced + Canvas)</td>
                  <td>12 per month (Premium + Canvas loops)</td>
                </tr>
                <tr>
                  <td>Rollout Post Freq &amp; Schedule</td>
                  <td>3 Posts / week</td>
                  <td>5 Posts / week</td>
                  <td>Daily Posting</td>
                </tr>
                <tr>
                  <td>Music / Social Channels</td>
                  <td>2 Channels</td>
                  <td>3 Channels</td>
                  <td>5 Channels</td>
                </tr>
                <tr>
                  <td>Dedicated Label/Artist VA</td>
                  <td>
                    <svg className="cross-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </td>
                  <td>2 Hours / day</td>
                  <td>4 Hours / day</td>
                </tr>
                <tr>
                  <td>Playlist Curator &amp; Fan Outreach</td>
                  <td>Basic Curator outreach</td>
                  <td>Proactive playlist outreach</td>
                  <td>Proactive outreach + PR list pitching</td>
                </tr>
                <tr>
                  <td>Press Release &amp; Promo Pitching</td>
                  <td>Standard Pitching</td>
                  <td>Advanced + Hashtags</td>
                  <td>PR Distribution Pack + Media Pitching</td>
                </tr>
                <tr>
                  <td>Release Stream &amp; Reach Analysis</td>
                  <td>Summary PDF</td>
                  <td>Monthly Review</td>
                  <td>Daily AM Support + Label Coordination</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Section */}
      <section id="faq" className="faq-section">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Everything you need to know about our music-centric campaigns, release schedules, and VA integrations.
          </p>

          <div className="faq-grid">
            <div className={`faq-item ${faqOpen[0] ? 'active' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(0)}>
                What can my dedicated Artist/Label VA do?
                <span className="faq-icon" style={{ transform: faqOpen[0] ? 'rotate(45deg)' : 'none' }}>+</span>
              </button>
              {faqOpen[0] && (
                <div className="faq-answer">
                  Your dedicated VA is trained specifically in music industry operations. They handle administrative duties such as curator list building, promoter emails, booking administration, sync licensing catalog tracking, blog submissions, or updating tour listings, letting you focus entirely on your music.
                </div>
              )}
            </div>

            <div className={`faq-item ${faqOpen[1] ? 'active' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(1)}>
                Can I adjust add-ons based on my release schedule?
                <span className="faq-icon" style={{ transform: faqOpen[1] ? 'rotate(45deg)' : 'none' }}>+</span>
              </button>
              {faqOpen[1] && (
                <div className="faq-answer">
                  Absolutely! Release cycles have busy and quiet months. You can scale up with animated lyric videos, custom 3D artwork, or playlist pitching during campaign rollout months, and scale back down to a baseline plan between release cycles.
                </div>
              )}
            </div>

            <div className={`faq-item ${faqOpen[2] ? 'active' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(2)}>
                What are Spotify Canvas loops and lyric videos?
                <span className="faq-icon" style={{ transform: faqOpen[2] ? 'rotate(45deg)' : 'none' }}>+</span>
              </button>
              {faqOpen[2] && (
                <div className="faq-answer">
                  A Spotify Canvas is an 8-second vertical video loop that displays behind your track on the mobile player, greatly increasing track saves and shares. Our short videos are high-retention clips for TikTok, IG Reels, and YouTube Shorts formatted with lyrics and trending audio formats to convert listeners.
                </div>
              )}
            </div>

            <div className={`faq-item ${faqOpen[3] ? 'active' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(3)}>
                Is there a long-term contract or release commitment?
                <span className="faq-icon" style={{ transform: faqOpen[3] ? 'rotate(45deg)' : 'none' }}>+</span>
              </button>
              {faqOpen[3] && (
                <div className="faq-answer">
                  None at all. Music marketing runs on a flexible, week-to-week contract. You can upgrade, downgrade, pause, or shift your package at any time with a 7-day notice prior to your next weekly billing cycle.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Capture Block */}
      <section className="final-cta">
        <div className="container">
          <div className="cta-box">
            <h2>Ready to Scale Your Music Career?</h2>
            <p>
              Don't let your tracks get lost in the algorithm. Deploy a unified music marketing team and gain high-impact content and playlist traction starting next week.
            </p>
            <a 
              href="#calculator" 
              onClick={(e) => handleScrollToSection(e, 'calculator')} 
              className="btn btn-primary" 
              style={{ padding: '16px 36px', fontSize: '1.05rem' }}
            >
              Build Your Campaign Now
            </a>
          </div>
        </div>
      </section>

      {/* Footer Block */}
      <footer>
        <div className="container footer-grid">
          <div>
            <p>&copy; {new Date().getFullYear()} <span id="footer-agency-name">{agencyName} Agency</span>. All rights reserved.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-dim)' }}>
              Zero-dependency premium system designed by Antigravity.
            </p>
          </div>
          <ul className="footer-links">
            <li><a href="#plans" onClick={(e) => handleScrollToSection(e, 'plans')}>Campaign Plans</a></li>
            <li><a href="#calculator" onClick={(e) => handleScrollToSection(e, 'calculator')}>Release Budget Builder</a></li>
            <li><a href="#compare" onClick={(e) => handleScrollToSection(e, 'compare')}>Compare Specs</a></li>
            <li><a href="#faq" onClick={(e) => handleScrollToSection(e, 'faq')}>FAQ</a></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
