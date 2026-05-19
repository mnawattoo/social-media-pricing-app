import React, { useState, useEffect } from 'react';

export default function AdminPortal({
  plans,
  addons,
  settings,
  leads,
  isAuthenticated,
  setIsAuthenticated,
  fetchData,
  navigate
}) {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, plans, addons, leads, settings
  
  // Plan Modal & CRUD
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    description: '',
    basePrice: 0,
    featured: false,
    ctaText: '',
    platformsIncluded: 1,
    vaHours: 0,
    active: true,
    monthlyOutputs: [],
    includedServices: []
  });
  const [newOutput, setNewOutput] = useState('');
  const [newService, setNewService] = useState('');

  // Addon Modal & CRUD
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [addonForm, setAddonForm] = useState({
    id: '',
    name: '',
    description: '',
    price: 0,
    pricingType: 'per_item',
    active: true
  });

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    agencyName: '',
    currency: '$',
    contactEmail: '',
    contactPhone: '',
    activePlanFeaturedLabel: '',
    newPassword: ''
  });

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        agencyName: settings.agencyName || '',
        currency: settings.currency || '$',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        activePlanFeaturedLabel: settings.activePlanFeaturedLabel || 'Most Popular',
        newPassword: ''
      });
    }
  }, [settings]);

  // Auth Functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_token', 'admin-session-active');
        setIsAuthenticated(true);
        setPassword('');
        fetchData(); // Fetch admin-specific data (e.g. leads)
      } else {
        setLoginError(data.error || 'Authentication failed.');
      }
    } catch (err) {
      setLoginError('Server connection error.');
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
  };

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-Admin-Token': localStorage.getItem('admin_token') || 'admin-session-active'
    };
  };

  // ---------------- PLAN CRUD FUNCTIONS ----------------
  const openAddPlanModal = () => {
    setPlanForm({
      id: '',
      name: '',
      description: '',
      basePrice: 0,
      featured: false,
      ctaText: 'Get Started',
      platformsIncluded: 1,
      vaHours: 0,
      active: true,
      monthlyOutputs: [],
      includedServices: []
    });
    setNewOutput('');
    setNewService('');
    setIsPlanModalOpen(true);
  };

  const openEditPlanModal = (plan) => {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      basePrice: plan.basePrice || 0,
      featured: !!plan.featured,
      ctaText: plan.ctaText || 'Get Started',
      platformsIncluded: plan.platformsIncluded || 1,
      vaHours: plan.vaHours || 0,
      active: plan.active !== false,
      monthlyOutputs: [...(plan.monthlyOutputs || [])],
      includedServices: [...(plan.includedServices || [])]
    });
    setNewOutput('');
    setNewService('');
    setIsPlanModalOpen(true);
  };

  const savePlan = async (e) => {
    e.preventDefault();
    const isEdit = !!planForm.id;
    const url = '/api/plans';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(planForm)
      });
      const result = await res.json();
      if (result.success) {
        setIsPlanModalOpen(false);
        fetchData();
      } else {
        alert('Failed to save plan: ' + result.error);
      }
    } catch (err) {
      alert('Network error saving plan.');
    }
  };

  const togglePlanActive = async (plan) => {
    try {
      const res = await fetch('/api/plans', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...plan, active: !plan.active })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      }
    } catch (e) {}
  };

  const togglePlanFeatured = async (plan) => {
    try {
      const res = await fetch('/api/plans', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...plan, featured: !plan.featured })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      }
    } catch (e) {}
  };

  const deletePlan = async (id) => {
    if (!confirm('Are you sure you want to delete this baseline plan?')) return;
    try {
      const res = await fetch(`/api/plans?id=${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert('Failed to delete plan: ' + result.error);
      }
    } catch (err) {
      alert('Error connecting to delete API.');
    }
  };

  // Monthly Outputs List Builder Helpers
  const addOutputItem = () => {
    if (newOutput.trim() && !planForm.monthlyOutputs.includes(newOutput.trim())) {
      setPlanForm(prev => ({
        ...prev,
        monthlyOutputs: [...prev.monthlyOutputs, newOutput.trim()]
      }));
      setNewOutput('');
    }
  };

  const removeOutputItem = (itemToRemove) => {
    setPlanForm(prev => ({
      ...prev,
      monthlyOutputs: prev.monthlyOutputs.filter(item => item !== itemToRemove)
    }));
  };

  // Included Services List Builder Helpers
  const addServiceItem = () => {
    if (newService.trim() && !planForm.includedServices.includes(newService.trim())) {
      setPlanForm(prev => ({
        ...prev,
        includedServices: [...prev.includedServices, newService.trim()]
      }));
      setNewService('');
    }
  };

  const removeServiceItem = (itemToRemove) => {
    setPlanForm(prev => ({
      ...prev,
      includedServices: prev.includedServices.filter(item => item !== itemToRemove)
    }));
  };

  // ---------------- ADDON CRUD FUNCTIONS ----------------
  const openAddAddonModal = () => {
    setAddonForm({
      id: '',
      name: '',
      description: '',
      price: 0,
      pricingType: 'per_item',
      active: true
    });
    setIsAddonModalOpen(true);
  };

  const openEditAddonModal = (addon) => {
    setAddonForm({
      id: addon.id,
      name: addon.name,
      description: addon.description || '',
      price: addon.price || 0,
      pricingType: addon.pricingType || 'per_item',
      active: addon.active !== false
    });
    setIsAddonModalOpen(true);
  };

  const saveAddon = async (e) => {
    e.preventDefault();
    const isEdit = !!addonForm.id;
    const url = '/api/addons';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(addonForm)
      });
      const result = await res.json();
      if (result.success) {
        setIsAddonModalOpen(false);
        fetchData();
      } else {
        alert('Failed to save add-on: ' + result.error);
      }
    } catch (err) {
      alert('Network error saving add-on.');
    }
  };

  const toggleAddonActive = async (addon) => {
    try {
      const res = await fetch('/api/addons', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...addon, active: !addon.active })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      }
    } catch (e) {}
  };

  const deleteAddon = async (id) => {
    if (!confirm('Are you sure you want to delete this custom add-on?')) return;
    try {
      const res = await fetch(`/api/addons?id=${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert('Failed to delete add-on: ' + result.error);
      }
    } catch (err) {
      alert('Error connecting to delete API.');
    }
  };

  // ---------------- SETTINGS FUNCTIONS ----------------
  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(settingsForm)
      });
      const result = await res.json();
      if (result.success) {
        alert('Settings saved successfully!');
        setSettingsForm(prev => ({ ...prev, newPassword: '' }));
        fetchData();
      } else {
        alert('Failed to save settings: ' + result.error);
      }
    } catch (err) {
      alert('Network error saving settings.');
    }
  };

  // Leads Export Helper
  const exportLeadsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `inquiries_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Stats Calculations
  const currencySymbol = settings.currency || '$';
  const totalLeadsCount = leads.length;
  
  const averageLeadValue = totalLeadsCount > 0 
    ? Math.round(leads.reduce((sum, lead) => sum + (lead.finalPrice || 0), 0) / totalLeadsCount)
    : 0;

  const activePlansCount = plans.filter(p => p.active).length;
  const activeAddonsCount = addons.filter(a => a.active).length;

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  // Format pricing types
  const formatPricingType = (type) => {
    switch (type) {
      case 'per_item': return 'Per Item';
      case 'per_hour': return 'Per Hour';
      case 'per_month': return 'Per Month';
      default: return type;
    }
  };

  // If NOT authenticated, show the login card overlay
  if (!isAuthenticated) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <h2 className="auth-title">{settings.agencyName || 'BeatPulse'} Admin</h2>
            <p className="auth-desc">Authenticate to manage pricing and lead scopes.</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">Dashboard Password</label>
              <input
                type="password"
                className="form-input"
                id="auth-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {loginError && (
                <div className="form-helper" style={{ color: 'var(--danger)', marginTop: '8px', fontWeight: '600' }}>
                  {loginError}
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <a href="#" className="sidebar-logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span>{settings.agencyName || 'BeatPulse'}</span>
          </a>
        </div>
        
        <nav style={{ flexGrow: 1 }}>
          <ul className="sidebar-menu">
            <li className="sidebar-item">
              <button 
                className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                Overview
              </button>
            </li>
            <li className="sidebar-item">
              <button 
                className={`sidebar-link ${activeTab === 'plans' ? 'active' : ''}`}
                onClick={() => setActiveTab('plans')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6v6l4 2"></path></svg>
                Manage Plans
              </button>
            </li>
            <li className="sidebar-item">
              <button 
                className={`sidebar-link ${activeTab === 'addons' ? 'active' : ''}`}
                onClick={() => setActiveTab('addons')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Manage Add-Ons
              </button>
            </li>
            <li className="sidebar-item">
              <button 
                className={`sidebar-link ${activeTab === 'leads' ? 'active' : ''}`}
                onClick={() => setActiveTab('leads')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Leads Feed
              </button>
            </li>
            <li className="sidebar-item">
              <button 
                className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Pricing Settings
              </button>
            </li>
            <li className="sidebar-item" style={{ marginTop: 'auto', paddingTop: '20px' }}>
              <button 
                className="sidebar-link"
                onClick={() => navigate('/')}
                style={{ color: 'var(--text-dim)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                View Public Site
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area">
        {/* Top Header Bar */}
        <div className="top-bar">
          <h2>
            {activeTab === 'overview' && 'Overview'}
            {activeTab === 'plans' && 'Manage Baseline Plans'}
            {activeTab === 'addons' && 'Manage Custom Add-ons'}
            {activeTab === 'leads' && 'Client Inquiry Leads'}
            {activeTab === 'settings' && 'Platform Settings'}
          </h2>
          <div className="admin-badge">
            <div className="admin-badge-dot"></div>
            <span>Active Session</span>
          </div>
        </div>

        {/* ---------------- VIEW 1: OVERVIEW DASHBOARD ---------------- */}
        {activeTab === 'overview' && (
          <section className="view-panel">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Leads</span>
                <span className="stat-value">{totalLeadsCount}</span>
                <span className="stat-footer">Across all campaigns</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Avg. Lead Value</span>
                <span className="stat-value">{currencySymbol}{averageLeadValue}</span>
                <span className="stat-footer">Plan + configured add-ons</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Active baseline Plans</span>
                <span className="stat-value">{activePlansCount}</span>
                <span className="stat-footer">Live on landing page</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Active Add-Ons</span>
                <span className="stat-value">{activeAddonsCount}</span>
                <span className="stat-footer">Configurable in calculator</span>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Recent Submissions */}
              <div className="dashboard-card">
                <div className="card-title-box">
                  <h3 className="card-title">Recent Submissions</h3>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setActiveTab('leads')}>
                    View All
                  </button>
                </div>
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Lead Name</th>
                        <th>Plan Scope</th>
                        <th>Subtotal Price</th>
                        <th>Date Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.slice(0, 5).map(lead => (
                        <tr key={lead.id}>
                          <td className="lead-title-primary">{lead.name}</td>
                          <td>{lead.selectedPlan || 'Custom'}</td>
                          <td style={{ color: 'var(--primary)', fontWeight: '700' }}>{currencySymbol}{lead.finalPrice}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{formatDate(lead.createdAt)}</td>
                        </tr>
                      ))}
                      {leads.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                            No lead inquiries received yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Settings Panel */}
              <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="card-title" style={{ marginBottom: '20px' }}>Platform Settings Overview</h3>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Agency Branding:</span>
                      <strong>{settings.agencyName || '-'}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Contact Email:</span>
                      <strong>{settings.contactEmail || '-'}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--admin-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>System Currency:</span>
                      <strong>{settings.currency || '-'}</strong>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Featured Plan Label:</span>
                      <strong>{settings.activePlanFeaturedLabel || '-'}</strong>
                    </li>
                  </ul>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={() => setActiveTab('settings')}>
                  Manage Settings
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ---------------- VIEW 2: MANAGE PLANS ---------------- */}
        {activeTab === 'plans' && (
          <section className="view-panel">
            <div className="card-title-box" style={{ marginBottom: '24px' }}>
              <h3>Baseline Subscription Options</h3>
              <button className="btn btn-primary" onClick={openAddPlanModal}>+ Create Plan</button>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Plan Name</th>
                    <th>Base Price</th>
                    <th>Platforms</th>
                    <th>VA Support</th>
                    <th>Status</th>
                    <th>Featured</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(plan => (
                    <tr key={plan.id}>
                      <td className="lead-title-primary">{plan.name}</td>
                      <td>{currencySymbol}{plan.basePrice}</td>
                      <td>{plan.platformsIncluded} Channels</td>
                      <td>{plan.vaHours > 0 ? `${plan.vaHours} hrs/day` : 'None'}</td>
                      <td>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={plan.active !== false}
                            onChange={() => togglePlanActive(plan)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={!!plan.featured}
                            onChange={() => togglePlanFeatured(plan)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td>
                        <div className="action-btns-cell">
                          <button className="btn-icon edit" onClick={() => openEditPlanModal(plan)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                          <button className="btn-icon delete" onClick={() => deletePlan(plan.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {plans.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                        No baseline plans available. Click "+ Create Plan" to configure one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------------- VIEW 3: MANAGE ADD-ONS ---------------- */}
        {activeTab === 'addons' && (
          <section className="view-panel">
            <div className="card-title-box" style={{ marginBottom: '24px' }}>
              <h3>Configurable Custom Add-ons</h3>
              <button className="btn btn-primary" onClick={openAddAddonModal}>+ Create Add-on</button>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Add-On Name</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Pricing Structure</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {addons.map(addon => (
                    <tr key={addon.id}>
                      <td className="lead-title-primary">{addon.name}</td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{addon.description}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: '700' }}>{currencySymbol}{addon.price}</td>
                      <td>{formatPricingType(addon.pricingType)}</td>
                      <td>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={addon.active !== false}
                            onChange={() => toggleAddonActive(addon)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td>
                        <div className="action-btns-cell">
                          <button className="btn-icon edit" onClick={() => openEditAddonModal(addon)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                          <button className="btn-icon delete" onClick={() => deleteAddon(addon.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {addons.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                        No add-ons available. Click "+ Create Add-on" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------------- VIEW 4: LEADS FEED ---------------- */}
        {activeTab === 'leads' && (
          <section className="view-panel">
            <div className="card-title-box" style={{ marginBottom: '24px' }}>
              <h3>Client Inquiry Dashboard</h3>
              <button className="btn btn-outline" onClick={exportLeadsJson}>Export JSON Data</button>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Inquirer Details</th>
                    <th>Company</th>
                    <th>Custom Scope Summary</th>
                    <th>Notes / Message</th>
                    <th>Monthly value</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id}>
                      <td>
                        <div className="lead-title-primary">{lead.name}</div>
                        <div className="lead-subtitle">{lead.email}</div>
                        {lead.phone && <div className="lead-subtitle" style={{ color: 'var(--text-dim)' }}>{lead.phone}</div>}
                      </td>
                      <td>{lead.businessName || '-'}</td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{lead.selectedPlan || 'Custom'}</div>
                        {(lead.selectedAddOns || []).map((a, idx) => (
                          <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                            + {a.name} ({a.quantity}x)
                          </div>
                        ))}
                      </td>
                      <td style={{ maxWidth: '250px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lead.message || '-'}</td>
                      <td style={{ color: 'var(--success)', fontWeight: '700' }}>{currencySymbol}{lead.finalPrice}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{formatDate(lead.createdAt)}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                        No lead inquiries received yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------------- VIEW 5: SETTINGS ---------------- */}
        {activeTab === 'settings' && (
          <section className="view-panel">
            <div className="form-card">
              <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>Global Agency Metadata</h3>
              
              <form onSubmit={saveSettings}>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-agency">Agency Branding Name</label>
                    <input
                      type="text"
                      className="form-input"
                      id="setting-agency"
                      required
                      value={settingsForm.agencyName}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, agencyName: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-currency">Base Currency Symbol</label>
                    <input
                      type="text"
                      className="form-input"
                      id="setting-currency"
                      placeholder="$"
                      required
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, currency: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-email">Agency Contact Email</label>
                    <input
                      type="email"
                      className="form-input"
                      id="setting-email"
                      required
                      value={settingsForm.contactEmail}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-phone">Agency Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      id="setting-phone"
                      required
                      value={settingsForm.contactPhone}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-featured-label">"Featured Plan" Card Sticker</label>
                    <input
                      type="text"
                      className="form-input"
                      id="setting-featured-label"
                      placeholder="Most Popular"
                      required
                      value={settingsForm.activePlanFeaturedLabel}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, activePlanFeaturedLabel: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    {/* Spacing balance */}
                  </div>
                </div>

                <h3 style={{ marginTop: '32px', marginBottom: '24px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', color: 'var(--secondary)' }}>Admin Security</h3>
                
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-new-password">New Admin Password</label>
                    <input
                      type="password"
                      className="form-input"
                      id="setting-new-password"
                      placeholder="Leave blank to keep current password"
                      value={settingsForm.newPassword}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <span className="form-helper">Enter a password to update credentials.</span>
                  </div>
                  <div className="form-group">
                    {/* Spacing balance */}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', marginTop: '16px' }}>
                  Commit Changes
                </button>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* ---------------- MODAL: CREATE / EDIT PLAN ---------------- */}
      <div className={`admin-modal ${isPlanModalOpen ? 'active' : ''}`}>
        <div className="admin-modal-box">
          <button className="admin-modal-close" onClick={() => setIsPlanModalOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <h3 style={{ marginBottom: '24px' }}>{planForm.id ? 'Edit Baseline Plan' : 'Add New Baseline Plan'}</h3>
          
          <form onSubmit={savePlan}>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="plan-form-name">Plan Name *</label>
                <input
                  type="text"
                  className="form-input"
                  id="plan-form-name"
                  required
                  placeholder="e.g. Rising Artist Plan"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="plan-form-price">Base Monthly Price ($) *</label>
                <input
                  type="number"
                  className="form-input"
                  id="plan-form-price"
                  required
                  placeholder="799"
                  min="0"
                  value={planForm.basePrice}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, basePrice: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="plan-form-description">Description *</label>
              <input
                type="text"
                className="form-input"
                id="plan-form-description"
                required
                placeholder="Describe target audience for this plan."
                value={planForm.description}
                onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="plan-form-platforms">Platform Channels Included</label>
                <input
                  type="number"
                  className="form-input"
                  id="plan-form-platforms"
                  required
                  min="1"
                  max="10"
                  placeholder="2"
                  value={planForm.platformsIncluded}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, platformsIncluded: parseInt(e.target.value, 10) || 1 }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="plan-form-va">Dedicated VA daily hours</label>
                <input
                  type="number"
                  className="form-input"
                  id="plan-form-va"
                  required
                  min="0"
                  max="24"
                  placeholder="2"
                  value={planForm.vaHours}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, vaHours: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="plan-form-cta">CTA Button Text</label>
                <input
                  type="text"
                  className="form-input"
                  id="plan-form-cta"
                  placeholder="Deploy Rising Artist"
                  value={planForm.ctaText}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, ctaText: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', gap: '40px', alignItems: 'center', paddingTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="plan-form-active"
                      checked={planForm.active !== false}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, active: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </label>
                  <span>Active</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="plan-form-featured"
                      checked={!!planForm.featured}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, featured: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </label>
                  <span>Featured</span>
                </div>
              </div>
            </div>

            {/* Dynamic List Builder for Monthly Outputs */}
            <div className="form-group">
              <label className="form-label">Monthly Deliverables List (Outputs)</label>
              <div className="list-builder">
                <div className="list-builder-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 20 static graphics per month"
                    style={{ flexGrow: 1 }}
                    value={newOutput}
                    onChange={(e) => setNewOutput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOutputItem(); } }}
                  />
                  <button className="btn btn-outline" type="button" onClick={addOutputItem}>+ Add</button>
                </div>
                <div className="list-builder-items">
                  {planForm.monthlyOutputs.map((item, idx) => (
                    <div key={idx} className="builder-item-row">
                      <span>{item}</span>
                      <button className="builder-item-remove" type="button" onClick={() => removeOutputItem(item)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic List Builder for Included Services */}
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label">Scope Inclusions List (Services)</label>
              <div className="list-builder">
                <div className="list-builder-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Advanced caption writing"
                    style={{ flexGrow: 1 }}
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addServiceItem(); } }}
                  />
                  <button className="btn btn-outline" type="button" onClick={addServiceItem}>+ Add</button>
                </div>
                <div className="list-builder-items">
                  {planForm.includedServices.map((item, idx) => (
                    <div key={idx} className="builder-item-row">
                      <span>{item}</span>
                      <button className="builder-item-remove" type="button" onClick={() => removeServiceItem(item)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '12px' }}>
              Save Baseline Plan
            </button>
          </form>
        </div>
      </div>

      {/* ---------------- MODAL: CREATE / EDIT ADD-ON ---------------- */}
      <div className={`admin-modal ${isAddonModalOpen ? 'active' : ''}`}>
        <div className="admin-modal-box" style={{ maxWidth: '520px' }}>
          <button className="admin-modal-close" onClick={() => setIsAddonModalOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <h3 style={{ marginBottom: '24px' }}>{addonForm.id ? 'Edit Custom Add-On' : 'Add New Custom Add-On'}</h3>
          
          <form onSubmit={saveAddon}>
            <div className="form-group">
              <label className="form-label" htmlFor="addon-form-name">Add-On Name *</label>
              <input
                type="text"
                className="form-input"
                id="addon-form-name"
                required
                placeholder="e.g. Paid Ads Support"
                value={addonForm.name}
                onChange={(e) => setAddonForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="addon-form-description">Description *</label>
              <input
                type="text"
                className="form-input"
                id="addon-form-description"
                required
                placeholder="Brief, concise description of work scope."
                value={addonForm.description}
                onChange={(e) => setAddonForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="addon-form-price">Price ($) *</label>
                <input
                  type="number"
                  className="form-input"
                  id="addon-form-price"
                  required
                  placeholder="250"
                  min="0"
                  value={addonForm.price}
                  onChange={(e) => setAddonForm(prev => ({ ...prev, price: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="addon-form-type">Pricing Structure *</label>
                <select
                  className="form-input"
                  id="addon-form-type"
                  required
                  style={{ background: 'var(--admin-bg-slate)' }}
                  value={addonForm.pricingType}
                  onChange={(e) => setAddonForm(prev => ({ ...prev, pricingType: e.target.value }))}
                >
                  <option value="per_item">Per Item</option>
                  <option value="per_hour">Per Hour</option>
                  <option value="per_month">Per Month</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
              <label className="switch">
                <input
                  type="checkbox"
                  id="addon-form-active"
                  checked={addonForm.active !== false}
                  onChange={(e) => setAddonForm(prev => ({ ...prev, active: e.target.checked }))}
                />
                <span className="slider"></span>
              </label>
              <span>Add-on Active</span>
            </div>

            <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '12px' }}>
              Save Custom Add-On
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
