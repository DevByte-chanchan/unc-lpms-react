'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findIedProblems } = require('./iedRule');

const ilo = (co_id, ied_level, is_orientation = false) => ({ co_id, ied_level, is_orientation });

test('a CO with an I, an E and a D passes', () => {
    assert.deepEqual(findIedProblems([1], [ilo(1, 'I'), ilo(1, 'E'), ilo(1, 'D')]), []);
});

test('more than one ILO at a level is fine', () => {
    assert.deepEqual(findIedProblems([1], [ilo(1, 'I'), ilo(1, 'E'), ilo(1, 'D'), ilo(1, 'D')]), []);
});

test('a missing level is named, per CO in display order', () => {
    const problems = findIedProblems([7, 9], [ilo(7, 'I'), ilo(7, 'E'), ilo(7, 'D'), ilo(9, 'I'), ilo(9, 'I')]);
    assert.deepEqual(problems, ['CO2 needs at least one Enabling and one Demonstrative ILO.']);
});

test('unlevelled ILOs are reported, and do not count toward a level', () => {
    const problems = findIedProblems([1], [ilo(1, 'I'), ilo(1, 'E'), ilo(1, null)]);
    assert.deepEqual(problems, ['CO1 has 1 ILO with no IED level.', 'CO1 needs at least one Demonstrative ILO.']);
});

test('orientation ILOs are ignored in both directions', () => {
    assert.deepEqual(findIedProblems([1], [ilo(1, null, true), ilo(1, 'I'), ilo(1, 'E'), ilo(1, 'D')]), []);
    assert.equal(findIedProblems([1], [ilo(1, 'D', true), ilo(1, 'I'), ilo(1, 'E')]).length, 1);
});

test('a CO with no ILOs fails', () => {
    assert.equal(findIedProblems([1], []).length, 1);
});
