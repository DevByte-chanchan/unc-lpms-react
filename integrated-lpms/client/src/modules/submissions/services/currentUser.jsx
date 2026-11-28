import { useAuth } from '../../../shared/AuthContext.jsx';
import { getSession } from '../utils/session.js';

function toKebabRole(role) {
  const s = String(role || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'vpaa' || s.includes('vp for academic') || s.includes('ovpaa')) return 'vpaa';
  if (s.includes('dean')) return 'dean';
  if (s.includes('program head') || s === 'program-head' || s === 'program_head') return 'program-head';
  if (s.includes('librar')) return 'director-of-libraries';
  if (s.includes('consultant')) return 'industry-consultant';
  if (s.includes('super')) return 'superuser';
  if (s.includes('instructor') || s.includes('faculty')) return 'instructor';
  return s.replace(/[\s_]+/g, '-');
}

export const useCurrentUser = () => {
  const auth = useAuth();
  const session = getSession();
  const role = toKebabRole(auth?.activeRole || auth?.role) || session?.role || null;
  const roles = (auth?.roles?.length ? auth.roles.map(toKebabRole).filter(Boolean) : session?.roles) || (role ? [role] : []);
  const user = auth?.user
    ? {
        ...auth.user,
        id: auth.user.id || auth.user.user_id,
        name: auth.user.name || auth.user.display_name || auth.user.email,
        role,
        roles,
        roleLabel: auth.activeRole || auth.role || role,
      }
    : session;
  return { user, role, roles };
};
