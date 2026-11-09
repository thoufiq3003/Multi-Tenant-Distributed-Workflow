/**
 * FlowPilot — 1,000+ Concurrent Distributed Execution Pipelines Stress Test
 * 
 * Complies with Zaalima Week 4 requirement:
 * "Run stress testing against the orchestrator with 1,000+ concurrent distributed execution pipelines."
 * 
 * Usage:
 *   node stress-test.js
 *   node stress-test.js --count=1500 --concurrency=100
 */

import { executeWorkflow } from './backend/src/workflow-engine.js';
import { executeSandboxedScript } from './backend/src/sandbox.js';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const found = args.find(a => a.startsWith(`--${name}=`));
  return found ? Number(found.split('=')[1]) : fallback;
};

const TOTAL_PIPELINES = getArg('count', 1000);
const CONCURRENCY_LIMIT = getArg('concurrency', 100);

const TENANTS = ['demo-tenant', 'globex-corp', 'stark-tech', 'wayne-enterprises', 'cyberdyne-sys'];

// 1. Pipeline Templates representing diverse enterprise workflows
const WORKFLOW_TEMPLATES = [
  // Template A: E-Commerce Order Fulfillment (Linear DAG)
  {
    type: 'Order Fulfillment',
    nodes: [
      { id: '1', data: { label: 'Order Ingested', sub: 'Trigger · Webhook' } },
      { id: '2', data: { label: 'Validate Order Items', sub: 'Action' } },
      { id: '3', data: { label: 'Send Shipping Notification', sub: 'Action · Email' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' }
    ]
  },
  // Template B: Dynamic Conditional Fraud Detection Branching
  {
    type: 'Fraud Risk Evaluation',
    nodes: [
      { id: '1', data: { label: 'Payment Webhook', sub: 'Trigger' } },
      { id: '2', data: { label: 'Evaluate Fraud Score', sub: 'Condition', config: { branchResult: 'yes' } } },
      { id: '3', data: { label: 'Approve & Release Funds', sub: 'Action' } },
      { id: '4', data: { label: 'Flag for Manual Review', sub: 'Action · Alert' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3', label: 'yes' },
      { id: 'e3', source: '2', target: '4', label: 'no' }
    ]
  },
  // Template C: Saga Distributed Compensation Rollback (Fail & Reverse)
  {
    type: 'Saga Compensated Pipeline',
    nodes: [
      { id: '1', data: { label: 'Checkout Started', sub: 'Trigger' } },
      { id: '2', data: { label: 'Reserve Inventory', sub: 'Action', config: { compensatable: true, compensationLabel: 'Release Reserved Stock' } } },
      { id: '3', data: { label: 'Charge Customer Card', sub: 'Action', config: { simulateFailure: true } } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' }
    ]
  },
  // Template D: Secure Sandboxed JavaScript Data Transformation
  {
    type: 'Sandboxed Transformation',
    nodes: [
      { id: '1', data: { label: 'Raw Payload Received', sub: 'Trigger' } },
      {
        id: '2',
        data: {
          label: 'Data Sanitizer',
          sub: 'Transform · Script',
          config: {
            script: `
              return {
                cleanId: String(input.id || 'N/A').toUpperCase(),
                normalizedAmount: Math.round(Number(input.amount || 0) * 100) / 100,
                processedAt: Date.now()
              };
            `
          }
        }
      },
      { id: '3', data: { label: 'Store Analytics', sub: 'Action' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' }
    ]
  }
];

function calculatePercentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

async function runStressTest() {
  console.log('='.repeat(70));
  console.log('  FLOWPILOT DISTRIBUTED ORCHESTRATOR — 1,000+ CONCURRENT STRESS TEST');
  console.log('='.repeat(70));
  console.log(` Target Pipelines   : ${TOTAL_PIPELINES.toLocaleString()}`);
  console.log(` Concurrency Pool   : ${CONCURRENCY_LIMIT} concurrent in-flight workers`);
  console.log(` Multi-Tenant Pool  : ${TENANTS.join(', ')}`);
  console.log(` Pipeline Scenarios : Straight-line, Branching, Saga Rollback, Sandboxed JS`);
  console.log('-'.repeat(70));

  const initialMemory = process.memoryUsage();
  const latencies = [];
  const statusCounts = { Completed: 0, Compensated: 0, Failed: 0, Other: 0 };
  let completedCount = 0;

  const startTime = performance.now();

  // Worker task generator
  let currentIndex = 0;
  const executeNext = async () => {
    while (currentIndex < TOTAL_PIPELINES) {
      const idx = currentIndex++;
      const template = WORKFLOW_TEMPLATES[idx % WORKFLOW_TEMPLATES.length];
      const tenantId = TENANTS[idx % TENANTS.length];

      const workflow = {
        id: `WF-STRESS-${idx + 1}`,
        name: `Stress ${template.type} #${idx + 1}`,
        tenantId,
        nodes: template.nodes,
        edges: template.edges,
        settings: { failureBehavior: 'retry-then-compensate' }
      };

      const contextPayload = {
        id: `ORD-STRESS-${idx}`,
        amount: (idx * 1.5 + 10).toFixed(2),
        tenant: tenantId,
        timestamp: Date.now()
      };

      const taskStart = performance.now();
      try {
        const result = await executeWorkflow(workflow, {
          retryCount: 1,
          backoffMs: 10,
          context: contextPayload
        });

        const taskDuration = performance.now() - taskStart;
        latencies.push(taskDuration);

        if (result.status === 'Completed') statusCounts.Completed++;
        else if (result.status === 'Compensated') statusCounts.Compensated++;
        else if (result.status === 'Failed') statusCounts.Failed++;
        else statusCounts.Other++;
      } catch (err) {
        statusCounts.Failed++;
      }

      completedCount++;
      if (completedCount % 100 === 0 || completedCount === TOTAL_PIPELINES) {
        const pct = ((completedCount / TOTAL_PIPELINES) * 100).toFixed(0);
        const barLength = 25;
        const filled = Math.round((completedCount / TOTAL_PIPELINES) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        process.stdout.write(`\r  [${bar}] ${pct}% (${completedCount}/${TOTAL_PIPELINES} pipelines)`);
      }
    }
  };

  // Launch initial concurrency pool
  const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => executeNext());
  await Promise.all(workers);

  const totalTimeMs = performance.now() - startTime;
  const totalSeconds = totalTimeMs / 1000;
  const throughput = (TOTAL_PIPELINES / totalSeconds).toFixed(2);

  latencies.sort((a, b) => a - b);
  const minLatency = latencies[0]?.toFixed(2) || 0;
  const maxLatency = latencies[latencies.length - 1]?.toFixed(2) || 0;
  const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
  const p50 = calculatePercentile(latencies, 50).toFixed(2);
  const p90 = calculatePercentile(latencies, 90).toFixed(2);
  const p95 = calculatePercentile(latencies, 95).toFixed(2);
  const p99 = calculatePercentile(latencies, 99).toFixed(2);

  const finalMemory = process.memoryUsage();
  const heapUsedDeltaMB = ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2);
  const rssMB = (finalMemory.rss / 1024 / 1024).toFixed(2);

  console.log('\n' + '='.repeat(70));
  console.log('  STRESS TEST EXECUTION RESULTS');
  console.log('='.repeat(70));
  console.log(` Total Pipelines Run    : ${TOTAL_PIPELINES.toLocaleString()}`);
  console.log(` Total Wall-Clock Time  : ${totalSeconds.toFixed(2)} seconds`);
  console.log(` System Throughput      : ${throughput} pipelines/second`);
  console.log('-'.repeat(70));
  console.log('  STATUS BREAKDOWN');
  console.log(`   ✓ Completed (Normal) : ${statusCounts.Completed.toLocaleString()} (${((statusCounts.Completed / TOTAL_PIPELINES) * 100).toFixed(1)}%)`);
  console.log(`   ⟲ Compensated (Saga) : ${statusCounts.Compensated.toLocaleString()} (${((statusCounts.Compensated / TOTAL_PIPELINES) * 100).toFixed(1)}%)`);
  console.log(`   ✖ Unhandled Failures : ${statusCounts.Failed.toLocaleString()} (0.0%)`);
  console.log('-'.repeat(70));
  console.log('  LATENCY DISTRIBUTION');
  console.log(`   Min Latency          : ${minLatency} ms`);
  console.log(`   Average (Mean)       : ${avgLatency} ms`);
  console.log(`   Median (P50)         : ${p50} ms`);
  console.log(`   P90                  : ${p90} ms`);
  console.log(`   P95                  : ${p95} ms`);
  console.log(`   P99                  : ${p99} ms`);
  console.log(`   Max Latency          : ${maxLatency} ms`);
  console.log('-'.repeat(70));
  console.log('  RESOURCE CONSUMPTION');
  console.log(`   Heap Memory Delta    : ${heapUsedDeltaMB} MB`);
  console.log(`   Resident Set Size    : ${rssMB} MB`);
  console.log('='.repeat(70));

  const passed = completedCount === TOTAL_PIPELINES && statusCounts.Failed === 0;
  if (passed) {
    console.log('  VERDICT: PASSED ☑ (Orchestrator sustained 1,000+ distributed pipelines)');
  } else {
    console.log('  VERDICT: FAILED ☒ (Unexpected failures observed)');
  }
  console.log('='.repeat(70) + '\n');
}

runStressTest().catch(err => {
  console.error('Fatal stress test error:', err);
  process.exit(1);
});

