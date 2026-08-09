// Minimal browser stubs so the session module can run under plain node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
globalThis.Event = class { constructor(type) { this.type = type } };

const { login, signup, logout, getSession, homeRouteForRole, nameForRoleWithSession, routeGuardRedirect, DEMO_PASSWORD } = await import('./session.js');

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

test('login rejects a wrong password and sets no session', () => {
  const result = login('monica.norton@unc.edu.ph', 'wrong');
  if (result.ok) throw new Error('Expected the login to fail');
  if (getSession()) throw new Error('A failed login must not create a session');
});

test('login sets the session to that user, with their role', () => {
  const result = login('monica.norton@unc.edu.ph', DEMO_PASSWORD);
  if (!result.ok) throw new Error(result.error);
  const session = getSession();
  if (session.name !== 'NORTON, MONICA') throw new Error(`Wrong name: ${session.name}`);
  if (session.role !== 'instructor') throw new Error(`Wrong role: ${session.role}`);
});

test('the session holds until it is explicitly ended', () => {
  // Simulates navigating around: nothing but logout/login may change identity.
  for (let i = 0; i < 5; i++) {
    if (getSession()?.name !== 'NORTON, MONICA') throw new Error('Identity changed mid-flow');
  }
  logout();
  if (getSession()) throw new Error('Logout should clear the session');
});

test('signup creates an account with the chosen role and signs it in', () => {
  const result = signup({ name: 'DELA CRUZ, JUAN', email: 'juan@unc.edu.ph', password: 'password1', role: 'dean' });
  if (!result.ok) throw new Error(result.error);
  const session = getSession();
  if (session.role !== 'dean') throw new Error(`Wrong role: ${session.role}`);
  if (!login('juan@unc.edu.ph', 'password1').ok) throw new Error('The new account should be able to sign in again');
});

test('signup rejects a duplicate email, a bad email and a short password', () => {
  if (signup({ name: 'X', email: 'juan@unc.edu.ph', password: 'password1', role: 'dean' }).ok) throw new Error('Duplicate email should fail');
  if (signup({ name: 'X', email: 'not-an-email', password: 'password1', role: 'dean' }).ok) throw new Error('Bad email should fail');
  if (signup({ name: 'X', email: 'new@unc.edu.ph', password: 'short', role: 'dean' }).ok) throw new Error('Short password should fail');
  if (signup({ name: 'X', email: 'new@unc.edu.ph', password: 'password1', role: 'wizard' }).ok) throw new Error('Unknown role should fail');
});

// Regression guard for the approval flow: ApprovalSyllabusSections used to put
// the hard-coded demo name for the role ahead of the signed-in user, so a newly
// signed-up program head saw their own comment attributed to DANILA, JUNAR.
test('an approval action is attributed to the signed-in user, not the demo name for the role', () => {
  const result = signup({ name: 'LAIT, EDRIAN', email: 'edrian@unc.edu.ph', password: 'password1', role: 'program-head' });
  if (!result.ok) throw new Error(result.error);
  const session = getSession();

  // the acting user's own role, in both the stored and the server casing
  if (nameForRoleWithSession(session, 'program-head', 'DANILA, JUNAR') !== 'LAIT, EDRIAN') {
    throw new Error('The signed-in program head must win over the demo name');
  }
  if (nameForRoleWithSession(session, 'PROGRAM_HEAD', 'DANILA, JUNAR') !== 'LAIT, EDRIAN') {
    throw new Error('The server role casing must resolve to the same user');
  }

  // somebody else's role keeps the fallback — no cross-attribution
  if (nameForRoleWithSession(session, 'INSTRUCTOR', 'CASIMERO, DANNY') !== 'CASIMERO, DANNY') {
    throw new Error('A role the user does not hold must keep its own name');
  }

  // with no session at all the caller's fallback still stands
  if (nameForRoleWithSession(null, 'program-head', 'DANILA, JUNAR') !== 'DANILA, JUNAR') {
    throw new Error('No session should fall back to the demo name');
  }
});

// Every approver page reads its acting role out of the URL, so without the
// guard an instructor could open /role/dean and approve as the Dean.
test('a role page can only be opened by the role that signed in', () => {
  if (!login('monica.norton@unc.edu.ph', DEMO_PASSWORD).ok) throw new Error('demo login failed');
  const instructor = getSession();

  if (routeGuardRedirect(instructor, '/role/dean') !== '/') {
    throw new Error('An instructor on /role/dean must be sent back to their own view');
  }
  if (routeGuardRedirect(instructor, '/role/program-head/course-offerings') !== '/') {
    throw new Error('The guard must cover the pages under a role, not just its landing page');
  }
  if (routeGuardRedirect(instructor, '/role/instructor/courses/BIT313L') !== null) {
    throw new Error('The instructor must keep their own role pages');
  }
  if (routeGuardRedirect(instructor, '/courses/1/1/ongoing') !== null) {
    throw new Error('Paths outside /role/ are not role-scoped and must render');
  }

  if (!login('junar.danila@unc.edu.ph', DEMO_PASSWORD).ok) throw new Error('demo login failed');
  const programHead = getSession();
  if (routeGuardRedirect(programHead, '/role/program-head/approval-course-table') !== null) {
    throw new Error('The program head must keep their own queue');
  }
  if (routeGuardRedirect(programHead, '/role/vpaa') !== '/role/program-head') {
    throw new Error('A program head on the VPAA view must be sent back to their own');
  }
  // an unknown /role/... key is not one of ours — leave it to the router
  if (routeGuardRedirect(programHead, '/role/library-director') !== null) {
    throw new Error('An unknown role segment must not be redirected');
  }
  if (routeGuardRedirect(null, '/role/dean') !== null) {
    throw new Error('With no session the sign-in screen handles it, not the guard');
  }
  logout();
});

test('each role lands on its own approver view', () => {
  const expected = {
    instructor: '/',
    'program-head': '/role/program-head',
    'director-of-libraries': '/role/director-of-libraries',
    'industry-consultant': '/role/industry-consultant',
    dean: '/role/dean',
    vpaa: '/role/vpaa'
  };
  Object.entries(expected).forEach(([role, home]) => {
    if (homeRouteForRole(role) !== home) throw new Error(`${role} should land on ${home}`);
  });
});
