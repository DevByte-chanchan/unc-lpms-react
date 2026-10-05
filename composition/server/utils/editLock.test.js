'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planEditState } = require('./editLock');

const log = (actor_role, action_type) => ({ actor_role, action_type });
const state = logs => planEditState(logs);

test('no logs and assigned-only plans are editable drafts', () => {
    assert.deepEqual(state([]), { state: 'Draft', editable: true });
    assert.deepEqual(state([log('PROGRAM_HEAD', 'ASSIGNED')]), { state: 'Draft', editable: true });
});

test('a submitted plan is locked while reviewers decide', () => {
    const submitted = [log('INSTRUCTOR', 'SUBMITTED')];
    assert.deepEqual(state(submitted), { state: 'Pending', editable: false });
    assert.equal(state([...submitted, log('PROGRAM_HEAD', 'ACCEPTED')]).editable, false);
});

test('any return reopens editing, even if the other reviewer accepted', () => {
    const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'RETURNED')];
    assert.deepEqual(state(logs), { state: 'Returned', editable: true });
});

test('resubmitting after a return locks the plan again', () => {
    const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'RETURNED'), log('INSTRUCTOR', 'SUBMITTED')];
    assert.deepEqual(state(logs), { state: 'Pending', editable: false });
});

test('a Dean acceptance is final and locks the plan', () => {
    const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('DEAN', 'ACCEPTED')];
    assert.deepEqual(state(logs), { state: 'Approved', editable: false });
});

test('legacy returned rows with no submission log are still editable', () => {
    assert.deepEqual(state([log('LIBRARY_DIRECTOR', 'RETURNED')]), { state: 'Returned', editable: true });
});

test('old industry consultant entries do not change a plan\'s state', () => {
    assert.deepEqual(state([log('INSTRUCTOR', 'SUBMITTED'), log('INDUSTRY_CONSULTANT', 'RETURNED')]), { state: 'Pending', editable: false });
});
