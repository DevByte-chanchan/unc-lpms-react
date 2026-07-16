/**
 * Run a single seeder file by name (re-runnable, no tracking) — use this
 * instead of sequelize-cli, which tries to load the broken sqlite3 bindings.
 *
 * Usage (from composition/server):
 *   node run-seeder.js 20260525000000-reset-hci-to-draft.js
 *   node run-seeder.js 20260515000000-seed-returned-lp-hci.js
 *   node run-seeder.js 20260520000000-seed-approved-lp-hci.js
 */
const path = require('path');
const { sequelize, Sequelize } = require('./models');

const name = process.argv[2];
if (!name) {
    console.error('Usage: node run-seeder.js <seeder-file-name>');
    console.error('Available seeders:');
    require('fs').readdirSync(path.join(__dirname, 'seeders')).forEach(f => console.error('  ' + f));
    process.exit(1);
}

const file = path.resolve(__dirname, 'seeders', name);
const seeder = require(file);

seeder.up(sequelize.getQueryInterface(), Sequelize)
    .then(() => { console.log('✔ Seeder applied:', name); process.exit(0); })
    .catch(e => { console.error('✘ Seeder failed:', e.message); process.exit(1); });
