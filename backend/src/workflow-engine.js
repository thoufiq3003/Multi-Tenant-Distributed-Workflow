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

export async function executeWorkflow(workflow, {
  retryCount = 2,
  backoffMs = 150,
  context = {},
  onStepProgress = null
} = {}) {
  const startedAt = new Date();
  const execution = {
    id: `EX-${randomUUID().slice(0, 8).toUpperCase()}`,
    workflowId: String(workflow._id || workflow.id),
    workflowName: workflow.name,
    status: 'Running',
    startedAt,
    finishedAt: null,
    durationMs: 0,
    retryCount: 0,
    steps: [],
    logs: [],
    error: null,
    context: { ...context }
  };

  const emit = (eventType, payload) => {
    if (typeof onStepProgress === 'function') {
      try {
        onStepProgress({
          type: eventType,
          executionId: execution.id,
          workflowId: execution.workflowId,
          timestamp: new Date().toISOString(),
          ...payload
        });
      } catch (_err) {
        // progress callback errors do not disrupt execution
      }
    }
  };

  const log = (level, message, nodeId) => {
    const entry = { at: new Date(), level, message, nodeId };
    execution.logs.push(entry);
    emit('execution:log', { log: entry });
  };

  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];
  const validation = validateWorkflow({ nodes, edges });
  if (!validation.valid) {
    execution.status = 'Failed';
    execution.error = validation.errors.join(' ');
    log('ERROR', execution.error);
    execution.finishedAt = new Date();
    execution.durationMs = execution.finishedAt - startedAt;
    emit('execution:finished', { execution });
    return execution;
  }

  emit('execution:started', { execution });
  log('INFO', `Execution started for workflow “${workflow.name}”.`);

  const byId = new Map(nodes.map(n => [String(n.id), n]));
  const outgoing = new Map(nodes.map(n => [String(n.id), []]));
  edges.forEach(e => outgoing.get(String(e.source))?.push(e));

  const triggers = nodes.filter(n => /trigger|start/i.test(`${n.data?.sub || ''} ${n.data?.label || ''}`) || n.type === 'input');
  const queue = triggers.map(n => String(n.id));
  const visited = new Set();
  const completed = [];

  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (!node) continue;

    const step = {
      nodeId: id,
      name: node.data?.label || id,
      status: 'Running',
      startedAt: new Date(),
      attempts: 0,
      logs: []
    };
    execution.steps.push(step);
    emit('step:started', { nodeId: id, step });
    log('INFO', `Started step: ${step.name}.`, id);

    const configuredFailure = node.data?.config?.simulateFailure === true;
    const httpUrl = node.data?.config?.url?.trim();
    let succeeded = false;
    let lastError = '';

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      step.attempts = attempt + 1;
      if (attempt) {
        execution.retryCount++;
        emit('step:retry', { nodeId: id, attempt, retryCount, step });
        await sleep(backoffMs * (2 ** (attempt - 1)));
        log('WARN', `Retry ${attempt}/${retryCount} for ${step.name}.`, id);
      }

      if (configuredFailure) {
        lastError = `Configured demo failure at ${step.name}`;
        continue;
      }

      // If a real HTTP URL is configured, perform genuine external HTTP dispatch
      if (httpUrl) {
        try {
          const method = String(node.data?.config?.method || 'GET').toUpperCase();
          const timeoutMs = Number(node.data?.config?.timeoutMs || 5000);
          const reqHeaders = {
            'Content-Type': 'application/json',
            ...(node.data?.config?.headers || {})
          };
          const fetchOptions = {
            method,
            headers: reqHeaders,
            signal: AbortSignal.timeout(timeoutMs)
          };
          if (['POST', 'PUT', 'PATCH'].includes(method) && node.data?.config?.body) {
            fetchOptions.body = typeof node.data.config.body === 'string'
              ? node.data.config.body
              : JSON.stringify(node.data.config.body);
          }

          const response = await fetch(httpUrl, fetchOptions);
          let responseData = null;
          const text = await response.text();
          try { responseData = JSON.parse(text); } catch { responseData = text; }

          step.output = { status: response.status, data: responseData };
          execution.context[id] = responseData;

          if (!response.ok) {
            throw new Error(`HTTP ${method} to ${httpUrl} failed with status ${response.status}: ${response.statusText}`);
          }

          log('INFO', `HTTP request to ${httpUrl} succeeded (${response.status}).`, id);
          succeeded = true;
          break;
        } catch (fetchErr) {
          lastError = fetchErr.message;
          log('WARN', `HTTP attempt ${attempt + 1} failed: ${fetchErr.message}`, id);
          continue;
        }
      }

      // Default simulated action succeeds
      succeeded = true;
      break;
    }

    step.finishedAt = new Date();
    step.durationMs = step.finishedAt - step.startedAt;

    if (!succeeded) {
      step.status = 'Failed';
      step.error = lastError;
      execution.status = 'Failed';
      execution.error = lastError;
      emit('step:failed', { nodeId: id, step, error: lastError });
      log('ERROR', lastError, id);

      // Saga rollback: compensate completed compensatable steps in reverse order
      const compensations = completed
        .filter(n => n.data?.config?.compensatable === true)
        .reverse();
      let compensationFailed = false;

      for (const comp of compensations) {
        const compensationStartedAt = new Date();
        const compensationName = comp.data?.config?.compensationLabel || `Compensate: ${comp.data?.label || comp.id}`;
        const failedCompensation = comp.data?.config?.simulateCompensationFailure === true;
        const compUrl = comp.data?.config?.compensationUrl?.trim();

        const compStep = {
          nodeId: String(comp.id),
          name: compensationName,
          status: 'Compensating',
          compensationFor: String(comp.id),
          startedAt: compensationStartedAt,
          finishedAt: null,
          attempts: 1
        };
        execution.steps.push(compStep);
        emit('step:compensating', { nodeId: String(comp.id), compStep });

        // If real compensation HTTP endpoint configured, call it
        if (compUrl && !failedCompensation) {
          try {
            await fetch(compUrl, {
              method: comp.data?.config?.compensationMethod || 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(5000),
              body: JSON.stringify({ reason: 'Saga rollback', failedAt: step.name, originalNodeId: comp.id })
            });
            log('WARN', `Real HTTP rollback executed at ${compUrl}.`, String(comp.id));
          } catch (compErr) {
            log('ERROR', `HTTP rollback to ${compUrl} failed: ${compErr.message}`, String(comp.id));
          }
        }

        compStep.finishedAt = new Date();
        compStep.durationMs = compStep.finishedAt - compStep.startedAt;

        if (failedCompensation) {
          compStep.status = 'Compensation Failed';
          compStep.error = `Compensation failed for ${comp.data?.label || comp.id}`;
          compensationFailed = true;
          emit('step:compensation_failed', { nodeId: String(comp.id), compStep });
          log('ERROR', compStep.error, String(comp.id));
        } else {
          compStep.status = 'Compensated';
          emit('step:compensated', { nodeId: String(comp.id), compStep });
          log('WARN', `Saga compensation completed: ${compensationName}.`, String(comp.id));
        }
      }

      execution.status = compensationFailed ? 'Compensation Failed' : (compensations.length ? 'Compensated' : 'Failed');
      if (compensationFailed) execution.error = `${lastError}; one or more compensation steps failed.`;
      break;
    }

    step.status = 'Completed';
    completed.push(node);
    emit('step:completed', { nodeId: id, step });
    log('INFO', `Completed step: ${step.name}.`, id);

    const outs = outgoing.get(id) || [];
    if (/condition|branch/i.test(`${node.data?.sub || ''} ${node.data?.label || ''}`) && outs.length > 1) {
      // Dynamic condition evaluation:
      // Evaluates rule against context/step output if present, or uses config.branchResult
      const configuredBranch = String(node.data?.config?.branchResult || 'yes').toLowerCase();
      let chosenBranch = configuredBranch;

      // If condition node specifies an expression rule (e.g. "order.total > 100")
      const conditionRule = node.data?.config?.rule;
      if (conditionRule) {
        try {
          const pass = Boolean(new Function('ctx', `with(ctx){ return (${conditionRule}); }`)(execution.context));
          chosenBranch = pass ? 'yes' : 'no';
          log('INFO', `Rule "${conditionRule}" evaluated to ${pass} (branch "${chosenBranch}").`, id);
        } catch (ruleErr) {
          log('WARN', `Rule evaluation fallback to default: ${ruleErr.message}`, id);
        }
      }

      const chosenEdge = outs.find(e => {
        const lbl = String(e.label || '').toLowerCase();
        return lbl === chosenBranch || (chosenBranch === 'yes' && ['true', 'success', 'yes'].includes(lbl)) || (chosenBranch === 'no' && ['false', 'failure', 'no'].includes(lbl));
      }) || outs[0];

      if (chosenEdge) {
        log('INFO', `Branch chosen: “${chosenEdge.label || 'default'}” pointing to node ${chosenEdge.target}.`, id);
        queue.push(String(chosenEdge.target));
      }
    } else {
      outs.forEach(e => queue.push(String(e.target)));
    }
  }

  if (execution.status === 'Running') execution.status = 'Completed';
  execution.finishedAt = new Date();
  execution.durationMs = execution.finishedAt - startedAt;
  emit('execution:finished', { execution });
  log('INFO', `Execution finished with status ${execution.status}.`);
  return execution;
}
