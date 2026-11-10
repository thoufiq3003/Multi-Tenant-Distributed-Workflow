import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, GitBranch, Radio, Workflow, ShieldCheck, KeyRound, Repeat, Database, Gauge, Undo2, Network, Zap, PencilRuler, Play, Activity } from "lucide-react";
import { api, formatDate } from "../services/api";
import { isAuthenticated } from "../services/auth";
import { Reveal, CountUp, RotatingWord, FlowDiagram, spotlight } from "../components/Motion";

const sectors = [
  { icon: Building2, title: "Multi-Tenant Isolation", to: "/organization",
    text: "Every workflow, execution and API key is partitioned per tenant, with a sliding-window rate limit of 180 requests a minute for each workspace." },
  { icon: GitBranch, title: "Saga Orchestration", to: "/workflows/new",
    text: "Design visual DAGs with triggers, actions, conditions and compensation nodes. Failed runs roll back automatically with distributed Saga compensation." },
  { icon: Radio, title: "Live Execution Tracing", to: "/executions",
    text: "Watch every step stream over WebSockets in real time, with retries, exponential backoff and detailed logs when something goes wrong." }
];

const capabilities = [
  [ShieldCheck, "DAG validation"], [KeyRound, "SHA-256 hashed API keys"], [Repeat, "Retries with backoff"],
  [Database, "MongoDB Change Streams"], [Gauge, "Per-tenant rate limits"], [Undo2, "Saga compensation"], [Network, "Socket.IO streaming"]
];

const steps = [
  [PencilRuler, "Design", "Drag triggers, actions, conditions and compensation nodes onto the canvas."],
  [ShieldCheck, "Validate", "Cycle, orphan and duplicate-step checks run before anything executes."],
  [Play, "Run", "Real HTTP calls fire with retries, backoff and per-tenant rate limits."],
  [Activity, "Monitor", "Watch each node light up live, with automatic Saga rollback on failure."]
];

const faqs = [
  ["How is each tenant's data kept separate?", "Every request carries the x-tenant-id header, and workflows, executions and API keys are all scoped to that tenant. Cross-tenant keys are rejected with a 401."],
  ["What happens when a workflow step fails?", "The engine retries with exponential backoff. If the step still fails, the Saga compensation nodes run in reverse so the run ends in a consistent state."],
  ["Can I see runs while they are happening?", "Yes. Execution progress streams to the UI over WebSockets, and each node in the builder lights up as it runs, completes, fails or compensates."],
  ["How are API keys stored?", "Keys are hashed with SHA-256 and a server-side pepper. The plaintext key is shown only once, at creation."],
  ["Can workflows start automatically?", "Yes. The MongoDB Change Stream trigger engine can start workflows reactively when matching data changes."]
];

export default function Home() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const authed = isAuthenticated();
  const [metrics, setMetrics] = useState({ executionCount: 0, completed: 0, running: 0, failed: 0, recentExecutions: [] });
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    // SECURITY: Unauthenticated public visitors NEVER query private tenant APIs
    if (!authed) return;
    Promise.all([api("/metrics"), api("/workflows")])
      .then(([m, w]) => { setMetrics(m); setWorkflows(w); })
      .catch(() => {});
  }, [authed]);

  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [hash]);

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <span className="blob blob-a" /><span className="blob blob-b" /><span className="blob blob-c" />
        <div className="home-wrap hero-grid">
          <div>
            <div className="home-eyebrow">Workflow orchestration platform</div>
            <h1>Workflows that <em><RotatingWord words={["perform", "scale", "recover", "stream"]} /></em>. Orchestrated for industry leaders.</h1>
            <p className="home-lead">Build, run and monitor distributed workflows with multi-tenant isolation, real HTTP dispatch and Saga rollback, all from one workspace.</p>
            <div className="hero-actions">
              {authed ? (
                <>
                  <Link to="/workflows/new" className="button button-primary">Build a workflow <ArrowRight size={16} /></Link>
                  <Link to="/dashboard" className="button button-secondary">Open dashboard</Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="button button-primary">Get started free <ArrowRight size={16} /></Link>
                  <Link to="/login" className="button button-secondary">Sign in to workspace</Link>
                </>
              )}
            </div>
            <div className="hero-tags"><span><Zap size={14} />Multi-tenant</span><span><Undo2 size={14} />Saga rollback</span><span><Radio size={14} />Real-time streaming</span></div>
          </div>

          <div className="hero-visual">
            <span className="hero-badge">{authed ? "Live data" : "Engine preview"}</span>
            <span className="float-chip chip-1"><ShieldCheck size={14} />{authed ? "Tenant isolated" : "Multi-tenant DAG"}</span>
            <span className="float-chip chip-2"><Gauge size={14} />{authed ? "180 req/min" : "1,000+ Concurrent"}</span>
            <FlowDiagram />
            <h3>{authed ? "Workspace activity" : "Distributed Saga Orchestrator"}</h3>
            <p>{authed ? "Pulled from your current tenant" : "Fault-tolerant workflow execution engine"}</p>
            {authed ? (
              <>
                <div className="hero-metrics">
                  <div><strong><CountUp value={metrics.executionCount} /></strong><span>Executions</span></div>
                  <div><strong><CountUp value={metrics.completed} /></strong><span>Completed</span></div>
                  <div><strong><CountUp value={metrics.failed} /></strong><span>Failed</span></div>
                </div>
                <div className="hero-feed">
                  {metrics.recentExecutions.slice(0, 4).map(item => (
                    <button key={item.id} className="hero-feed-item" onClick={() => navigate(`/executions/${item.id}`)}>
                      <span className={`dot ${item.status.toLowerCase()}`} />
                      <b>{item.workflowName || item.name}</b>
                      <small>{formatDate(item.startedAt)}</small>
                    </button>
                  ))}
                  {metrics.recentExecutions.length === 0 && <div className="hero-feed-item"><span className="dot" /><b>No executions yet</b><small>Run a workflow to see it here</small></div>}
                </div>
              </>
            ) : (
              <>
                <div className="hero-metrics">
                  <div><strong>1,000+</strong><span>Concurrent DAGs</span></div>
                  <div><strong>100%</strong><span>Saga Rollback</span></div>
                  <div><strong>&lt; 5ms</strong><span>Event Trigger</span></div>
                </div>
                <div className="hero-feed">
                  <div className="hero-feed-item">
                    <span className="dot completed" />
                    <b>1. Reactive Change Stream Ingestion</b>
                    <small>MongoDB Change Streams</small>
                  </div>
                  <div className="hero-feed-item">
                    <span className="dot completed" />
                    <b>2. Isolated Script Sandbox</b>
                    <small>Secure Node.js VM runtime</small>
                  </div>
                  <div className="hero-feed-item">
                    <span className="dot running" />
                    <b>3. Distributed Saga Rollback</b>
                    <small>Reverse-order compensation</small>
                  </div>
                  <div className="hero-feed-item">
                    <span className="dot" />
                    <b>4. Dead-Letter Queue (DLQ)</b>
                    <small>Automatic failure recovery</small>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker" aria-hidden="true"><div className="ticker-track">
        {[...capabilities, ...capabilities, ...capabilities].map(([Icon, label], i) => <span key={i}><Icon size={16} />{label}</span>)}
      </div></div>

      {/* THREE PILLARS (like Yucca's Food Service / Processing / Agriculture) */}
      <section id="features">
        <div className="home-wrap">
          <Reveal><div className="home-eyebrow">Platform</div>
          <h2>Engineered for every kind of pipeline.</h2>
          <p className="home-lead">From tenant isolation to compensation logic, each part of the engine is built for mission-critical automation.</p></Reveal>
          <div className="sector-grid">
            {sectors.map(({ icon: Icon, title, text, to }, i) => (
              <Reveal key={title} delay={i * 120}><Link to={authed ? to : "/login"} className="sector-card" onMouseMove={spotlight}>
                <div className="sector-icon"><Icon size={28} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="link-arrow">{authed ? "Open section" : "Learn more"} <ArrowRight size={17} /></span>
              </Link></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ paddingTop: 0 }}>
        <div className="home-wrap">
          <Reveal><div className="home-eyebrow">How it works</div><h2>From idea to running workflow in four steps.</h2></Reveal>
          <div className="steps">
            {steps.map(([Icon, title, text], i) => (
              <Reveal key={title} delay={i * 140} className="step">
                <div className="step-num"><Icon size={22} /><b>{i + 1}</b></div>
                <h3>{title}</h3><p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE NUMBERS / PROJECT STATS */}
      <section className="stats-band" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="home-wrap">
          <Reveal className="stats-row">
            {authed ? (
              <>
                <div><strong><CountUp value={metrics.executionCount} /></strong><span>Executions run</span></div>
                <div><strong><CountUp value={workflows.length} /></strong><span>Workflows in this tenant</span></div>
                <div><strong><CountUp value={3} /></strong><span>Isolated demo tenants</span></div>
                <div><strong><CountUp value={180} /></strong><span>Requests / min / tenant</span></div>
              </>
            ) : (
              <>
                <div><strong>1,000+</strong><span>Stress tested pipelines</span></div>
                <div><strong>180</strong><span>Req/min tenant rate limit</span></div>
                <div><strong>28/28</strong><span>Automated test suites</span></div>
                <div><strong>0ms</strong><span>Saga data inconsistency</span></div>
              </>
            )}
          </Reveal>
        </div>
      </section>

      {/* MISSION / VISION */}
      <section className="band-green">
        <div className="home-wrap">
          <div className="mv-grid">
            <div>
              <div className="home-eyebrow">About Aegisflow</div>
              <h2>Committed to reliability, always evolving.</h2>
              <p className="home-lead">Dependable automation is our promise. Anything that doesn't meet the standard is retried, compensated and refined until it does.</p>
            </div>
            <div className="mv-card"><h3>Our Mission</h3><p>Give teams a resilient, observable engine to orchestrate distributed workflows across every tenant and service.</p></div>
            <div className="mv-card"><h3>Our Vision</h3><p>To be the trusted standard for workflow orchestration, known for safe rollbacks, reliable execution and open integrations.</p></div>
          </div>
          <div className="marquee">{["Quality", "Isolation", "Security", "Observability", "Resilience", "Integrations"].map(x => <span key={x}>{x}</span>)}</div>
        </div>
      </section>

      {/* WORKFLOWS SECTION */}
      <section id="templates">
        <div className="home-wrap">
          <div className="product-head">
            <div>
              <div className="home-eyebrow">Workflows</div>
              <h2 style={{ margin: 0 }}>{authed ? "Your latest workflows" : "Core Workflow Architectures"}</h2>
            </div>
            {authed ? (
              <Link to="/workflows" className="button button-secondary">View all workflows</Link>
            ) : (
              <Link to="/login" className="button button-secondary">Sign in to view workflows →</Link>
            )}
          </div>
          <div className="product-grid">
            {authed ? (
              <>
                {workflows.slice(0, 4).map((w, i) => (
                  <Reveal key={w.id} delay={i * 90}>
                    <button className="product-card" onClick={() => navigate("/workflows")} onMouseMove={spotlight}>
                      <div className="product-thumb"><Workflow size={44} /></div>
                      <h4>{w.name}</h4>
                      <div className="product-chips"><span>{w.status}</span><span>{w.nodes?.length || 0} nodes</span></div>
                      <small>Open in workflows →</small>
                    </button>
                  </Reveal>
                ))}
                {workflows.length === 0 && (
                  <div className="product-empty">
                    No workflows in this tenant yet. <Link to="/workflows/new" className="text-link">Create the first one →</Link>
                  </div>
                )}
              </>
            ) : (
              <>
                <Reveal delay={0}>
                  <div className="product-card" onMouseMove={spotlight}>
                    <div className="product-thumb"><Workflow size={44} /></div>
                    <h4>E-Commerce Order Saga</h4>
                    <p style={{ fontSize: 13, color: '#6b7a72', margin: '6px 0 12px' }}>Inventory reservation, payment dispatch, and automatic reverse-order compensation rollback.</p>
                    <div className="product-chips"><span>Active</span><span>6 nodes · Saga</span></div>
                  </div>
                </Reveal>
                <Reveal delay={90}>
                  <div className="product-card" onMouseMove={spotlight}>
                    <div className="product-thumb"><Workflow size={44} /></div>
                    <h4>Reactive Change Stream Ingestion</h4>
                    <p style={{ fontSize: 13, color: '#6b7a72', margin: '6px 0 12px' }}>MongoDB Change Streams triggering event-driven pipeline executions without continuous polling.</p>
                    <div className="product-chips"><span>Reactive</span><span>4 nodes · Event</span></div>
                  </div>
                </Reveal>
                <Reveal delay={180}>
                  <div className="product-card" onMouseMove={spotlight}>
                    <div className="product-thumb"><Workflow size={44} /></div>
                    <h4>Isolated VM Data Transformation</h4>
                    <p style={{ fontSize: 13, color: '#6b7a72', margin: '6px 0 12px' }}>Sandboxed user JavaScript execution with hard execution timeouts and sandbox isolation.</p>
                    <div className="product-chips"><span>Secure</span><span>3 nodes · Transform</span></div>
                  </div>
                </Reveal>
                <Reveal delay={270}>
                  <div className="product-card" onMouseMove={spotlight}>
                    <div className="product-thumb"><Workflow size={44} /></div>
                    <h4>Dead-Letter Queue (DLQ) Recovery</h4>
                    <p style={{ fontSize: 13, color: '#6b7a72', margin: '6px 0 12px' }}>Automatic failure capture, exponential backoff retries, and one-click execution replay.</p>
                    <div className="product-chips"><span>Fault-Tolerant</span><span>5 nodes · DLQ</span></div>
                  </div>
                </Reveal>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CUSTOM SOLUTIONS BAND */}
      <section style={{ paddingTop: 0 }}>
        <div className="home-wrap">
          <Reveal className="custom-band">
            <div><div className="home-eyebrow">Custom solutions</div><h2>Teams that thrive invest in custom-designed workflows. Let's build yours.</h2></div>
            <Link to={authed ? "/workflows/new" : "/register"} className="button button-accent">
              {authed ? "Start building" : "Get started free"} <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* STANDARDS → CAPABILITIES */}
      <section id="architecture" style={{ paddingTop: 0 }}>
        <div className="home-wrap">
          <div className="home-eyebrow">Under the hood</div>
          <h2>Engine capabilities</h2>
          <p className="home-lead">Every piece is tested and built to the same high standard.</p>
          <div className="cert-grid">{capabilities.map(([Icon, label], i) => <Reveal as="span" delay={i * 70} className="cert" key={label}><Icon size={17} />{label}</Reveal>)}</div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: "#fff" }}>
        <div className="home-wrap faq-grid">
          <div><div className="home-eyebrow">FAQ</div><h2>Frequently asked questions</h2><p className="home-lead">Quick answers about how Aegisflow works.</p></div>
          <div className="faq-list">{faqs.map(([q, a]) => <details className="faq-item" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>
    </div>
  );
}
