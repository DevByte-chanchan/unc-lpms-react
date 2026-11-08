'use strict';

// Each approver sees only the comments they wrote (and, for the two partial roles, only those about
// their part of the plan), except the Dean; the Dean, the instructor and the VPAA see them all. See utils/commentVisibility.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const { COMMENT_ROLE_BY_ACCOUNT, isApprover, isOwnComment, canSeeComment, canSeeRecordComment, filterComments, withoutHeldDeanComments } = require('./commentVisibility');

const user = (id, role) => ({ id, role });
const comment = (id, commenter_role, commenter_user_id, comment_for = 'topics') => ({ comment_id: id, commenter_role, commenter_user_id, comment_for });

const comments = [
    comment(1, 'PROGRAM_HEAD', 2, 'topics'),
    comment(2, 'PROGRAM_HEAD', 22, 'topics'),          // another Program Head
    comment(3, 'DEAN', 5, 'tlas'),
    comment(4, 'LIBRARY_DIRECTOR', 3, 'references'),
    comment(5, 'INDUSTRY_CONSULTANT', 4, null),
    comment(6, 'INDUSTRY_CONSULTANT', 4, 'references'), // a consultant comment outside the consultant's part
    comment(7, 'PROGRAM_HEAD', null, 'references')      // an old row that only kept the role
];
const idsFor = (u) => filterComments(u, comments).map(c => c.comment_id);

test('a Program Head sees their own comments, an untraceable one of their role, and the Dean’s', () => {
    // The Dean's comments reach the Program Head, who forwards a Dean return (or sends it back).
    assert.deepEqual(idsFor(user(2, 'program-head')), [1, 3, 7]);
    assert.deepEqual(idsFor(user(22, 'program-head')), [2, 3, 7]);
});

test('the Dean sees every approver comment, to decide with all of them in view', () => {
    assert.deepEqual(idsFor(user(5, 'dean')), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(idsFor(user(55, 'dean')), [1, 2, 3, 4, 5, 6, 7], 'any Dean, not only the author of one');
});

test('the Director of Libraries sees only their own comments on the references', () => {
    assert.deepEqual(idsFor(user(3, 'director-of-libraries')), [4]);
});

test('the Industry Consultant sees only their own content and coverage comments', () => {
    assert.deepEqual(idsFor(user(4, 'industry-consultant')), [5], 'comment 6 is on references, which is not their part');
});

test('the instructor and the VPAA see every comment', () => {
    assert.deepEqual(idsFor(user(1, 'instructor')), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(idsFor(user(9, 'vpaa')), [1, 2, 3, 4, 5, 6, 7]);
});

test('an account id on the comment decides, even when the role matches', () => {
    assert.equal(isOwnComment(user(2, 'program-head'), comment(1, 'PROGRAM_HEAD', 22)), false);
    assert.equal(isOwnComment(user('2', 'program-head'), comment(1, 'PROGRAM_HEAD', 2)), true, 'ids compare as text');
    assert.equal(isOwnComment(user(2, 'program-head'), comment(1, 'DEAN', null)), false, 'another role is never theirs');
});

test('no user, an unknown role, or an Object member name sees nothing it should not', () => {
    assert.equal(canSeeComment(undefined, comments[0]), false);
    assert.equal(isOwnComment(undefined, comments[0]), false);
    assert.equal(isApprover('__proto__'), false);
    assert.equal(isApprover('constructor'), false);
    assert.deepEqual(COMMENT_ROLE_BY_ACCOUNT['industry-consultant'], 'INDUSTRY_CONSULTANT');
    assert.equal(isOwnComment(user(2, '__proto__'), comment(1, 'PROGRAM_HEAD', null)), false);
});

test('filtering never changes the list it is given', () => {
    const before = comments.map(c => c.comment_id);
    filterComments(user(2, 'program-head'), comments);
    assert.deepEqual(comments.map(c => c.comment_id), before);
});

const recordIds = (u, approved) => comments.filter(c => canSeeRecordComment(u, c, { approved })).map(c => c.comment_id);

test('the review record under review follows the same own-comments rule', () => {
    assert.deepEqual(recordIds(user(2, 'program-head'), false), [1, 7]);
    assert.deepEqual(recordIds(user(1, 'instructor'), false), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(recordIds(user(9, 'vpaa'), false), [1, 2, 3, 4, 5, 6, 7]);
});

test('once the plan is approved, an approver gets the whole record of the part they cover', () => {
    assert.deepEqual(recordIds(user(2, 'program-head'), true), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(recordIds(user(5, 'dean'), true), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(recordIds(user(3, 'director-of-libraries'), true), [4, 6, 7], 'only the references');
    assert.deepEqual(recordIds(user(4, 'industry-consultant'), true), [1, 2, 3, 5], 'only content and coverage');
});

test('no user sees any record comment', () => {
    assert.equal(canSeeRecordComment(undefined, comments[0], { approved: true }), false);
});

test('the Dean reads the whole review record while the plan is under review', () => {
    assert.deepEqual(recordIds(user(5, 'dean'), false), [1, 2, 3, 4, 5, 6, 7]);
});

test('while a Dean return is with the Program Head, the instructor does not see the new Dean comments', () => {
    const rows = [
        { commenter_role: 'DEAN', createdAt: '2026-11-01T00:00:00Z', comment_id: 'old' },
        { commenter_role: 'DEAN', createdAt: '2026-11-05T00:00:00Z', comment_id: 'new' },
        { commenter_role: 'PROGRAM_HEAD', createdAt: '2026-11-05T00:00:00Z', comment_id: 'ph' }
    ];
    const held = { withProgramHead: true };
    const ids = (u, state, forwardAt) => withoutHeldDeanComments(u, rows, state, forwardAt).map(r => r.comment_id);
    assert.deepEqual(ids(user(1, 'instructor'), held, '2026-11-02T00:00:00Z'), ['old', 'ph'], 'the earlier, already forwarded Dean comment stays');
    assert.deepEqual(ids(user(1, 'instructor'), held, null), ['ph']);
    assert.deepEqual(ids(user(1, 'instructor'), { withProgramHead: false }, null), ['old', 'new', 'ph'], 'once forwarded, all of them');
    assert.deepEqual(ids(user(2, 'program-head'), held, null), ['old', 'new', 'ph'], 'nobody else is affected');
});
