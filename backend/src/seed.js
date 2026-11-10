import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import Workflow from './models/Workflow.js';
import Execution from './models/Execution.js';
import Dlq from './models/Dlq.js';
import User from './models/User.js';
import ApiKey from './models/ApiKey.js';
import { WORKFLOW_DEFINITIONS, generateSeedExecutions, SEEDED_DEMO_KEYS, hashApiKey } from './seed-data.js';
import { hashPassword } from './auth.js';

// Fallback to Google / Cloudflare DNS for Atlas SRV resolution on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in backend/.env');
  process.exit(1);
}

const DEMO_TENANTS = ['demo-tenant', 'globex-corp', 'stark-tech'];

async function runSeed() {
  console.log('Connecting to MongoDB Atlas...');
  console.log(`URI: ${MONGODB_URI.replace(/:([^@]+)@/, ':****@')}`);

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log('Connected to MongoDB Atlas successfully.');

  // 1. Clean existing seed data for target demo tenants
  console.log(`Clearing existing demo workflows, executions, DLQ, and API keys for: ${DEMO_TENANTS.join(', ')}...`);
  await Workflow.deleteMany({ tenantId: { $in: DEMO_TENANTS } });
  await Execution.deleteMany({ tenantId: { $in: DEMO_TENANTS } });
  await Dlq.deleteMany({ tenantId: { $in: DEMO_TENANTS } });
  await ApiKey.deleteMany({ tenantId: { $in: DEMO_TENANTS } });

  // 2. Insert Workflows
  console.log(`Inserting ${WORKFLOW_DEFINITIONS.length} enterprise workflows across 3 tenants...`);
  const workflowDocs = WORKFLOW_DEFINITIONS.map(wf => ({
    ...wf,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  const insertedWorkflows = await Workflow.insertMany(workflowDocs);
  console.log(`Inserted ${insertedWorkflows.length} workflows.`);

  // Create mapping of custom ID -> inserted MongoDB _id
  const wfIdMap = new Map();
  for (const doc of insertedWorkflows) {
    if (doc.id) wfIdMap.set(doc.id, doc._id.toString());
  }

  // 3. Generate and Insert Executions & DLQ Items
  console.log('Generating realistic execution runs and DLQ entries...');
  const { executions, dlqItems } = generateSeedExecutions(WORKFLOW_DEFINITIONS);

  // Link executions to Mongo Workflow ID if applicable, keeping custom id
  const executionDocs = executions.map(exec => ({
    ...exec,
    workflowMongoId: wfIdMap.get(exec.workflowId) || exec.workflowId
  }));

  const insertedExecutions = await Execution.insertMany(executionDocs);
  console.log(`Inserted ${insertedExecutions.length} execution history records.`);

  if (dlqItems.length > 0) {
    const insertedDlq = await Dlq.insertMany(dlqItems);
    console.log(`Inserted ${insertedDlq.length} Dead-Letter Queue (DLQ) records.`);
  }

  // 4. Seed Default Demo User & Demo API Keys
  console.log('Seeding demo API keys for demo tenants...');
  for (const [tId, meta] of Object.entries(SEEDED_DEMO_KEYS)) {
    await ApiKey.create({
      tenantId: tId,
      label: meta.label,
      hash: hashApiKey(meta.key),
      lastFour: meta.key.slice(-4),
      createdAt: new Date()
    });
  }
  console.log('Seeded demo API keys successfully.');

  const demoEmail = 'demo@aegisflow.dev';
  await User.deleteOne({ email: demoEmail });
  const demoUser = await User.create({
    name: 'Alex Mercer',
    email: demoEmail,
    phone: '9876543210',
    organization: 'Acme Ltd.',
    role: 'Workflow admin',
    tenantId: 'demo-tenant',
    passwordHash: hashPassword('Password123!'),
    createdAt: new Date()
  });
  console.log(`Seeded default demo user: ${demoUser.email} (Password: Password123!) for tenant 'demo-tenant'`);

  // 5. Verification Counts per Tenant
  console.log('\n--- SEED VERIFICATION SUMMARY ---');
  for (const tenantId of DEMO_TENANTS) {
    const wfCount = await Workflow.countDocuments({ tenantId });
    const exCount = await Execution.countDocuments({ tenantId });
    const dlqCount = await Dlq.countDocuments({ tenantId });
    console.log(`Tenant [${tenantId}]:`);
    console.log(`  - Workflows:  ${wfCount}`);
    console.log(`  - Executions: ${exCount}`);
    console.log(`  - DLQ Items:  ${dlqCount}`);
  }

  const totalWfs = await Workflow.countDocuments();
  const totalExs = await Execution.countDocuments();
  const totalDlqs = await Dlq.countDocuments();
  console.log('\nAtlas Database Totals:');
  console.log(`  - Total Workflows:  ${totalWfs}`);
  console.log(`  - Total Executions: ${totalExs}`);
  console.log(`  - Total DLQ Items:  ${totalDlqs}`);
  console.log('---------------------------------\n');

  await mongoose.disconnect();
  console.log('Database disconnected. Seeding completed successfully!');
}

runSeed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

