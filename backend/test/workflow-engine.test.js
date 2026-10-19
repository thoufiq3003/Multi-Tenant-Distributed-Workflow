import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkflow, executeWorkflow } from '../src/workflow-engine.js';

const nodes = [
  { id:'trigger', data:{ label:'Order Created', sub:'Trigger · Webhook', config:{} } },
  { id:'condition', data:{ label:'Payment condition', sub:'Condition', config:{ branchResult:'yes' } } },
  { id:'ship', data:{ label:'Ship Order', sub:'Action', config:{} } },
  { id:'cancel', data:{ label:'Cancel Order', sub:'Compensation', config:{} } }
];
const edges = [
  { id:'a', source:'trigger', target:'condition' },
  { id:'b', source:'condition', target:'ship', label:'yes' },
  { id:'c', source:'condition', target:'cancel', label:'no' }
];

test('valid DAG passes validation', () => assert.equal(validateWorkflow({ nodes, edges }).valid, true));
test('cycle is detected', () => assert.ok(validateWorkflow({ nodes, edges:[...edges,{id:'loop',source:'ship',target:'trigger'}] }).errors.some(e=>e.includes('Loop detected'))));
test('unreachable node is reported', () => assert.ok(validateWorkflow({ nodes:[...nodes,{id:'orphan',data:{label:'Orphan',sub:'Action'}}], edges }).errors.some(e=>e.includes('Unreachable'))));
test('executor follows configured branch and completes', async () => { const result=await executeWorkflow({id:'WF-TEST',name:'Test workflow',nodes,edges},{backoffMs:0}); assert.equal(result.status,'Completed'); assert.ok(result.steps.some(s=>s.nodeId==='ship')); assert.ok(!result.steps.some(s=>s.nodeId==='cancel')); });
test('executor retries simulated failure then fails', async () => { const broken=nodes.map(n=>n.id==='ship'?{...n,data:{...n.data,config:{simulateFailure:true}}}:n); const result=await executeWorkflow({id:'WF-TEST',name:'Test workflow',nodes:broken,edges},{retryCount:1,backoffMs:0}); assert.equal(result.status,'Failed'); assert.equal(result.retryCount,1); });


test('Saga rollback compensates completed compensatable steps in reverse order', async () => {
  const sagaNodes = [
    { id: 'start', data: { label: 'Start', sub: 'Trigger', config: {} } },
    { id: 'reserve', data: { label: 'Reserve Inventory', sub: 'Action', config: { compensatable: true, compensationLabel: 'Release Inventory' } } },
    { id: 'charge', data: { label: 'Charge Payment', sub: 'Action', config: { simulateFailure: true } } },
    { id: 'end', data: { label: 'End', sub: 'End', config: {} } }
  ];
  const sagaEdges = [
    { id: 'e1', source: 'start', target: 'reserve' },
    { id: 'e2', source: 'reserve', target: 'charge' },
    { id: 'e3', source: 'charge', target: 'end' }
  ];
  const result = await executeWorkflow({ id: 'WF-SAGA', name: 'Saga test', nodes: sagaNodes, edges: sagaEdges }, { retryCount: 0, backoffMs: 0 });
  assert.equal(result.status, 'Compensated');
  const rollback = result.steps.find(step => step.compensationFor === 'reserve');
  assert.equal(rollback.name, 'Release Inventory');
  assert.equal(rollback.status, 'Compensated');
});

test('execution reports compensation failure distinctly', async () => {
  const sagaNodes = [
    { id: 'start', data: { label: 'Start', sub: 'Trigger', config: {} } },
    { id: 'reserve', data: { label: 'Reserve Inventory', sub: 'Action', config: { compensatable: true, simulateCompensationFailure: true } } },
    { id: 'charge', data: { label: 'Charge Payment', sub: 'Action', config: { simulateFailure: true } } }
  ];
  const sagaEdges = [
    { id: 'e1', source: 'start', target: 'reserve' },
    { id: 'e2', source: 'reserve', target: 'charge' }
  ];
  const result = await executeWorkflow({ id: 'WF-SAGA-FAIL', name: 'Saga failure test', nodes: sagaNodes, edges: sagaEdges }, { retryCount: 0, backoffMs: 0 });
  assert.equal(result.status, 'Compensation Failed');
  assert.ok(result.steps.some(step => step.status === 'Compensation Failed'));
});
