'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { assignDemoOwnership } = require('./demoOwnership');

test('demo ownership fills only unassigned instructor, program-head, and dean scopes', async () => {
    const statements = [];
    const queryInterface = {
        sequelize: {
            async query(sql, options = {}) {
                statements.push({ sql, replacements: options.replacements });
                if (/SELECT user_id, email FROM Users/i.test(sql)) {
                    return [[
                        { user_id: 1, email: 'monica.norton@unc.edu.ph' },
                        { user_id: 2, email: 'junar.danila@unc.edu.ph' },
                        { user_id: 5, email: 'agnes.reyes@unc.edu.ph' }
                    ]];
                }
                return [[], {}];
            }
        }
    };

    const result = await assignDemoOwnership(queryInterface);

    assert.deepEqual(result, { instructor: 1, programHead: 2, dean: 5 });
    const updates = statements.filter(item => /^\s*UPDATE/i.test(item.sql));
    assert.equal(updates.length, 3);
    for (const update of updates) assert.match(update.sql, /stakeholder_id IS NULL/i);
});
