import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Activity, AlertTriangle, Bell, Building2, ChevronDown, CircleHelp,
  LayoutDashboard, Plug, Search, Settings, ShieldCheck, Workflow, Users, X,
} from "lucide-react";

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
  const [search, setSearch] = React.useState("");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  return (
    <div className="app-shell">
      {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Workflow size={20} /></div>
          <div><strong>FlowPilot</strong><span>Workflow Automation</span></div>
          <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy"><strong>Acme Ltd.</strong><span>Enterprise workspace</span></div>
          <ChevronDown size={15} />
        </div>
        <nav className="main-nav">
          {navGroups.map(group => <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map(item => {
              const Icon = item.icon;
              return <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className={({isActive}) => `nav-link ${isActive ? "active" : ""}`}>
                <Icon size={17} strokeWidth={1.9}/><span>{item.label}</span>
              </NavLink>;
            })}
          </div>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><CircleHelp size={17}/><div><strong>Need a hand?</strong><span>Visit help center</span></div></div>
          <div className="profile">
            <div className="avatar">JD</div><div className="profile-copy"><strong>John Doe</strong><span>Workspace Admin</span></div><ChevronDown size={15}/>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><span className="hamburger">☰</span></button>
          <label className="global-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows, executions..." /><kbd>⌘ K</kbd></label>
          <div className="topbar-actions">
            <button className="icon-button notification" aria-label="Notifications"><Bell size={18}/><i/></button>
            <div className="topbar-user"><div className="avatar small">JD</div><div><strong>John Doe</strong><span>Admin</span></div><ChevronDown size={15}/></div>
          </div>
        </header>
        <div className="page-area"><Outlet context={{globalSearch: search}} /></div>
      </div>
    </div>
  );
}
