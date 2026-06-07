export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export async function fetchJson(endpoint, opts = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const res = await fetch(url, opts);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const message = text ? `HTTP ${res.status}: ${text}` : `HTTP ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }
    return res.json();
}