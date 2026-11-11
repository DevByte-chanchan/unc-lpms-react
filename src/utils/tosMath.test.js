// node --test src/utils  (npm test). No test framework needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateTos, checkTos, groupLevelCell, coShare, pct, blankIfZero, totals, iloPercent, COGNITIVE_LEVELS } from './tosMath.js';
import { ACT222L_TOS } from '../data/tosFixtures.js';

const L = (name) => COGNITIVE_LEVELS.indexOf(name);
const act = () => aggregateTos(ACT222L_TOS.outcomes, ACT222L_TOS.questions);

test('blankIfZero blanks 0, null, undefined, empty and NaN', () => {
  for (const v of [0, '0', '0.0', null, undefined, '', '  ', NaN]) assert.equal(blankIfZero(v), '', String(v));
  assert.equal(blankIfZero(15), 15);
  assert.equal(blankIfZero('2.5'), '2.5');
  assert.equal(blankIfZero('37.5%'), '37.5%');
});

test('groupLevelCell shows only the points', () => {
  assert.equal(groupLevelCell([{ points: 5 }, { points: 5 }, { points: 5 }]).text, '15');
  assert.equal(groupLevelCell([{ points: 15, span: 3 }]).text, '15');
  assert.equal(groupLevelCell([{ points: 1 }]).text, '1');
  assert.equal(groupLevelCell([{ points: 3 }, { points: 5 }, { points: 5 }]).text, '13');
  assert.equal(groupLevelCell([{ points: 3 }, { points: 5 }, { points: 5 }]).count, 3);
  assert.equal(groupLevelCell([{ points: 3 }, { points: 5 }, { points: 5 }]).total, 13);
  assert.deepEqual(groupLevelCell([]), { terms: [], total: 0, count: 0, text: '' });
  assert.equal(groupLevelCell([{ points: 0 }]).text, '');
});

test('fixed hours (CO 20 → ILOs 4/6/10); points from the TOS', () => {
  const { cos } = act();
  for (const co of cos) {
    assert.equal(co.totalHours, 20);
    assert.deepEqual(co.ilos.map((i) => i.hours), [4, 6, 10]);
    assert.equal(co.points, co.ilos.reduce((s, i) => s + i.points, 0));
  }
  assert.deepEqual(cos[0].ilos.map((i) => i.points), [15, 15, 15]);
  // Stored points win, like the on-screen table (CO 25; ILOs 3, 6, 16).
  const agg = aggregateTos([{ co: 'CO1', totalPoints: 25, ilos: [{ id: 'ILO1', points: 3 }, { id: 'ILO2', points: 6 }, { id: 'ILO3', points: 16 }] }], []);
  assert.equal(agg.cos[0].points, 25);
  assert.deepEqual(agg.cos[0].ilos.map((i) => i.points), [3, 6, 16]);
});

test('fixed %: ILO1 20, ILO2 30, ILO3 50; CO and Total 100', () => {
  assert.deepEqual([0, 1, 2].map((i) => iloPercent(i, 3, 3)), [20, 30, 50]);
  assert.equal(iloPercent(0, 2, 40), 40); // not three ILOs: the stored value
  const { cos, totals: t } = act();
  for (const co of cos) {
    assert.equal(co.percentage, 100);
    assert.deepEqual(co.ilos.map((i) => i.percentage), [20, 30, 50]);
  }
  assert.equal(t.percentage, 100);
});

test('coShare and pct', () => {
  assert.equal(coShare(15, 40), 37.5);
  assert.equal(coShare(25, 40), 62.5);
  assert.equal(coShare(5, 0), 0);
  assert.equal(pct(37.5), '37.5%');
  assert.equal(pct(0), '');
});

test('ACT222L: cells match the Registrar form', () => {
  const { cos } = act();
  assert.equal(cos[0].co, 'CO2');
  assert.equal(cos[0].ilos[0].cells[L('Understanding')].text, '15');
  assert.equal(cos[0].ilos[1].cells[L('Applying')].text, '5');
  assert.equal(cos[0].ilos[1].cells[L('Creating')].text, '10');
  assert.equal(cos[1].ilos[0].cells[L('Understanding')].text, '15');
  assert.equal(cos[1].ilos[0].cells[L('Creating')].text, '10');
  assert.equal(cos[0].ilos[0].cells[L('Remembering')].text, '');
});

test('ACT222L: Total row is 40 · 100 · 100 · _ · 30 · 20 · _ · _ · 50 (points per level)', () => {
  const t = act().totals;
  assert.equal(t.hours, 40);
  assert.equal(t.percentage, 100);
  assert.equal(t.items, 20);
  assert.equal(t.formPoints, 100);
  assert.deepEqual(t.levels.map(blankIfZero), ['', 30, 20, '', '', 50]);
});

test('totals agree with the questions', () => {
  const agg = act();
  const sum = ACT222L_TOS.questions.reduce((s, q) => s + q.points, 0);
  assert.equal(agg.totals.points, sum);
  assert.equal(agg.totals.levelPoints.reduce((s, p) => s + p, 0), sum);
  assert.equal(agg.totals.levels.reduce((s, n) => s + n, 0), agg.totals.formPoints);
  assert.equal(agg.cos.reduce((s, co) => s + co.itemPoints, 0), sum);
  for (const co of agg.cos) assert.ok(co.share <= 100);
  assert.equal(agg.cos.reduce((s, co) => s + co.share, 0), 100);
  assert.deepEqual(checkTos(agg), []);
});

test('items stored vs items in the questions are checked', () => {
  const outcomes = [{ co: 'CO1', ilos: [{ id: 'ILO1', hours: 3, items: 4 }] }];
  const agg = aggregateTos(outcomes, [{ co: 'CO1', ilo: 'ILO1', cognitiveLevel: 'Applying', points: 6, span: 2 }]);
  assert.equal(checkTos(agg).length, 1);
});

test('unknown COs, ILOs and levels are ignored; the % stays fixed', () => {
  const agg = aggregateTos([{ co: 'CO1', ilos: [{ id: 'ILO1' }] }], [
    { co: 'CO9', ilo: 'ILO1', cognitiveLevel: 'Applying', points: 99 },
    { co: 'CO1', ilo: 'ILO1', cognitiveLevel: 'Guessing', points: 99 },
  ]);
  assert.equal(agg.totals.points, 0);
  assert.equal(agg.totals.percentage, 100);
  assert.equal(totals([]).percentage, 0);
  assert.deepEqual(totals([]).levels, [0, 0, 0, 0, 0, 0]);
});
