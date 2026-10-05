'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { periodForWeek, startWeekOfIlo, parseWeight, findWeightProblems } = require('./assessmentWeights');

const a = (ied_level, weight, is_orientation = false) => ({ ied_level, weight, is_orientation });

test('periods follow the 18-week term boundaries', () => {
    assert.deepEqual([1, 5, 6, 9, 10, 13, 14, 18, 25].map(periodForWeek), ['p', 'p', 'm', 'm', 's', 's', 'f', 'f', 'f']);
    assert.equal(periodForWeek(0), null);
    assert.equal(periodForWeek(NaN), null);
});

test('an ILO starts where the previous ones ended', () => {
    const ilos = [{ ilo_id: 1, weeks: 1 }, { ilo_id: 2, weeks: '2.00' }, { ilo_id: 3, weeks: 1 }, { ilo_id: 4, weeks: null }];
    assert.deepEqual([1, 2, 3, 4, 99].map(id => startWeekOfIlo(ilos, id)), [1, 2, 4, null, null]);
});

test('parseWeight accepts positive numbers up to 100, with an optional percent sign', () => {
    assert.equal(parseWeight('12.5'), 12.5);
    assert.equal(parseWeight(' 20% '), 20);
    assert.equal(parseWeight(100), 100);
    for (const bad of ['', '0', '-5', '101', 'abc', '1e1', '.5', null, undefined]) assert.equal(parseWeight(bad), null, String(bad));
});

test('weights of 20 / 30 / 50 across the course pass, however they are split', () => {
    assert.deepEqual(findWeightProblems([a('I', '20'), a('E', '30'), a('D', '20'), a('D', '30')]), []);
    assert.deepEqual(findWeightProblems([a('I', '5'), a('I', '5'), a('I', '10'), a('E', '7.5'), a('E', '22.5'), a('D', '50')]), []);
});

test('each level that misses its total is reported with the actual total', () => {
    const problems = findWeightProblems([a('I', '15'), a('E', '30'), a('D', '55')]);
    assert.deepEqual(problems, [
        'Introductory assessment weights total 15%, but must total 20%.',
        'Demonstrative assessment weights total 55%, but must total 50%.'
    ]);
});

test('no assessments at all fails every level; orientation ILOs are ignored', () => {
    assert.equal(findWeightProblems([]).length, 3);
    assert.deepEqual(findWeightProblems([a('I', '20'), a('E', '30'), a('D', '50'), a('I', '40', true)]), []);
});

test('a split into thirds that rounds a hundredth off still passes, a real gap does not', () => {
    assert.deepEqual(findWeightProblems([a('I', '6.67'), a('I', '6.67'), a('I', '6.67'), a('E', '30'), a('D', '50')]), []);
    assert.equal(findWeightProblems([a('I', '20.1'), a('E', '30'), a('D', '50')]).length, 1);
});

test('decimal splits do not trip on floating point noise', () => {
    assert.deepEqual(findWeightProblems([a('I', '6.6'), a('I', '6.7'), a('I', '6.7'), a('E', '10.1'), a('E', '19.9'), a('D', '33.3'), a('D', '16.7')]), []);
});
