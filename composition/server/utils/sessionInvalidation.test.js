'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    COOKIE_NAME,
    issueSession,
    revokeUserSessions,
    createRequireAuth
} = require('../middleware/auth');

const responseRecorder = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

test('sessions use a Sequelize user_id and password reset revokes every session for that user', async () => {
    const first = issueSession({ user_id: 42, name: 'USER, ONE', role: 'instructor' });
    const second = issueSession({ user_id: 42, name: 'USER, ONE', role: 'instructor' });
    revokeUserSessions(42);

    const requireAuth = createRequireAuth({ findUserById: async () => ({ user_id: 42, is_active: true }) });
    for (const token of [first, second]) {
        const res = responseRecorder();
        await requireAuth({ headers: { cookie: `${COOKIE_NAME}=${token}` } }, res, () => assert.fail('revoked session passed'));
        assert.equal(res.statusCode, 401);
    }
});

test('session validation rejects an account that was deactivated after login', async () => {
    const token = issueSession({ user_id: 43, name: 'USER, TWO', role: 'instructor' });
    const requireAuth = createRequireAuth({ findUserById: async () => ({ user_id: 43, is_active: false }) });
    const res = responseRecorder();

    await requireAuth({ headers: { cookie: `${COOKIE_NAME}=${token}` } }, res, () => assert.fail('inactive session passed'));

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'Authentication required.' });
});

test('a malformed percent-encoded cookie is rejected instead of throwing', async () => {
    const requireAuth = createRequireAuth({ findUserById: async () => assert.fail('no account lookup expected') });
    const res = responseRecorder();

    await requireAuth({ headers: { cookie: `${COOKIE_NAME}=%E0%A4%A` } }, res, () => assert.fail('malformed cookie passed'));

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'Authentication required.' });
});
