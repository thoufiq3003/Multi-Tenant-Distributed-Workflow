# FlowPilot — Multi-Tenant Workflow & Saga Orchestration Engine (MVP)

This repository contains the React frontend and Express backend for the Zaalima Project 1 brief. It is an integrated learning/demo MVP, not a production-certified distributed orchestration platform.

## Included

- React + Vite dashboard and React Flow workflow editor
- Add/select/move/connect/delete nodes; edit node labels and demo behavior
- Workflow graph validation: missing/duplicate IDs, dangling connections, trigger presence, unreachable nodes, conditional branching, and cycle detection
- Draft save/load, publish validation, test execution, execution history, details/log export, retry endpoint
- Express API with tenant-scoped records (`x-tenant-id`), request rate limiting, basic security headers, and Socket.IO tenant rooms
- Optional MongoDB persistence via Mongoose models; without MongoDB URI the API runs in in-memory demo mode
- Demo execution state machine, bounded exponential-backoff retries, and basic compensation demonstration

## Requirements

- Node.js 20+ recommended
- npm
- MongoDB optional for persistence (otherwise data is reset when backend restarts)

## Run locally

### 1. Install frontend dependencies

From the repository root:

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend (optional MongoDB)

Copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI` to your MongoDB connection string if you want persistence. If MongoDB is not configured, the backend runs in memory demo mode. Do not use the default development pepper or demo tenant strategy for production.

### 4. Start both services

Open a terminal in the repository root:

```bash
npm run dev:full
```

Frontend: `http://localhost:5173`
Backend health check: `http://localhost:4000/api/health`

Alternatively, run `npm run dev` in the root and `npm run dev` inside `backend` in two terminals.

## API overview

All data routes are scoped by the `x-tenant-id` header (defaults to `demo-tenant` for local testing):

- `GET /api/health`
- `GET /api/metrics`
- `GET/POST /api/workflows`
- `GET/PUT/DELETE /api/workflows/:id`
- `POST /api/workflows/validate`
- `POST /api/workflows/:id/publish`
- `POST /api/workflows/:id/execute`
- `GET /api/executions`, `GET /api/executions/:id`, `POST /api/executions/:id/retry`
- `POST /api/api-keys` (development-only key creation demo)

## Important limitations

- Authentication/authorization, real API-key authentication, encrypted secret vault, tenant provisioning, and strict production-grade isolation need a security review before deployment. Tenant ID headers are a demo scoping mechanism, not authentication.
- The executor is a deterministic local demonstration, not a distributed worker queue. External HTTP actions are not actually called; `simulateFailure` is a testing flag. Compensation is a basic demonstration, not transactional guarantees across third-party services.
- Retry delays are bounded demo delays. No durable dead-letter queue, MongoDB Change Streams trigger, sandboxed user code, worker autoscaling, Kubernetes/ECS deployment, or 1,000+ concurrent pipeline stress test is implemented.
- Socket.IO publishes tenant-scoped workflow/execution update events, but execution is currently synchronous in the HTTP request; this is not production-grade live per-node streaming.
- Dashboard trend chart remains illustrative sample data. Summary counts and recent workflow/execution lists are loaded from the backend.
- Validate and test the system in your own environment before presenting it as complete. Never put real API secrets into the demo configuration.
