'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { User } = require('../models');
const auth = require('../controllers/authController');
const { hashPassword } = require('./password');
const { hashToken } = require('./resetToken');
const { COOKIE_NAME, issueSession, createRequireAuth } = require('../middleware/auth');
const { PRIVACY_NOTICE_VERSION } = require('../config/privacy');

const responseRecorder = () => {
    const record = { statusCode: 200, body: null, cookies: [] };
    return {
        record,
        status(code) { record.statusCode = code; return this; },
        json(body) { record.body = body; return this; },
        cookie(name, value, options) { record.cookies.push({ name, value, options }); return this; }
    };
};

test('a successful login creates an HttpOnly server session cookie', async () => {
    const originalCount = User.count;
    const originalScope = User.scope;
    const passwordHash = await hashPassword('correct123');
    const user = {
        id: 7,
        name: 'NORTON, MONICA',
        email: 'monica.norton@unc.edu.ph',
        role: 'instructor',
        is_active: true,
        password_hash: passwordHash,
        last_login_at: null,
        toPublic() { return { id: this.id, name: this.name, email: this.email, role: this.role }; },
        async save() {}
    };

    User.count = async () => 1;
    User.scope = () => ({ findOne: async () => user });

    try {
        const res = responseRecorder();
        await auth.login({ body: { email: user.email, password: 'correct123', role: 'instructor' } }, res, error => { throw error; });

        assert.equal(res.record.statusCode, 200);
        assert.equal(res.record.cookies.length, 1);
        assert.equal(res.record.cookies[0].name, 'lpms_session');
        assert.equal(typeof res.record.cookies[0].value, 'string');
        assert.ok(res.record.cookies[0].value.length >= 32);
        assert.equal(res.record.cookies[0].options.httpOnly, true);
        assert.equal(res.record.cookies[0].options.sameSite, 'lax');
    } finally {
        User.count = originalCount;
        User.scope = originalScope;
    }
});

test('production never accepts the published demo password', async () => {
    const previousEnvironment = process.env.NODE_ENV;
    const originalCount = User.count;
    const originalScope = User.scope;
    const user = {
        id: 8,
        name: 'NORTON, MONICA',
        email: 'monica.norton@unc.edu.ph',
        role: 'instructor',
        is_active: true,
        password_hash: await hashPassword('demo1234'),
        async save() {},
        toPublic() { return { id: this.id, email: this.email, role: this.role }; }
    };
    process.env.NODE_ENV = 'production';
    User.count = async () => 1;
    User.scope = () => ({ findOne: async () => user });

    try {
        const res = responseRecorder();
        await auth.login({
            body: { email: user.email, password: 'demo1234', role: 'instructor' },
            ip: '127.0.0.1'
        }, res, error => { throw error; });

        assert.equal(res.record.statusCode, 401);
        assert.equal(res.record.cookies.length, 0);
    } finally {
        User.count = originalCount;
        User.scope = originalScope;
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
    }
});

test('remote public registration cannot provision a privileged approver role', async () => {
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    let queried = false;
    let created = false;
    User.findOne = async () => { queried = true; return null; };
    User.create = async () => { created = true; return { toPublic: () => ({}) }; };

    try {
        const res = responseRecorder();
        await auth.register({
            ip: '203.0.113.25',
            body: {
                name: 'ATTACKER',
                email: 'attacker@example.test',
                password: 'password123',
                role: 'dean'
            }
        }, res, error => { throw error; });

        assert.equal(res.record.statusCode, 403);
        assert.deepEqual(res.record.body, { error: 'Public registration is disabled. Contact the system administrator.' });
        assert.equal(queried, false);
        assert.equal(created, false);
    } finally {
        User.findOne = originalFindOne;
        User.create = originalCreate;
    }
});

test('localhost development registration can provision an approver for the local demo', async () => {
    const previousEnvironment = process.env.NODE_ENV;
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    const user = {
        id: 10,
        name: 'DEMO HEAD, TEST',
        email: 'local-program-head@example.test',
        role: 'program-head',
        toPublic() { return { id: this.id, name: this.name, email: this.email, role: this.role }; }
    };
    process.env.NODE_ENV = 'development';
    User.findOne = async () => null;
    User.create = async values => ({ ...user, ...values, toPublic: user.toPublic });

    try {
        const res = responseRecorder();
        await auth.register({
            ip: '127.0.0.1',
            body: { ...user, password: 'password123', privacy_consent_version: PRIVACY_NOTICE_VERSION }
        }, res, error => { throw error; });

        assert.equal(res.record.statusCode, 201);
        assert.equal(res.record.body.user.role, 'program-head');
        assert.equal(res.record.cookies[0]?.name, 'lpms_session');
    } finally {
        User.findOne = originalFindOne;
        User.create = originalCreate;
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
    }
});

test('allowed instructor registration starts a server session', async () => {
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    const user = {
        id: 9,
        name: 'NEW, INSTRUCTOR',
        email: 'new.instructor@example.test',
        role: 'instructor',
        toPublic() { return { id: this.id, name: this.name, email: this.email, role: this.role }; }
    };
    User.findOne = async () => null;
    User.create = async () => user;

    try {
        const res = responseRecorder();
        await auth.register({ ip: '127.0.0.1', body: { ...user, password: 'password123', privacy_consent_version: PRIVACY_NOTICE_VERSION } }, res, error => { throw error; });

        assert.equal(res.record.statusCode, 201);
        assert.equal(res.record.cookies[0]?.name, 'lpms_session');
        assert.equal(res.record.cookies[0]?.options.httpOnly, true);
    } finally {
        User.findOne = originalFindOne;
        User.create = originalCreate;
    }
});

test('production registration is disabled unless an administrator explicitly enables it', async () => {
    const previousEnvironment = process.env.NODE_ENV;
    const previousFlag = process.env.LPMS_ALLOW_PUBLIC_REGISTRATION;
    const originalFindOne = User.findOne;
    let queried = false;
    process.env.NODE_ENV = 'production';
    delete process.env.LPMS_ALLOW_PUBLIC_REGISTRATION;
    User.findOne = async () => { queried = true; return null; };

    try {
        const res = responseRecorder();
        await auth.register({
            ip: '198.51.100.70',
            body: { name: 'NEW USER', email: 'new@example.test', password: 'password123', role: 'instructor' }
        }, res, error => { throw error; });

        assert.equal(res.record.statusCode, 403);
        assert.match(res.record.body.error, /disabled/i);
        assert.equal(queried, false);
    } finally {
        User.findOne = originalFindOne;
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
        if (previousFlag === undefined) delete process.env.LPMS_ALLOW_PUBLIC_REGISTRATION;
        else process.env.LPMS_ALLOW_PUBLIC_REGISTRATION = previousFlag;
    }
});

test('missing or unexpected environment names do not expose registration to remote callers', async () => {
    const previousEnvironment = process.env.NODE_ENV;
    const previousFlag = process.env.LPMS_ALLOW_PUBLIC_REGISTRATION;
    delete process.env.LPMS_ALLOW_PUBLIC_REGISTRATION;
    try {
        for (const environment of [undefined, 'prodution']) {
            if (environment === undefined) delete process.env.NODE_ENV;
            else process.env.NODE_ENV = environment;
            const res = responseRecorder();
            await auth.register({
                ip: '203.0.113.90',
                body: { name: 'REMOTE USER', email: 'remote@example.test', password: 'password123', role: 'instructor' }
            }, res, error => { throw error; });
            assert.equal(res.record.statusCode, 403);
        }
    } finally {
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
        if (previousFlag === undefined) delete process.env.LPMS_ALLOW_PUBLIC_REGISTRATION;
        else process.env.LPMS_ALLOW_PUBLIC_REGISTRATION = previousFlag;
    }
});

test('an explicitly enabled production registration still creates an instructor account', async () => {
    const previousEnvironment = process.env.NODE_ENV;
    const previousFlag = process.env.LPMS_ALLOW_PUBLIC_REGISTRATION;
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    process.env.NODE_ENV = 'production';
    process.env.LPMS_ALLOW_PUBLIC_REGISTRATION = '1';
    User.findOne = async () => null;
    User.create = async values => ({
        id: 17,
        ...values,
        toPublic() { return { id: this.id, name: this.name, email: this.email, role: this.role }; }
    });

    try {
        const res = responseRecorder();
        await auth.register({
            ip: '198.51.100.72',
            body: { name: 'ENABLED USER', email: 'enabled@example.test', password: 'password123', role: 'instructor', privacy_consent_version: PRIVACY_NOTICE_VERSION }
        }, res, error => { throw error; });
        assert.equal(res.record.statusCode, 201);
        assert.equal(res.record.body.user.role, 'instructor');
    } finally {
        User.findOne = originalFindOne;
        User.create = originalCreate;
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
        if (previousFlag === undefined) delete process.env.LPMS_ALLOW_PUBLIC_REGISTRATION;
        else process.env.LPMS_ALLOW_PUBLIC_REGISTRATION = previousFlag;
    }
});

test('one source cannot submit unlimited registration attempts', async () => {
    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
        const res = responseRecorder();
        await auth.register({
            ip: '::1',
            body: { name: '', email: `new-${i}@example.test`, password: 'password123', role: 'instructor' }
        }, res, error => { throw error; });
        statuses.push(res.record.statusCode);
    }
    assert.deepEqual(statuses.slice(0, 5), [400, 400, 400, 400, 400]);
    assert.equal(statuses[5], 429);
});

test('a successful password reset starts a new server session', async () => {
    const originalScope = User.scope;
    const rawToken = 'reset-token-for-test';
    const user = {
        id: 10,
        name: 'RESET, USER',
        email: 'reset.user@example.test',
        role: 'instructor',
        is_active: true,
        reset_token_hash: hashToken(rawToken),
        reset_expires_at: new Date(Date.now() + 60_000),
        password_hash: await hashPassword('oldpassword1'),
        toPublic() { return { id: this.id, name: this.name, email: this.email, role: this.role }; },
        async save() {}
    };
    User.scope = () => ({ findOne: async () => user });
    const oldToken = issueSession(user);

    try {
        const res = responseRecorder();
        await auth.resetPassword({
            body: { email: user.email, token: rawToken, password: 'newpassword1' }
        }, res, error => { throw error; });

        assert.equal(res.record.statusCode, 200);
        assert.equal(res.record.cookies[0]?.name, 'lpms_session');
        assert.equal(res.record.cookies[0]?.options.httpOnly, true);

        const oldSessionResponse = responseRecorder();
        const checkOldSession = createRequireAuth({ findUserById: async () => user });
        await checkOldSession(
            { headers: { cookie: `${COOKIE_NAME}=${oldToken}` } },
            oldSessionResponse,
            () => assert.fail('the pre-reset session remained usable')
        );
        assert.equal(oldSessionResponse.record.statusCode, 401);
    } finally {
        User.scope = originalScope;
    }
});

test('password reset fails closed when no protected delivery channel is configured', async () => {
    const originalFindOne = User.findOne;
    const originalFlag = process.env.LPMS_EXPOSE_RESET_TOKEN;
    const user = { is_active: true, reset_token_hash: null, reset_expires_at: null, async save() { throw new Error('must not mint an undeliverable token'); } };
    User.findOne = async () => user;
    delete process.env.LPMS_EXPOSE_RESET_TOKEN;

    try {
        const res = responseRecorder();
        await auth.requestReset({ body: { email: 'reset.user@example.test' } }, res, error => { throw error; });

        assert.equal(res.record.statusCode, 200);
        assert.match(res.record.body.message, /delivery is not configured/i);
        assert.equal('devToken' in res.record.body, false);
        assert.equal(user.reset_token_hash, null);
    } finally {
        User.findOne = originalFindOne;
        if (originalFlag === undefined) delete process.env.LPMS_EXPOSE_RESET_TOKEN;
        else process.env.LPMS_EXPOSE_RESET_TOKEN = originalFlag;
    }
});

test('explicit local demo reset returns the token without writing it to logs', async () => {
    const originalFindOne = User.findOne;
    const originalFlag = process.env.LPMS_EXPOSE_RESET_TOKEN;
    const originalLog = console.log;
    const logs = [];
    const user = { email: 'reset.user@example.test', is_active: true, reset_token_hash: null, reset_expires_at: null, async save() {} };
    User.findOne = async () => user;
    process.env.LPMS_EXPOSE_RESET_TOKEN = '1';
    console.log = (...parts) => logs.push(parts.join(' '));

    try {
        const res = responseRecorder();
        await auth.requestReset({ ip: '127.0.0.1', body: { email: user.email } }, res, error => { throw error; });

        assert.equal(typeof res.record.body.devToken, 'string');
        assert.ok(res.record.body.devToken.length >= 32);
        assert.equal(logs.some(line => line.includes(res.record.body.devToken)), false);
        assert.equal(logs.some(line => line.includes('/reset-password?token=')), false);
    } finally {
        User.findOne = originalFindOne;
        console.log = originalLog;
        if (originalFlag === undefined) delete process.env.LPMS_EXPOSE_RESET_TOKEN;
        else process.env.LPMS_EXPOSE_RESET_TOKEN = originalFlag;
    }
});

test('failed guesses from one source cannot lock the real user out from another source', async () => {
    const originalCount = User.count;
    const originalScope = User.scope;
    const passwordHash = await hashPassword('correct123');
    const user = {
        id: 15,
        name: 'TARGET, USER',
        email: 'lockout-target@example.test',
        role: 'instructor',
        is_active: true,
        password_hash: passwordHash,
        toPublic() { return { id: this.id, name: this.name, email: this.email, role: this.role }; },
        async save() {}
    };
    User.count = async () => 1;
    User.scope = () => ({ findOne: async () => user });

    try {
        for (let i = 0; i < 5; i += 1) {
            const rejected = responseRecorder();
            await auth.login({
                ip: '203.0.113.10',
                body: { email: user.email, password: `wrong-${i}`, role: 'instructor' }
            }, rejected, error => { throw error; });
            assert.equal(rejected.record.statusCode, 401);
        }

        const legitimate = responseRecorder();
        await auth.login({
            ip: '203.0.113.11',
            body: { email: user.email, password: 'correct123', role: 'instructor' }
        }, legitimate, error => { throw error; });
        assert.equal(legitimate.record.statusCode, 200);
    } finally {
        User.count = originalCount;
        User.scope = originalScope;
    }
});

test('one source cannot force unlimited password hashing with unique emails', async () => {
    const originalCount = User.count;
    const originalScope = User.scope;
    User.count = async () => 1;
    User.scope = () => ({ findOne: async () => null });

    try {
        let finalStatus = 0;
        for (let i = 0; i < 31; i += 1) {
            const res = responseRecorder();
            await auth.login({
                ip: '198.51.100.20',
                body: { email: `unknown-${i}@example.test`, password: 'wrong-password', role: 'instructor' }
            }, res, error => { throw error; });
            finalStatus = res.record.statusCode;
        }
        assert.equal(finalStatus, 429);
    } finally {
        User.count = originalCount;
        User.scope = originalScope;
    }
});
