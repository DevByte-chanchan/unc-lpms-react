'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { _internals } = require('../controllers/assignmentController');
const { CourseOfferingAssignment } = require('../models');

const decision = (logs, actorRole, actionType) =>
    _internals?.validateWorkflowTransition?.(logs, actorRole, actionType);
const log = (actor_role, action_type) => ({ actor_role, action_type });

test('workflow actions are checked by a server-side transition policy', () => {
    assert.equal(typeof _internals?.validateWorkflowTransition, 'function');
});

test('reviewers cannot approve an assignment before the instructor submits it', () => {
    assert.equal(decision([], 'PROGRAM_HEAD', 'ACCEPTED').allowed, false);
    assert.equal(decision([], 'DEAN', 'ACCEPTED').allowed, false);
    assert.equal(decision([], 'INSTRUCTOR', 'SUBMITTED').allowed, true);
});

test('the dean can act only after BOTH the library director and the program head accept', () => {
    const submitted = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED')];
    assert.equal(decision(submitted, 'DEAN', 'ACCEPTED').allowed, false);
    assert.equal(decision([...submitted, log('LIBRARY_DIRECTOR', 'ACCEPTED')], 'DEAN', 'ACCEPTED').allowed, true);
});

test('the industry consultant is not part of the chain: no accept, no return, and the dean never waits for them', () => {
    const submitted = [log('INSTRUCTOR', 'SUBMITTED')];
    assert.equal(decision(submitted, 'INDUSTRY_CONSULTANT', 'ACCEPTED').allowed, false);
    assert.equal(decision(submitted, 'INDUSTRY_CONSULTANT', 'RETURNED').allowed, false);
    const both = [...submitted, log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED')];
    assert.equal(decision(both, 'DEAN', 'ACCEPTED').allowed, true);
});

test('one reviewer cannot record duplicate decisions on the same submission', () => {
    const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED')];
    assert.equal(decision(logs, 'PROGRAM_HEAD', 'ACCEPTED').allowed, false);
    assert.equal(decision(logs, 'PROGRAM_HEAD', 'RETURNED').allowed, false);
});

test('a return lets the other pending reviewer respond, blocks the dean and lets the instructor resubmit', () => {
    const returned = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'RETURNED')];
    assert.equal(decision(returned, 'DEAN', 'ACCEPTED').allowed, false);
    assert.equal(decision(returned, 'INSTRUCTOR', 'SUBMITTED').allowed, true);
    assert.equal(decision(returned, 'LIBRARY_DIRECTOR', 'ACCEPTED').allowed, false, 'the returner waits for the instructor');
});

test('after a resubmit only the reviewer who returned it reviews again; the other acceptance still counts', () => {
    const resubmitted = [
        log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'RETURNED'),
        log('INSTRUCTOR', 'SUBMITTED')
    ];
    assert.equal(decision(resubmitted, 'LIBRARY_DIRECTOR', 'ACCEPTED').allowed, true);
    assert.equal(decision(resubmitted, 'PROGRAM_HEAD', 'ACCEPTED').allowed, false, 'already accepted; not asked again');
    assert.equal(decision(resubmitted, 'DEAN', 'ACCEPTED').allowed, false, 'the returner has not re-accepted yet');
    assert.equal(decision([...resubmitted, log('LIBRARY_DIRECTOR', 'ACCEPTED')], 'DEAN', 'ACCEPTED').allowed, true);
});

test('if the dean returned it, it goes back to the dean only', () => {
    const afterDean = [
        log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED'),
        log('DEAN', 'RETURNED'), log('INSTRUCTOR', 'SUBMITTED')
    ];
    assert.equal(decision(afterDean, 'PROGRAM_HEAD', 'ACCEPTED').allowed, false);
    assert.equal(decision(afterDean, 'LIBRARY_DIRECTOR', 'ACCEPTED').allowed, false);
    assert.equal(decision(afterDean, 'DEAN', 'ACCEPTED').allowed, true);
});

test('a final dean approval closes the workflow', () => {
    const approved = [
        log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED'), log('DEAN', 'ACCEPTED')
    ];
    assert.equal(decision(approved, 'INSTRUCTOR', 'SUBMITTED').allowed, false);
    assert.equal(decision(approved, 'DEAN', 'RETURNED').allowed, false);
});

test('simultaneous actions for one assignment are serialized before transition checks', async () => {
    assert.equal(typeof _internals?.withWorkflowLock, 'function');
    let active = 0;
    let maximumActive = 0;
    const task = () => _internals.withWorkflowLock(77, async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise(resolve => setTimeout(resolve, 15));
        active -= 1;
    });
    await Promise.all([task(), task(), task()]);
    assert.equal(maximumActive, 1);
});

test('one offering resolves to exactly one workflow assignment', () => {
    assert.equal(CourseOfferingAssignment.rawAttributes.pc_offering_id.unique, true);
});
