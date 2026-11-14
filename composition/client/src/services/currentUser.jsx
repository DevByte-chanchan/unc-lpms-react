import { getSession } from '../utils/session.js'

// feature/learning-plan-composition reads the signed-in person through useCurrentUser(); this branch keeps its own
// accounts (utils/session.js), so the hook answers from that session in the same shape: { user, role, roles }.
export const useCurrentUser = () => {
  const user = getSession()
  return { user, role: user?.role || null, roles: user?.roles || [] }
}
