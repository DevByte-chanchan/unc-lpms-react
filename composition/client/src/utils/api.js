import { actingRole, expireSession, getSession, setSession } from './session.js';

const configuredApiBase = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_API_BASE
    : '';

export const API_BASE = configuredApiBase || 'http://localhost:5000';

// The same GET asked for while it is still on its way is sent once and answered to everyone who asked. A page often has
// several components that need the same list (the reference library, the plan itself), and React's development mode
// runs every effect twice; without this each of those is a separate trip to the server. Only plain GETs are shared, and
// each caller gets its own copy of the answer so one cannot change what another sees.
const inFlight = new Map();

export function fetchJson(endpoint, opts = {}) {
    const method = String(opts.method || 'GET').toUpperCase();
    if (method !== 'GET' || opts.body || opts.signal) return requestJson(endpoint, opts);
    let pending = inFlight.get(endpoint);
    if (!pending) {
        pending = requestJson(endpoint, opts).finally(() => inFlight.delete(endpoint));
        inFlight.set(endpoint, pending);
    }
    return pending.then(data => (data !== null && typeof data === 'object' ? structuredClone(data) : data));
}

async function requestJson(endpoint, opts = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    // The role the signed-in person is acting as (multi-role accounts); the server checks the account holds it.
    const role = actingRole();
    const headers = role ? { ...(opts.headers || {}), 'X-LPMS-Role': role } : opts.headers;
    const res = await fetch(url, { ...opts, ...(headers ? { headers } : {}), credentials: 'include' });
    if (!res.ok) {
        if (res.status === 401) expireSession();
        const text = await res.text().catch(() => '');
        // A temporary password is still in force: send the user to the change-password screen.
        if (res.status === 403 && text.includes('PASSWORD_CHANGE_REQUIRED') && getSession()) {
            setSession({ ...getSession(), mustChangePassword: true });
        }
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
