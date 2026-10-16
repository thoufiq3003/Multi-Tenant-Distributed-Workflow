import { randomUUID } from 'node:crypto';

export function validateWorkflow({ nodes = [], edges = [] }) {
  const errors = [];
  if (!Array.isArray(nodes) || nodes.length === 0) return { valid: false, errors: ['Add at least one node to the workflow.'] };
  if (!Array.isArray(edges)) return { valid: false, errors: ['Connections must be a list.'] };
  const ids = new Set();
  for (const node of nodes) {
    if (!node?.id) errors.push('Every node must have an ID.');
    else if (ids.has(String(node.id))) errors.push(`Duplicate node ID: ${node.id}.`);
    ids.add(String(node.id));
    if (!String(node?.data?.label ?? '').trim()) errors.push(`Node ${node.id || '(unknown)'} needs a label.`);
  }
  const outgoing = new Map(nodes.map(n => [String(n.id), []]));
  const incoming = new Map(nodes.map(n => [String(n.id), []]));
  for (const edge of edges) {
    if (!ids.has(String(edge.source)) || !ids.has(String(edge.target))) {
      errors.push(`Connection ${edge.id || '(unnamed)'} references a missing node.`); continue;
    }
    if (String(edge.source) === String(edge.target)) errors.push(`Node ${edge.source} cannot connect to itself.`);
    outgoing.get(String(edge.source)).push(String(edge.target));
    incoming.get(String(edge.target)).push(String(edge.source));
  }
  const triggerNodes = nodes.filter(n => /trigger|start/i.test(`${n.data?.sub || ''} ${n.data?.label || ''}`) || n.type === 'input');
  if (triggerNodes.length === 0) errors.push('Add a trigger or Start node.');
  const starts = triggerNodes.length ? triggerNodes : [nodes[0]];
  const visited = new Set(); const active = new Set(); let hasCycle = false;
  const dfs = id => {
    if (active.has(id)) { hasCycle = true; return; }
    if (visited.has(id)) return;
    visited.add(id); active.add(id);
    for (const next of outgoing.get(id) || []) dfs(next);
    active.delete(id);
  };
  starts.forEach(n => dfs(String(n.id)));
  if (hasCycle) errors.push('Loop detected. Workflow must be a directed acyclic graph (DAG).');
  const unreachable = nodes.filter(n => !visited.has(String(n.id)));
  if (unreachable.length) errors.push(`Unreachable nodes: ${unreachable.map(n => n.data?.label || n.id).join(', ')}.`);
  const sinks = nodes.filter(n => (outgoing.get(String(n.id)) || []).length === 0);
  if (!sinks.length) errors.push('Workflow needs at least one ending node.');
  for (const n of nodes) {
    const outs = outgoing.get(String(n.id)) || [];
    if (/condition|branch/i.test(`${n.data?.sub || ''} ${n.data?.label || ''}`) && outs.length < 2)
      errors.push(`Condition node “${n.data?.label || n.id}” should have at least two outgoing connections.`);
  }
  return { valid: errors.length === 0, errors, nodeCount: nodes.length, edgeCount: edges.length };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function executeWorkflow(workflow, { retryCount = 2, backoffMs = 150 } = {}) {
  const startedAt = new Date();
  const execution = {
    id: `EX-${randomUUID().slice(0, 8).toUpperCase()}`,
    workflowId: String(workflow._id || workflow.id), workflowName: workflow.name,
    status: 'Running', startedAt, finishedAt: null, durationMs: 0,
    retryCount: 0, steps: [], logs: [], error: null
  };
  const log = (level, message, nodeId) => execution.logs.push({ at: new Date(), level, message, nodeId });
  const nodes = workflow.nodes || []; const edges = workflow.edges || [];
  const validation = validateWorkflow({ nodes, edges });
  if (!validation.valid) {
    execution.status = 'Failed'; execution.error = validation.errors.join(' ');
    log('ERROR', execution.error); execution.finishedAt = new Date(); execution.durationMs = execution.finishedAt - startedAt;
    return execution;
  }
  const byId = new Map(nodes.map(n => [String(n.id), n]));
  const outgoing = new Map(nodes.map(n => [String(n.id), []]));
  edges.forEach(e => outgoing.get(String(e.source))?.push(e));
  const triggers = nodes.filter(n => /trigger|start/i.test(`${n.data?.sub || ''} ${n.data?.label || ''}`) || n.type === 'input');
  const queue = triggers.map(n => String(n.id)); const visited = new Set(); const completed = [];
  log('INFO', `Execution started for workflow “${workflow.name}”.`);
  while (queue.length) {
    const id = queue.shift(); if (visited.has(id)) continue; visited.add(id);
    const node = byId.get(id); if (!node) continue;
    const step = { nodeId: id, name: node.data?.label || id, status: 'Running', startedAt: new Date(), attempts: 0, logs: [] };
    execution.steps.push(step); log('INFO', `Started step: ${step.name}.`, id);
    const configuredFailure = node.data?.config?.simulateFailure === true;
    let succeeded = false; let lastError = '';
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      step.attempts = attempt + 1;
      if (attempt) { execution.retryCount++; await sleep(backoffMs * (2 ** (attempt - 1))); log('WARN', `Retry ${attempt}/${retryCount} for ${step.name}.`, id); }
      if (!configuredFailure) { succeeded = true; break; }
      lastError = `Configured demo failure at ${step.name}`;
    }
    step.finishedAt = new Date(); step.durationMs = step.finishedAt - step.startedAt;
    if (!succeeded) {
      step.status = 'Failed'; step.error = lastError; execution.status = 'Failed'; execution.error = lastError;
      log('ERROR', lastError, id);
      // Saga-style demo compensation: run completed nodes explicitly marked as compensatable in reverse order.
      const compensations = completed.filter(n => n.data?.config?.compensatable === true || /compensation|cancel|refund/i.test(n.data?.label || '')).reverse();
      for (const comp of compensations) {
        const compStep = { nodeId: String(comp.id), name: `Compensate: ${comp.data?.label || comp.id}`, status: 'Compensated', startedAt: new Date(), finishedAt: new Date(), attempts: 1 };
        execution.steps.push(compStep); log('WARN', `Compensation executed: ${compStep.name}.`, String(comp.id));
      }
      execution.status = compensations.length ? 'Compensated' : 'Failed';
      break;
    }
    step.status = 'Completed'; completed.push(node); log('INFO', `Completed step: ${step.name}.`, id);
    const outs = outgoing.get(id) || [];
    if (/condition|branch/i.test(`${node.data?.sub || ''} ${node.data?.label || ''}`) && outs.length > 1) {
      // Demo branching: config.branchResult can be "yes" or "no"; default follows first edge.
      const desired = String(node.data?.config?.branchResult || 'yes').toLowerCase();
      const chosen = outs.find(e => String(e.label || '').toLowerCase() === desired) || outs[0];
      if (chosen) queue.push(String(chosen.target));
    } else outs.forEach(e => queue.push(String(e.target)));
  }
  if (execution.status === 'Running') execution.status = 'Completed';
  execution.finishedAt = new Date(); execution.durationMs = execution.finishedAt - startedAt;
  log('INFO', `Execution finished with status ${execution.status}.`);
  return execution;
}
