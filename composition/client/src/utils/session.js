// Client-side session for the LPSM demo build.
//
// The identity lives under the same localStorage key the rest of the app
// already reads ('user' + 'userId', see utils/roleGuard.js), so signing in
// here is what every page, audit log and approval action sees. Nothing else
// may write that key: a page that stamps its own name over it is exactly the
// mid-demo account switch the panel flagged [45:27] [45:45].

import { normalizeRoleKey } from './approvalHelpers.js'

const SESSION_KEY = 'user'
const SESSION_ID_KEY = 'userId'
const ACCOUNTS_KEY = 'lpsm_accounts_v1'
const SESSION_EVENT = 'lpsm-session-change'

export const ROLES = [
  { key: 'instructor', label: 'Instructor', home: '/' },
  { key: 'program-head', label: 'Program Head', home: '/role/program-head' },
  { key: 'director-of-libraries', label: 'Director of Libraries', home: '/role/director-of-libraries' },
  { key: 'industry-consultant', label: 'Industry Consultant', home: '/role/industry-consultant' },
  { key: 'dean', label: 'Dean', home: '/role/dean' },
  { key: 'vpaa', label: 'VPAA', home: '/role/vpaa' }
]

export const roleMeta = (roleKey = '') => ROLES.find(r => r.key === roleKey) || null

export const homeRouteForRole = (roleKey = '') => roleMeta(roleKey)?.home || '/'

// Demo-only digest. Passwords never leave the browser in this build; this
// exists so the accounts store does not hold plain text.
const digest = (value = '') => {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

const normalizeEmail = (email = '') => String(email).trim().toLowerCase()

const readAccounts = () => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeAccounts = (accounts) => {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch (e) {
    console.error('Failed to persist accounts', e)
  }
}

// The names the demo pages used to hard-code, now backed by real credentials
// so each one is an account you sign in as instead of a label on a page.
const DEMO_ACCOUNTS = [
  { id: 1, name: 'NORTON, MONICA', email: 'monica.norton@unc.edu.ph', role: 'instructor' },
  { id: 2, name: 'DANILA, JUNAR', email: 'junar.danila@unc.edu.ph', role: 'program-head' },
  { id: 3, name: 'SANTOS, MARIA', email: 'maria.santos@unc.edu.ph', role: 'director-of-libraries' },
  { id: 4, name: 'CRUZ, ROBERTO', email: 'roberto.cruz@unc.edu.ph', role: 'industry-consultant' },
  { id: 5, name: 'REYES, AGNES', email: 'agnes.reyes@unc.edu.ph', role: 'dean' },
  { id: 6, name: 'GARCIA, CARLOS', email: 'carlos.garcia@unc.edu.ph', role: 'vpaa' }
]

export const DEMO_PASSWORD = 'demo1234'

export const seedDemoAccounts = () => {
  const accounts = readAccounts()
  let changed = false
  DEMO_ACCOUNTS.forEach(a => {
    if (!accounts.some(existing => normalizeEmail(existing.email) === a.email)) {
      accounts.push({ ...a, passwordHash: digest(DEMO_PASSWORD) })
      changed = true
    }
  })
  if (changed) writeAccounts(accounts)
  return accounts
}

export const listAccounts = () => seedDemoAccounts().map(a => ({ id: a.id, name: a.name, email: a.email, role: a.role }))

const publicUser = (account) => ({
  id: account.id,
  name: account.name,
  email: account.email,
  role: account.role,
  roleLabel: roleMeta(account.role)?.label || account.role
})

const notify = () => {
  try {
    window.dispatchEvent(new Event(SESSION_EVENT))
  } catch {
    /* non-browser context (tests) */
  }
}

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const user = raw ? JSON.parse(raw) : null
    return user && user.role ? user : null
  } catch {
    return null
  }
}

export const setSession = (user) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    localStorage.setItem(SESSION_ID_KEY, String(user?.id || 0))
  } catch (e) {
    console.error('Failed to persist session', e)
  }
  notify()
  return user
}

export const logout = () => {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_ID_KEY)
  } catch (e) {
    console.error('Failed to clear session', e)
  }
  notify()
}

export const login = (email, password) => {
  const accounts = seedDemoAccounts()
  const account = accounts.find(a => normalizeEmail(a.email) === normalizeEmail(email))
  if (!account || account.passwordHash !== digest(String(password || ''))) {
    return { ok: false, error: 'Incorrect email or password.' }
  }
  return { ok: true, user: setSession(publicUser(account)) }
}

export const signup = ({ name, email, password, role } = {}) => {
  const cleanName = String(name || '').trim()
  const cleanEmail = normalizeEmail(email)
  const cleanRole = String(role || '').trim()

  if (!cleanName) return { ok: false, error: 'Full name is required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Enter a valid email address.' }
  if (String(password || '').length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  if (!roleMeta(cleanRole)) return { ok: false, error: 'Select a valid role.' }

  const accounts = seedDemoAccounts()
  if (accounts.some(a => normalizeEmail(a.email) === cleanEmail)) {
    return { ok: false, error: 'An account with that email already exists.' }
  }

  const account = {
    id: accounts.reduce((max, a) => Math.max(max, a.id || 0), 0) + 1,
    name: cleanName,
    email: cleanEmail,
    role: cleanRole,
    passwordHash: digest(String(password))
  }
  accounts.push(account)
  writeAccounts(accounts)
  return { ok: true, user: setSession(publicUser(account)) }
}

// Which name to show against an action taken in `rawRole`. The signed-in user's
// own name always wins over the demo name for that role — showing the demo name
// over theirs is the mid-flow account switch the panel flagged [45:27] [45:45].
// A role the session does not hold keeps the caller's fallback, so one user is
// never attributed an action belonging to another role.
export const nameForRoleWithSession = (session, rawRole, fallbackName = '') => {
  if (session?.name && normalizeRoleKey(session.role) === normalizeRoleKey(rawRole)) return session.name
  return fallbackName
}

// Which role page this path belongs to, or '' if the path is not role-scoped.
export const roleFromPath = (pathname = '') => {
  const match = /^\/role\/([^/?#]+)/.exec(String(pathname))
  return match ? decodeURIComponent(match[1]) : ''
}

// Where a signed-in user must be sent instead of the path they asked for, or
// null to let it render. Every approver page takes its role from the URL, so
// without this an instructor could open /role/dean and act as the Dean — the
// account switching the panel flagged [45:27] [45:45]. Unknown /role/... keys
// are left alone; they are not roles this module owns.
export const routeGuardRedirect = (session, pathname = '') => {
  if (!session?.role) return null
  const urlRole = roleFromPath(pathname)
  if (!urlRole || !roleMeta(urlRole)) return null
  if (normalizeRoleKey(urlRole) === normalizeRoleKey(session.role)) return null
  return homeRouteForRole(session.role)
}

export const onSessionChange = (handler) => {
  window.addEventListener(SESSION_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(SESSION_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export default {
  ROLES,
  DEMO_PASSWORD,
  roleMeta,
  homeRouteForRole,
  seedDemoAccounts,
  listAccounts,
  getSession,
  setSession,
  login,
  signup,
  logout,
  nameForRoleWithSession,
  roleFromPath,
  routeGuardRedirect,
  onSessionChange
}
