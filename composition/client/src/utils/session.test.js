// Minimal browser stubs so the session module can run under plain node.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};
globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
globalThis.Event = class { constructor(type) { this.type = type } };

// No server by default: `fetch` rejects, so login/signup take the documented
// offline fallback. The server-path tests at the bottom install their own.
globalThis.fetch = async () => { throw new Error('no server in this test') };

const sessionModule = await import('./session.js');
const { login, signup, logout, getSession, homeRouteForRole, nameForRoleWithSession, routeGuardRedirect, DEMO_PASSWORD, authMode, requestPasswordReset, resetPassword, isDemoMode, reconcileSession, registrationRoles } = sessionModule;

// `login` and `signup` are async now (they try the server first), so the
// runner awaits and the whole file runs in order.
const queue = [];
const test = (name, fn) => queue.push([name, fn]);
const run = async () => {
  for (const [name, fn] of queue) {
    try { await fn(); console.log(`✓ ${name}`); }
    catch (error) { console.error(`✗ ${name}`); throw error; }
  }
};

test('demo credentials are disabled for a production build unless explicitly enabled', () => {
  if (isDemoMode({ DEV: false })) throw new Error('Production must not enable known demo credentials by default');
  if (!isDemoMode({ DEV: true })) throw new Error('Local Vite development should keep the requested sample accounts');
  if (!isDemoMode({ DEV: false, VITE_LPMS_DEMO_MODE: '1' })) throw new Error('An explicit demo build should be supported');
});

test('local registration offers every learning-plan role while production offers only instructor', () => {
  const localRoles = registrationRoles(true).map(role => role.key);
  const productionRoles = registrationRoles(false).map(role => role.key);

  const expectedLocalRoles = [
    'instructor',
    'program-head',
    'director-of-libraries',
    'industry-consultant',
    'dean',
    'vpaa'
  ];

  if (localRoles.includes('superuser') || productionRoles.includes('superuser')) {
    throw new Error('The superuser must never be offered on the registration form');
  }

  if (JSON.stringify(localRoles) !== JSON.stringify(expectedLocalRoles)) {
    throw new Error(`Local registration roles are incomplete: ${localRoles.join(', ')}`);
  }
  if (JSON.stringify(productionRoles) !== JSON.stringify(['instructor'])) {
    throw new Error(`Production registration exposed privileged roles: ${productionRoles.join(', ')}`);
  }
});

test('login rejects a wrong password and sets no session', async () => {
  const result = await login('monica.norton@unc.edu.ph', 'wrong');
  if (result.ok) throw new Error('Expected the login to fail');
  if (getSession()) throw new Error('A failed login must not create a session');
});

test('login sets the session to that user, with their role', async () => {
  const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD);
  if (!result.ok) throw new Error(result.error);
  const session = getSession();
  if (session.name !== 'NORTON, MONICA') throw new Error(`Wrong name: ${session.name}`);
  if (session.role !== 'instructor') throw new Error(`Wrong role: ${session.role}`);
});

test('the session holds until it is explicitly ended', async () => {
  // Simulates navigating around: nothing but logout/login may change identity.
  for (let i = 0; i < 5; i++) {
    if (getSession()?.name !== 'NORTON, MONICA') throw new Error('Identity changed mid-flow');
  }
  logout();
  if (getSession()) throw new Error('Logout should clear the session');
});

test('signup creates an instructor account and signs it in', async () => {
  const result = await signup({ name: 'DELA CRUZ, JUAN', email: 'juan@unc.edu.ph', password: 'password1', role: 'instructor' });
  if (!result.ok) throw new Error(result.error);
  const session = getSession();
  if (session.role !== 'instructor') throw new Error(`Wrong role: ${session.role}`);
  if (!(await login('juan@unc.edu.ph', 'password1')).ok) throw new Error('The new account should be able to sign in again');
});

test('local demo signup can create a privileged approver account', async () => {
  logout();
  const result = await signup({
    name: 'DEMO HEAD, TEST',
    email: 'local-program-head@example.test',
    password: 'password1',
    role: 'program-head'
  });
  if (!result.ok) throw new Error(result.error);
  if (getSession()?.role !== 'program-head') throw new Error('The new local account did not keep its selected role');
});

test('signup rejects a duplicate email, a bad email and a short password', async () => {
  if ((await signup({ name: 'X', email: 'juan@unc.edu.ph', password: 'password1', role: 'instructor' })).ok) throw new Error('Duplicate email should fail');
  if ((await signup({ name: 'X', email: 'not-an-email', password: 'password1', role: 'instructor' })).ok) throw new Error('Bad email should fail');
  if ((await signup({ name: 'X', email: 'new@unc.edu.ph', password: 'short', role: 'instructor' })).ok) throw new Error('Short password should fail');
  if ((await signup({ name: 'X', email: 'new@unc.edu.ph', password: 'password1', role: 'wizard' })).ok) throw new Error('Unknown role should fail');
});

// Regression guard for the approval flow: ApprovalSyllabusSections used to put
// the hard-coded demo name for the role ahead of the signed-in user, so a newly
// signed-up program head saw their own comment attributed to DANILA, JUNAR.
test('an approval action is attributed to the signed-in user, not the demo name for the role', async () => {
  const result = await login('junar.danila@unc.edu.ph', DEMO_PASSWORD, { role: 'program-head' });
  if (!result.ok) throw new Error(result.error);
  const session = getSession();

  // the acting user's own role, in both the stored and the server casing
  if (nameForRoleWithSession(session, 'program-head', 'WRONG, NAME') !== 'DANILA, JUNAR') {
    throw new Error('The signed-in program head must win over the demo name');
  }
  if (nameForRoleWithSession(session, 'PROGRAM_HEAD', 'WRONG, NAME') !== 'DANILA, JUNAR') {
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
test('a role page can only be opened by the role that signed in', async () => {
  if (!(await login('monica.norton@unc.edu.ph', DEMO_PASSWORD)).ok) throw new Error('demo login failed');
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
    throw new Error('The instructor composes plans at /courses/… — their own screen must render');
  }
  if (routeGuardRedirect(instructor, '/') !== null) {
    throw new Error('The root IS the instructor home; they must not be redirected off it');
  }

  if (!(await login('junar.danila@unc.edu.ph', DEMO_PASSWORD)).ok) throw new Error('demo login failed');
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

// THE REPORTED BUG. Signed in as the Program Head, opening the app's root
// served the INSTRUCTOR's table with "Program Head" in the corner — the header
// reads the session and was telling the truth; the page was the wrong one.
// The old guard only understood /role/<x>, and the instructor's screens have
// no such prefix, so every one of them was open to everybody.
test('the instructor\'s own screens are the instructor\'s', async () => {
  if (!(await login('junar.danila@unc.edu.ph', DEMO_PASSWORD)).ok) throw new Error('demo login failed');
  const programHead = getSession();

  const mustRedirect = [
    '/',                              // the exact screenshot
    '/courses/1/1/draft',             // composing a plan
    '/courses/BSCS511',
    '/revisions/BSCS511',
    '/record-comments',
    '/ilos/form/BSCS511/1',
    '/topics/form/1/draft',
    '/tlas/form/1/draft',
    '/references/form/1/draft'
  ];
  for (const path of mustRedirect) {
    const to = routeGuardRedirect(programHead, path);
    if (to !== '/role/program-head') {
      throw new Error(`A program head on ${path} must be sent to their own home, got ${JSON.stringify(to)}`);
    }
  }

  // Query strings and trailing slashes are the same path.
  if (routeGuardRedirect(programHead, '/?status=pending') !== '/role/program-head') {
    throw new Error('A query string must not smuggle a page past the guard');
  }
  if (routeGuardRedirect(programHead, '/topics/form/1/draft/') !== '/role/program-head') {
    throw new Error('A trailing slash must not smuggle a page past the guard');
  }

  // NOT the instructor's, and NOT an approver page either — leave it alone, or
  // signing in becomes impossible for anybody but the instructor.
  if (routeGuardRedirect(programHead, '/login') !== null) {
    throw new Error('/login belongs to no role and must render');
  }
  if (routeGuardRedirect(programHead, '/forgot-password') !== null) {
    throw new Error('The password screens belong to no role and must render');
  }
  // A path that merely STARTS with an instructor segment is a different path.
  if (routeGuardRedirect(programHead, '/course-offerings') !== null) {
    throw new Error('/course-offerings is not under /courses and must not be caught');
  }

  // And the instructor still gets everything on that list.
  if (!(await login('monica.norton@unc.edu.ph', DEMO_PASSWORD)).ok) throw new Error('demo login failed');
  const instructor = getSession();
  for (const path of mustRedirect) {
    if (routeGuardRedirect(instructor, path) !== null) {
      throw new Error(`The instructor must keep ${path}`);
    }
  }
  logout();
});

test('each role lands on its own approver view', async () => {
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

// --------------------------------------------------------- server path ---
//
// Accounts now live in a Users table with scrypt-hashed passwords. These
// checks cover the boundary that matters: the server decides when it answers,
// and the local store only stands in when there is no server at all.

const withFetch = async (impl, fn) => {
  const previous = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = previous; }
};

const jsonRes = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

test('a seeded server clears a browser identity whose cookie has expired', async () => {
  logout();
  const signedIn = await login('roberto.cruz@unc.edu.ph', DEMO_PASSWORD, { role: 'industry-consultant' });
  if (!signedIn.ok) throw new Error(signedIn.error);

  await withFetch(async (url, opts = {}) => {
    if (String(url).endsWith('/session')) {
      if (opts.credentials !== 'include') throw new Error('session reconciliation must include the HttpOnly cookie');
      return jsonRes(401, { error: 'Authentication required.' });
    }
    if (String(url).endsWith('/health')) return jsonRes(200, { ok: true, accounts: 6 });
    throw new Error(`unexpected request: ${url}`);
  }, async () => {
    const result = await reconcileSession();
    if (result.status !== 'expired') throw new Error(`expected expired, got ${result.status}`);
  });

  if (getSession()) throw new Error('the stale browser identity must be cleared');
});

test('when the server answers, the server decides who is signed in', async () => {
  logout();
  const calls = [];
  await withFetch(async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return jsonRes(200, { user: { id: 42, name: 'SERVER, USER', email: 'server@unc.edu.ph', role: 'dean' } });
  }, async () => {
    const result = await login('server@unc.edu.ph', 'whatever1');
    if (!result.ok) throw new Error(result.error);
    if (result.source !== 'server') throw new Error(`expected the server path, got ${result.source}`);
    if (getSession().name !== 'SERVER, USER') throw new Error('the session must be the server\'s record');
    if (getSession().role !== 'dean') throw new Error('the role comes from the account, not the form');
    if (getSession().roleLabel !== 'Dean') throw new Error('the label is derived for display');
  });

  if (!/\/api\/auth\/login$/.test(calls[0].url)) throw new Error(`wrong endpoint: ${calls[0].url}`);
  // myUNC's honeypot, carried over — always sent, always empty from a browser.
  if (calls[0].body.body !== '') throw new Error('the honeypot field must be sent empty');
  logout();
});

test('a password the server rejects does NOT fall through to the local store', async () => {
  // The most important check here. The demo password would succeed locally,
  // so if a server rejection fell through, the server would be decorative and
  // every local account would still be a way in.
  logout();
  await withFetch(
    async () => jsonRes(401, { error: 'Incorrect email or password.' }),
    async () => {
      const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD);
      if (result.ok) throw new Error('a server rejection must not be overridden by the local store');
      if (result.source !== 'server') throw new Error('the refusal should be attributed to the server');
      if (getSession()) throw new Error('a rejected login must leave no session');
    }
  );
});

test('with no server at all, the local store still signs the demo accounts in', async () => {
  logout();
  const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD);
  if (!result.ok) throw new Error(result.error);
  if (result.source !== 'local') throw new Error(`expected the offline path, got ${result.source}`);
  if (getSession().role !== 'instructor') throw new Error('offline sign-in still carries the role');
  logout();
});

test('sign-up posts to the server and reports the server\'s refusal', async () => {
  logout();
  await withFetch(
    async () => jsonRes(409, { error: 'An account with that email already exists.' }),
    async () => {
      const taken = await signup({ name: 'A B', email: 'taken@unc.edu.ph', password: 'password1', role: 'instructor' });
      if (taken.ok) throw new Error('a duplicate must fail');
      if (!/already exists/.test(taken.error)) throw new Error(`the server's reason should reach the form: ${taken.error}`);
      if (getSession()) throw new Error('a failed sign-up must not sign anyone in');
    }
  );

  await withFetch(
    async () => jsonRes(201, { user: { id: 7, name: 'NEW, USER', email: 'new@unc.edu.ph', role: 'instructor' } }),
    async () => {
      const made = await signup({ name: 'NEW, USER', email: 'new@unc.edu.ph', password: 'password1', role: 'instructor' });
      if (!made.ok) throw new Error(made.error);
      if (getSession().role !== 'instructor') throw new Error('a new account is signed straight in');
    }
  );
  logout();
});

test('a 429 registration limit is a server refusal and never falls back to a local account', async () => {
  logout();
  await withFetch(
    async () => jsonRes(429, { error: 'Too many registration attempts. Wait a few minutes and try again.' }),
    async () => {
      const result = await signup({ name: 'RATE, LIMITED', email: 'limited@unc.edu.ph', password: 'password1', role: 'instructor' });
      if (result.ok) throw new Error('the local store bypassed the server rate limit');
      if (result.source !== 'server') throw new Error(`the refusal should come from the server, got ${result.source}`);
      if (!/Too many registration attempts/.test(result.error)) throw new Error(`wrong refusal message: ${result.error}`);
      if (getSession()) throw new Error('a rate-limited sign-up must not create a session');
    }
  );
});

test('the form still catches bad input before it reaches the network', async () => {
  let called = 0;
  await withFetch(async () => { called++; return jsonRes(201, {}); }, async () => {
    const bad = [
      { name: '', email: 'a@b.ph', password: 'password1', role: 'instructor' },
      { name: 'A', email: 'not-an-email', password: 'password1', role: 'instructor' },
      { name: 'A', email: 'a@b.ph', password: 'short', role: 'instructor' },
      { name: 'A', email: 'a@b.ph', password: 'password1', role: 'wizard' }
    ];
    for (const input of bad) {
      if ((await signup(input)).ok) throw new Error(`should have been rejected: ${JSON.stringify(input)}`);
    }
  });
  if (called !== 0) throw new Error('invalid input must not reach the server');
});

test('authMode reports which store is actually answering', async () => {
  await withFetch(async () => jsonRes(200, { ok: true, accounts: 6 }), async () => {
    if (await authMode() !== 'server') throw new Error('a healthy server should report "server"');
  });
  await withFetch(async () => { throw new Error('down') }, async () => {
    if (await authMode() !== 'local') throw new Error('no server should report "local"');
  });
});

// A router for the tests below, which need /health and /login to disagree.
const routed = (routes) => async (url) => {
  const u = String(url);
  for (const [fragment, reply] of Object.entries(routes)) {
    if (u.includes(fragment)) return reply();
  }
  throw new Error(`no stub for ${u}`);
};

test('an OLD server that refuses everything still lets the demo accounts in', async () => {
  // THE STATE REACHED TWICE IN PRACTICE. The backend has been restarted far
  // enough to create the Users table — so /health answers {ok:true,
  // accounts:0} and the screen says "not set up yet" — but it is running an
  // authController from before the 503 change, so /login answers 401.
  //
  // The screen then said BOTH "the accounts table is not set up" and
  // "Incorrect email, password or role. (checked against the server)". A
  // server holding zero accounts cannot meaningfully refuse anybody, so the
  // client stops believing the status code and checks.
  logout();
  await withFetch(routed({
    '/health': () => jsonRes(200, { ok: true, accounts: 0 }),
    '/login': () => jsonRes(401, { error: 'Incorrect email, password or role.' })
  }), async () => {
    const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
    if (!result.ok) throw new Error(`the demo account should still work: ${result.error}`);
    if (result.source !== 'local') throw new Error(`expected the local store, got ${result.source}`);
    if (getSession()?.name !== 'NORTON, MONICA') throw new Error('the session should be the demo account');
  });
  logout();
});

test('…and it still checks the password against the local store', async () => {
  await withFetch(routed({
    '/health': () => jsonRes(200, { ok: true, accounts: 0 }),
    '/login': () => jsonRes(401, { error: 'Incorrect email, password or role.' })
  }), async () => {
    for (const [email, password, role] of [
      ['monica.norton@unc.edu.ph', 'wrong', 'instructor'],
      ['monica.norton@unc.edu.ph', DEMO_PASSWORD, 'dean'],
      ['nobody@unc.edu.ph', DEMO_PASSWORD, 'dean']
    ]) {
      const r = await login(email, password, { role });
      if (r.ok) throw new Error(`${email}/${password}/${role} should have failed`);
      if (!/built-in demo accounts/.test(r.error)) throw new Error(`should say which store: ${r.error}`);
    }
  });
  if (getSession()) throw new Error('none of those should have created a session');
});

test('a server WITH accounts still refuses, and does not fall back', async () => {
  // The bound on the rule above. Zero accounts is the only condition that
  // makes a refusal meaningless; a seeded server saying no still means no,
  // even for a demo email and the demo password.
  logout();
  await withFetch(routed({
    '/health': () => jsonRes(200, { ok: true, accounts: 6 }),
    '/login': () => jsonRes(401, { error: 'Incorrect email, password or role.' })
  }), async () => {
    const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
    if (result.ok) throw new Error('a seeded server refusing must still refuse');
    if (result.source !== 'server') throw new Error(`expected the server's refusal, got ${result.source}`);
    if (!/checked against the server/.test(result.error)) throw new Error(result.error);
  });
  if (getSession()) throw new Error('a refused login must not create a session');
});

test('a successful sign-in does not pay for the extra check', async () => {
  // The health probe is on the failure path only.
  logout();
  let healthCalls = 0;
  await withFetch(routed({
    '/health': () => { healthCalls++; return jsonRes(200, { ok: true, accounts: 6 }); },
    '/login': () => jsonRes(200, { user: { id: 1, name: 'SERVER, USER', email: 'x@unc.edu.ph', role: 'dean' } })
  }), async () => {
    const result = await login('x@unc.edu.ph', 'whatever', { role: 'dean' });
    if (!result.ok) throw new Error(result.error);
  });
  if (healthCalls !== 0) throw new Error(`a successful login should not call /health, it called it ${healthCalls} time(s)`);
  logout();
});

test('a refusal says which store refused', async () => {
    // "Incorrect email, password or role." with no attribution is
    // unfalsifiable: a wrong password and an unseeded server read identically,
    // and there is no way to tell from the screen which one you are looking
    // at. The message still says nothing about WHICH field was wrong.
    logout();
    await withFetch(async () => jsonRes(401, { error: 'Incorrect email, password or role.' }), async () => {
        const r = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
        if (r.ok) throw new Error('should have been refused');
        if (!/checked against the server/.test(r.error)) throw new Error(`server refusal should say so: ${r.error}`);
    });
    await withFetch(async () => { throw new Error('down') }, async () => {
        const r = await login('monica.norton@unc.edu.ph', 'wrong', { role: 'instructor' });
        if (r.ok) throw new Error('should have been refused');
        if (!/built-in demo accounts/.test(r.error)) throw new Error(`local refusal should say so: ${r.error}`);
    });
    // And it still refuses to say WHICH of email, password or role was wrong.
    await withFetch(async () => { throw new Error('down') }, async () => {
        const wrongPassword = (await login('monica.norton@unc.edu.ph', 'wrong', { role: 'instructor' })).error;
        const wrongRole = (await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'dean' })).error;
        const noSuchEmail = (await login('nobody@unc.edu.ph', DEMO_PASSWORD, { role: 'dean' })).error;
        if (new Set([wrongPassword, wrongRole, noSuchEmail]).size !== 1) {
            throw new Error(`the three failures must read identically:\n  ${wrongPassword}\n  ${wrongRole}\n  ${noSuchEmail}`);
        }
    });
    if (getSession()) throw new Error('none of that should have created a session');
});

/* ----------------------------- a server that is up but not set up ------ */
//
// REGRESSION. Reported from the running app: the demo accounts refused to
// sign in with "Incorrect email or password." while the browser-side store
// that holds them was perfectly fine. The cause was here: `login` treated
// EVERY non-ok response as a credential decision, so a backend that was
// running without /api/auth mounted (404), or without its Users table
// migrated (500), or behind a proxy returning an HTML error page, all read as
// a wrong password — and the local fallback that should have caught it never
// ran, because "the server answered".

const brokenServerResponses = [
  ['the auth routes are not mounted', () => jsonRes(404, { error: 'Not Found' })],
  ['the Users table has not been migrated', () => jsonRes(500, { error: 'SQLITE_ERROR: no such table: Users' })],
  ['the server returns an HTML error page', () => ({ ok: false, status: 502, json: async () => { throw new Error('not json') } })],
  ['the server answers 200 with nothing usable', () => ({ ok: true, status: 200, json: async () => { throw new Error('not json') } })]
];

for (const [why, impl] of brokenServerResponses) {
  test(`a demo account still signs in when ${why}`, async () => {
    logout();
    await withFetch(async () => impl(), async () => {
      const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
      if (!result.ok) throw new Error(`the demo account should still work: ${result.error}`);
      if (result.source !== 'local') throw new Error(`expected the local store to stand in, got ${result.source}`);
      if (result.degraded !== true) throw new Error('the screen needs to know the server was reachable but broken');
      if (getSession()?.name !== 'NORTON, MONICA') throw new Error('the session should be the demo account');
    });
    logout();
  });
}

test('a broken server does not turn a wrong password into a sign-in', async () => {
  logout();
  await withFetch(async () => jsonRes(500, { error: 'boom' }), async () => {
    const result = await login('monica.norton@unc.edu.ph', 'not-the-password', { role: 'instructor' });
    if (result.ok) throw new Error('falling back must still check the password');
    if (getSession()) throw new Error('a failed login must not create a session');
  });
});

test('a real refusal is still a refusal, and says so in the same words as the server', async () => {
  logout();
  // 401 is the auth API deciding. This must NOT be retried locally, or a
  // password the server refused would be accepted by the demo store.
  await withFetch(async () => jsonRes(401, { error: 'Incorrect email, password or role.' }), async () => {
    const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
    if (result.ok) throw new Error('the server refused, so the sign-in must fail');
    if (result.source !== 'server') throw new Error(`a refusal comes from the server, got ${result.source}`);
    // The server's own wording is preserved; the client only appends which
    // store answered (see 'a refusal says which store refused').
    if (!result.error.startsWith('Incorrect email, password or role.')) throw new Error(`Wrong message: ${result.error}`);
  });
  // A locked-out account (423) is a decision too, not a broken server.
  await withFetch(async () => jsonRes(423, { error: 'Too many attempts. Try again in 15 minutes.' }), async () => {
    const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
    if (result.ok) throw new Error('a locked account must not be let in by the local store');
    if (!/Too many attempts/.test(result.error)) throw new Error(`the lockout message should survive: ${result.error}`);
  });
  if (getSession()) throw new Error('none of that should have created a session');
});

test('a server with NO accounts falls back to the demo accounts', async () => {
    // THE REGRESSION. Creating the Users table at boot fixed the crash and
    // broke the demo: the route then worked and answered every sign-in with a
    // truthful 401, because the table was empty. "Incorrect email, password or
    // role." for credentials that were never wrong.
    //
    // The server now answers 503 with `setup: 'no-accounts'` in that state,
    // which is not a credential decision, so the local store stands in.
    logout();
    await withFetch(async () => jsonRes(503, { error: 'No accounts have been created on this server yet.', setup: 'no-accounts' }), async () => {
        const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
        if (!result.ok) throw new Error(`the demo account should work against an unseeded server: ${result.error}`);
        if (result.source !== 'local') throw new Error(`expected the local store, got ${result.source}`);
        if (getSession()?.name !== 'NORTON, MONICA') throw new Error('the session should be the demo account');
    });
    logout();
});

test('an unseeded server still checks the password before letting anyone in', async () => {
    // The fallback must not become "anything signs in when the server is
    // empty" — the local store still has to agree.
    await withFetch(async () => jsonRes(503, { error: 'x', setup: 'no-accounts' }), async () => {
        if ((await login('monica.norton@unc.edu.ph', 'wrong-password', { role: 'instructor' })).ok) {
            throw new Error('a wrong password must still fail');
        }
        if ((await login('nobody@unc.edu.ph', DEMO_PASSWORD, { role: 'dean' })).ok) {
            throw new Error('an unknown email must still fail');
        }
        if ((await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'dean' })).ok) {
            throw new Error('the wrong role must still fail');
        }
    });
    if (getSession()) throw new Error('none of those should have created a session');
});

test('a SEEDED server refusing a password still does not fall through', async () => {
    // The 503 above is the only new door. A 401 from a server that does have
    // accounts must behave exactly as before.
    logout();
    await withFetch(async () => jsonRes(401, { error: 'Incorrect email, password or role.' }), async () => {
        const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
        if (result.ok) throw new Error('a real refusal must still refuse, even for a demo email');
        if (result.source !== 'server') throw new Error(`expected the server's refusal, got ${result.source}`);
    });
    if (getSession()) throw new Error('a refused login must not create a session');
});

test('sign-up also falls back when the server is up but not set up', async () => {
  logout();
  await withFetch(async () => jsonRes(404, { error: 'Not Found' }), async () => {
    const result = await signup({ name: 'TEST, ONE', email: 'fallback@unc.edu.ph', password: 'password1', role: 'instructor' });
    if (!result.ok) throw new Error(`should have been created locally: ${result.error}`);
    if (result.source !== 'local') throw new Error(`expected the local store, got ${result.source}`);
  });
  logout();
});

test('authMode tells the three cases apart', async () => {
  const cases = [
    ['a healthy, seeded server', () => jsonRes(200, { ok: true, accounts: 6 }), 'server'],
    ['no server at all', () => { throw new Error('down') }, 'local'],
    ['the auth routes are missing', () => jsonRes(404, { error: 'Not Found' }), 'unconfigured'],
    ['the Users table is missing', () => jsonRes(503, { ok: false }), 'unconfigured'],
    ['health answers with no ok flag', () => jsonRes(200, {}), 'unconfigured'],
    // Migrated but never seeded: every server-side sign-in would be refused,
    // so this is not a working server either.
    ['the table exists but is empty', () => jsonRes(200, { ok: true, accounts: 0 }), 'unconfigured']
  ];
  for (const [why, impl, expected] of cases) {
    await withFetch(async () => impl(), async () => {
      const mode = await authMode();
      if (mode !== expected) throw new Error(`${why}: expected "${expected}", got "${mode}"`);
    });
  }
});

/* ------------------------------------------------- password reset ------ */
//
// The reset flow is server-only on purpose. The local store has no way to
// prove someone owns an email address, so "reset" against it would just be
// "change anyone's password" — the failure has to be visible, not silently
// downgraded to the offline path the way login is.

test('a reset request sends the email and reports the same-answer message', async () => {
  const calls = [];
  await withFetch(async (url, opts) => {
    calls.push({ url: String(url), body: JSON.parse(opts.body) });
    return jsonRes(200, { ok: true, message: 'If that email has an account, a reset link has been created.' });
  }, async () => {
    const res = await requestPasswordReset('monica.norton@unc.edu.ph');
    if (!res.ok) throw new Error(res.error);
    if (!res.message.startsWith('If that email has an account')) throw new Error(`Wrong message: ${res.message}`);
    // The screen must not learn whether the account exists — anything the UI
    // could branch on here would leak it.
    if ('exists' in res || 'found' in res) throw new Error('the reset response must not say whether the account exists');
  });
  if (calls.length !== 1) throw new Error(`expected one request, got ${calls.length}`);
  if (!calls[0].url.endsWith('/api/auth/forgot-password')) throw new Error(`Wrong endpoint: ${calls[0].url}`);
});

test('authentication requests include the server session cookie', async () => {
  await withFetch(async (url, opts) => {
    if (opts.credentials !== 'include') throw new Error(`expected credentials=include, got ${opts.credentials}`);
    return jsonRes(200, { user: { id: 1, name: 'NORTON, MONICA', email: 'monica.norton@unc.edu.ph', role: 'instructor' } });
  }, async () => {
    const result = await login('monica.norton@unc.edu.ph', DEMO_PASSWORD, { role: 'instructor' });
    if (!result.ok) throw new Error(result.error);
    if (result.source !== 'server') throw new Error(`the cookie assertion was bypassed by ${result.source} fallback`);
  });
  logout();
});

test('sign out invalidates the server session as well as local identity', async () => {
  let request = null;
  await withFetch(async (url, opts) => {
    request = { url: String(url), opts };
    return jsonRes(200, { ok: true });
  }, async () => {
    logout();
    await new Promise(resolve => setImmediate(resolve));
  });

  if (!request?.url.endsWith('/api/auth/logout')) throw new Error(`wrong logout endpoint: ${request?.url}`);
  if (request.opts.method !== 'POST') throw new Error(`logout must POST, got ${request.opts.method}`);
  if (request.opts.credentials !== 'include') throw new Error('logout must include the HttpOnly session cookie');
  if (getSession()) throw new Error('logout must still clear local identity immediately');
});

test('the honeypot rides along with the reset request', async () => {
  await withFetch(async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (body.body !== 'i-am-a-bot') throw new Error('the honeypot value must reach the server');
    return jsonRes(200, { ok: true, message: 'ok' });
  }, async () => {
    const res = await requestPasswordReset('a@b.ph', { honeypot: 'i-am-a-bot' });
    if (!res.ok) throw new Error(res.error);
  });
});

test('devToken is passed through only when the server sends one', async () => {
  await withFetch(async () => jsonRes(200, { ok: true, message: 'ok' }), async () => {
    if ((await requestPasswordReset('a@b.ph')).devToken) throw new Error('no token was sent, so none may be reported');
  });
  await withFetch(async () => jsonRes(200, { ok: true, message: 'ok', devToken: 'abc123' }), async () => {
    if ((await requestPasswordReset('a@b.ph')).devToken !== 'abc123') throw new Error('a demo-mode token should be passed through');
  });
});

test('a reset cannot fall back to the local store when the server is down', async () => {
  await withFetch(async () => { throw new Error('down') }, async () => {
    const asked = await requestPasswordReset('monica.norton@unc.edu.ph');
    if (asked.ok) throw new Error('with no server there is no reset — it must not silently succeed');
    if (!/server/i.test(asked.error)) throw new Error(`the error should say the server is needed: ${asked.error}`);

    const done = await resetPassword({ email: 'monica.norton@unc.edu.ph', token: 'anything', password: 'newpassword1' });
    if (done.ok) throw new Error('an offline reset must not change the local password');
    if (getSession()) throw new Error('a failed reset must not create a session');
  });
  // And the old password still works, i.e. nothing was written on the way out.
  if (!(await login('monica.norton@unc.edu.ph', DEMO_PASSWORD)).ok) throw new Error('the account should be untouched');
  logout();
});

test('a rejected token gives the same answer whether it is wrong or expired', async () => {
  const seen = new Set();
  for (const body of [{ error: 'This reset link is invalid or has expired.' }, {}]) {
    await withFetch(async () => jsonRes(400, body), async () => {
      const res = await resetPassword({ email: 'a@b.ph', token: 'bad', password: 'newpassword1' });
      if (res.ok) throw new Error('a rejected token must fail');
      seen.add(res.error);
    });
  }
  if (seen.size !== 1) throw new Error(`the failures should read identically, got: ${[...seen].join(' | ')}`);
  if (getSession()) throw new Error('a failed reset must not create a session');
});

test('a short new password is caught before it reaches the network', async () => {
  let called = 0;
  await withFetch(async () => { called++; return jsonRes(200, { user: {} }) }, async () => {
    const res = await resetPassword({ email: 'a@b.ph', token: 'good', password: 'short' });
    if (res.ok) throw new Error('a 5-character password should be rejected');
  });
  if (called !== 0) throw new Error('an invalid password must not reach the server');
});

test('a completed reset signs the person in as the account the server returned', async () => {
  logout();
  const calls = [];
  await withFetch(async (url, opts) => {
    calls.push({ url: String(url), body: JSON.parse(opts.body) });
    return jsonRes(200, { user: { id: 3, name: 'SANTOS, MARIA', email: 'maria.santos@unc.edu.ph', role: 'director-of-libraries' } });
  }, async () => {
    const res = await resetPassword({ email: 'maria.santos@unc.edu.ph', token: 'good-token', password: 'newpassword1' });
    if (!res.ok) throw new Error(res.error);
    const session = getSession();
    if (!session) throw new Error('a completed reset should sign the person in');
    if (session.role !== 'director-of-libraries') throw new Error(`Wrong role: ${session.role}`);
    if (homeRouteForRole(session.role) !== '/role/director-of-libraries') throw new Error('should land on that role\'s home');
  });
  if (!calls[0].url.endsWith('/api/auth/reset-password')) throw new Error(`Wrong endpoint: ${calls[0].url}`);
  if (calls[0].body.token !== 'good-token') throw new Error('the token must be sent');
  // The role is the account's, not the form's — the reset screen never asks.
  if ('role' in calls[0].body) throw new Error('the reset request must not carry a client-chosen role');
  logout();
});

  for (const role of ['instructor', 'program-head', 'dean', 'superuser']) {
    if (sent.currentPassword !== 'Temp-pass1' || sent.newPassword !== 'Brand-new-9') throw new Error('both passwords must be sent');
  });
  logout();
});

test('the superuser lands on user management and cannot open another role pages', () => {
  const superuser = { id: 9, role: 'superuser' };
  if (homeRouteForRole('superuser') !== '/role/superuser') throw new Error('superuser home route is wrong');
  if (routeGuardRedirect(superuser, '/role/superuser') !== null) throw new Error('superuser must reach its own page');
  if (routeGuardRedirect(superuser, '/role/dean') !== '/role/superuser') throw new Error('superuser must not open the Dean page');
  if (routeGuardRedirect(superuser, '/') !== '/role/superuser') throw new Error('superuser must not open the instructor home');
  if (routeGuardRedirect({ id: 1, role: 'dean' }, '/role/superuser') !== '/role/dean') throw new Error('a Dean must not open the superuser page');
});

await run();
console.log('\nAll session checks passed.');
