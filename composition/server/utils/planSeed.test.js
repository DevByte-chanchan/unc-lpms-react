'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assignIedLevels } = require('./planSeed');

const ilo = (co_id, extra = {}) => ({ co_id, description: 'x', ...extra });

test('non-orientation ILOs of each CO become I, E, D in the order written', () => {
    const levelled = assignIedLevels([
        ilo(1, { is_orientation: true }), ilo(1), ilo(1), ilo(1),
        ilo(2), ilo(2), ilo(2),
    ]);
    assert.deepEqual(levelled.map(i => i.ied_level), [null, 'I', 'E', 'D', 'I', 'E', 'D']);
});

test('orientation ILOs get no level and the input is not mutated', () => {
    const input = [ilo(1, { is_orientation: true }), ilo(1), ilo(1), ilo(1)];
    const out = assignIedLevels(input);
    assert.equal(out[0].ied_level, null);
    assert.equal('ied_level' in input[1], false);
});

test('a CO without exactly three graded ILOs is rejected', () => {
    assert.throws(() => assignIedLevels([ilo(1), ilo(1)]), /exactly one Introductory, Enabling and Demonstrative/);
    assert.throws(() => assignIedLevels([ilo(1), ilo(1), ilo(1), ilo(1)]), /exactly one/);
});
