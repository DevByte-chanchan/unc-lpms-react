const DEFAULT_TIMEOUT = 30000;

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

let _authToken = null;

export async function ensureAuthToken() {
  if (_authToken) return _authToken;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = localStorage.getItem('userId');
    if (!userId || !user.role) return null;
    const lpsmBase = import.meta.env.VITE_LPSM_API_BASE || 'http://localhost:4002';
    const res = await fetch(`${lpsmBase}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: parseInt(userId), role: user.role, name: user.name })
    });
    if (!res.ok) return null;
    const data = await res.json();
    _authToken = data.token;
    return _authToken;
  } catch { return null }
}

export function getAuthHeaders() {
  const headers = {};
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
  return headers;
}

export async function fetchJson(endpoint, opts = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const timeoutMs = opts.timeout || DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const headers = { ...opts.headers, ...getAuthHeaders() };
        const res = await fetch(url, { ...opts, headers, signal: controller.signal });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const message = text ? `HTTP ${res.status}: ${text}` : `HTTP ${res.status}`;
            const err = new Error(message);
            err.status = res.status;
            throw err;
        }
        return res.json();
    } finally {
        clearTimeout(timeout);
    }
}