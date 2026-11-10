import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAPI } from '../utils/api.js';
import { normalizeRole } from './roles.js';

const CurrentUserContext = createContext({
    user: null,
    role: null,
    roles: [],
    activeRole: null,
    isAuthenticated: false,
    loading: true,
    login: async () => {},
    logout: async () => {},
    switchRole: async () => {},
    refresh: async () => {},
});

function hydrateUser(raw) {
    if (!raw) return null;
    const roles = Array.isArray(raw.roles)
        ? raw.roles.map((r) => normalizeRole(r)).filter(Boolean)
        : [];
    const activeRole = normalizeRole(raw.activeRole || raw.role) || roles[0] || null;
    return {
        ...raw,
        roles,
        activeRole,
        role: activeRole,
    };
}

export function CurrentUserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const res = await AuthAPI.me();
            setUser(hydrateUser(res?.user || null));
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = useCallback(async (email, password) => {
        const res = await AuthAPI.login(email, password);
        const hydrated = hydrateUser(res?.user || null);
        setUser(hydrated);
        return hydrated;
    }, []);

    const logout = useCallback(async () => {
        try {
            await AuthAPI.logout();
        } catch {
            // Clear local session regardless of network error.
        }
        setUser(null);
    }, []);

    const switchRole = useCallback(async (nextRole) => {
        const res = await AuthAPI.switchRole(nextRole);
        const hydrated = hydrateUser(res?.user || null);
        setUser(hydrated);
        return hydrated;
    }, []);

    const value = useMemo(
        () => ({
            user,
            role: user?.activeRole || null,
            roles: user?.roles || [],
            activeRole: user?.activeRole || null,
            isAuthenticated: Boolean(user),
            loading,
            login,
            logout,
            switchRole,
            refresh,
        }),
        [user, loading, login, logout, switchRole, refresh]
    );

    return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
    return useContext(CurrentUserContext);
}
