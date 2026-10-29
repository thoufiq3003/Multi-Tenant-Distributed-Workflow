import React, { useState, useEffect, useCallback } from "react";
import { Building2, Users, KeyRound, Gauge, Plus, MoreHorizontal, CheckCircle2, Trash2, ShieldCheck, Copy } from "lucide-react";
import { Button, PageHeader, StatusBadge } from "../components/UI";
import { api, formatDate, getActiveTenantMeta, getActiveApiKey, setActiveApiKey } from "../services/api";

export default function Organization() {
  const [tenant, setTenant] = useState(getActiveTenantMeta);
  const [tab, setTab] = useState("Organization");
  const [org, setOrg] = useState(tenant.name);
  const [saved, setSaved] = useState(false);
  const [keys, setKeys] = useState([]);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [keyError, setKeyError] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [activeKey, setActiveKeyState] = useState(() => getActiveApiKey(tenant.id));

  const members = [
    ["JD", "John Doe", "john@" + tenant.id + ".com", "Admin"],
    ["SW", "Sarah Wilson", "sarah@" + tenant.id + ".com", "Developer"],
    ["MK", "Mike Chen", "mike@" + tenant.id + ".com", "Viewer"]
  ];

  const loadKeys = useCallback(async () => {
    try {
      const list = await api("/api-keys");
      setKeys(list);
      setKeyError("");
    } catch (e) {
      setKeyError(`Failed to load keys: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    const current = getActiveTenantMeta();
    setTenant(current);
    setOrg(current.name);
    setActiveKeyState(getActiveApiKey(current.id));
    if (tab === "API Keys") {
      loadKeys();
    }
  }, [tab, loadKeys]);

  const createKey = async () => {
    setKeyBusy(true);
    setKeyError("");
    try {
      const item = await api("/api-keys", {
        method: "POST",
        body: JSON.stringify({ label: `${tenant.name} API Key ${keys.length + 1}` })
      });
      setNewlyCreatedKey(item);
      // Automatically register the newly generated key for active tenant requests
      setActiveApiKey(tenant.id, item.key);
      setActiveKeyState(item.key);
      await loadKeys();
    } catch (e) {
      setKeyError(e.message);
    } finally {
      setKeyBusy(false);
    }
  };

  const revokeKey = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this API key? External systems using it will be rejected.")) return;
    try {
      await api(`/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadKeys();
      if (activeKey && keys.find(k => k.id === id)?.lastFour === activeKey.slice(-4)) {
        setActiveApiKey(tenant.id, "");
        setActiveKeyState("");
      }
    } catch (e) {
      setKeyError(e.message);
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="WORKSPACE ADMIN"
        title="Organization"
        description={`Manage organization details, team access, and cryptographic credentials for ${tenant.name} (${tenant.id}).`}
        actions={<Button icon={Plus} onClick={() => alert("Invite link copied for workspace: " + tenant.id)}>Invite member</Button>}
      />

      <div className="org-banner">
        <div className="org-logo"><Building2 size={26} /></div>
        <div>
          <h2>{tenant.name}</h2>
          <p>{tenant.plan || 'Enterprise workspace'} · Tenant ID: <code>{tenant.id}</code></p>
        </div>
        <span className="org-active"><CheckCircle2 size={14} /> Active tenant context</span>
      </div>

      <div className="tab-bar org-tabs">
        {["Organization", "Team Members", "API Keys", "Usage & Quotas"].map(x => (
          <button className={tab === x ? "active" : ""} onClick={() => setTab(x)} key={x}>{x}</button>
        ))}
      </div>

      {tab === "Organization" ? (
        <div className="org-grid">
          <section className="panel settings-panel">
            <h3>Organization details</h3>
            <p>Basic information about your tenant workspace.</p>
            <label className="field-label">
              Organization name
              <input value={org} onChange={e => { setOrg(e.target.value); setSaved(false); }} />
            </label>
            <label className="field-label">
              Workspace identifier (Tenant ID)
              <input value={tenant.id} readOnly disabled style={{ background: "#f8fafc", cursor: "not-allowed" }} />
            </label>
            <label className="field-label">
              Contact email
              <input defaultValue={`admin@${tenant.id}.io`} type="email" />
            </label>
            <div className="settings-actions">
              <Button onClick={() => setSaved(true)}>Save changes</Button>
              {saved && <span className="saved-note"><CheckCircle2 size={14} /> Saved locally</span>}
            </div>
          </section>

          <section className="panel settings-panel">
            <h3>Team members</h3>
            <p>Users authorized to manage this workspace.</p>
            {members.map(m => (
              <div className="member-row" key={m[1]}>
                <div className="avatar">{m[0]}</div>
                <div className="member-copy">
                  <strong>{m[1]}</strong>
                  <small>{m[2]}</small>
                </div>
                <span className="role-chip">{m[3]}</span>
              </div>
            ))}
            <button className="text-link" onClick={() => setTab("Team Members")}>Manage members →</button>
          </section>
        </div>
      ) : tab === "Team Members" ? (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m[1]}>
                    <td className="table-strong">{m[1]}</td>
                    <td>{m[2]}</td>
                    <td>{m[3]}</td>
                    <td><span className="status-badge status-connected"><i />Active</span></td>
                    <td><button className="icon-button" aria-label="More actions"><MoreHorizontal size={17} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "API Keys" ? (
        <div className="panel settings-panel">
          <h3><KeyRound size={18} /> Cryptographic API Keys</h3>
          <p>
            Manage API keys used by external systems, webhooks, and SDKs. Keys are salted and hashed using <strong>SHA-256</strong> on the backend.
          </p>

          <div className="config-info">
            <ShieldCheck size={16} />
            <span>
              <strong>Cryptographic Key Isolation:</strong> Keys generated here are scoped exclusively to <code>{tenant.id}</code>. Requests carrying this key are cryptographically authenticated by the Express middleware.
            </span>
          </div>

          {keyError && <div className="validation-errors"><div>{keyError}</div></div>}

          {newlyCreatedKey && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 14, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#166534", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
                <CheckCircle2 size={16} /> New API Key Generated
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#15803d" }}>
                Copy this plaintext key now. The backend stores only its SHA-256 hash and cannot reveal it again.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ flex: 1, padding: 8, background: "#fff", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 11, color: "#166534" }}>
                  {newlyCreatedKey.key}
                </code>
                <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(newlyCreatedKey.key)}>
                  Copy key
                </Button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 12 }}>Active Keys for {tenant.name}</h4>
            {keys.length === 0 ? (
              <div className="table-empty">No API keys generated for this tenant yet. Click below to create one.</div>
            ) : (
              keys.map(item => (
                <div className="api-key-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <small>•••• •••• •••• {item.lastFour} · Created {formatDate(item.createdAt)}</small>
                  </div>
                  <span className="policy-pill">SHA-256 Hashed</span>
                  <button
                    className="icon-button"
                    title="Revoke key"
                    style={{ color: "#e4545b" }}
                    onClick={() => revokeKey(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <Button disabled={keyBusy} onClick={createKey}>
            {keyBusy ? "Generating Key..." : `Generate API Key for ${tenant.name}`}
          </Button>
        </div>
      ) : (
        <div className="usage-grid">
          <div className="panel usage-card">
            <Gauge size={20} />
            <span>Monthly executions</span>
            <strong>12,840 <small>/ 100,000</small></strong>
            <div className="progress"><i style={{ width: "13%" }} /></div>
            <small>13% of your plan used ({tenant.name})</small>
          </div>
          <div className="panel usage-card">
            <Users size={20} />
            <span>Team seats</span>
            <strong>3 <small>/ 25</small></strong>
            <div className="progress"><i style={{ width: "12%" }} /></div>
            <small>22 seats available in workspace</small>
          </div>
        </div>
      )}
    </div>
  );
}
