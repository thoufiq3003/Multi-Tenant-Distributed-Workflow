import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashApiKey,
  createApiKey,
  findApiKeyByHash,
  revokeApiKey,
  listApiKeys,
  saveWorkflow,
  listWorkflows,
  DEMO_KEY_RAW
} from '../src/server.js';

test('hashApiKey generates deterministic SHA-256 hash', () => {
  const hash1 = hashApiKey('fp_test_key_123');
  const hash2 = hashApiKey('fp_test_key_123');
  const hash3 = hashApiKey('fp_other_key_456');

  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 64);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
});

test('createApiKey persists hashed key and returns plaintext key once', async () => {
  const tenantId = 'tenant-test-a';
  const created = await createApiKey(tenantId, 'Primary Production Key');

  assert.ok(created.id);
  assert.equal(created.tenantId, tenantId);
  assert.equal(created.label, 'Primary Production Key');
  assert.ok(created.key.startsWith('fp_'));
  assert.equal(created.lastFour, created.key.slice(-4));

  // Verify hash matches
  const hash = hashApiKey(created.key);
  const found = await findApiKeyByHash(tenantId, hash);
  assert.ok(found);
  assert.equal(found.id, created.id);
  assert.equal(found.hash, hash);
});

test('cross-tenant API key isolation: key from Tenant A cannot authenticate Tenant B', async () => {
  const tenantA = 'tenant-alpha';
  const tenantB = 'tenant-beta';

  const keyA = await createApiKey(tenantA, 'Alpha Key');
  const hashA = hashApiKey(keyA.key);

  // Looking up Alpha's key under Tenant A succeeds
  const matchA = await findApiKeyByHash(tenantA, hashA);
  assert.ok(matchA);

  // Looking up Alpha's key under Tenant B fails (Tenant B has no such key)
  const matchB = await findApiKeyByHash(tenantB, hashA);
  assert.equal(matchB, null);
});

test('revoking API key prevents further authentication', async () => {
  const tenant = 'tenant-revoke-test';
  const created = await createApiKey(tenant, 'Temporary Key');
  const hash = hashApiKey(created.key);

  const beforeRevoke = await findApiKeyByHash(tenant, hash);
  assert.ok(beforeRevoke);

  const revoked = await revokeApiKey(tenant, created.id);
  assert.equal(revoked, true);

  const afterRevoke = await findApiKeyByHash(tenant, hash);
  assert.equal(afterRevoke, null);
});

test('multi-tenant workflow data isolation: tenant records remain separate', async () => {
  const tenant1 = 'corp-retail';
  const tenant2 = 'corp-logistics';

  await saveWorkflow(tenant1, {
    name: 'Retail Checkout Workflow',
    description: 'Process store orders',
    nodes: [{ id: '1', data: { label: 'Start' } }],
    edges: []
  });

  await saveWorkflow(tenant2, {
    name: 'Warehouse Dispatch Workflow',
    description: 'Dispatch truck shipments',
    nodes: [{ id: '1', data: { label: 'Trigger' } }],
    edges: []
  });

  const tenant1Workflows = await listWorkflows(tenant1);
  const tenant2Workflows = await listWorkflows(tenant2);

  assert.ok(tenant1Workflows.some(w => w.name === 'Retail Checkout Workflow'));
  assert.ok(!tenant1Workflows.some(w => w.name === 'Warehouse Dispatch Workflow'));

  assert.ok(tenant2Workflows.some(w => w.name === 'Warehouse Dispatch Workflow'));
  assert.ok(!tenant2Workflows.some(w => w.name === 'Retail Checkout Workflow'));
});

test('seeded default demo key validates for demo-tenant', async () => {
  const hash = hashApiKey(DEMO_KEY_RAW);
  const record = await findApiKeyByHash('demo-tenant', hash);
  assert.ok(record);
  assert.equal(record.tenantId, 'demo-tenant');
});
