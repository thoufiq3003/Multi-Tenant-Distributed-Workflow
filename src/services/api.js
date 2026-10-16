const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TENANT_ID = localStorage.getItem('flowpilot.tenantId') || 'demo-tenant';

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT_ID, ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status; error.payload = payload; throw error;
  }
  return payload;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
