import React from 'react';
import { useAuth } from '../../../shared/AuthContext.jsx';

/**
 * Unified Auth Adapter for Course Assignment pages.
 * Maps shared AuthContext into the exact shape expected by verbatim Course Assignment components.
 */
export const CurrentUserProvider = ({ children }) => <>{children}</>;

export const useCurrentUser = () => {
  const auth = useAuth();
  const u = auth.user;

  const adaptedUser = React.useMemo(() => {
    if (!u) return null;
    return {
      ...u,
      id: u.id ?? u.user_id,
      display_name: u.display_name || u.name || '',
      facultyId: u.facultyId ?? u.faculty_id ?? null,
      consultantId: u.consultantId ?? u.industry_consultant_id ?? null,
      departmentId: u.departmentId ?? u.department_id ?? null,
      departmentCode: u.departmentCode ?? u.department_code ?? null,
    };
  }, [u]);

  return {
    name: adaptedUser ? adaptedUser.display_name : '',
    role: auth.activeRole || '',
    facultyId: adaptedUser ? adaptedUser.facultyId : null,
    facultyLoaded: !auth.loading,
    user: adaptedUser,
    roles: auth.roles || [],
    activeRole: auth.activeRole,
    setActiveRole: auth.setActiveRole || auth.switchRole,
    loading: auth.loading,
    signIn: auth.signIn,
    logout: auth.logout,
    refreshUser: auth.refreshUser,
  };
};
