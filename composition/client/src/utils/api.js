export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export async function fetchJson(endpoint, opts = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const res = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(opts.headers || {}),
        },
        ...opts,
    });
    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
            const data = await res.json();
            if (data?.message) message = data.message;
        } catch {
            const text = await res.text().catch(() => '');
            if (text) message = `HTTP ${res.status}: ${text}`;
        }
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

export const AuthAPI = {
    login: (email, password) =>
        fetchJson('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
    logout: () =>
        fetchJson('/api/auth/logout', {
            method: 'POST',
        }),
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
};
