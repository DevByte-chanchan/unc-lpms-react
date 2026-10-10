/**
 * CurrentUser context — the signed-in person, from GET /auth/me.
 *
 * The session itself is an httpOnly cookie the page never sees; this context
 * only holds the public `user` the server returns. It loads on start and again
 * whenever the period changes (facultyId is per period).
 *
 * Exposes (the first four are the original stub's shape, kept for consumers):
 *   - name           display name (HeaderA, "my programs" name fallback)
 *   - role           = activeRole
 *   - facultyId      this user's faculty.id IN THE ACTIVE PERIOD — the server
 *                    links the account by email, falling back to the name
 *   - facultyLoaded  true once that resolution has settled for the period
 *   - user           { id, email, display_name, roles, must_change_password, facultyId, consultantId } | null
 *   - roles          the roles this user holds
 *   - activeRole     the role they're acting as (sessionStorage; first role by default)
 *   - setActiveRole
 *   - loading        true until the first /auth/me answers
 *   - signIn(user)   adopt the user a login / password change returned
 *   - logout()       ends the session and clears everything
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePeriod } from './period.jsx';
import { AuthAPI, AUTH_EXPIRED_EVENT, AUTH_SIGNED_IN_EVENT, rearmAuthExpired } from './api.js';

const ACTIVE_ROLE_KEY = 'lpms.activeRole';

const readStoredRole = () => {
  try { return window.sessionStorage.getItem(ACTIVE_ROLE_KEY); } catch { return null; }
};
const storeRole = (role) => {
  try {
    if (role) window.sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
    else window.sessionStorage.removeItem(ACTIVE_ROLE_KEY);
  } catch { /* storage blocked — the role just won't survive a reload */ }
};

const CurrentUserContext = React.createContext({
  name: '', role: '', facultyId: null, facultyLoaded: false,
  user: null, roles: [], activeRole: null, setActiveRole: () => {}, loading: true,
  signIn: () => {}, logout: async () => {},
});

const PUBLIC_PAGES = ['/set-password', '/reset-password', '/forgot-password'];

export const CurrentUserProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentPeriod } = usePeriod();
  const periodId = currentPeriod && currentPeriod.id;

  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [facultyLoaded, setFacultyLoaded] = React.useState(false);
  const [storedRole, setStoredRole] = React.useState(readStoredRole);
  const userRef = React.useRef(null);
  userRef.current = user;

  const adopt = React.useCallback((u) => {
    setUser(u);
    if (u) {
      rearmAuthExpired();
      window.dispatchEvent(new Event(AUTH_SIGNED_IN_EVENT));
    }
  }, []);

  // On start, and whenever the period changes.
  React.useEffect(() => {
    let cancelled = false;
    setFacultyLoaded(false);
    AuthAPI.me(periodId)
      .then(({ user: u }) => {
        if (cancelled) return;
        // A restored session (nobody signed in yet) announces itself once.
        if (!userRef.current) adopt(u);
        else setUser(u);
      })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) { setFacultyLoaded(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [periodId, adopt]);

  const roles = React.useMemo(() => (user && Array.isArray(user.roles) ? user.roles : []), [user]);
  const activeRole = roles.includes(storedRole) ? storedRole : (roles[0] || null);

  const setActiveRole = React.useCallback((role) => {
    storeRole(role);
    setStoredRole(role);
  }, []);

  const signIn = React.useCallback((u) => {
    adopt(u);
    setFacultyLoaded(true);
    setLoading(false);
  }, [adopt]);

  const clear = React.useCallback(() => {
    setUser(null);
    storeRole(null);
    setStoredRole(null);
  }, []);

  const logout = React.useCallback(async () => {
    try { await AuthAPI.logout(); } catch { /* already signed out — clear anyway */ }
    clear();
  }, [clear]);

  // Session expired mid-use (any API call got a 401): back to sign-in, then
  // return here afterwards.
  const here = location.pathname + location.search;
  const hereRef = React.useRef(here);
  hereRef.current = here;
  React.useEffect(() => {
    const onExpired = () => {
      clear();
      const at = hereRef.current;
      // The emailed-link pages are public: a 401 from some background fetch
      // (the term list, say) while signed out must not bounce them to /login.
      if (PUBLIC_PAGES.some((p) => at.startsWith(p))) return;
      const onAuthPage = at.startsWith('/login') || at.startsWith('/change-password');
      navigate(onAuthPage ? '/login' : '/login?next=' + encodeURIComponent(at), { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clear, navigate]);

  const value = React.useMemo(() => ({
    name: user ? user.display_name : '',
    role: activeRole || '',
    facultyId: user ? user.facultyId : null,
    facultyLoaded,
    user,
    roles,
    activeRole,
    setActiveRole,
    loading,
    signIn,
    logout,
  }), [user, activeRole, facultyLoaded, roles, setActiveRole, loading, signIn, logout]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
};

export const useCurrentUser = () => React.useContext(CurrentUserContext);
