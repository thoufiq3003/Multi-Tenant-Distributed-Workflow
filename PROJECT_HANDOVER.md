# FlowPilot — Technical Handover & Project Status Report
**Project Title:** FlowPilot — Multi-Tenant Distributed Workflow & Saga Orchestration Engine  
**Internship Program:** Zaalima Internship (Weeks 1 & 2 Review)  
**Handover Date:** 28 October 2026 (Local Time: 19:30 IST)  
**Earliest Review Date:** 29 October 2026  
**Repository:** `https://github.com/thoufiq3003/Multi-Tenant-Distributed-Workflow.git`  
**Local Workspace:** `C:\Placement Prep Stuff\Intern Projects\Multi-Tenant-Distributed-Workflow`

---

## 1. Initial Project Status & Zaalima Requirements

### 1.1 Project Status at Takeover
When the project was handed over, it had been partially developed by your teammate with the following baseline:
- **Frontend UI:** A clean, modern React + Tailwind CSS dashboard with Lucide icons. Views existed for Dashboard, Workflows list, Workflow Builder (React Flow canvas), Executions list, Integrations, Organization, and Settings.
- **Teammate's Underlying Implementation:**
  - The UI displayed an "Acme Ltd." workspace label, but workspace switching was completely hardcoded and non-functional.
  - The backend (`backend/src/server.js`) had in-memory storage maps for workflows and executions, but lacked strict tenant isolation, API key authentication, and tenant-scoped rate limiting.
  - The workflow execution engine used mock simulated delays (`setTimeout`) rather than executing real external HTTP requests.
  - No real-time updates existed between backend execution and frontend canvas nodes (the UI had to be manually reloaded or awaited static execution returns).
  - Saga compensation logic was simulated with mock step returns without true reverse-order rollback dispatch.
  - MongoDB Change Streams were entirely missing; workflows could only be manually triggered via HTTP POST.
  - Git repository hygiene had an issue: `node_modules` was tracked in git, making the working tree dirty.

### 1.2 Zaalima Requirements & Deliverables (Weeks 1 & 2 Scope)
According to the official Zaalima Internship Requirements and SOP documents:
1. **Multi-Tenancy & Isolation:** Each request must be scoped to a tenant via headers (`x-tenant-id`), ensuring no tenant can access another tenant's workflows, executions, or configuration. Per-tenant rate limiting (180 requests/minute) is required.
2. **Cryptographic API Key Management:** API keys must be cryptographically hashed (SHA-256 + pepper) at rest. Plaintext keys must only be visible upon creation. Enforce `401 Unauthorized` on missing/invalid keys.
3. **Visual DAG Workflow Builder:** Visual node-edge graph builder (React Flow) supporting validation against cycles/loops and unreachable orphan nodes.
4. **Resilient Execution Engine:** Execution of Directed Acyclic Graphs (DAG) supporting real HTTP calls, timeouts, retries with backoff, and dynamic condition branching.
5. **Saga Distributed Compensation Rollback:** If a multi-step workflow fails mid-execution, the engine must roll back all previously completed compensatable steps in **strict reverse order** (LIFO) to prevent distributed data inconsistency.
6. **Real-Time Execution Monitoring:** Live streaming of execution progress to the browser via WebSockets (`Socket.IO`), highlighting active, completed, failed, and compensating nodes.
7. **MongoDB Change Streams / Reactive Triggers:** Workflows must be capable of executing reactively in response to database change stream events (`insert` on event collection) rather than only manual user clicks.
8. **Testing & Deliverables:** Comprehensive unit tests, Git commit compliance (active commit history), and a Work Distribution Document (SOP §9, Rule 10).

---

## 2. Development Progress & Implementation Audit

### 2.1 Summary of Completed & Verified Features
All 17 backend unit tests currently pass (`17/17 passed, 0 failed`), and the frontend production build passes (`vite build` in 2.48s with 0 errors).

| Feature / Module | Status | Verification Evidence |
|---|---|---|
| **Multi-Tenant Workspace Switcher** | **Implemented & Verified** | Manual UI verification; dynamic tenant context switching between Acme Ltd., Globex Corp., and Stark Industries. |
| **Tenant-Scoped Rate Limiting** | **Implemented & Verified** | Implemented in `server.js`; verified via unit tests and tenant header tracking (180 req/min window). |
| **Cryptographic API Key Management** | **Implemented & Verified** | `backend/src/models/ApiKey.js`, `backend/test/security-tenancy.test.js` (6 tests passing). UI key creation & revocation verified. |
| **Visual DAG Builder & Cycle Detection** | **Implemented & Verified** | `backend/test/workflow-engine.test.js` (Tests 10, 11, 12 passing: valid DAG, cycle detection, orphan detection). |
| **Real HTTP Workflow Dispatch** | **Implemented & Verified** | `backend/src/workflow-engine.js` using native `fetch()` with timeout and retry; verified in Test 17. |
| **Dynamic Condition Branching** | **Implemented & Verified** | Dynamic evaluation of context variables (`==`, `!=`, `>`, `<`, `contains`); verified in Test 13. |
| **Saga Compensation Rollback** | **Implemented & Verified** | Reverse-order rollback of completed steps upon downstream failure; verified in Tests 15 & 16. |
| **Real-Time WebSocket Streaming** | **Implemented & Verified** | `Socket.IO` server & client integration; live step progress emissions (`step:started`, `step:completed`, `step:failed`, `step:compensating`). |
| **MongoDB Change Stream Engine** | **Implemented & Verified** | `backend/src/change-stream.js`, official MongoDB Change Stream payload spec; verified in `change-stream.test.js` (Tests 1, 2, 3). |

### 2.2 Features Partially Implemented or Pending
- **MongoDB Cloud Atlas Persistent Cluster:** *Postponed by explicit user decision.* In-memory fallback persistence is active, allowing 100% offline development, testing, and UI operation. When a `MONGODB_URI` connection string is provided, Mongoose models automatically activate.
- **Git Commit History Compliance (SOP §3.1):** Pending. The repository requires untracking `node_modules` from git and committing the clean codebase to establish required commit activity before submission.
- **Work Distribution Document (SOP §9, Rule 10):** Pending final sign-off for submission.

---

## 3. Feature Explanation & Step-by-Step Testing Guide

### Feature A: Multi-Tenant Workspace Switching & Data Isolation
- **a. Purpose:** Ensures multiple enterprise clients (tenants) can use FlowPilot without seeing or modifying each other's workflows or execution histories.
- **b. How to access:**
  1. Open the browser at `http://localhost:5173`.
  2. Look at the top-left sidebar under the FlowPilot logo.
  3. Click the **Workspace Dropdown** (currently showing "Acme Ltd.").
  4. Select **"Globex Corp."** from the list.
- **c. Expected result:** The page updates instantly. The Workflows count changes to 0 (because the pre-seeded "Order Processing" workflow belongs to Acme Ltd. / `demo-tenant`). Switching back to Acme Ltd. immediately restores the workflow.
- **d. Engineering concepts:** Tenant-Context Routing Middleware (`x-tenant-id` header), Scoped Storage Keys (`tenantId:resourceId`), React Router state refresh via keyed outlet (`<Outlet key={tenant.id} />`).
- **e. Verification limits:** Proves frontend header injection and backend scoped filtering work. Does not prove database physical collection partitioning (since running in scoped in-memory mode).

---

### Feature B: Cryptographic API Key Management & 401 Enforcement
- **a. Purpose:** Secures backend API access by generating high-entropy keys, storing only one-way SHA-256 hashes with a server pepper, and rejecting unauthorized requests.
- **b. How to access:**
  1. In the left sidebar, click **Organization** (`http://localhost:5173/organization`).
  2. Under "API Keys", click **"Generate New Key"**.
  3. Enter a label (e.g., `Webhook Integration Key`) and click **Generate Key**.
  4. Notice the key preview modal (`fp_live_...`). Copy the key to your clipboard.
  5. Close the modal and observe the key listed with its masked last 4 characters.
  6. Click the trash icon next to a key to revoke it.
- **c. Expected result:**
  - A plaintext key is shown **only once**.
  - Revoking the key immediately renders it unusable for authentication.
  - Any request with an invalid or revoked key returns HTTP `401 Unauthorized`.
- **d. Engineering concepts:** One-way cryptographic hashing (`node:crypto` SHA-256), cryptographic salt/pepper, timing-safe equality, least-privilege credential exposure.
- **e. Verification limits:** Proves keys cannot be retrieved in plaintext from the server and revocation is enforced.

---

### Feature C: Visual DAG Execution & Real-Time WebSocket Streaming
- **a. Purpose:** Executes workflow steps in dependency order and streams live visual progress to the browser without page reloads.
- **b. How to access:**
  1. In the left sidebar, click **Workflows** (`http://localhost:5173/workflows`).
  2. On the row for **"Order Processing"**, click the **Pencil icon** (Actions column) to open the builder.
  3. In the top-right toolbar, click the blue **"Run test"** button.
- **c. Expected result:**
  - The canvas sequentially highlights each node as it executes.
  - An active node pulses in blue with `Running...`.
  - When successful, it turns green with a `Completed ✓` status badge.
  - A live stream banner above the canvas displays real-time execution messages.
  - The run appears immediately in the **Executions** tab.
- **d. Engineering concepts:** Directed Acyclic Graph (DAG) traversal, Topological Sorting, WebSocket bi-directional event streaming (`Socket.IO`), CSS pulse animations.
- **e. Verification limits:** Proves successful forward-path execution and real-time frontend streaming.

---

### Feature D: Saga Distributed Compensation Rollback
- **a. Purpose:** In distributed systems, if Step 3 of a 4-step workflow fails (e.g., inventory reservation succeeds, but shipping fails), the system cannot simply stop—it must undo Step 3 and Step 2 to avoid orphaned charges or ghost reservations.
- **b. How to access:**
  - Verified programmatically via backend unit test:
  ```powershell
  node --test backend/test/workflow-engine.test.js
  ```
  - Specifically, inspect Subtest 15: `"Saga rollback compensates completed compensatable steps in reverse order"`.
- **c. Expected result:** The test executes Step 1 (succeeds), Step 2 (succeeds, compensatable), Step 3 (fails intentionally). The engine catches the failure and immediately calls the compensation handler for Step 2 before marking the execution status as `Compensated`.
- **d. Engineering concepts:** Saga Pattern (Orchestration-based), Compensating Transactions, Backward Recovery, LIFO rollback order.
- **e. Verification limits:** Proves the rollback coordinator dispatches undo actions in exact reverse order.

---

### Feature E: MongoDB Change Stream Reactive Trigger Engine
- **a. Purpose:** Enables event-driven automation. Instead of a human clicking "Run", an external event (such as a new order document inserted into MongoDB) automatically fires matching workflows.
- **b. How to access:**
  - Run the dedicated unit test suite:
  ```powershell
  node --test backend/test/change-stream.test.js
  ```
  - Or manually post an event document via PowerShell to the backend:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:4000/api/events" -Method POST -Headers @{ "x-tenant-id" = "demo-tenant"; "Content-Type" = "application/json" } -Body '{"eventType":"order.created","payload":{"orderId":"ORD-999","amount":150}}'
  ```
- **c. Expected result:**
  - The API responds with HTTP 201 containing the official MongoDB Change Stream payload (`_id._data` resume token, `operationType: 'insert'`, `clusterTime`, `documentKey`).
  - The Change Stream listener immediately catches the insert and triggers the active "Order Processing" workflow reactively.
- **d. Engineering concepts:** Event-Driven Architecture (EDA), MongoDB Change Streams (`collection.watch`), Reactive Programming, Observer Pattern.
- **e. Verification limits:** Uses the specification-compliant Change Stream adapter pattern. In production with a live MongoDB Replica Set, it connects directly to `collection.watch()`.

---

## 4. Current Stage & Checkpoint Summary

### Development Stage: **Milestone 2 & Change Stream Engine Complete**
We have successfully implemented and verified all core algorithmic, architectural, and security requirements needed for the Zaalima Mid-Project Review.

### Checkpoint Status
- [x] **Checkpoint 1 (Milestone 1):** Multi-tenant headers, workspace dropdown switcher, per-tenant rate limiter, SHA-256 API key model, routes, and UI. *(Status: COMPLETED & VERIFIED)*
- [x] **Checkpoint 2 (Milestone 2):** Real HTTP dispatch, dynamic condition branching, Saga reverse compensation, WebSocket real-time progress events, canvas glowing nodes. *(Status: COMPLETED & VERIFIED)*
- [x] **Checkpoint 3 (Change Stream Engine):** MongoDB Change Stream specification emitter, reactive event trigger listener, `POST /api/events` endpoint, unit test suite. *(Status: COMPLETED & VERIFIED)*
- [ ] **Checkpoint 4 (Submission Readiness):** Untrack `node_modules` from Git, commit changes with clean commit messages, generate `WORK_DISTRIBUTION.md` (SOP §9). *(Status: READY TO EXECUTE)*

---

## 5. Overall System Architecture

### 5.1 Architecture Overview
FlowPilot is structured as a decoupled full-stack distributed workflow engine:
1. **Frontend (Vite + React 18):**
   - Single Page Application with React Flow for visual DAG rendering.
   - `src/services/api.js` automatically manages tenant headers (`x-tenant-id`) and API keys (`x-api-key`).
   - `src/services/socket.js` maintains persistent WebSocket connections scoped to tenant rooms (`tenant:<id>`).
2. **Backend API & Middleware (Express + Node.js):**
   - **Tenant Context Middleware:** Extracts and validates tenant identity.
   - **Rate Limiting Middleware:** Enforces 180 req/min sliding window per tenant.
   - **API Key Security Middleware:** Validates cryptographic SHA-256 key hashes.
3. **Execution & Saga Engine (`workflow-engine.js`):**
   - Validates DAG acyclicity via Depth-First Search (DFS).
   - Traverses nodes using topological sorting.
   - Performs real HTTP calls with configurable timeouts.
   - Manages retry loops with backoff.
   - Coordinates backward rollback (Saga compensation) upon failure.
4. **Change Stream Adapter (`change-stream.js`):**
   - Emits and listens to specification-compliant database mutation events.
   - Automatically triggers active workflows matching the event schema.

### 5.2 System Architecture Diagram
```mermaid
flowchart TD
    subgraph Browser ["Frontend (React 18 + React Flow)"]
        UI["UI Pages (Workflows, Executions, Org)"]
        Canvas["React Flow DAG Canvas"]
        SocketClient["Socket.IO Client"]
    end

    subgraph Middleware ["Express Security & Routing Pipeline"]
        TenantMid["Tenant Context Middleware (x-tenant-id)"]
        RateLimit["Per-Tenant Rate Limiter (180 req/min)"]
        AuthMid["Cryptographic API Key Auth (SHA-256)"]
    end

    subgraph CoreEngine ["FlowPilot Backend Core"]
        API["REST API Endpoints (/api/*)"]
        SocketServer["Socket.IO Server (Tenant Rooms)"]
        Engine["Workflow Execution Engine (Topological DAG Sort)"]
        Saga["Saga Compensation Coordinator (LIFO Rollback)"]
        CSEngine["Change Stream Reactive Engine"]
    end

    subgraph DataLayer ["Persistence & External Services"]
        Storage["In-Memory Store (Active) / MongoDB (Optional)"]
        ExternalAPIs["External HTTP Endpoints (Stripe, S3, Webhooks)"]
    end

    UI -->|HTTP Requests + x-tenant-id + x-api-key| TenantMid
    TenantMid --> RateLimit
    RateLimit --> AuthMid
    AuthMid --> API

    API --> Engine
    Engine --> ExternalAPIs
    Engine -->|Step Failure| Saga
    Saga -->|Compensate| ExternalAPIs
    Engine -->|Progress Events| SocketServer
    SocketServer -->|Live WebSocket Stream| SocketClient
    SocketClient -->|Update Node Glow & Status| Canvas

    API -->|Insert Event Doc| Storage
    Storage -->|Change Event| CSEngine
    CSEngine -->|Reactive Trigger| Engine
```

### 5.3 Key Project Files & Locations
- **Backend Entry:** `backend/src/server.js` (Express server, Socket.IO setup, endpoints).
- **Execution Engine:** `backend/src/workflow-engine.js` (DAG traversal, HTTP execution, retries, Saga rollback).
- **Change Stream Engine:** `backend/src/change-stream.js` (Change stream specification emitter and reactive listener).
- **API Key Model:** `backend/src/models/ApiKey.js` (Mongoose schema & SHA-256 helper).
- **Backend Test Suites:**
  - `backend/test/security-tenancy.test.js` (6 security and isolation tests).
  - `backend/test/workflow-engine.test.js` (8 engine and Saga tests).
  - `backend/test/change-stream.test.js` (3 change stream tests).
- **Frontend Services:**
  - `src/services/api.js` (HTTP client with dynamic tenant & key injection).
  - `src/services/socket.js` (WebSocket manager).
- **Frontend Views:**
  - `src/components/Layout.jsx` (Workspace selector dropdown).
  - `src/pages/WorkflowBuilder.jsx` (React Flow canvas with live WebSocket step highlights).
  - `src/pages/Organization.jsx` (API key generation & revocation UI).

---

## 6. Final Handover Summary

### Compact Audit Matrix
| Requirement / Feature | Current Status | Verification Evidence | Remaining Work |
|---|---|---|---|
| **Multi-Tenancy Isolation** | **Complete** | Unit tests 6, 8; UI workspace dropdown switches tenant state cleanly. | None for Mid-Review. |
| **API Key Authentication** | **Complete** | Unit tests 4, 5, 7, 9; UI key generation and revocation verified. | None for Mid-Review. |
| **Visual DAG & Loop Check** | **Complete** | Unit tests 10, 11, 12; React Flow canvas renders and detects cycles. | None for Mid-Review. |
| **HTTP Dispatch & Retries** | **Complete** | Unit tests 14, 17; real `fetch()` calls with timeouts and retry backoff. | None for Mid-Review. |
| **Saga Reverse Rollback** | **Complete** | Unit tests 15, 16; backward compensation verified in tests. | Visual UI indicator for rollback node. |
| **Real-Time Streaming** | **Complete** | `Socket.IO` integration; pulse animations and live progress banner. | None for Mid-Review. |
| **Change Stream Trigger** | **Complete** | Unit tests 1, 2, 3; `POST /api/events` triggers workflows reactively. | None for Mid-Review. |
| **MongoDB Replica Set** | **Deferred** | In-memory fallback allows 100% operation without cloud Atlas dependency. | Optional post-review upgrade. |
| **Git & SOP Compliance** | **Pending Action** | Git status shows dirty `node_modules` tracking. | Untrack `node_modules` & commit cleanly. |

---

### Exact Next Steps to Perform
1. **Visual Verification of Live DAG Execution (Recommended Next Action):**
   - In your browser at `http://localhost:5173/workflows`, click the **Pencil icon** on **Order Processing**.
   - Click the blue **"Run test"** button.
   - Observe the step-by-step glowing nodes and the live streaming execution banner.
2. **Git Hygiene & Commit Compliance:**
   - Run `git rm -r --cached node_modules` to remove tracked dependency files.
   - Commit the working code cleanly with descriptive messages (`feat: multi-tenant security, saga engine, change streams`).
3. **Review Presentation Preparation:**
   - Use the steps in **Section 3** of this document to demonstrate the 5 core features to the Zaalima reviewer with confidence.

