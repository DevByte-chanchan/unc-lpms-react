// Client-side session for the LPSM demo build.
//
// This module is the canonical owner of the `user` and `userId` session keys.
// Signing in here is what every page, audit log and approval action sees. Nothing else
// may write that key: a page that stamps its own name over it is exactly the
// mid-demo account switch the panel flagged [45:27] [45:45].

import { normalizeRoleKey } from './approvalHelpers.js'

const SESSION_KEY = 'user'
const SESSION_ID_KEY = 'userId'
const ACCOUNTS_KEY = 'lpsm_accounts_v1'
const SESSION_EVENT = 'lpsm-session-change'

export const isDemoMode = (env = {}) =>
  env?.DEV === true || String(env?.VITE_LPMS_DEMO_MODE || '') === '1'

// Plain Node runs are the unit-test harness. Vite always provides import.meta.env;
// a production build therefore defaults to false and does not expose the known
// demo credentials or the browser-only account store.
const RUNTIME_ENV = import.meta.env || { DEV: true }
export const DEMO_MODE = isDemoMode(RUNTIME_ENV)

export const ROLES = [
  { key: 'instructor', label: 'Instructor', home: '/' },
  { key: 'program-head', label: 'Program Head', home: '/role/program-head' },
  { key: 'director-of-libraries', label: 'Director of Libraries', home: '/role/director-of-libraries' },
  { key: 'industry-consultant', label: 'Industry Consultant', home: '/role/industry-consultant' },
  { key: 'dean', label: 'Dean', home: '/role/dean' },
  { key: 'vpaa', label: 'VPAA', home: '/role/vpaa' }
]

// Local/demo builds need to create accounts for every role so each review
// step can be exercised on one development machine. Production keeps public
// self-registration limited to instructors; approvers are privileged users.
export const registrationRoles = (demoMode = DEMO_MODE) =>
  demoMode ? ROLES : ROLES.filter(role => role.key === 'instructor')

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
  if (!DEMO_MODE) return []
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

const clearStoredSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_ID_KEY)
  } catch (e) {
    console.error('Failed to clear session', e)
  }
  notify()
}

export const expireSession = () => clearStoredSession()

export const logout = () => {
  clearStoredSession()
  // Local UI state clears immediately; the best-effort server call revokes
  // the HttpOnly cookie so replaying it cannot restore access.
  void postAuth('/logout', {})
}

// ---------------------------------------------------------------- server ---
//
// Accounts now live in a real Users table with scrypt-hashed passwords
// (server/models/user.js, server/controllers/authController.js). This module
// stays the single place the rest of the app asks about identity, so nothing
// else changed: it tries the server first and falls back to the local store
// below when the server is not running.
//
// The fallback is not a second security model — it is the demo build's
// offline mode, the same idea as `demoAssignments.withDemoFallback`. When the
// server answers, the server decides; the local store is never consulted.

// Read the API base defensively rather than importing `utils/api.js`: that
// module dereferences `import.meta.env` at load time, which throws under plain
// node and would take `session.test.js` down with it. Vite still substitutes
// the value at build time through this form.
const apiBase = () => {
  try {
    return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
      || 'http://localhost:5000'
  } catch {
    return 'http://localhost:5000'
  }
}

const authBase = () => `${apiBase()}/api/auth`

// `serverSaid` distinguishes "the server rejected these credentials" from
// "there is no server", which is the whole point: a wrong password must NOT
// silently fall through to the local store and succeed there.
const postAuth = async (path, payload) => {
  try {
    const res = await fetch(`${authBase()}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    let data = null
    try { data = await res.json() } catch { data = null }
    return { reachable: true, ok: res.ok, status: res.status, data }
  } catch {
    return { reachable: false, ok: false, status: 0, data: null }
  }
}

// WHICH ANSWERS ARE A DECISION, AND WHICH ARE A BROKEN SERVER.
//
// This distinction cost a working demo. If the backend is running but auth is
// not installed on it — the routes are not mounted (404), or the Users table
// does not exist because `node migrate.js` has not been run (500), or a proxy
// returned an HTML error page (unparseable) — then `postAuth` comes back
// "reachable but not ok", and the old code read every one of those as "wrong
// password". So the demo accounts, which live in the browser and were fine,
// reported `Incorrect email or password.` and there was nothing to fix.
//
// Only these statuses are the auth API making a decision about the
// credentials. A rejection here must NEVER be retried against the local store
// — that is the hole where a password the server refused gets accepted
// offline. Anything else means the API did not answer at all, and the local
// store stands in exactly as it does when the server is switched off.
const REJECTION_STATUSES = new Set([400, 401, 403, 409, 423, 429])

const isRejection = (res) => res.reachable && REJECTION_STATUSES.has(res.status)

const isServerAnswer = (res) => res.reachable && res.ok && !!res.data

// True when the server told us nothing usable: unreachable, or reachable but
// answering with something the auth API would never send.
const authUnavailable = (res) => !isRejection(res) && !isServerAnswer(res)

const fromServer = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  roleLabel: roleMeta(u.role)?.label || u.role
})

// `opts.role` is the "Login as" selector. Optional — when given it has to
// match the account, and a mismatch fails exactly like a wrong password so the
// form cannot be used to discover which email/role pairs exist.
export const login = async (email, password, opts = {}) => {
  const res = await postAuth('/login', {
    email,
    password,
    role: opts.role || '',
    // myUNC's honeypot, carried over: a real browser leaves this empty.
    body: opts.honeypot || ''
  })

  if (isServerAnswer(res) && res.data.user) {
    return { ok: true, user: setSession(fromServer(res.data.user)), source: 'server' }
  }
  // A REFUSAL FROM A SERVER WITH NO ACCOUNTS MEANS NOTHING.
  //
  // The 503 the backend now returns in this state is the clean answer, but it
  // only helps once the backend has actually been restarted with that code —
  // and this exact screen has been reached twice with a server running an
  // older build: the footer says "the accounts table is not set up yet"
  // (health reports zero accounts) while the form says "Incorrect email,
  // password or role. (checked against the server)". Those two statements
  // cannot both be useful. An empty table cannot refuse anybody meaningfully.
  //
  // So the client checks for itself rather than depending on the server's
  // status code. Only on the FAILURE path, so a successful sign-in still costs
  // one request; and only when the server says it holds zero accounts, which
  // is our own endpoint reporting deployment state, not a claim about any
  // particular account. A server WITH accounts refusing a password still
  // refuses — that path is untouched.
  if (isRejection(res) && (await serverAccountCount()) === 0) {
    const local = loginLocal(email, password, opts.role)
    if (local.ok) return { ...local, degraded: true }
    return { ...local, error: `${local.error} (checked against the built-in demo accounts)`, degraded: true }
  }

  if (isRejection(res)) {
    // WHICH STORE REFUSED, said out loud.
    //
    // Both stores use the same generic message on purpose — a specific one
    // ("no such email") turns the form into a way to discover who has an
    // account. But "which of the two answered" is not account information: it
    // is deployment state the screen already displays above the demo chips.
    // Without it, "Incorrect email, password or role." was unfalsifiable —
    // impossible to tell a genuinely wrong password from a server that has
    // never been seeded, which is exactly the loop this got stuck in.
    return {
      ok: false,
      error: `${res.data?.error || 'Incorrect email, password or role.'} (checked against the server)`,
      source: 'server'
    }
  }

  // Reachable but broken counts as "no server", so the demo accounts keep
  // working. `degraded` says which of the two it was, for the screen to show.
  const local = loginLocal(email, password, opts.role)
  if (!local.ok) {
    return { ...local, error: `${local.error} (checked against the built-in demo accounts)`, degraded: res.reachable }
  }
  return { ...local, degraded: res.reachable }
}

export const signup = async ({ name, email, password, role, honeypot = '' } = {}) => {
  const cleanName = String(name || '').trim()
  const cleanEmail = normalizeEmail(email)
  const cleanRole = String(role || '').trim()

  // Checked here too so the form can answer instantly, but the server
  // validates again — this is for the user, not for security.
  if (!cleanName) return { ok: false, error: 'Full name is required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Enter a valid email address.' }
  if (String(password || '').length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  if (!roleMeta(cleanRole)) return { ok: false, error: 'Select a valid role.' }
  if (!DEMO_MODE && cleanRole !== 'instructor') {
    return { ok: false, error: 'Approver accounts must be provisioned by an administrator.' }
  }

  const res = await postAuth('/register', { name: cleanName, email: cleanEmail, password, role: cleanRole, body: honeypot })

  if (isServerAnswer(res) && res.data.user) {
    return { ok: true, user: setSession(fromServer(res.data.user)), source: 'server' }
  }
  if (isRejection(res)) {
    return { ok: false, error: res.data?.error || 'Could not create the account.', source: 'server' }
  }

  return { ...signupLocal({ name: cleanName, email: cleanEmail, password, role: cleanRole }), degraded: res.reachable }
}

// ------------------------------------------------------- password reset ---
//
// Both of these are server-only: a reset means proving you control the email
// address, and the local fallback store has no way to do that. When the server
// is unreachable they say so rather than pretending to send anything.

// Covers both "not running" and "running but auth is not installed on it",
// because from the browser they are the same situation: there is nowhere to
// send a reset. The message names the fix rather than just the symptom.
const RESET_NEEDS_SERVER =
  'Password reset needs the backend, and it is not answering. Start the server and run its migration, or sign in with a demo account below.'

export const requestPasswordReset = async (email, opts = {}) => {
  const res = await postAuth('/forgot-password', { email, body: opts.honeypot || '' })
  if (authUnavailable(res)) return { ok: false, error: RESET_NEEDS_SERVER }
  if (!res.ok) return { ok: false, error: res.data?.error || 'Could not start the reset.' }
  // `devToken` is only present when the server was started with
  // LPMS_EXPOSE_RESET_TOKEN=1 — a local-demo escape hatch, off by default.
  return { ok: true, message: res.data?.message || '', devToken: res.data?.devToken || '' }
}

export const resetPassword = async ({ email, token, password } = {}) => {
  if (String(password || '').length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  const res = await postAuth('/reset-password', { email, token, password })
  if (authUnavailable(res)) return { ok: false, error: RESET_NEEDS_SERVER }
  if (!res.ok || !res.data?.user) {
    return { ok: false, error: res.data?.error || 'This reset link is invalid or has expired.' }
  }
  // A completed reset signs the person straight in — they have just proved
  // they hold the token and chosen the password.
  return { ok: true, user: setSession(fromServer(res.data.user)) }
}

// Whether server-side accounts are available. The sign-in screen uses this to
// say which store it is talking to instead of leaving the user guessing.
// Three states, not two. 'unconfigured' is the one that was missing and the
// one people actually hit: the backend is up, but /api/auth is not mounted or
// the Users table has not been migrated, so sign-in silently uses the local
// demo store. Without a name for it, the screen said "offline" while the
// server was plainly running, or said "server" while nothing worked.
// How many accounts the server says it holds, or null if it did not say.
//
// Deliberately narrow: only a well-formed `{ok: true, accounts: N}` produces a
// number. Anything else — unreachable, an error status, a body that will not
// parse — is null, meaning "unknown", and the caller must not act on it.
const serverAccountCount = async () => {
  try {
    const res = await fetch(`${authBase()}/health`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.ok) return null
    const n = Number(data.accounts)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export const reconcileSession = async () => {
  const savedSession = getSession()
  let response

  try {
    const res = await fetch(`${authBase()}/session`, { credentials: 'include' })
    let data = null
    try { data = await res.json() } catch { data = null }
    response = { reachable: true, ok: res.ok, status: res.status, data }
  } catch {
    response = { reachable: false, ok: false, status: 0, data: null }
  }

  if (response.ok && response.data?.user) {
    return { status: 'server', user: setSession(fromServer(response.data.user)) }
  }

  if (response.reachable && (response.status === 401 || response.status === 403)) {
    const accounts = await serverAccountCount()
    if (accounts !== null && accounts > 0) {
      clearStoredSession()
      return { status: 'expired', user: null }
    }
  }

  return savedSession
    ? { status: 'local', user: savedSession }
    : { status: 'none', user: null }
}

export const authMode = async () => {
  let res
  try {
    res = await fetch(`${authBase()}/health`)
  } catch {
    return 'local'
  }
  if (!res.ok) return 'unconfigured'
  let data = null
  try { data = await res.json() } catch { return 'unconfigured' }
  if (!data?.ok) return 'unconfigured'
  // Up, migrated, but nobody in it — the seeder has not been run, so none of
  // the demo accounts exist server-side and every sign-in would be refused.
  if (Number(data.accounts) === 0) return 'unconfigured'
  return 'server'
}

// ----------------------------------------------------------- local store ---
//
// The original browser-only store, kept as the offline fallback. Its `digest`
// is a 32-bit checksum, NOT a password hash — that is exactly why the server
// path above exists. Nothing here runs when the server is reachable.

export const loginLocal = (email, password, role = '') => {
  if (!DEMO_MODE) {
    return { ok: false, error: 'The authentication server is unavailable.', source: 'local' }
  }
  const accounts = seedDemoAccounts()
  const account = accounts.find(a => normalizeEmail(a.email) === normalizeEmail(email))
  const passwordOk = !!account && account.passwordHash === digest(String(password || ''))
  const roleOk = !role || (!!account && account.role === role)
  // One message here too, for the same reason the server uses one.
  if (!account || !passwordOk || !roleOk) {
    return { ok: false, error: 'Incorrect email, password or role.', source: 'local' }
  }
  return { ok: true, user: setSession(publicUser(account)), source: 'local' }
}

export const signupLocal = ({ name, email, password, role } = {}) => {
  const cleanName = String(name || '').trim()
  const cleanEmail = normalizeEmail(email)
  const cleanRole = String(role || '').trim()

  if (!cleanName) return { ok: false, error: 'Full name is required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: 'Enter a valid email address.' }
  if (String(password || '').length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  if (!roleMeta(cleanRole)) return { ok: false, error: 'Select a valid role.' }
  if (!DEMO_MODE) return { ok: false, error: 'The authentication server is unavailable.', source: 'local' }

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
  return { ok: true, user: setSession(publicUser(account)), source: 'local' }
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

// THE INSTRUCTOR'S SCREENS HAVE NO /role/ PREFIX, AND THAT WAS A HOLE.
//
// Every approver page is /role/<role>/…, so the check below could see it. The
// instructor's pages are not: their home is `/`, and composing a plan happens
// at /courses/…, /revisions/…, /references/…, /topics/…, /tlas/…, and
// /ilos/form/…. The guard read those as "not
// role-scoped" and let them render for anybody.
//
// What that looked like: signed in as DANILA, JUNAR (Program Head), open
// http://localhost:5173/ — the app's root — and you get the INSTRUCTOR's
// table, four tabs and all, with "Program Head" in the top-right corner.
// Reproduced at 1440x900: url "/", name "DANILA, JUNAR", role "Program Head",
// tabs Draft/Pending/Returned/Approved (the instructor's set; an approver's
// has three). The label was right and the page was wrong.
//
// So the ownership rule is stated in both directions: /role/<x> belongs to x,
// and everything in this list belongs to the instructor. No approver screen
// links to any of these paths — checked — so nothing legitimate is caught.
const INSTRUCTOR_PATHS = [
  '/record-comments',
  '/courses',
  '/offerings',
  '/revisions',
  '/references',
  '/topics',
  '/tlas',
  '/ilos',
]

/** Is this one of the instructor's own screens? `/` is their home. */
export const isInstructorPath = (pathname = '') => {
  const path = String(pathname).split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  if (path === '/') return true
  return INSTRUCTOR_PATHS.some(p => path === p || path.startsWith(`${p}/`))
}

// Where a signed-in user must be sent instead of the path they asked for, or
// null to let it render. Every approver page takes its role from the URL, so
// without this an instructor could open /role/dean and act as the Dean — the
// account switching the panel flagged [45:27] [45:45]. Unknown /role/... keys
// are left alone; they are not roles this module owns.
export const routeGuardRedirect = (session, pathname = '') => {
  if (!session?.role) return null

  const urlRole = roleFromPath(pathname)
  if (!urlRole) {
    // Not /role/-scoped: it is the instructor's, or it is neither (/login).
    if (!isInstructorPath(pathname)) return null
    if (normalizeRoleKey(session.role) === 'instructor') return null
    return homeRouteForRole(session.role)
  }

  if (!roleMeta(urlRole)) return null
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
  registrationRoles,
  DEMO_PASSWORD,
  roleMeta,
  homeRouteForRole,
  seedDemoAccounts,
  listAccounts,
  getSession,
  setSession,
  login,
  signup,
  loginLocal,
  signupLocal,
  authMode,
  requestPasswordReset,
  resetPassword,
  logout,
  nameForRoleWithSession,
  roleFromPath,
  routeGuardRedirect,
  onSessionChange
}
