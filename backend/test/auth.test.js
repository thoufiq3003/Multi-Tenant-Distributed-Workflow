import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, isValidPhone, validateRegistration, hashPassword, verifyPassword, signToken, verifyToken, workspaceIdFor } from '../src/auth.js';
import { createUser, findUser } from '../src/server.js';

test('phone must be exactly 10 digits', () => {
  assert.equal(isValidPhone('9876543210'), true);
  for (const bad of ['987654321', '98765432101', '98765-43210', 'abcdefghij', '', ' 9876543210x'])
    assert.equal(isValidPhone(bad), false, bad);
});

test('email regex accepts proper emails only', () => {
  for (const ok of ['a@b.co', 'first.last+tag@sub.company.com'])
    assert.equal(isValidEmail(ok), true, ok);
  for (const bad of ['plain', 'a@b', 'a@@b.com', '@b.com', 'a b@c.com', 'a@b.c', 'a@.com'])
    assert.equal(isValidEmail(bad), false, bad);
});

test('registration validation reports each bad field', () => {
  const { errors } = validateRegistration({ name: 'A', email: 'x', phone: '1', organization: '', role: 'Nope', password: 'short' });
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'name', 'organization', 'password', 'phone', 'role']);
  const good = validateRegistration({ name: 'Asha Rao', email: 'ASHA@Corp.com', phone: '9876543210', organization: 'Corp', role: 'Developer', password: 'abcd1234' });
  assert.deepEqual(good.errors, {});
  assert.equal(good.values.email, 'asha@corp.com');
});

test('password hashing and tokens', () => {
  const h = hashPassword('abcd1234');
  assert.equal(verifyPassword('abcd1234', h), true);
  assert.equal(verifyPassword('wrong', h), false);
  const t = signToken('u1');
  assert.equal(verifyToken(t), 'u1');
  assert.equal(verifyToken(t + 'x'), null);
  assert.equal(verifyToken(signToken('u1', -1)), null);
});

test('createUser and findUser persist and retrieve user accounts', async () => {
  const user = await createUser({
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '9123456780',
    organization: 'Acme Health',
    role: 'Operations engineer',
    password: 'SafePassword99'
  });

  assert.ok(user.id);
  assert.equal(user.email, 'jane.smith@example.com');
  assert.ok(user.tenantId.startsWith('acme-health-'));
  assert.equal(verifyPassword('SafePassword99', user.passwordHash), true);

  const foundByEmail = await findUser({ email: 'jane.smith@example.com' });
  assert.equal(foundByEmail.id, user.id);

  const foundByPhone = await findUser({ phone: '9123456780' });
  assert.equal(foundByPhone.id, user.id);
});
