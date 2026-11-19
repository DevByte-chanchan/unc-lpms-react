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
    let res;
    try {
        res = await fetch(url, { ...opts, ...(headers ? { headers } : {}), credentials: 'include' });
    } catch (cause) {
        if (cause?.name === 'AbortError') throw cause;
        throw friendlyError(0, '', cause);
    }
    if (!res.ok) {
        if (res.status === 401) expireSession();
        const text = await res.text().catch(() => '');
        // A temporary password is still in force: send the user to the change-password screen.
        if (res.status === 403 && text.includes('PASSWORD_CHANGE_REQUIRED') && getSession()) {
            setSession({ ...getSession(), mustChangePassword: true });
        }
        throw friendlyError(res.status, text);
    }
    return res.json();
}

// What the user reads when a request fails: plain words, never a stack trace, SQL or HTML. A 4xx message the server
// wrote for people ("This learning plan is pending and cannot be edited.") is kept; anything else gets a sentence by
// status. The raw text stays on err.detail and in the console during development.
const BY_STATUS = {
    0: 'The server could not be reached. Check your connection and try again.',
    401: 'Your session ended. Sign in again to continue.',
    403: 'You do not have access to this.',
    404: 'This could not be found. It may have been moved or deleted.',
    408: 'The server took too long to answer. Try again.',
    413: 'That file is too large.',
    429: 'Too many tries in a row. Wait a moment, then try again.',
};
const SERVER_TROUBLE = 'Something went wrong on our side. Try again in a moment.';
const TECHNICAL = /sqlite|sequelize|constraint|syntaxerror|typeerror|referenceerror|undefined|stack|\bat \w+ \(|<\/?[a-z]|econn|enoent|errno|exception|http \d{3}|[{}]/i;

export function friendlyText(status, text = '') {
    if (status >= 400 && status < 500) {
        let said = '';
        try { const body = JSON.parse(text); said = typeof body === 'string' ? body : (body?.message || body?.error || ''); } catch { /* not JSON */ }
        if (typeof said === 'string' && said && said.length <= 300 && !TECHNICAL.test(said)) return said;
    }
    return BY_STATUS[status] || (status >= 400 && status < 500 ? 'That request could not be completed. Check what you entered and try again.' : SERVER_TROUBLE);
}

function friendlyError(status, text, cause) {
    const err = new Error(friendlyText(status, text));
    err.status = status;
    err.detail = text || cause?.message || '';
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) console.warn(`[api] ${status || 'network'}:`, err.detail);
    return err;
}

// The words to show for any caught error: fetchJson errors are already plain; anything else (a crash, an "HTTP 500"
// thrown by hand) becomes a plain sentence or the fallback, never the raw text.
export function apiErrorMessage(err, fallback = SERVER_TROUBLE) {
    if (err && 'detail' in err) return err.message;
    const raw = String(err?.message || '');
    const http = raw.match(/^HTTP (\d{3})(?::\s*([\s\S]*))?$/);
    if (http) return friendlyText(Number(http[1]), http[2] || '');
    if (err?.name === 'TypeError' && /fetch|network/i.test(raw)) return BY_STATUS[0];
    return raw && raw.length <= 300 && !TECHNICAL.test(raw) ? raw : fallback;
}
