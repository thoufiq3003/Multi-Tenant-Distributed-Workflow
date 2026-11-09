import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { Activity, AlertTriangle, Gauge, RefreshCw, Timer } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, StatCard, Button, EmptyState } from "../components/UI";
import "./admin.css";

const hourLabel = iso => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const tenantName = id => ({ "demo-tenant": "Acme Ltd.", "globex-corp": "Globex Corp.", "stark-tech": "Stark Industries" }[id] || id);

function quotaTone(pct) { return pct >= 90 ? "danger" : pct >= 70 ? "warn" : "ok"; }

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async () => {
    try { setData(await api("/admin/overview")); setError(""); setUpdated(new Date()); }
    catch (e) { setError(e.message); }
  }, []);

  // Poll so quotas and latency stay live without a page reload
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  if (!data) {
    return <div className="page-content"><PageHeader eyebrow="PLATFORM OPERATIONS" title="Admin Monitoring" description="Tenant quotas, failure heatmap and worker latency."/>
      <div className={error ? "validation-errors" : "table-empty"}>{error || "Loading metrics…"}</div></div>;
  }

  const { summary, quotas, heatmap, latency, rateLimitPerMin } = data;
  const maxCell = Math.max(1, ...heatmap.rows.flatMap(r => r.counts));
  const latencyData = latency.map(l => ({ ...l, label: hourLabel(l.time) }));
  const hasLatency = latency.some(l => l.runs > 0);

  return <div className="page-content">
    <PageHeader eyebrow="PLATFORM OPERATIONS" title="Admin Monitoring" description="Tenant quotas, failure heatmap and worker latency, refreshed every 5 seconds."
      actions={<><span className="live-pill"><i/> Live{updated ? ` · ${updated.toLocaleTimeString()}` : ""}</span><Button variant="secondary" icon={RefreshCw} onClick={load}>Refresh</Button></>}/>

    {error && <div className="validation-errors"><div>{error}</div></div>}

    <div className="stats-grid">
      <StatCard title="Total runs" value={summary.totalRuns} change={`${summary.running} running now`} icon={Activity} tone="blue"/>
      <StatCard title="Avg. duration" value={`${summary.avgMs} ms`} change="Across all tenants" icon={Timer} tone="green"/>
      <StatCard title="p95 duration" value={`${summary.p95Ms} ms`} change="Slowest 5% of runs" icon={Gauge} tone="purple"/>
      <StatCard title="Failed runs" value={summary.failed} change="Failed or compensated" icon={AlertTriangle} tone="red"/>
    </div>

    <section className="panel admin-block">
      <div className="panel-heading"><div><h2>Tenant quotas</h2><p>API requests in the last 60 seconds against the per-tenant limit</p></div><span className="soft-label">{rateLimitPerMin} req/min</span></div>
      <div className="quota-list">
        {quotas.map(q => {
          const pct = Math.min(100, Math.round((q.used / q.limit) * 100));
          return <div className="quota-item" key={q.tenantId}>
            <div className="quota-meta"><strong>{tenantName(q.tenantId)}</strong><small>{q.tenantId} · {q.executions} runs · {q.failed} failed</small></div>
            <div className={`quota-bar ${quotaTone(pct)}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${tenantName(q.tenantId)} quota`}><i style={{ width: `${pct}%` }}/></div>
            <span className="quota-figure">{q.used} / {q.limit}<small>{pct}%</small></span>
          </div>;
        })}
      </div>
    </section>

    <div className="admin-grid">
      <section className="panel admin-chart-panel">
        <div className="panel-heading"><div><h2>Worker latency</h2><p>Average and slowest run duration per hour</p></div><span className="soft-label">Last 6 hours</span></div>
        {hasLatency ? <div className="admin-chart"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={latencyData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e7ebf0" strokeDasharray="3 4"/>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8791a1", fontSize: 11 }}/>
            <YAxis axisLine={false} tickLine={false} width={48} tick={{ fill: "#8791a1", fontSize: 11 }} unit=" ms"/>
            <Tooltip/><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }}/>
            <Line type="monotone" dataKey="avgMs" name="Average (ms)" stroke="#13633f" strokeWidth={2} dot={{ r: 3 }}/>
            <Line type="monotone" dataKey="maxMs" name="Slowest (ms)" stroke="#e4545b" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }}/>
          </LineChart></ResponsiveContainer></div>
          : <EmptyState title="No runs yet" message="Run a workflow and its duration will appear here."/>}
      </section>

      <section className="panel admin-chart-panel">
        <div className="panel-heading"><div><h2>Failure heatmap</h2><p>Failed steps by hour; darker cells mean more failures</p></div><span className="soft-label">Last 6 hours</span></div>
        {heatmap.rows.length === 0 ? <EmptyState title="No failed steps" message="Steps that fail will appear here, grouped by hour."/> :
          <div className="heatmap" style={{ "--cols": heatmap.hours.length }}>
            <div className="heat-row heat-head"><span/>{heatmap.hours.map(h => <span key={h}>{hourLabel(h)}</span>)}</div>
            {heatmap.rows.map(r => <div className="heat-row" key={r.step}>
              <span className="heat-label" title={r.step}>{r.step}</span>
              {r.counts.map((c, i) => <span key={i} className={`heat-cell ${c ? "hit" : ""}`} style={c ? { "--heat": 0.18 + 0.82 * (c / maxCell) } : undefined} title={`${r.step}: ${c} failure${c === 1 ? "" : "s"} at ${hourLabel(heatmap.hours[i])}`}>{c || ""}</span>)}
            </div>)}
          </div>}
      </section>
    </div>
  </div>;
}
