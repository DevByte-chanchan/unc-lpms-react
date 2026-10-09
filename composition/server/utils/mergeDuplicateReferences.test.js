'use strict';

// utils/mergeDuplicateReferences.js: exact duplicates merge into the lowest id, links move once,
// anything that differs stays, and a dry run changes nothing.
const test = require('node:test');
const assert = require('node:assert/strict');
const models = require('../models');
const { mergeDuplicateReferences } = require('./mergeDuplicateReferences');

const { sequelize, Sequelize, Reference } = models;
const stamp = Date.now();
const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
const link = (referenceId, iloId) => sequelize.query(
    'INSERT INTO ILOReferences (reference_id, ilo_id) VALUES (?, ?);', { replacements: [referenceId, iloId] }
);
const linksOf = async (referenceId) => (await select('SELECT ilo_id FROM ILOReferences WHERE reference_id = ? ORDER BY ilo_id;', [referenceId])).map(r => r.ilo_id);

test('exact duplicates merge into the lowest id; links move once; different ones stay; dry run changes nothing', async () => {
    const [x, y] = (await select('SELECT ilo_id FROM IntendedLearningOutcomes ORDER BY ilo_id LIMIT 2;')).map(r => r.ilo_id);
    const title = `Merge Test ${stamp}`;
    const base = { title, author: 'A. Author', type: 'Textbook', publication_year: '2020-01-01 00:00:00.000 +00:00' };
    const first = await Reference.create(base);
    const second = await Reference.create({ ...base, title: `  ${title.toUpperCase()}  ` });
    const third = await Reference.create(base);
    const other = await Reference.create({ ...base, publication_year: '2021-01-01 00:00:00.000 +00:00' });

    await link(first.reference_id, x);
    await link(second.reference_id, x);
    await link(third.reference_id, x);
    await link(third.reference_id, y);
    await link(other.reference_id, y);

    const ours = (result) => result.merges.filter(merge => merge.title === title || merge.keep === first.reference_id);

    const dry = await mergeDuplicateReferences({});
    assert.equal(ours(dry).length, 1);
    assert.deepEqual(ours(dry)[0].drop, [second.reference_id, third.reference_id]);
    assert.equal((await select('SELECT count(*) c FROM "References" WHERE reference_id IN (?, ?, ?)', [first.reference_id, second.reference_id, third.reference_id]))[0].c, 3, 'a dry run removes nothing');

    await mergeDuplicateReferences({ apply: true });
    assert.deepEqual((await select('SELECT reference_id FROM "References" WHERE reference_id IN (?, ?, ?, ?) ORDER BY reference_id', [first.reference_id, second.reference_id, third.reference_id, other.reference_id])).map(r => r.reference_id), [first.reference_id, other.reference_id]);
    assert.deepEqual(await linksOf(first.reference_id), [x, y].sort((a, b) => a - b), 'each outcome is linked once, and the third reference\'s other outcome moved over');
    assert.deepEqual(await linksOf(other.reference_id), [y], 'a reference with a different year is untouched');

    const again = await mergeDuplicateReferences({ apply: true });
    assert.equal(ours(again).length, 0, 'running it again finds nothing of ours');
});
