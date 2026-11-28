/**
 * Route guards.
 *
 *   <RequireAuth>          signed in, or → /login?next=…; a forced password
 *                          change → /change-password (unless `allowPasswordChange`)
 *   <RequireRole role=…>   holds that role, or a small "no access" screen with a
 *                          way home. Opening a page of a role you hold makes it
 *                          the active role, so the header always says what you're
 *                          acting as.
 *   <RequireApproverRole>  the same, for /role/:approver/… (segment → role)
 */
import React from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'react-feather';
import { useCurrentUser } from '../services/currentUser.jsx';
import { homeFor, SEGMENT_ROLES } from '../services/roles.js';
import styles from '../styles/Login.module.sass';

export const FullPageSpinner = () => (
  <div className={styles.screen} role="status" aria-label="Loading">
    <div className={styles.spinnerDark} />
  </div>
);

export const RequireAuth = ({ allowPasswordChange = false, children }) => {
  const { user, loading } = useCurrentUser();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={'/login?next=' + encodeURIComponent(next)} replace />;
  }
  if (user.must_change_password && !allowPasswordChange) return <Navigate to="/change-password" replace />;
  return children;
};

const NoAccess = () => {
  const { activeRole } = useCurrentUser();
  const navigate = useNavigate();
  return (
    <div className={styles.screen}>
      <div className={styles.card} style={{ alignItems: 'center', textAlign: 'center' }}>
        <Lock size={28} color="#6B7280" />
        <h1 className={styles.title}>You don&apos;t have access to this page</h1>
        <p className={styles.lead}>Your account doesn&apos;t have the role this page needs.</p>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate(homeFor(activeRole), { replace: true })}>
          Go to my home page
        </button>
      </div>
    </div>
  );
};

export const RequireRole = ({ role, children }) => {
  const { roles, activeRole, setActiveRole } = useCurrentUser();
  const allowed = !!role && roles.includes(role);
  React.useEffect(() => {
    if (allowed && activeRole !== role) setActiveRole(role);
  }, [allowed, activeRole, role, setActiveRole]);
  if (!allowed) return <NoAccess />;
  return children;
};

export const RequireApproverRole = ({ children }) => {
  const { approver } = useParams();
  return <RequireRole role={SEGMENT_ROLES[approver]}>{children}</RequireRole>;
};

/** Unknown paths land on the active role's home. */
export const HomeRedirect = () => {
  const { activeRole } = useCurrentUser();
  return <Navigate to={homeFor(activeRole)} replace />;
};

/** /role/hr-staff → /role/ovpaa, keeping ?page=… (there is no HR Staff role). */
export const HrStaffRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={'/role/ovpaa' + search} replace />;
};
