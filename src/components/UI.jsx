import React from "react";
import { ArrowUpRight, CheckCircle2, Clock3, XCircle, LoaderCircle, MoreHorizontal, Search } from "lucide-react";

export function PageHeader({ eyebrow, title, description, actions }) {
  return <div className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</div>;
}
export function Button({ children, variant="primary", icon: Icon, onClick, type="button", disabled=false }) {
  return <button type={type} disabled={disabled} className={`button button-${variant}`} onClick={onClick}>{Icon && <Icon size={16}/>}<span>{children}</span></button>;
}
export function StatusBadge({ status }) {
  const key = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`status-badge status-${key}`}><i/>{status}</span>;
}
export function SearchBox({ value, onChange, placeholder="Search..." }) {
  return <label className="table-search"><Search size={15}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;
}
export function StatCard({ title, value, change, icon: Icon, tone="blue" }) {
  return <div className="stat-card"><div className={`stat-icon tone-${tone}`}><Icon size={19}/></div><div className="stat-copy"><span>{title}</span><strong>{value}</strong><small className={change?.startsWith("↓") ? "change-negative" : "change-positive"}>{change}</small></div></div>;
}
export function ExecutionRows({ items, compact=false, onSelect }) {
  const iconFor = status => status === "Completed" ? CheckCircle2 : status === "Running" ? Clock3 : XCircle;
  return <div className={`execution-rows ${compact ? "compact" : ""}`}>{items.map(item => {
    const Icon = iconFor(item.status);
    return <button className="execution-row" key={item.id} onClick={() => onSelect?.(item)}>
      <span className={`execution-status-icon ${item.status.toLowerCase()}`}><Icon size={19}/></span>
      <span className="execution-description"><strong>{item.name}</strong><small>{item.id}</small></span>
      <span className="execution-row-meta"><StatusBadge status={item.status}/><small>{item.duration} · {item.ago || item.started}</small></span>
    </button>;
  })}</div>;
}
export function EmptyState({ title, message }) { return <div className="empty-state"><div className="empty-icon"><LoaderCircle size={22}/></div><strong>{title}</strong><p>{message}</p></div>; }
export function TableActions() { return <button className="icon-button subtle-icon" aria-label="More actions"><MoreHorizontal size={18}/></button>; }
export function ExternalAction() { return <ArrowUpRight size={15}/>; }
