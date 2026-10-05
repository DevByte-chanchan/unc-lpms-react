'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assembleReviewRecord } = require('./reviewRecord');

const at = (day) => new Date(Date.UTC(2026, 5, day));
const log = (actor_role, action_type, day, actor_name = null) => ({ actor_role, action_type, actor_name, createdAt: at(day) });
const course = { code: 'BIT321L', title: 'Systems', term: '1st Semester', revisionNumber: 2 };

const logs = [
    log('PROGRAM_HEAD', 'ASSIGNED', 1, 'DANILA, JUNAR'),
    log('INSTRUCTOR', 'SUBMITTED', 2, 'NORTON, MONICA'),
    log('PROGRAM_HEAD', 'RETURNED', 3, 'DANILA, JUNAR'),
    log('INSTRUCTOR', 'SUBMITTED', 4, 'NORTON, MONICA'),
    log('LIBRARY_DIRECTOR', 'ACCEPTED', 5, 'SANTOS, MARIA'),
    log('PROGRAM_HEAD', 'ACCEPTED', 6, 'DANILA, JUNAR'),
    log('DEAN', 'ACCEPTED', 7, 'REYES, AGNES'),
];

test('every workflow action is listed in order with who, role, action and date', () => {
    const record = assembleReviewRecord({ course, logs });
    assert.equal(record.actions.length, logs.length);
    assert.deepEqual(record.actions.slice(2, 3).map(a => [a.name, a.roleLabel, a.action, a.date]),
        [['DANILA, JUNAR', 'Program Head', 'Returned', at(3).toISOString()]]);
});

test('final approvers are the library director, program head and dean with their dates', () => {
    const { approvers, status } = assembleReviewRecord({ course, logs });
    assert.deepEqual(approvers.map(a => [a.roleLabel, a.name, a.accepted]),
        [['Director of Libraries', 'SANTOS, MARIA', true], ['Program Head', 'DANILA, JUNAR', true], ['Dean', 'REYES, AGNES', true]]);
    assert.equal(status.approved, true);
    assert.equal(status.approvedAt, at(7).toISOString());
});

test('an approver who has not accepted yet is listed as not accepted, with no name or date', () => {
    const { approvers, status } = assembleReviewRecord({ course, logs: logs.slice(0, 5) });
    const dean = approvers.find(a => a.role === 'DEAN');
    assert.deepEqual([dean.accepted, dean.name, dean.date], [false, null, null]);
    assert.equal(status.approved, false);
    assert.equal(status.state, 'Pending');
});

test('comments carry reviewer, role, section, location, targets, date and resolved state', () => {
    const comments = [
        { comment_id: 1, commenter_role: 'PROGRAM_HEAD', commenter_name: 'DANILA, JUNAR', message: 'Add a lab topic.', createdAt: at(3), comment_for: 'topics', ilo_id: 9, resolved_status: 1, resolved_date: at(4) },
        { comment_id: 2, commenter_role: 'INDUSTRY_CONSULTANT', commenter_name: null, message: 'Consider Kubernetes.', createdAt: at(3), comment_for: 'tlas', ilo_id: 9, resolved_status: 0, resolved_date: null },
    ];
    const record = assembleReviewRecord({
        course, logs, comments,
        iloLabels: new Map([[9, 'CO2-ILO3']]),
        targetTitles: new Map([[1, ['Container Basics']]]),
    });
    assert.deepEqual(record.comments[0], {
        reviewerName: 'DANILA, JUNAR', role: 'PROGRAM_HEAD', roleLabel: 'Program Head', section: 'Topics', location: 'CO2-ILO3',
        targets: ['Container Basics'], message: 'Add a lab topic.', date: at(3).toISOString(), resolved: true,
        resolvedDate: at(4).toISOString(), documentationOnly: false,
    });
    assert.equal(record.comments[1].documentationOnly, true, 'consultant comments are documentation only');
    assert.equal(record.comments[1].reviewerName, null, 'an unknown author stays null, never guessed');
});

test('old industry consultant log entries are kept as history but marked out of the chain', () => {
    const record = assembleReviewRecord({ course, logs: [log('INSTRUCTOR', 'SUBMITTED', 1), log('INDUSTRY_CONSULTANT', 'RETURNED', 2)] });
    assert.equal(record.actions[1].inChain, false);
    assert.equal(record.status.state, 'Pending', 'and they do not change the plan state');
});
