'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    canAccessCourseRows,
    createCourseAccessMiddleware
} = require('../middleware/courseAuthorization');

const rows = [{
    pc_offering_id: 10,
    instructor_user_id: '1',
    program_head_user_id: 2,
    dean_user_id: 5
}];

test('course access is bound to the authenticated instructor assignment', () => {
    assert.equal(canAccessCourseRows({ id: 1, role: 'instructor' }, rows), true);
    assert.equal(canAccessCourseRows({ id: 99, role: 'instructor' }, rows), false);
});

test('program heads and deans are constrained by program and department ownership', () => {
    assert.equal(canAccessCourseRows({ id: 2, role: 'program-head' }, rows), true);
    assert.equal(canAccessCourseRows({ id: 3, role: 'program-head' }, rows), false);
    assert.equal(canAccessCourseRows({ id: 5, role: 'dean' }, rows), true);
    assert.equal(canAccessCourseRows({ id: 6, role: 'dean' }, rows), false);
});

test('central university reviewers retain their intended institution-wide view', () => {
    for (const role of ['director-of-libraries', 'industry-consultant', 'vpaa']) {
        assert.equal(canAccessCourseRows({ id: 500, role }, rows), true);
    }
});

test('course access middleware rejects an authenticated user outside the course scope', async () => {
    const middleware = createCourseAccessMiddleware(async () => rows);
    const req = { user: { id: 99, role: 'instructor' } };
    const res = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    let passed = false;

    await middleware(req, res, () => { passed = true; });

    assert.equal(passed, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: 'You do not have access to this course.' });
});

test('course access middleware passes the resolved course context to authorized handlers', async () => {
    const middleware = createCourseAccessMiddleware(async () => rows);
    const req = { user: { id: 1, role: 'instructor' } };
    const res = { status() { return this; }, json() { return this; } };
    let passed = false;

    await middleware(req, res, () => { passed = true; });

    assert.equal(passed, true);
    assert.equal(req.courseAccess.pc_offering_id, 10);
});
