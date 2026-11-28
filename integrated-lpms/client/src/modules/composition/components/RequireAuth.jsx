import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../services/currentUser.jsx';
import { defaultLandingPath, normalizeRole } from '../services/roles.js';

export default function RequireAuth({
    allowedRoles,
    allowMustChangePassword = false,
    children,
}) {
    const { user, activeRole, isAuthenticated, loading } = useCurrentUser();
    const location = useLocation();

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6B7280',
                    fontSize: '14px',
                }}
            >
                Loading session…
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.mustChangePassword && !allowMustChangePassword) {
        return <Navigate to="/change-password" replace />;
    }

    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r)).filter(Boolean);
        if (!normalizedAllowed.includes(activeRole)) {
            return <Navigate to={defaultLandingPath(activeRole)} replace />;
        }
    }

    return children;
}
