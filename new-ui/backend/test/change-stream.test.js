import test from 'node:test';
import assert from 'node:assert/strict';
import { emitChangeEvent, initChangeStreamListener } from '../src/change-stream.js';
import { executeWorkflow } from '../src/workflow-engine.js';

test('emitChangeEvent produces official MongoDB Change Stream payload structure', () => {
  const doc = { id: 'EVT-101', tenantId: 'demo-tenant', eventType: 'order.created', payload: { total: 450 } };
  const change = emitChangeEvent(doc, 'insert');

  assert.equal(change.operationType, 'insert');
  assert.equal(change.ns.db, 'flowpilot');
  assert.equal(change.ns.coll, 'events');
  assert.equal(change.documentKey._id, 'EVT-101');
  assert.equal(change.fullDocument.eventType, 'order.created');
  assert.equal(change.fullDocument.payload.total, 450);
  assert.ok(change._id._data.startsWith('82'));
  assert.ok(change.clusterTime);
});

test('Change Stream reactively triggers matching workflow upon event insert', async () => {
  const executed = [];
  const stored = [];

  const mockWorkflows = [
    {
      id: 'WF-TRIGGER-TEST',
      name: 'Auto Triggered Pipeline',
      status: 'Active',
      tenantId: 'tenant-stream-test',
      nodes: [
        { id: '1', data: { label: 'Order Trigger', sub: 'Trigger · Webhook' } },
        { id: '2', data: { label: 'Fulfill Order', sub: 'Action' } }
      ],
      edges: [{ id: 'e1', source: '1', target: '2' }]
    }
  ];

  const stop = initChangeStreamListener({
    listWorkflows: async (tId) => mockWorkflows.filter(w => w.tenantId === tId),
    executeWorkflow: async (wf, options) => {
      const res = await executeWorkflow(wf, options);
      executed.push(res);
      return res;
    },
    storeExecution: async (tId, exec) => {
      stored.push({ tId, exec });
      return exec;
    },
    io: null
  });

  // Emit an event document to the Change Stream
  emitChangeEvent({
    id: 'EVT-STREAM-01',
    tenantId: 'tenant-stream-test',
    eventType: 'order.created',
    payload: { customer: 'Bruce Wayne', orderTotal: 5000 }
  }, 'insert');

  // Allow microtask queue to process reactive execution
  await new Promise(resolve => setTimeout(resolve, 50));

  stop();

  assert.equal(executed.length, 1);
  assert.equal(executed[0].status, 'Completed');
  assert.equal(executed[0].workflowName, 'Auto Triggered Pipeline');
  assert.equal(executed[0].context.customer, 'Bruce Wayne');
  assert.equal(executed[0].context.orderTotal, 5000);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].tId, 'tenant-stream-test');
});

test('Change Stream does not trigger workflows of a different tenant', async () => {
  const executed = [];

  const stop = initChangeStreamListener({
    listWorkflows: async (tId) => tId === 'tenant-other' ? [
      {
        id: 'WF-OTHER-TENANT',
        name: 'Other Tenant Pipeline',
        status: 'Active',
        tenantId: 'tenant-other',
        nodes: [{ id: '1', data: { label: 'Start', sub: 'Trigger' } }],
        edges: []
      }
    ] : [],
    executeWorkflow: async (wf, opts) => {
      executed.push(wf);
      return { id: 'EX-TEST', status: 'Completed' };
    },
    storeExecution: async () => {},
    io: null
  });

  // Emit an event for a non-existent tenant
  emitChangeEvent({
    id: 'EVT-ISOLATION-02',
    tenantId: 'tenant-with-no-workflows',
    eventType: 'payment.received',
    payload: {}
  }, 'insert');

  await new Promise(resolve => setTimeout(resolve, 50));
  stop();

  assert.equal(executed.length, 0);
});
