'use strict';

// Merges exact duplicate references: same title, author, type, ISBN, link, publication year,
// publisher and archived flag (ignoring case and surrounding spaces). The lowest id is kept; the
// learning outcomes that used a duplicate are pointed at it (once per outcome) and the duplicate
// rows are deleted. Anything that differs in any of those fields is left alone.
//
// The demo seeders each insert their own copy of the shared titles, which is where the
// duplicates in the Director's library came from. Dry run unless `apply` is true.

const norm = (value) => String(value ?? '').trim().toLowerCase();

const mergeDuplicateReferences = async ({ apply = false, models = require('../models') } = {}) => {
    const { sequelize, Sequelize } = models;
    const select = (sql, replacements = [], transaction) =>
        sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT, ...(transaction ? { transaction } : {}) });
    const run = (sql, replacements, transaction) => sequelize.query(sql, { replacements, transaction });

    const rows = await select('SELECT reference_id, title, author, type, isbn, link, publication_year, publisher, archived FROM "References" ORDER BY reference_id ASC;');
    const groups = new Map();
    for (const row of rows) {
        const key = [row.title, row.author, row.type, row.isbn, row.link, row.publication_year, row.publisher, row.archived ? 1 : 0].map(norm).join('\u0001');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }

    const merges = [...groups.values()]
        .filter(group => group.length > 1)
        .map(group => ({ title: group[0].title, keep: group[0].reference_id, drop: group.slice(1).map(row => row.reference_id) }));

    if (apply && merges.length > 0) {
        await sequelize.transaction(async (transaction) => {
            for (const { keep, drop } of merges) {
                for (const id of drop) {
                    // Move this duplicate's links to the kept reference, unless that outcome already has it.
                    await run(
                        'UPDATE ILOReferences SET reference_id = ? WHERE reference_id = ? AND ilo_id NOT IN (SELECT ilo_id FROM ILOReferences WHERE reference_id = ?);',
                        [keep, id, keep], transaction
                    );
                    await run('DELETE FROM ILOReferences WHERE reference_id = ?;', [id], transaction);
                    await run('DELETE FROM "References" WHERE reference_id = ?;', [id], transaction);
                }
            }
        });
    }
    return { groups: merges.length, removed: merges.reduce((sum, merge) => sum + merge.drop.length, 0), merges };
};

module.exports = { mergeDuplicateReferences };
