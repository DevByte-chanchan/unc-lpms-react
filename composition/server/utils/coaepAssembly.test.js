'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assembleCoaep } = require('./coaepAssembly');

const base = (co_id, ilo_id, extra = {}) => ({
    co_id, co_description: 'CO 1: Design interfaces', ilo_id, ilo_description: `ILO ${ilo_id}`,
    ied_level: 'I', is_orientation: 0, target_students_percent: 90, target_score_percent: 60, ...extra,
});

test('assessment names are returned as an array, so a comma in a name survives', () => {
    const [co] = assembleCoaep({
        baseRows: [base(1, 1)],
        assessmentRows: [
            { ilo_id: 1, method_id: 1, name: 'Quiz, Lecture Notes', period: 'p', weight: '8' },
            { ilo_id: 1, method_id: 2, name: 'Practical Exam', period: 'p', weight: '12' },
        ],
    });
    assert.deepEqual(co.ilos[0].assessmentTools, ['Quiz, Lecture Notes', 'Practical Exam']);
    assert.deepEqual(co.ilos[0].assessments.map(a => [a.periodLabel, a.weight]), [['Prelim', '8'], ['Prelim', '12']]);
});

test('one row per ILO carries its level, level weight, topics and TLAs', () => {
    const [co] = assembleCoaep({
        baseRows: [base(1, 1, { ied_level: 'E' }), base(1, 2, { ied_level: 'D' })],
        topicRows: [{ ilo_id: 1, title: 'Wireframes' }, { ilo_id: 1, title: 'Wireframes' }, { ilo_id: 2, title: 'Prototypes' }],
        tlaRows: [{ ilo_id: 1, tla_id: 7, tla_name: 'Sketching', class_phase: 'In-class' }, { ilo_id: 1, tla_id: 7, tla_name: 'Sketching', class_phase: 'In-class' }],
    });
    assert.equal(co.ilos.length, 2);
    assert.deepEqual([co.ilos[0].level, co.ilos[0].levelName, co.ilos[0].levelWeight], ['E', 'Enabling', 30]);
    assert.equal(co.ilos[1].levelWeight, 50);
    assert.deepEqual(co.ilos[0].topics, ['Wireframes']);
    assert.deepEqual(co.ilos[0].tlas, [{ name: 'Sketching', phase: 'In-class' }]);
    assert.deepEqual(co.ilos[1].tlas, []);
});

test('an orientation ILO has no level or level weight', () => {
    const [co] = assembleCoaep({ baseRows: [base(1, 1, { is_orientation: 1, ied_level: null })] });
    assert.deepEqual([co.ilos[0].level, co.ilos[0].levelWeight, co.ilos[0].isOrientation], [null, null, true]);
});

test('the performance target uses the ILO\'s own numbers', () => {
    const [co] = assembleCoaep({ baseRows: [base(1, 1, { target_students_percent: 85, target_score_percent: 70 })] });
    assert.equal(co.ilos[0].performanceTarget, 'At least 85% of enrolled students with a rating of at least 70% of the total score');
});

test('course outcomes are numbered, stripped of their "CO n:" prefix and capped at four', () => {
    const rows = [1, 2, 3, 4, 5].map(n => base(n, n, { co_description: `CO ${n}: Outcome ${n}` }));
    const cos = assembleCoaep({ baseRows: rows });
    assert.equal(cos.length, 4);
    assert.deepEqual(cos.map(co => co.number), ['1.0', '2.0', '3.0', '4.0']);
    assert.equal(cos[1].statement, 'Outcome 2');
});
