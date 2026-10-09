'use strict';

// Server test runner: builds a fresh test database (data/lpms_test.sqlite) with
// the real migrations and demo seeders, then runs every *.test.js with NODE_ENV=test. models/index.js
// refuses to open any other database in that mode, so tests can never touch real data.
//
//   node run-tests.js            # all tests
//   node run-tests.js utils/x.test.js

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const env = { ...process.env, NODE_ENV: 'test' };
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true }); // a fresh checkout has no data folder (its contents are git-ignored)
for (const suffix of ['', '-wal', '-shm']) fs.rmSync(path.join(dataDir, `lpms_test.sqlite${suffix}`), { force: true });

const migrate = spawnSync(process.execPath, ['migrate.js'], { cwd: __dirname, env, stdio: 'inherit' });
if (migrate.status !== 0) process.exit(migrate.status || 1);

// The authorization tests need the demo plans and accounts, so load every seeder in order.
for (const seeder of fs.readdirSync(path.join(__dirname, 'seeders')).filter(f => f.endsWith('.js')).sort()) {
    const seeded = spawnSync(process.execPath, ['run-seeder.js', seeder], { cwd: __dirname, env, stdio: 'inherit' });
    if (seeded.status !== 0) process.exit(seeded.status || 1);
}

const listTests = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name.startsWith('data')) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listTests(full) : (entry.name.endsWith('.test.js') ? [full] : []);
});
const files = process.argv.length > 2 ? process.argv.slice(2) : listTests(__dirname);

const run = spawnSync(process.execPath, ['--test', ...files], { cwd: __dirname, env, stdio: 'inherit' });
process.exit(run.status ?? 1);
