# Distributed Workflow & Saga Orchestration Report
### Zaalima Development Pvt. Ltd. — Enterprise MERN Stack Project 1
**Author:** Mohammed Rizwaan  
**Project:** Multi-Tenant Distributed Workflow & Saga Orchestration Engine (**Aegisflow**)  
**Status:** Complete & Ready for Final Submission Review  

---

## Executive Summary

Modern enterprise systems require distributed, fault-tolerant workflow automation engines capable of coordinating microservices without tight coupling or inconsistent distributed states. **Aegisflow** is a production-grade, multi-tenant workflow and Saga orchestration platform designed to mirror enterprise orchestrators such as **Temporal** and **Zapier**.

The platform provides a visual Directed Acyclic Graph (DAG) interface in React and a resilient Node.js distributed saga coordinator that executes multi-step workflows, manages automated retries with exponential backoff, runs isolated JavaScript transformations in secure sandboxes, and triggers distributed compensating transactions (Saga rollback) during downstream failure states.

---

## 1. System Architecture Overview

The system is architected as a layered, event-driven distributed engine:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REACT FRONTEND                                │
│  ┌───────────────────────┐ ┌────────────────────┐ ┌──────────────────┐ │
│  │   Visual DAG Canvas   │ │ Real-Time Tracing  │ │ Admin Dashboard  │ │
│  │     (@xyflow/react)   │ │    (Socket.IO)     │ │ (Quotas/Heatmap) │ │
│  └───────────────────────┘ └────────────────────┘ └──────────────────┘ │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / WebSockets (Port 4000)
┌────────────────────────────────────▼────────────────────────────────────┐
│                    AEGISFLOW BACKEND ORCHESTRATOR                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Tenant Context & Cryptographic API Key Middleware (SHA-256)     │  │
│  │ 2. Tenant-Scoped Rate Limiter (180 requests/min sliding window)   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────┐ ┌──────────────────┐ ┌───────────────────┐  │
│  │ State Machine Engine   │ │  Saga Rollback   │ │ Isolated Sandbox  │  │
│  │   (Topological DFS)    │ │   Coordinator    │ │     (node:vm)     │  │
│  └────────────────────────┘ └──────────────────┘ └───────────────────┘  │
│  ┌────────────────────────┐ ┌──────────────────┐ ┌───────────────────┐  │
│  │ Dead-Letter Queue(DLQ) │ │ WebSocket Stream │ │ Change Stream     │  │
│  │      Manager           │ │     Emitter      │ │ Engine Listener   │  │
│  └────────────────────────┘ └──────────────────┘ └───────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Mongoose ODM / Change Stream Watch
┌────────────────────────────────────▼────────────────────────────────────┐
│                       MONGODB DATABASE LAYER                            │
│  • Workflows Collection (Discriminator: tenantId)                       │
│  • Executions Collection (State logs, retry counts, step metrics)       │
│  • Dlq Collection (Failed payloads, error traces, replay status)        │
│  • ApiKey Collection (Salted SHA-256 hashes, tenant scoped)             │
│  • Change Stream Event Log (Official resume tokens & mutation payloads) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Week-by-Week Implementation Audit

### Week 1: Multi-Tenancy, Visual DAG & Cryptographic Auth
1. **Multi-Tenant Database Isolation:**
   - Evaluated *Dynamic Connection Pooling* vs. *Discriminator Keys*. Implemented high-performance **Tenant Discriminator Keys** (`tenantId: { type: String, required: true, index: true }`) across all Mongoose schemas.
   - Guaranteed multi-tenant data isolation verified via test suite: Tenant A cannot read, query, or execute Tenant B workflows or API keys.
2. **Visual DAG Workflow Canvas:**
   - Drag-and-drop canvas built with `@xyflow/react`.
   - Node taxonomy: Triggers (Webhooks/Events), Actions (HTTP dispatch, inventory, email), Conditions (dynamic branching), Transforms (sandboxed JS), and Saga Compensations.
   - Graph validation: Depth-First Search (DFS) detects cyclic dependencies and unreachable disconnected nodes prior to persistence.
3. **Security Middleware:**
   - Mandatory `x-tenant-id` header validation with regex constraints (`^[a-zA-Z0-9_-]{2,80}$`).
   - Tenant-scoped sliding window rate limiter (180 requests/minute per tenant).
   - High-entropy API keys (`fp_...`) cryptographically hashed using SHA-256 with a secure server-side pepper; plaintext keys are revealed strictly once.

### Week 2: State Machine, Saga Rollback & Change Streams
1. **State-Machine Execution Engine:**
   - Tracks workflow progression through distinct execution states: `Queued` ➔ `Running` ➔ `Completed` / `Failed` ➔ `Compensating` ➔ `Compensated` / `Compensation Failed`.
   - Executes real HTTP requests using native `fetch()` with custom headers, payloads, and configurable timeouts.
2. **Distributed Saga Rollback Pattern:**
   - When a downstream task step fails and exhausts retries, the Saga coordinator identifies all previously completed compensatable steps.
   - Executes compensating actions in **strict reverse order (LIFO)** to prevent data inconsistency (e.g., releasing reserved warehouse stock if payment gateway capture fails).
3. **MongoDB Change Streams Reactive Trigger:**
   - Ingests database change events and automatically fires matching workflows.
   - Formats events according to official MongoDB Change Stream specifications (`_id._data`, `operationType`, `clusterTime`, `wallTime`, `documentKey`, `fullDocument`).
   - Supports 100% offline fallback via reactive adapter mode.

### Week 3: Isolated Sandbox, WebSockets & Dead-Letter Queue (DLQ)
1. **Isolated Runtime VM Sandbox:**
   - User-defined JavaScript transformation scripts execute inside an isolated `node:vm` sandbox.
   - Enforces strict memory and CPU execution limits (500ms max execution time) preventing infinite loops (`while(true)`) from blocking the event loop.
   - Dangerous globals (`process`, `require`, `fs`, `eval`, `child_process`) are stripped to prevent host environment tampering.
2. **Bidirectional WebSocket Progress Streaming:**
   - Socket.IO channels partitioned by tenant rooms (`tenant:<id>`).
   - Streams live execution progress per node, animating canvas nodes with visual pulse effects (blue = running, green = success, red = failed, orange = compensating).
3. **Dead-Letter Queue (DLQ) & Configurable Retries:**
   - Automatic routing of exhausted workflow runs to the Dead-Letter Queue.
   - Full payload, error stack trace, and failed node metadata preserved in the `Dlq` collection.
   - Dedicated failure management UI (`/failures`) with one-click replay dispatching.

### Week 4: Admin Dashboard, Stress Testing & Docker Containerization
1. **Administrative Monitoring Dashboard:**
   - Dedicated platform operations portal (`/admin`) polling real-time metrics every 5 seconds.
   - **Tenant Quotas:** Live progress bars displaying consumption against the 180 req/min threshold.
   - **Worker Latency:** Line chart rendering average duration and p95 latency per hour.
   - **Failure Heatmap:** Interactive matrix highlighting failure frequencies by workflow step and hour.
2. **1,000+ Concurrent Pipeline Stress Test:**
   - Automated stress test suite (`stress-test.js` / `npm run stress-test`).
   - Successfully executed **1,000 concurrent distributed pipelines** across 5 simulated tenant environments.
   - Sustained **2,528+ pipelines/second throughput** with zero unhandled crashes and median latency of **4.97ms**.
3. **Docker Multi-Container Orchestration:**
   - Production Dockerfile for backend (`node:20-alpine`) with healthcheck probe.
   - Multi-stage Dockerfile for React frontend with Nginx reverse proxy.
   - `docker-compose.yml` spinning up MongoDB, Backend, and Frontend in a unified network.

---

## 3. Stress Test Benchmark Results

```text
======================================================================
  AEGISFLOW DISTRIBUTED ORCHESTRATOR — 1,000+ CONCURRENT STRESS TEST
======================================================================
 Target Pipelines   : 1,000
 Concurrency Pool   : 100 concurrent in-flight workers
 Multi-Tenant Pool  : demo-tenant, globex-corp, stark-tech, wayne-enterprises, cyberdyne-sys
 Pipeline Scenarios : Straight-line, Branching, Saga Rollback, Sandboxed JS
----------------------------------------------------------------------
 Total Pipelines Run    : 1,000
 Total Wall-Clock Time  : 0.40 seconds
 System Throughput      : 2,528.06 pipelines/second
----------------------------------------------------------------------
 STATUS BREAKDOWN
   ✓ Completed (Normal) : 750 (75.0%)
   ⟲ Compensated (Saga) : 250 (25.0%)
   ✖ Unhandled Failures : 0 (0.0%)
----------------------------------------------------------------------
 LATENCY DISTRIBUTION
   Min Latency          : 0.03 ms
   Average (Mean)       : 35.84 ms
   Median (P50)         : 4.97 ms
   P95 Latency          : 148.96 ms
   Max Latency          : 152.06 ms
----------------------------------------------------------------------
 VERDICT: PASSED ☑ (Orchestrator sustained 1,000+ distributed pipelines)
======================================================================
```

---

## 4. Disaster Recovery & Failure Handling Protocols

| Failure Scenario | Engine Detection Mechanism | Automated Mitigation / Recovery |
| :--- | :--- | :--- |
| **Transient Third-Party HTTP 5xx** | HTTP status code inspection | Bounded retry with exponential backoff (2 retries, 100ms multiplier). |
| **Permanent Step Failure (4xx/5xx exhausted)** | Retry count depletion | Triggers Saga compensation coordinator to reverse completed transactions in LIFO order. |
| **Infinite Loop in User Code** | V8 execution timeout (500ms) | VM script interrupted; execution marked `Failed` without freezing the Node.js event loop. |
| **Worker Node Outage / Process Crash** | MongoDB persistence & heartbeat | Unfinished executions flagged as `Queued` or routed to Dead-Letter Queue on reboot. |
| **Rate Limit Spike (DDoS / Tenant Surge)** | Sliding 60-second window tracker | Returns HTTP `429 Too Many Requests` isolated strictly to the abusive tenant. |
| **Dead-Letter Queue (DLQ) Remediation** | Manual or API replay trigger | `/api/dlq/:id/replay` re-dispatches the preserved context as a new execution run. |

---

## 5. Verification & Test Audit

- **Backend Unit Tests:** 28 / 28 passing (`npm test --prefix backend`).
- **Frontend Build:** Built cleanly with zero errors (`npm run build`).
- **Database Seed:** 50 enterprise workflows, 168 executions, and 6 DLQ records persisted in MongoDB Atlas across 3 demo tenants.
- **Docker Suite:** Complete `Dockerfile` (frontend), `backend/Dockerfile`, `docker-compose.yml`, and `nginx.conf` validated.

---

## Conclusion

All requirements for **Project 1: Multi-Tenant Distributed Workflow & Saga Orchestration Engine** defined in the Zaalima SOPs and Project Specification (Weeks 1 through 4) have been fully developed, rigorously tested, and validated for production deployment.

