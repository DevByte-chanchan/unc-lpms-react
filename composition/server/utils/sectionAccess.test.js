'use strict';

// Each approver sees, reads and comments on only the part of a plan assigned to their role
// (config/sectionAccess.js). Runs against the test database (node run-tests.js); the section guard
// sits before the course check, so a refused request never reaches the database.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
    SECTIONS, allowedSections, canViewSection, canViewComment, sectionOfComment
} = require('../config/sectionAccess');
const { requireSection, requireFullPlanAccess } = require('../middleware/sectionAccess');

const ROLES = ['instructor', 'program-head', 'director-of-libraries', 'industry-consultant', 'dean', 'vpaa'];

test('the Director of Libraries sees only the references, the Consultant the content and coverage', () => {
    assert.deepEqual(allowedSections('director-of-libraries'), ['references']);
    assert.deepEqual(allowedSections('industry-consultant'), ['details', 'alignment', 'coverage']);
});

test('every other role, and an unknown one, may see every section', () => {
    for (const role of ['program-head', 'dean', 'instructor', 'vpaa', 'superuser', 'nobody']) {
        assert.deepEqual(allowedSections(role), Object.keys(SECTIONS));
    }
    for (const role of ['__proto__', 'constructor', 'toString']) {
        assert.deepEqual(allowedSections(role), Object.keys(SECTIONS), `${role} is not a restricted role`);
    }
});

test('the allowed list is a copy: changing it cannot widen a role', () => {
    allowedSections('director-of-libraries').push('criteria');
    assert.equal(canViewSection('director-of-libraries', 'criteria'), false);
});

test('a comment belongs to the part it is about', () => {
    assert.equal(sectionOfComment({ comment_for: 'references' }), 'references');
    for (const comment_for of ['topics', 'tlas', null, undefined]) {
        assert.equal(sectionOfComment({ comment_for }), 'coverage');
    }
    assert.equal(canViewComment('director-of-libraries', { comment_for: 'references' }), true);
    assert.equal(canViewComment('director-of-libraries', { comment_for: 'topics' }), false);
    assert.equal(canViewComment('industry-consultant', { comment_for: 'references' }), false);
    assert.equal(canViewComment('industry-consultant', { comment_for: 'tlas' }), true);
    assert.equal(canViewComment('program-head', { comment_for: 'references' }), true);
});

const run = (middleware, user) => {
    const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let passed = false;
    middleware({ user }, res, () => { passed = true; });
    return { passed, res };
};

test('requireSection lets a role through when it may see any listed section, and refuses otherwise', () => {
    assert.equal(run(requireSection('references'), { role: 'director-of-libraries' }).passed, true);
    const refused = run(requireSection('coverage'), { role: 'director-of-libraries' });
    assert.equal(refused.passed, false);
    assert.equal(refused.res.statusCode, 403);
    assert.equal(refused.res.body.code, 'SECTION_RESTRICTED');
    assert.equal(run(requireSection('criteria', 'coverage'), { role: 'industry-consultant' }).passed, true, 'any one is enough');
    assert.equal(run(requireSection('criteria'), { role: 'industry-consultant' }).passed, false);
    assert.equal(run(requireSection('criteria'), { role: 'program-head' }).passed, true);
    assert.equal(run(requireSection('criteria'), undefined).res.statusCode, 401, 'no signed-in user');
});

test('requireFullPlanAccess refuses the two partial roles only', () => {
    for (const role of ROLES) {
        const partial = role === 'director-of-libraries' || role === 'industry-consultant';
        assert.equal(run(requireFullPlanAccess, { role }).passed, !partial, role);
    }
});

// ---- the real routers, mounted as in server.js, with a stand-in for sign-in ----

let server;
let base;
test.before(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { id: 4242, role: req.get('x-role') }; next(); });
    app.use('/api/course-details', require('../routes/courseDetails'));
    app.use('/api/course-outcome-alignment', require('../routes/courseOutcomeAlignment'));
    app.use('/api/course-coverage', require('../routes/courseCoverage'));
    app.use('/api/course-criteria', require('../routes/courseCriteria'));
    app.use('/api/ilos', require('../routes/ilos'));
    app.use('/api/ilo-references', require('../routes/iloReferences'));
    app.use('/api/topics', require('../routes/topics'));
    app.use('/api/tlas', require('../routes/tlaRoutes'));
    app.use('/api/revisions', require('../routes/revisionRoutes'));
    app.use('/api/coaep', require('../routes/coaepRoutes'));
    app.use('/api/comments', require('../routes/comments'));
    app.use('/api', require('../routes/courseReferenceRoutes'));
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = async (role, path, init = {}) => {
    const res = await fetch(base + path, { ...init, headers: { 'x-role': role, 'Content-Type': 'application/json', ...(init.headers || {}) } });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, restricted: body.code === 'SECTION_RESTRICTED' };
};

// path -> the roles that may NOT read it. Everyone else gets past the section guard.
const BOTH = ['director-of-libraries', 'industry-consultant'];
const READ_ROUTES = [
    ['/api/course-details/1', ['director-of-libraries']],
    ['/api/course-outcome-alignment/1', ['director-of-libraries']],
    ['/api/course-coverage/1', ['director-of-libraries']],
    ['/api/course-criteria/1', BOTH],
    ['/api/courses/1/references', ['industry-consultant']],
    ['/api/courses/1/2/references', ['industry-consultant']],
    ['/api/ilos/1', ['director-of-libraries']],
    ['/api/topics/available?iloId=1', ['director-of-libraries']],
    ['/api/topics/assigned/1', ['director-of-libraries']],
    ['/api/tlas/ilo/1', ['director-of-libraries']],
    ['/api/ilo-references/1', ['industry-consultant']],
    ['/api/coaep/ABC123', BOTH],
    ['/api/revisions/1', BOTH]
];

test('every read route refuses exactly the roles that do not cover its part of the plan', async () => {
    for (const [path, refusedRoles] of READ_ROUTES) {
        for (const role of ROLES) {
            const { restricted, status } = await call(role, path);
            const shouldRefuse = refusedRoles.includes(role);
            assert.equal(restricted, shouldRefuse, `${role} GET ${path} -> ${status}`);
            if (shouldRefuse) assert.equal(status, 403, `${role} GET ${path}`);
        }
    }
});

test('a partial role cannot post a comment on a part that is not theirs', async () => {
    const post = (role, commenter_role, comment_for) => call(role, '/api/comments/by-course', {
        method: 'POST',
        body: JSON.stringify({ code: 'NO-SUCH-COURSE', commenter_role, message: 'x', comment_for, co_index: 1, ilo_index: 1 })
    });
    for (const comment_for of ['topics', 'tlas', null]) {
        assert.equal((await post('director-of-libraries', 'LIBRARY_DIRECTOR', comment_for)).restricted, true, `director on ${comment_for}`);
    }
    assert.equal((await post('director-of-libraries', 'LIBRARY_DIRECTOR', 'references')).restricted, false);
    assert.equal((await post('industry-consultant', 'INDUSTRY_CONSULTANT', 'references')).restricted, true);
    for (const comment_for of ['topics', 'tlas', null]) {
        assert.equal((await post('industry-consultant', 'INDUSTRY_CONSULTANT', comment_for)).restricted, false, `consultant on ${comment_for}`);
    }
    assert.equal((await post('program-head', 'PROGRAM_HEAD', 'references')).restricted, false);
    assert.equal((await post('dean', 'DEAN', 'topics')).restricted, false);
});
