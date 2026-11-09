import test from 'node:test';
import assert from 'node:assert/strict';
import { executeSandboxedScript } from '../src/sandbox.js';
import { executeWorkflow } from '../src/workflow-engine.js';
import {
  pushToDlq,
  listDlq,
  deleteDlq,
  saveWorkflow,
  storeExecution
} from '../src/server.js';

test('executeSandboxedScript transforms input payload safely', async () => {
  const code = `
    return {
      fullName: input.firstName + ' ' + input.lastName,
      orderTotalWithTax: input.subtotal * 1.18,
      isVip: input.totalSpent > 1000
    };
  `;
  const input = { firstName: 'Bruce', lastName: 'Wayne', subtotal: 500, totalSpent: 2500 };
  const result = await executeSandboxedScript(code, input);

  assert.equal(result.fullName, 'Bruce Wayne');
  assert.equal(result.orderTotalWithTax, 590);
  assert.equal(result.isVip, true);
});

test('executeSandboxedScript terminates infinite loops cleanly via timeout', async () => {
  const infiniteLoopCode = `
    while (true) {}
    return { done: true };
  `;
  await assert.rejects(
    async () => {
      await executeSandboxedScript(infiniteLoopCode, {}, {}, 100);
    },
    /Sandbox execution timed out/
  );
});

test('executeSandboxedScript restricts dangerous globals (process, require, fs)', async () => {
  const maliciousCode = `
    return {
      hasProcess: typeof process !== 'undefined',
      hasRequire: typeof require !== 'undefined',
      hasGlobal: typeof global !== 'undefined'
    };
  `;
  const result = await executeSandboxedScript(maliciousCode, {});
  assert.equal(result.hasProcess, false);
  assert.equal(result.hasRequire, false);
  assert.equal(result.hasGlobal, false);
});

test('workflow-engine executes transform node through isolated sandbox', async () => {
  const workflow = {
    id: 'WF-SANDBOX-TEST',
    name: 'Order Transformation Workflow',
    tenantId: 'tenant-sandbox-demo',
    nodes: [
      { id: '1', data: { label: 'Start', sub: 'Trigger' } },
      {
        id: '2',
        data: {
          label: 'Format Currency',
          sub: 'Transform · JavaScript',
          config: {
            script: `
              return {
                formattedPrice: '$' + input.price.toFixed(2),
                taxAmount: Math.round(input.price * 0.1 * 100) / 100,
                approved: true
              };
            `
          }
        }
      }
    ],
    edges: [{ id: 'e1', source: '1', target: '2' }]
  };

  const execution = await executeWorkflow(workflow, {
    context: { price: 99.5 }
  });

  assert.equal(execution.status, 'Completed');
  assert.equal(execution.context.formattedPrice, '$99.50');
  assert.equal(execution.context.taxAmount, 9.95);
  assert.equal(execution.context.approved, true);
});

test('Dead-Letter Queue (DLQ) captures failed executions', async () => {
  const tenantId = 'tenant-dlq-test';
  const failedExecution = {
    id: 'EX-DLQ-01',
    workflowId: 'WF-FAIL-01',
    workflowName: 'Failing Pipeline',
    status: 'Failed',
    error: 'Payment gateway timeout',
    failedStep: { nodeId: 'step-payment', name: 'Charge Card', error: 'Payment gateway timeout' },
    retryCount: 2,
    context: { orderId: 'ORD-DLQ-100' }
  };

  const stored = await storeExecution(tenantId, failedExecution);
  assert.equal(stored.status, 'Failed');

  const dlqItems = await listDlq(tenantId);
  assert.ok(dlqItems.length > 0);
  const found = dlqItems.find(d => d.executionId === 'EX-DLQ-01');
  assert.ok(found);
  assert.equal(found.workflowName, 'Failing Pipeline');
  assert.equal(found.failedStepName, 'Charge Card');
  assert.equal(found.status, 'dead');
});

test('multi-tenant DLQ data isolation: Tenant A cannot see Tenant B DLQ', async () => {
  const tenantA = 'tenant-dlq-alpha';
  const tenantB = 'tenant-dlq-beta';

  await pushToDlq(tenantA, {
    id: 'EX-A',
    workflowId: 'WF-A',
    status: 'Failed',
    error: 'Alpha error'
  });

  await pushToDlq(tenantB, {
    id: 'EX-B',
    workflowId: 'WF-B',
    status: 'Failed',
    error: 'Beta error'
  });

  const dlqA = await listDlq(tenantA);
  const dlqB = await listDlq(tenantB);

  assert.ok(dlqA.some(d => d.executionId === 'EX-A'));
  assert.ok(!dlqA.some(d => d.executionId === 'EX-B'));

  assert.ok(dlqB.some(d => d.executionId === 'EX-B'));
  assert.ok(!dlqB.some(d => d.executionId === 'EX-A'));
});
