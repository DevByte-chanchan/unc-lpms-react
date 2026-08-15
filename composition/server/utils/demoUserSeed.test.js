'use strict';

const assert = require('assert');
const crypto = require('crypto');

let seedDemoUsers;
try {
    ({ seedDemoUsers } = require('./demoUserSeed'));
} catch {
    // RED should identify the missing orchestration behavior directly.
}

assert.strictEqual(
    typeof seedDemoUsers,
    'function',
    'testable demo-user seed orchestration must exist'
);

const DEMO_PASSWORD = 'demo1234';
const DEMO_USERS = [
    { name: 'NORTON, MONICA', email: 'monica.norton@unc.edu.ph', role: 'instructor' },
    { name: 'DANILA, JUNAR', email: 'junar.danila@unc.edu.ph', role: 'program-head' },
    { name: 'SANTOS, MARIA', email: 'maria.santos@unc.edu.ph', role: 'director-of-libraries' },
    { name: 'CRUZ, ROBERTO', email: 'roberto.cruz@unc.edu.ph', role: 'industry-consultant' },
    { name: 'REYES, AGNES', email: 'agnes.reyes@unc.edu.ph', role: 'dean' },
    { name: 'GARCIA, CARLOS', email: 'carlos.garcia@unc.edu.ph', role: 'vpaa' }
];

// The orchestrator receives hashing as a dependency. This deterministic,
// structurally valid test hash keeps the test focused on its database behavior
// without coupling the committed regression test to the pre-existing auth
// utility that is intentionally outside this commit.
const hashPassword = async (password) => (
    `scrypt$16384$8$1$0011$${crypto.createHash('sha256').update(String(password)).digest('hex')}`
);
const verifyPassword = async (password, stored) => stored === await hashPassword(password);

(async () => {
    const customHash = await hashPassword('custom-program-head-password');
    const rows = [
        {
            name: 'NORTON, MONICA',
            email: 'monica.norton@unc.edu.ph',
            role: 'instructor',
            password_hash: 'scrypt????broken'
        },
        {
            name: 'DANILA, JUNAR',
            email: 'junar.danila@unc.edu.ph',
            role: 'program-head',
            password_hash: customHash
        }
    ];

    const queryInterface = {
        sequelize: {
            async query(sql) {
                assert.match(
                    sql,
                    /SELECT\s+email\s*,\s*password_hash\s+FROM\s+Users/i,
                    'the orchestration must inspect hashes before deciding whether to preserve them'
                );
                return [rows.map(({ email, password_hash }) => ({ email, password_hash }))];
            }
        },
        async bulkInsert(table, inserted) {
            assert.strictEqual(table, 'Users');
            rows.push(...inserted.map(row => ({ ...row })));
        },
        async bulkUpdate(table, values, where) {
            assert.strictEqual(table, 'Users');
            const row = rows.find(candidate => candidate.email === where.email);
            assert(row, `repair target should exist: ${where.email}`);
            Object.assign(row, values);
        }
    };

    await seedDemoUsers({
        queryInterface,
        demoUsers: DEMO_USERS,
        demoPassword: DEMO_PASSWORD,
        hashPassword
    });

    assert.strictEqual(rows.length, 6, 'the final state should contain all six demo accounts');

    const instructor = rows.find(row => row.email === 'monica.norton@unc.edu.ph');
    assert.strictEqual(
        await verifyPassword(DEMO_PASSWORD, instructor.password_hash),
        true,
        'a malformed existing hash should be repaired to the demo password'
    );

    const programHead = rows.find(row => row.email === 'junar.danila@unc.edu.ph');
    assert.strictEqual(
        programHead.password_hash,
        customHash,
        'a structurally valid custom hash must remain byte-for-byte unchanged'
    );
    assert.strictEqual(await verifyPassword('custom-program-head-password', programHead.password_hash), true);
    assert.strictEqual(await verifyPassword(DEMO_PASSWORD, programHead.password_hash), false);

    for (const demo of DEMO_USERS.slice(2)) {
        const inserted = rows.find(row => row.email === demo.email);
        assert(inserted, `missing demo account should be inserted: ${demo.email}`);
        assert.strictEqual(
            await verifyPassword(DEMO_PASSWORD, inserted.password_hash),
            true,
            `inserted demo password should verify: ${demo.email}`
        );
    }

    console.log('1 demo-user seed orchestration check passed.');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
