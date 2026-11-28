export const API_BASE = import.meta.env.VITE_API_BASE || '';

const TOKEN_KEY = 'unc_lpms_token';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function fetchJson(endpoint, opts = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = getStoredToken();
  const isFormData = opts.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  const res = await fetch(url, {
    credentials: 'include',
    ...opts,
    headers,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let payload = null;
    try {
      payload = await res.json();
      if (payload?.error) message = payload.error;
      else if (payload?.message) message = payload.message;
    } catch {
      const text = await res.text().catch(() => '');
      if (text) message = `HTTP ${res.status}: ${text}`;
    }
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const api = {
  get: (path) => fetchJson(path, { method: 'GET' }),
  post: (path, body) =>
    fetchJson(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  put: (path, body) =>
    fetchJson(path, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: (path, body) =>
    fetchJson(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  del: (path) => fetchJson(path, { method: 'DELETE' }),
};

export const AuthAPI = {
  demoAccounts: () => fetchJson('/api/auth/demo-accounts'),
  login: (email, password) =>
    fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => fetchJson('/api/auth/logout', { method: 'POST' }),
  me: () => fetchJson('/api/auth/me'),
  switchRole: (role) =>
    fetchJson('/api/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  changePassword: (currentPassword, newPassword) =>
    fetchJson('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  forgotPassword: (email) =>
    fetchJson('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token, password) =>
    fetchJson('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  invitation: (token) => fetchJson(`/api/auth/invitations/${encodeURIComponent(token)}`),
  acceptInvitation: (token, password) =>
    fetchJson(`/api/auth/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};
