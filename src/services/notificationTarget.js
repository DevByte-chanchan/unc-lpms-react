/**
 * Where a bell notification leads, as a plain decision so it can be read (and
 * reasoned about) apart from the dropdown. notification.target is
 *   { type: 'assignment' | 'role' | 'consultant', entityId, termId, programId }
 * and is null on older notifications, which go nowhere.
 *
 * Returns { role?, path?, toast? }: the role to switch to, where to go, what to say.
 */
import { homeFor } from './roles.js';

const withTerm = (path, termId) => {
  if (!termId) return path;
  return path + (path.includes('?') ? '&' : '?') + 'term=' + encodeURIComponent(termId);
};

export const REMOVED_MESSAGE = 'This assignment was removed';

/**
 * @param n           the notification
 * @param roles       the CURRENT roles, from the server
 * @param activeRole  the role being acted as (only among `roles`)
 */
export function resolveTarget(n, { roles = [], activeRole = null } = {}) {
  const t = n && n.target;
  if (!t) return {};

  if (t.type === 'role') {
    // The notification says what happened; `roles` says what is true now. A
    // removal that has since been reversed must not take the role away.
    const role = n.kind === 'role_added' && roles.includes(t.entityId) ? t.entityId : (activeRole || roles[0] || null);
    return { role, path: role ? withTerm(homeFor(role), t.termId) : undefined };
  }

  if (t.type === 'consultant') {
    if (!roles.includes('Industry Consultant')) return {};
    return { role: 'Industry Consultant', path: homeFor('Industry Consultant') };
  }

  if (t.type === 'assignment') {
    if (n.kind === 'course_removed') return { toast: REMOVED_MESSAGE };
    if (activeRole === 'Program Head') {
      const q = new URLSearchParams({ course: t.entityId });
      if (t.programId) q.set('program', t.programId);
      return { path: withTerm('/role/program-head/course-assignment?' + q.toString(), t.termId) };
    }
    if (roles.includes('Instructor')) {
      return { role: 'Instructor', path: '/courses/' + encodeURIComponent(t.entityId) };
    }
  }
  return {};
}
