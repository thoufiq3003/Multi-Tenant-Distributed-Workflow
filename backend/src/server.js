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
import { executeWorkflow, validateWorkflow } from './workflow-engine.js';

const app = express();
const server = createServer(app);
const io = new SocketServer(server, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST', 'PATCH', 'DELETE'] } });
const PORT = Number(process.env.PORT || 4000);
let mongoReady = false;
const workflowsMemory = new Map();
const executionsMemory = new Map();
const keysMemory = new Map();
const scopedKey = (tenantId, id) => `${tenantId}:${id}`;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use((req, res, next) => {
  const tenantId = String(req.header('x-tenant-id') || 'demo-tenant').trim();
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId)) return res.status(400).json({ error: 'Invalid tenant identifier.' });
  req.tenantId = tenantId;
  next();
});

io.use((socket, next) => {
  const tenantId = String(socket.handshake.auth?.tenantId || 'demo-tenant');
  if (!/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId)) return next(new Error('Invalid tenant identifier'));
  socket.data.tenantId = tenantId; next();
});
io.on('connection', socket => socket.join(`tenant:${socket.data.tenantId}`));

function plain(doc) {
  if (!doc) return null;
  const x = doc.toObject ? doc.toObject() : { ...doc };
  x.id = String(x._id || x.id); delete x.__v;
  return x;
}
async function listWorkflows(tenantId) {
  if (mongoReady) return (await Workflow.find({ tenantId }).sort({ updatedAt: -1 })).map(plain);
  return [...workflowsMemory.values()].filter(w => w.tenantId === tenantId).sort((a,b) => new Date(b.updatedAt)-new Date(a.updatedAt));
}
async function getWorkflow(tenantId, id) {
  if (mongoReady) {
    if (mongoose.isValidObjectId(id)) { const byId = await Workflow.findOne({ _id: id, tenantId }); if (byId) return plain(byId); }
    return null;
  }
  return workflowsMemory.get(scopedKey(tenantId, id)) || null;
}
async function saveWorkflow(tenantId, body, id = null) {
  const payload = { name: String(body.name || '').trim(), description: String(body.description || ''), status: body.status || 'Draft', nodes: Array.isArray(body.nodes) ? body.nodes : [], edges: Array.isArray(body.edges) ? body.edges : [], settings: body.settings && typeof body.settings === 'object' ? body.settings : {}, updatedAt: new Date() };
  if (!payload.name) { const error = new Error('Workflow name is required.'); error.status = 400; throw error; }
  if (payload.name.length > 120) { const error = new Error('Workflow name must be 120 characters or fewer.'); error.status = 400; throw error; }
  if (mongoReady) {
    let doc;
    if (id && mongoose.isValidObjectId(id)) doc = await Workflow.findOneAndUpdate({ _id: id, tenantId }, { $set: payload }, { new: true, runValidators: true });
    if (!doc) doc = await Workflow.create({ ...payload, tenantId });
    return plain(doc);
  }
  const key = id ? scopedKey(tenantId, id) : null;
  const existing = key ? workflowsMemory.get(key) : null;
  const item = { ...(existing || {}), ...payload, id: existing?.id || `WF-${crypto.randomUUID().slice(0,8).toUpperCase()}`, tenantId, createdAt: existing?.createdAt || new Date() };
  workflowsMemory.set(scopedKey(tenantId, item.id), item); return item;
}
async function storeExecution(tenantId, data) {
  const item = { ...data, tenantId };
  if (mongoReady) {
    const doc = await Execution.create({ ...item, workflowId: String(item.workflowId) });
    return plain(doc);
  }
  executionsMemory.set(scopedKey(tenantId, item.id), item); return item;
}
async function listExecutions(tenantId, workflowId) {
  if (mongoReady) {
    const query = { tenantId }; if (workflowId) query.workflowId = workflowId;
    return (await Execution.find(query).sort({ startedAt: -1 }).limit(200)).map(plain);
  }
  return [...executionsMemory.values()].filter(e => e.tenantId === tenantId && (!workflowId || String(e.workflowId) === String(workflowId))).sort((a,b) => new Date(b.startedAt)-new Date(a.startedAt));
}
async function getExecution(tenantId, id) {
  if (mongoReady) {
    if (mongoose.isValidObjectId(id)) return plain(await Execution.findOne({ _id: id, tenantId }));
    return null;
  }
  return executionsMemory.get(scopedKey(tenantId, id)) || null;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'flowpilot-api', database: mongoReady ? 'mongodb' : 'memory-demo', time: new Date().toISOString() }));
app.get('/api/workflows', async (req, res, next) => { try { res.json(await listWorkflows(req.tenantId)); } catch(e) { next(e); } });
app.post('/api/workflows/validate', (req, res) => res.json(validateWorkflow(req.body || {})));
app.post('/api/workflows', async (req, res, next) => { try { const item = await saveWorkflow(req.tenantId, req.body || {}); res.status(201).json(item); } catch(e) { next(e); } });
app.get('/api/workflows/:id', async (req, res, next) => { try { const item = await getWorkflow(req.tenantId, req.params.id); if (!item) return res.status(404).json({ error: 'Workflow not found for this tenant.' }); res.json(item); } catch(e) { next(e); } });
app.put('/api/workflows/:id', async (req, res, next) => { try { const current = await getWorkflow(req.tenantId, req.params.id); if (!current) return res.status(404).json({ error: 'Workflow not found for this tenant.' }); const item = await saveWorkflow(req.tenantId, req.body || {}, req.params.id); res.json(item); } catch(e) { next(e); } });
app.patch('/api/workflows/:id/status', async (req, res, next) => { try { const current = await getWorkflow(req.tenantId, req.params.id); if (!current) return res.status(404).json({ error: 'Workflow not found for this tenant.' }); const status = req.body?.status; if (!['Draft','Active','Paused'].includes(status)) return res.status(400).json({ error: 'Status must be Draft, Active, or Paused.' }); const updated = await saveWorkflow(req.tenantId, { ...current, status }, req.params.id); res.json(updated); } catch(e) { next(e); } });
app.delete('/api/workflows/:id', async (req, res, next) => { try { const current = await getWorkflow(req.tenantId, req.params.id); if (!current) return res.status(404).json({ error: 'Workflow not found for this tenant.' }); if (mongoReady) await Workflow.deleteOne({ _id: current.id, tenantId: req.tenantId }); else workflowsMemory.delete(scopedKey(req.tenantId, req.params.id)); res.status(204).end(); } catch(e) { next(e); } });
app.post('/api/workflows/:id/publish', async (req, res, next) => { try { const current = await getWorkflow(req.tenantId, req.params.id); if (!current) return res.status(404).json({ error: 'Workflow not found for this tenant.' }); const result = validateWorkflow(current); if (!result.valid) return res.status(422).json({ error: 'Workflow validation failed.', validation: result }); const updated = await saveWorkflow(req.tenantId, { ...current, status: 'Active' }, req.params.id); io.to(`tenant:${req.tenantId}`).emit('workflow:published', { workflowId: updated.id, name: updated.name }); res.json(updated); } catch(e) { next(e); } });
app.post('/api/workflows/:id/execute', async (req, res, next) => { try { const workflow = await getWorkflow(req.tenantId, req.params.id); if (!workflow) return res.status(404).json({ error: 'Workflow not found for this tenant.' }); const validation = validateWorkflow(workflow); if (!validation.valid) return res.status(422).json({ error: 'Workflow validation failed.', validation }); const result = await executeWorkflow(workflow, { retryCount: Math.min(4, Math.max(0, Number(req.body?.retryCount ?? 2))), backoffMs: 100 }); const stored = await storeExecution(req.tenantId, result); io.to(`tenant:${req.tenantId}`).emit('execution:updated', stored); res.status(201).json(stored); } catch(e) { next(e); } });
app.get('/api/executions', async (req, res, next) => { try { res.json(await listExecutions(req.tenantId, req.query.workflowId)); } catch(e) { next(e); } });
app.get('/api/executions/:id', async (req, res, next) => { try { const item = await getExecution(req.tenantId, req.params.id); if (!item) return res.status(404).json({ error: 'Execution not found for this tenant.' }); res.json(item); } catch(e) { next(e); } });
app.post('/api/executions/:id/retry', async (req, res, next) => { try { const old = await getExecution(req.tenantId, req.params.id); if (!old) return res.status(404).json({ error: 'Execution not found for this tenant.' }); const workflow = await getWorkflow(req.tenantId, old.workflowId); if (!workflow) return res.status(404).json({ error: 'Source workflow not found.' }); const result = await executeWorkflow(workflow, { retryCount: 2, backoffMs: 100 }); const stored = await storeExecution(req.tenantId, result); io.to(`tenant:${req.tenantId}`).emit('execution:updated', stored); res.status(201).json(stored); } catch(e) { next(e); } });
app.post('/api/api-keys', (req, res) => { const label = String(req.body?.label || 'Development key').slice(0,80); const raw = `fp_${crypto.randomBytes(24).toString('hex')}`; const hash = crypto.createHash('sha256').update(raw + (process.env.API_KEY_PEPPER || 'development-pepper')).digest('hex'); const id = crypto.randomUUID(); keysMemory.set(scopedKey(req.tenantId,id), { id, tenantId:req.tenantId, label, hash, createdAt:new Date(), lastFour:raw.slice(-4) }); res.status(201).json({ id, label, key:raw, lastFour:raw.slice(-4), warning:'Copy this development key now. Only a hash is retained in memory.' }); });
app.get('/api/metrics', async (req, res, next) => { try { const [workflows, executions] = await Promise.all([listWorkflows(req.tenantId), listExecutions(req.tenantId)]); const failed = executions.filter(e => ['Failed','Compensated'].includes(e.status)).length; res.json({ workflowCount: workflows.length, activeWorkflows: workflows.filter(w=>w.status==='Active').length, executionCount: executions.length, completed: executions.filter(e=>e.status==='Completed').length, failed, running: executions.filter(e=>e.status==='Running').length, recentExecutions: executions.slice(0,8) }); } catch(e) { next(e); } });
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error.' }); });

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI).then(() => { mongoReady = true; console.log('Connected to MongoDB.'); }).catch(err => console.error('MongoDB unavailable; API will remain in demo memory mode:', err.message));
}
server.listen(PORT, () => console.log(`FlowPilot API listening on http://localhost:${PORT} (${process.env.MONGODB_URI ? 'MongoDB optional' : 'memory demo mode'})`));
