import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { getDefaultRouteForRole } from './navConfig.js';

export default function RequireRole({ allowedRoles, children }) {
  const { isAuthenticated, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#4b5563' }}>
        Loading UNC-LPMS session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(activeRole)) {
    return <Navigate to={getDefaultRouteForRole(activeRole)} replace />;
  }

  return children;
}
