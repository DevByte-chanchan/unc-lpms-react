'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { canAccessCourseRows } = require('../middleware/courseAuthorization');

const row = approved_at => ({
    pc_offering_id: 10,
    approved_at,
    instructor_user_id: '1',
    program_head_user_id: 2,
    dean_user_id: 5,
    consultant_user_ids: '4'
});

test('vpaa reads an approved plan', () => {
    assert.equal(canAccessCourseRows({ id: 500, role: 'vpaa' }, [row('2026-01-01T00:00:00.000Z')]), true);
});

test('vpaa cannot read a draft or returned plan', () => {
    assert.equal(canAccessCourseRows({ id: 500, role: 'vpaa' }, [row(null)]), false);
    assert.equal(canAccessCourseRows({ id: 500, role: 'vpaa' }, [row(undefined)]), false);
});

test('vpaa reads the carry-over of an approved plan into a new term', () => {
    const carried = { ...row(null), carried_from_offering_id: 14 };
    assert.equal(canAccessCourseRows({ id: 500, role: 'vpaa' }, [carried]), true);
    assert.equal(canAccessCourseRows({ id: 500, role: 'vpaa' }, [{ ...row(null), carried_from_offering_id: null }]), false);
});

test('director of libraries stays global, approved or not', () => {
    assert.equal(canAccessCourseRows({ id: 501, role: 'director-of-libraries' }, [row(null)]), true);
    assert.equal(canAccessCourseRows({ id: 501, role: 'director-of-libraries' }, [row('2026-01-01')]), true);
});

test('other roles are unchanged by approval state', () => {
    for (const approved of [null, '2026-01-01']) {
        assert.equal(canAccessCourseRows({ id: 1, role: 'instructor' }, [row(approved)]), true);
        assert.equal(canAccessCourseRows({ id: 99, role: 'instructor' }, [row(approved)]), false);
        assert.equal(canAccessCourseRows({ id: 2, role: 'program-head' }, [row(approved)]), true);
        assert.equal(canAccessCourseRows({ id: 5, role: 'dean' }, [row(approved)]), true);
        assert.equal(canAccessCourseRows({ id: 4, role: 'industry-consultant' }, [row(approved)]), true);
        assert.equal(canAccessCourseRows({ id: 9, role: 'industry-consultant' }, [row(approved)]), false);
    }
});
