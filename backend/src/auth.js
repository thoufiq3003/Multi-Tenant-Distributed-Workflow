import crypto from 'node:crypto';

// ---- Validation (same rules are mirrored in the React forms) ----
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const PHONE_REGEX = /^\d{10}$/;
export const ROLES = ['Workflow admin', 'Developer', 'Operations engineer', 'Viewer'];

export const isValidEmail = v => typeof v === 'string' && v.length <= 254 && EMAIL_REGEX.test(v.trim());
export const isValidPhone = v => typeof v === 'string' && PHONE_REGEX.test(v.trim());
export const isStrongPassword = v => typeof v === 'string' && v.length >= 8 && v.length <= 128 && /[A-Za-z]/.test(v) && /\d/.test(v);

export function validateRegistration(body = {}) {
  const errors = {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const organization = String(body.organization || '').trim();
  const role = String(body.role || '').trim();
  const password = String(body.password || '');
  if (name.length < 2 || name.length > 80) errors.name = 'Enter your full name (2–80 characters).';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address, like name@company.com.';
  if (!isValidPhone(phone)) errors.phone = 'Enter a 10-digit phone number, digits only.';
  if (organization.length < 2 || organization.length > 80) errors.organization = 'Enter your organization name (2–80 characters).';
  if (!ROLES.includes(role)) errors.role = 'Choose your role.';
  if (!isStrongPassword(password)) errors.password = 'Use at least 8 characters with a letter and a number.';
  return { errors, values: { name, email, phone, organization, role, password } };
}

// ---- Password hashing (scrypt, per-user salt) ----
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ---- Signed session tokens (HMAC-SHA256, no extra dependency) ----
const secret = () => process.env.AUTH_SECRET || process.env.API_KEY_PEPPER || 'development-auth-secret';
const b64 = s => Buffer.from(s).toString('base64url');

export function signToken(userId, ttlMs = 7 * 24 * 3600 * 1000) {
  const payload = b64(JSON.stringify({ sub: userId, exp: Date.now() + ttlMs }));
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data.sub : null;
  } catch { return null; }
}

export function workspaceIdFor(organization) {
  const slug = organization.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'workspace';
  return `${slug}-${crypto.randomBytes(2).toString('hex')}`;
}
