import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import Workflow from './models/Workflow.js';
import Execution from './models/Execution.js';
import ApiKey from './models/ApiKey.js';
import { executeWorkflow, validateWorkflow } from './workflow-engine.js';
import { emitChangeEvent, initChangeStreamListener } from './change-stream.js';

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
});
const PORT = Number(process.env.PORT || 4000);
let mongoReady = false;
const workflowsMemory = new Map();
const executionsMemory = new Map();
const keysMemory = new Map();
const eventsMemory = new Map();
const scopedKey = (tenantId, id) => `${tenantId}:${id}`;

// Cryptographic hash helper for API keys
export function hashApiKey(rawKey) {
  const pepper = process.env.API_KEY_PEPPER || 'development-pepper';
  return crypto.createHash('sha256').update(String(rawKey) + pepper).digest('hex');
}

// Seed demo keys for known demo tenants in memory mode for instant out-of-the-box verified auth
export const DEMO_KEY_RAW = 'fp_demo_7f8a9b0c1d2e3f4a5b6c7d8e';
export const DEMO_KEY_ID = 'demo-key-01';

export const SEEDED_DEMO_KEYS = {
  'demo-tenant': { id: DEMO_KEY_ID, key: DEMO_KEY_RAW, label: 'Default Demo Key' },
  'globex-corp': { id: 'demo-key-globex', key: 'fp_globex_7f8a9b0c1d2e3f4a5b6c7d8e', label: 'Globex Demo Key' },
  'stark-tech': { id: 'demo-key-stark', key: 'fp_stark_7f8a9b0c1d2e3f4a5b6c7d8e', label: 'Stark Demo Key' }
};

for (const [tId, meta] of Object.entries(SEEDED_DEMO_KEYS)) {
  keysMemory.set(scopedKey(tId, meta.id), {
    id: meta.id,
    tenantId: tId,
    label: meta.label,
    hash: hashApiKey(meta.key),
    lastFour: meta.key.slice(-4),
    createdAt: new Date()
  });
}

export const STARTER_NODES = [
  { id: '1', type: 'flowNode', position: { x: 100, y: 40 }, data: { label: 'Order Created', sub: 'Trigger · Webhook', icon: 'webhook', tone: 'green', config: {} } },
  { id: '2', type: 'flowNode', position: { x: 100, y: 165 }, data: { label: 'Check Payment', sub: 'Action · HTTP request', icon: 'database', tone: 'blue', config: { url: 'https://httpbin.org/get', method: 'GET' } } },
  { id: '3', type: 'flowNode', position: { x: 100, y: 290 }, data: { label: 'Payment Successful?', sub: 'Condition', icon: 'branch', tone: 'purple', config: { branchResult: 'yes' } } },
  { id: '4', type: 'flowNode', position: { x: -10, y: 430 }, data: { label: 'Reserve Inventory', sub: 'Action', icon: 'cart', tone: 'blue', config: { compensatable: true, compensationLabel: 'Release Inventory' } } },
  { id: '5', type: 'flowNode', position: { x: 220, y: 430 }, data: { label: 'Cancel Order', sub: 'Compensation', icon: 'database', tone: 'red', config: {} } },
  { id: '6', type: 'flowNode', position: { x: -10, y: 555 }, data: { label: 'Notify Customer', sub: 'Action · Email', icon: 'mail', tone: 'blue', config: {} } }
];

export const STARTER_EDGES = [
  { id: 'e1', source: '1', target: '2', animated: true },
  { id: 'e2', source: '2', target: '3', animated: true },
  { id: 'e3', source: '3', target: '4', label: 'yes', style: { stroke: '#20a36b' }, labelStyle: { fill: '#20a36b' } },
  { id: 'e4', source: '3', target: '5', label: 'no', style: { stroke: '#e4545b' }, labelStyle: { fill: '#e4545b' } },
  { id: 'e5', source: '4', target: '6', animated: true }
];

const DEFAULT_WF_ID = 'WF-001';
workflowsMemory.set(scopedKey('demo-tenant', DEFAULT_WF_ID), {
  id: DEFAULT_WF_ID,
  tenantId: 'demo-tenant',
  name: 'Order Processing',
  description: 'Process new orders from store to warehouse with Saga compensation rollback support',
  status: 'Active',
  nodes: STARTER_NODES,
  edges: STARTER_EDGES,
  settings: { timeoutMinutes: 5, failureBehavior: 'retry-then-compensate' },
  createdAt: new Date(),
  updatedAt: new Date()
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

// 1. Tenant Context Routing Middleware (Must run first to establish tenant context)
app.use((req, res, next) => {
  const tenantId = String(req.header('x-tenant-id') || 'demo-tenant').trim();
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId)) {
    return res.status(400).json({ error: 'Invalid tenant identifier. Must be 2-80 alphanumeric characters, hyphens, or underscores.' });
  }
  req.tenantId = tenantId;
  next();
});

// 2. Tenant-scoped Rate Limiter (Throttles per-tenant rather than globally by IP)
app.use(rateLimit({
  windowMs: 60_000,
  limit: 180,
  keyGenerator: (req) => `tenant:${req.tenantId || req.ip}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for this tenant. Please throttle your requests.' }
}));

// 3. Cryptographic API Key Authentication Middleware
app.use(async (req, res, next) => {
  // Public health check endpoint
  if (req.path === '/api/health') return next();

  const authHeader = req.header('authorization');
  const apiKeyHeader = req.header('x-api-key');
  let rawKey = null;

  if (apiKeyHeader) {
    rawKey = apiKeyHeader.trim();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7).trim();
  }

  if (rawKey) {
    const hash = hashApiKey(rawKey);
    const keyRecord = await findApiKeyByHash(req.tenantId, hash);
    if (!keyRecord) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid, expired, or cross-tenant API key.'
      });
    }
    req.apiKey = keyRecord;
    req.authType = 'api-key';
    return next();
  }

  // If strict enforcement is enabled, reject requests without valid key
  if (process.env.ENFORCE_API_KEYS === 'true') {
    return res.status(401).json({
      error: `Unauthorized: Valid 'x-api-key' header required for tenant '${req.tenantId}'.`
    });
  }

  // Browser demo mode fallback
  req.authType = 'session';
  next();
});

io.use((socket, next) => {
  const tenantId = String(socket.handshake.auth?.tenantId || 'demo-tenant');
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId)) return next(new Error('Invalid tenant identifier'));
  socket.data.tenantId = tenantId;
  next();
});
io.on('connection', socket => socket.join(`tenant:${socket.data.tenantId}`));

function plain(doc) {
  if (!doc) return null;
  const x = doc.toObject ? doc.toObject() : { ...doc };
  x.id = String(x._id || x.id);
  delete x.__v;
  return x;
}

export async function listWorkflows(tenantId) {
  if (mongoReady) return (await Workflow.find({ tenantId }).sort({ updatedAt: -1 })).map(plain);
  return [...workflowsMemory.values()].filter(w => w.tenantId === tenantId).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getWorkflow(tenantId, id) {
  if (mongoReady) {
    if (mongoose.isValidObjectId(id)) {
      const byId = await Workflow.findOne({ _id: id, tenantId });
      if (byId) return plain(byId);
    }
    return null;
  }
  return workflowsMemory.get(scopedKey(tenantId, id)) || null;
}

export async function saveWorkflow(tenantId, body, id = null) {
  const payload = {
    name: String(body.name || '').trim(),
    description: String(body.description || ''),
    status: body.status || 'Draft',
    nodes: Array.isArray(body.nodes) ? body.nodes : [],
    edges: Array.isArray(body.edges) ? body.edges : [],
    settings: body.settings && typeof body.settings === 'object' ? body.settings : {},
    updatedAt: new Date()
  };
  if (!payload.name) {
    const error = new Error('Workflow name is required.');
    error.status = 400;
    throw error;
  }
  if (payload.name.length > 120) {
    const error = new Error('Workflow name must be 120 characters or fewer.');
    error.status = 400;
    throw error;
  }
  if (mongoReady) {
    let doc;
    if (id && mongoose.isValidObjectId(id)) {
      doc = await Workflow.findOneAndUpdate({ _id: id, tenantId }, { $set: payload }, { new: true, runValidators: true });
    }
    if (!doc) doc = await Workflow.create({ ...payload, tenantId });
    return plain(doc);
  }
  const key = id ? scopedKey(tenantId, id) : null;
  const existing = key ? workflowsMemory.get(key) : null;
  const item = {
    ...(existing || {}),
    ...payload,
    id: existing?.id || `WF-${crypto.randomUUID().slice(0,8).toUpperCase()}`,
    tenantId,
    createdAt: existing?.createdAt || new Date()
  };
  workflowsMemory.set(scopedKey(tenantId, item.id), item);
  return item;
}

export async function storeExecution(tenantId, data) {
  const item = { ...data, tenantId };
  if (mongoReady) {
    const doc = await Execution.create({ ...item, workflowId: String(item.workflowId) });
    return plain(doc);
  }
  executionsMemory.set(scopedKey(tenantId, item.id), item);
  return item;
}

export async function listExecutions(tenantId, workflowId) {
  if (mongoReady) {
    const query = { tenantId };
    if (workflowId) query.workflowId = workflowId;
    return (await Execution.find(query).sort({ startedAt: -1 }).limit(200)).map(plain);
  }
  return [...executionsMemory.values()]
    .filter(e => e.tenantId === tenantId && (!workflowId || String(e.workflowId) === String(workflowId)))
    .sort((a,b) => new Date(b.startedAt) - new Date(a.startedAt));
}

export async function getExecution(tenantId, id) {
  if (mongoReady) {
    if (mongoose.isValidObjectId(id)) return plain(await Execution.findOne({ _id: id, tenantId }));
    return null;
  }
  return executionsMemory.get(scopedKey(tenantId, id)) || null;
}

// API Key Management Store Helpers
export async function listApiKeys(tenantId) {
  if (mongoReady) {
    return (await ApiKey.find({ tenantId }).sort({ createdAt: -1 })).map(plain);
  }
  return [...keysMemory.values()]
    .filter(k => k.tenantId === tenantId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createApiKey(tenantId, label = 'Development key') {
  const raw = `fp_${crypto.randomBytes(24).toString('hex')}`;
  const hash = hashApiKey(raw);
  const id = crypto.randomUUID();
  const lastFour = raw.slice(-4);
  const doc = {
    id,
    tenantId,
    label: String(label).slice(0, 80),
    hash,
    lastFour,
    createdAt: new Date()
  };
  if (mongoReady) {
    const created = await ApiKey.create(doc);
    return { ...plain(created), key: raw };
  }
  keysMemory.set(scopedKey(tenantId, id), doc);
  return { ...doc, key: raw };
}

export async function revokeApiKey(tenantId, id) {
  if (mongoReady) {
    const res = await ApiKey.deleteOne({ _id: id, tenantId });
    return res.deletedCount > 0;
  }
  return keysMemory.delete(scopedKey(tenantId, id));
}

export async function findApiKeyByHash(tenantId, hash) {
  if (mongoReady) {
    const doc = await ApiKey.findOne({ tenantId, hash });
    return plain(doc);
  }
  return [...keysMemory.values()].find(k => k.tenantId === tenantId && k.hash === hash) || null;
}

// --- REST ENDPOINTS ---

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'flowpilot-api',
  database: mongoReady ? 'mongodb' : 'memory-demo',
  time: new Date().toISOString()
}));

app.get('/api/workflows', async (req, res, next) => {
  try { res.json(await listWorkflows(req.tenantId)); } catch(e) { next(e); }
});

app.post('/api/workflows/validate', (req, res) => res.json(validateWorkflow(req.body || {})));

app.post('/api/workflows', async (req, res, next) => {
  try {
    const item = await saveWorkflow(req.tenantId, req.body || {});
    res.status(201).json(item);
  } catch(e) { next(e); }
});

app.get('/api/workflows/:id', async (req, res, next) => {
  try {
    const item = await getWorkflow(req.tenantId, req.params.id);
    if (!item) return res.status(404).json({ error: 'Workflow not found for this tenant.' });
    res.json(item);
  } catch(e) { next(e); }
});

app.put('/api/workflows/:id', async (req, res, next) => {
  try {
    const current = await getWorkflow(req.tenantId, req.params.id);
    if (!current) return res.status(404).json({ error: 'Workflow not found for this tenant.' });
    const item = await saveWorkflow(req.tenantId, req.body || {}, req.params.id);
    res.json(item);
  } catch(e) { next(e); }
});

app.patch('/api/workflows/:id/status', async (req, res, next) => {
  try {
    const current = await getWorkflow(req.tenantId, req.params.id);
    if (!current) return res.status(404).json({ error: 'Workflow not found for this tenant.' });
    const status = req.body?.status;
    if (!['Draft','Active','Paused'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Draft, Active, or Paused.' });
    }
    const updated = await saveWorkflow(req.tenantId, { ...current, status }, req.params.id);
    res.json(updated);
  } catch(e) { next(e); }
});

app.delete('/api/workflows/:id', async (req, res, next) => {
  try {
    const current = await getWorkflow(req.tenantId, req.params.id);
    if (!current) return res.status(404).json({ error: 'Workflow not found for this tenant.' });
    if (mongoReady) await Workflow.deleteOne({ _id: current.id, tenantId: req.tenantId });
    else workflowsMemory.delete(scopedKey(req.tenantId, req.params.id));
    res.status(204).end();
  } catch(e) { next(e); }
});

app.post('/api/workflows/:id/publish', async (req, res, next) => {
  try {
    const current = await getWorkflow(req.tenantId, req.params.id);
    if (!current) return res.status(404).json({ error: 'Workflow not found for this tenant.' });
    const result = validateWorkflow(current);
    if (!result.valid) return res.status(422).json({ error: 'Workflow validation failed.', validation: result });
    const updated = await saveWorkflow(req.tenantId, { ...current, status: 'Active' }, req.params.id);
    io.to(`tenant:${req.tenantId}`).emit('workflow:published', { workflowId: updated.id, name: updated.name });
    res.json(updated);
  } catch(e) { next(e); }
});

app.post('/api/workflows/:id/execute', async (req, res, next) => {
  try {
    const workflow = await getWorkflow(req.tenantId, req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found for this tenant.' });
    const validation = validateWorkflow(workflow);
    if (!validation.valid) return res.status(422).json({ error: 'Workflow validation failed.', validation });
    const result = await executeWorkflow(workflow, {
      retryCount: Math.min(4, Math.max(0, Number(req.body?.retryCount ?? 2))),
      backoffMs: 100,
      context: req.body?.context || {},
      onStepProgress: (progress) => {
        io.to(`tenant:${req.tenantId}`).emit('execution:progress', progress);
      }
    });
    const stored = await storeExecution(req.tenantId, result);
    io.to(`tenant:${req.tenantId}`).emit('execution:updated', stored);
    res.status(201).json(stored);
  } catch(e) { next(e); }
});

app.get('/api/executions', async (req, res, next) => {
  try { res.json(await listExecutions(req.tenantId, req.query.workflowId)); } catch(e) { next(e); }
});

app.get('/api/executions/:id', async (req, res, next) => {
  try {
    const item = await getExecution(req.tenantId, req.params.id);
    if (!item) return res.status(404).json({ error: 'Execution not found for this tenant.' });
    res.json(item);
  } catch(e) { next(e); }
});

app.post('/api/executions/:id/retry', async (req, res, next) => {
  try {
    const old = await getExecution(req.tenantId, req.params.id);
    if (!old) return res.status(404).json({ error: 'Execution not found for this tenant.' });
    const workflow = await getWorkflow(req.tenantId, old.workflowId);
    if (!workflow) return res.status(404).json({ error: 'Source workflow not found.' });
    const result = await executeWorkflow(workflow, {
      retryCount: 2,
      backoffMs: 100,
      context: old.context || {},
      onStepProgress: (progress) => {
        io.to(`tenant:${req.tenantId}`).emit('execution:progress', progress);
      }
    });
    const stored = await storeExecution(req.tenantId, result);
    io.to(`tenant:${req.tenantId}`).emit('execution:updated', stored);
    res.status(201).json(stored);
  } catch(e) { next(e); }

});

// API Key Endpoints
app.get('/api/api-keys', async (req, res, next) => {
  try {
    const keys = await listApiKeys(req.tenantId);
    res.json(keys.map(k => ({
      id: k.id,
      label: k.label,
      lastFour: k.lastFour,
      createdAt: k.createdAt
    })));
  } catch(e) { next(e); }
});

app.post('/api/api-keys', async (req, res, next) => {
  try {
    const label = String(req.body?.label || 'Development key').slice(0, 80);
    const created = await createApiKey(req.tenantId, label);
    res.status(201).json({
      id: created.id,
      label: created.label,
      key: created.key,
      lastFour: created.lastFour,
      warning: 'Copy this key now. It is cryptographically hashed with SHA-256 and cannot be retrieved again.'
    });
  } catch(e) { next(e); }
});

app.delete('/api/api-keys/:id', async (req, res, next) => {
  try {
    const revoked = await revokeApiKey(req.tenantId, req.params.id);
    if (!revoked) {
      return res.status(404).json({ error: 'API key not found for this tenant.' });
    }
    res.status(204).end();
  } catch(e) { next(e); }
});

app.get('/api/metrics', async (req, res, next) => {
  try {
    const [workflows, executions] = await Promise.all([
      listWorkflows(req.tenantId),
      listExecutions(req.tenantId)
    ]);
    const failed = executions.filter(e => ['Failed','Compensated'].includes(e.status)).length;
    res.json({
      workflowCount: workflows.length,
      activeWorkflows: workflows.filter(w=>w.status==='Active').length,
      executionCount: executions.length,
      completed: executions.filter(e=>e.status==='Completed').length,
      failed,
      running: executions.filter(e=>e.status==='Running').length,
      recentExecutions: executions.slice(0,8)
    });
  } catch(e) { next(e); }
});

// --- MONGODB CHANGE STREAM REACTIVE ENDPOINTS ---

app.get('/api/events', async (req, res) => {
  const events = [...eventsMemory.values()]
    .filter(e => e.tenantId === req.tenantId)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(events);
});

app.post('/api/events', async (req, res, next) => {
  try {
    const eventType = String(req.body?.eventType || 'order.created').trim();
    const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {};
    const id = `EVT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const eventDoc = {
      id,
      tenantId: req.tenantId,
      eventType,
      payload,
      createdAt: new Date()
    };

    eventsMemory.set(scopedKey(req.tenantId, id), eventDoc);

    // Emits official MongoDB Change Stream specification event
    const changeStreamPayload = emitChangeEvent(eventDoc, 'insert');

    res.status(201).json({
      ok: true,
      message: `Event ${id} emitted to Change Stream. Matching workflows triggered reactively.`,
      event: eventDoc,
      changeStream: changeStreamPayload
    });
  } catch (err) {
    next(err);
  }
});

// Initialize Reactive Change Stream Engine Listener
export const stopChangeStream = initChangeStreamListener({
  listWorkflows,
  executeWorkflow,
  storeExecution,
  io
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error.' });
});

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { mongoReady = true; console.log('Connected to MongoDB.'); })
    .catch(err => console.error('MongoDB unavailable; API will remain in demo memory mode:', err.message));
}

const isTestEnv = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
if (!isTestEnv) {
  server.listen(PORT, () => console.log(`FlowPilot API listening on http://localhost:${PORT} (${process.env.MONGODB_URI ? 'MongoDB optional' : 'memory demo mode'})`));
}

export { app, server };

