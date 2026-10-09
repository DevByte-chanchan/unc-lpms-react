'use strict';

// Loads the demo data (departments, programs, courses, offerings, plans in every state, references,
// comments, and six demo accounts) into an EMPTY database.
//
//   docker compose exec server node seed-demo.js        (or: node seed-demo.js in server/)
//
// It is guarded because the seeders are not safe on a database that already has data: the first one
// fails on duplicate ids, but several later ones delete comments and workflow logs or insert
// duplicates, so running them one by one over real work destroys it. So this script:
//   * refuses when NODE_ENV=production (the demo accounts must never exist there);
//   * refuses when the database already holds departments, programs, courses, offerings, ILOs,
//     references, comments or workflow logs (existing USERS alone do not block it, so the first
//     superuser can be created before or after);
//   * runs the seeders in filename order and stops at the first failure.
// On a refusal nothing is changed.

const fs = require('fs');
const path = require('path');

// A database holding any of these is "not empty". Users are deliberately absent.
const GUARDED_TABLES = [
    'Departments',
    'Programs',
    'Courses',
    'ProgramCourseOfferings',
    'CourseOfferingAssignments',
    'IntendedLearningOutcomes',
    'References',
    'Comments',
    'AssignmentWorkflowLogs',
];

class SeedDemoError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'SeedDemoError';
        this.code = code; // PRODUCTION | NOT_EMPTY | SEEDER_FAILED
    }
}

// [{ table, count }] for every guarded table that has rows.
const findExistingData = async (sequelize) => {
    const found = [];
    for (const table of GUARDED_TABLES) {
        const [rows] = await sequelize.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
        const count = Number(rows[0]?.n ?? 0);
        if (count > 0) found.push({ table, count });
    }
    return found;
};

const runSeedDemo = async ({
    sequelize,
    Sequelize,
    env = process.env,
    seedersDir = path.join(__dirname, 'seeders'),
    log = () => {},
}) => {
    if (env.NODE_ENV === 'production') {
        throw new SeedDemoError('PRODUCTION', 'Refused: NODE_ENV is "production". Demo accounts and demo plans must never be loaded into a real deployment.');
    }

    const existing = await findExistingData(sequelize);
    if (existing.length > 0) {
        throw new SeedDemoError('NOT_EMPTY', [
            'Refused: this database already has data, and the demo seeders are not safe to run over it',
            '(some delete comments and workflow logs, some insert duplicates). Nothing was changed.',
            `Found: ${existing.map(e => `${e.table} (${e.count})`).join(', ')}.`,
            'To start over with demo data, use an EMPTY database (a new volume: docker compose down -v, then up, then this script).',
        ].join('\n'));
    }

    const queryInterface = sequelize.getQueryInterface();
    const files = fs.readdirSync(seedersDir).filter(f => f.endsWith('.js')).sort();
    const applied = [];
    for (const file of files) {
        try {
            await require(path.join(seedersDir, file)).up(queryInterface, Sequelize);
        } catch (error) {
            throw new SeedDemoError('SEEDER_FAILED', [
                `Seeder ${file} failed: ${error.message}`,
                `Stopped. ${applied.length} earlier seeder(s) were applied, so the database now holds partial demo data.`,
                'Do not run the others by hand over it. Start again from an empty database.',
            ].join('\n'));
        }
        applied.push(file);
        log(`Seeded ${file}`);
    }

    const demo = require(path.join(seedersDir, '20260812000000-demo-users.js'));
    return { applied, accounts: demo.DEMO_USERS, password: demo.DEMO_PASSWORD };
};

module.exports = { runSeedDemo, findExistingData, SeedDemoError, GUARDED_TABLES };

if (require.main === module) {
    (async () => {
        // Checked before the database is even opened.
        if (process.env.NODE_ENV === 'production') {
            console.error('Refused: NODE_ENV is "production". Demo accounts and demo plans must never be loaded into a real deployment.');
            process.exit(1);
        }
        const { sequelize, Sequelize } = require('./models');
        const result = await runSeedDemo({ sequelize, Sequelize, log: console.log });
        console.log(`\nDemo data loaded (${result.applied.length} seeders). Demo accounts, all with the password "${result.password}":`);
        for (const account of result.accounts) console.log(`  ${account.email.padEnd(30)} ${account.role}`);
        console.log('\nThey are for local use only. Create the first superuser with: node create-superuser.js "SURNAME, FIRSTNAME" email@unc.edu.ph');
        process.exit(0);
    })().catch(error => {
        console.error(error instanceof SeedDemoError ? error.message : `seed-demo failed: ${error.stack || error.message}`);
        process.exit(1);
    });
}
