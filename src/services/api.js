const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const KNOWN_TENANTS = [
  { id: 'demo-tenant', name: 'Acme Ltd.', plan: 'Enterprise workspace', avatar: 'A' },
  { id: 'globex-corp', name: 'Globex Corp.', plan: 'Logistics pipeline', avatar: 'G' },
  { id: 'stark-tech', name: 'Stark Industries', plan: 'Robotics & AI', avatar: 'S' }
];

export function getActiveTenant() {
  return localStorage.getItem('aegisflow.tenantId') || 'demo-tenant';
}

export function getActiveTenantMeta() {
  const currentId = getActiveTenant();
  const known = KNOWN_TENANTS.find(t => t.id === currentId);
  if (known) return known;
  const storedName = localStorage.getItem(`aegisflow.tenantName.${currentId}`) || currentId;
  return { id: currentId, name: storedName, plan: 'Custom tenant', avatar: currentId.charAt(0).toUpperCase() };
}

export function setActiveTenant(tenantId, tenantName) {
  const sanitized = String(tenantId).trim();
  localStorage.setItem('aegisflow.tenantId', sanitized);
  if (tenantName) {
    localStorage.setItem(`aegisflow.tenantName.${sanitized}`, tenantName);
  }
  window.dispatchEvent(new CustomEvent('aegisflow:tenant-changed', {
    detail: { tenantId: sanitized, tenantName }
  }));
}

export const DEFAULT_DEMO_KEYS = {
  'demo-tenant': 'fp_demo_7f8a9b0c1d2e3f4a5b6c7d8e',
  'globex-corp': 'fp_globex_7f8a9b0c1d2e3f4a5b6c7d8e',
  'stark-tech': 'fp_stark_7f8a9b0c1d2e3f4a5b6c7d8e'
};

export function getActiveApiKey(tenantId = getActiveTenant()) {
  const customKey = localStorage.getItem(`aegisflow.apiKey.${tenantId}`);
  if (customKey && customKey.trim()) return customKey.trim();
  // Return seeded demo key for known tenants
  return DEFAULT_DEMO_KEYS[tenantId] || '';
}

export function setActiveApiKey(tenantId, key) {
  if (!key) {
    localStorage.removeItem(`aegisflow.apiKey.${tenantId}`);
  } else {
    localStorage.setItem(`aegisflow.apiKey.${tenantId}`, key.trim());
  }
}

export function resetToDefaultApiKey(tenantId = getActiveTenant()) {
  localStorage.removeItem(`aegisflow.apiKey.${tenantId}`);
  return getActiveApiKey(tenantId);
}

export async function api(path, options = {}) {
  const tenantId = getActiveTenant();
  let apiKey = getActiveApiKey(tenantId);
  const sessionToken = localStorage.getItem('aegisflow.token');
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    ...(options.headers || {})
  };

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  // Self-healing: if an expired/invalid custom key in localStorage was rejected by backend
  if (response.status === 401 && apiKey) {
    const storedCustomKey = localStorage.getItem(`aegisflow.apiKey.${tenantId}`);
    if (storedCustomKey) {
      console.warn(`[Aegisflow API] Stored API key for "${tenantId}" was rejected (401). Clearing stale key and retrying with default demo credentials.`);
      localStorage.removeItem(`aegisflow.apiKey.${tenantId}`);
      apiKey = getActiveApiKey(tenantId);
      const retryHeaders = {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
        ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
        ...(options.headers || {})
      };
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: retryHeaders
      });
    }
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
