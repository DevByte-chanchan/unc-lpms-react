import { expireSession } from './session.js';

const configuredApiBase = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_API_BASE
    : '';

export const API_BASE = configuredApiBase || 'http://localhost:5000';

export async function fetchJson(endpoint, opts = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const res = await fetch(url, { ...opts, credentials: 'include' });
    if (!res.ok) {
        if (res.status === 401) expireSession();
        const text = await res.text().catch(() => '');
        const message = text ? `HTTP ${res.status}: ${text}` : `HTTP ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

// fetchJson errors read "HTTP 409: {"message":"..."}"; show just the message.
export function apiErrorMessage(err, fallback = 'Request failed.') {
    const raw = String(err?.message || '');
    const start = raw.indexOf('{');
    if (start >= 0) {
        try {
            const body = JSON.parse(raw.slice(start));
            return body.message || body.error || fallback;
        } catch { /* not JSON, fall through */ }
    }
    return raw || fallback;
}
