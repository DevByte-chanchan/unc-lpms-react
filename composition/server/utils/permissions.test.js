'use strict';

// The fixed role-to-permission matrix (config/permissions.js): every role gets exactly its list,
// nothing else gets anything, and a role name that is also an Object member is just an unknown role.
const test = require('node:test');
const assert = require('node:assert/strict');
const { PERMISSIONS, ROLE_PERMISSIONS, permissionsOf, hasPermission } = require('../config/permissions');

const ALL = Object.keys(PERMISSIONS);

test('every role gets exactly its own list, and hasPermission agrees with it', () => {
    for (const [role, list] of Object.entries(ROLE_PERMISSIONS)) {
        assert.deepEqual(permissionsOf(role), list, role);
        for (const permission of ALL) {
            assert.equal(hasPermission(role, permission), list.includes(permission), `${role} ${permission}`);
        }
    }
});

test('every permission a role holds is defined, and no role lists one twice', () => {
    for (const [role, list] of Object.entries(ROLE_PERMISSIONS)) {
        for (const permission of list) assert.ok(ALL.includes(permission), `${role} holds unknown ${permission}`);
        assert.equal(new Set(list).size, list.length, `${role} lists a permission twice`);
    }
});

test('an unknown role has no permissions, including names that are members of Object', () => {
    for (const role of ['nobody', '', 'SUPERUSER', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', undefined, null, 7]) {
        assert.deepEqual(permissionsOf(role), [], String(role));
        for (const permission of ALL) assert.equal(hasPermission(role, permission), false, `${String(role)} ${permission}`);
    }
});

test('the approvers hold the permissions their part of the chain needs, and nothing more', () => {
    assert.deepEqual([...permissionsOf('industry-consultant')], ['plan:comment'], 'the consultant only comments');
    assert.deepEqual([...permissionsOf('vpaa')], ['plan:view-approved'], 'the VPAA only reads approved plans');
    for (const role of ['program-head', 'director-of-libraries', 'dean']) {
        assert.equal(hasPermission(role, 'plan:review'), true, `${role} reviews`);
        assert.equal(hasPermission(role, 'plan:comment'), true, `${role} comments`);
        assert.equal(hasPermission(role, 'plan:edit'), false, `${role} does not edit a plan`);
    }
    assert.equal(hasPermission('director-of-libraries', 'reference:manage'), true);
    assert.equal(hasPermission('dean', 'form-settings:edit'), true);
    assert.equal(hasPermission('instructor', 'plan:review'), false, 'the instructor does not review');
});

test('only the superuser manages users and reads the audit trail', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
        assert.equal(hasPermission(role, 'users:manage'), role === 'superuser', role);
        assert.equal(hasPermission(role, 'audit:read'), role === 'superuser', role);
    }
});

test('the matrix cannot be changed at run time', () => {
    assert.ok(Object.isFrozen(PERMISSIONS) && Object.isFrozen(ROLE_PERMISSIONS));
    assert.throws(() => { 'use strict'; ROLE_PERMISSIONS.instructor.push('users:manage'); }, TypeError);
});
