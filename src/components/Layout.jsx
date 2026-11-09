import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import {
  Activity, AlertTriangle, Bell, Building2, ChevronDown, LayoutDashboard, Plug, Search,
  Settings, ShieldCheck, Workflow, X, Check, Plus, Menu
} from "lucide-react";
import { getActiveTenantMeta, setActiveTenant, KNOWN_TENANTS } from "../services/api";

// Same destinations as before — now arranged like a marketing-site header (flat links + dropdown groups)
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workflows", label: "Workflows", icon: Workflow },
  { label: "Operations", icon: Activity, children: [
    { to: "/executions", label: "Executions", desc: "Live and historical runs", icon: Activity },
    { to: "/failures", label: "Failures & Retries", desc: "Retry policies and compensation", icon: AlertTriangle },
    { to: "/integrations", label: "Integrations", desc: "Connected services", icon: Plug }
  ]},
  { to: "/organization", label: "Organization", icon: Building2 },
  { label: "Resources", icon: Settings, children: [
    { to: "/settings", label: "Settings", desc: "API keys, preferences, security", icon: Settings },
    { to: "/admin", label: "Admin Monitoring", desc: "Workers, tenants and usage", icon: ShieldCheck }
  ]}
];

export default function Layout() {
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenant, setTenant] = useState(getActiveTenantMeta);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customTenantId, setCustomTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const dropdownRef = useRef(null);
  const location = useLocation();

  useEffect(() => { const t = setTimeout(() => setLoading(false), 1100); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setScrolled(h.scrollTop > 24);
      setProgress(h.scrollHeight > h.clientHeight ? (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setMobileOpen(false); window.scrollTo({ top: 0 }); }, [location.pathname]);

  useEffect(() => {
    const handleTenantChange = () => setTenant(getActiveTenantMeta());
    window.addEventListener("flowpilot:tenant-changed", handleTenantChange);
    return () => window.removeEventListener("flowpilot:tenant-changed", handleTenantChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const selectTenant = (id, name) => {
    setActiveTenant(id, name);
    setTenant(getActiveTenantMeta());
    setDropdownOpen(false);
  };

  const handleCustomTenantSubmit = (e) => {
    e.preventDefault();
    const clean = customTenantId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (clean.length >= 2) { selectTenant(clean, clean.toUpperCase()); setCustomTenantId(""); }
  };

  return (
    <div className="app-shell">
      {loading && <div className="page-loader" aria-hidden="true"><div className="logo-mark"><Workflow size={30} /></div></div>}

      <div className="promo-bar">Run every workflow with Saga rollback built in. <Link to="/workflows/new">Build your first workflow →</Link></div>

      <div className="scroll-progress" style={{ width: `${progress}%` }} />
      <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
        <div className="site-header-inner">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <Link to="/" className="logo"><span className="logo-mark"><Workflow size={20} /></span>FlowPilot</Link>

          <nav className="site-nav" aria-label="Main">
            {navItems.map(item => item.children ? (
              <div className="nav-dropdown" key={item.label}>
                <button className="site-nav-trigger" type="button">{item.label}<ChevronDown size={15} /></button>
                <div className="nav-dropdown-menu">
                  {item.children.map(c => {
                    const Icon = c.icon;
                    return (
                      <NavLink key={c.to} to={c.to} className={({ isActive }) => (isActive ? "active" : "")}>
                        <span className="dd-icon"><Icon size={17} /></span>
                        <span>{c.label}<small>{c.desc}</small></span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `site-nav-link ${isActive ? "active" : ""}`}>{item.label}</NavLink>
            ))}
          </nav>

          <div className="site-header-actions">
            <label className="global-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows, executions..." /></label>
            <button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><i /></button>

            {/* Multi-tenant switcher — logic unchanged */}
            <div className="tenant-pill" ref={dropdownRef}>
              <button type="button" className="workspace-switch-btn" onClick={() => setDropdownOpen(!dropdownOpen)} title="Click to switch workspace tenant" aria-expanded={dropdownOpen}>
                <div className="workspace-avatar">{tenant.avatar || "T"}</div>
                <div className="workspace-copy"><strong>{tenant.name}</strong><span>{tenant.plan || tenant.id}</span></div>
                <ChevronDown size={15} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {dropdownOpen && (
                <div className="workspace-dropdown-menu">
                  <div className="workspace-dropdown-title">SELECT TENANT WORKSPACE</div>
                  {KNOWN_TENANTS.map(t => (
                    <button key={t.id} type="button" className={`workspace-dropdown-item ${t.id === tenant.id ? "active" : ""}`} onClick={() => selectTenant(t.id, t.name)}>
                      <span className="item-avatar">{t.avatar}</span>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{t.name}</div><div style={{ fontSize: 11, color: "#6b7a72" }}>{t.id}</div></div>
                      {t.id === tenant.id && <Check size={15} style={{ color: "#13633f" }} />}
                    </button>
                  ))}
                  <form className="workspace-dropdown-custom" onSubmit={handleCustomTenantSubmit}>
                    <input type="text" placeholder="Enter custom tenant ID..." value={customTenantId} onChange={e => setCustomTenantId(e.target.value)} maxLength={40} />
                    <button type="submit" disabled={!customTenantId.trim()}><Plus size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />Switch Tenant</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`mobile-drawer ${mobileOpen ? "open" : ""}`}>
        <button className="icon-button" style={{ alignSelf: "flex-end" }} onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={22} /></button>
        <NavLink to="/" end className="site-nav-link">Home</NavLink>
        {navItems.map(item => item.children ? (
          <React.Fragment key={item.label}>
            <div className="drawer-label">{item.label.toUpperCase()}</div>
            {item.children.map(c => <NavLink key={c.to} to={c.to} className={({ isActive }) => `site-nav-link ${isActive ? "active" : ""}`}>{c.label}</NavLink>)}
          </React.Fragment>
        ) : <NavLink key={item.to} to={item.to} className={({ isActive }) => `site-nav-link ${isActive ? "active" : ""}`}>{item.label}</NavLink>)}
        <Link to="/workflows/new" className="button button-primary" style={{ marginTop: 18 }}>New workflow</Link>
      </aside>

      <div className="app-main">
        {/* Keying on tenant.id keeps per-tenant data isolated on every switch */}
        <div className="page-area" key={tenant.id}>
          <div className="route-fade" key={location.pathname}>
          <Outlet context={{ globalSearch: search, tenant }} />
          </div>
        </div>

        <footer className="site-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="logo"><span className="logo-mark"><Workflow size={20} /></span>FlowPilot</Link>
              <p>Multi-tenant distributed workflow and Saga orchestration. Innovated for industry leaders.</p>
            </div>
            <div><h5>Platform</h5><Link to="/dashboard">Dashboard</Link><Link to="/workflows">Workflows</Link><Link to="/workflows/new">Workflow builder</Link><Link to="/executions">Executions</Link></div>
            <div><h5>Operations</h5><Link to="/failures">Failures & Retries</Link><Link to="/integrations">Integrations</Link><Link to="/organization">Organization</Link></div>
            <div><h5>Resources</h5><Link to="/settings">Settings</Link><Link to="/admin">Admin Monitoring</Link><Link to="/#faq">FAQs</Link></div>
          </div>
          <div className="footer-bottom"><span>FlowPilot {new Date().getFullYear()}. All Rights Reserved</span><span>Workspace: {tenant.name} ({tenant.id})</span></div>
        </footer>
      </div>

    </div>
  );
}
