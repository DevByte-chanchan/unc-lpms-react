'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const assignmentRoutes = require('../routes/assignments');
const authRoutes = require('../routes/auth');
const commentRoutes = require('../routes/comments');
const exportRoutes = require('../routes/exportPdf');
const iloRoutes = require('../routes/ilos');
const courseDetailsRoutes = require('../routes/courseDetails');
const courseCriteriaRoutes = require('../routes/courseCriteria');
const courseCoverageRoutes = require('../routes/courseCoverage');
const courseOutcomeAlignmentRoutes = require('../routes/courseOutcomeAlignment');
const revisionRoutes = require('../routes/revisionRoutes');
const courseReferenceRoutes = require('../routes/courseReferenceRoutes');
const coaepRoutes = require('../routes/coaepRoutes');
const { issueSession, requireAuth, requireRole, revokeSession } = require('../middleware/auth');
const db = require('../models');

const activeTestUsers = new Map();
const originalFindUserByPk = db.User.findByPk;
test.before(() => {
    db.User.findByPk = async id => activeTestUsers.get(String(id)) || null;
});
test.after(() => {
    db.User.findByPk = originalFindUserByPk;
});
const issueActiveSession = user => {
    const id = user.user_id ?? user.id;
    activeTestUsers.set(String(id), { ...user, user_id: id, is_active: true });
    return issueSession(user);
};

const freePort = () => new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
        const port = probe.address().port;
        probe.close(error => error ? reject(error) : resolve(port));
    });
});

const startApplicationServer = async () => {
    const port = await freePort();
    const child = spawn(process.execPath, ['server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('server startup timed out')), 10000);
        const onData = chunk => {
            if (!String(chunk).includes('Server listening')) return;
            clearTimeout(timer);
            child.stdout.off('data', onData);
            resolve();
        };
        child.once('error', reject);
        child.once('exit', code => reject(new Error(`server exited during startup (${code})`)));
        child.stdout.on('data', onData);
    });

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise(resolve => {
            child.once('exit', resolve);
            child.kill();
        })
    };
};

const start = async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api', requireAuth);
    app.use('/api/assignments', assignmentRoutes);
    app.use('/api/comments', commentRoutes);
    app.use('/api/ilos', iloRoutes);
    app.use('/api', exportRoutes);

    const server = await new Promise((resolve) => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });

    return {
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
    };
};

const startCourseReadServer = async (user) => {
    const app = express();
    app.use((req, _res, next) => { req.user = user; next(); });
    app.use('/api/course-details', courseDetailsRoutes);
    app.use('/api/course-criteria', courseCriteriaRoutes);
    app.use('/api/course-coverage', courseCoverageRoutes);
    app.use('/api/course-outcome-alignment', courseOutcomeAlignmentRoutes);
    app.use('/api/revisions', revisionRoutes);
    app.use('/api/coaep', coaepRoutes);
    app.use('/api', courseReferenceRoutes);

    const server = await new Promise(resolve => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    return {
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
    };
};

test('an unauthenticated caller cannot reach a workflow mutation', async () => {
    const server = await start();
    try {
        const response = await fetch(`${server.baseUrl}/api/assignments/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED' })
        });

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'Authentication required.' });
    } finally {
        await server.close();
    }
});

test('a server-issued session reaches the protected route', async () => {
    const server = await start();
    try {
        const token = issueActiveSession({ id: 7, name: 'NORTON, MONICA', role: 'instructor' });
        const response = await fetch(`${server.baseUrl}/api/assignments/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `lpms_session=${token}`
            },
            body: JSON.stringify({ actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED' })
        });

        assert.equal(response.status, 400);
        assert.match((await response.json()).error, /pcId/);
    } finally {
        await server.close();
    }
});

test('the current-session endpoint rejects a missing cookie', async () => {
    const server = await start();
    try {
        const response = await fetch(`${server.baseUrl}/api/auth/session`);

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'Authentication required.' });
    } finally {
        await server.close();
    }
});

test('the current-session endpoint returns the identity behind the cookie', async () => {
    const server = await start();
    try {
        const user = {
            id: 19,
            name: 'CRUZ, ROBERTO',
            email: 'roberto.cruz@unc.edu.ph',
            role: 'industry-consultant'
        };
        const token = issueActiveSession(user);
        const response = await fetch(`${server.baseUrl}/api/auth/session`, {
            headers: { Cookie: `lpms_session=${token}` }
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { user });
    } finally {
        await server.close();
    }
});

test('revoking a session makes the same cookie unusable', async () => {
    const token = issueActiveSession({ id: 11, name: 'SIGNED, OUT', role: 'instructor' });
    const request = { headers: { cookie: `lpms_session=${token}` } };
    const first = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() { return this; } };
    let passed = false;
    await requireAuth(request, first, () => { passed = true; });
    assert.equal(passed, true);

    revokeSession(token);

    const second = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await requireAuth({ headers: { cookie: `lpms_session=${token}` } }, second, () => assert.fail('revoked session passed'));
    assert.equal(second.statusCode, 401);
    assert.deepEqual(second.body, { error: 'Authentication required.' });
});

test('role middleware rejects an authenticated user outside the allowed roles', async () => {
    const token = issueActiveSession({ id: 13, name: 'WRONG, ROLE', role: 'program-head' });
    const req = { headers: { cookie: `lpms_session=${token}` } };
    const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };

    await requireAuth(req, res, () => {
        requireRole('instructor')(req, res, () => assert.fail('wrong role reached the handler'));
    });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: 'You do not have permission to perform this action.' });
});

test('the logout endpoint revokes the current cookie and clears it in the browser', async () => {
    const server = await start();
    try {
        const token = issueActiveSession({ id: 12, name: 'LOGOUT, USER', role: 'instructor' });
        const cookie = `lpms_session=${token}`;
        const logout = await fetch(`${server.baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { Cookie: cookie }
        });

        assert.equal(logout.status, 200);
        assert.match(logout.headers.get('set-cookie') || '', /^lpms_session=;/);

        const replay = await fetch(`${server.baseUrl}/api/assignments/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED' })
        });
        assert.equal(replay.status, 401);
    } finally {
        await server.close();
    }
});

test('a caller cannot forge another approver role in a workflow action', async () => {
    const server = await start();
    try {
        const token = issueActiveSession({ id: 8, name: 'DANILA, JUNAR', role: 'program-head' });
        const response = await fetch(`${server.baseUrl}/api/assignments/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `lpms_session=${token}`
            },
            body: JSON.stringify({ actor_role: 'DEAN', action_type: 'ACCEPTED' })
        });

        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { error: 'Your account cannot perform this workflow action.' });
    } finally {
        await server.close();
    }
});

test('workflow mutations require an unambiguous offering id instead of a course-code fallback', async () => {
    const server = await start();
    try {
        const token = issueActiveSession({ id: 7, name: 'NORTON, MONICA', role: 'instructor' });
        const response = await fetch(`${server.baseUrl}/api/assignments/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: `lpms_session=${token}` },
            body: JSON.stringify({ actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', code: 'BIT321L' })
        });
        assert.equal(response.status, 400);
        assert.match((await response.json()).error, /pcId/);
    } finally {
        await server.close();
    }
});

test('an instructor cannot act on or read another instructor course', async () => {
    const server = await start();
    try {
        const token = issueActiveSession({ id: 999, name: 'OTHER, INSTRUCTOR', role: 'instructor' });
        const headers = { 'Content-Type': 'application/json', Cookie: `lpms_session=${token}` };
        const action = await fetch(`${server.baseUrl}/api/assignments/action`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', pcId: 9 })
        });
        const ilos = await fetch(`${server.baseUrl}/api/ilos/9/1`, { headers });

        assert.equal(action.status, 403);
        assert.deepEqual(await action.json(), { error: 'You do not have access to this course.' });
        assert.equal(ilos.status, 403);
        assert.deepEqual(await ilos.json(), { error: 'You do not have access to this course.' });
    } finally {
        await server.close();
    }
});

test('all course-scoped read endpoints reject a foreign instructor', async () => {
    const [course] = await db.sequelize.query(
        `SELECT c.course_no
         FROM ProgramCourseOfferings pco
         INNER JOIN Courses c ON c.course_id = pco.course_id
         WHERE pco.pc_offering_id = 9`,
        { type: db.Sequelize.QueryTypes.SELECT }
    );
    assert.ok(course?.course_no, 'the sample database must contain offering 9');

    const server = await startCourseReadServer({ id: 999, role: 'instructor' });
    try {
        const paths = [
            '/api/course-details/9/1',
            '/api/course-criteria/9/1',
            '/api/course-coverage/9/1',
            '/api/course-outcome-alignment/9/1',
            '/api/revisions/9',
            '/api/courses/9/1/references',
            `/api/coaep/${encodeURIComponent(course.course_no)}`
        ];
        for (const path of paths) {
            const response = await fetch(`${server.baseUrl}${path}`);
            assert.equal(response.status, 403, `${path} must reject a foreign instructor`);
            assert.deepEqual(await response.json(), { error: 'You do not have access to this course.' });
        }
    } finally {
        await server.close();
    }
});

test('a reviewer cannot forge another role when creating a comment', async () => {
    const server = await start();
    try {
        const token = issueActiveSession({ id: 14, name: 'DANILA, JUNAR', role: 'program-head' });
        const response = await fetch(`${server.baseUrl}/api/comments/by-course`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: `lpms_session=${token}` },
            body: JSON.stringify({ commenter_role: 'DEAN', message: 'forged' })
        });

        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { error: 'Comment attribution must match the signed-in account.' });
    } finally {
        await server.close();
    }
});

test('an instructor cannot resolve a comment from another instructor assignment', async () => {
    const server = await start();
    try {
        const [comment] = await db.sequelize.query(
            'SELECT comment_id FROM Comments ORDER BY comment_id ASC LIMIT 1',
            { type: db.Sequelize.QueryTypes.SELECT }
        );
        assert.ok(comment, 'the sample database must contain a comment for this access test');

        const token = issueActiveSession({ id: 999, name: 'OTHER, INSTRUCTOR', role: 'instructor' });
        const response = await fetch(`${server.baseUrl}/api/comments/update-resolution`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `lpms_session=${token}`
            },
            body: JSON.stringify({ updates: [{ comment_id: comment.comment_id, resolved_status: true }] })
        });

        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { error: 'You do not have access to this course.' });
    } finally {
        await server.close();
    }
});

test('server-side browser PDF rendering is disabled instead of processing caller HTML', async () => {
    const server = await start();
    try {
        const token = issueActiveSession({ id: 16, name: 'EXPORT, USER', role: 'instructor' });
        const response = await fetch(`${server.baseUrl}/api/export-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: `lpms_session=${token}` },
            body: JSON.stringify({})
        });

        assert.equal(response.status, 501);
        assert.deepEqual(await response.json(), {
            error: 'Server PDF rendering is disabled. Use the browser PDF export.'
        });
    } finally {
        await server.close();
    }
});

test('the application server protects every non-auth API group', async () => {
    const server = await startApplicationServer();
    try {
        const response = await fetch(`${server.baseUrl}/api/references`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'Authentication required.' });
    } finally {
        await server.close();
    }
});

test('CORS allows the local SPA with credentials and does not trust arbitrary origins', async () => {
    const server = await startApplicationServer();
    try {
        const trusted = await fetch(`${server.baseUrl}/api/auth/health`, {
            headers: { Origin: 'http://localhost:5173' }
        });
        assert.equal(trusted.headers.get('access-control-allow-origin'), 'http://localhost:5173');
        assert.equal(trusted.headers.get('access-control-allow-credentials'), 'true');

        const untrusted = await fetch(`${server.baseUrl}/api/auth/health`, {
            headers: { Origin: 'https://evil.example' }
        });
        assert.equal(untrusted.headers.get('access-control-allow-origin'), null);
    } finally {
        await server.close();
    }
});

test('the authentication API does not publish an account email directory', async () => {
    const server = await startApplicationServer();
    try {
        const response = await fetch(`${server.baseUrl}/api/auth/accounts`);
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'Authentication required.' });
    } finally {
        await server.close();
    }
});
