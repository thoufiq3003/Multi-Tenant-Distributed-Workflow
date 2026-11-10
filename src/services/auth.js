import { setActiveTenant } from './api';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'aegisflow.token';
const USER_KEY = 'aegisflow.user';

// Same rules as backend/src/auth.js
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const PHONE_REGEX = /^\d{10}$/;
export const ROLES = ['Workflow admin', 'Developer', 'Operations engineer', 'Viewer'];

export const emailError = v => EMAIL_REGEX.test(String(v).trim()) ? '' : 'Enter a valid email address, like name@company.com.';
export const phoneError = v => PHONE_REGEX.test(String(v).trim()) ? '' : 'Enter a 10-digit phone number, digits only.';
export const passwordError = v => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : 'Use at least 8 characters with a letter and a number.';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
export const isAuthenticated = () => Boolean(getToken() && getUser());

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Point the workspace at this user's own tenant
  setActiveTenant(user.tenantId, user.organization);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
  } catch {
    const err = new Error('Cannot reach the server. Check that the backend is running.');
    err.network = true;
    throw err;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload.error || `Request failed (${response.status})`);
    err.status = response.status;
    err.fields = payload.fields || {};
    throw err;
  }
  return payload;
}

export const registerUser = body => request('/auth/register', { method: 'POST', body: JSON.stringify(body) });

export async function loginUser({ method, identifier, password }) {
  const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ method, identifier, password }) });
  saveSession(data.token, data.user);
  return data.user;
}

// Returns true if the stored session is still valid. A network failure keeps the user signed in.
export async function verifySession() {
  try {
    await request('/auth/me', { headers: { 'x-session-token': getToken() || '' } });
    return true;
  } catch (e) {
    return Boolean(e.network);
  }
}
