import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Activity, AlertTriangle, Bell, Building2, ChevronDown, CircleHelp,
  LayoutDashboard, Plug, Search, Settings, ShieldCheck, Workflow, Users, X, Check, Plus
} from "lucide-react";
import { getActiveTenantMeta, setActiveTenant, KNOWN_TENANTS } from "../services/api";

const navGroups = [
  { label: "WORKSPACE", items: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/workflows", label: "Workflows", icon: Workflow },
    { to: "/executions", label: "Executions", icon: Activity },
    { to: "/integrations", label: "Integrations", icon: Plug }
  ]},
  { label: "OPERATIONS", items: [
    { to: "/failures", label: "Failures & Retries", icon: AlertTriangle },
    { to: "/organization", label: "Organization", icon: Building2 },
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/admin", label: "Admin Monitoring", icon: ShieldCheck }
  ]}
];

export default function Layout() {
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenant, setTenant] = useState(getActiveTenantMeta);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customTenantId, setCustomTenantId] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleTenantChange = () => {
      setTenant(getActiveTenantMeta());
    };
    window.addEventListener("flowpilot:tenant-changed", handleTenantChange);
    return () => window.removeEventListener("flowpilot:tenant-changed", handleTenantChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
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
    if (clean.length >= 2) {
      selectTenant(clean, clean.toUpperCase());
      setCustomTenantId("");
    }
  };

  return (
    <div className="app-shell">
      {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Workflow size={20} /></div>
          <div><strong>FlowPilot</strong><span>Workflow Automation</span></div>
          <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button>
        </div>

        {/* Interactive Multi-Tenant Switcher */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            type="button"
            className="workspace-switch-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Click to switch workspace tenant"
            aria-expanded={dropdownOpen}
          >
            <div className="workspace-avatar">{tenant.avatar || "T"}</div>
            <div className="workspace-copy">
              <strong>{tenant.name}</strong>
              <span>{tenant.plan || tenant.id}</span>
            </div>
            <ChevronDown size={15} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>

          {dropdownOpen && (
            <div className="workspace-dropdown-menu">
              <div className="workspace-dropdown-title">SELECT TENANT WORKSPACE</div>
              {KNOWN_TENANTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`workspace-dropdown-item ${t.id === tenant.id ? "active" : ""}`}
                  onClick={() => selectTenant(t.id, t.name)}
                >
                  <span className="item-avatar">{t.avatar}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 9, color: "#8fa3bd" }}>{t.id}</div>
                  </div>
                  {t.id === tenant.id && <Check size={14} style={{ color: "#60a5fa" }} />}
                </button>
              ))}

              <form className="workspace-dropdown-custom" onSubmit={handleCustomTenantSubmit}>
                <input
                  type="text"
                  placeholder="Enter custom tenant ID..."
                  value={customTenantId}
                  onChange={(e) => setCustomTenantId(e.target.value)}
                  maxLength={40}
                />
                <button type="submit" disabled={!customTenantId.trim()}>
                  <Plus size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                  Switch Tenant
                </button>
              </form>
            </div>
          )}
        </div>

        <nav className="main-nav">
          {navGroups.map(group => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({isActive}) => `nav-link ${isActive ? "active" : ""}`}
                  >
                    <Icon size={17} strokeWidth={1.9}/><span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card"><CircleHelp size={17}/><div><strong>Need a hand?</strong><span>Visit help center</span></div></div>
          <div className="profile">
            <div className="avatar">JD</div>
            <div className="profile-copy">
              <strong>John Doe</strong>
              <span>{tenant.name} Admin</span>
            </div>
            <ChevronDown size={15}/>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><span className="hamburger">☰</span></button>
          <label className="global-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows, executions..." /><kbd>⌘ K</kbd></label>
          <div className="topbar-actions">
            <button className="icon-button notification" aria-label="Notifications"><Bell size={18}/><i/></button>
            <div className="topbar-user"><div className="avatar small">JD</div><div><strong>John Doe</strong><span>Admin ({tenant.id})</span></div><ChevronDown size={15}/></div>
          </div>
        </header>

        {/* Keying the page area on tenant.id ensures fresh isolated data reload across views */}
        <div className="page-area" key={tenant.id}>
          <Outlet context={{ globalSearch: search, tenant }} />
        </div>
      </div>
    </div>
  );
}

// name is updated 
